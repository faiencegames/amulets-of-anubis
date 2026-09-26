"""Amarna at noon: the Aten, the sun's disc, over the city Akhenaten built.

The Aten is drawn as Amarna's own carvings show it: a disc whose rays end in
small hands, some holding an ankh, the sign of life. Below, the low ruins of
the city on its wide plain, the open courts of the Great Aten Temple with
rows of offering tables and the cliffs of the eastern desert behind.

Run: python3 tools/scenery/amarna.py > images/backdrops/amarna.svg
"""
import math

INK = '#6a4210'

out = []
w = out.append

w('<!-- Amarna at noon: the Aten, the sun\'s disc, with rays ending in hands as the carvings of Amarna show it, some holding the ankh. Below, the low ruins of Akhenaten\'s city on its plain, the open courts of the Great Aten Temple with rows of offering tables, and the cliffs of the eastern desert. Drawn by tools/scenery/amarna.py. 1600 by 1000. -->')
w('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">')
w('<defs>')
w('<linearGradient id="amSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6d890"/><stop offset=".5" stop-color="#fbe8b8"/><stop offset="1" stop-color="#f8e2b0"/></linearGradient>')
w('<radialGradient id="amDisc" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff3ae"/><stop offset=".6" stop-color="#e0ac3a"/><stop offset="1" stop-color="#b87a18"/></radialGradient>')
w('<radialGradient id="amGlow"><stop offset="0" stop-color="#fff6c8" stop-opacity=".9"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>')
w('<linearGradient id="amCliff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2b474"/><stop offset="1" stop-color="#c8945a"/></linearGradient>')
w('<linearGradient id="amPlain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ecc88a"/><stop offset="1" stop-color="#d4a462"/></linearGradient>')
w('</defs>')
w('<rect width="1600" height="1000" fill="url(#amSky)"/>')

# the cliffs of the eastern desert, with the wadi that leads to the royal tomb
w(f'<path d="M0 560 L60 520 L200 512 L320 526 L440 506 L600 514 L700 530 L760 560 L800 540 L860 520 L1000 510 L1160 522 L1300 504 L1440 516 L1600 506 V640 H0 Z" fill="url(#amCliff)"/>')
w(f'<path d="M700 530 L760 560 L800 540 L790 640 H720 Z" fill="#b8844a"/>')
w(f'<path d="M0 580 C300 572 600 576 900 580 C1200 584 1400 578 1600 574" stroke="#c89458" stroke-width="4" fill="none" opacity=".6"/>')

# the Aten: rays first, then hands, then the disc on top
cx, cy, r = 800, 180, 86
w('<circle cx="800" cy="180" r="240" fill="url(#amGlow)"/>')
rays, hands = [], []
n = 13
for i in range(n):
	a = math.radians(25 + i * (130 / (n - 1)))
	length = 250 + 60 * math.sin(math.pi * i / (n - 1))
	x0, y0 = cx + math.cos(a) * (r + 6), cy + math.sin(a) * (r + 6)
	x1, y1 = cx + math.cos(a) * length, cy + math.sin(a) * length
	rays.append(f'M{x0:.0f} {y0:.0f} L{x1:.0f} {y1:.0f}')
	deg = math.degrees(a) - 90
	# a small open hand at the end of the ray, fingers pointing away from the sun
	hand = ('<g transform="scale(1.6)"><path d="M-6 0 H6 L7 12 V21 C7 23 5 23 5 21 V15 H3.5 V23 C3.5 25 1.5 25 1.5 23 V15 H-0.5 V23 C-0.5 25 -2.5 25 -2.5 23 V15 H-4.5 V20 C-4.5 22 -6.5 22 -6.5 20 L-7 12 L-11 7 C-12 5 -10 3 -8 5 L-6 6 Z"'
		f' fill="#e0ac3a" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>')
	if i % 3 == 1:
		# an ankh, the sign of life, held out to the city
		hand += (f'<path d="M0 22 V40 M-8 40 H8 M0 40 C-8 44 -8 56 0 58 C8 56 8 44 0 40 Z" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>')
	hand += '</g>'
	hands.append(f'<g transform="translate({x1:.0f} {y1:.0f}) rotate({deg:.1f})">{hand}</g>')
w(f'<path d="{" ".join(rays)}" stroke="#d09a2a" stroke-width="5" stroke-linecap="round"/>')
w(''.join(hands))
w(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#amDisc)" stroke="{INK}" stroke-width="5"/>')
# the cobra at the base of the disc
w(f'<path d="M786 {cy + r - 2} C784 {cy + r + 18} 800 {cy + r + 24} 806 {cy + r + 8} C810 {cy + r - 2} 800 {cy + r - 6} 796 {cy + r + 2}" fill="#e0ac3a" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')

# the plain
w('<path d="M0 630 C400 622 800 626 1200 630 C1400 632 1500 630 1600 628 V1000 H0 Z" fill="url(#amPlain)"/>')

# the Great Aten Temple: open courts without roofs, filled with offering tables
def court(x, y, wd, ht, rows, cols):
	w(f'<path d="M{x} {y + ht} V{y} H{x + wd} V{y + ht} Z" fill="#e8c08a" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
	w(f'<path d="M{x + 6} {y + ht} V{y + 8} H{x + wd - 6} V{y + ht}" fill="none" stroke="#c89458" stroke-width="3"/>')
	tables = []
	for rr in range(rows):
		for c in range(cols):
			tx = x + 18 + c * (wd - 36) / max(1, cols - 1)
			ty = y + 20 + rr * (ht - 30) / max(1, rows - 1)
			tables.append(f'M{tx - 5:.0f} {ty:.0f} h10 v5 h-10 Z')
	w(f'<path d="{" ".join(tables)}" fill="#d0a060" stroke="{INK}" stroke-width="1.2"/>')

# pylons at the entrance, then courts running back
w(f'<path d="M430 700 L440 640 H520 L530 700 Z M560 700 L570 640 H650 L660 700 Z" fill="#e8c890" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
w(f'<path d="M444 700 L452 652 H508 L516 700 M574 700 L582 652 H638 L646 700" fill="none" stroke="#c89458" stroke-width="3"/>')
court(680, 660, 280, 44, 3, 12)
court(980, 666, 200, 38, 3, 9)
court(1200, 672, 150, 32, 2, 7)

# low walls of houses: foundations in the sand, as the city is today
walls = []
plans = [
	lambda x, y, wd, ht: f'M{x} {y} H{x + wd} V{y + ht} H{x} Z M{x + wd * 0.45:.0f} {y} V{y + ht * 0.6:.0f} M{x} {y + ht * 0.5:.0f} H{x + wd * 0.3:.0f}',
	lambda x, y, wd, ht: f'M{x} {y} H{x + wd} V{y + ht} H{x} Z M{x + wd * 0.3:.0f} {y + ht} V{y + ht * 0.35:.0f} H{x + wd * 0.7:.0f} V{y + ht}',
	lambda x, y, wd, ht: f'M{x} {y + ht} V{y} H{x + wd * 0.6:.0f} M{x + wd} {y + ht * 0.3:.0f} V{y + ht} H{x} M{x + wd * 0.6:.0f} {y} V{y + ht * 0.5:.0f} H{x + wd * 0.2:.0f}',
	lambda x, y, wd, ht: f'M{x} {y} H{x + wd} V{y + ht} H{x + wd * 0.4:.0f} M{x} {y} V{y + ht * 0.7:.0f} M{x + wd * 0.5:.0f} {y} V{y + ht * 0.45:.0f} H{x + wd}',
]
for i, (x, y, wd, ht) in enumerate([(80, 760, 150, 60), (260, 780, 110, 50), (120, 850, 180, 70), (380, 840, 120, 56),
		(1080, 780, 140, 54), (1260, 800, 160, 60), (1150, 870, 120, 50), (1340, 890, 190, 64)]):
	walls.append(plans[(i * 3 + 1) % 4](x, y, wd * 1.2, ht * 0.55))
w(f'<path d="{" ".join(walls)}" fill="none" stroke="#b88048" stroke-width="7" stroke-linejoin="round"/>')
w(f'<path d="{" ".join(walls)}" fill="none" stroke="#f0d09a" stroke-width="3" stroke-linejoin="round" transform="translate(-1 -2)"/>')

# the royal road through the city
w('<path d="M760 1000 C770 900 780 800 790 720 H830 C840 800 860 900 880 1000 Z" fill="#f4d8a0" opacity=".6"/>')
w('</svg>')
print('\n'.join(out))
