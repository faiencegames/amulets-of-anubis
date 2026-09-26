"""Draws the amulet sets with pictures of their own into images/amulet-sets/:
engraved plates, Naqada pots, Djoser's tiles and cloisonné. Every set is
drawn from the same plain outline of each amulet (shapes.py), so an outline
changed there changes all four, and a new amulet arrives in all four at once.

Run: python3 tools/amulet-sets/draw.py                 (every set, every amulet)
     python3 tools/amulet-sets/draw.py naqada           (one set)
     python3 tools/amulet-sets/draw.py naqada ankh bee  (one set, these amulets)

The sets' names and unlocks are in content/amulet-sets/.
"""
import colorsys, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shapes import SHAPES, TONE, INK, EYE_DISC, colour

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'images', 'amulet-sets')

SHADOW = ('<filter id="sh" filterUnits="userSpaceOnUse" x="-50" y="-50" width="228" height="228">'
	'<feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#190c00" flood-opacity=".5"/></filter>')


def svg(comment, body, defs=''):
	return (f'<!-- {comment} 128 by 128. Drawn by tools/amulet-sets/. -->\n'
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">\n'
		f'<defs>{defs}</defs>\n{body}</svg>\n')


def parts(name):
	"""Each part of an amulet: kind, path, line width, tone and its colour."""
	for p in SHAPES[name]:
		if p[0] == 'fill': yield 'fill', p[1], None, p[2], colour(name, p[2])
		else: yield 'line', p[1], p[2], p[3], colour(name, p[3])


def under(name, extra, col=INK, shadow=True):
	"""Every part stroked wide in one colour, so the amulet has one outline."""
	s = '<g filter="url(#sh)">' if shadow else '<g>'
	for kind, p, w, tone, c in parts(name):
		if w: s += f'<path d="{p}" fill="none" stroke="{col}" stroke-width="{w + extra}" stroke-linecap="round" stroke-linejoin="round"/>'
		else: s += f'<path d="{p}" fill="{col}" stroke="{col}" stroke-width="{extra}" stroke-linejoin="round"/>'
	return s + '</g>\n'


def scaled(inner, k):
	return f'<g transform="translate(64 64) scale({k}) translate(-64 -64)">{inner}</g>'


def mix(a, b, t):
	pa = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
	pb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
	return '#%02x%02x%02x' % tuple(round(x + (y - x) * t) for x, y in zip(pa, pb))


# ---------------------------------------------------------------- engraved plates
def engraved(name):
	"""Black line and hatching over a wash of colour laid on by hand."""
	defs = ('<pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0 V5" stroke="#1a1008" stroke-width="1.3"/></pattern>'
		'<pattern id="cross" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)"><path d="M0 0 V5" stroke="#1a1008" stroke-width="1.3"/></pattern>'
		+ SHADOW)
	s = under(name, 6, '#1a1008')
	for kind, p, w, tone, c in parts(name):
		if kind == 'fill':
			wash = {'l': TONE[name][0], 'm': TONE[name][1]}.get(tone, c)
			s += f'<path d="{p}" fill="{"#1a1008" if c == INK else wash}"/>'
			if tone in ('d', 'G'): s += f'<path d="{p}" fill="url(#hatch)" opacity=".7"/><path d="{p}" fill="url(#cross)" opacity=".5"/>'
			elif tone == 'm': s += f'<path d="{p}" fill="url(#hatch)" opacity=".4"/>'
			s += f'<path d="{p}" fill="none" stroke="#1a1008" stroke-width="2.4" stroke-linejoin="round"/>'
		else:
			s += f'<path d="{p}" fill="none" stroke="{"#1a1008" if c == INK else c}" stroke-width="{w}" stroke-linecap="round"/>'
	return svg('An engraving, hatched in black and coloured by hand, like the plates of the Description de l\'Egypte.', s + '\n', defs)


# ---------------------------------------------------------------- Naqada pots
def paint(name):
	"""The Naqada paint for an amulet: its own colour, deepened and a little
	muted so it reads as paint on buff clay. Pale amulets (white, sand, stone)
	take their darkest tone."""
	l, m, d = TONE[name]
	r, g, b = (int(m[i:i + 2], 16) / 255 for i in (1, 3, 5))
	hue, light, sat = colorsys.rgb_to_hls(r, g, b)
	if light > .72 or sat < .2:
		r, g, b = (int(d[i:i + 2], 16) / 255 for i in (1, 3, 5))
		hue, light, sat = colorsys.rgb_to_hls(r, g, b)
	r, g, b = colorsys.hls_to_rgb(hue, min(light, .38), min(sat * .9, .8))
	return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))


def naqada(name):
	"""Paint on buff clay, in wavy lines and zigzags."""
	pg = paint(name)
	defs = (SHADOW + '<radialGradient id="clay" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#ecd2a4"/><stop offset="1" stop-color="#c49a66"/></radialGradient>'
		f'<pattern id="wave" width="16" height="10" patternUnits="userSpaceOnUse"><path d="M0 5 Q4 0 8 5 T16 5" fill="none" stroke="{pg}" stroke-width="2.6"/></pattern>'
		f'<pattern id="zz" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(90)"><path d="M0 5 Q2.5 0 5 5 T10 5" fill="none" stroke="{pg}" stroke-width="2.4"/></pattern>')
	s = under(name, 10, pg)
	i = 0
	for kind, p, w, tone, c in parts(name):
		if kind == 'fill':
			if c == INK or tone in ('d', 'black'): s += f'<path d="{p}" fill="{pg}"/>'
			else:
				s += f'<path d="{p}" fill="url(#clay)"/><path d="{p}" fill="url(#{"wave" if i % 2 == 0 else "zz"})" transform="translate(64 64) scale(.82) translate(-64 -64)"/>'
				s += f'<path d="{p}" fill="none" stroke="{pg}" stroke-width="3"/>'
				i += 1
		else:
			s += f'<path d="{p}" fill="none" stroke="{pg}" stroke-width="{w}" stroke-linecap="round"/>'
	return svg('Paint in the amulet\'s own colour on buff clay, with wavy lines and zigzags, like the painted pots of the Naqada period.', s + '\n', defs)


# ---------------------------------------------------------------- Djoser's tiles
def tiles(name):
	"""The tile a deeper shade of the amulet's colour, the amulet raised on it in full colour."""
	l, m, d = TONE[name]
	defs = (SHADOW + f'<linearGradient id="gz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{mix(m, d, .2)}"/>'
		f'<stop offset=".5" stop-color="{mix(m, d, .55)}"/><stop offset="1" stop-color="{mix(d, "#000000", .35)}"/></linearGradient>'
		'<radialGradient id="shine" cx=".3" cy=".22" r=".55"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>')
	s = f'<rect x="8" y="8" width="112" height="112" rx="14" fill="url(#gz)" stroke="{INK}" stroke-width="4" filter="url(#sh)"/>\n'
	outline = under(name, 9, INK, False)
	fig = ''
	for kind, p, w, tone, c in parts(name):
		if name == 'eye' and p == EYE_DISC: continue   # the tile is the eye's disc
		cc = {'l': mix(l, '#ffffff', .3), 'm': l, 'd': m}.get(tone, c)
		if kind == 'fill': fig += f'<path d="{p}" fill="{cc}"/>'
		else: fig += f'<path d="{p}" fill="none" stroke="{cc}" stroke-width="{w}" stroke-linecap="round"/>'
	if name == 'eye':
		outline = outline.replace(f'<path d="{EYE_DISC}"', '<path d="M0 0"')
		shadow = ''
	else:
		shadow = f'<g transform="translate(3 4)" opacity=".45">{under(name, 9, "#000", False)}</g>'
	s += scaled(shadow + outline + fig, .76)
	s += '<rect x="8" y="8" width="112" height="112" rx="14" fill="url(#shine)"/>\n'
	return svg('A glazed tile with the amulet raised on it in bold colour, after the tiled chambers under the Step Pyramid of Djoser.', s, defs)


# ---------------------------------------------------------------- cloisonné
def cloisonne(name):
	"""Each part a cell of shaded stone or glass, gold walls between the cells,
	a wide dark edge outside the gold."""
	defs = SHADOW + ('<linearGradient id="au" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff4c0"/>'
		'<stop offset=".4" stop-color="#e8b83a"/><stop offset="1" stop-color="#8a5a0c"/></linearGradient>'
		'<radialGradient id="glint" cx=".3" cy=".25" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".55"/>'
		'<stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>')
	s = under(name, 15, INK) + under(name, 6, 'url(#au)', False)
	for i, (kind, p, w, tone, c) in enumerate(parts(name)):
		cc = '#1f2a60' if c == INK else c
		if kind == 'fill':
			if tone in ('l', 'm', 'd'):
				l, m, d = TONE[name]
				defs += f'<linearGradient id="st{i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{l}"/><stop offset=".45" stop-color="{cc}"/><stop offset="1" stop-color="{d}"/></linearGradient>'
				cc = f'url(#st{i})'
			s += f'<path d="{p}" fill="{cc}" stroke="url(#au)" stroke-width="2.4" stroke-linejoin="round"/><path d="{p}" fill="url(#glint)"/>'
		else:
			s += f'<path d="{p}" fill="none" stroke="url(#au)" stroke-width="{w + 3}" stroke-linecap="round"/><path d="{p}" fill="none" stroke="{cc}" stroke-width="{max(1.5, w - 1.5)}" stroke-linecap="round"/>'
	return svg('Each part a cell of coloured stone or glass, shaded, with thin gold walls between the cells.', s + '\n', defs)


SETS = {'engraved': engraved, 'naqada': naqada, 'djoser-tiles': tiles, 'cloisonne': cloisonne}

if __name__ == '__main__':
	args = sys.argv[1:]
	sets = [a for a in args if a in SETS] or list(SETS)
	names = [a for a in args if a not in SETS] or sorted(SHAPES)
	for sid in sets:
		folder = os.path.join(OUT, sid)
		os.makedirs(folder, exist_ok=True)
		for n in names:
			with open(os.path.join(folder, n + '.svg'), 'w') as f: f.write(SETS[sid](n))
	print(f'{len(names)} amulets in {len(sets)} set(s), in images/amulet-sets/')
