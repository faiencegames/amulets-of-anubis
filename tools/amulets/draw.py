"""Draws the amulets that are made by script, into images/amulets/.

Run: python3 tools/amulets/draw.py            (all of them)
     python3 tools/amulets/draw.py crown aten (only these)

The others in images/amulets/ are drawn by hand.
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import INK, head, grad, shadow_outline, highlight

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'images', 'amulets')
DRAW = {}


def amulet(fn):
	DRAW[fn.__name__] = fn
	return fn


@amulet
def cartouche():
	# Upright cartouche: a rope oval with a bar under it, enclosing a king's
	# name. The name is Thutmose III's throne name, Men-kheper-Ra: the sun
	# disc (Ra), the gaming board (men) and the scarab (kheper).
	oval = 'M64 8 C82 8 94 20 94 38 V84 C94 100 82 108 64 108 C46 108 34 100 34 84 V38 C34 20 46 8 64 8 Z'
	bar = 'M26 106 H102 V120 H26 Z'
	s = head('A cartouche, the oval that encloses a king\'s name: here Thutmose III\'s throne name, Men-kheper-Ra, written with the sun disc, the gaming board and the scarab.')
	s += grad('gold', 'gold') + grad('field', 'linen', 40, 14, 90, 104) + '</defs>\n'
	s += shadow_outline(oval + ' ' + bar)
	s += f'<path d="{oval}" fill="url(#gold)"/>\n'
	s += f'<path d="{bar}" fill="url(#gold)"/>\n'
	inner = 'M64 17 C77 17 85 26 85 40 V82 C85 94 77 99 64 99 C51 99 43 94 43 82 V40 C43 26 51 17 64 17 Z'
	s += f'<path d="{inner}" fill="url(#field)" stroke="{INK}" stroke-width="3"/>\n'
	# the sun disc
	s += f'<circle cx="64" cy="33" r="8.5" fill="#d8482a" stroke="{INK}" stroke-width="2.4"/>\n'
	# the gaming board with its pieces
	s += f'<path d="M50 56 H78 V62 H50 Z" fill="#2f6fc0" stroke="{INK}" stroke-width="2.2"/>\n'
	s += f'<path d="M52 56 V50 M57 56 V50 M62 56 V50 M67 56 V50 M72 56 V50 M77 56 V50" stroke="#2f6fc0" stroke-width="3"/>\n'
	# the scarab
	s += f'<ellipse cx="64" cy="82" rx="10" ry="11" fill="#2f6fc0" stroke="{INK}" stroke-width="2.2"/>\n'
	s += f'<path d="M58 72 C60 68 68 68 70 72 Z" fill="#1d3f78" stroke="{INK}" stroke-width="2"/>\n'
	s += f'<path d="M64 73 V93 M54 76 L49 72 M74 76 L79 72 M54 88 L49 92 M74 88 L79 92" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>\n'
	s += highlight('M40 36 C40 24 48 14 60 12') + highlight('M32 110 H60', 3)
	return s + '</svg>\n'


@amulet
def crown():
	# The blue crown, the khepresh, in profile as the kings are shown wearing
	# it: rising and sweeping back, covered in small gold discs, with a band
	# at the brow and the cobra rising at the front.
	shape = 'M30 106 L30 64 C30 44 42 30 58 22 C72 15 90 12 104 14 C110 30 110 54 104 72 C100 84 94 92 94 106 Z'
	s = head('The blue crown, the khepresh, in profile: rising and sweeping back, blue, covered in small gold discs, with a band at the brow and the cobra at the front.')
	# the deep royal blue of the older drawing
	s += ('\t<linearGradient id="lapis" gradientUnits="userSpaceOnUse" x1="24" y1="6" x2="104" y2="120"><stop offset="0" stop-color="#9fb8ff"/>'
		'<stop offset=".35" stop-color="#3a62d0"/><stop offset=".72" stop-color="#16307e"/><stop offset="1" stop-color="#0a1848"/></linearGradient>\n')
	s += grad('gold', 'gold', 30, 90, 94, 118) + '</defs>\n'
	s += shadow_outline(shape + ' M22 72 C18 60 22 50 30 48 L34 70 Z')
	s += f'<path d="{shape}" fill="url(#lapis)"/>\n'
	dots = []
	for y in range(28, 92, 12):
		for x in range(34, 108, 12):
			dots.append(f'<circle cx="{x + (y // 12 % 2) * 6}" cy="{y}" r="2"/>')
	s += f'<clipPath id="cr"><path d="{shape}"/></clipPath>'
	s += f'<g fill="#f5d04e" stroke="#6e4608" stroke-width=".8" clip-path="url(#cr)">{"".join(dots)}</g>\n'
	# the brow band
	s += f'<path d="M30 92 H94 V106 H30 Z" fill="url(#gold)" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>\n'
	# the cobra rising at the front
	s += f'<path d="M32 90 C22 84 18 70 22 60 C24 52 30 50 34 54 C36 62 34 72 36 80 Z" fill="url(#gold)" stroke="{INK}" stroke-width="3.2" stroke-linejoin="round"/>\n'
	s += f'<path d="M26 60 V74" stroke="#b83a22" stroke-width="3" stroke-linecap="round"/>\n'
	s += highlight('M38 50 C44 38 54 30 66 25')
	return s + '</svg>\n'


@amulet
def collar():
	# The broad collar, wesekh: rows of faience beads in a half circle, with
	# drop-shaped beads along the edge and falcon-head clasps at the ends.
	cx, cy = 64, 34
	s = head('A broad collar, the wesekh: rows of turquoise, gold and carnelian beads in a half circle, drop beads along the edge, and a clasp at each end.')
	s += grad('turq', 'turquoise') + grad('gold', 'gold') + grad('carn', 'carnelian') + '</defs>\n'

	def arc(r):
		return f'M{cx - r} {cy} A{r} {r} 0 0 0 {cx + r} {cy}'
	outer, inner = 50, 20
	# drops along the edge, then the collar over them
	drops = []
	for i in range(13):
		a = math.pi * (i + 0.5) / 13
		x = cx - math.cos(a) * (outer + 2)
		y = cy + math.sin(a) * (outer + 2)
		deg = math.degrees(a) - 90
		drops.append(f'<path transform="translate({x:.1f} {y:.1f}) rotate({-deg:.1f})" d="M-5 -2 C-5 6 -2 12 0 14 C2 12 5 6 5 -2 Z"/>')
	band = f'M{cx - outer} {cy} A{outer} {outer} 0 0 0 {cx + outer} {cy} H{cx + inner} A{inner} {inner} 0 0 1 {cx - inner} {cy} Z'
	s += shadow_outline(band)
	s += f'<g fill="url(#carn)" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round">{"".join(drops)}</g>\n'
	s += f'<path d="{band}" fill="url(#turq)" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/>\n'
	# rows of beads
	for r, col, wdt in ((27, 'url(#gold)', 6), (35, '#2f6fc0', 5), (43, 'url(#gold)', 5)):
		s += f'<path d="{arc(r)}" fill="none" stroke="{INK}" stroke-width="{wdt + 3}"/>\n'
		s += f'<path d="{arc(r)}" fill="none" stroke="{col}" stroke-width="{wdt}" stroke-dasharray="4 2"/>\n'
	# the clasps at the ends, one each side
	for sx in (-1, 1):
		x0 = cx + sx * (outer + inner) / 2
		s += f'<path d="M{x0 - 17:.0f} {cy - 12} H{x0 + 17:.0f} V{cy + 4} H{x0 - 17:.0f} Z" fill="url(#gold)" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>\n'
		s += f'<circle cx="{x0:.0f}" cy="{cy - 4}" r="3" fill="#b83a22" stroke="{INK}" stroke-width="1.6"/>\n'
	s += highlight(f'M{cx - 40} {cy + 18} C{cx - 30} {cy + 32} {cx - 16} {cy + 40} {cx - 4} {cy + 42}')
	return s + '</svg>\n'


@amulet
def feather():
	# The feather of Ma'at: an ostrich plume, its tip curling over, the sign
	# of truth and balance.
	vane = 'M60 120 C50 104 42 80 40 56 C38 36 42 20 54 12 C64 6 78 8 84 18 C86 24 84 30 80 32 C78 26 72 22 66 24 C60 28 62 44 68 64 C74 84 76 104 68 120 Z'
	s = head('The feather of Ma\'at: an ostrich plume with its tip curling over, the sign of truth and balance.')
	s += grad('linen', 'linen', 30, 10, 100, 120) + grad('gold', 'gold') + '</defs>\n'
	s += shadow_outline(vane)
	s += f'<path d="{vane}" fill="url(#linen)"/>\n'
	# barbs: fine lines sweeping out from the quill
	barbs = []
	for i in range(11):
		y = 34 + i * 8
		barbs.append(f'M{58 + i * 0.5:.0f} {y} C{52} {y - 2} {48 - (i < 4) * 2} {y - 6} {46} {y - 12}')
		barbs.append(f'M{60 + i * 0.6:.0f} {y + 2} C{64 + i * 0.4:.0f} {y} {68 + i * 0.3:.0f} {y - 4} {70 + i * 0.2:.0f} {y - 10}')
	s += f'<path d="{" ".join(barbs)}" stroke="#8aa0c8" stroke-width="1.6" fill="none" opacity=".55" stroke-linecap="round"/>\n'
	# a band of colour near the base, as painted plumes often have
	s += f'<path d="M50 96 C56 94 66 94 72 96 L71 104 C64 102 58 102 52 104 Z" fill="#2f6fc0" opacity=".8"/>\n'
	# the quill
	s += f'<path d="M62 120 C60 96 56 64 56 40 C56 30 60 24 66 24" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>\n'
	s += f'<path d="M62 120 C60 96 56 64 56 40 C56 30 60 24 66 24" fill="none" stroke="url(#gold)" stroke-width="3" stroke-linecap="round"/>\n'
	s += highlight('M46 60 C44 42 46 26 56 16')
	return s + '</svg>\n'


@amulet
def aten():
	# The Aten, the sun's disc, as Akhenaten's art shows it: rays reaching
	# down, each ending in a hand, and a cobra at the foot of the disc.
	s = head('The Aten, the sun\'s disc, as Akhenaten\'s art shows it: rays reaching down, each ending in a small hand, and a cobra at the foot of the disc.')
	# a glowing sun: pale at the centre, deepening to orange at the edge
	s += ('\t<radialGradient id="disc" gradientUnits="userSpaceOnUse" cx="64" cy="44" r="34" fx="56" fy="36"><stop offset="0" stop-color="#fffbe0"/>'
		'<stop offset=".4" stop-color="#ffd84a"/><stop offset=".85" stop-color="#f08a1c"/><stop offset="1" stop-color="#b24e08"/></radialGradient>\n')
	s += '</defs>\n'
	cx, cy, r = 64, 44, 30
	rays = []
	ends = []
	for i in range(9):
		a = math.radians(14 + i * 152 / 8)
		x0, y0 = cx + math.cos(a) * (r - 4), cy + math.sin(a) * (r - 4)
		length = 54 + 14 * math.sin(math.pi * i / 8)
		x1, y1 = cx + math.cos(a) * length, cy + math.sin(a) * length
		rays.append(f'M{x0:.1f} {y0:.1f} L{x1:.1f} {y1:.1f}')
		ends.append((x1, y1, math.degrees(a) - 90))
	ray_d = ' '.join(rays)
	# one shadow for rays and disc together
	s += f'<g filter="url(#sh)"><path d="{ray_d}" stroke="{INK}" stroke-width="8" stroke-linecap="round"/><circle cx="{cx}" cy="{cy}" r="{r + 3.5}" fill="{INK}"/>'
	for x, y, deg in ends:
		s += f'<ellipse transform="translate({x:.1f} {y:.1f}) rotate({deg:.1f})" cx="0" cy="4" rx="5.5" ry="8" fill="{INK}"/>'
	s += '</g>\n'
	s += f'<path d="{ray_d}" stroke="#ffd24a" stroke-width="3.6" stroke-linecap="round"/>\n'
	# small hands: a palm with the fingers together, pointing along the ray
	for x, y, deg in ends:
		s += (f'<path transform="translate({x:.1f} {y:.1f}) rotate({deg:.1f})" d="M-3 -1 H3 C4 4 4 9 2.5 11 H-2.5 C-4 9 -4 4 -3 -1 Z"'
			f' fill="#ffd24a" stroke="#8a4a08" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>\n')
	s += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#disc)"/>\n'
	s += f'<path d="M58 {cy + r - 2} C56 {cy + r + 10} 70 {cy + r + 10} 68 {cy + r - 2}" fill="#b83a22" stroke="{INK}" stroke-width="2.6"/>\n'
	s += highlight(f'M{cx - 18} {cy - 10} C{cx - 14} {cy - 20} {cx - 6} {cy - 24} {cx + 2} {cy - 25}', 4)
	return s + '</svg>\n'


@amulet
def canopic():
	# A canopic jar: a wide calcite jar with a rim and a column of writing,
	# its lid carved as the jackal head of Duamutef, one of the four sons of
	# Horus, who guarded the stomach.
	body = 'M28 66 C20 84 24 106 40 116 C48 121 80 121 88 116 C104 106 108 84 100 66 Z'
	lid = 'M38 64 C36 48 40 36 48 30 L44 6 L58 22 H70 L84 6 L80 30 C88 36 92 48 90 64 Z'
	s = head('A canopic jar: a wide calcite jar with a column of writing, its lid the jackal head of Duamutef, one of the four sons of Horus, who guarded the stomach.')
	s += grad('calcite', 'calcite') + grad('lapis', 'lapis', 36, 20, 92, 64) + grad('gold', 'gold', 26, 58, 102, 72)
	s += '\t<linearGradient id="black" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a5660"/><stop offset=".5" stop-color="#2a2830"/><stop offset="1" stop-color="#121016"/></linearGradient>\n</defs>\n'
	s += shadow_outline(body + ' ' + lid)
	s += f'<path d="{body}" fill="url(#calcite)"/>\n'
	s += f'<path d="M58 76 H70 V110 H58 Z" fill="#2f6fc0" stroke="#1d3f78" stroke-width="1.6"/>\n'
	s += f'<path d="M61 82 H67 M61 89 H67 M60 96 H68 M61 103 H67" stroke="#e8f0ff" stroke-width="2" stroke-linecap="round"/>\n'
	# the rim of the jar
	s += f'<path d="M26 62 H102 V70 H26 Z" fill="url(#gold)" stroke="{INK}" stroke-width="3.4" stroke-linejoin="round"/>\n'
	# the headcloth falling either side of the head
	s += f'<path d="M36 64 C34 50 38 40 46 36 H82 C90 40 94 50 92 64 Z" fill="url(#lapis)" stroke="{INK}" stroke-width="3.4" stroke-linejoin="round"/>\n'
	s += f'<path d="M38 56 H48 M39 48 H48 M80 48 H89 M80 56 H90" stroke="#f0c850" stroke-width="3"/>\n'
	# the jackal's head, seen from the front: tall ears, long muzzle
	face = 'M48 62 C46 50 48 40 52 32 L46 8 L60 24 H68 L82 8 L76 32 C80 40 82 50 80 62 C76 66 70 68 64 68 C58 68 52 66 48 62 Z'
	s += f'<path d="{face}" fill="url(#black)" stroke="{INK}" stroke-width="3.4" stroke-linejoin="round"/>\n'
	s += f'<path d="M50 12 L57 26 M78 12 L71 26" stroke="#c08a1c" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += f'<path d="M54 40 L61 42 L55 45 Z M74 40 L67 42 L73 45 Z" fill="#f5d04e" stroke="#6e4608" stroke-width="1"/>\n'
	s += f'<path d="M64 48 V60 M59 62 C62 64 66 64 69 62" fill="none" stroke="#6a6670" stroke-width="2" stroke-linecap="round"/>\n'
	s += f'<ellipse cx="64" cy="60" rx="4" ry="3" fill="#0a0808"/>\n'
	s += highlight('M34 80 C32 92 36 104 44 110')
	return s + '</svg>\n'


@amulet
def fish():
	# The bolti, the Nile tilapia: amulets of it were worn for rebirth, since
	# the fish was thought to hatch its young anew from its mouth.
	body = 'M16 66 C24 44 46 32 70 34 C86 35 96 42 102 52 L118 34 C123 52 123 78 118 94 L102 78 C94 90 80 97 62 97 C38 97 22 84 16 66 Z'
	fin = 'M40 40 C50 22 78 18 98 42 C86 38 70 36 56 38 Z'
	low = 'M58 94 C58 104 64 110 72 112 C74 104 72 98 70 95 Z'
	s = head('A tilapia, the bolti of the Nile: worn as an amulet of rebirth, as the fish was thought to hatch its young anew from its mouth.')
	s += grad('fish', 'lapis', 20, 30, 110, 100) + '\t<linearGradient id="fin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb8ff"/><stop offset="1" stop-color="#2f5a9e"/></linearGradient>\n</defs>\n'
	s += shadow_outline(body + ' ' + fin + ' ' + low)
	s += f'<path d="{fin}" fill="url(#fin)"/>\n'
	s += f'<path d="{low}" fill="url(#fin)"/>\n'
	s += f'<path d="{body}" fill="url(#fish)"/>\n'
	s += f'<clipPath id="fb"><path d="{body}"/></clipPath>\n'
	# scales, as rows of small arcs, kept inside the body
	sc = []
	for row, y in enumerate(range(48, 96, 9)):
		for x in range(48 + (row % 2) * 5, 104, 10):
			sc.append(f'M{x} {y} q5 5 0 10')
	s += f'<path d="{" ".join(sc)}" fill="none" stroke="#1d3f78" stroke-width="1.6" opacity=".35" clip-path="url(#fb)"/>\n'
	# fin rays, inside the fins
	s += f'<path d="M52 37 L50 28 M62 35 L62 24 M72 35 L74 24 M82 37 L86 28" stroke="#1d3f78" stroke-width="1.6" opacity=".5" stroke-linecap="round"/>\n'
	s += f'<path d="M104 58 L116 44 M104 66 L119 66 M104 74 L116 86" stroke="#1d3f78" stroke-width="1.6" opacity=".45" stroke-linecap="round"/>\n'
	# gill cover, eye and mouth
	s += f'<path d="M44 44 C38 56 38 74 46 88" fill="none" stroke="#1d3f78" stroke-width="2.6" stroke-linecap="round"/>\n'
	s += f'<circle cx="30" cy="58" r="7" fill="#fffdf6" stroke="{INK}" stroke-width="2.6"/><circle cx="29" cy="58" r="3.4" fill="{INK}"/>\n'
	s += f'<path d="M17 68 C20 70 23 70 26 68" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += highlight('M30 46 C40 38 54 36 66 38')
	return s + '</svg>\n'


@amulet
def ibis():
	# The sacred ibis, the bird of Thoth: white body, bare black head and neck,
	# a long curved beak and black plumes over the tail.
	body = 'M42 62 C42 46 60 38 78 42 C96 46 108 58 112 70 C104 80 92 88 76 88 C58 88 42 80 42 62 Z'
	tail = 'M92 60 C106 64 116 76 118 90 C108 88 98 82 90 74 Z'
	s = head('The sacred ibis, the bird of Thoth: a white body, the bare black head and neck, a long curved beak and black plumes over the tail.')
	s += grad('white', 'linen', 40, 36, 110, 92) + '\t<linearGradient id="black" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a5660"/><stop offset="1" stop-color="#16141a"/></linearGradient>\n</defs>\n'
	neck = 'M52 56 C44 46 40 34 42 22'
	beak = 'M37 20 C26 26 18 38 16 52'
	legs = 'M68 86 L64 116 M82 86 L86 116 M56 116 H70 M80 116 H94'
	s += '<g filter="url(#sh)">'
	s += f'<path d="{legs}" stroke="{INK}" stroke-width="8" stroke-linecap="round" fill="none"/>'
	s += f'<path d="{beak}" stroke="{INK}" stroke-width="9" stroke-linecap="round" fill="none"/>'
	s += f'<path d="{neck}" stroke="{INK}" stroke-width="15" stroke-linecap="round" fill="none"/>'
	s += f'<circle cx="42" cy="20" r="11" fill="{INK}"/>'
	s += f'<path d="{body} {tail}" fill="{INK}" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>'
	s += '</g>\n'
	s += f'<path d="{legs}" stroke="#4a3a30" stroke-width="3.6" stroke-linecap="round" fill="none"/>\n'
	s += f'<path d="{beak}" stroke="#3a3640" stroke-width="4" stroke-linecap="round" fill="none"/>\n'
	s += f'<path d="{neck}" stroke="url(#black)" stroke-width="8" stroke-linecap="round" fill="none"/>\n'
	s += f'<circle cx="42" cy="20" r="6.5" fill="url(#black)"/>\n'
	s += f'<path d="{body}" fill="url(#white)"/>\n'
	s += f'<path d="{tail}" fill="url(#black)" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>\n'
	s += f'<path d="M72 56 C82 58 92 64 98 72" fill="none" stroke="#b8aa88" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += f'<circle cx="44" cy="18" r="1.8" fill="#fffdf6"/>\n'
	s += highlight('M50 56 C54 48 64 44 74 44')
	return s + '</svg>\n'


@amulet
def anubis():
	# Anubis, the jackal God of embalming, His head in profile facing left:
	# tall ears lined with gold, a gold eye drawn out with a kohl line, a band
	# of gold across the muzzle, an ankh hanging from the ear, and a gold
	# collar on the neck. After a drawing by the game's owner.
	headp = ('M8 57 C14 51 24 49 34 47 C42 45 48 41 52 35 L52 8 L63 28 L72 26 L104 4 '
		'L98 44 C106 56 112 70 116 90 L121 124 H60 C60 110 54 98 44 92 '
		'C34 86 20 82 12 76 C6 72 4 63 8 57 Z')
	s = head('Anubis, the jackal God of embalming: His head in profile, tall ears lined with gold, a gold eye with a kohl line, a gold band across the muzzle, an ankh at the ear and a gold collar. After a drawing by the game\'s owner.')
	s += '\t<linearGradient id="black" gradientUnits="userSpaceOnUse" x1="20" y1="10" x2="100" y2="110"><stop offset="0" stop-color="#6a6670"/><stop offset=".35" stop-color="#2e2c34"/><stop offset="1" stop-color="#0e0c12"/></linearGradient>\n'
	s += grad('gold', 'gold', 30, 0, 110, 124) + '</defs>\n'
	s += shadow_outline(headp)
	s += f'<path d="{headp}" fill="url(#black)"/>\n'
	s += f'<clipPath id="hd"><path d="{headp}"/></clipPath>\n'
	s += '<g clip-path="url(#hd)">\n'
	# gold on the tip of the far ear and inside the near ear
	s += f'<path d="M49 20 L52 7 L58 18 Z" fill="url(#gold)"/>\n'
	s += f'<path d="M77 28 L104 4 L98 45 C91 39 84 33 77 28 Z" fill="url(#gold)" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>\n'
	s += f'<path d="M87 30 C90 25 95 20 98 14 M89 38 C93 32 96 27 98 22" fill="none" stroke="#c08a1c" stroke-width="1.6" stroke-linecap="round"/>\n'
	# the band of gold across the muzzle, the line of the mouth
	s += f'<path d="M28 48 C25 58 24 68 26 78" fill="none" stroke="url(#gold)" stroke-width="3.2"/>\n'
	s += f'<path d="M10 71 C22 74 34 74 44 72" fill="none" stroke="#5a5660" stroke-width="1.8" stroke-linecap="round"/>\n'
	# gold markings over the brow
	s += f'<path d="M42 46 C47 42 53 42 57 44 M61 37 C65 35 69 35 73 37" fill="none" stroke="url(#gold)" stroke-width="3" stroke-linecap="round"/>\n'
	s += '</g>\n'
	# the eye: gold, drawn out to the back with a kohl line and a flick below
	s += f'<path d="M40 56 C44 50 52 49 58 54 C52 58 46 59 40 56 Z" fill="#f5d04e" stroke="{INK}" stroke-width="1.8" stroke-linejoin="round"/>\n'
	s += f'<circle cx="50" cy="54" r="2.4" fill="{INK}"/>\n'
	s += f'<path d="M58 54 L72 53 M48 58 C48 63 46 65 43 66" fill="none" stroke="url(#gold)" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += f'<ellipse cx="9" cy="59" rx="4.4" ry="3.4" fill="#0a0808"/>\n'
	# the collar: gold with drop shapes and small stones
	collar = 'M53 100 C72 96 94 90 116 86 L119 106 C98 112 76 118 59 122 Z'
	s += f'<path d="{collar}" fill="url(#gold)" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>\n'
	drops = []
	for x, y in ((66, 108), (78, 105), (90, 102), (102, 98), (112, 95)):
		drops.append(f'M{x} {y - 4} C{x - 3} {y} {x - 3} {y + 5} {x} {y + 7} C{x + 3} {y + 5} {x + 3} {y} {x} {y - 4} Z')
	s += f'<path d="{" ".join(drops)}" fill="none" stroke="#8a5a10" stroke-width="1.6"/>\n'
	s += f'<g stroke="{INK}" stroke-width=".8"><circle cx="72" cy="106" r="1.8" fill="#b83a22"/><circle cx="84" cy="103" r="1.8" fill="#7a3ab8"/><circle cx="96" cy="100" r="1.8" fill="#2e8a4a"/></g>\n'
	# the ankh hanging from the ear
	ankh = 'M90 50 V54 M90 54 C86 54 85 60 90 64 C95 60 94 54 90 54 Z M85 66 H95 M90 64 V82'
	s += f'<path d="{ankh}" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
	s += f'<path d="{ankh}" fill="none" stroke="url(#gold)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>\n'
	s += highlight('M16 55 C26 51 36 49 46 44', 3)
	return s + '</svg>\n'


@amulet
def papyrus():
	# A papyrus stem with its open umbel: the sign of green growth and youth.
	umbel = 'M20 44 C28 22 100 22 108 44 C98 52 74 70 66 80 H62 C54 70 30 52 20 44 Z'
	stem = 'M60 80 H68 L70 120 H58 Z'
	s = head('A papyrus stem with its open umbel, the sign of green growth and youth.')
	s += grad('green', 'malachite', 20, 20, 100, 110) + grad('stem', 'malachite', 56, 70, 72, 120) + '</defs>\n'
	s += shadow_outline(umbel + ' ' + stem)
	s += f'<path d="{stem}" fill="url(#stem)"/>\n'
	s += f'<path d="{umbel}" fill="url(#green)"/>\n'
	s += f'<clipPath id="um"><path d="{umbel}"/></clipPath>\n'
	rays = []
	for i in range(11):
		t = i / 10
		x = 24 + t * 80
		y = 40 - math.sin(t * math.pi) * 12
		rays.append(f'M64 78 L{x:.1f} {y:.1f}')
	s += f'<path d="{" ".join(rays)}" stroke="#1f5a2a" stroke-width="2" opacity=".55" clip-path="url(#um)"/>\n'
	# the bracts that wrap the base of the umbel
	s += f'<path d="M64 84 C56 80 50 76 46 70 C54 70 60 74 64 78 C68 74 74 70 82 70 C78 76 72 80 64 84 Z" fill="#3c9a4a" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>\n'
	s += highlight('M30 38 C40 30 52 28 62 28')
	return s + '</svg>\n'


@amulet
def scarab():
	# The scarab beetle, Khepri, carved in lapis lazuli with its flecks of
	# gold-coloured pyrite and gold lines inlaid: head, the broad plate
	# behind it, the rounded wing cases with their middle line, six legs.
	headp = 'M50 34 C50 22 56 16 64 16 C72 16 78 22 78 34 Z'
	pron = 'M36 50 C34 38 46 30 64 30 C82 30 94 38 92 50 C90 56 80 58 64 58 C48 58 38 56 36 50 Z'
	wings = 'M30 70 C30 60 44 58 64 58 C84 58 98 60 98 70 C100 96 86 116 64 118 C42 116 28 96 30 70 Z'
	legs = ('M42 44 L26 36 L20 22 M86 44 L102 36 L108 22 '
		'M34 76 L18 72 L10 84 M94 76 L110 72 L118 84 '
		'M40 102 L26 110 L22 122 M88 102 L102 110 L106 122')
	s = head('The scarab beetle, Khepri, carved in lapis lazuli flecked with gold-coloured pyrite and inlaid with gold lines: head, the plate behind it, the wing cases and six legs.')
	s += ('\t<radialGradient id="lapis" gradientUnits="userSpaceOnUse" cx="64" cy="76" r="48" fx="50" fy="60"><stop offset="0" stop-color="#b9c9ff"/>'
		'<stop offset=".35" stop-color="#4a6fd6"/><stop offset=".75" stop-color="#1d3280"/><stop offset="1" stop-color="#0b1542"/></radialGradient>\n')
	s += ('\t<radialGradient id="lapis2" gradientUnits="userSpaceOnUse" cx="64" cy="40" r="34" fx="54" fy="30"><stop offset="0" stop-color="#b9c9ff"/>'
		'<stop offset=".4" stop-color="#4a6fd6"/><stop offset="1" stop-color="#1d3280"/></radialGradient>\n')
	s += grad('gold', 'gold') + '</defs>\n'
	s += '<g filter="url(#sh)">'
	s += f'<path d="{legs}" stroke="{INK}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
	s += f'<path d="{headp} {pron} {wings}" fill="{INK}" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>'
	s += '</g>\n'
	s += f'<path d="{legs}" stroke="#2a4aa8" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>\n'
	s += f'<path d="{wings}" fill="url(#lapis)"/>\n'
	s += f'<path d="{pron}" fill="url(#lapis2)" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>\n'
	s += f'<path d="{headp}" fill="url(#lapis2)" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>\n'
	# inlaid gold: the edge of the head, the line where the plate meets the
	# wing cases, and the line between the wing cases
	s += f'<path d="M55 28 C58 24 70 24 73 28" fill="none" stroke="url(#gold)" stroke-width="3.2" stroke-linecap="round"/>\n'
	s += f'<path d="M40 60 C52 57 76 57 88 60" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>\n'
	s += f'<path d="M40 60 C52 57 76 57 88 60" fill="none" stroke="url(#gold)" stroke-width="3" stroke-linecap="round"/>\n'
	s += f'<path d="M64 60 V116" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>\n'
	s += f'<path d="M64 60 V116" stroke="url(#gold)" stroke-width="3" stroke-linecap="round"/>\n'
	flecks = [(48, 78), (78, 86), (54, 100), (84, 72), (44, 92), (74, 104), (52, 42), (78, 46)]
	s += '<g fill="#f5d04e">' + ''.join(f'<circle cx="{x}" cy="{y}" r="1.6"/>' for x, y in flecks) + '</g>\n'
	s += highlight('M40 76 C40 68 46 64 54 64') + highlight('M44 44 C46 38 54 35 60 35', 3)
	return s + '</svg>\n'


@amulet
def croc():
	# The crocodile of Sobek: a Nile crocodile's head and neck in profile,
	# the eye raised on its ridge, the long snout with the teeth showing,
	# and the armoured scutes down the back of the neck.
	shape = ('M12 122 C10 98 14 76 22 60 C28 44 38 32 54 32 C62 32 68 38 70 44 '
		'C86 46 104 50 115 56 C122 60 122 68 116 72 C108 76 96 80 84 82 '
		'C72 84 62 86 56 92 C48 100 44 110 44 122 Z')
	s = head('The crocodile of Sobek, God of the Nile\'s waters: a crocodile\'s head and neck in profile, the raised eye, the long toothed snout and the scutes down the neck.')
	s += ('\t<linearGradient id="green" gradientUnits="userSpaceOnUse" x1="20" y1="30" x2="110" y2="110"><stop offset="0" stop-color="#c8e08a"/>'
		'<stop offset=".35" stop-color="#6a9a3a"/><stop offset=".72" stop-color="#3e6a22"/><stop offset="1" stop-color="#22401a"/></linearGradient>\n')
	s += '\t<linearGradient id="belly" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8dc98"/><stop offset="1" stop-color="#a0a860"/></linearGradient>\n</defs>\n'
	# the scutes along the back of the neck, under the outline
	scutes = ' '.join(f'M{x - 5} {y + 3} C{x - 8} {y - 6} {x + 2} {y - 10} {x + 4} {y - 2} Z' for x, y in ((24, 58), (19, 72), (15, 86), (13, 100), (12, 114)))
	s += shadow_outline(shape + ' ' + scutes)
	s += f'<path d="{scutes}" fill="#4a7a2a"/>\n'
	s += f'<path d="{shape}" fill="url(#green)"/>\n'
	s += f'<clipPath id="cc"><path d="{shape}"/></clipPath>\n'
	# the pale lower jaw and throat
	s += f'<path d="M54 76 C70 74 96 72 118 68 V92 H58 C50 98 46 110 46 124 H38 C38 104 44 88 54 76 Z" fill="url(#belly)" clip-path="url(#cc)"/>\n'
	# the mouth line, with neat rows of teeth
	mouth = 'M116 68 C100 70 82 72 66 72 C60 72 56 74 54 78'
	s += f'<path d="{mouth}" fill="none" stroke="{INK}" stroke-width="3.4" stroke-linecap="round"/>\n'
	teeth = []
	for i, x in enumerate(range(70, 112, 8)):
		y = 72 - (x - 66) * 0.09
		teeth.append(f'M{x} {y:.1f} l3 5 l3 -5 Z' if i % 2 == 0 else f'M{x} {y:.1f} l3 -5 l3 5 Z')
	s += f'<path d="{" ".join(teeth)}" fill="#fffdf6" stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"/>\n'
	# scales on the snout and neck, kept inside the outline
	sc = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="3.2" ry="2.2"/>' for x, y in ((82, 57), (94, 59), (88, 64), (30, 74), (26, 88), (34, 86), (24, 102), (32, 100)))
	s += f'<g fill="#2e5a1a" opacity=".45" clip-path="url(#cc)">{sc}</g>\n'
	# the nostril at the tip, and the eye on its ridge
	s += f'<ellipse cx="112" cy="58" rx="3" ry="2" fill="{INK}"/>\n'
	s += f'<path d="M44 42 C46 32 60 30 64 40 Z" fill="#6a9a3a" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>\n'
	s += f'<ellipse cx="55" cy="42" rx="7" ry="5" fill="#f5d04e" stroke="{INK}" stroke-width="2.4"/>\n'
	s += f'<path d="M55 38 V46" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>\n'
	s += highlight('M30 52 C36 42 44 36 52 35') + highlight('M76 49 C88 50 100 53 108 56', 3)
	return s + '</svg>\n'


@amulet
def uraeus():
	# The uraeus, the rearing cobra worn at the brow of kings: its hood
	# spread and inlaid with bands of lapis, carnelian and turquoise, the head
	# raised, and the body coiled beneath.
	coil = 'M22 114 C18 102 38 96 64 98 C90 100 108 106 104 115 C100 123 32 124 22 114 Z'
	hood = 'M42 94 C28 76 28 44 40 28 C46 20 56 16 64 18 C74 20 84 34 84 54 C84 72 76 86 64 96 Z'
	headp = 'M58 24 C64 14 78 10 90 14 C98 17 100 23 94 27 C86 30 76 30 66 32 Z'
	s = head('The uraeus, the rearing cobra worn at the brow of kings: the hood spread and inlaid with bands of lapis, carnelian and turquoise, the head raised and the body coiled beneath.')
	s += grad('gold', 'gold') + grad('gold2', 'gold', 20, 90, 104, 124) + '</defs>\n'
	s += shadow_outline(coil + ' ' + hood + ' ' + headp)
	s += f'<path d="{coil}" fill="url(#gold2)"/>\n'
	s += f'<path d="M34 110 C46 104 82 104 94 110" fill="none" stroke="#8a5a10" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += f'<path d="{hood}" fill="url(#gold)" stroke="{INK}" stroke-width="3" stroke-linejoin="round"/>\n'
	# the inlay down the front of the hood
	inlay = 'M50 88 C40 74 40 50 48 38 C52 32 58 30 62 32 C68 36 72 46 72 58 C72 72 66 84 58 90 Z'
	s += f'<clipPath id="inl"><path d="{inlay}"/></clipPath>\n'
	bands = ['#2f6fc0', '#b83a22', '#38a8a0', '#2f6fc0', '#b83a22', '#38a8a0', '#2f6fc0', '#b83a22']
	s += '<g clip-path="url(#inl)">' + ''.join(f'<rect x="36" y="{30 + i * 8}" width="40" height="8" fill="{c}"/>' for i, c in enumerate(bands)) + '</g>\n'
	s += f'<path d="{" ".join(f"M36 {30 + i * 8} H76" for i in range(1, len(bands)))}" stroke="#f5d04e" stroke-width="1.6" clip-path="url(#inl)"/>\n'
	s += f'<path d="{inlay}" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>\n'
	# the head, raised and looking forward
	# drawn without its own outline where it joins the hood, so the two read as one
	s += f'<path d="{headp}" fill="url(#gold)"/>\n'
	s += f'<path d="M56 22 C60 22 62 26 64 30" fill="none" stroke="url(#gold)" stroke-width="6"/>\n'
	s += f'<path d="M92 26 C84 29 76 30 68 32" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += f'<circle cx="82" cy="19" r="2.4" fill="{INK}"/>\n'
	s += highlight('M36 70 C32 56 34 40 42 30')
	return s + '</svg>\n'


@amulet
def mask():
	# The gold mask of Tutankhamun: the striped nemes headcloth in gold and
	# blue glass, the vulture and cobra at the brow, eyes lined in blue, the
	# braided beard, and a collar of coloured stones. After a photograph.
	nemes = 'M36 36 C38 18 50 8 64 8 C78 8 90 18 92 36 L113 60 C114 64 112 66 108 66 L104 120 H24 L20 66 C16 66 14 64 15 60 Z'
	face = 'M42 44 C42 30 52 24 64 24 C76 24 86 30 86 44 V66 C86 82 76 94 64 94 C52 94 42 82 42 66 Z'
	s = head('The gold mask of Tutankhamun: the striped nemes headcloth in gold and blue glass, the vulture and cobra at the brow, eyes lined in blue, the braided beard and a collar of coloured stones.')
	s += grad('gold', 'gold') + grad('face', 'gold', 42, 24, 86, 94) + '</defs>\n'
	s += shadow_outline(nemes)
	s += f'<path d="{nemes}" fill="url(#gold)"/>\n'
	s += f'<clipPath id="nm"><path d="{nemes}"/></clipPath>\n'
	stripes = ''.join(f'<rect x="0" y="{y}" width="128" height="4.6"/>' for y in range(14, 122, 9))
	s += f'<g clip-path="url(#nm)" fill="#1d3f78">{stripes}</g>\n'
	# the collar across the chest, rows of lapis, turquoise and carnelian
	s += f'<path d="M34 98 H94 V120 H34 Z" fill="url(#gold)" stroke="{INK}" stroke-width="2.4"/>\n'
	s += '<path d="M34 103 H94" stroke="#2f6fc0" stroke-width="3"/><path d="M34 109 H94" stroke="#38a8a0" stroke-width="3"/><path d="M34 115 H94" stroke="#b83a22" stroke-width="3"/>\n'
	s += f'<path d="{nemes}" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>\n'
	# the face
	s += f'<path d="{face}" fill="url(#face)" stroke="{INK}" stroke-width="2.6"/>\n'
	s += f'<path d="M42 44 C42 36 46 30 52 27 H76 C82 30 86 36 86 44 Z" fill="url(#gold)" stroke="{INK}" stroke-width="2"/>\n'
	s += f'<path d="M42 42 H86" stroke="#1d3f78" stroke-width="3"/>\n'
	# eyebrows and eyes lined in blue, drawn out to the sides
	s += f'<path d="M46 50 C50 46 56 46 60 48 M68 48 C72 46 78 46 82 50" fill="none" stroke="#1d3f78" stroke-width="3" stroke-linecap="round"/>\n'
	s += f'<path d="M48 57 C51 53 57 53 60 57 C57 60 51 60 48 57 Z M68 57 C71 53 77 53 80 57 C77 60 71 60 68 57 Z" fill="#fffdf6" stroke="#1d3f78" stroke-width="2"/>\n'
	s += f'<circle cx="54" cy="57" r="2.5" fill="{INK}"/><circle cx="74" cy="57" r="2.5" fill="{INK}"/>\n'
	s += f'<path d="M48 57 L43 59 M80 57 L85 59" stroke="#1d3f78" stroke-width="2.4" stroke-linecap="round"/>\n'
	# nose and mouth
	s += f'<path d="M64 60 L61 72 C63 74 65 74 67 72 Z" fill="#c08a1c" opacity=".6"/>\n'
	s += f'<path d="M58 80 C61 82 67 82 70 80" fill="none" stroke="#8a5a10" stroke-width="2.2" stroke-linecap="round"/>\n'
	# the braided beard
	s += f'<path d="M59 92 H69 L68 116 C68 120 60 120 60 116 Z" fill="#1d3f78" stroke="{INK}" stroke-width="2.2"/>\n'
	s += f'<path d="M60 97 L68 100 M60 103 L68 106 M60 109 L68 112" stroke="#e0ac3a" stroke-width="1.6"/>\n'
	# the vulture and cobra at the brow
	s += f'<path d="M56 34 C54 28 56 22 60 20 C62 22 62 26 61 30 L63 32 L60 34 Z" fill="url(#gold)" stroke="{INK}" stroke-width="1.8" stroke-linejoin="round"/>\n'
	s += f'<path d="M66 34 C65 28 66 20 70 18 C73 20 73 26 71 34 Z" fill="url(#gold)" stroke="{INK}" stroke-width="1.8" stroke-linejoin="round"/>\n'
	s += f'<path d="M68.5 22 V31" stroke="#2f6fc0" stroke-width="2" stroke-linecap="round"/>\n'
	s += highlight('M40 32 C42 20 50 13 58 11')
	return s + '</svg>\n'


from more import MORE
DRAW.update(MORE)

names = sys.argv[1:] or list(DRAW)
for n in names:
	with open(os.path.join(OUT, n + '.svg'), 'w') as f:
		f.write(DRAW[n]())
	print('drew', n)
