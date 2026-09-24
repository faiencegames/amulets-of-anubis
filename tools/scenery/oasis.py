"""An oasis in the Western Desert: a spring-fed pool among date palms, with a
mud-brick village on the rise behind it and dunes beyond."""
from palm import palm

out = []
w = out.append
INK = '#3a2410'

w('<!-- An oasis in the Western Desert: a spring-fed pool among date palms, a mud-brick village on the rise behind, dunes beyond and a high sun. For oasis chambers (see content/chambers/, "scenery"). Drawn by a script. 1600 by 1000. -->')
w('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">')
w('<defs>')
w('<linearGradient id="oSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb4e4"/><stop offset=".65" stop-color="#cfe6ee"/><stop offset="1" stop-color="#f4e2b6"/></linearGradient>')
w('<linearGradient id="oDuneFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ecd0a0"/><stop offset="1" stop-color="#d8b47a"/></linearGradient>')
w('<linearGradient id="oDune" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8c483"/><stop offset="1" stop-color="#b98848"/></linearGradient>')
w('<linearGradient id="oPool" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd0ec"/><stop offset=".45" stop-color="#4a9ad8"/><stop offset="1" stop-color="#1f5f9e"/></linearGradient>')
w('<radialGradient id="oSun"><stop offset="0" stop-color="#fffbe0"/><stop offset=".3" stop-color="#fff0b0" stop-opacity=".8"/><stop offset="1" stop-color="#ffe090" stop-opacity="0"/></radialGradient>')
w('<clipPath id="oPoolClip"><path d="M340 792 C400 734 560 712 780 710 C1000 708 1180 726 1250 758 C1300 782 1284 812 1240 830 C1150 866 1000 876 840 872 C680 880 500 866 400 838 C350 822 326 808 340 792 Z"/></clipPath>')
w('</defs>')

w('<rect width="1600" height="1000" fill="url(#oSky)"/>')
w('<circle cx="1260" cy="150" r="240" fill="url(#oSun)"/>')
w('<circle cx="1260" cy="150" r="46" fill="#fffbe6"/>')

# far dunes
w('<path d="M0 560 C180 500 380 510 560 548 C760 490 980 480 1180 530 C1350 500 1480 505 1600 530 V1000 H0 Z" fill="url(#oDuneFar)"/>')

# the village on the rise: mud-brick houses, flat roofs, small windows
houses = [(560, 560, 70, 46), (620, 540, 60, 66), (676, 552, 84, 54), (752, 530, 56, 78), (802, 548, 74, 58), (870, 558, 60, 46), (924, 566, 50, 38)]
w('<path d="M520 610 C600 540 900 536 1000 606 Z" fill="#d8ae72"/>')
for x, y, wd, ht in houses:
	w(f'<path d="M{x} {y + ht} V{y} H{x + wd} V{y + ht} Z" fill="#c89868" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
	w(f'<path d="M{x + wd - 12} {y} V{y + ht}" stroke="#a8784a" stroke-width="10"/>')
	w(f'<rect x="{x + wd * 0.3:.0f}" y="{y + 14}" width="8" height="10" fill="{INK}"/>')
w(f'<path d="M558 606 H928" stroke="{INK}" stroke-width="3"/>')

# small palms along the far side of the pool
for i, (x, h) in enumerate([(380, 150), (450, 190), (1000, 200), (1080, 160), (1150, 185), (1220, 140)]):
	w(palm(x, 700, h, lean=(0.06 if i % 2 else -0.06), seed=10 + i, light='#5a9a50', dark='#3a6e3a', trunk='#8a6038'))

# near dunes and the green ground around the water
w('<path d="M0 690 C240 660 520 680 800 690 C1080 676 1340 660 1600 686 V1000 H0 Z" fill="url(#oDune)"/>')
w('<path d="M300 780 C380 700 1200 700 1320 780 C1330 830 1200 890 800 895 C420 890 290 840 300 780 Z" fill="#7aa050" opacity=".8"/>')

# the pool, with the sky and palms in it
w('<path d="M340 792 C400 734 560 712 780 710 C1000 708 1180 726 1250 758 C1300 782 1284 812 1240 830 C1150 866 1000 876 840 872 C680 880 500 866 400 838 C350 822 326 808 340 792 Z" fill="url(#oPool)" stroke="#1f5f9e" stroke-width="5"/>')
w('<path d="M470 760 C560 748 650 748 740 760 M840 790 C930 778 1020 778 1110 790 M620 826 C690 818 760 818 830 826" stroke="#e4f6ff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".75"/>')

# reeds at the water's edge
reeds = []
for bx, n in ((352, 7), (1262, 7)):
	for j in range(n):
		x0 = bx + (j - n / 2) * 7
		lean = (j - n / 2) * 6
		h = 50 + (j * 13) % 36
		base_y = 800 if bx in (352, 1262) else 872
		reeds.append(f'M{x0:.0f} {base_y} Q{x0 + lean * 0.3:.0f} {base_y - h * 0.6:.0f} {x0 + lean:.0f} {base_y - h:.0f}')
w(f'<path d="{" ".join(reeds)}" fill="none" stroke="#3c7a34" stroke-width="5" stroke-linecap="round"/>')

# big palms framing the view
w(palm(320, 880, 400, lean=-0.1, seed=2, light='#3f8a40', dark='#245a2e'))
w(palm(1290, 880, 420, lean=0.1, seed=3, light='#3f8a40', dark='#245a2e'))
w(palm(130, 920, 640, lean=0.1, seed=1))
w(palm(1480, 920, 660, lean=-0.1, seed=4))

# the sand in front
w('<path d="M0 900 C300 870 600 900 800 910 C1050 896 1300 880 1600 900 V1000 H0 Z" fill="#c89a58"/>')
w('<path d="M120 950 C220 940 320 940 420 950 M1120 952 C1220 942 1340 942 1440 952" stroke="#a8783e" stroke-width="4" fill="none" stroke-linecap="round"/>')

w('</svg>')
print('\n'.join(out))
