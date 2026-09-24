"""Giza at sunset: the three great pyramids and the Sphinx.

From the left: the Great Pyramid of Khufu; Khafre's, which looks the tallest
because it stands on higher ground and still has some of its smooth casing at
the top; the smaller pyramid of Menkaure with the three small queens'
pyramids beside it. The Sphinx lies below Khafre's pyramid. The sun sets
behind them, in the west.

Run: python3 tools/scenery/giza.py > images/backdrops/giza.svg
"""

INK = '#3a1a14'
LIT = '#e08a52'
SHADE = '#7a3e36'

out = []
w = out.append


def pyramid(ax, ay, base_y, half, split=0.18, casing=0.0, lit=LIT, shade=SHADE):
	"""A pyramid seen from a corner: a lit face on the left, a shaded one on the right."""
	lx, rx = ax - half, ax + half
	sx = ax + half * split  # where the near corner meets the ground
	w(f'<path d="M{lx:.0f} {base_y} L{ax:.0f} {ay} L{sx:.0f} {base_y} Z" fill="{lit}"/>')
	w(f'<path d="M{sx:.0f} {base_y} L{ax:.0f} {ay} L{rx:.0f} {base_y} Z" fill="{shade}"/>')
	# courses of stone: faint lines across each face
	lines = []
	for i in range(1, 14):
		t = i / 14
		y = ay + (base_y - ay) * t
		xl = ax + (lx - ax) * t
		xs = ax + (sx - ax) * t
		xr = ax + (rx - ax) * t
		lines.append(f'M{xl:.1f} {y:.1f} L{xs:.1f} {y:.1f}')
		lines.append(f'M{xs:.1f} {y:.1f} L{xr:.1f} {y:.1f}')
	w(f'<path d="{" ".join(lines)}" stroke="{INK}" stroke-width="1.5" opacity=".18"/>')
	if casing:
		# the smooth casing stones left at the top, paler
		t = casing
		y = ay + (base_y - ay) * t
		w(f'<path d="M{ax + (lx - ax) * t:.1f} {y:.1f} L{ax:.0f} {ay} L{ax + (sx - ax) * t:.1f} {y:.1f} Z" fill="#f4b884"/>')
		w(f'<path d="M{ax + (sx - ax) * t:.1f} {y:.1f} L{ax:.0f} {ay} L{ax + (rx - ax) * t:.1f} {y:.1f} Z" fill="#9a5448"/>')
	w(f'<path d="M{lx:.0f} {base_y} L{ax:.0f} {ay} L{rx:.0f} {base_y} M{ax:.0f} {ay} L{sx:.0f} {base_y}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round" opacity=".6"/>')


w('<!-- Giza at sunset: from the left the Great Pyramid of Khufu, Khafre\'s pyramid with some of its smooth casing still at the top, and Menkaure\'s with three small queens\' pyramids. The Sphinx lies below. The sun sets behind them in the west. Drawn by tools/scenery/giza.py. 1600 by 1000. -->')
w('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">')
w('<defs>')
w('<linearGradient id="gzSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#43306a"/><stop offset=".35" stop-color="#b8566e"/><stop offset=".6" stop-color="#f3954a"/><stop offset=".72" stop-color="#ffd28a"/></linearGradient>')
w('<radialGradient id="gzSun"><stop offset="0" stop-color="#fff0c0"/><stop offset=".25" stop-color="#ffd890" stop-opacity=".7"/><stop offset="1" stop-color="#ffb060" stop-opacity="0"/></radialGradient>')
w('<linearGradient id="gzSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b86a44"/><stop offset="1" stop-color="#7a3a28"/></linearGradient>')
w('</defs>')
w('<rect width="1600" height="1000" fill="url(#gzSky)"/>')
# a few thin clouds lit from below
w('<path d="M120 250 C260 236 420 240 560 252 M980 190 C1120 178 1280 182 1420 196 M1060 214 C1160 206 1260 208 1340 216" stroke="#f6b08a" stroke-width="6" stroke-linecap="round" fill="none" opacity=".55"/>')
# the sun, low, between the pyramids
w('<circle cx="820" cy="610" r="260" fill="url(#gzSun)"/>')
w('<circle cx="820" cy="620" r="62" fill="#ffe7b0"/>')

# far desert
w('<path d="M0 700 C300 690 600 694 900 690 C1200 686 1400 690 1600 694 V1000 H0 Z" fill="#b8704a"/>')

pyramid(1330, 520, 704, 150)                 # Menkaure
for qx in (1452, 1494, 1536):                # the queens' pyramids
	pyramid(qx, 660, 706, 24, lit='#d27e4c', shade='#6e3830')
pyramid(1010, 290, 708, 360, casing=0.12)    # Khafre
pyramid(560, 330, 712, 370)                  # Khufu

# the plateau and the dunes in front
w('<path d="M0 712 C200 700 420 706 640 716 C860 724 1100 716 1300 708 C1440 704 1540 706 1600 708 V1000 H0 Z" fill="url(#gzSand)"/>')

# the Sphinx, lying facing east (to the left), below Khafre's pyramid
w(f'<path d="M700 812 V794 H772 C770 780 768 770 770 758 L766 742 L768 722 L762 714 L768 700 C776 690 800 686 812 690 L826 704 L838 752 C880 748 960 748 1000 756 C1030 764 1044 790 1046 812 Z" fill="#8a4a36" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
w(f'<path d="M772 700 C780 690 800 688 812 692 L826 706 L838 752 H808 L800 716 L776 708 Z" fill="#6e3a2c"/>')   # the nemes headcloth
w(f'<path d="M680 812 H1070 V826 H680 Z" fill="#6a3424"/>')

# dunes near us
w('<path d="M0 860 C260 820 520 830 760 870 C1000 900 1300 850 1600 830 V1000 H0 Z" fill="#6a3424"/>')
w('<path d="M0 930 C300 900 700 920 1000 940 C1250 956 1450 930 1600 920 V1000 H0 Z" fill="#552a1e"/>')

# a small caravan on the near dune, for scale
def camel(x, y, s):
	"""A camel walking to the right, in silhouette."""
	w(f'<g transform="translate({x} {y}) scale({s})" fill="#2e1510">'
	  '<path d="M-42 -38 C-42 -54 -26 -58 -14 -58 C-6 -86 24 -86 32 -58 C40 -54 46 -48 46 -40 L42 -32 H-38 Z"/>'
	  '<path d="M40 -52 C52 -58 58 -72 60 -86 L72 -88 C76 -82 74 -76 68 -74 C64 -60 56 -44 42 -34 Z"/>'
	  '<path d="M-36 -34 H-30 L-32 0 H-38 Z M-24 -34 H-18 L-16 0 H-22 Z M26 -34 H32 L30 0 H24 Z M36 -34 H42 L44 0 H38 Z"/>'
	  '</g>')

camel(1180, 884, 0.9)
camel(1270, 878, 0.9)

w('</svg>')
print('\n'.join(out))
