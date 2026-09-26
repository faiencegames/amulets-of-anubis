#!/usr/bin/env python3
"""
Turns every picture in images/ into a PNG in dist/art-references/, in the
same folders (amulets/, backdrops/, icons/boons/, floors/<set>/, ...), for
showing the game's art to people and tools that can't read SVG.

	python3 tools/art-references.py [the game's folder]

build.py runs it after every build. It needs rsvg-convert (librsvg:
`brew install librsvg`, or `apt install librsvg2-bin`); without it, it says
so and does nothing and the game builds as before. Only pictures changed
since their PNG was made are drawn again, so it is quick after the first time.
The prints (JPEG) are converted with ImageMagick or macOS's sips, whichever
is there.

The size is the longest side, per folder: small things large enough to look
at closely, scenery large enough to see its detail.
"""
import os, shutil, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from where import GAME

ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else GAME
SRC = os.path.join(ROOT, 'images')
OUT = os.path.join(ROOT, 'dist', 'art-references')
SIZES = {'icons': 512, 'floors': 512, 'backdrops': 2048, 'boards': 2048}
SIZE = 1024  # amulets, specials, badges, relics


def size_for(rel):
	return SIZES.get(rel.split(os.sep)[0], SIZE)


def jpeg_to_png(src, dst, size):
	if shutil.which('magick'):
		cmd = ['magick', src, '-resize', f'{size}x{size}>', dst]
	elif shutil.which('sips'):
		cmd = ['sips', '-s', 'format', 'png', '-Z', str(size), src, '--out', dst]
	else:
		return False
	return subprocess.run(cmd, capture_output=True).returncode == 0


def draw(job):
	src, dst, size = job
	os.makedirs(os.path.dirname(dst), exist_ok=True)
	if src.endswith('.svg'):
		cmd = ['rsvg-convert', '--keep-aspect-ratio', '-w', str(size), '-h', str(size), '-o', dst, src]
		ok = subprocess.run(cmd, capture_output=True).returncode == 0
	else:
		ok = jpeg_to_png(src, dst, size)
	return None if ok else os.path.relpath(src, ROOT)


def main():
	if not shutil.which('rsvg-convert'):
		print('Art references skipped: rsvg-convert is not installed (brew install librsvg).')
		return
	jobs, wanted = [], set()
	for folder, _, files in os.walk(SRC):
		for name in sorted(files):
			base, ext = os.path.splitext(name)
			if ext.lower() not in ('.svg', '.png', '.jpg', '.jpeg', '.webp'):
				continue
			src = os.path.join(folder, name)
			rel = os.path.relpath(src, SRC)
			dst = os.path.join(OUT, os.path.dirname(rel), base + '.png')
			wanted.add(dst)
			if ext.lower() == '.png':
				if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
					os.makedirs(os.path.dirname(dst), exist_ok=True)
					shutil.copyfile(src, dst)
				continue
			if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
				continue
			jobs.append((src, dst, size_for(rel)))
	# drop the PNGs of pictures that are gone (and anything else not made here)
	for folder, _, files in os.walk(OUT, topdown=False):
		for name in files:
			p = os.path.join(folder, name)
			if p not in wanted:
				os.remove(p)
		if folder != OUT and not os.listdir(folder):
			os.rmdir(folder)
	with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
		failed = [f for f in pool.map(draw, jobs) if f]
	for f in failed:
		print(f'Art references: could not draw {f}')
	if jobs:
		print(f'Art references: {len(jobs) - len(failed)} drawn into dist/art-references/ ({len(wanted)} in all)')


if __name__ == '__main__':
	main()
