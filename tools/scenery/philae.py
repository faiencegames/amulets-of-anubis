"""Philae at dusk: the island of Isis, seen from the water.

The temple of Isis in silhouette against the evening sky: its great first
pylon with the gateway, the smaller second pylon behind, a colonnade, and the
Kiosk of Trajan at the water's edge, with palms. The low sun on the right,
its light broken on the river.

Run: python3 tools/scenery/philae.py > images/backdrops/philae.svg
"""
import os, sys, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from palm import palm

SIL = '#2a1e3a'

out = []
w = out.append

w('<!-- Philae at dusk: the island of Isis from the water. The first pylon of her temple with its gateway, the second pylon behind, a colonnade and the Kiosk of Trajan at the water\'s edge, with palms, all in silhouette; the low sun on the right, its light broken on the river. Drawn by tools/scenery/philae.py. 1600 by 1000. -->')
w('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">')
w('<defs>')
w('<linearGradient id="phSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3a86"/><stop offset=".45" stop-color="#b5709a"/><stop offset=".6" stop-color="#f7c08a"/></linearGradient>')
w('<linearGradient id="phWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a86b8"/><stop offset=".4" stop-color="#6a5a98"/><stop offset="1" stop-color="#2e2a62"/></linearGradient>')
w('<radialGradient id="phSun"><stop offset="0" stop-color="#ffe8c0"/><stop offset=".3" stop-color="#ffd0a0" stop-opacity=".6"/><stop offset="1" stop-color="#f7c08a" stop-opacity="0"/></radialGradient>')
w('</defs>')
w('<rect width="1600" height="600" fill="url(#phSky)"/>')
w('<circle cx="1200" cy="530" r="200" fill="url(#phSun)"/>')
w('<circle cx="1200" cy="540" r="54" fill="#ffe0b0"/>')
# far hills of the east bank
w('<path d="M860 586 C940 560 1020 556 1100 572 C1200 552 1320 548 1420 566 C1500 558 1560 562 1600 570 V600 H860 Z" fill="#6a4a78" opacity=".7"/>')
w('<path d="M0 590 C60 574 120 570 180 582 V600 H0 Z" fill="#6a4a78" opacity=".7"/>')

sil = []
# the island's rocky shore
sil.append('M150 600 C200 578 280 572 360 576 L1130 576 C1170 578 1190 590 1210 600 Z')
# first pylon: two towers leaning inwards, a cornice on each, and the gateway between
sil.append('M330 576 L348 380 H500 L516 576 Z M320 380 H508 V368 H340 Z')
sil.append('M540 576 L556 380 H708 L724 576 Z M536 380 H724 V368 H556 Z')
sil.append('M512 576 V450 H544 V576 Z M504 450 H552 V438 H504 Z')
# second pylon, further back and smaller
sil.append('M740 576 L748 470 H810 L816 576 Z M836 576 L842 470 H902 L910 576 Z M810 576 V520 H840 V576 Z')
# the Kiosk of Trajan at the water's edge: columns with a screen wall between them
kx = 940
sil.append(f'M{kx} 576 V520 H{kx + 200} V576 Z')
for i in range(6):
	x = kx + 6 + i * 38
	sil.append(f'M{x} 520 V452 H{x + 12} V520 Z M{x - 6} 452 C{x - 6} 438 {x + 18} 438 {x + 18} 452 Z')
sil.append(f'M{kx - 8} 438 H{kx + 208} V424 H{kx - 8} Z')
w(f'<path d="{" ".join(sil)}" fill="{SIL}"/>')

# palms on the island, in silhouette
for x, h, lean, seed in [(250, 150, -0.08, 61), (292, 120, 0.06, 62), (925, 130, 0.08, 63), (1170, 110, -0.06, 64)]:
	w(palm(x, 578, h, lean=lean, seed=seed, light=SIL, dark=SIL, trunk=SIL, ink=SIL, dates=False))

# the river, with the island mirrored in it
w('<rect x="0" y="600" width="1600" height="400" fill="url(#phWater)"/>')
w(f'<g opacity=".35" transform="translate(0 1200) scale(1 -1)"><path d="{" ".join(sil)}" fill="{SIL}"/></g>')
w('<rect x="0" y="600" width="1600" height="400" fill="url(#phWater)" opacity=".45"/>')
# the sun's light broken on the water
rnd = random.Random(5)
glints = []
for i in range(30):
	y = 604 + i * 12
	width = rnd.uniform(40, 150) * (1 + i / 30)
	x = 1200 - width / 2 + rnd.uniform(-60, 60)
	glints.append(f'<rect x="{x:.0f}" y="{y}" width="{width:.0f}" height="4" rx="2" fill="#ffe0b0" opacity="{0.55 - i * 0.017:.2f}"/>')
w(''.join(glints))
# ripples
w('<path d="M120 700 H260 M340 760 H520 M160 840 H320 M560 900 H760 M400 960 H560 M80 930 H200" stroke="#c8b0d8" stroke-width="3" stroke-linecap="round" opacity=".35"/>')
w('</svg>')
print('\n'.join(out))
