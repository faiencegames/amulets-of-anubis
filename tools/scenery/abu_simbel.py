"""Abu Simbel at dawn: the great temple of Ramesses II cut into the cliff.

Four seated colossi of the king, two each side of the door; the second from
the left lost its head and chest in an earthquake soon after it was carved,
and the pieces lie at its feet. Over the door, in a niche, the falcon-headed
Ra-Horakhty; along the top, a row of baboons greeting the sun. The temple
faces east, so the rising sun, behind us, lights the whole front.

Run: python3 tools/scenery/abu_simbel.py > images/backdrops/abu-simbel.svg
"""

INK = '#4a2010'
STONE = '#e0a070'
SHADE = '#b86a40'
DARK = '#8a4424'

out = []
w = out.append


def colossus(x, y, s, fallen=False):
	g = [f'<g transform="translate({x} {y}) scale({s})" stroke="{INK}" stroke-width="5" stroke-linejoin="round">']
	# throne block, with the side showing
	g.append(f'<path d="M-150 -330 H150 V0 H-150 Z" fill="{SHADE}"/>')
	g.append(f'<path d="M-150 -330 H-124 V0 H-150 Z M124 -330 H150 V0 H124 Z" fill="{DARK}"/>')
	# small figures of the royal family standing by the legs
	for fx in (-128, 128):
		g.append(f'<path d="M{fx - 16} 0 V-150 C{fx - 16} -176 {fx + 16} -176 {fx + 16} -150 V0 Z" fill="{STONE}"/>')
	g.append(f'<path d="M-18 0 V-110 C-18 -132 18 -132 18 -110 V0 Z" fill="{STONE}"/>')
	# shins and feet
	g.append(f'<path d="M-96 -340 H-22 L-26 -26 H-100 Z M22 -340 H96 L100 -26 H26 Z" fill="{STONE}"/>')
	g.append(f'<path d="M-108 -30 H-20 V0 H-108 Z M20 -30 H108 V0 H20 Z" fill="{STONE}"/>')
	# lap
	g.append(f'<path d="M-104 -380 H104 L100 -334 H-100 Z" fill="{STONE}"/>')
	if fallen:
		# broken off above the waist: a jagged edge
		g.append(f'<path d="M-100 -380 L-70 -420 L-40 -400 L-10 -446 L30 -410 L60 -430 L96 -384 Z" fill="{STONE}"/>')
		g.append('</g>')
		w(''.join(g))
		return
	# kilt front
	g.append(f'<path d="M-34 -380 H34 L28 -334 H-28 Z" fill="{SHADE}"/>')
	# torso and arms, hands on the knees
	g.append(f'<path d="M-92 -560 H92 L68 -380 H-68 Z" fill="{STONE}"/>')
	g.append(f'<path d="M-92 -560 L-120 -540 L-116 -450 L-98 -360 L-46 -346 L-50 -376 L-80 -392 L-80 -480 Z" fill="{STONE}"/>')
	g.append(f'<path d="M92 -560 L120 -540 L116 -450 L98 -360 L46 -346 L50 -376 L80 -392 L80 -480 Z" fill="{STONE}"/>')
	g.append(f'<path d="M-76 -560 C-54 -500 54 -500 76 -560 Z" fill="{SHADE}"/>')
	# the nemes headcloth, face and beard
	g.append(f'<path d="M-54 -640 C-58 -700 58 -700 54 -640 L82 -552 H50 L40 -610 C28 -650 -28 -650 -40 -610 L-50 -552 H-82 Z" fill="{SHADE}"/>')
	g.append(f'<ellipse cx="0" cy="-622" rx="42" ry="52" fill="{STONE}"/>')
	g.append(f'<path d="M-12 -574 H12 V-530 H-12 Z" fill="{SHADE}"/>')
	g.append(f'<path d="M0 -636 L-7 -604 H7 Z" fill="{SHADE}" stroke="none"/>')
	# the double crown of Upper and Lower Egypt
	# the white crown rises out of the red one, which has a tall back
	g.append(f'<path d="M-26 -720 C-32 -790 -16 -832 2 -838 C22 -828 30 -790 26 -720 Z" fill="{STONE}"/>')
	g.append(f'<path d="M-50 -672 L-46 -724 H26 L32 -806 H52 L50 -672 Z" fill="{SHADE}"/>')
	g.append('</g>')
	w(''.join(g))


def rubble(x, y):
	"""Broken pieces of the fallen colossus, lying at its feet."""
	for d in ('M0 0 L20 -40 L80 -52 L118 -20 L104 0 Z', 'M130 0 L150 -26 L196 -30 L214 0 Z', 'M-60 0 L-50 -22 L-10 -26 L0 0 Z'):
		w(f'<path transform="translate({x} {y})" d="{d}" fill="{STONE}" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>')


w('<!-- Abu Simbel at dawn: the great temple of Ramesses II, cut into the cliff. Four seated colossi of the king; the second from the left fell in an earthquake soon after it was carved, and the pieces lie at its feet. Ra-Horakhty in the niche over the door, baboons greeting the sun along the top. The temple faces east, so the rising sun behind us lights its front. Drawn by tools/scenery/abu_simbel.py. 1600 by 1000. -->')
w('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">')
w('<defs>')
w('<linearGradient id="asSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3e4a86"/><stop offset=".35" stop-color="#a8708e"/><stop offset=".65" stop-color="#f4b27a"/><stop offset="1" stop-color="#ffe0a8"/></linearGradient>')
w('<linearGradient id="asCliff" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9a5a36"/><stop offset=".5" stop-color="#c8804e"/><stop offset="1" stop-color="#9a5a36"/></linearGradient>')
w('<linearGradient id="asFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8a878"/><stop offset="1" stop-color="#cc8656"/></linearGradient>')
w('<linearGradient id="asSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0c088"/><stop offset="1" stop-color="#c88a50"/></linearGradient>')
w('<radialGradient id="asGlow" cx=".5" cy=".6" r=".6"><stop offset="0" stop-color="#ffd8a0" stop-opacity=".35"/><stop offset="1" stop-color="#ffd8a0" stop-opacity="0"/></radialGradient>')
w('</defs>')

w('<rect width="1600" height="1000" fill="url(#asSky)"/>')
# the mountain the temple is cut into
w(f'<path d="M0 330 C120 300 200 250 300 150 L1300 150 C1400 250 1480 290 1600 320 V1000 H0 Z" fill="url(#asCliff)"/>')
w(f'<path d="M0 420 C100 400 180 380 260 360 M1340 360 C1420 380 1500 400 1600 410 M0 560 C80 550 160 540 250 530 M1350 530 C1440 540 1520 550 1600 556" stroke="{DARK}" stroke-width="4" fill="none" opacity=".45"/>')

# the front of the temple: a sloping pylon face cut back into the rock
w(f'<path d="M250 910 L300 150 H1300 L1350 910 Z" fill="url(#asFront)" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>')
w(f'<path d="M300 150 H1300 V178 H300 Z" fill="{SHADE}" stroke="{INK}" stroke-width="5"/>')
# baboons along the top, seated, arms raised to the sun
bab = []
for i in range(22):
	bx = 322 + i * 43.5
	bab.append(f'M{bx:.0f} 150 V132 C{bx:.0f} 118 {bx + 6:.0f} 110 {bx + 13:.0f} 110 C{bx + 22:.0f} 110 {bx + 26:.0f} 118 {bx + 26:.0f} 128 V150 Z')
w(f'<path d="{" ".join(bab)}" fill="{STONE}" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>')
# the band of inscription under the cornice, shown as a plain carved band
w(f'<path d="M306 196 H1294 M306 214 H1294" stroke="{DARK}" stroke-width="4" opacity=".6"/>')

# the niche over the door, with Ra-Horakhty
w(f'<path d="M730 300 H870 V520 H730 Z" fill="{DARK}" stroke="{INK}" stroke-width="5"/>')
w(f'<g stroke="{INK}" stroke-width="4" stroke-linejoin="round">'
  f'<circle cx="800" cy="336" r="22" fill="#f0b050"/>'
  f'<path d="M784 380 C784 358 816 358 816 380 L824 392 L812 394 L812 404 H788 Z" fill="{STONE}"/>'
  f'<path d="M780 404 H820 L826 470 H774 Z" fill="{STONE}"/>'
  f'<path d="M778 470 H822 L818 516 H782 Z" fill="{STONE}"/>'
  '</g>')

# the door into the dark
w(f'<path d="M752 910 V600 H848 V910 Z" fill="#2a1208" stroke="{INK}" stroke-width="6"/>')
w(f'<path d="M740 590 H860 V608 H740 Z" fill="{SHADE}" stroke="{INK}" stroke-width="4"/>')

# the terrace the colossi sit on
w(f'<path d="M230 880 H1370 V920 H230 Z" fill="{SHADE}" stroke="{INK}" stroke-width="5"/>')

colossus(420, 882, 0.8)
colossus(628, 882, 0.8, fallen=True)
colossus(972, 882, 0.8)
colossus(1180, 882, 0.8)
rubble(560, 920)

# sunrise light on the front
w('<rect x="200" y="100" width="1200" height="900" fill="url(#asGlow)"/>')

# drifted sand in front, deeper on the right as the old travellers saw it
w('<path d="M0 950 C300 940 520 956 800 950 C1100 936 1300 880 1600 800 V1000 H0 Z" fill="url(#asSand)"/>')
w('<path d="M1180 900 C1300 870 1440 830 1600 800" stroke="#d8a468" stroke-width="5" fill="none" opacity=".7"/>')

w('</svg>')
print('\n'.join(out))
