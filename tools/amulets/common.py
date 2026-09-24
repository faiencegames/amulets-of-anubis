"""Shared pieces for drawing amulets in the game's style:
a thick dark outline, glazed gradients, one soft highlight, a drop shadow."""

INK = '#2a1703'

GRADS = {
	'gold': ('#fffbd8', '#f5d04e', '#c08a1c', '#6e4608'),
	'lapis': ('#c8d8ff', '#4f86d8', '#2f6fc0', '#1d3f78'),
	'carnelian': ('#ffc0b0', '#e0604a', '#b83a22', '#7a1f12'),
	'turquoise': ('#d8fff8', '#6ed0c4', '#38a8a0', '#1f6a64'),
	'malachite': ('#c8f0b8', '#6ac070', '#3c9a4a', '#1f5a2a'),
	'linen': ('#ffffff', '#fffdf6', '#ece3cc', '#b8aa88'),
	'calcite': ('#ffffff', '#f6f0e0', '#e2d6b8', '#a8987a'),
}


def head(comment):
	return (f'<!-- {comment} 128 by 128. Drawn by tools/amulets/. -->\n'
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">\n<defs>\n'
		'\t<filter id="sh" filterUnits="userSpaceOnUse" x="-50" y="-50" width="228" height="228"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#190c00" flood-opacity=".55"/></filter>\n')


def grad(gid, name, x1=24, y1=6, x2=104, y2=120):
	a, b, c, d = GRADS[name]
	return (f'\t<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">'
		f'<stop offset="0" stop-color="{a}"/><stop offset=".35" stop-color="{b}"/><stop offset=".72" stop-color="{c}"/><stop offset="1" stop-color="{d}"/></linearGradient>\n')


def shadow_outline(d, width=9, rule='nonzero'):
	"""The outline drawn once underneath with the shadow, so shapes share one
	shadow. rule='evenodd' leaves holes open (a ring)."""
	return f'<path d="{d}" fill="{INK}" fill-rule="{rule}" stroke="{INK}" stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round" filter="url(#sh)"/>\n'


def highlight(d, width=3.5):
	return f'<path d="{d}" fill="none" stroke="#fffbe0" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>\n'
