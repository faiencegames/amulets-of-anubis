"""A date palm, drawn as a group: a ringed, slightly leaning trunk and a crown
of arching, feathered fronds, with clusters of dates. Base at (0, 0), height
about 1 unit times `h`.
"""
import math, random


def _f(v):
	return f'{v:.0f}'


def frond(cx, cy, ang, length, droop, fill, ink, rnd):
	"""One frond: a rachis that arches and droops, with leaflets on both sides."""
	pts_top, pts_bot = [], []
	n = 11
	spine = []
	for i in range(n + 1):
		t = i / n
		x = cx + math.cos(ang) * length * t
		y = cy + math.sin(ang) * length * t + droop * length * t * t
		spine.append((x, y))
	shapes = []
	for i in range(1, n + 1):
		(x0, y0), (x1, y1) = spine[i - 1], spine[i]
		dx, dy = x1 - x0, y1 - y0
		d = math.hypot(dx, dy) or 1
		nx, ny = -dy / d, dx / d
		t = i / n
		leaf = length * 0.22 * (1 - t) ** 0.6 + length * 0.03
		for side in (1, -1):
			# leaflets hang down and forward
			lx = x0 + (nx * side * 0.6 + dx / d * 0.55) * leaf
			ly = y0 + (ny * side * 0.55 + dy / d * 0.6) * leaf + leaf * 0.5 * abs(math.cos(ang))
			shapes.append(f'M{_f(x0)} {_f(y0)} L{_f(lx)} {_f(ly)} L{_f(x1)} {_f(y1)} Z')
	spine_d = 'M' + ' L'.join(f'{_f(x)} {_f(y)}' for x, y in spine)
	return (f'<path d="{" ".join(shapes)}" fill="{fill}" stroke="{fill}" stroke-width="1.2" stroke-linejoin="round"/>'
		f'<path d="{spine_d}" fill="none" stroke="{ink}" stroke-width="{max(1.2, length * 0.018):.1f}" stroke-linecap="round"/>')


def palm(x, y, h, lean=0.08, seed=1, light='#4a9a48', dark='#2a6a34', trunk='#7a5230', ink='#3a2410', dates=True):
	rnd = random.Random(seed)
	top_x = x + lean * h
	top_y = y - h
	out = []
	# trunk: a tapered, gently curved band
	n = 16
	left, right = [], []
	for i in range(n + 1):
		t = i / n
		cx = x + lean * h * (t ** 1.4)
		cy = y - h * t
		wdt = h * (0.034 - 0.012 * t)
		left.append((cx - wdt, cy))
		right.append((cx + wdt, cy))
	poly = left + right[::-1]
	out.append(f'<path d="M{" L".join(f"{_f(a)} {_f(b)}" for a, b in poly)} Z" fill="{trunk}" stroke="{ink}" stroke-width="{max(1.5, h * 0.008):.1f}" stroke-linejoin="round"/>')
	# rings where old fronds were cut
	rings = []
	for i in range(2, n):
		t = i / n
		cx = x + lean * h * (t ** 1.4)
		cy = y - h * t
		wdt = h * (0.034 - 0.012 * t)
		rings.append(f'M{_f(cx - wdt)} {_f(cy)} Q{_f(cx)} {_f(cy + wdt * 0.5)} {_f(cx + wdt)} {_f(cy)}')
	out.append(f'<path d="{" ".join(rings)}" fill="none" stroke="{ink}" stroke-width="{max(1, h * 0.005):.1f}" opacity=".45"/>')
	# fronds: the back ones darker, then dates, then the front ones
	L = h * 0.42
	back = [-2.75, -2.2, -1.55, -0.95, -0.4]
	front = [-3.1, -2.55, -1.95, -1.3, -0.7, -0.05]
	def droop(a):
		# upright fronds hardly bend; the outer ones arch over and hang
		return 0.25 + 1.1 * abs(math.cos(a)) ** 1.5
	for a in back:
		a += rnd.uniform(-0.08, 0.08)
		out.append(frond(top_x, top_y, a, L * rnd.uniform(0.8, 0.95), droop(a), dark, ink, rnd))
	if dates:
		for sx in (-1, 1):
			bx = top_x + sx * h * 0.035
			by = top_y + h * 0.03
			r = h * 0.014
			cl = []
			for j in range(7):
				cl.append(f'<circle cx="{_f(bx + sx * (j % 3) * r * 1.3)}" cy="{_f(by + (j // 3) * r * 1.5 + (j % 3) * r * 0.4)}" r="{_f(r)}"/>')
			out.append(f'<g fill="#b8641e" stroke="{ink}" stroke-width="{max(0.8, r * 0.3):.1f}">{"".join(cl)}</g>')
	for a in front:
		a += rnd.uniform(-0.06, 0.06)
		out.append(frond(top_x, top_y, a, L * rnd.uniform(0.9, 1.08), droop(a), light, ink, rnd))
	return '<g>' + ''.join(out) + '</g>'
