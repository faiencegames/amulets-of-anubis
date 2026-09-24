"""The tomb corridor, drawn in true one-point perspective.

World: the corridor is 1600 wide and 1000 high at the near plane (z = 0),
seen from its middle. A point (X, Y, z) lands on screen at
	x = 800 + X * k,  y = 500 + Y * k,  k = F / (F + z).
The far wall is at z = 3F, so it is a quarter of the size.
"""
import math, random

F = 1600.0
ZFAR = 3 * F
VX, VY = 800.0, 470.0


def k(z):
	return F / (F + z)


def P(X, Y, z):
	s = k(z)
	return (VX + X * s, VY + Y * s)


def fmt(pts):
	return ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)


def poly(pts, **attrs):
	a = ' '.join(f'{k_.replace("_", "-")}="{v}"' for k_, v in attrs.items())
	return f'<polygon points="{fmt(pts)}" {a}/>'


TOP, BOT = -470.0, 530.0  # ceiling and floor heights (world Y)
L, R = -800.0, 800.0

out = []
w = out.append

w('<!-- A tomb: a corridor running down into the rock, the way the tombs in the Valley of the Kings are cut. A ceiling of yellow stars on blue, painted bands and a procession of figures on the walls, torches in brackets, and the dark of the burial chamber at the end. For tomb and temple chambers (see content/chambers/, "scenery"). Drawn in one-point perspective by a script. 1600 by 1000. -->')
w('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">')
w('<defs>')
w('<linearGradient id="tbWallL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d2a468"/><stop offset=".55" stop-color="#a87840"/><stop offset="1" stop-color="#4a3018"/></linearGradient>')
w('<linearGradient id="tbWallR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#d2a468"/><stop offset=".55" stop-color="#a87840"/><stop offset="1" stop-color="#4a3018"/></linearGradient>')
w('<linearGradient id="tbCeil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d3b6e"/><stop offset="1" stop-color="#0c1830"/></linearGradient>')
w('<linearGradient id="tbFloor" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7a5230"/><stop offset="1" stop-color="#2a180a"/></linearGradient>')
w('<linearGradient id="tbShadeL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#140a02" stop-opacity="0"/><stop offset="1" stop-color="#140a02" stop-opacity=".75"/></linearGradient>')
w('<linearGradient id="tbShadeR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#140a02" stop-opacity="0"/><stop offset="1" stop-color="#140a02" stop-opacity=".75"/></linearGradient>')
w('<radialGradient id="tbDeep" cx=".5" cy=".6" r=".7"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#1a0f05"/></radialGradient>')
w('<radialGradient id="tbTorch"><stop offset="0" stop-color="#ffc466" stop-opacity=".5"/><stop offset=".5" stop-color="#ff9a3a" stop-opacity=".16"/><stop offset="1" stop-color="#ff9030" stop-opacity="0"/></radialGradient>')
w('<radialGradient id="tbFlame" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="#fff4c0"/><stop offset=".5" stop-color="#ffc040"/><stop offset="1" stop-color="#e06a18"/></radialGradient>')
w('</defs>')

# Surfaces. Corners are shared points, so the edges meet exactly.
nTL, nTR, nBL, nBR = P(L, TOP, 0), P(R, TOP, 0), P(L, BOT, 0), P(R, BOT, 0)
fTL, fTR, fBL, fBR = P(L, TOP, ZFAR), P(R, TOP, ZFAR), P(L, BOT, ZFAR), P(R, BOT, ZFAR)
# The near plane is a little bigger than the screen; extend it past the edges.
def near(X, Y):
	return P(X, Y, -F * 0.25)
eTL, eTR, eBL, eBR = near(L, TOP), near(R, TOP), near(L, BOT), near(R, BOT)

w(poly([eTL, eTR, fTR, fTL], fill='url(#tbCeil)'))
w(poly([eTL, fTL, fBL, eBL], fill='url(#tbWallL)'))
w(poly([eTR, fTR, fBR, eBR], fill='url(#tbWallR)'))
w(poly([eBL, fBL, fBR, eBR], fill='url(#tbFloor)'))

# Stars on the ceiling: five-pointed, as painted in the royal tombs.
rnd = random.Random(7)
stars = []
for i in range(90):
	X = rnd.uniform(L + 40, R - 40)
	z = rnd.uniform(-F * 0.25, ZFAR - 100) ** 1.0
	stars.append((z, X))
stars.sort(reverse=True)
for z, X in stars:
	cx, cy = P(X, TOP, z)
	s = 15 * k(z)
	# squash vertically: the ceiling is seen at a slant
	pts = []
	for j in range(10):
		a = -math.pi / 2 + j * math.pi / 5
		r = s if j % 2 == 0 else s * 0.42
		pts.append((cx + r * math.cos(a), cy + r * math.sin(a) * 0.55))
	op = 0.95 if z < ZFAR * 0.4 else 0.75 if z < ZFAR * 0.7 else 0.5
	w(poly(pts, fill='#f0c850', opacity=f'{op}'))

# Painted bands along each wall: they run to the vanishing point.
def band(side, y0, y1, colour, op=1.0):
	X = L if side < 0 else R
	pts = [near(X, y0), P(X, y0, ZFAR), P(X, y1, ZFAR), near(X, y1)]
	w(poly(pts, fill=colour, opacity=f'{op}'))

for side in (-1, 1):
	band(side, TOP, TOP + 34, '#2a1a0c')          # the edge of the rock
	band(side, TOP + 34, TOP + 58, '#2f6fc0')     # a blue band under the ceiling
	band(side, TOP + 58, TOP + 70, '#e8c050')
	band(side, TOP + 70, TOP + 90, '#b83a22')
	band(side, -40, -28, '#3b2406', 0.8)          # the line under the procession
	band(side, 330, BOT, '#5a2414', 0.85)         # a dark red dado
	band(side, 322, 330, '#2a1703', 0.8)


# The procession: figures in profile walking towards the burial chamber,
# drawn flat on the wall and projected point by point.
def on_wall(side, u, Y, z0):
	"""A point u along the wall (towards the far end) and Y down."""
	X = L if side < 0 else R
	# Stretched along the wall: seen this steeply, true proportions look like
	# sticks. A painter would widen them the same way.
	return P(X, Y * 1.15, z0 + u * 3.2)


def figure(side, z0, kilt, skin, collar, carry):
	# Local drawing: u forwards (towards the far end), Y down, feet at Y = -40.
	# Wall height of a figure: about 300.
	def pts(seq):
		return [on_wall(side, u, Y, z0) for u, Y in seq]
	parts = []
	# legs, striding
	parts.append((pts([(-34, -140), (-12, -140), (-4, -44), (-28, -40), (-44, -40), (-40, -48), (-26, -52)]), skin))
	parts.append((pts([(0, -140), (22, -140), (40, -52), (58, -48), (62, -40), (26, -40), (8, -60)]), skin))
	# kilt
	parts.append((pts([(-40, -210), (30, -210), (46, -132), (-38, -136)]), kilt))
	# body: shoulders seen from the front, as Egyptian painters drew them
	parts.append((pts([(-28, -300), (22, -300), (40, -290), (30, -240), (22, -206), (-36, -206), (-40, -250), (-48, -290)]), skin))
	# arms: the back one hanging, the front one carrying an offering forward
	parts.append((pts([(-46, -288), (-34, -286), (-40, -214), (-50, -212)]), skin))
	parts.append((pts([(30, -292), (40, -284), (72, -250), (66, -242)]), skin))
	# collar
	parts.append((pts([(-30, -300), (26, -300), (22, -284), (-26, -284)]), collar))
	# neck and head in profile, facing forward
	parts.append((pts([(-10, -306), (6, -306), (8, -300), (-12, -300)]), skin))
	parts.append((pts([(-18, -350), (6, -354), (20, -340), (24, -326), (16, -318), (10, -306), (-14, -304), (-22, -322)]), skin))
	# wig
	parts.append((pts([(-26, -356), (4, -362), (14, -346), (0, -340), (-4, -312), (-24, -300), (-32, -330)]), '#1c1208'))
	for p, c in parts:
		w(poly(p, fill=c, stroke='#2a1703', stroke_width=f'{max(1.2, 3 * k(z0)):.1f}', stroke_linejoin='round'))
	# what they carry: a lotus, a jar or a box of linen, held forward
	if carry == 'jar':
		w(poly(pts([(64, -262), (84, -262), (88, -240), (80, -220), (68, -220), (60, -240)]), fill='#2f6fc0', stroke='#2a1703', stroke_width=f'{max(1.2, 3 * k(z0)):.1f}'))
	elif carry == 'lotus':
		w(poly(pts([(66, -246), (70, -246), (74, -290), (70, -290)]), fill='#3c9a4a'))
		w(poly(pts([(62, -290), (72, -318), (82, -290), (72, -296)]), fill='#9fb8ff', stroke='#2a1703', stroke_width=f'{max(1, 2 * k(z0)):.1f}'))
	else:
		w(poly(pts([(58, -270), (96, -270), (96, -244), (58, -244)]), fill='#fffdf6', stroke='#2a1703', stroke_width=f'{max(1.2, 3 * k(z0)):.1f}'))


palette = [
	('#fffdf6', '#a0522d', '#2f6fc0', 'jar'),
	('#fffdf6', '#a0522d', '#38a8a0', 'lotus'),
	('#fffdf6', '#c88a50', '#b83a22', 'box'),
	('#fffdf6', '#a0522d', '#e0ac3a', 'lotus'),
	('#fffdf6', '#c88a50', '#2f6fc0', 'jar'),
]
for side in (-1, 1):
	# Far figures first so near ones overlap them.
	for i in reversed(range(len(palette))):
		z0 = 620 + i * 820
		kilt, skin, collar, carry = palette[(i + (side > 0)) % len(palette)]
		figure(side, z0, kilt, skin, collar, carry)

# Depth: the walls grow dark towards the far end.
w(poly([eTL, fTL, fBL, eBL], fill='url(#tbShadeL)'))
w(poly([eTR, fTR, fBR, eBR], fill='url(#tbShadeR)'))

# Floor: joints between the stone slabs, running away from us.
for zj in (300, 800, 1500, 2500, 3600):
	a, b = P(L, BOT, zj), P(R, BOT, zj)
	w(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="#2a1708" stroke-width="{max(1.5, 5 * k(zj)):.1f}" opacity=".55"/>')

# The far end: a doorway into the dark, with steps going down.
dL, dR, dT = -420, 420, -180
w(poly([P(L, TOP, ZFAR), P(R, TOP, ZFAR), P(R, BOT, ZFAR), P(L, BOT, ZFAR)], fill='#3a2410'))
w(poly([P(dL, dT, ZFAR), P(dR, dT, ZFAR), P(dR, BOT, ZFAR), P(dL, BOT, ZFAR)], fill='url(#tbDeep)'))
for i, Y in enumerate((420, 330, 250)):
	a, b = P(dL + 40, Y, ZFAR + i * 500), P(dR - 40, Y, ZFAR + i * 500)
	w(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="#4a3018" stroke-width="3" opacity="{0.5 - i * 0.12:.2f}"/>')
# lintel: a winged sun disc over the door
cx, cy = P(0, dT - 70, ZFAR)
s = k(ZFAR)
w(f'<g transform="translate({cx:.1f} {cy:.1f}) scale({s * 1.4:.3f})">'
  '<path d="M-26 0 C-80 -30 -150 -26 -210 -10 C-150 4 -80 10 -26 12 Z M26 0 C80 -30 150 -26 210 -10 C150 4 80 10 26 12 Z" fill="#2f6fc0" stroke="#2a1703" stroke-width="5" stroke-linejoin="round"/>'
  '<circle r="28" fill="#e0ac3a" stroke="#2a1703" stroke-width="5"/></g>')

# Torches in brackets on both walls, near us. The flame sits on the torch.
def torch(side):
	X = L if side < 0 else R
	z = 180
	bx, by = P(X, -120, z)
	s = k(z) * 0.8
	d = 1 if side < 0 else -1  # which way is into the corridor
	w(f'<circle cx="{bx + d * 60 * s:.1f}" cy="{by - 120 * s:.1f}" r="{360 * s:.1f}" fill="url(#tbTorch)"/>')
	w(f'<g transform="translate({bx:.1f} {by:.1f}) scale({s:.3f})">')
	# bracket fixed to the wall, holding the torch out and up
	w(f'<path d="M0 -20 L{d * 40} -20 L{d * 70} -60 M0 30 L{d * 30} 30 L{d * 62} -40" fill="none" stroke="#2a1703" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>')
	w(f'<rect x="-8" y="-40" width="16" height="90" rx="4" fill="#3b2406"/>')
	# the torch: a wooden handle wrapped with linen at the top
	w(f'<path d="M{d * 54} 20 L{d * 76} -110 L{d * 94} -108 L{d * 70} 22 Z" fill="#6e4220" stroke="#2a1703" stroke-width="5" stroke-linejoin="round"/>')
	w(f'<path d="M{d * 72} -100 L{d * 78} -140 L{d * 100} -136 L{d * 96} -98 Z" fill="#ece3cc" stroke="#2a1703" stroke-width="5" stroke-linejoin="round"/>')
	fx = d * 89
	w(f'<path d="M{fx} -226 C{fx - 26} -190 {fx - 34} -160 {fx - 18} -140 C{fx - 8} -128 {fx + 8} -128 {fx + 18} -140 C{fx + 34} -160 {fx + 22} -196 {fx} -226 Z" fill="url(#tbFlame)"/>')
	w('</g>')

torch(-1)
torch(1)

w('</svg>')
print('\n'.join(out))
