"""Alexandria by day: the Pharos, the great lighthouse, over the harbour.

The lighthouse in its three stages, as ancient writers and coins describe it:
a tall square tower, an eight-sided one above it and a round one at the top
where the fire burned. It stands on the island of Pharos at the mouth of the
harbour; across the water, the white city Alexander founded and ships under
square sails.

Run: python3 tools/scenery/alexandria.py > images/backdrops/alexandria.svg
"""
import os, sys, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from palm import palm

INK = '#4a5a6a'
WHITE = '#f6f0e2'
SHADE = '#d4c8ae'

out = []
w = out.append

w('<!-- Alexandria by day: the Pharos, the great lighthouse, in its three stages (square, eight-sided and round, with the fire at the top) on its island at the mouth of the harbour; across the water the white city, and ships under square sails. Drawn by tools/scenery/alexandria.py. 1600 by 1000. -->')
w('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">')
w('<defs>')
w('<linearGradient id="axSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb4ec"/><stop offset="1" stop-color="#dff0fa"/></linearGradient>')
w('<linearGradient id="axSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a8cc8"/><stop offset="1" stop-color="#123e72"/></linearGradient>')
w('<linearGradient id="axTower" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fffaf0"/><stop offset=".7" stop-color="#ece2cc"/><stop offset="1" stop-color="#c8b898"/></linearGradient>')
w('<radialGradient id="axFire"><stop offset="0" stop-color="#fff4c0"/><stop offset=".4" stop-color="#ffc060" stop-opacity=".7"/><stop offset="1" stop-color="#ffb040" stop-opacity="0"/></radialGradient>')
w('</defs>')
w('<rect width="1600" height="620" fill="url(#axSky)"/>')
w('<circle cx="260" cy="170" r="70" fill="#fffbe6"/>')
w('<path d="M420 140 C520 128 620 132 700 144 M480 164 C560 156 640 158 700 166 M1180 150 C1280 140 1380 144 1460 156 M1240 176 C1320 168 1400 170 1460 178" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".6" fill="none"/>')

# the city across the harbour, on the left
city = []
rnd = random.Random(3)
x = 0
while x < 640:
	wd = rnd.randint(34, 70)
	ht = rnd.randint(24, 64)
	city.append((x, 612 - ht, wd, ht))
	x += wd - 4
for x, y, wd, ht in city:
	w(f'<path d="M{x} 614 V{y} H{x + wd} V614 Z" fill="{WHITE}" stroke="{INK}" stroke-width="1.5" stroke-linejoin="round"/>')
	w(f'<path d="M{x + wd - 8} {y} V614" stroke="{SHADE}" stroke-width="10"/>')
	for j in range(max(1, wd // 22)):
		w(f'<rect x="{x + 8 + j * 20}" y="{y + 10}" width="6" height="8" fill="{INK}" opacity=".5"/>')
# a temple with a pediment and columns, and palms among the houses
tx = 300
w(f'<path d="M{tx} 560 L{tx + 80} 520 L{tx + 160} 560 Z" fill="{WHITE}" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>')
w(f'<path d="M{tx + 6} 560 H{tx + 154} V614 H{tx + 6} Z" fill="{SHADE}" stroke="{INK}" stroke-width="2"/>')
cols = ' '.join(f'M{tx + 14 + i * 22} 562 h10 v52 h-10 Z' for i in range(7))
w(f'<path d="{cols}" fill="{WHITE}" stroke="{INK}" stroke-width="1"/>')
for px, ph in ((120, 90), (520, 80), (610, 96)):
	w(palm(px, 610, ph, lean=0.05, seed=px, light='#5a8a4a', dark='#3e6a38', trunk='#8a6a40', ink='#4a3a20', dates=False))
w(f'<path d="M0 612 H660 C680 614 700 620 710 626 H0 Z" fill="#d8c8a0"/>')

# the sea
w('<rect x="0" y="620" width="1600" height="380" fill="url(#axSea)"/>')
w('<rect x="0" y="620" width="1600" height="6" fill="#dff0fa" opacity=".5"/>')

# the island of Pharos, the rocks, and the lighthouse
w(f'<path d="M760 640 C800 612 880 604 960 606 C1060 606 1140 612 1200 628 V660 H760 Z" fill="#c8b890" stroke="{INK}" stroke-width="2"/>')
w(f'<path d="M780 650 L810 628 L850 634 L870 652 Z M1120 650 L1150 628 L1190 636 L1200 652 Z" fill="#9a8c70"/>')
lx = 970
# the base court and the square first stage
w(f'<path d="M{lx - 130} 626 V596 H{lx + 130} V626 Z" fill="{SHADE}" stroke="{INK}" stroke-width="2"/>')
w(f'<path d="M{lx - 80} 596 L{lx - 68} 330 H{lx + 68} L{lx + 80} 596 Z" fill="url(#axTower)" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>')
win = ' '.join(f'M{lx - 6} {y} h12 v18 h-12 Z' for y in (380, 440, 500, 555))
w(f'<path d="{win}" fill="{INK}" opacity=".6"/>')
w(f'<path d="M{lx - 76} 330 H{lx + 76} V316 H{lx - 76} Z" fill="{SHADE}" stroke="{INK}" stroke-width="2"/>')
# the eight-sided second stage: three faces show
w(f'<path d="M{lx - 50} 316 L{lx - 44} 200 H{lx + 44} L{lx + 50} 316 Z" fill="url(#axTower)" stroke="{INK}" stroke-width="2.5" stroke-linejoin="round"/>')
w(f'<path d="M{lx - 24} 316 L{lx - 20} 200 M{lx + 24} 316 L{lx + 20} 200" stroke="{INK}" stroke-width="1.5" opacity=".5"/>')
w(f'<path d="M{lx - 50} 200 H{lx + 50} V190 H{lx - 50} Z" fill="{SHADE}" stroke="{INK}" stroke-width="2"/>')
# the round top stage, with the fire
w(f'<path d="M{lx - 26} 190 V132 H{lx + 26} V190 Z" fill="url(#axTower)" stroke="{INK}" stroke-width="2.5"/>')
w(f'<circle cx="{lx}" cy="118" r="70" fill="url(#axFire)"/>')
w(f'<path d="M{lx - 30} 132 H{lx + 30} V124 H{lx - 30} Z" fill="{SHADE}" stroke="{INK}" stroke-width="2"/>')
w(f'<path d="M{lx} 76 C{lx - 16} 96 {lx - 18} 112 {lx - 10} 122 H{lx + 10} C{lx + 18} 112 {lx + 16} 96 {lx} 76 Z" fill="#ff9a30"/>')
w(f'<path d="M{lx} 92 C{lx - 8} 104 {lx - 8} 114 {lx - 4} 122 H{lx + 4} C{lx + 8} 114 {lx + 8} 104 {lx} 92 Z" fill="#fff0a0"/>')

# ships under square sails
def ship(x, y, s, flip=1):
	w(f'<g transform="translate({x} {y}) scale({s * flip} {s})">'
	  f'<path d="M-70 0 C-40 16 40 16 70 0 L80 -14 H-80 Z" fill="#7a4a24" stroke="#3a2412" stroke-width="3" stroke-linejoin="round"/>'
	  f'<path d="M72 -14 C84 -24 88 -36 84 -46" fill="none" stroke="#3a2412" stroke-width="5" stroke-linecap="round"/>'
	  '<path d="M0 -14 V-120" stroke="#3a2412" stroke-width="5"/>'
	  '<path d="M-50 -110 H50 C54 -80 52 -50 46 -28 H-46 C-52 -50 -54 -80 -50 -110 Z" fill="#fbf4e2" stroke="#3a2412" stroke-width="3" stroke-linejoin="round"/>'
	  '<path d="M-52 -112 H52" stroke="#3a2412" stroke-width="5" stroke-linecap="round"/>'
	  '</g>')

ship(420, 730, 0.9)
ship(1340, 860, 1.3, -1)
ship(1320, 690, 0.6, -1)
ship(180, 850, 0.7)

# waves
rnd = random.Random(9)
waves = []
for i in range(46):
	x = rnd.uniform(0, 1580)
	y = rnd.uniform(660, 990)
	s = 0.6 + (y - 640) / 400
	waves.append(f'M{x:.0f} {y:.0f} q{12 * s:.0f} {-7 * s:.0f} {24 * s:.0f} 0 q{12 * s:.0f} {7 * s:.0f} {24 * s:.0f} 0')
w(f'<path d="{" ".join(waves)}" stroke="#fff" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/>')
w('</svg>')
print('\n'.join(out))
