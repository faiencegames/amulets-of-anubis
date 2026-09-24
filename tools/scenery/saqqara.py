"""Saqqara by day: the Step Pyramid of Djoser, six steps of stone, with the
panelled wall of its enclosure in front. The green of the Nile valley shows at
the edge of the desert on the left.

Run: python3 tools/scenery/saqqara.py > images/backdrops/saqqara.svg
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from palm import palm

INK = '#5a3a18'
LIT = '#e4c080'
SIDE = '#b88a4c'

out = []
w = out.append

w('<!-- Saqqara by day: the Step Pyramid of Djoser, six steps of stone, with the panelled wall of its enclosure in front, and the green of the Nile valley at the desert\'s edge. Drawn by tools/scenery/saqqara.py. 1600 by 1000. -->')
w('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">')
w('<defs>')
w('<linearGradient id="sqSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb6e0"/><stop offset=".6" stop-color="#e8e2c8"/><stop offset="1" stop-color="#f0d8a8"/></linearGradient>')
w('<linearGradient id="sqSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8c483"/><stop offset="1" stop-color="#c49050"/></linearGradient>')
w('<radialGradient id="sqSun"><stop offset="0" stop-color="#fffbe6"/><stop offset=".3" stop-color="#fff4c8" stop-opacity=".7"/><stop offset="1" stop-color="#fff0c0" stop-opacity="0"/></radialGradient>')
w('</defs>')
w('<rect width="1600" height="1000" fill="url(#sqSky)"/>')
w('<circle cx="300" cy="190" r="200" fill="url(#sqSun)"/>')
w('<circle cx="300" cy="190" r="50" fill="#fffbe6"/>')

# the desert horizon, with a far pyramid at Dahshur
w('<path d="M1330 600 L1380 548 L1430 600 Z" fill="#d8b884"/><path d="M1380 548 L1430 600 H1392 Z" fill="#c4a06c"/>')
w('<path d="M0 604 C300 596 700 598 1000 600 C1300 602 1450 598 1600 600 V1000 H0 Z" fill="#e4c890"/>')

# the green edge of the valley on the left
w('<path d="M0 600 C80 590 180 592 280 604 V620 H0 Z" fill="#7a9a50"/>')
for i, (x, h) in enumerate([(30, 110), (90, 140), (150, 100), (210, 125), (262, 90)]):
	w(palm(x, 612, h, lean=(0.06 if i % 2 else -0.05), seed=40 + i, light='#6a9050', dark='#4a6e3c', trunk='#8a6a40', ink='#5a4020', dates=False))

# the Step Pyramid: six steps, each with sloping sides, the sun on the left
cx, base = 900, 640
half, h = 380, 58
for i in range(6):
	y0 = base - i * h
	y1 = y0 - h
	a = half - i * 52
	b = a - 14                                # each step leans inwards
	# front face, lit
	w(f'<path d="M{cx - a} {y0} L{cx - b} {y1} H{cx + b - 60} L{cx + a - 70} {y0} Z" fill="{LIT}"/>')
	# the side in shade, on the right
	w(f'<path d="M{cx + a - 70} {y0} L{cx + b - 60} {y1} H{cx + b} L{cx + a} {y0} Z" fill="{SIDE}"/>')
	# courses and worn stone
	w(f'<path d="M{cx - a + 6} {y0 - h / 3:.0f} H{cx + a - 74} M{cx - a + 10} {y0 - 2 * h / 3:.0f} H{cx + a - 72}" stroke="{INK}" stroke-width="2" opacity=".18"/>')
	w(f'<path d="M{cx - a} {y0} L{cx - b} {y1} H{cx + b} L{cx + a} {y0} Z M{cx + a - 70} {y0} L{cx + b - 60} {y1}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round" opacity=".55"/>')
	# the shadow each step throws on the one below
	w(f'<path d="M{cx - b} {y1} H{cx + b} V{y1 + 8} H{cx - b} Z" fill="{INK}" opacity=".12"/>')

# the enclosure wall, with its panelled "palace façade" and bastions
wy, wh = 640, 90
w(f'<path d="M180 {wy + wh} V{wy} H1500 V{wy + wh} Z" fill="#dcc08a" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>')
panels = []
for x in range(196, 1490, 22):
	panels.append(f'M{x} {wy + 10} V{wy + wh - 6}')
w(f'<path d="{" ".join(panels)}" stroke="#bf9e66" stroke-width="7"/>')
for bx in range(180, 1500, 176):
	w(f'<path d="M{bx} {wy + wh} V{wy - 10} H{bx + 44} V{wy + wh} Z" fill="#e2c690" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>')
# the one true entrance, near the south-east corner
w(f'<path d="M1300 {wy + wh} V{wy + 30} H1330 V{wy + wh} Z" fill="#5a3a18"/>')

# sand in front, with a path to the gate
w('<path d="M0 740 C300 726 600 734 900 744 C1200 752 1420 736 1600 730 V1000 H0 Z" fill="url(#sqSand)"/>')
w('<path d="M1300 732 C1260 800 1180 880 1100 1000 H1300 C1320 900 1330 800 1330 732 Z" fill="#f0d49a" opacity=".65"/>')
w('<path d="M0 880 C400 840 800 860 1200 890 C1400 906 1500 900 1600 890 V1000 H0 Z" fill="#c89858"/>')
w('<g fill="#b8844c" opacity=".7"><ellipse cx="240" cy="820" rx="30" ry="8"/><ellipse cx="620" cy="800" rx="22" ry="6"/><ellipse cx="1480" cy="820" rx="34" ry="9"/><ellipse cx="420" cy="940" rx="40" ry="10"/></g>')

w('</svg>')
print('\n'.join(out))
