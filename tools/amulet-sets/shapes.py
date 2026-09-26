"""The plain outline of every amulet, in parts, and its colours: what every
amulet set with pictures of its own is drawn from (draw.py). Each amulet is
a list of parts in a 128 box, drawn in order: ('fill', path, tone) or
('line', path, width, tone). A tone is l, m or d (the amulet's own light,
middle and dark, in TONE) or a name in EXTRA.

A new amulet needs an outline here and its colours in TONE; then
python3 tools/amulet-sets/draw.py draws it in every set.
"""
import math

INK = '#2a1703'

# each amulet keeps its colour in every set: light, middle, dark
TONE = {
	'ankh': ('#fff3b0', '#f2c230', '#a8700c'),
	'scarab': ('#b8ccff', '#3d66d6', '#1a2c7a'),
	'eye': ('#c4fff2', '#26b3a2', '#0c6258'),
	'lotus': ('#ffc2b4', '#e2503a', '#8c1e12'),
	'pyramid': ('#fff4dc', '#e4c48e', '#9c7442'),
}

# colours shared by every amulet that uses them
EXTRA = {
	'ink': INK, 'white': '#fffaf0', 'g': '#4aa050', 'G': '#236030', 'gold': '#f5c83a',
	'red': '#d8482a', 'blue': '#3d66d6', 'black': '#2a2420', 'sand': '#e4c48e', 'lblue': '#dcecff',
	'lime': '#c8e040', 'cream': '#fbf2dc', 'brown': '#a0683a', 'orange': '#e07a30', 'teal2': '#26b3a2', 'pink': '#f0a0a0',
}


def colour(name, tone):
	if tone in 'lmd' and len(tone) == 1: return TONE[name]['lmd'.index(tone)]
	return EXTRA[tone]

ANKH = ('M64 8 A21 25 0 1 1 64 58 A21 25 0 1 1 64 8 Z M64 19 A9 14 0 1 0 64 47 A9 14 0 1 0 64 19 Z '
	'M22 56 H106 V73 H22 Z M55 73 H73 L82 120 H46 Z')
SCARAB_LEGS = 'M44 46 L28 38 L22 24 M84 46 L100 38 L106 24 M34 78 L18 74 L10 86 M94 78 L110 74 L118 86 M40 104 L26 112 L22 122 M88 104 L102 112 L106 122'
ELYTRA = 'M30 72 C30 62 44 60 64 60 C84 60 98 62 98 72 C100 98 86 118 64 120 C42 118 28 98 30 72 Z'
THORAX = 'M36 50 C34 38 46 32 64 32 C82 32 94 38 92 50 C90 57 80 60 64 60 C48 60 38 57 36 50 Z'
HEAD = 'M50 34 C50 22 56 16 64 16 C72 16 78 22 78 34 Z'
EYE_DISC = 'M64 12 A52 52 0 1 1 64 116 A52 52 0 1 1 64 12 Z'
BROW = 'M26 40 C46 26 84 26 104 38 L101 48 C84 38 48 38 29 50 Z'
ALMOND = 'M22 68 C40 50 86 48 106 66 C88 80 42 82 22 68 Z'
IRIS = 'M64 55 A11 11 0 1 1 64 77 A11 11 0 1 1 64 55 Z'
TEAR = 'M52 80 L46 106'
SPIRAL = 'M76 80 C80 96 92 102 100 96 C106 90 98 84 93 90'
PETAL_C = 'M64 14 C78 36 78 68 64 88 C50 68 50 36 64 14 Z'
PETAL_L = 'M62 90 C42 84 26 62 28 32 C46 42 58 62 62 90 Z'
PETAL_R = 'M66 90 C86 84 102 62 100 32 C82 42 70 62 66 90 Z'
PETAL_LL = 'M62 92 C38 92 16 80 8 58 C30 56 50 70 62 92 Z'
PETAL_RR = 'M66 92 C90 92 112 80 120 58 C98 56 78 70 66 92 Z'
STEM = 'M64 92 V122'
SEPALS = 'M64 100 C54 94 44 96 36 104 C48 108 58 106 64 100 Z M64 100 C74 94 84 96 92 104 C80 108 70 106 64 100 Z'
PYR_L = 'M64 12 L116 112 H12 Z'
PYR_R = 'M64 12 L116 112 H72 Z'
PYR_CAP = 'M64 12 L75 33 H53 Z'
PYR_COURSES = 'M42 54 H86 M31 75 H97 M21 94 H107'

# the first set of Memphis
SHAPES = {
	'ankh': [('fill', ANKH, 'm')],
	'scarab': [('line', SCARAB_LEGS, 8, 'd'), ('fill', ELYTRA, 'm'), ('fill', THORAX, 'm'), ('fill', HEAD, 'd'),
		('line', 'M64 62 V118', 3.5, 'ink')],
	'eye': [('fill', EYE_DISC, 'm'), ('fill', BROW, 'ink'), ('fill', ALMOND, 'white'), ('fill', IRIS, 'ink'),
		('line', TEAR, 7, 'ink'), ('line', SPIRAL, 7, 'ink')],
	'lotus': [('line', STEM, 8, 'G'), ('fill', SEPALS, 'g'), ('fill', PETAL_LL, 'd'), ('fill', PETAL_RR, 'd'),
		('fill', PETAL_L, 'm'), ('fill', PETAL_R, 'm'), ('fill', PETAL_C, 'l')],
	'pyramid': [('fill', PYR_L, 'm'), ('fill', PYR_R, 'd'), ('line', PYR_COURSES, 3, 'd'), ('fill', PYR_CAP, 'gold')],
}

# ---------------------------------------------------------------- the rest of Memphis
TONE.update({
	'bull': ('#6e6660', '#3a3430', '#1a1612'),
	'doublecrown': ('#ffb8a4', '#d8482a', '#8a2414'),
	'was': ('#b8ccff', '#3d66d6', '#1a2c7a'),
	'djed': ('#b8f0c0', '#3ca060', '#1c5a34'),
	'sphinx': ('#fff0cc', '#e0b870', '#9c7038'),
	'bee': ('#fff4a0', '#f0c020', '#a07808'),
	'papyrus': ('#d8ffc8', '#6ac070', '#2e7a3a'),
	'ka': ('#ffb4a0', '#dc5438', '#8c2414'),
	'nefer': ('#c8fff4', '#3cc0b0', '#157068'),
})

SHAPES.update({
	# the Apis bull in profile, facing left, the sun disc between His horns
	'bull': [
		('line', 'M114 54 C122 64 122 80 117 92', 5, 'd'),
		('fill', 'M30 84 H41 V116 H30 Z M48 86 H59 V116 H48 Z M86 86 H97 V116 H86 Z M100 84 H111 V114 H100 Z', 'd'),
		('fill', 'M22 58 C22 46 32 40 46 40 H94 C106 40 114 48 114 60 V76 C114 84 108 90 100 90 H42 C30 90 24 82 22 72 Z', 'm'),
		('fill', 'M6 62 C4 52 12 44 22 44 L36 46 L36 72 C28 78 16 78 10 72 Z', 'm'),
		('fill', 'M52 40 H88 V62 C78 68 62 68 52 62 Z', 'red'),
		('line', 'M14 46 C8 36 14 26 24 28 M30 44 C34 34 30 26 24 28', 5, 'white'),
		('fill', 'M24 11 A10 10 0 1 1 24 31 A10 10 0 1 1 24 11 Z', 'red'),
		('fill', 'M14 52 L22 50 L18 58 Z', 'white'),
	],
	# the double crown: the white crown inside the red, with the red crown's curl
	'doublecrown': [
		('fill', 'M40 68 C34 42 42 14 60 8 C78 14 86 42 82 68 Z', 'white'),
		('fill', 'M24 120 V64 C40 72 80 72 86 64 V12 H106 V120 Z', 'm'),
		('line', 'M30 66 C20 58 20 44 30 42 C37 42 39 50 34 53', 4.5, 'gold'),
		('line', 'M26 108 H104', 4, 'gold'),
	],
	# the was sceptre: a staff with an animal's head at the top and a fork at the foot
	'was': [
		('line', 'M62 30 V106', 11, 'm'),
		('line', 'M62 106 L50 122 M62 106 L74 122', 8, 'gold'),
		('fill', 'M54 34 C50 24 56 14 66 14 L86 10 L82 20 L72 24 C72 30 68 36 60 38 Z', 'gold'),
		('line', 'M64 16 L60 4', 5, 'gold'),
		('line', 'M57 54 H67 M57 74 H67 M57 94 H67', 3.5, 'gold'),
	],
	# the djed pillar, the backbone of Osiris: a column with four bars at the top
	'djed': [
		('fill', 'M46 58 H82 V118 H46 Z', 'm'),
		('fill', 'M50 6 H78 V20 H50 Z', 'm'),
		('fill', 'M30 22 H98 V32 H30 Z M30 36 H98 V46 H30 Z M30 50 H98 V60 H30 Z', 'l'),
		('line', 'M46 100 H82', 4, 'blue'),
	],
	# the Great Sphinx in profile, in the striped headcloth
	'sphinx': [
		('fill', 'M6 104 H122 V118 H6 Z', 'd'),
		('fill', 'M38 88 C38 72 52 64 72 66 C94 66 112 72 116 90 V104 H38 Z', 'm'),
		('fill', 'M12 104 C12 96 18 94 28 94 H58 V104 Z', 'm'),
		('fill', 'M28 30 C30 16 58 14 64 28 L70 70 H56 L54 42 H34 Z', 'blue'),
		('fill', 'M34 42 C34 32 40 28 48 28 C56 28 58 36 56 46 L56 62 C50 68 38 66 34 58 Z', 'l'),
		('line', 'M60 38 L66 64', 3, 'gold'),
	],
	# the bee of Lower Egypt
	'bee': [
		('line', 'M58 22 L48 8 M70 22 L80 8', 4, 'black'),
		('fill', 'M40 58 C20 42 2 50 6 62 C10 74 30 74 46 66 Z M88 58 C108 42 126 50 122 62 C118 74 98 74 82 66 Z', 'lblue'),
		('fill', 'M64 44 C80 44 88 62 88 80 C88 100 76 116 64 120 C52 116 40 100 40 80 C40 62 48 44 64 44 Z', 'm'),
		('line', 'M44 68 H84 M42 86 H86 M49 103 H79', 7, 'black'),
		('fill', 'M64 18 A13 13 0 1 1 64 44 A13 13 0 1 1 64 18 Z', 'black'),
	],
	# a papyrus stem with its open umbel
	'papyrus': [
		('line', 'M64 66 V122', 10, 'd'),
		('fill', 'M64 72 L14 34 C28 14 100 14 114 34 Z', 'm'),
		('line', 'M64 70 L26 28 M64 70 L45 19 M64 70 V16 M64 70 L83 19 M64 70 L102 28', 2.5, 'd'),
		('fill', 'M64 76 C54 76 50 68 50 62 L64 68 L78 62 C78 68 74 76 64 76 Z', 'l'),
	],
	# the ka: two arms raised from the elbows
	'ka': [
		('fill', 'M16 30 C16 14 42 14 42 30 V84 H86 V30 C86 14 112 14 112 30 V116 H16 Z', 'm'),
		('line', 'M29 22 V30 M99 22 V30', 4, 'l'),
	],
	# nefer: a heart with the windpipe rising from it, crossed near the top
	'nefer': [
		('fill', 'M57 10 H71 V66 H57 Z', 'm'),
		('fill', 'M42 30 H86 V42 H42 Z', 'm'),
		('fill', 'M64 58 A32 32 0 1 1 64 122 A32 32 0 1 1 64 58 Z', 'm'),
	],
})

# ---------------------------------------------------------------- Saqqara
TONE.update({
	'ibis': ('#ffffff', '#f4efe4', '#b8ae98'),
	'falcon': ('#c8f0d0', '#3c9a6a', '#1c5a3c'),
	'heart': ('#ffb8a8', '#d84a36', '#8a2014'),
	'baboon': ('#c8f0b8', '#4aa060', '#1f5a2a'),
	'cat': ('#5a5060', '#2a2430', '#100c14'),
	'shen': ('#fff3b0', '#f2c230', '#a8700c'),
})

SHAPES.update({
	# the sacred ibis of Thoth, facing left: white body, black head, neck and tail plumes
	'ibis': [
		('line', 'M70 80 V118 M82 80 L86 118', 4.5, 'black'),
		('fill', 'M40 60 C40 44 60 38 80 44 C98 50 112 64 116 78 C100 84 72 84 56 78 C46 74 40 68 40 60 Z', 'm'),
		('fill', 'M94 56 C108 60 120 72 122 86 C110 86 98 78 90 68 Z', 'black'),
		('line', 'M46 56 C36 44 32 30 36 20', 7, 'black'),
		('fill', 'M36 11 A8 8 0 1 1 36 27 A8 8 0 1 1 36 11 Z', 'black'),
		('line', 'M30 20 C20 24 12 36 10 48', 4, 'black'),
	],
	# Horus as a falcon, facing left: blue cap, pale face, green wing, the sun's disc
	'falcon': [
		('line', 'M58 104 V118 M72 104 V118', 4.5, 'gold'),
		('fill', 'M44 42 C44 28 56 20 70 22 C84 24 90 36 88 50 L96 100 L110 120 H92 L80 104 H52 C46 90 44 72 44 42 Z', 'cream'),
		('fill', 'M60 46 C80 44 94 62 98 90 L110 120 H90 C78 100 62 82 60 46 Z', 'm'),
		('fill', 'M44 42 C44 28 56 20 70 22 C80 24 86 32 86 42 C72 38 56 40 44 46 Z', 'blue'),
		('fill', 'M44 42 L34 48 L45 52 Z', 'd'),
		('line', 'M58 46 C58 54 54 60 50 62', 3.5, 'ink'),
		('fill', 'M68 3 A10 10 0 1 1 68 23 A10 10 0 1 1 68 3 Z', 'red'),
	],
	# the heart, ib: a jar with two small handles
	'heart': [
		('line', 'M32 56 C20 56 20 70 30 72 M96 56 C108 56 108 70 98 72', 5, 'd'),
		('fill', 'M42 34 H86 L86 44 C104 54 108 78 96 96 C88 110 76 118 64 118 C52 118 40 110 32 96 C20 78 24 54 42 44 Z', 'm'),
		('fill', 'M42 16 H86 V32 H42 Z', 'gold'),
	],
	# Thoth as a baboon, squatting, the moon's disc and crescent on His head
	'baboon': [
		('fill', 'M40 118 C34 96 36 72 50 60 C58 54 78 54 88 62 C100 74 102 98 96 118 Z', 'm'),
		('fill', 'M42 66 C36 50 46 36 62 36 C78 36 90 48 86 64 C76 72 54 72 42 66 Z', 'l'),
		('fill', 'M64 40 C72 34 88 36 94 46 C100 52 98 60 90 62 C82 62 74 58 68 54 Z', 'd'),
		('line', 'M50 94 C62 88 78 90 90 98', 5, 'd'),
		('line', 'M46 24 C50 34 70 34 74 24', 4.5, 'gold'),
		('fill', 'M60 6 A10 10 0 1 1 60 26 A10 10 0 1 1 60 6 Z', 'gold'),
	],
	# the cat of Bastet: a black head with green eyes and a gold collar
	'cat': [
		('fill', 'M28 32 L36 6 L56 30 C60 29 68 29 72 30 L92 6 L100 32 C108 46 108 72 100 90 C92 106 78 116 64 118 C50 116 36 106 28 90 C20 72 20 46 28 32 Z', 'm'),
		('line', 'M38 16 L44 30 M90 16 L84 30', 3.5, 'gold'),
		('fill', 'M40 64 C44 58 52 58 56 64 C52 70 44 70 40 64 Z M72 64 C76 58 84 58 88 64 C84 70 76 70 72 64 Z', 'lime'),
		('fill', 'M58 82 H70 L64 90 Z', 'gold'),
		('line', 'M38 104 C54 116 74 116 90 104', 5, 'gold'),
	],
	# the shen ring: a loop of rope tied with no end
	'shen': [
		('fill', 'M64 6 A40 38 0 1 1 64 82 A40 38 0 1 1 64 6 Z M64 24 A20 20 0 1 0 64 64 A20 20 0 1 0 64 24 Z', 'm'),
		('fill', 'M50 78 H78 V98 H50 Z', 'm'),
		('fill', 'M18 96 H110 V114 H18 Z', 'm'),
		('line', 'M30 105 H98', 3, 'd'),
	],
})

# ---------------------------------------------------------------- every other amulet
GOLD = ('#fff3b0', '#f2c230', '#a8700c')
RED = ('#ffb8a8', '#d84a36', '#8a2014')
WHITE = ('#ffffff', '#f4efe4', '#b8ae98')
LBLUE = ('#d8f0ff', '#5ab0e0', '#1f6a98')
GREEN = ('#c8f0b8', '#4aa060', '#1f5a2a')
ORANGE = ('#ffd8b0', '#e07a30', '#8a4010')
PURPLE = ('#e0d0ff', '#8a5ad0', '#4a2a80')
SAND = ('#fff0cc', '#e0b870', '#9c7038')
BROWN = ('#e8c8a0', '#a0683a', '#5a3418')

TONE.update({
	'akhet': SAND, 'amphora': ORANGE, 'anubis': ('#5a5060', '#2a2430', '#100c14'),
	'aten': ('#fff0a0', '#f8a820', '#a85a08'), 'barque': BROWN, 'bes': BROWN, 'bluelotus': PURPLE,
	'canopic': ('#5a5060', '#2a2430', '#100c14'), 'imsety': SAND, 'hapy': GREEN, 'qebehsenuef': BROWN,
	'cartouche': GOLD, 'coin': ('#f4f6fa', '#b8c0cc', '#687080'), 'collar': ('#c4fff2', '#26b3a2', '#0c6258'),
	'column': ('#c4fff2', '#26b3a2', '#0c6258'), 'croc': GREEN, 'crook': ('#b8ccff', '#3d66d6', '#1a2c7a'),
	'crown': ('#9fb8ff', '#2f52c0', '#0a1848'), 'feather': WHITE, 'fish': LBLUE,
	'frog': ('#d8ffb8', '#7ac050', '#3a7a20'), 'glassfish': ('#b8c8ff', '#2a4ab0', '#101e5a'), 'goose': WHITE,
	'grapes': PURPLE, 'hathor': WHITE, 'headrest': ('#b8c0d0', '#5a6478', '#262c3a'), 'hippo': LBLUE,
	'jar': WHITE, 'lighthouse': WHITE, 'mask': GOLD, 'mummy': ('#f0ece4', '#b8b0a4', '#6a6258'),
	'myrrh': GREEN, 'obelisk': ('#ffd8d0', '#d8948a', '#8a4a42'), 'palm': GREEN, 'pomegranate': RED,
	'ram': ('#fffaf0', '#f0e0c0', '#a89068'), 'sara': WHITE, 'scroll': ('#fffbea', '#f0e0b0', '#b09860'),
	'sekhmet': ORANGE, 'shabti': LBLUE, 'sistrum': GOLD, 'star': ('#b8c8ff', '#2a44b0', '#101c58'),
	'throne': GOLD, 'torch': ORANGE, 'tyet': RED, 'uraeus': GOLD, 'vulture': ('#fffaf0', '#efe6d4', '#9a8a6a'),
})

def circle(cx, cy, r, ccw=False):
	f = 0 if ccw else 1
	return f'M{cx} {cy - r} A{r} {r} 0 1 {f} {cx} {cy + r} A{r} {r} 0 1 {f} {cx} {cy - r} Z'

def star(cx, cy, r1, r2, n=5):
	pts = []
	for k in range(n * 2):
		a = -math.pi / 2 + k * math.pi / n
		r = r1 if k % 2 == 0 else r2
		pts.append(f'{cx + math.cos(a) * r:.1f} {cy + math.sin(a) * r:.1f}')
	return 'M' + ' L'.join(pts) + ' Z'

JAR = 'M40 64 H88 C96 74 98 96 92 110 C88 118 80 122 64 122 C48 122 40 118 36 110 C30 96 32 74 40 64 Z'
NEMES = 'M32 70 C30 44 42 24 64 24 C86 24 98 44 96 70 Z'
def canopic(head):
	return [('fill', JAR, 'cream'), ('line', 'M64 76 V112', 5, 'blue'), ('fill', NEMES, 'blue'),
		('line', 'M36 50 H46 M82 50 H92 M34 62 H46 M82 62 H94', 3, 'gold')] + head

FISH = 'M10 64 C24 36 60 28 88 44 L118 26 L112 64 L118 102 L88 84 C60 100 24 92 10 64 Z'

SHAPES.update({
	'akhet': [('fill', circle(64, 44, 18), 'red'),
		('fill', 'M8 112 C8 70 22 50 40 50 C54 50 62 66 64 80 C66 66 74 50 88 50 C106 50 120 70 120 112 Z', 'm'),
		('line', 'M12 112 H116', 4, 'd')],
	'amphora': [('line', 'M56 38 C40 32 38 48 44 54 M72 38 C88 32 90 48 84 54', 5, 'd'),
		('fill', 'M52 10 H76 V24 C76 28 72 30 72 34 C92 42 100 62 96 82 C92 100 78 114 64 122 C50 114 36 100 32 82 C28 62 36 42 56 34 C56 30 52 28 52 24 Z', 'm'),
		('line', 'M38 68 Q45 60 52 68 T66 68 T80 68 T92 68', 3.5, 'black')],
	'anubis': [('fill', 'M20 70 L34 58 C40 46 50 40 60 40 L70 6 L88 36 C102 44 110 62 110 84 L114 120 H62 C60 104 52 94 40 90 L22 84 C16 80 16 74 20 70 Z', 'm'),
		('fill', 'M73 18 L81 36 L72 38 Z', 'gold'), ('fill', 'M50 56 L64 53 L57 61 Z', 'gold'),
		('line', 'M66 112 H110', 6, 'gold')],
	'aten': [('line', ' '.join(f'M{64 + math.cos(a) * 36:.1f} {64 + math.sin(a) * 36:.1f} L{64 + math.cos(a) * 58:.1f} {64 + math.sin(a) * 58:.1f}' for a in [k * math.pi / 6 for k in range(12)]), 6, 'd'),
		('fill', circle(64, 64, 32), 'm'), ('fill', circle(55, 55, 10), 'l')],
	'barque': [('line', 'M90 82 L104 118 M100 80 L114 114', 4, 'd'),
		('fill', 'M4 56 C12 88 40 100 64 100 C88 100 116 88 124 56 L114 64 C104 78 86 84 64 84 C42 84 24 78 14 64 Z', 'm'),
		('fill', 'M48 50 H80 V84 H48 Z', 'blue'), ('fill', 'M44 42 H84 V52 H44 Z', 'gold')],
	'bes': [('fill', 'M32 46 L36 6 L48 34 L56 2 L64 32 L72 2 L80 34 L92 6 L96 46 Z', 'gold'),
		('fill', circle(64, 78, 36), 'm'),
		('fill', circle(51, 70, 6) + ' ' + circle(77, 70, 6), 'white'),
		('fill', 'M57 94 H71 V108 C71 114 57 114 57 108 Z', 'red'),
		('line', 'M34 94 C40 108 52 114 64 114', 4, 'd')],
	'bluelotus': [('line', 'M64 90 V122', 7, 'G'),
		('fill', 'M60 92 C40 90 26 72 22 48 C40 56 54 72 60 92 Z M68 92 C88 90 102 72 106 48 C88 56 74 72 68 92 Z', 'd'),
		('fill', 'M62 90 C46 82 38 56 42 20 C54 36 60 60 62 90 Z M66 90 C82 82 90 56 86 20 C74 36 68 60 66 90 Z', 'm'),
		('fill', 'M64 6 C75 30 75 64 64 88 C53 64 53 30 64 6 Z', 'l')],
	'canopic': canopic([('fill', 'M42 66 C42 48 48 38 54 34 L50 6 L62 28 H66 L78 6 L74 34 C80 38 86 48 86 66 Z', 'm'),
		('fill', 'M56 44 C56 54 60 60 64 62 C68 60 72 54 72 44 Z', 'd')]),
	'imsety': canopic([('fill', 'M48 66 C46 46 54 34 64 34 C74 34 82 46 80 66 Z', 'm'),
		('line', 'M54 50 H60 M68 50 H74', 3, 'ink')]),
	'hapy': canopic([('fill', 'M46 66 C44 46 54 32 64 32 C74 32 84 46 82 66 Z', 'm'),
		('fill', 'M55 50 H73 V64 H55 Z', 'd')]),
	'qebehsenuef': canopic([('fill', 'M48 66 C46 46 54 32 66 32 C76 32 82 42 80 50 L92 56 L80 60 V66 Z', 'm'),
		('line', 'M60 46 C60 52 58 56 54 58', 3, 'ink')]),
	'cartouche': [('fill', 'M64 6 C84 6 96 20 96 38 V88 C96 102 84 110 64 110 C44 110 32 102 32 88 V38 C32 20 44 6 64 6 Z', 'm'),
		('fill', 'M24 106 H104 V122 H24 Z', 'm'),
		('fill', 'M64 18 C78 18 86 28 86 40 V84 C86 94 78 100 64 100 C50 100 42 94 42 84 V40 C42 28 50 18 64 18 Z', 'cream'),
		('fill', circle(64, 34, 7), 'red'), ('line', 'M52 58 H76', 5, 'blue'), ('fill', circle(64, 80, 9), 'blue')],
	'coin': [('fill', circle(64, 64, 54), 'm'), ('line', circle(64, 64, 44), 3, 'd'),
		('fill', 'M42 84 C42 62 54 48 70 50 C84 52 90 66 86 84 Z', 'd'), ('fill', circle(76, 44, 8), 'd')],
	'collar': [('fill', 'M8 28 C8 82 36 112 64 112 C92 112 120 82 120 28 H96 C96 60 82 80 64 80 C46 80 32 60 32 28 Z', 'm'),
		('line', 'M20 30 C20 72 40 98 64 98 C88 98 108 72 108 30', 5, 'red'),
		('line', 'M27 30 C27 64 44 88 64 88 C84 88 101 64 101 30', 3, 'gold'),
		('fill', 'M2 18 H38 V32 H2 Z M90 18 H126 V32 H90 Z', 'gold')],
	'column': [('fill', 'M44 42 H84 V110 H44 Z', 'sand'), ('line', 'M44 54 H84 M44 62 H84', 3, 'red'),
		('fill', 'M28 14 H100 L90 44 H38 Z', 'm'), ('fill', 'M44 4 H84 V14 H44 Z', 'sand'),
		('fill', 'M32 110 H96 V122 H32 Z', 'd')],
	'croc': [('fill', 'M8 118 C8 90 14 66 30 58 C40 52 56 52 70 56 L118 64 C124 66 124 72 118 74 L72 80 C60 84 52 96 50 118 Z', 'm'),
		('fill', circle(40, 50, 10), 'm'), ('fill', circle(41, 48, 4.5), 'lime'),
		('line', 'M78 70 L114 68', 2.5, 'white'), ('line', 'M18 76 L10 70 M24 94 L14 90', 4, 'd')],
	'crook': [('line', 'M88 118 L42 30', 8, 'gold'), ('line', 'M42 30 L22 14 M42 30 L30 8 M42 30 L40 4', 4.5, 'red'),
		('line', 'M40 118 L86 26 C90 16 102 14 106 22 C110 32 100 38 96 32', 10, 'm'),
		('line', 'M52 94 L58 98 M62 74 L68 78 M72 54 L78 58', 3, 'gold')],
	'crown': [('line', 'M26 90 C18 80 18 66 26 58', 7, 'gold'),
		('fill', 'M30 106 L30 64 C30 44 42 30 58 22 C72 15 90 12 104 14 C110 30 110 54 104 72 C100 84 94 92 94 106 Z', 'm'),
		('fill', 'M30 92 H94 V106 H30 Z', 'gold'),
		('fill', ' '.join(circle(x + (y // 12 % 2) * 6, y, 2.2) for y in range(34, 88, 12) for x in range(46, 100, 12) if not (x > 92 and y > 70)), 'gold')],
	'feather': [('fill', 'M64 6 C82 20 86 60 78 100 L70 120 H62 L58 100 C44 60 48 24 64 6 Z', 'm'),
		('fill', 'M57 96 C62 102 72 102 77 96 L70 120 H62 Z', 'blue'),
		('line', 'M66 118 C66 80 66 40 62 12', 3, 'd')],
	'fish': [('fill', 'M44 36 C56 20 76 22 88 38 Z', 'd'), ('fill', FISH, 'm'),
		('line', 'M40 44 C46 56 46 72 40 84', 3, 'd'), ('fill', circle(28, 58, 5), 'ink')],
	'frog': [('fill', 'M16 112 C6 100 10 86 22 86 L36 104 Z M112 112 C122 100 118 86 106 86 L92 104 Z', 'd'),
		('fill', 'M24 104 C12 90 16 60 34 48 C42 40 54 36 64 36 C74 36 86 40 94 48 C112 60 116 90 104 104 C92 114 36 114 24 104 Z', 'm'),
		('fill', circle(44, 42, 12) + ' ' + circle(84, 42, 12), 'm'),
		('fill', circle(44, 40, 5) + ' ' + circle(84, 40, 5), 'ink'),
		('line', 'M48 70 C58 76 70 76 80 70', 3, 'd')],
	'glassfish': [('fill', 'M44 36 C56 20 76 22 88 38 Z', 'gold'), ('fill', FISH, 'm'),
		('line', 'M24 56 Q34 48 44 56 T64 56 T84 56 M24 72 Q34 64 44 72 T64 72 T84 72', 4, 'white'),
		('fill', circle(22, 60, 5), 'gold')],
	'goose': [('line', 'M58 92 V118 M72 92 V118', 4, 'orange'),
		('fill', 'M20 70 C24 54 44 48 64 52 L90 56 C96 44 96 30 102 24 C108 20 116 24 114 32 L122 36 L112 40 C104 50 104 64 100 76 C90 92 60 96 40 90 C28 86 22 80 20 70 Z', 'm'),
		('fill', 'M34 66 C52 58 74 62 90 72 C76 84 52 84 34 76 Z', 'brown'),
		('fill', 'M113 31 L124 36 L113 40 Z', 'orange'), ('fill', circle(106, 31, 2.5), 'ink')],
	'grapes': [('line', 'M64 6 V26', 5, 'G'), ('fill', 'M66 20 C76 6 94 8 98 18 C88 26 74 28 66 20 Z', 'g'),
		('fill', ' '.join(circle(x, y, 11) for y, xs in ((36, (44, 64, 84)), (54, (34, 54, 74, 94)), (72, (44, 64, 84)), (90, (54, 74)), (108, (64,))) for x in xs), 'm')],
	'hathor': [('line', 'M42 46 C20 42 12 22 24 10 M86 46 C108 42 116 22 104 10', 8, 'gold'),
		('fill', circle(64, 22, 14), 'red'),
		('fill', 'M42 50 L20 56 L40 62 Z M86 50 L108 56 L88 62 Z', 'm'),
		('fill', 'M42 42 C42 36 86 36 86 42 C88 62 82 86 76 102 C72 114 56 114 52 102 C46 86 40 62 42 42 Z', 'm'),
		('fill', circle(53, 62, 4) + ' ' + circle(75, 62, 4), 'ink'),
		('fill', 'M54 98 C54 112 74 112 74 98 Z', 'd')],
	'headrest': [('fill', 'M34 110 H94 V122 H34 Z', 'd'), ('fill', 'M56 68 H72 V110 H56 Z', 'm'),
		('fill', 'M8 34 C22 60 44 72 64 72 C84 72 106 60 120 34 L112 30 C100 50 84 58 64 58 C44 58 28 50 16 30 Z', 'm')],
	'hippo': [('fill', 'M28 92 H44 V114 H28 Z M88 92 H104 V114 H88 Z', 'm'),
		('fill', 'M12 70 C10 56 20 46 34 46 C42 40 58 38 76 40 C98 42 116 52 118 70 C120 84 112 94 100 96 H30 C20 94 12 84 12 70 Z', 'm'),
		('fill', circle(34, 40, 6), 'm'), ('fill', circle(28, 54, 3.5), 'ink'),
		('line', 'M56 58 C60 68 60 80 56 88 M78 54 C82 64 82 78 78 88', 3, 'd')],
	'jar': [('fill', 'M50 18 H78 V28 C96 36 106 56 104 78 C102 100 86 118 64 118 C42 118 26 100 24 78 C22 56 32 36 50 28 Z', 'm'),
		('fill', 'M44 8 H84 V20 H44 Z', 'd'), ('line', 'M30 56 H98', 5, 'blue'), ('line', 'M26 90 H102', 3.5, 'red'),
		('line', 'M40 64 L44 76 M54 64 L58 76 M68 64 L72 76 M82 64 L86 76', 3, 'blue')],
	'lighthouse': [('fill', 'M26 122 V92 H102 V122 Z', 'm'), ('fill', 'M38 92 V58 H90 V92 Z', 'm'),
		('fill', 'M48 58 V36 H80 V58 Z', 'm'), ('fill', 'M64 2 C76 12 78 26 64 36 C50 26 52 12 64 2 Z', 'orange'),
		('fill', 'M59 68 H69 V82 H59 Z M59 100 H69 V114 H59 Z', 'd')],
	'mask': [('fill', 'M18 118 C16 80 20 50 32 32 C40 18 52 10 64 10 C76 10 88 18 96 32 C108 50 112 80 110 118 H84 L82 84 H46 L44 118 Z', 'blue'),
		('line', 'M26 60 H42 M26 76 H42 M86 60 H102 M86 76 H102 M24 94 H42 M86 94 H104', 4, 'gold'),
		('fill', 'M44 38 C44 28 84 28 84 38 V76 C84 92 76 100 64 100 C52 100 44 92 44 76 Z', 'm'),
		('fill', 'M58 100 H70 V120 H58 Z', 'blue'),
		('line', 'M50 56 H60 M68 56 H78', 4, 'ink'), ('line', 'M64 12 V30', 5, 'gold')],
	'mummy': [('fill', 'M64 6 C82 6 90 22 88 40 C86 52 92 62 92 80 C92 100 82 118 64 122 C46 118 36 100 36 80 C36 62 42 52 40 40 C38 22 46 6 64 6 Z', 'm'),
		('line', 'M44 42 L84 54 M42 60 L88 72 M40 78 L90 88 M42 96 L86 104 M84 42 L44 54 M88 60 L42 72', 2.5, 'd'),
		('fill', 'M52 18 C52 12 76 12 76 18 V32 C76 38 52 38 52 32 Z', 'l')],
	'myrrh': [('fill', 'M40 84 C24 80 22 60 34 52 C30 36 44 24 58 30 C66 18 86 22 88 36 C104 38 108 58 96 66 C104 78 92 90 80 84 Z', 'm'),
		('line', 'M50 58 C54 62 60 62 64 58 M70 46 C74 50 80 50 84 46 M66 72 C70 76 76 76 80 72', 3, 'd'),
		('fill', 'M28 84 H100 L92 120 H36 Z', 'brown'),
		('line', 'M40 96 H90 M42 108 H88 M54 84 L50 120 M74 84 L78 120', 2.5, 'black')],
	'obelisk': [('fill', 'M34 110 H94 V122 H34 Z', 'd'), ('fill', 'M52 26 H76 L82 112 H46 Z', 'm'),
		('fill', 'M52 26 L64 4 L76 26 Z', 'gold'), ('line', 'M64 40 V52 M60 62 H68 M64 72 V84 M60 94 H68', 3, 'd')],
	'palm': [('line', 'M64 48 C60 80 62 100 64 122', 10, 'brown'),
		('fill', 'M64 46 C44 30 22 34 6 52 C28 42 44 44 64 52 Z M64 46 C84 30 106 34 122 52 C100 42 84 44 64 52 Z M64 46 C54 24 38 14 20 16 C40 24 52 34 64 52 Z M64 46 C74 24 90 14 108 16 C88 24 76 34 64 52 Z', 'm'),
		('fill', circle(57, 58, 5.5) + ' ' + circle(71, 58, 5.5), 'orange')],
	'pomegranate': [('fill', 'M48 30 L52 8 L59 22 L64 4 L69 22 L76 8 L80 30 Z', 'd'),
		('fill', circle(64, 72, 46), 'm'),
		('fill', 'M86 74 C96 82 96 100 86 108 C80 98 80 84 86 74 Z', 'cream'),
		('fill', circle(46, 56, 8), 'l')],
	'ram': [('fill', 'M40 28 C56 20 80 24 92 42 L114 80 C118 90 112 98 102 96 L86 92 C78 104 66 112 54 108 C42 104 36 90 38 76 C34 60 32 40 40 28 Z', 'm'),
		('line', 'M54 46 C38 38 20 48 22 66 C24 82 42 88 52 78 C60 70 56 58 46 58 C38 58 38 68 44 70', 8, 'gold'),
		('fill', circle(76, 52, 3.5), 'ink')],
	'sara': [('fill', circle(98, 26, 16), 'red'), ('line', 'M58 96 V120 M70 96 V120', 4, 'orange'),
		('fill', 'M108 80 C104 64 84 58 64 62 L38 66 C32 54 32 40 26 34 C20 30 12 34 14 42 L4 46 L16 50 C24 60 24 74 28 86 C38 100 68 102 88 96 C100 92 106 88 108 80 Z', 'm'),
		('fill', 'M94 72 C76 66 54 70 36 80 C52 92 76 92 94 84 Z', 'brown'), ('fill', circle(22, 40, 2.5), 'ink')],
	'scroll': [('fill', 'M28 24 H100 V104 H28 Z', 'l'),
		('line', 'M40 42 H88 M40 56 H88 M40 70 H88 M40 84 H78', 3, 'ink'),
		('fill', 'M12 16 H32 V112 H12 Z M96 16 H116 V112 H96 Z', 'd')],
	'sekhmet': [('fill', circle(62, 20, 15), 'red'),
		('fill', 'M40 120 C34 98 30 72 36 52 C42 36 58 28 74 32 C86 34 96 42 100 52 L114 60 C120 64 118 72 110 74 L102 78 C100 86 94 90 86 90 L80 120 Z', 'm'),
		('fill', 'M40 120 C34 98 30 72 36 52 C42 60 52 72 58 88 C62 102 64 112 62 120 Z', 'd'),
		('fill', 'M60 36 L66 22 L76 34 Z', 'd'), ('fill', circle(84, 52, 3.5), 'ink')],
	'shabti': [('fill', 'M64 6 C78 6 86 16 86 30 C86 40 82 44 84 56 C88 76 92 96 88 122 H40 C36 96 40 76 44 56 C46 44 42 40 42 30 C42 16 50 6 64 6 Z', 'm'),
		('fill', 'M42 30 C42 16 50 6 64 6 C78 6 86 16 86 30 V58 H78 V32 H50 V58 H42 Z', 'd'),
		('fill', 'M50 32 H78 V46 C78 54 72 58 64 58 C56 58 50 54 50 46 Z', 'l'),
		('line', 'M48 72 L80 86 M80 72 L48 86', 4, 'd'), ('line', 'M64 94 V116', 3, 'd')],
	'sistrum': [('line', 'M64 76 V122', 9, 'd'),
		('fill', 'M40 62 C36 30 46 6 64 6 C82 6 92 30 88 62 H78 C80 34 74 18 64 18 C54 18 48 34 50 62 Z', 'm'),
		('line', 'M44 30 H84 M42 44 H86', 3.5, 'd'),
		('fill', 'M48 60 C48 52 80 52 80 60 V72 C80 82 72 88 64 88 C56 88 48 82 48 72 Z', 'l'),
		('fill', circle(58, 68, 2.5) + ' ' + circle(70, 68, 2.5), 'ink')],
	'star': [('fill', circle(64, 64, 54), 'm'), ('fill', star(64, 67, 38, 16), 'gold')],
	'throne': [('fill', 'M70 6 H102 V110 H70 Z', 'm'), ('fill', 'M22 68 H102 V110 H22 Z', 'm'),
		('fill', 'M28 76 H94 V104 H28 Z', 'blue'),
		('line', 'M28 90 H94 M44 76 V104 M60 76 V104 M76 76 V104', 2.5, 'gold'),
		('fill', 'M24 110 H38 V122 H24 Z M86 110 H100 V122 H86 Z', 'd')],
	'torch': [('fill', 'M56 56 H72 L68 122 H60 Z', 'brown'), ('fill', 'M44 46 H84 L76 62 H52 Z', 'd'),
		('fill', 'M64 2 C80 16 88 30 80 44 C76 50 70 50 64 48 C58 50 52 50 48 44 C40 30 48 16 64 2 Z', 'm'),
		('fill', 'M64 20 C72 28 74 36 68 46 H60 C54 36 56 28 64 20 Z', 'gold')],
	'tyet': [('fill', 'M64 4 A19 21 0 1 1 64 46 A19 21 0 1 1 64 4 Z M64 15 A8 11 0 1 0 64 37 A8 11 0 1 0 64 15 Z', 'm'),
		('fill', 'M28 58 C38 50 50 46 64 46 C78 46 90 50 100 58 L96 68 C88 62 82 62 76 64 L84 122 H44 L52 64 C46 62 40 62 32 68 Z', 'm'),
		('line', 'M64 66 V116', 3, 'd')],
	'uraeus': [('fill', 'M56 18 C68 6 88 10 92 28 C96 44 90 60 84 72 C80 80 84 90 96 94 C112 100 120 110 112 120 H44 C28 120 24 106 36 100 C48 94 62 96 66 86 C70 76 62 66 56 58 C46 46 46 28 56 18 Z', 'm'),
		('fill', 'M68 30 C76 24 86 28 86 38 C86 50 80 60 76 66 C70 56 64 44 68 30 Z', 'blue'),
		('fill', circle(62, 26, 3.5), 'ink')],
	'vulture': [('fill', 'M52 50 C34 40 14 42 2 60 C18 72 36 74 52 70 Z M76 50 C94 40 114 42 126 60 C110 72 92 74 76 70 Z', 'm'),
		('line', 'M14 60 L40 60 M18 66 L44 66 M114 60 L88 60 M110 66 L84 66', 3, 'teal2'),
		('fill', 'M54 96 L64 120 L74 96 Z', 'd'),
		('fill', 'M52 42 C52 32 76 32 76 42 V96 C76 104 52 104 52 96 Z', 'm'),
		('fill', circle(64, 28, 11), 'm'), ('fill', 'M72 24 L84 30 L72 34 Z', 'orange'),
		('line', 'M58 104 V114 M70 104 V114', 4, 'gold')],
})
