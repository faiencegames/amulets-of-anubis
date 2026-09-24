"""More amulets: Gods, sacred animals and signs. Imported by draw.py.

Every drawing here is in the game's style: a thick dark outline
(drawn once underneath, with the shadow), glazed gradients, one highlight.
"""
import math
from common import INK, head, grad, shadow_outline, highlight

MORE = {}


def amulet(fn):
	MORE[fn.__name__] = fn
	return fn


def custom_grad(gid, stops, x1=24, y1=6, x2=104, y2=120):
	st = ''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
	return f'\t<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{st}</linearGradient>\n'


BLACK = [(0, '#6a6670'), (.4, '#2e2c34'), (1, '#0e0c12')]
BRONZE = [(0, '#fbe0b0'), (.35, '#d89a5a'), (.72, '#9a5a28'), (1, '#5a2e10')]
CREAM = [(0, '#ffffff'), (.35, '#f6ecd6'), (.72, '#dccaa4'), (1, '#9a8660')]
SKIN = [(0, '#f3d9a8'), (1, '#c49a5c')]


# ---- the four sons of Horus, on canopic jars ---------------------------------

def canopic_jar(comment, lid_defs, lid):
	body = 'M28 66 C20 84 24 106 40 116 C48 121 80 121 88 116 C104 106 108 84 100 66 Z'
	s = head(comment)
	s += grad('calcite', 'calcite') + grad('lapis', 'lapis', 36, 20, 92, 64) + grad('gold', 'gold', 26, 58, 102, 72) + lid_defs + '</defs>\n'
	s += shadow_outline(body + ' M36 64 C34 40 44 16 64 14 C84 16 94 40 92 64 Z')
	s += f'<path d="{body}" fill="url(#calcite)"/>\n'
	s += '<path d="M58 76 H70 V110 H58 Z" fill="#2f6fc0" stroke="#1d3f78" stroke-width="1.6"/>\n'
	s += '<path d="M61 82 H67 M61 89 H67 M60 96 H68 M61 103 H67" stroke="#e8f0ff" stroke-width="2" stroke-linecap="round"/>\n'
	s += f'<path d="M26 62 H102 V70 H26 Z" fill="url(#gold)" stroke="{INK}" stroke-width="3.4" stroke-linejoin="round"/>\n'
	# the headcloth either side of the head
	s += f'<path d="M36 64 C34 48 38 36 46 30 H82 C90 36 94 48 92 64 Z" fill="url(#lapis)" stroke="{INK}" stroke-width="3.4" stroke-linejoin="round"/>\n'
	s += '<path d="M38 56 H48 M39 48 H48 M41 40 H49 M80 40 H87 M80 48 H89 M80 56 H90" stroke="#f0c850" stroke-width="3"/>\n'
	s += lid
	s += highlight('M34 80 C32 92 36 104 44 110')
	return s + '</svg>\n'


@amulet
def imsety():
	lid = (f'<path d="M50 30 C50 20 56 14 64 14 C72 14 78 20 78 30 V50 C78 58 72 64 64 64 C56 64 50 58 50 50 Z" fill="url(#skin)" stroke="{INK}" stroke-width="3.2"/>'
		f'<path d="M50 30 C50 20 56 14 64 14 C72 14 78 20 78 30 C72 26 56 26 50 30 Z" fill="url(#lapis)" stroke="{INK}" stroke-width="2.6"/>'
		'<path d="M56 38 H61 M67 38 H72" stroke="#1a0f05" stroke-width="2.6" stroke-linecap="round"/>'
		'<path d="M63 44 L64 49 L65 44 M60 54 C62 56 66 56 68 54" fill="none" stroke="#6a4420" stroke-width="1.8" stroke-linecap="round"/>'
		f'<path d="M61 64 H67 V72 H61 Z" fill="#2f6fc0" stroke="{INK}" stroke-width="1.6"/>\n')
	return canopic_jar('A canopic jar with the human head of Imsety, one of the four sons of Horus, who guarded the liver.',
		custom_grad('skin', SKIN, 50, 14, 78, 64), lid)


@amulet
def hapy():
	# a baboon's head: a heavy brow, a long square muzzle, a mane
	lid = (f'<path d="M44 44 C42 26 52 14 64 14 C76 14 86 26 84 44 C84 54 80 60 76 62 H52 C48 60 44 54 44 44 Z" fill="url(#fur)" stroke="{INK}" stroke-width="3.2" stroke-linejoin="round"/>'
		f'<path d="M54 40 C54 34 74 34 74 40 V56 C74 62 70 66 64 66 C58 66 54 62 54 56 Z" fill="url(#face)" stroke="{INK}" stroke-width="2.6"/>'
		'<path d="M52 36 C56 32 60 32 62 35 M66 35 C68 32 72 32 76 36" fill="none" stroke="#1a1410" stroke-width="2.6" stroke-linecap="round"/>'
		'<circle cx="58" cy="40" r="2" fill="#1a0f05"/><circle cx="70" cy="40" r="2" fill="#1a0f05"/>'
		'<ellipse cx="61" cy="60" rx="1.6" ry="1.2" fill="#1a0f05"/><ellipse cx="67" cy="60" rx="1.6" ry="1.2" fill="#1a0f05"/>\n')
	return canopic_jar('A canopic jar with the baboon head of Hapy, one of the four sons of Horus, who guarded the lungs.',
		custom_grad('fur', [(0, '#c8d4b0'), (.5, '#8a9a70'), (1, '#4a5a3a')], 44, 14, 84, 62) + custom_grad('face', [(0, '#f0c8a0'), (1, '#b88058')], 54, 34, 74, 66), lid)


@amulet
def qebehsenuef():
	# a falcon's head: rounded crown, a hooked beak, the dark mark below the eye
	lid = (f'<path d="M46 44 C44 26 54 14 66 14 C78 14 86 24 86 36 L90 44 L82 48 C80 56 74 62 66 64 H52 C48 58 46 52 46 44 Z" fill="url(#feather)" stroke="{INK}" stroke-width="3.2" stroke-linejoin="round"/>'
		f'<path d="M80 30 C86 30 90 36 90 44 L82 48 C82 42 80 36 76 34 Z" fill="#e0ac3a" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>'
		f'<circle cx="68" cy="32" r="5" fill="#f5d04e" stroke="{INK}" stroke-width="2"/><circle cx="68" cy="32" r="2.2" fill="{INK}"/>'
		'<path d="M66 37 C64 44 62 48 58 52" fill="none" stroke="#2a1a10" stroke-width="3" stroke-linecap="round"/>\n')
	return canopic_jar('A canopic jar with the falcon head of Qebehsenuef, one of the four sons of Horus, who guarded the intestines.',
		custom_grad('feather', [(0, '#f0d8a8'), (.5, '#b88048'), (1, '#6a4020')], 46, 14, 88, 64), lid)


# ---- Gods and their animals ----------------------------------------------------

@amulet
def falcon():
	# Horus as a falcon, standing and facing left as in painted hieroglyphs:
	# a blue cap, the pale face with the dark mark below the eye (the mark the
	# wedjat eye repeats), a green wing of scaled feathers, the long tail, and
	# the red sun's disc on His head. After a reference from the game's owner.
	body = ('M20 26 C24 14 38 8 50 10 C60 12 66 18 70 26 L112 102 L118 118 L104 124 L86 106 '
		'C74 102 64 98 58 94 L57 104 L64 112 H28 L40 104 L40 92 C32 78 30 58 34 44 C28 40 22 34 20 26 Z')
	wing = 'M34 46 C44 36 60 34 70 40 L112 102 L104 108 C86 100 64 86 48 70 C40 62 34 56 34 46 Z'
	tail = 'M84 96 L112 102 L118 118 L104 124 Z'
	disc = 'M40 0 C40 -14 64 -14 64 0 C64 12 40 12 40 0 Z'
	s = head('Horus as a falcon, facing left as in painted hieroglyphs: a blue cap, the pale face with the dark mark below the eye, a green wing of scaled feathers, the red sun\'s disc on His head. After a reference from the game\'s owner.')
	s += grad('carn', 'carnelian', 40, -14, 64, 12) + grad('lapis', 'lapis', 30, 8, 70, 36)
	s += custom_grad('wing', [(0, '#a8e0c8'), (.4, '#5a9a88'), (1, '#1f4a48')], 34, 34, 112, 108)
	s += custom_grad('cream', [(0, '#ffffff'), (.5, '#fff0dc'), (1, '#e0c8a0')], 30, 20, 70, 100)
	s += custom_grad('leg', [(0, '#ffd070'), (1, '#e07a18')], 0, 94, 0, 116) + '</defs>\n'
	s += '<g transform="translate(8 16) scale(.86)">\n'
	s += shadow_outline(body + ' ' + disc)
	s += f'<path d="{disc}" fill="url(#carn)"/>\n'
	s += f'<path d="{body}" fill="url(#cream)"/>\n'
	# the breast speckled, the legs and feet
	dots = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="1.2" ry="1.8"/>' for x, y in ((40, 56), (46, 64), (38, 70), (44, 78), (50, 86), (40, 86), (54, 94), (36, 62)))
	s += f'<g fill="#e8906a">{dots}</g>\n'
	s += f'<path d="M42 94 V110 M54 94 L56 110" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M42 94 V110 M54 94 L56 110" stroke="url(#leg)" stroke-width="3.6" stroke-linecap="round"/>\n'
	s += f'<path d="M28 112 H66" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M28 112 H66" stroke="url(#leg)" stroke-width="3.4" stroke-linecap="round"/>\n'
	# the tail, its feathers tipped with orange
	s += f'<path d="{tail}" fill="url(#wing)" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>\n'
	s += f'<path d="M92 104 L114 112 M96 110 L112 118" stroke="#1d3f78" stroke-width="1.6"/>\n'
	s += ''.join(f'<circle cx="{x}" cy="{y}" r="2.6" fill="#e05a18" stroke="{INK}" stroke-width="1.2"/>' for x, y in ((106, 122), (111, 120), (116, 117))) + '\n'
	# the wing, with rows of scale-like feathers
	s += f'<path d="{wing}" fill="url(#wing)" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>\n'
	s += f'<clipPath id="wg"><path d="{wing}"/></clipPath>\n'
	sc = []
	for row in range(7):
		for col in range(5):
			x = 40 + col * 9 + row * 6
			y = 46 + row * 8 + col * 2
			sc.append(f'M{x - 4} {y} q4 6 8 0')
	s += f'<path d="{" ".join(sc)}" fill="none" stroke="#1d3f78" stroke-width="1.5" clip-path="url(#wg)"/>\n'
	# the blue cap over the head, the face mark, the eye and the beak
	s += f'<path d="M34 14 C44 8 60 10 68 22 L70 28 C62 30 52 34 44 38 C44 28 40 20 34 14 Z" fill="url(#lapis)" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>\n'
	s += f'<path d="M36 26 C36 34 38 40 42 44" fill="none" stroke="#2a1a10" stroke-width="4" stroke-linecap="round"/>\n'
	s += f'<circle cx="34" cy="21" r="5" fill="#2a1a10" stroke="#f5b830" stroke-width="2.2"/>\n'
	s += f'<path d="M22 22 C15 24 13 31 15 37 C17 33 21 31 26 31 Z" fill="#2a2830" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>\n'
	s += '</g>\n'
	s += highlight('M42 30 C48 24 56 22 62 24', 3)
	return s + '</svg>\n'


@amulet
def baboon():
	# Thoth as a baboon, squatting with His knees drawn up and His arms on
	# them, the heavy mane over His shoulders, and the moon's disc and
	# crescent on His head.
	body = ('M34 118 C30 100 32 84 38 74 C32 64 32 50 40 42 C48 34 60 32 70 36 '
		'C76 38 80 42 82 46 L96 50 C102 52 104 58 100 62 L86 64 C84 68 84 72 86 76 '
		'C92 80 94 90 92 100 L96 118 Z')
	moon = 'M40 24 C40 12 64 12 64 24 C64 34 40 34 40 24 Z'
	s = head('Thoth as a baboon, squatting with His arms on His knees, the mane over His shoulders, the moon\'s disc and crescent on His head.')
	s += custom_grad('fai', [(0, '#d8f4c8'), (.35, '#7ac080'), (.72, '#3c8a4a'), (1, '#1f5a2a')]) + grad('gold', 'gold', 40, 10, 64, 34) + '</defs>\n'
	s += shadow_outline(body + ' ' + moon)
	s += f'<path d="{body}" fill="url(#fai)"/>\n'
	# the mane, a cape of hair over the shoulders
	s += f'<path d="M38 74 C32 64 32 50 40 42 C48 34 60 32 70 36 C74 42 76 50 74 58 C70 68 60 74 48 82 Z" fill="#2f7a3a" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>\n'
	s += f'<path d="M44 50 C48 56 50 62 50 70 M54 42 C58 50 60 58 58 66" fill="none" stroke="#1f5a2a" stroke-width="2" stroke-linecap="round"/>\n'
	# the face and long muzzle
	s += f'<path d="M72 40 C78 40 82 44 82 46 L96 50 C102 52 104 58 100 62 L86 64 C80 62 74 56 72 48 Z" fill="#b8e0a8" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>\n'
	s += f'<circle cx="80" cy="50" r="2.2" fill="{INK}"/><circle cx="99" cy="56" r="1.4" fill="{INK}"/>\n'
	# the arm lying along the knee, and the line of the thigh
	s += f'<path d="M60 76 C64 86 72 92 86 90" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>\n'
	s += f'<path d="M44 106 C54 98 72 96 88 100" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>\n'
	# the moon: a full disc resting in a crescent
	s += f'<path d="{moon}" fill="url(#gold)"/>\n'
	s += f'<path d="M40 24 C42 32 62 32 64 24 C60 38 44 38 40 24 Z" fill="#fffbe0" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>\n'
	s += highlight('M42 96 C40 88 42 82 46 78')
	return s + '</svg>\n'


@amulet
def ram():
	# The ram of Amun, as the avenue of ram-headed sphinxes at Karnak shows
	# it: the head in profile, the horn curling round the ear.
	headp = ('M38 118 C36 104 38 92 42 84 C38 72 40 56 48 44 C56 34 70 30 82 34 '
		'C92 38 98 48 100 60 L110 76 C114 84 108 90 100 88 L88 86 C80 94 74 104 72 118 Z')
	s = head('The ram of Amun: a ram\'s head in profile, as on the avenue of ram-headed sphinxes at Karnak, the horn curling round the ear.')
	s += custom_grad('wool', CREAM) + grad('gold', 'gold', 30, 30, 80, 100) + '</defs>\n'
	horn = 'M66 48 C50 40 32 50 32 68 C32 84 48 92 60 86 C70 80 70 68 62 64 C56 62 50 66 52 72'
	s += shadow_outline(headp)
	s += f'<path d="{headp}" fill="url(#wool)"/>\n'
	# rows of wool on the neck
	s += f'<path d="M44 96 C50 94 56 96 60 100 M42 106 C48 104 56 106 62 110" fill="none" stroke="#b8a680" stroke-width="2.4" stroke-linecap="round"/>\n'
	# the horn, a thick gold spiral
	s += f'<path d="{horn}" fill="none" stroke="{INK}" stroke-width="14" stroke-linecap="round"/>\n'
	s += f'<path d="{horn}" fill="none" stroke="url(#gold)" stroke-width="8" stroke-linecap="round"/>\n'
	s += f'<path d="M40 60 L44 64 M36 72 L42 72 M42 82 L46 78 M54 86 L54 80" stroke="#8a5a10" stroke-width="2" stroke-linecap="round"/>\n'
	# eye and nostril
	s += f'<path d="M78 50 C82 46 88 48 90 52 C86 54 82 54 78 50 Z" fill="#f5d04e" stroke="{INK}" stroke-width="2"/>\n'
	s += f'<circle cx="84" cy="51" r="1.8" fill="{INK}"/><path d="M104 76 C106 78 106 80 104 82" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += f'<path d="M100 88 C96 84 92 84 88 86" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>\n'
	s += highlight('M70 38 C78 36 86 38 92 44')
	return s + '</svg>\n'


@amulet
def bull():
	# The Apis bull of Memphis: black, with a white triangle on His brow and
	# the sun's disc and a cobra between His horns.
	body = ('M14 70 C14 58 20 50 30 48 L34 40 L40 46 C56 42 76 42 92 46 C104 48 112 56 114 66 '
		'L118 78 L112 80 L110 70 C108 76 104 80 100 82 L100 108 H92 L90 86 H52 L50 108 H42 L40 84 '
		'C34 82 30 80 26 78 L22 84 C18 86 12 82 12 76 Z')
	s = head('The Apis bull of Memphis: black, with a white mark on His brow, and the sun\'s disc and a cobra between His horns.')
	s += custom_grad('black', BLACK) + grad('gold', 'gold', 14, 14, 40, 44) + grad('carn', 'carnelian', 14, 10, 40, 40) + '</defs>\n'
	disc = 'M18 30 C18 20 34 20 34 30 C34 40 18 40 18 30 Z'
	horns = 'M16 46 C10 40 12 32 18 30 M36 44 C42 38 40 30 34 30'
	s += '<g filter="url(#sh)">'
	s += f'<path d="{horns}" stroke="{INK}" stroke-width="9" fill="none" stroke-linecap="round"/>'
	s += f'<path d="{body} {disc}" fill="{INK}" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>'
	s += '</g>\n'
	s += f'<path d="{body}" fill="url(#black)"/>\n'
	s += f'<path d="{horns}" stroke="url(#gold)" stroke-width="4" fill="none" stroke-linecap="round"/>\n'
	s += f'<path d="{disc}" fill="url(#carn)" stroke="{INK}" stroke-width="2.4"/>\n'
	# the white markings
	s += '<path d="M24 52 L32 50 L28 60 Z" fill="#fffdf6"/>\n'
	s += '<path d="M62 50 C70 48 78 50 82 54 C76 58 66 58 62 50 Z" fill="#fffdf6" opacity=".9"/>\n'
	s += f'<circle cx="24" cy="62" r="2.2" fill="#f5d04e"/>\n'
	# a cloth over the back, as the Apis is often shown
	s += f'<path d="M52 48 C62 46 76 46 86 48 L84 62 C74 64 62 64 54 62 Z" fill="#b83a22" stroke="{INK}" stroke-width="2" stroke-linejoin="round" opacity=".85"/>\n'
	s += highlight('M40 50 C54 46 72 45 88 48')
	return s + '</svg>\n'


@amulet
def hathor():
	# Hathor as a cow's head seen from the front: the sun's disc held between
	# Her lyre-shaped horns.
	headp = ('M44 50 C44 42 52 38 64 38 C76 38 84 42 84 50 C84 66 78 82 74 98 '
		'C72 108 70 116 64 116 C58 116 56 108 54 98 C50 82 44 66 44 50 Z')
	ears = 'M44 54 C34 50 24 52 18 58 C26 64 36 64 46 62 Z M84 54 C94 50 104 52 110 58 C102 64 92 64 82 62 Z'
	horns = 'M48 44 C34 38 28 22 36 10 M80 44 C94 38 100 22 92 10'
	s = head('Hathor as a cow\'s head seen from the front, with the sun\'s disc held between Her lyre-shaped horns.')
	s += custom_grad('hide', [(0, '#fff6e6'), (.4, '#f0dcc0'), (1, '#b89a70')]) + grad('gold', 'gold', 30, 6, 100, 50) + grad('carn', 'carnelian', 50, 6, 80, 40) + '</defs>\n'
	disc = 'M50 24 C50 12 78 12 78 24 C78 36 50 36 50 24 Z'
	s += '<g filter="url(#sh)">'
	s += f'<path d="{horns}" stroke="{INK}" stroke-width="12" fill="none" stroke-linecap="round"/>'
	s += f'<path d="{headp} {ears} {disc}" fill="{INK}" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>'
	s += '</g>\n'
	s += f'<path d="{horns}" stroke="url(#gold)" stroke-width="6" fill="none" stroke-linecap="round"/>\n'
	s += f'<path d="{disc}" fill="url(#carn)" stroke="{INK}" stroke-width="2.4"/>\n'
	s += f'<path d="{ears}" fill="url(#hide)" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>\n'
	s += f'<path d="{headp}" fill="url(#hide)"/>\n'
	s += '<path d="M28 58 C34 56 40 57 44 58 M100 58 C94 56 88 57 84 58" stroke="#d8a080" stroke-width="3" stroke-linecap="round"/>\n'
	# eyes, the dark patch on the brow, and the muzzle
	s += f'<path d="M50 58 C53 54 58 54 60 58 C57 61 53 61 50 58 Z M68 58 C70 54 75 54 78 58 C75 61 71 61 68 58 Z" fill="#3a2410"/>\n'
	s += f'<path d="M58 42 C62 46 66 46 70 42 C68 50 60 50 58 42 Z" fill="#8a5a3a" opacity=".6"/>\n'
	s += f'<path d="M56 102 C56 96 72 96 72 102 C72 112 56 112 56 102 Z" fill="#e8b8a0" stroke="{INK}" stroke-width="2"/>\n'
	s += f'<ellipse cx="60" cy="104" rx="1.8" ry="2.4" fill="{INK}"/><ellipse cx="68" cy="104" rx="1.8" ry="2.4" fill="{INK}"/>\n'
	s += highlight('M50 48 C54 44 60 42 66 42')
	return s + '</svg>\n'


@amulet
def sekhmet():
	# Sekhmet, the lioness, "the powerful one", daughter of Ra: Her head in
	# profile with the sun's disc and a cobra above it.
	headp = ('M40 118 C36 104 34 92 36 82 C30 74 28 62 32 52 C36 40 48 34 60 34 '
		'C70 34 78 38 84 44 C92 48 100 52 104 58 C108 64 106 72 100 74 L96 82 '
		'C90 84 84 84 80 82 C76 92 74 104 76 118 Z')
	disc = 'M42 22 C42 8 70 8 70 22 C70 36 42 36 42 22 Z'
	s = head('Sekhmet, the lioness Goddess, daughter of Ra: Her head in profile, the sun\'s disc and a cobra above it.')
	s += custom_grad('lion', [(0, '#fff0c0'), (.35, '#f0b860'), (.72, '#c07a2a'), (1, '#6a3e10')]) + grad('carn', 'carnelian', 42, 8, 70, 36) + grad('gold', 'gold') + '</defs>\n'
	s += shadow_outline(headp + ' ' + disc)
	s += f'<path d="{disc}" fill="url(#carn)"/>\n'
	s += f'<path d="M54 36 C52 28 56 24 60 26 C62 30 60 34 58 36 Z" fill="url(#gold)" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>\n'
	s += f'<path d="{headp}" fill="url(#lion)"/>\n'
	# the mane, in rows of locks, round the face
	mane = 'M36 82 C30 74 28 62 32 52 C36 40 48 34 60 34 C62 44 60 56 62 66 C62 76 66 84 72 90 C62 90 48 88 36 82 Z'
	s += f'<path d="{mane}" fill="#c07a2a" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>\n'
	s += f'<path d="M40 50 C44 56 46 62 46 70 M50 42 C54 50 54 60 54 70 M40 76 C46 80 54 82 60 82" fill="none" stroke="#8a4e18" stroke-width="2" stroke-linecap="round"/>\n'
	# the face: eye, nose, mouth, whisker dots
	s += f'<path d="M72 50 C76 46 82 46 86 50 C82 53 76 54 72 50 Z" fill="#f5d04e" stroke="{INK}" stroke-width="2"/>\n'
	s += f'<circle cx="80" cy="50" r="1.8" fill="{INK}"/>\n'
	s += f'<path d="M100 60 C104 62 104 66 100 68 Z" fill="{INK}"/>\n'
	s += f'<path d="M100 74 C94 72 88 72 84 76" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/>\n'
	s += '<g fill="#6a3e10"><circle cx="88" cy="64" r="1"/><circle cx="92" cy="66" r="1"/><circle cx="88" cy="68" r="1"/></g>\n'
	s += highlight('M66 38 C74 38 82 42 86 46')
	return s + '</svg>\n'


@amulet
def hippo():
	# A hippopotamus in blue faience, with the marsh plants of the river
	# painted on its back, like those found in Middle Kingdom tombs.
	body = ('M16 74 C14 62 20 52 30 48 C34 42 42 40 48 44 C60 38 82 38 96 44 C108 50 114 62 112 76 '
		'C112 84 108 90 104 92 L104 106 H92 L90 94 C80 96 64 96 54 94 L52 106 H40 L38 92 '
		'C30 90 22 88 18 84 C14 82 14 78 16 74 Z')
	s = head('A hippopotamus in blue faience, with the marsh plants of the river painted on its back, like those found in Middle Kingdom tombs.')
	s += custom_grad('blue', [(0, '#d8f4ff'), (.35, '#6ac4e0'), (.72, '#2a8ab8'), (1, '#145a80')]) + '</defs>\n'
	s += shadow_outline(body)
	s += f'<path d="{body}" fill="url(#blue)"/>\n'
	# the painted plants: lotus and papyrus in black, as on the faience hippos
	s += f'<g fill="none" stroke="#10283a" stroke-width="2.2" stroke-linecap="round">'
	s += '<path d="M60 90 C60 76 58 64 54 54 M54 54 C50 50 52 46 56 48 C58 44 62 46 60 50 M72 92 C74 78 76 66 80 56 M80 56 C78 50 84 48 84 54 C88 52 88 58 84 58"/>'
	s += '<path d="M92 86 C92 76 94 68 98 62 M44 88 C44 80 42 72 38 66"/>'
	s += '</g>\n'
	s += '<g fill="#10283a"><path d="M96 60 C94 54 100 52 102 56 C104 52 108 56 104 60 Z"/><path d="M36 64 C32 60 36 56 40 60 Z"/></g>\n'
	# eye, ear, nostril
	s += f'<circle cx="34" cy="54" r="3" fill="{INK}"/><path d="M40 44 C40 38 46 38 46 44" fill="#2a8ab8" stroke="{INK}" stroke-width="2"/>\n'
	s += f'<ellipse cx="20" cy="66" rx="2" ry="1.4" fill="{INK}"/>\n'
	s += highlight('M50 46 C62 42 80 42 92 46')
	return s + '</svg>\n'


@amulet
def frog():
	# A frog, the sign of Heqet, who helped at births: a sign of new life,
	# since frogs came in their thousands with the flood.
	body = ('M64 26 C80 26 92 36 94 50 C104 58 108 72 104 84 L114 92 C118 96 114 102 108 100 L96 96 '
		'C88 104 76 108 64 108 C52 108 40 104 32 96 L20 100 C14 102 10 96 14 92 L24 84 '
		'C20 72 24 58 34 50 C36 36 48 26 64 26 Z')
	s = head('A frog, the sign of Heqet, the Goddess who helped at births: a sign of new life, as frogs came in their thousands with the flood.')
	s += grad('green', 'malachite') + '</defs>\n'
	s += shadow_outline(body)
	s += f'<path d="{body}" fill="url(#green)"/>\n'
	# the bulging eyes on top of the head
	for x in (48, 80):
		s += f'<circle cx="{x}" cy="36" r="9" fill="#8ad07a" stroke="{INK}" stroke-width="3"/><circle cx="{x}" cy="36" r="4" fill="{INK}"/><circle cx="{x - 2}" cy="34" r="1.3" fill="#fff"/>\n'
	# the back legs folded at the sides, and spots
	s += f'<path d="M34 72 C28 80 30 90 40 94 M94 72 C100 80 98 90 88 94" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>\n'
	s += '<g fill="#1f5a2a" opacity=".55"><circle cx="58" cy="66" r="4"/><circle cx="72" cy="74" r="3.4"/><circle cx="62" cy="86" r="3"/><circle cx="76" cy="58" r="2.6"/></g>\n'
	s += f'<path d="M50 52 C58 56 70 56 78 52" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += highlight('M42 48 C46 42 52 40 58 40')
	return s + '</svg>\n'


@amulet
def bee():
	# The bee, sign of Lower Egypt: the king's title "He of the Sedge and the
	# Bee" names him king of Upper and Lower Egypt.
	body = 'M64 34 C76 34 84 46 84 62 C84 84 74 104 64 112 C54 104 44 84 44 62 C44 46 52 34 64 34 Z'
	headp = 'M52 30 C52 20 58 14 64 14 C70 14 76 20 76 30 C76 36 70 38 64 38 C58 38 52 36 52 30 Z'
	wings = 'M46 50 C30 36 12 38 10 50 C8 62 26 66 46 60 Z M82 50 C98 36 116 38 118 50 C120 62 102 66 82 60 Z'
	s = head('The bee, sign of Lower Egypt: the king\'s title "He of the Sedge and the Bee" names him king of Upper and Lower Egypt.')
	s += grad('gold', 'gold', 44, 30, 84, 112) + '\t<linearGradient id="wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b8d8e8"/></linearGradient>\n' + custom_grad('black', BLACK, 52, 14, 76, 38) + '</defs>\n'
	s += shadow_outline(body + ' ' + headp + ' ' + wings)
	s += f'<path d="{wings}" fill="url(#wing)" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>\n'
	s += f'<path d="M16 50 C24 48 34 50 42 54 M112 50 C104 48 94 50 86 54" fill="none" stroke="#6a8aa0" stroke-width="1.6"/>\n'
	s += f'<path d="{body}" fill="url(#gold)"/>\n'
	s += f'<clipPath id="bb"><path d="{body}"/></clipPath>\n'
	s += '<g clip-path="url(#bb)" fill="#2a1a10"><rect x="40" y="56" width="50" height="8"/><rect x="40" y="72" width="50" height="8"/><rect x="40" y="88" width="50" height="8"/></g>\n'
	s += f'<path d="{headp}" fill="url(#black)" stroke="{INK}" stroke-width="2.6"/>\n'
	s += f'<path d="M58 16 C54 8 48 6 44 8 M70 16 C74 8 80 6 84 8" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>\n'
	s += highlight('M52 50 C54 42 58 38 64 38')
	return s + '</svg>\n'


@amulet
def sara():
	# "Son of Ra", sa Ra: the title written before a king's birth name, with
	# the pintail duck (sa, "son") and the sun's disc (Ra), painted as in the
	# temples: a red-brown head, dark neck and breast, a white belly, the
	# wing striped in red and cream.
	duck = ('M20 36 C20 28 26 24 32 24 C40 24 44 30 42 38 C40 46 38 52 40 58 '
		'C56 54 78 60 100 66 L122 70 C112 76 100 80 88 82 C72 88 52 90 42 86 '
		'C32 82 28 72 30 62 C30 54 32 48 30 44 C24 42 20 40 20 36 Z')
	disc = 'M78 26 C78 10 106 10 106 26 C106 42 78 42 78 26 Z'
	s = head('"Son of Ra": the title written before a king\'s birth name, with the pintail duck (sa, "son") and the sun\'s disc (Ra), painted as in the temples.')
	s += grad('carn', 'carnelian', 78, 10, 106, 42) + custom_grad('dark', [(0, '#4a5a6a'), (1, '#10181e')], 20, 30, 60, 90) + custom_grad('white', CREAM, 30, 60, 90, 90) + '</defs>\n'
	legs = 'M52 86 L48 108 M64 86 L68 108 M38 108 H54 M60 108 H76'
	s += '<g filter="url(#sh)">'
	s += f'<path d="{legs}" stroke="{INK}" stroke-width="7" stroke-linecap="round" fill="none"/>'
	s += f'<path d="{duck} {disc} M21 34 L6 40 L22 42 Z" fill="{INK}" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>'
	s += '</g>\n'
	s += f'<path d="{legs}" stroke="#3a3640" stroke-width="3" stroke-linecap="round" fill="none"/>\n'
	s += f'<path d="{disc}" fill="url(#carn)"/>\n'
	s += f'<path d="{duck}" fill="url(#white)"/>\n'
	# the dark neck and breast
	s += f'<path d="M30 44 C24 42 20 40 20 36 C24 40 36 42 42 38 C40 46 38 52 40 58 C50 58 58 62 62 68 C56 76 44 78 34 76 C30 70 28 62 30 56 C30 52 32 48 30 44 Z" fill="url(#dark)"/>\n'
	# the red-brown head, the eye, the dark beak
	s += f'<path d="M20 36 C20 28 26 24 32 24 C40 24 44 30 42 38 C36 40 26 40 20 36 Z" fill="#b8502a" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>\n'
	s += f'<circle cx="30" cy="31" r="2.4" fill="{INK}"/>\n'
	s += f'<path d="M22 34 L6 40 L22 42 Z" fill="#3a3640" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>\n'
	# the wing: stripes of red and cream, with dark lines
	wing = 'M56 60 C72 58 94 62 112 70 C98 78 76 80 60 76 C54 72 52 64 56 60 Z'
	s += f'<clipPath id="dw"><path d="{wing}"/></clipPath>\n'
	s += f'<path d="{wing}" fill="#f0e0b8"/>\n'
	s += '<g clip-path="url(#dw)">' + ''.join(f'<rect x="{50 + i * 8}" y="54" width="4" height="30" fill="#b8502a" transform="rotate(-20 {52 + i * 8} 70)"/>' for i in range(8)) + '</g>\n'
	s += f'<path d="{wing}" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>\n'
	s += f'<path d="M40 80 C48 84 60 86 72 84" fill="none" stroke="{INK}" stroke-width="2" stroke-dasharray="1 3" stroke-linecap="round"/>\n'
	s += highlight('M36 64 C36 58 40 54 44 52', 3)
	return s + '</svg>\n'


@amulet
def ka():
	# The ka, a person's life force, written as two arms raised up from the
	# elbow, as on the wooden statue of King Hor, who wears it on his head.
	arms = ('M20 110 V40 H42 V94 H86 V40 H108 V110 C108 115 104 118 98 118 H30 C24 118 20 115 20 110 Z')
	s = head('The ka, a person\'s life force, written as two arms raised up from the elbows.')
	s += grad('carn', 'carnelian') + '</defs>\n'
	s += shadow_outline(arms)
	s += f'<path d="{arms}" fill="url(#carn)"/>\n'
	# the hands, open, fingers together, and the line of each forearm
	for x in (21, 87):
		s += f'<path d="M{x} 42 C{x} 24 {x + 2} 12 {x + 10} 10 C{x + 18} 12 {x + 20} 24 {x + 20} 42 Z" fill="url(#carn)" stroke="{INK}" stroke-width="3.2" stroke-linejoin="round"/>\n'
		s += f'<path d="M{x + 6} 30 V18 M{x + 12} 30 V16" stroke="#7a1f12" stroke-width="1.8" stroke-linecap="round"/>\n'
	s += f'<path d="M30 100 H98" stroke="#7a1f12" stroke-width="2" stroke-linecap="round"/>\n'
	s += highlight('M28 96 V46') + highlight('M94 96 V46')
	return s + '</svg>\n'


# ---- signs ------------------------------------------------------------------------

@amulet
def akhet():
	# The akhet, the horizon: the sun rising between two mountains, the place
	# of rebirth each morning. Headrests and the pylons of temples echo it.
	hills = 'M8 112 C8 84 16 60 34 56 C48 54 56 72 58 100 H70 C72 72 80 54 94 56 C112 60 120 84 120 112 Z'
	sun = 'M44 52 C44 30 84 30 84 52 C84 74 44 74 44 52 Z'
	s = head('The akhet, the horizon: the sun rising between two mountains, the place of rebirth each morning.')
	s += grad('carn', 'carnelian', 44, 30, 84, 74) + custom_grad('hill', [(0, '#f0d8a0'), (.4, '#c89a58'), (1, '#6a4a20')], 8, 50, 120, 112) + '</defs>\n'
	s += shadow_outline(hills + ' ' + sun)
	s += f'<path d="{sun}" fill="url(#carn)"/>\n'
	s += f'<path d="{hills}" fill="url(#hill)"/>\n'
	s += f'<path d="M58 100 H70" stroke="{INK}" stroke-width="3"/>\n'
	s += f'<path d="M20 90 C24 76 30 68 38 66 M108 90 C104 76 98 68 90 66" fill="none" stroke="#8a6a30" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += highlight('M16 96 C18 76 26 64 34 62') + highlight('M52 44 C54 38 58 36 64 36', 3)
	return s + '</svg>\n'


@amulet
def was():
	# The was sceptre, sign of power and dominion, held by Gods: a straight
	# staff with the head of an animal at the top and a fork at the foot.
	staff = ('M58 34 V110 L50 122 H56 L62 114 H66 L72 122 H78 L70 110 V34 '
		'L76 30 L92 26 C96 25 98 20 94 18 L86 14 L80 6 L76 12 L68 10 C62 10 58 14 56 20 L50 24 Z')
	s = head('The was sceptre, sign of power and dominion, carried by Gods: a straight staff with an animal\'s head at the top and a fork at the foot.')
	s += grad('lapis', 'lapis') + grad('gold', 'gold') + '</defs>\n'
	s += shadow_outline(staff)
	s += f'<path d="{staff}" fill="url(#lapis)"/>\n'
	# gold bands on the shaft and a gold head
	s += f'<path d="M58 44 H70 M58 60 H70 M58 76 H70 M58 92 H70" stroke="url(#gold)" stroke-width="4"/>\n'
	s += f'<path d="M50 24 L56 20 C58 14 62 10 68 10 L76 12 L80 6 L86 14 L94 18 C98 20 96 25 92 26 L76 30 L70 34 H58 Z" fill="url(#gold)" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>\n'
	s += f'<circle cx="74" cy="18" r="2" fill="{INK}"/>\n'
	s += highlight('M61 40 V104', 3)
	return s + '</svg>\n'


@amulet
def heart():
	# The heart, ib, seat of thought and feeling, weighed against the feather
	# of Ma'at in the judgement of the dead: shaped like a jar with two
	# small handles.
	body = ('M46 30 H82 C84 36 88 40 94 42 C104 46 106 60 102 74 C98 92 86 108 64 114 '
		'C42 108 30 92 26 74 C22 60 24 46 34 42 C40 40 44 36 46 30 Z')
	s = head('The heart, ib, the seat of thought and feeling, weighed against the feather of Ma\'at at the judgement of the dead, shaped like a jar with two small handles.')
	s += grad('carn', 'carnelian') + grad('gold', 'gold', 40, 14, 88, 34) + '</defs>\n'
	s += shadow_outline(body + ' M44 14 H84 V32 H44 Z M22 46 C12 44 12 58 22 58 M106 46 C116 44 116 58 106 58')
	s += f'<path d="M26 48 C16 46 16 58 26 58 M102 48 C112 46 112 58 102 58" fill="none" stroke="url(#gold)" stroke-width="4"/>\n'
	s += f'<path d="{body}" fill="url(#carn)"/>\n'
	s += f'<path d="M44 16 H84 V32 H44 Z" fill="url(#gold)" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>\n'
	s += f'<path d="M44 24 H84" stroke="#8a5a10" stroke-width="2"/>\n'
	s += highlight('M36 56 C36 50 40 46 46 46') + highlight('M34 70 C36 82 42 92 50 98', 3)
	return s + '</svg>\n'


@amulet
def nefer():
	# The nefer sign, "good" and "beautiful": a heart with the windpipe
	# rising from it, crossed near the top.
	sign = ('M58 8 H70 V40 H82 V50 H70 V64 C84 66 96 78 96 94 C96 110 82 120 64 120 '
		'C46 120 32 110 32 94 C32 78 44 66 58 64 V50 H46 V40 H58 Z')
	s = head('The nefer sign, "good" and "beautiful": a heart with the windpipe rising from it, crossed near the top.')
	s += grad('turq', 'turquoise') + '</defs>\n'
	s += shadow_outline(sign)
	s += f'<path d="{sign}" fill="url(#turq)"/>\n'
	s += f'<path d="M64 12 V60" stroke="#1f6a64" stroke-width="2" opacity=".6"/>\n'
	s += f'<path d="M50 80 C56 76 72 76 78 80" fill="none" stroke="#1f6a64" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += highlight('M40 92 C40 82 46 74 54 72')
	return s + '</svg>\n'


@amulet
def shen():
	# The shen ring, a loop of rope tied at the bottom with no end: the sign
	# of eternity and protection, and the shape the cartouche grew from.
	ring = 'M64 12 C88 12 104 30 104 54 C104 78 88 94 64 94 C40 94 24 78 24 54 C24 30 40 12 64 12 Z'
	s = head('The shen ring, a loop of rope tied with no end: the sign of eternity and protection, from which the cartouche grew.')
	s += grad('gold', 'gold') + grad('lapis', 'lapis', 40, 28, 88, 80) + '</defs>\n'
	inner = 'M64 30 C78 30 86 40 86 54 C86 68 78 78 64 78 C50 78 42 68 42 54 C42 40 50 30 64 30 Z'
	bar = 'M26 100 H102 V116 H26 Z'
	s += shadow_outline(ring + ' ' + inner + ' ' + bar, rule='evenodd')
	s += f'<path d="{ring} {inner}" fill="url(#gold)" fill-rule="evenodd"/>\n'
	s += f'<path d="{inner}" fill="none" stroke="{INK}" stroke-width="4"/>\n'
	# the twists of the rope
	tw = ' '.join(f'M{64 + 32 * math.cos(a):.1f} {54 + 32 * math.sin(a):.1f} L{64 + 40 * math.cos(a + .12):.1f} {54 + 40 * math.sin(a + .12):.1f}' for a in [i * math.pi / 9 for i in range(18)])
	s += f'<path d="{tw}" stroke="#8a5a10" stroke-width="1.8" stroke-linecap="round"/>\n'
	s += f'<path d="M54 92 L50 102 M74 92 L78 102" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M54 92 L50 102 M74 92 L78 102" stroke="url(#gold)" stroke-width="3.4" stroke-linecap="round"/>\n'
	s += f'<path d="{bar}" fill="url(#gold)"/>\n'
	s += f'<path d="M34 108 H94" stroke="#8a5a10" stroke-width="2" stroke-dasharray="6 3"/>\n'
	s += highlight('M34 44 C38 30 50 20 62 18')
	return s + '</svg>\n'


@amulet
def sistrum():
	# The sistrum, the rattle shaken in the worship of Hathor: Her face with
	# cow's ears on the handle, and a loop of metal crossed by rattling rods.
	frame = 'M42 58 V30 C42 14 52 6 64 6 C76 6 86 14 86 30 V58 Z'
	s = head('The sistrum, the rattle shaken in the worship of Hathor: Her face, with cow\'s ears, on the handle, and a loop crossed by rattling rods.')
	s += grad('gold', 'gold') + custom_grad('face', SKIN, 40, 58, 90, 96) + grad('lapis', 'lapis') + '</defs>\n'
	faceP = 'M46 60 H82 V80 C82 92 74 98 64 98 C54 98 46 92 46 80 Z'
	earsP = 'M46 66 C36 62 30 66 30 72 C36 76 42 76 46 74 Z M82 66 C92 62 98 66 98 72 C92 76 86 76 82 74 Z'
	handle = 'M58 96 H70 V124 H58 Z'
	s += shadow_outline(frame + ' ' + faceP + ' ' + earsP + ' ' + handle)
	s += f'<path d="{frame} M52 58 V30 C52 20 58 16 64 16 C70 16 76 20 76 30 V58 Z" fill="url(#gold)" fill-rule="evenodd"/>\n'
	# the rattling rods, with small discs
	s += f'<path d="M40 26 H88 M40 38 H88 M40 50 H88" stroke="{INK}" stroke-width="4.6" stroke-linecap="round"/><path d="M40 26 H88 M40 38 H88 M40 50 H88" stroke="url(#gold)" stroke-width="2" stroke-linecap="round"/>\n'
	s += f'<path d="{handle}" fill="url(#lapis)"/>\n'
	s += f'<path d="{earsP}" fill="url(#face)" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>\n'
	s += f'<path d="{faceP}" fill="url(#face)" stroke="{INK}" stroke-width="2.6"/>\n'
	s += f'<path d="M46 60 H82 V66 H46 Z" fill="#1d3f78"/>\n'
	s += f'<path d="M54 74 H60 M68 74 H74 M60 88 C62 90 66 90 68 88" fill="none" stroke="#3a2410" stroke-width="2.2" stroke-linecap="round"/>\n'
	s += highlight('M46 44 V30 C46 20 52 12 60 11', 3)
	return s + '</svg>\n'


@amulet
def sphinx():
	# The Great Sphinx of Giza in profile, facing left: a lion's body lying
	# with the front legs stretched out, a king's head in the striped nemes
	# headcloth, which falls behind the face onto the shoulders.
	body = ('M6 100 V90 C6 86 10 84 16 84 H40 C38 76 38 68 40 62 L36 58 L35 50 L31 47 L34 43 '
		'L34 32 C34 26 40 22 48 22 C56 22 62 26 62 32 L66 58 C80 57 96 58 106 64 '
		'C116 70 120 84 118 100 Z')
	base = 'M2 100 H124 V112 H2 Z'
	s = head('The Great Sphinx of Giza in profile: a lion\'s body lying with the front legs stretched out, a king\'s head in the striped nemes headcloth.')
	s += custom_grad('stone', [(0, '#fff0c8'), (.35, '#e8c080'), (.72, '#b88848'), (1, '#6a4a20')]) + grad('lapis', 'lapis', 34, 22, 68, 60) + '</defs>\n'
	s += shadow_outline(body + ' ' + base)
	s += f'<path d="{base}" fill="#8a6a3a"/><path d="M8 106 H118" stroke="#5a4020" stroke-width="2"/>\n'
	s += f'<path d="{body}" fill="url(#stone)"/>\n'
	# the headcloth, striped in blue and gold, falling behind the face
	nemes = 'M34 32 C34 26 40 22 48 22 C56 22 62 26 62 32 L68 60 H52 L50 42 C48 37 40 36 36 40 Z'
	s += f'<path d="{nemes}" fill="url(#lapis)" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>\n'
	s += f'<clipPath id="nm"><path d="{nemes}"/></clipPath>\n'
	s += f'<path d="M38 28 H62 M52 34 H64 M52 42 H66 M53 50 H67" stroke="#f0c850" stroke-width="2.4" clip-path="url(#nm)"/>\n'
	# the face: brow, eye, nose and a beard-less chin, as it survives
	s += f'<path d="M34 40 C37 36 44 36 48 40 L50 58 C46 60 40 60 38 58 L36 52 L32 48 Z" fill="url(#stone)" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round"/>\n'
	s += f'<path d="M37 44 C39 42 42 42 44 44" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"/><circle cx="41" cy="45.5" r="1.4" fill="{INK}"/>\n'
	# the legs and paws, the haunch and the tail along the side
	s += f'<path d="M40 84 C44 80 50 80 56 84 M16 90 H40 M88 100 C88 86 96 76 108 76 M110 98 C100 94 90 94 82 97" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += f'<path d="M10 94 V100 M16 94 V100 M22 94 V100" stroke="{INK}" stroke-width="1.8" stroke-linecap="round"/>\n'
	s += highlight('M70 62 C84 61 98 62 106 68')
	return s + '</svg>\n'


@amulet
def barque():
	# A sacred barque, the boat in which a God's image travelled: a long,
	# curved hull with a shrine amidships and steering oars at the stern.
	hull = 'M6 70 C18 84 40 92 64 92 C88 92 110 84 122 70 C116 90 96 104 64 104 C32 104 12 90 6 70 Z'
	s = head('A sacred barque, the boat in which a God\'s image travelled: a curved hull ending in papyrus-flower tips, a shrine amidships, steering oars at the stern.')
	s += grad('gold', 'gold') + custom_grad('wood', [(0, '#f0c890'), (.5, '#a86a30'), (1, '#5a3010')], 6, 60, 122, 104) + grad('lapis', 'lapis', 50, 40, 80, 88) + '</defs>\n'
	shrine = 'M48 88 V58 C48 50 80 50 80 58 V88 Z'
	ends = 'M6 70 C4 58 8 46 16 42 C18 50 16 60 14 70 Z M122 70 C124 58 120 46 112 42 C110 50 112 60 114 70 Z'
	s += shadow_outline(hull + ' ' + shrine + ' ' + ends)
	s += f'<path d="{ends}" fill="url(#gold)" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>\n'
	s += f'<path d="M100 60 L112 108 M92 62 L104 110" stroke="{INK}" stroke-width="6" stroke-linecap="round"/><path d="M100 60 L112 108 M92 62 L104 110" stroke="#c89048" stroke-width="3" stroke-linecap="round"/>\n'
	s += f'<path d="{hull}" fill="url(#wood)"/>\n'
	s += f'<path d="M14 80 C34 92 94 92 114 80" fill="none" stroke="url(#gold)" stroke-width="3"/>\n'
	s += f'<path d="{shrine}" fill="url(#lapis)" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>\n'
	s += f'<path d="M48 58 C48 50 80 50 80 58 V62 H48 Z" fill="url(#gold)" stroke="{INK}" stroke-width="2"/>\n'
	s += f'<path d="M58 70 H70 V88 H58 Z" fill="#f5d04e" stroke="{INK}" stroke-width="1.6"/>\n'
	s += highlight('M16 78 C28 86 44 90 56 90', 3)
	return s + '</svg>\n'


# ---- things of kings, tombs and cities --------------------------------------------

@amulet
def crook():
	# The crook and flail, crossed: held by Osiris and by kings, the crook
	# of the shepherd who cares for his people and the flail.
	crookP = 'M38 118 L82 30 C88 18 100 16 106 26 C110 34 104 42 98 38'
	flailP = 'M90 118 L38 34'
	s = head('The crook and flail, crossed: held by Osiris and by kings, the shepherd\'s crook and the flail.')
	s += grad('gold', 'gold') + grad('lapis', 'lapis') + '</defs>\n'
	s += '<g filter="url(#sh)">'
	s += f'<path d="{crookP} {flailP}" fill="none" stroke="{INK}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>'
	s += f'<path d="M38 34 L22 18 M38 34 L20 30 M38 34 L28 12" fill="none" stroke="{INK}" stroke-width="11" stroke-linecap="round"/>'
	s += '</g>\n'
	# the flail: a handle with three strands of beads
	s += f'<path d="{flailP}" stroke="url(#gold)" stroke-width="7" stroke-linecap="round"/>\n'
	s += f'<path d="M38 34 L22 18 M38 34 L20 30 M38 34 L28 12" stroke="#b83a22" stroke-width="5" stroke-linecap="round" stroke-dasharray="4 2.4"/>\n'
	# the crook, striped in gold and blue
	s += f'<path d="{crookP}" fill="none" stroke="url(#lapis)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>\n'
	s += f'<path d="{crookP}" fill="none" stroke="url(#gold)" stroke-width="7" stroke-dasharray="5 5" stroke-linejoin="round"/>\n'
	return s + '</svg>\n'


@amulet
def headrest():
	# A headrest, weres: people slept on them, and small ones were laid with
	# the dead to lift and protect the head.
	rest = ('M14 30 C24 44 44 52 64 52 C84 52 104 44 114 30 L118 36 C108 54 88 62 72 64 V92 '
		'H96 C104 92 108 98 108 106 V114 H20 V106 C20 98 24 92 32 92 H56 V64 C40 62 20 54 10 36 Z')
	s = head('A headrest, weres: people slept on them, and small ones were laid with the dead to lift and protect the head.')
	s += custom_grad('stone', [(0, '#c8c8d8'), (.35, '#6a6a80'), (.72, '#3a3a4c'), (1, '#1a1a24')]) + '</defs>\n'
	s += shadow_outline(rest)
	s += f'<path d="{rest}" fill="url(#stone)"/>\n'
	s += f'<path d="M60 70 V88 M68 70 V88" stroke="#1a1a24" stroke-width="2" opacity=".6"/>\n'
	s += highlight('M20 38 C32 48 48 54 60 55')
	return s + '</svg>\n'


@amulet
def shabti():
	# A shabti, a small figure placed in the tomb to work in the next world
	# in its owner's place, often of blue faience, holding hoes.
	body = ('M44 36 C44 20 52 10 64 10 C76 10 84 20 84 36 C88 44 90 54 88 64 '
		'C88 80 84 96 80 108 C78 116 72 120 64 120 C56 120 50 116 48 108 C44 96 40 80 40 64 C38 54 40 44 44 36 Z')
	s = head('A shabti, a small figure placed in the tomb to work in the next world in its owner\'s place, of blue faience, holding hoes.')
	s += custom_grad('fai', [(0, '#d8f4ff'), (.35, '#6ac4e0'), (.72, '#2a8ab8'), (1, '#145a80')]) + '</defs>\n'
	s += shadow_outline(body)
	s += f'<path d="{body}" fill="url(#fai)"/>\n'
	# the wig and face
	s += f'<path d="M44 36 C44 20 52 10 64 10 C76 10 84 20 84 36 L86 52 H76 L74 32 H54 L52 52 H42 Z" fill="#10283a"/>\n'
	s += f'<path d="M54 32 H74 V40 C74 48 70 52 64 52 C58 52 54 48 54 40 Z" fill="#8ad0e8" stroke="#10283a" stroke-width="1.6"/>\n'
	s += '<path d="M58 38 H61 M67 38 H70" stroke="#10283a" stroke-width="2" stroke-linecap="round"/>\n'
	# crossed arms holding hoes
	s += f'<path d="M46 64 C54 60 74 60 82 64 M48 72 L80 60 M80 72 L48 60" fill="none" stroke="#10283a" stroke-width="3" stroke-linecap="round"/>\n'
	# lines of writing down the front
	s += f'<path d="M58 80 H70 M57 88 H71 M58 96 H70 M59 104 H69" stroke="#10283a" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += highlight('M48 70 C48 84 50 96 54 106')
	return s + '</svg>\n'


@amulet
def bes():
	# Bes, the household God who guarded sleep, mothers and children: shown
	# face on, with a lion's mane, a tall crown of plumes and his tongue out.
	faceP = 'M64 44 C84 44 98 58 98 78 C98 100 84 116 64 116 C44 116 30 100 30 78 C30 58 44 44 64 44 Z'
	plumes = 'M40 50 L36 12 L48 36 L54 6 L60 34 L64 2 L68 34 L74 6 L80 36 L92 12 L88 50 Z'
	s = head('Bes, the household God who guarded sleep, mothers and children: face on, with a lion\'s mane, a tall crown of plumes and His tongue out.')
	s += grad('gold', 'gold', 30, 0, 100, 60) + custom_grad('mane', [(0, '#f0b060'), (.5, '#b8641e'), (1, '#6a3010')], 30, 44, 98, 116) + custom_grad('face', [(0, '#fff0c0'), (.5, '#f0c070'), (1, '#b8803a')], 40, 56, 88, 108) + grad('carn', 'carnelian', 56, 96, 72, 112) + '</defs>\n'
	s += shadow_outline(faceP + ' ' + plumes)
	s += f'<path d="{plumes}" fill="url(#gold)" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>\n'
	s += f'<path d="M44 44 L40 14 M54 40 L54 10 M64 38 V6 M74 40 L74 10 M84 44 L88 14" stroke="#8a5a10" stroke-width="1.6"/>\n'
	s += f'<path d="{faceP}" fill="url(#mane)"/>\n'
	mane = ' '.join(f'M{64 + 36 * math.cos(a):.0f} {80 + 36 * math.sin(a):.0f} L{64 + 28 * math.cos(a):.0f} {80 + 28 * math.sin(a):.0f}' for a in [math.pi * (0.1 + i * 0.1) - math.pi for i in range(19)])
	s += f'<path d="{mane}" stroke="#6a3010" stroke-width="2" stroke-linecap="round"/>\n'
	s += f'<path d="M64 58 C78 58 86 68 86 80 C86 94 78 104 64 104 C50 104 42 94 42 80 C42 68 50 58 64 58 Z" fill="url(#face)" stroke="{INK}" stroke-width="2.6"/>\n'
	s += f'<path d="M50 74 C52 70 58 70 60 74 M68 74 C70 70 76 70 78 74" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>\n'
	s += f'<path d="M60 84 C62 88 66 88 68 84" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += f'<path d="M58 94 H70 V104 C70 110 58 110 58 104 Z" fill="url(#carn)" stroke="{INK}" stroke-width="2"/>\n'
	return s + '</svg>\n'


@amulet
def doublecrown():
	# The double crown, pschent: the white crown of Upper Egypt set inside
	# the red crown of Lower Egypt, for the king of both lands. The red crown
	# is low at the front and rises in a tall narrow back; the white crown's
	# tall bulb rises out of it.
	white = 'M36 80 C32 56 38 26 52 12 C60 4 72 6 76 16 C82 34 84 60 80 80 Z'
	red = 'M22 118 V80 H82 V18 H104 V118 Z'
	s = head('The double crown, pschent: the white crown of Upper Egypt set inside the red crown of Lower Egypt, worn by the king of both lands.')
	s += grad('carn', 'carnelian') + custom_grad('white', CREAM, 36, 4, 84, 80) + grad('gold', 'gold') + '</defs>\n'
	s += shadow_outline(white + ' ' + red)
	s += f'<path d="{white}" fill="url(#white)"/>\n'
	s += f'<path d="{red}" fill="url(#carn)"/>\n'
	# the curl of wire rising from the front of the red crown
	s += f'<path d="M30 84 C18 74 14 60 20 52 C24 48 30 52 26 58" fill="none" stroke="{INK}" stroke-width="5.6" stroke-linecap="round"/><path d="M30 84 C18 74 14 60 20 52 C24 48 30 52 26 58" fill="none" stroke="url(#gold)" stroke-width="2.6" stroke-linecap="round"/>\n'
	s += f'<path d="M22 80 H82 V18" fill="none" stroke="{INK}" stroke-width="3"/>\n'
	s += f'<path d="M24 108 H102" stroke="url(#gold)" stroke-width="5"/>\n'
	s += highlight('M42 72 C40 50 44 30 52 18') + highlight('M90 28 V70', 3)
	return s + '</svg>\n'


@amulet
def throne():
	# The throne sign, the hieroglyph of Isis's name (Aset, "seat"), which
	# She wears as Her crown: a seat seen from the side, its low back rising
	# at the rear.
	seat = 'M16 118 V64 H76 V24 C76 18 80 14 86 14 H110 V118 Z'
	s = head('The throne sign, the hieroglyph of Isis\'s name (Aset, "seat"), which She wears as Her crown: a seat seen from the side, its back rising at the rear.')
	s += grad('lapis', 'lapis') + grad('gold', 'gold') + '</defs>\n'
	s += shadow_outline(seat)
	s += f'<path d="{seat}" fill="url(#gold)"/>\n'
	# the side of the seat, inlaid with a feather pattern in blue
	s += f'<path d="M26 74 H100 V108 H26 Z" fill="url(#lapis)" stroke="{INK}" stroke-width="2.6"/>\n'
	s += f'<path d="M26 86 H100 M26 97 H100" stroke="#f5d04e" stroke-width="2"/>\n'
	ticks = ' '.join(f'M{x} {y} V{y + 8}' for y in (76, 88, 99) for x in range(32, 98, 9) if y + 8 < 108)
	s += f'<path d="{ticks}" stroke="#9fb8ff" stroke-width="2" stroke-linecap="round"/>\n'
	s += f'<path d="M16 64 H76 V24" fill="none" stroke="{INK}" stroke-width="2.6"/>\n'
	s += highlight('M82 58 V26 C82 22 84 20 88 20', 3)
	return s + '</svg>\n'


@amulet
def myrrh():
	# A myrrh tree in its basket, one of those Hatshepsut's expedition brought
	# back from the land of Punt, as the walls of Deir el-Bahari show.
	pot = 'M34 88 H94 L88 118 H40 Z'
	crown = ('M64 16 C76 14 86 22 86 32 C96 34 102 44 98 54 C104 62 100 74 90 76 '
		'C84 84 72 84 66 78 C58 84 46 82 40 74 C28 72 24 60 30 52 C24 42 32 30 42 30 C44 20 54 16 64 16 Z')
	s = head('A myrrh tree in its basket, one of those Hatshepsut\'s expedition brought back from the land of Punt, as the walls of Deir el-Bahari show.')
	s += grad('green', 'malachite', 24, 14, 104, 84) + custom_grad('basket', [(0, '#f0c890'), (.5, '#b8783a'), (1, '#6a3e10')], 34, 88, 94, 118) + '</defs>\n'
	s += shadow_outline(pot + ' ' + crown + ' M58 88 L60 70 H68 L70 88 Z')
	s += f'<path d="M58 88 L60 70 H68 L70 88 Z" fill="#6e4220"/>\n'
	s += f'<path d="{crown}" fill="url(#green)"/>\n'
	s += f'<path d="M50 44 C54 48 58 48 62 44 M70 56 C74 60 78 60 82 56 M44 62 C48 66 52 66 56 62 M66 30 C70 34 74 34 78 30" fill="none" stroke="#1f5a2a" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += f'<path d="{pot}" fill="url(#basket)" stroke="{INK}" stroke-width="2.6" stroke-linejoin="round"/>\n'
	s += f'<path d="M36 98 H92 M38 108 H90 M50 88 L48 118 M64 88 V118 M78 88 L80 118" stroke="#5a3010" stroke-width="1.8"/>\n'
	s += f'<path d="M34 88 C24 80 22 70 26 64 M94 88 C104 80 106 70 102 64" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>\n'
	s += highlight('M40 40 C44 32 52 26 60 24')
	return s + '</svg>\n'


@amulet
def coin():
	# A silver coin of the Ptolemies, the Greek kings who ruled Egypt from
	# Alexandria: an eagle standing on a thunderbolt, their emblem.
	s = head('A silver coin of the Ptolemies, the Greek kings who ruled Egypt from Alexandria: an eagle standing on a thunderbolt, their emblem.')
	s += custom_grad('silver', [(0, '#ffffff'), (.35, '#dce2ea'), (.72, '#9aa4b4'), (1, '#5a6474')]) + custom_grad('silver2', [(0, '#9aa4b4'), (1, '#e8ecf2')]) + '</defs>\n'
	disc = 'M64 10 C94 10 118 34 118 64 C118 94 94 118 64 118 C34 118 10 94 10 64 C10 34 34 10 64 10 Z'
	s += shadow_outline(disc)
	s += f'<path d="{disc}" fill="url(#silver)"/>\n'
	s += f'<circle cx="64" cy="64" r="44" fill="url(#silver2)" stroke="#5a6474" stroke-width="2"/>\n'
	s += f'<circle cx="64" cy="64" r="49" fill="none" stroke="#5a6474" stroke-width="2" stroke-dasharray="2 3"/>\n'
	# the eagle standing on the thunderbolt, facing left
	eagle = ('M40 52 C40 44 46 40 52 42 L58 44 C66 40 78 42 84 50 C90 58 90 70 86 80 L96 94 H84 L76 84 '
		'C70 86 62 86 58 82 L56 90 H50 L52 80 C46 74 44 64 48 56 Z')
	s += f'<path d="{eagle}" fill="#6a7484" stroke="#3a4050" stroke-width="2" stroke-linejoin="round"/>\n'
	s += f'<path d="M40 50 L34 54 L40 56 Z" fill="#3a4050"/><circle cx="46" cy="48" r="1.6" fill="#1a1e28"/>\n'
	s += f'<path d="M58 56 C66 54 76 58 82 66 M60 66 C66 64 74 68 78 74" fill="none" stroke="#3a4050" stroke-width="1.6"/>\n'
	s += f'<path d="M36 98 H92 M44 94 L40 102 M84 94 L88 102 M64 94 V102" stroke="#3a4050" stroke-width="2.6" stroke-linecap="round"/>\n'
	s += highlight('M24 50 C28 34 40 22 56 18')
	return s + '</svg>\n'


@amulet
def vulture():
	# A vulture, as the hieroglyph of the Egyptian vulture is painted: white,
	# with a yellow face and a hooked beak, the ruff at the nape, black
	# wing-tips and yellow feet. Vultures were sacred to Nekhbet and to Mut.
	body = ('M84 24 C88 18 96 16 102 18 L118 24 C120 26 118 30 114 28 L104 28 C102 36 104 46 106 56 '
		'C108 70 104 80 96 86 L98 100 H90 L88 90 C82 92 76 92 72 90 L70 100 H62 L64 88 '
		'C56 90 40 98 24 108 L10 114 C16 100 30 84 44 72 C56 60 70 46 78 34 Z')
	s = head('A vulture as the hieroglyph paints it: white, with a yellow face and hooked beak, a ruff at the nape, black wing-tips and yellow feet. Vultures were sacred to Nekhbet and to Mut.')
	s += custom_grad('white', CREAM, 30, 20, 110, 100) + custom_grad('yel', [(0, '#fff0a0'), (1, '#e0a020')], 84, 16, 120, 34) + '</defs>\n'
	feet = 'M60 104 H76 M86 104 H102 M66 98 V104 M94 98 V104'
	s += '<g filter="url(#sh)">'
	s += f'<path d="{feet}" stroke="{INK}" stroke-width="8" stroke-linecap="round"/>'
	s += f'<path d="{body}" fill="{INK}" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>'
	s += '</g>\n'
	s += f'<path d="{feet}" stroke="#e0a020" stroke-width="4" stroke-linecap="round"/>\n'
	s += f'<path d="{body}" fill="url(#white)"/>\n'
	# the wing: a band of green-grey feathers, black flight feathers
	s += f'<path d="M46 72 C60 64 76 62 88 66 C84 74 70 80 54 82 Z" fill="#8aa890" stroke="{INK}" stroke-width="1.6"/>\n'
	s += f'<path d="M54 72 L52 80 M62 69 L60 78 M70 67 L68 76 M78 66 L76 74" stroke="#4a6a52" stroke-width="2"/>\n'
	s += f'<path d="M44 74 C34 84 22 96 12 112 C24 104 38 92 52 82 Z" fill="#1a1410"/>\n'
	s += f'<path d="M84 64 C90 60 96 60 100 62 C96 68 90 70 84 70 Z" fill="#1a1410"/>\n'
	s += f'<path d="M60 58 C66 56 70 58 72 62 C66 62 62 60 60 58 Z" fill="#1a1410"/>\n'
	# the yellow face and hooked beak, the eye, the ruff
	s += f'<path d="M84 24 C88 18 96 16 102 18 L118 24 C120 26 118 30 114 28 L104 28 C100 32 92 32 86 30 Z" fill="url(#yel)" stroke="{INK}" stroke-width="2" stroke-linejoin="round"/>\n'
	s += f'<path d="M114 24 C118 24 120 28 116 31" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>\n'
	s += f'<circle cx="96" cy="23" r="3.4" fill="#fffdf6" stroke="{INK}" stroke-width="1.6"/><circle cx="96" cy="23" r="1.6" fill="{INK}"/>\n'
	s += f'<path d="M82 24 L76 22 M81 28 L74 28 M80 32 L74 34" stroke="{INK}" stroke-width="1.8" stroke-linecap="round"/>\n'
	s += highlight('M88 40 C90 50 92 60 92 70', 3)
	return s + '</svg>\n'


@amulet
def scroll():
	# A papyrus roll, as kept in the Library of Alexandria: opened between
	# its two rolled ends, written in black ink with red for headings, as
	# Egyptian scribes did.
	sheet = 'M30 30 H98 V100 H30 Z'
	left = 'M14 28 C14 22 30 22 30 28 V102 C30 108 14 108 14 102 Z'
	right = 'M98 28 C98 22 114 22 114 28 V102 C114 108 98 108 98 102 Z'
	s = head('A papyrus roll, opened between its two rolled ends, written in black ink with red for the headings, as Egyptian scribes did.')
	s += custom_grad('pap', [(0, '#fff6d8'), (.5, '#f0d8a0'), (1, '#c8a060')], 30, 30, 98, 100) + custom_grad('roll', [(0, '#c8a060'), (.35, '#fff0c8'), (.7, '#e0c080'), (1, '#9a7a40')], 14, 0, 30, 0) + custom_grad('roll2', [(0, '#c8a060'), (.35, '#fff0c8'), (.7, '#e0c080'), (1, '#9a7a40')], 98, 0, 114, 0) + '</defs>\n'
	s += shadow_outline(sheet + ' ' + left + ' ' + right)
	s += f'<path d="{sheet}" fill="url(#pap)"/>\n'
	# lines of writing: short strokes, red for the first of each column
	lines = []
	red = []
	for col, x0 in enumerate((36, 67)):
		for i in range(8):
			y = 38 + i * 8
			w = 24 if i % 3 else 18
			(red if i == 0 or i == 5 else lines).append(f'M{x0} {y} h{w}')
	s += f'<path d="{" ".join(lines)}" stroke="#2a1a10" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="3 2 5 2 2 2"/>\n'
	s += f'<path d="{" ".join(red)}" stroke="#b83a22" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="4 2 2 2"/>\n'
	s += f'<path d="{left}" fill="url(#roll)" stroke="{INK}" stroke-width="2.6"/>\n'
	s += f'<path d="{right}" fill="url(#roll2)" stroke="{INK}" stroke-width="2.6"/>\n'
	s += f'<ellipse cx="22" cy="28" rx="8" ry="3" fill="#e8d0a0" stroke="{INK}" stroke-width="2"/><ellipse cx="106" cy="28" rx="8" ry="3" fill="#e8d0a0" stroke="{INK}" stroke-width="2"/>\n'
	s += f'<path d="M22 28 C20 27 20 29 22 29 M106 28 C104 27 104 29 106 29" fill="none" stroke="#8a6a30" stroke-width="1.2"/>\n'
	s += highlight('M18 36 V96', 3)
	return s + '</svg>\n'


@amulet
def goose():
	# A red-breasted goose, as painted on the Meidum Geese from the tomb of
	# Nefermaat and Itet at Meidum, near the Faiyum, about 2600 BCE: black
	# neck, white cheek with a red patch, a rust breast, grey scaled back,
	# black tail and flank striped with white. After the painting itself.
	body = ('M108 34 C108 26 102 22 96 22 C88 22 84 28 86 36 C88 44 88 52 84 58 '
		'C70 54 48 56 28 62 L6 66 C16 76 30 84 46 88 C62 92 80 90 88 84 '
		'C98 78 100 66 96 56 C94 48 96 42 100 40 C104 38 108 38 108 34 Z')
	s = head('A red-breasted goose, as painted on the Meidum Geese from the tomb of Nefermaat and Itet at Meidum, near the Faiyum, about 2600 BCE.')
	s += custom_grad('white', CREAM, 20, 50, 100, 92) + custom_grad('grey', [(0, '#c8ccd0'), (.5, '#7a8088'), (1, '#3a4048')], 24, 54, 84, 76)
	s += custom_grad('black', BLACK, 80, 20, 110, 60) + custom_grad('rust', [(0, '#e87a50'), (1, '#8a2a14')], 82, 48, 98, 80) + '</defs>\n'
	legs = 'M60 88 L58 110 M74 88 L76 110 M50 110 H64 M70 110 H84'
	s += '<g filter="url(#sh)">'
	s += f'<path d="{legs}" stroke="{INK}" stroke-width="7" stroke-linecap="round" fill="none"/>'
	s += f'<path d="{body} M107 31 L121 36 L107 40 Z" fill="{INK}" stroke="{INK}" stroke-width="9" stroke-linejoin="round"/>'
	s += '</g>\n'
	s += f'<path d="{legs}" stroke="#a8acb0" stroke-width="3" stroke-linecap="round" fill="none"/>\n'
	s += f'<path d="{body}" fill="url(#white)"/>\n'
	s += f'<clipPath id="gs"><path d="{body}"/></clipPath>\n'
	s += '<g clip-path="url(#gs)">\n'
	# the grey back and wing, in rows of scale-like feathers
	wing = 'M86 60 C66 54 40 56 22 64 C36 72 58 76 84 74 Z'
	s += f'<path d="{wing}" fill="url(#grey)"/>\n'
	sc = ' '.join(f'M{x} {y} q3 4 6 0' for y in (60, 65, 70) for x in range(30 + (y % 2) * 3, 84, 7))
	s += f'<path d="{sc}" fill="none" stroke="#2a3038" stroke-width="1.2" opacity=".6"/>\n'
	# black tail, and the black flank with white stripes
	s += f'<path d="M30 62 L4 66 C12 74 20 78 32 80 C34 74 34 68 30 62 Z" fill="url(#black)"/>\n'
	s += f'<path d="M58 76 C68 76 78 76 88 72 L92 84 C84 88 72 90 60 88 Z" fill="url(#black)"/>\n'
	s += f'<path d="M66 78 C66 82 68 86 70 88 M74 77 C74 81 76 85 78 87 M82 75 C82 79 84 83 86 85" fill="none" stroke="#fffdf6" stroke-width="2" stroke-linecap="round"/>\n'
	# the black head and neck, the white cheek, the red patch, the white neck stripe
	s += f'<path d="M108 34 C108 26 102 22 96 22 C88 22 84 28 86 36 C88 44 88 52 84 58 L90 60 C92 52 94 44 97 40 C101 38 108 38 108 34 Z" fill="url(#black)"/>\n'
	s += f'<path d="M94 26 C98 24 104 26 106 30 C104 34 98 36 94 32 Z" fill="#fffdf6"/>\n'
	s += f'<path d="M92 27 C94 25 96 25 97 27 L96 33 C94 33 92 31 92 27 Z" fill="#b83a22"/>\n'
	s += f'<path d="M93 36 C92 44 90 50 88 58" fill="none" stroke="#fffdf6" stroke-width="2.4" stroke-linecap="round"/>\n'
	# the rust breast, speckled
	s += f'<path d="M92 52 C98 56 100 64 98 72 C96 78 92 82 88 82 C90 72 92 62 92 52 Z" fill="url(#rust)"/>\n'
	s += '<g fill="#4a1408">' + ''.join(f'<circle cx="{x}" cy="{y}" r=".9"/>' for x, y in ((94, 60), (96, 66), (93, 70), (95, 75), (91, 76))) + '</g>\n'
	s += '</g>\n'
	s += f'<path d="M107 31 L121 36 L107 40 Z" fill="#8a8e94" stroke="{INK}" stroke-width="1.4" stroke-linejoin="round"/>\n'
	s += f'<circle cx="101" cy="29" r="1.8" fill="{INK}"/>\n'
	s += highlight('M34 64 C46 60 60 58 72 58', 3)
	return s + '</svg>\n'


@amulet
def glassfish():
	# The glass fish of Amarna: a small bottle for scented oil shaped like a
	# tilapia, made of dark blue glass with wavy trails of yellow and white,
	# found at Amarna and now in the British Museum.
	body = 'M12 64 C20 42 44 30 70 32 C86 33 98 42 104 52 L120 36 C124 54 124 76 120 94 L104 78 C96 90 82 98 62 98 C36 98 18 84 12 64 Z'
	s = head('The glass fish of Amarna: a small bottle for scented oil shaped like a tilapia, dark blue glass with wavy trails of yellow and white.')
	s += custom_grad('glass', [(0, '#6a8aff'), (.4, '#2a3aa8'), (1, '#0a1250')], 20, 30, 110, 100) + '</defs>\n'
	s += shadow_outline(body)
	s += f'<path d="{body}" fill="url(#glass)"/>\n'
	s += f'<clipPath id="gf"><path d="{body}"/></clipPath>\n'
	# the trails of coloured glass combed into waves
	waves = []
	for i, y in enumerate(range(44, 96, 8)):
		col = '#f5d04e' if i % 2 == 0 else '#fffdf6'
		d = f'M8 {y}' + ''.join(f' q6 -7 12 0 t12 0' for _ in range(10))
		waves.append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="2.6"/>')
	s += f'<g clip-path="url(#gf)" opacity=".95">{"".join(waves)}</g>\n'
	# the mouth of the bottle, the eye, the fin
	s += f'<path d="{body}" fill="none" stroke="{INK}" stroke-width="3"/>\n'
	s += f'<circle cx="30" cy="56" r="7" fill="#fffdf6" stroke="{INK}" stroke-width="2.4"/><circle cx="29" cy="56" r="3.4" fill="{INK}"/>\n'
	s += f'<ellipse cx="14" cy="64" rx="3" ry="6" fill="#0a1250" stroke="{INK}" stroke-width="2"/>\n'
	s += highlight('M30 42 C42 36 56 34 68 36')
	return s + '</svg>\n'
