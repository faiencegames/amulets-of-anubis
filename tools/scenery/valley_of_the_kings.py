"""The Valley of the Kings in the evening: el-Qurn and the tombs below it.

El-Qurn, "the horn", is a natural peak shaped like a pyramid that stands over
the valley; the kings of the New Kingdom were buried in tombs cut into the
rock beneath it. Here the last sun lights the peak while the first stars come
out and the valley below is already in shadow. The tomb entrances are cut
into the foot of the cliffs, with a sloping cutting leading down to each door.

Run: python3 tools/scenery/valley_of_the_kings.py > images/backdrops/valley-of-the-kings.svg
"""
import random

INK = '#3a2418'

out = []
w = out.append

w('<!-- The Valley of the Kings in the evening: the natural peak of el-Qurn lit by the last sun over the valley, the first stars coming out, and tomb entrances cut into the foot of the cliffs, each reached by a sloping cutting. Drawn by tools/scenery/valley_of_the_kings.py. 1600 by 1000. -->')
w('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">')
w('<defs>')
w('<linearGradient id="vkSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2450"/><stop offset=".45" stop-color="#4a4a86"/><stop offset=".75" stop-color="#c88a8a"/><stop offset="1" stop-color="#f0b88a"/></linearGradient>')
w('<linearGradient id="vkPeakLit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4b070"/><stop offset="1" stop-color="#b8703e"/></linearGradient>')
w('<linearGradient id="vkPeakShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a4a3a"/><stop offset="1" stop-color="#5a3030"/></linearGradient>')
w('<linearGradient id="vkCliff" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a48"/><stop offset="1" stop-color="#5a3a34"/></linearGradient>')
w('<linearGradient id="vkFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6048"/><stop offset="1" stop-color="#4a3028"/></linearGradient>')
w('</defs>')
w('<rect width="1600" height="1000" fill="url(#vkSky)"/>')

# the first stars, only in the darker sky
rnd = random.Random(11)
stars = []
for i in range(70):
	x = rnd.uniform(0, 1600)
	y = rnd.uniform(10, 330) * rnd.uniform(0.4, 1)
	r = rnd.choice((1.2, 1.5, 2, 2.6))
	stars.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="#fff6dc" opacity="{rnd.uniform(0.5, 0.95):.2f}"/>')
w(''.join(stars))
w('<path d="M1300 80 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="#fff6dc"/>')  # the evening star

# el-Qurn: a natural peak, uneven, in layers of limestone
peak = 'M470 600 L560 520 L610 500 L660 430 L700 400 L740 330 L790 250 L820 190 L850 170 L880 196 L920 262 L980 330 L1030 380 L1090 430 L1150 480 L1220 520 L1300 600 L1320 710 H450 L470 600 Z'
w(f'<path d="{peak}" fill="url(#vkPeakShade)"/>')
# the west faces still catch the sun
w('<path d="M470 600 L560 520 L610 500 L660 430 L700 400 L740 330 L790 250 L820 190 L850 170 L846 230 L820 300 L800 380 L770 460 L740 540 L720 600 L700 710 H450 Z" fill="url(#vkPeakLit)"/>')
strata = []
for i, y in enumerate(range(260, 600, 44)):
	strata.append(f'M{560 + (600 - y) * 0.2:.0f} {y + 6} C{700} {y - 4} {900} {y + 10} {1200 - (600 - y) * 0.3:.0f} {y}')
w(f'<clipPath id="vkPeakClip"><path d="{peak}"/></clipPath>')
w(f'<path d="{" ".join(strata)}" stroke="{INK}" stroke-width="3" fill="none" opacity=".25" clip-path="url(#vkPeakClip)"/>')
w(f'<path d="{peak}" fill="none" stroke="{INK}" stroke-width="3" stroke-linejoin="round" opacity=".5"/>')

# the valley walls on both sides, already in shadow, with bands of rock
w('<path d="M0 420 L90 400 L180 430 L270 414 L360 460 L440 480 L520 560 L560 700 H0 Z" fill="url(#vkCliff)"/>')
w('<path d="M1600 400 L1500 392 L1420 420 L1330 414 L1240 470 L1160 520 L1090 620 L1050 700 H1600 Z" fill="url(#vkCliff)"/>')
w('<path d="M360 460 L440 480 L520 560 L560 700 H470 L430 560 Z M1240 470 L1160 520 L1090 620 L1050 700 H1140 L1190 590 Z" fill="#4a2e2a" opacity=".5"/>')
bands = 'M0 500 C150 494 300 504 440 520 M0 590 C200 584 380 596 500 610 M1600 488 C1450 484 1300 494 1190 510 M1600 580 C1400 576 1240 590 1120 606'
w(f'<path d="{bands}" stroke="#4a2e2a" stroke-width="6" fill="none" opacity=".45"/>')

# tomb entrances: a sloping cutting down to a doorway in the rock
def tomb(x, y, s):
	w(f'<g transform="translate({x} {y}) scale({s})">'
	  '<path d="M-60 60 L-34 0 H34 L60 60 Z" fill="#6a4232"/>'
	  '<path d="M-34 0 V-70 H34 V0 Z" fill="#1a0e0a"/>'
	  f'<path d="M-44 -70 H44 V-84 H-44 Z" fill="#b88a6a" stroke="{INK}" stroke-width="2"/>'
	  f'<path d="M-44 -84 V0 M44 -84 V0" stroke="#9a6a50" stroke-width="10"/>'
	  '<path d="M-26 14 H26 M-32 30 H32 M-40 46 H40" stroke="#4a2e24" stroke-width="3" opacity=".7"/>'
	  '</g>')

# the valley floor and a path winding up to the tombs, with scree
w('<path d="M0 690 C200 670 420 684 600 694 C760 702 860 692 1000 690 C1200 684 1400 674 1600 684 V1000 H0 Z" fill="url(#vkFloor)"/>')
w('<path d="M780 700 C760 760 700 820 600 880 C520 930 470 970 440 1000 H760 C780 950 820 890 860 840 C890 800 900 740 880 700 Z" fill="#b8906a" opacity=".45"/>')
tomb(200, 640, 0.9)
tomb(400, 690, 0.7)
tomb(1400, 640, 0.9)
tomb(1200, 690, 0.7)

scree = []
for i in range(40):
	x = rnd.uniform(0, 1600)
	y = rnd.uniform(720, 990)
	r = 3 + (y - 700) / 40
	scree.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{r * 1.8:.0f}" ry="{r * 0.6:.0f}" fill="#3a2420" opacity=".35"/>')
w(''.join(scree))
w('</svg>')
print('\n'.join(out))
