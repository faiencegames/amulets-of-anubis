"""Deir el-Bahari by day: Hatshepsut's temple in its bay of cliffs.

Three terraces of pillared porticoes, one above and behind the other, joined
by ramps up the middle; the upper one had statues of the queen as Osiris
along its front. In the forecourt, trees in planting pits, as the temple had
myrrh trees brought from Punt. The cliffs are kept from the older drawing.

Run: python3 tools/scenery/deir_el_bahari.py > images/backdrops/deir-el-bahari.svg
"""

INK = '#6a4a2c'
FACE = '#f4e6c8'
SHADE = '#8a6a48'
FLOOR = '#fcf0d6'

out = []
w = out.append

w('<!-- Deir el-Bahari: Hatshepsut\'s terraced temple against the bay of cliffs, three pillared terraces joined by ramps, and trees in planting pits in the forecourt, as the temple had myrrh trees brought from Punt. Drawn by tools/scenery/deir_el_bahari.py. 1600 by 1000. -->')
w('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">')
w('<defs>\n  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ea2cc"/><stop offset=".5" stop-color="#b4d0de"/><stop offset=".62" stop-color="#f0dcb4"/></linearGradient>\n  <linearGradient id="plain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2be86"/><stop offset="1" stop-color="#b08048"/></linearGradient>\n</defs>')
w('<rect width="1600" height="1000" fill="url(#sky)"/>\n<!-- the bay of cliffs: a curved wall of buttresses, lit and shaded -->\n<path d="M0 210 L140 200 L260 230 L380 190 L520 214 L640 180 L760 204 L880 176 L1000 206 L1120 184 L1240 214 L1360 196 L1480 222 L1600 204 V720 H0 Z" fill="#dcaa6e"/>\n<g fill="#b77e46">\n  <path d="M60 206 L90 720 H40 L20 208 Z"/><path d="M200 216 L236 720 H176 L150 212 Z"/><path d="M330 200 L372 720 H300 L280 206 Z"/><path d="M470 208 L512 720 H440 L420 206 Z"/>\n  <path d="M600 190 L640 720 H570 L560 194 Z"/><path d="M740 200 L776 720 H716 L700 196 Z"/><path d="M880 180 L910 720 H850 L840 184 Z"/>\n  <path d="M1010 204 L1040 720 H980 L970 200 Z"/><path d="M1150 190 L1186 720 H1126 L1110 196 Z"/><path d="M1290 204 L1330 720 H1266 L1250 206 Z"/><path d="M1430 212 L1474 720 H1400 L1390 210 Z"/><path d="M1560 206 L1600 720 H1540 L1520 208 Z"/>\n</g>\n<g fill="#eec48a" opacity=".6">\n  <path d="M120 204 L140 720 H124 L110 204 Z"/><path d="M400 196 L420 720 H404 L390 196 Z"/><path d="M680 186 L700 720 H684 L670 186 Z"/><path d="M960 196 L980 720 H964 L950 196 Z"/><path d="M1220 208 L1240 720 H1224 L1210 208 Z"/><path d="M1500 216 L1520 720 H1504 L1490 216 Z"/>\n</g>\n<g fill="#a86e3c" opacity=".45">\n  <path d="M0 300 C400 290 800 306 1200 292 C1400 286 1500 296 1600 290 V304 C1400 312 1000 300 600 316 C300 322 100 312 0 318 Z"/>\n  <path d="M0 400 C300 390 700 404 1100 392 C1300 388 1500 398 1600 394 V406 C1300 414 900 402 500 416 C250 420 80 412 0 416 Z"/>\n</g>\n<path d="M0 210 L140 200 L260 230 L380 190 L520 214 L640 180 L760 204 L880 176 L1000 206 L1120 184 L1240 214 L1360 196 L1480 222 L1600 204 V232 L1480 250 L1360 224 L1240 242 L1120 212 L1000 234 L880 204 L760 232 L640 208 L520 242 L380 218 L260 258 L140 228 L0 238 Z" fill="#9a6232" opacity=".55"/>\n<path d="M0 470 C300 452 600 470 800 460 C1000 450 1300 468 1600 456 V720 H0 Z" fill="#c9955a" opacity=".45"/>\n')

cx = 800


def terrace(half, top, bottom, pillar_w, gap, ramp_half, osiride=False):
	"""One terrace: a floor strip on top, then a portico of square pillars, split by the ramp."""
	w(f'<path d="M{cx - half} {top} H{cx + half} V{bottom} H{cx - half} Z" fill="{SHADE}" stroke="{INK}" stroke-width="2"/>')
	w(f'<path d="M{cx - half - 6} {top - 10} H{cx + half + 6} V{top + 4} H{cx - half - 6} Z" fill="{FLOOR}" stroke="{INK}" stroke-width="2"/>')
	pillars = []
	x = cx - half + gap
	while x + pillar_w <= cx + half - gap:
		if not (cx - ramp_half - pillar_w < x < cx + ramp_half):
			pillars.append(f'M{x} {top + 4} h{pillar_w} V{bottom} h-{pillar_w} Z')
			if osiride:
				# the queen as Osiris, arms crossed, carved against each pillar
				hx = x + pillar_w / 2
				pillars.append(f'M{hx - 5:.0f} {top + 22} a5 6 0 1 1 10 0 v6 h-10 Z')
		x += pillar_w + gap
	w(f'<path d="{" ".join(pillars)}" fill="{FACE}" stroke="{INK}" stroke-width="1.5"/>')


# the top terrace, then the middle, then the lowest, each nearer and wider
terrace(300, 505, 565, 14, 12, 24)
terrace(400, 575, 648, 16, 16, 60)
w('<path d="M0 718 H1600 V1000 H0 Z" fill="url(#plain)"/>')
terrace(520, 660, 734, 18, 20, 70)

# the ramps up the middle, with low parapets on their sides
def ramp(foot_y, foot_half, top_y, top_half):
	w(f'<path d="M{cx - foot_half} {foot_y} L{cx - top_half} {top_y} H{cx + top_half} L{cx + foot_half} {foot_y} Z" fill="#ecdcb8" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>')
	w(f'<path d="M{cx - foot_half} {foot_y} L{cx - top_half} {top_y} M{cx + foot_half} {foot_y} L{cx + top_half} {top_y}" stroke="#d2b88a" stroke-width="8"/>')

ramp(660, 60, 570, 44)

# the forecourt, with the causeway coming towards us
w(f'<path d="M{cx - 90} 820 H{cx + 90} L{cx + 190} 1000 H{cx - 190} Z" fill="#ead6ae"/>')
ramp(820, 90, 655, 58)

# trees in their planting pits, in rows either side of the causeway
def tree(x, y, s):
	w(f'<g transform="translate({x} {y}) scale({s})">'
	  '<ellipse cx="0" cy="4" rx="34" ry="9" fill="#8a6038" opacity=".55"/>'
	  f'<path d="M-3 4 L-2 -26 H2 L3 4 Z" fill="#6a4a2a"/>'
	  '<circle cx="-14" cy="-34" r="16" fill="#3f6a32"/><circle cx="14" cy="-34" r="16" fill="#3f6a32"/><circle cx="0" cy="-46" r="18" fill="#4f7a3a"/>'
	  '<circle cx="-5" cy="-51" r="7" fill="#6f9a4a"/>'
	  '</g>')

for i, y in enumerate((780, 850, 940)):
	s = 0.9 + i * 0.35
	d = 150 + i * 70
	tree(cx - d, y, s)
	tree(cx + d, y, s)

w('</svg>')
print('\n'.join(out))
