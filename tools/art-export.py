#!/usr/bin/env python3
"""
Exports the game's pictures for editing in other programs, into
dist/art-export/:

	python3 tools/art-export.py

  pdf/       every SVG as a vector PDF (Affinity, Illustrator, Pixelmator,
             Preview): the shapes stay shapes, the gradients gradients.
  pixel/     the small pictures (amulets, specials, badges, icons) as pixel
             art at 32 and 64 pixels: few colours, hard edges, no blur. A
             starting point for a pixel-art look, not a finished one.
  aseprite/  the same pixel art as Aseprite files (.aseprite), one per
             folder, each picture a frame, named by a tag; LibreSprite and
             Pixelorama open them too.
  sheets/    each folder of small pictures as one sprite sheet (PNG, 128 px a
             picture) with a JSON map in Aseprite's own format, which game
             engines (Godot, Unity, Phaser) and TexturePacker read.

The originals stay the SVGs in images/: those are what the game uses, and
what Inkscape, Affinity and Illustrator edit best. The larger PNGs are in
dist/art-references/ (tools/art-references.py, run by the build).

Needs rsvg-convert (brew install librsvg) and ImageMagick (brew install
imagemagick). Nothing here is used by the game or the build.
"""
import json, os, shutil, struct, subprocess, sys, tempfile, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'images')
OUT = os.path.join(ROOT, 'dist', 'art-export')
SMALL = ['amulets', 'specials', 'badges', 'icons']  # the folders drawn as pixel art and sheets
PIXEL_SIZES = [32, 64]
PIXEL_COLOURS = 24  # colours per picture in the pixel art
SHEET_SIZE = 128


def run(cmd):
	return subprocess.run(cmd, capture_output=True).returncode == 0


def svgs(folder=''):
	"""(path relative to images/, full path) for every SVG under images/<folder>."""
	out = []
	for base, _, files in os.walk(os.path.join(SRC, folder)):
		for name in sorted(files):
			if name.endswith('.svg'):
				full = os.path.join(base, name)
				out.append((os.path.relpath(full, SRC), full))
	return sorted(out)


def groups():
	"""The small pictures by folder: amulets, specials, badges, icons/boons, ..."""
	found = {}
	for rel, full in svgs():
		folder = os.path.dirname(rel)
		if folder.split(os.sep)[0] in SMALL:
			found.setdefault(folder, []).append((os.path.splitext(os.path.basename(rel))[0], full))
	return found


def png(full, size, dst):
	return run(['rsvg-convert', '--keep-aspect-ratio', '-w', str(size), '-h', str(size), '-o', dst, full])


def pixel_art(full, size, dst, tmp):
	"""Drawn large, shrunk without blur, few colours, and every pixel either
	fully there or not, as pixel art is."""
	big = os.path.join(tmp, 'big.png')
	if not png(full, size * 8, big):
		return False
	return run(['magick', big, '-background', 'none', '-gravity', 'center', '-extent', f'{size * 8}x{size * 8}',
				'-filter', 'Box', '-resize', f'{size}x{size}',
				'-channel', 'A', '-threshold', '50%', '+channel',
				'+dither', '-colors', str(PIXEL_COLOURS), dst])


def rgba(path):
	"""A PNG's pixels as (width, height, bytes RGBA), through ImageMagick."""
	w, h = map(int, subprocess.run(['magick', 'identify', '-format', '%w %h', path],
								   capture_output=True, text=True).stdout.split())
	raw = subprocess.run(['magick', path, '-depth', '8', 'RGBA:-'], capture_output=True).stdout
	return w, h, raw


# ---------- Aseprite files ----------
# The format is published by Aseprite: docs/ase-file-specs.md in its source.
# Written here: the header, a colour profile (sRGB), one layer, a tag per
# frame with the picture's name, and each picture as a compressed cel.

def _string(s):
	b = s.encode('utf-8')
	return struct.pack('<H', len(b)) + b


def _chunk(kind, data):
	return struct.pack('<IH', len(data) + 6, kind) + data


def write_aseprite(path, size, frames, layer='picture', duration=400):
	"""frames: [(name, rgba bytes of size x size)]"""
	body = b''
	for i, (name, pixels) in enumerate(frames):
		chunks = []
		if i == 0:
			chunks.append(_chunk(0x2007, struct.pack('<HHI8x', 1, 0, 0)))  # colour profile: sRGB
			chunks.append(_chunk(0x2004, struct.pack('<HHHHHHB3x', 3, 0, 0, 0, 0, 0, 255) + _string(layer)))
			tags = struct.pack('<H8x', len(frames))
			for j, (tag, _) in enumerate(frames):
				tags += struct.pack('<HHBH6x3Bx', j, j, 0, 0, 0, 0, 0) + _string(tag)
			chunks.append(_chunk(0x2018, tags))
		cel = struct.pack('<HhhBHh5x', 0, 0, 0, 255, 2, 0) + struct.pack('<HH', size, size) + zlib.compress(pixels)
		chunks.append(_chunk(0x2005, cel))
		data = b''.join(chunks)
		body += struct.pack('<IHHH2xI', len(data) + 16, 0xF1FA, min(len(chunks), 0xFFFF), duration, len(chunks)) + data
	header = struct.pack('<IHHHHHIHIIB3xHBBhhHH84x', 128 + len(body), 0xA5E0, len(frames), size, size, 32, 1, 100,
						 0, 0, 0, 0, 1, 1, 0, 0, 0, 0)
	with open(path, 'wb') as f:
		f.write(header + body)


def read_aseprite(path):
	"""Reads back what write_aseprite wrote (a check, not a full reader):
	[(tag name, width, height, rgba bytes)]"""
	data = open(path, 'rb').read()
	size, magic, nframes, w, h, depth = struct.unpack_from('<IHHHHH', data, 0)
	assert magic == 0xA5E0 and size == len(data) and depth == 32, 'not an RGBA Aseprite file'
	pos, names, cels = 128, [], []
	for _ in range(nframes):
		fsize, fmagic, _, _, nchunks = struct.unpack_from('<IHHH2xI', data, pos)
		assert fmagic == 0xF1FA, 'bad frame'
		cpos = pos + 16
		for _ in range(nchunks):
			csize, kind = struct.unpack_from('<IH', data, cpos)
			if kind == 0x2018:
				n = struct.unpack_from('<H', data, cpos + 6)[0]
				t = cpos + 6 + 10
				for _ in range(n):
					t += 17
					ln = struct.unpack_from('<H', data, t)[0]
					names.append(data[t + 2:t + 2 + ln].decode())
					t += 2 + ln
			if kind == 0x2005:
				cw, ch = struct.unpack_from('<HH', data, cpos + 6 + 16)
				cels.append((cw, ch, zlib.decompress(data[cpos + 6 + 20:cpos + csize])))
			cpos += csize
		pos += fsize
	return [(names[i] if i < len(names) else str(i),) + cels[i] for i in range(len(cels))]


# ---------- sprite sheets ----------

def sheet(folder, pictures, tmp):
	"""One PNG with every picture in a grid, and its map as Aseprite writes
	it (JSON, "hash" form)."""
	cols = min(8, len(pictures))
	rows = (len(pictures) + cols - 1) // cols
	tiles, frames = [], {}
	for i, (name, full) in enumerate(pictures):
		p = os.path.join(tmp, f'sheet-{i}.png')
		png(full, SHEET_SIZE, p)
		run(['magick', p, '-background', 'none', '-gravity', 'center', '-extent', f'{SHEET_SIZE}x{SHEET_SIZE}', p])
		tiles.append(p)
		x, y = (i % cols) * SHEET_SIZE, (i // cols) * SHEET_SIZE
		frames[name] = {'frame': {'x': x, 'y': y, 'w': SHEET_SIZE, 'h': SHEET_SIZE}, 'rotated': False, 'trimmed': False,
						'spriteSourceSize': {'x': 0, 'y': 0, 'w': SHEET_SIZE, 'h': SHEET_SIZE},
						'sourceSize': {'w': SHEET_SIZE, 'h': SHEET_SIZE}, 'duration': 400}
	stem = folder.replace(os.sep, '-')
	dst = os.path.join(OUT, 'sheets', stem + '.png')
	# rows side by side, then the rows one under another (the last filled out
	# with empty squares, so every row is as wide)
	blank = os.path.join(tmp, 'blank.png')
	run(['magick', '-size', f'{SHEET_SIZE}x{SHEET_SIZE}', 'xc:none', blank])
	tiles += [blank] * (rows * cols - len(tiles))
	grid = []
	for r in range(rows):
		row = os.path.join(tmp, f'row-{r}.png')
		run(['magick', *tiles[r * cols:(r + 1) * cols], '-background', 'none', '+append', row])
		grid.append(row)
	run(['magick', *grid, '-background', 'none', '-append', dst])
	meta = {'frames': frames, 'meta': {'app': 'Amulets of Anubis, tools/art-export.py', 'image': stem + '.png',
									   'format': 'RGBA8888', 'size': {'w': cols * SHEET_SIZE, 'h': rows * SHEET_SIZE},
									   'scale': '1'}}
	with open(os.path.join(OUT, 'sheets', stem + '.json'), 'w') as f:
		json.dump(meta, f, indent='\t')


def main():
	for tool in ('rsvg-convert', 'magick'):
		if not shutil.which(tool):
			sys.exit(f'art-export needs {tool} (brew install librsvg imagemagick).')
	if os.path.isdir(OUT):
		shutil.rmtree(OUT)
	for d in ('pdf', 'pixel', 'aseprite', 'sheets'):
		os.makedirs(os.path.join(OUT, d))
	failed = []
	# vector PDFs of everything
	for rel, full in svgs():
		dst = os.path.join(OUT, 'pdf', os.path.splitext(rel)[0] + '.pdf')
		os.makedirs(os.path.dirname(dst), exist_ok=True)
		if not run(['rsvg-convert', '-f', 'pdf', '-o', dst, full]):
			failed.append(rel)
	# pixel art, Aseprite files and sheets of the small pictures
	with tempfile.TemporaryDirectory() as tmp:
		for folder, pictures in groups().items():
			stem = folder.replace(os.sep, '-')
			for size in PIXEL_SIZES:
				frames = []
				for name, full in pictures:
					dst = os.path.join(OUT, 'pixel', str(size), folder, name + '.png')
					os.makedirs(os.path.dirname(dst), exist_ok=True)
					if not pixel_art(full, size, dst, tmp):
						failed.append(os.path.relpath(full, SRC))
						continue
					w, h, px = rgba(dst)
					if (w, h) == (size, size):
						frames.append((name, px))
				if frames:
					path = os.path.join(OUT, 'aseprite', f'{stem}-{size}.aseprite')
					write_aseprite(path, size, frames, layer=stem)
					back = read_aseprite(path)
					assert [(n, p) for n, _, _, p in back] == frames, f'{path} does not read back as written'
			sheet(folder, pictures, tmp)
	for f in failed:
		print('could not export', f)
	count = sum(len(fs) for _, _, fs in os.walk(OUT))
	print(f'Art export: {count} files in dist/art-export/ (pdf, pixel, aseprite, sheets)')


if __name__ == '__main__':
	main()
