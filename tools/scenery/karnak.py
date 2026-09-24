"""Karnak: inside the Great Hypostyle Hall.

A forest of columns in rows that go back into the dim hall. The great columns
of the middle aisle have open papyrus capitals; the rows beside them have
closed papyrus buds. The shafts are carved with scenes of the king making
offerings to the Gods, and with cartouches, and were painted. Light falls in
through the stone window grilles high in the clerestory.

Run: python3 tools/scenery/karnak.py > images/backdrops/karnak.svg
"""

INK = '#3a2412'

out = []
w = out.append


def figure(x, y, s, facing, fill):
	"""A standing figure in sunk relief, in profile: feet at (x, y)."""
	d = ('M-8 0 L-4 -40 L-10 -44 L-12 -70 L-8 -86 L-4 -88 L-5 -92 C-10 -94 -10 -108 -2 -110 '
		 'C6 -110 8 -100 6 -94 L4 -88 L10 -86 L16 -80 L26 -72 L24 -68 L12 -74 L10 -60 L12 -44 '
		 'L8 -40 L12 0 H4 L2 -34 H-2 L-2 0 Z')
	w(f'<path transform="translate({x:.0f} {y:.0f}) scale({s * facing:.2f} {s:.2f})" d="{d}" fill="{fill}"/>')


def column(cx, base, top, r, kind, fade=0.0, carved=True):
	"""A column: round base, shaft, binding bands, capital, abacus."""
	g = f'<g opacity="{1 - fade:.2f}">'
	w(g)
	# base disc
	w(f'<ellipse cx="{cx}" cy="{base}" rx="{r * 1.25:.0f}" ry="{r * 0.18:.0f}" fill="#6a4428"/>')
	w(f'<path d="M{cx - r * 1.25:.0f} {base} V{base - r * 0.2:.0f} H{cx + r * 1.25:.0f} V{base} Z" fill="#8a5e34"/>')
	# shaft
	shaft_top = top + r * (1.5 if kind == 'open' else 1.2)
	w(f'<path d="M{cx - r} {base - r * 0.2:.0f} V{shaft_top:.0f} H{cx + r} V{base - r * 0.2:.0f} Z" fill="url(#kCol)"/>')
	if carved:
		# registers of carved scenes: the king offers to a God
		reg_h = r * 1.15
		y = shaft_top + r * 0.9
		k = 0
		while y + reg_h < base - r * 0.8 and k < (2 if r > 80 else 1):
			w(f'<path d="M{cx - r} {y:.0f} H{cx + r}" stroke="{INK}" stroke-width="{max(1, r * 0.02):.1f}" opacity=".35"/>')
			s = reg_h / 120
			figure(cx - r * 0.35, y + reg_h - 6, s, 1, '#7a4e2a')
			figure(cx + r * 0.35, y + reg_h - 6, s, -1, '#7a4e2a')
			y += reg_h
			k += 1
		w(f'<path d="M{cx - r} {y:.0f} H{cx + r}" stroke="{INK}" stroke-width="{max(1, r * 0.02):.1f}" opacity=".35"/>')
		# a cartouche, carved upright
		w(f'<rect x="{cx - r * 0.12:.0f}" y="{shaft_top + r * 0.12:.0f}" width="{r * 0.24:.0f}" height="{r * 0.62:.0f}" rx="{r * 0.1:.0f}" fill="none" stroke="#7a4e2a" stroke-width="{max(1, r * 0.03):.1f}"/>')
	# the five bands that bind the stems below the capital, painted
	bands = ['#1f3a8a', '#e8c46a', '#a8341e', '#e8c46a', '#2e7d5b']
	bh = r * 0.06
	for i, c in enumerate(bands):
		yb = shaft_top - (i + 1) * bh
		w(f'<rect x="{cx - r:.0f}" y="{yb:.0f}" width="{2 * r:.0f}" height="{bh + 0.5:.1f}" fill="{c}"/>')
	cap_base = shaft_top - len(bands) * bh
	if kind == 'open':
		# the open papyrus umbel: a wide bell, fluted
		wide = r * 1.9
		w(f'<path d="M{cx - r} {cap_base:.0f} C{cx - r} {cap_base - r * 0.6:.0f} {cx - wide} {top + r * 0.5:.0f} {cx - wide:.0f} {top:.0f} H{cx + wide:.0f} C{cx + wide} {top + r * 0.5:.0f} {cx + r} {cap_base - r * 0.6:.0f} {cx + r} {cap_base:.0f} Z" fill="url(#kCol)" stroke="{INK}" stroke-width="{max(1, r * 0.02):.1f}" stroke-opacity=".5"/>')
		fl = []
		for i in range(-4, 5):
			t = i / 4
			fl.append(f'M{cx + t * r * 0.9:.0f} {cap_base:.0f} Q{cx + t * r * 1.2:.0f} {cap_base - r * 0.6:.0f} {cx + t * wide * 0.96:.0f} {top + 4:.0f}')
		w(f'<path d="{" ".join(fl)}" fill="none" stroke="{INK}" stroke-width="{max(1, r * 0.02):.1f}" opacity=".3"/>')
		w(f'<path d="M{cx - wide - 6:.0f} {top:.0f} H{cx + wide + 6:.0f} V{top + r * 0.1:.0f} H{cx - wide - 6:.0f} Z" fill="#1f3a8a" opacity=".7"/>')
		abacus_w = r * 1.1
	else:
		# the closed papyrus bud
		w(f'<path d="M{cx - r} {cap_base:.0f} C{cx - r * 1.35:.0f} {cap_base - r * 0.8:.0f} {cx - r * 0.9:.0f} {top + r * 0.2:.0f} {cx - r * 0.6:.0f} {top:.0f} H{cx + r * 0.6:.0f} C{cx + r * 0.9:.0f} {top + r * 0.2:.0f} {cx + r * 1.35:.0f} {cap_base - r * 0.8:.0f} {cx + r} {cap_base:.0f} Z" fill="url(#kCol)"/>')
		abacus_w = r * 0.8
	# the abacus block the roof beams rest on
	w(f'<path d="M{cx - abacus_w:.0f} {top:.0f} V{top - r * 0.35:.0f} H{cx + abacus_w:.0f} V{top:.0f} Z" fill="#6a4428"/>')
	w('</g>')


w('<!-- Karnak: inside the Great Hypostyle Hall. Rows of columns going back into the dim hall; the great columns of the middle aisle have open papyrus capitals, the others closed buds. Their shafts are carved with the king making offerings to the Gods, and with cartouches, and painted. Light falls through the stone window grilles of the clerestory. Drawn by tools/scenery/karnak.py. 1600 by 1000. -->')
w('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">')
w('<defs>')
w('<linearGradient id="kHall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a10"/><stop offset=".55" stop-color="#5a3a22"/><stop offset="1" stop-color="#7a5230"/></linearGradient>')
w('<linearGradient id="kCol" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a522c"/><stop offset=".3" stop-color="#e2b77a"/><stop offset=".55" stop-color="#c8955a"/><stop offset="1" stop-color="#5a3a1e"/></linearGradient>')
w('<linearGradient id="kBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c8" stop-opacity=".5"/><stop offset="1" stop-color="#fff2c8" stop-opacity="0"/></linearGradient>')
w('<linearGradient id="kFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6038"/><stop offset="1" stop-color="#4a3018"/></linearGradient>')
w('<filter id="kSoft" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="14"/></filter>')
w('</defs>')
w('<rect width="1600" height="1000" fill="url(#kHall)"/>')

# the clerestory: stone window grilles high in the middle, with daylight behind
w('<path d="M560 60 H1040 V190 H560 Z" fill="#1e120a"/>')
for i in range(4):
	x = 580 + i * 118
	w(f'<path d="M{x} 78 H{x + 90} V176 H{x} Z" fill="#fff0c8" opacity=".85"/>')
	slats = ' '.join(f'M{x + 10 + j * 14} 78 V176' for j in range(6))
	w(f'<path d="{slats}" stroke="#3a2412" stroke-width="7"/>')

# floor
w('<path d="M0 850 H1600 V1000 H0 Z" fill="url(#kFloor)"/>')

# the far rows, dim with distance: closed buds
for x in (120, 380, 640, 960, 1220, 1480):
	column(x, 850, 250, 34, 'bud', fade=0.55, carved=False)
for x in (250, 560, 1040, 1350):
	column(x, 870, 210, 52, 'bud', fade=0.35)

# shafts of light from the grilles, softened
w('<path d="M580 176 H1020 L1180 1000 H700 Z" fill="url(#kBeam)" filter="url(#kSoft)"/>')
w('<path d="M640 860 H1060 L1200 1000 H560 Z" fill="#f0cc90" opacity=".22" filter="url(#kSoft)"/>')

# the great columns of the middle aisle, near us
column(290, 1010, 90, 118, 'open')
column(1310, 1010, 90, 118, 'open')
column(-150, 1040, 40, 150, 'open')
column(1750, 1040, 40, 150, 'open')

# architraves resting on the near columns
w('<path d="M0 50 H560 V92 H0 Z M1040 50 H1600 V92 H1040 Z" fill="#5a3a20"/>')
w('<path d="M0 88 H560 M1040 88 H1600" stroke="#1f3a8a" stroke-width="6" opacity=".7"/>')

# the roof: stone beams painted with stars
w('<rect x="0" y="0" width="1600" height="50" fill="#1e140c"/>')
w('<rect x="0" y="46" width="1600" height="8" fill="#1f3a8a" opacity=".8"/>')
stars = ' '.join(f'M{x} 18 l3 7 7 1 -5 5 2 7 -7 -4 -7 4 2 -7 -5 -5 7 -1 z' for x in range(60, 1600, 120))
w(f'<path d="{stars}" fill="#e8c46a" opacity=".85"/>')
w('</svg>')
print('\n'.join(out))
