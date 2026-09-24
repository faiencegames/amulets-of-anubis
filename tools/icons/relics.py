"""Draws the relic icons, into images/icons/relics/<name>.svg (32 by 32).

Run: python3 tools/icons/relics.py            (all of them)
     python3 tools/icons/relics.py lamp senet  (only these)

The style: gold with the shared
"relicGold" gradient, a dark outline #3b2406 of about 1.3, at most one accent
colour, museum pieces drawn plainly and bold enough to read at 28 pixels.
"""
import math, os, sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'images', 'icons', 'relics')
G = 'url(#relicGold)'
D = '#3b2406'
LAPIS, CARN, TURQ, GREEN, WHITE, WATER = '#2f6fc0', '#b83a22', '#38a8a0', '#3c9a4a', '#fffdf6', '#4a9ad8'
ICONS = {}


def icon(comment):
	def wrap(fn):
		ICONS[fn.__name__] = (comment, fn)
		return fn
	return wrap


def p(d, fill=G, stroke=D, w=1.3, extra=''):
	return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"{extra}/>'


def line(d, stroke=D, w=1.3, extra=''):
	return f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"{extra}/>'


def circle(cx, cy, r, fill=G, stroke=D, w=1.3):
	return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{w}"/>'


def svg(name, comment, body):
	return (f'<!-- Relic icon ({name}): {comment} 32 by 32. "relicGold" is the shared gold gradient. Drawn by tools/icons/relics.py. -->\n'
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">\n<defs>\n'
		'<linearGradient id="relicGold" x1="0" y1="0" x2="1" y2="1">\n'
		'<stop offset="0" stop-color="#fff3ae"/>\n<stop offset=".55" stop-color="#e0ac3a"/>\n<stop offset="1" stop-color="#8a5a10"/>\n'
		'</linearGradient>\n</defs>\n' + body + '\n</svg>\n')


# ---- writing and measuring ------------------------------------------------------

@icon('the scribe\'s palette: a long board with cakes of black and red ink and a slot of reed pens.')
def first():
	return (p('M9 3.5 H23 C24 3.5 24.5 4 24.5 5 V27 C24.5 28 24 28.5 23 28.5 H9 C8 28.5 7.5 28 7.5 27 V5 C7.5 4 8 3.5 9 3.5 Z')
		+ circle(13, 8, 2.4, '#1a1410') + circle(19, 8, 2.4, CARN)
		+ p('M14 13 H18 V26 H14 Z', '#8a5a10', D, 1.1)
		+ line('M15.3 14 V25 M16.7 14 V25', '#fff3ae', 0.9))


@icon('the scribe\'s catalogue: a roll of papyrus opened between its rolled ends, in black ink with red headings.')
def catalogue():
	return (p('M8 7 H24 V25 H8 Z', '#f6e6b8')
		+ line('M10.5 10 H21.5', CARN, 1.4) + line('M10.5 13.5 H21.5 M10.5 16.5 H19 M10.5 19.5 H21.5 M10.5 22.5 H17', '#1a1410', 1.2)
		+ p('M4 7 C4 5.5 8 5.5 8 7 V25 C8 26.5 4 26.5 4 25 Z') + p('M24 7 C24 5.5 28 5.5 28 7 V25 C28 26.5 24 26.5 24 25 Z'))


@icon('the mathematical papyrus: a sheet of sums and a triangle worked out, like the Rhind papyrus.')
def papyrus():
	return (p('M5 6 H27 V26 H5 Z', '#f6e6b8')
		+ p('M8 21 L14 11 L20 21 Z', 'none', '#1a1410', 1.1)
		+ line('M11 16 H17 M9.8 18.5 H18.2', '#1a1410', 0.8)
		+ line('M8 23.5 H20', CARN, 1.2)
		+ line('M22.5 10 H26 M22.5 13 H25 M22.5 16 H26 M22.5 19 H24.5 M22.5 22 H26', '#1a1410', 1.2)
		+ line('M22.5 10 H24', CARN, 1.2)
		+ line('M5 6 H27 M5 26 H27', D, 1.8))


@icon('the surveyor\'s cord: a coil of knotted rope for measuring fields after the flood, and two stakes.')
def cord():
	coil = ''.join(f'<ellipse cx="16" cy="17" rx="{r}" ry="{r * 0.72:.1f}" fill="none" stroke="{D}" stroke-width="3.6"/><ellipse cx="16" cy="17" rx="{r}" ry="{r * 0.72:.1f}" fill="none" stroke="{G}" stroke-width="2"/>' for r in (10, 6.6))
	knots = ''.join(circle(x, y, 1.4, CARN, D, 0.9) for x, y in ((6, 17), (26, 17), (16, 9.8), (16, 24.2)))
	return (line('M4 26 L7 30 M28 26 L25 30', D, 2.2) + coil + knots)


@icon('the mason\'s plumb: an A-frame level, its plumb line and bob hanging to the mark on the cross-bar.')
def stars():
	return (p('M16 3 L27 28 H23.5 L16 10 L8.5 28 H5 Z')
		+ p('M9 20 H23 V22.5 H9 Z')
		+ circle(16, 4.5, 1.6)
		+ line('M16 5 V17', D, 1)
		+ p('M16 16.5 L18 19 L16 21.5 L14 19 Z', CARN, D, 1))


@icon('the mason\'s chisel and a wooden mallet, the tools that dressed every temple stone.')
def chiselwork():
	return (p('M5 27 L17 15 L19.5 17.5 L7.5 29.5 Z', '#c07a3a')
		+ p('M17 15 L24 8 L26.5 10.5 L19.5 17.5 Z')
		+ p('M24 8 L27 5 L28.5 6.5 L26.5 10.5 Z', '#fff3ae')
		+ p('M4 12 C2 8 5 4 9 4 C12 4 14 6 13.5 9 L10.5 12 C8.5 13.5 5.5 14 4 12 Z', '#b8783a')
		+ line('M11 11 L16 16', D, 2.4))


@icon('the deben weight: a polished stone weight for weighing copper and gold, with a band and ring of gold.')
def deben():
	return (p('M6 24 C6 14 10 8 16 8 C22 8 26 14 26 24 C26 26.5 24 28 16 28 C8 28 6 26.5 6 24 Z', '#4a4a58')
		+ p('M7 21 H25 V24 H7 Z')
		+ p('M13 8 C13 3 19 3 19 8', 'none', D, 3.2) + line('M13 8 C13 3 19 3 19 8', '#e0ac3a', 1.6)
		+ line('M11 14 C12 11.5 14 10.5 16 10.5', '#fff', 1.2, ' opacity=".5"'))


@icon('the nilometer: steps going down into the river, with the marks that measured the height of the flood.')
def nilometer():
	return (p('M4 6 H10 V11 H15 V16 H20 V21 H25 V27 H4 Z')
		+ p('M4 22 H28 V28 H4 Z', WATER, D, 1.1)
		+ line('M6 24.5 H9 M13 25 H17 M21 24.5 H25', '#dff0fa', 1)
		+ p('M26 3 H28.5 V22 H26 Z', '#fff3ae', D, 1)
		+ line('M26 6 H27.5 M26 9 H28 M26 12 H27.5 M26 15 H28 M26 18 H27.5', D, 0.9))


@icon('the water clock of Karnak: a vessel that emptied slowly through a hole near its foot; the fall of the water inside told the hours.')
def clepsydra():
	return (p('M5 5 H27 L23 25 H9 Z')
		+ p('M5 5 H27 V7.5 H5 Z', '#fff3ae')
		+ line('M9.5 10 V21 M13 10 V22 M16.5 10 V22 M20 10 V21', D, 0.9, ' stroke-dasharray="1.2 1.8"')
		+ line('M11 25 L10 28 M22 25 L23 28', D, 1.6)
		+ p('M22.5 20 C24.5 20 25 21 25 22', 'none', WATER, 1.4)
		+ p('M25 23.5 C25 23.5 26.4 25.5 26.4 26.4 A1.4 1.4 0 0 1 23.6 26.4 C23.6 25.5 25 23.5 25 23.5 Z', WATER, D, 0.8))


# ---- rule and royalty ------------------------------------------------------------

@icon('the crook and flail, crossed, as Osiris and the kings held them.')
def pharaoh():
	crook = 'M9 29 L21 7 C22.5 4 26 4 27 6.5 C28 9 26 10.5 24.5 9.5'
	return (line(crook, D, 4.2) + line(crook, LAPIS, 2.4) + line(crook, G, 2.4, ' stroke-dasharray="2 2"')
		+ line('M24 29 L9 7', D, 4.2) + line('M24 29 L9 7', G, 2.2)
		+ line('M9 7 L4 3 M9 7 L3 7.5 M9 7 L6.5 2', D, 3) + line('M9 7 L4 3 M9 7 L3 7.5 M9 7 L6.5 2', CARN, 1.6, ' stroke-dasharray="1.6 0.8"'))


@icon('the blue crown, the khepresh, covered in small gold discs, with the cobra at the brow.')
def crown():
	shape = 'M7 27 V15 C7 10 10 6.5 14 4.5 C18 3 23 2.5 27 3 C28.5 7 28.5 13 27 17.5 C26 20.5 24.5 22.5 24.5 27 Z'
	dots = ''.join(f'<circle cx="{x + (y // 4 % 2) * 2}" cy="{y}" r=".75" fill="#f5d04e"/>' for y in range(8, 23, 4) for x in range(10, 27, 4))
	return (p(shape, LAPIS) + f'<clipPath id="rcr"><path d="{shape}"/></clipPath><g clip-path="url(#rcr)">{dots}</g>'
		+ p('M7 23 H24.5 V27 H7 Z')
		+ p('M7.5 22.5 C4.5 21 4 17 5.5 14.5 C6.5 13 8 13.5 8.5 14.5 C8.5 17 8 19.5 9 21.5 Z', G, D, 1))


@icon('the royal seal: a gold stamp seal with a loop to hang it by, its face cut with the ankh.')
def trials():
	return (p('M12 3.5 C12 1.5 20 1.5 20 3.5 V6 H12 Z', 'none', D, 1.8)
		+ p('M11 6 H21 L23 12 H9 Z')
		+ p('M16 12 C24 12 28 16 28 21 C28 26 23 29.5 16 29.5 C9 29.5 4 26 4 21 C4 16 8 12 16 12 Z')
		+ p('M16 15.5 C14 15.5 13.5 18 16 19.8 C18.5 18 18 15.5 16 15.5 Z M12.5 20.5 H19.5 M16 19.8 V26.5', 'none', CARN, 1.8))


@icon('the sealer\'s signet: a gold ring whose bezel is a scarab of lapis lazuli, to press into clay.')
def signet():
	return (p('M16 12 C24 12 28 17 28 22 C28 27 23 30 16 30 C9 30 4 27 4 22 C4 17 8 12 16 12 Z M16 16 C11 16 8 18.5 8 22 C8 25.5 11 26.5 16 26.5 C21 26.5 24 25.5 24 22 C24 18.5 21 16 16 16 Z', G, D, 1.3, ' fill-rule="evenodd"')
		+ p('M9 13 H23 V9 H9 Z')
		+ p('M16 1.5 C20.5 1.5 22.5 4 22.5 6.5 C22.5 9.5 20 11 16 11 C12 11 9.5 9.5 9.5 6.5 C9.5 4 11.5 1.5 16 1.5 Z', LAPIS)
		+ line('M16 3 V10 M11 6 H21', '#9fb8ff', 0.8))


@icon('the golden shrine: gilded wood, a cornice curving out at the top, a row of cobras above it, and double doors.')
def shrine():
	cobras = ''.join(p(f'M{x} 6 C{x} 3.5 {x + 2.4} 3.5 {x + 2.4} 6 Z', G, D, 0.8) for x in range(6, 25, 3))
	return (cobras
		+ p('M4 6 H28 L26.5 10 H5.5 Z')
		+ p('M6 10 H26 V27 H6 Z')
		+ p('M9.5 13 H15.3 V27 H9.5 Z M16.7 13 H22.5 V27 H16.7 Z', G, D, 1.1)
		+ line('M11 16 H14 M11 19 H14 M18 16 H21 M18 19 H21', LAPIS, 1.2)
		+ circle(14.2, 22, 0.8, D, D, 0.4) + circle(17.8, 22, 0.8, D, D, 0.4)
		+ line('M4 28 H28', D, 2.2))


@icon('the treasury chest: a chest like those found in royal tombs, with a curved lid, a band of blue inlay and short legs.')
def treasury():
	return (p('M3.5 13 C3.5 8 9.5 5.5 16 5.5 C22.5 5.5 28.5 8 28.5 13 Z')
		+ p('M4.5 13 H27.5 V25 H4.5 Z')
		+ p('M4.5 16.5 H27.5 V19 H4.5 Z', LAPIS, D, 1)
		+ line('M6.5 25 V28.5 M25.5 25 V28.5', D, 2.2)
		+ circle(16, 22, 1.4, D, D, 0.5) + circle(16, 9.5, 1.2, D, D, 0.5))


@icon('the pyramidion: the gilded capstone of a pyramid, with the winged sun carved on its face.')
def pyramidion():
	return (p('M16 5 L29 27 H3 Z')
		+ p('M16 5 L29 27 H19 Z', '#b07a1c', D, 1.1)
		+ p('M12.5 19 C12.5 17 15.5 17 15.5 19 C15.5 21 12.5 21 12.5 19 Z', CARN, D, 0.9)
		+ line('M9.5 19 C10.5 18 11.5 18 12.5 19 M15.5 19 C16.5 18 17.5 18 18.5 19', D, 1.1)
		+ line('M13 3 L16 1 L19 3', '#fff3ae', 1.2))


@icon('the golden flies of valour, the gold a king gave for courage in battle, like those of Queen Ahhotep.')
def flies():
	def fly(x, y, s):
		return (f'<g transform="translate({x} {y}) scale({s})">'
			+ p('M0 -9 C2 -9 3 -7.5 3 -6 L6 8 C6 10 4 11 2 10 L0 6 L-2 10 C-4 11 -6 10 -6 8 L-3 -6 C-3 -7.5 -2 -9 0 -9 Z')
			+ circle(0, -7, 1.8)
			+ line('M0 -4 V5', D, 0.8) + '</g>')
	return (line('M4 4 C10 1 22 1 28 4', D, 1.3) + line('M8 3 V6 M16 2 V5 M24 3 V6', D, 1)
		+ fly(8, 17, 0.95) + fly(16, 19, 1.05) + fly(24, 17, 0.95))


@icon('the menat: a necklace of many strings of beads with a heavy counterpoise that hung down the back, shaken in Hathor\'s worship.')
def menat():
	beads = ''.join(circle(16 + 10 * math.cos(a), 11 + 8 * math.sin(a) * -1, 1.3, TURQ if i % 2 else G, D, 0.7) for i, a in enumerate([math.pi * (0.05 + j * 0.1) for j in range(10)]))
	return (beads
		+ p('M14 12 H18 V17 H14 Z')
		+ p('M13 17 H19 L20 21 H12 Z')
		+ circle(16, 25, 4.8)
		+ circle(16, 25, 2, CARN, D, 0.9))


@icon('the broad collar of Anubis: rows of gold, turquoise and lapis beads, with drop beads along its edge.')
def jackal():
	def arc(r):
		return f'M{16 - r} 8 A{r} {r} 0 0 0 {16 + r} 8'
	drops = ''.join(f'<path transform="translate({16 - 13.5 * math.cos(a):.1f} {8 + 13.5 * math.sin(a):.1f}) rotate({90 - math.degrees(a):.0f})" d="M-1.4 0 C-1.4 2 -0.5 3.4 0 3.8 C0.5 3.4 1.4 2 1.4 0 Z" fill="{CARN}" stroke="{D}" stroke-width=".7"/>' for a in [math.pi * (i + 0.5) / 11 for i in range(11)])
	return (drops
		+ p(f'M2.5 8 A13.5 13.5 0 0 0 29.5 8 H22 A6 6 0 0 1 10 8 Z')
		+ line(arc(8.2), TURQ, 1.8) + line(arc(10.4), LAPIS, 1.6) + line(arc(12.4), TURQ, 1.4)
		+ p('M1.5 5 H8.5 V9 H1.5 Z M23.5 5 H30.5 V9 H23.5 Z', G, D, 1.1))


@icon('the sistrum of Hathor: her face with cow\'s ears on the handle, a loop of metal above crossed by rattling rods.')
def sistrum():
	return (p('M10 14 V8 C10 4.5 12.5 2.5 16 2.5 C19.5 2.5 22 4.5 22 8 V14 H19.5 V8 C19.5 6 18 5 16 5 C14 5 12.5 6 12.5 8 V14 Z')
		+ line('M8 7 H24 M8 10.5 H24', D, 1.6)
		+ p('M11 14 H21 V19 C21 21.5 19 23 16 23 C13 23 11 21.5 11 19 Z')
		+ p('M11 15 C8.5 14 7 15 7 16.5 C8.5 17.5 10 17.5 11 17 Z M21 15 C23.5 14 25 15 25 16.5 C23.5 17.5 22 17.5 21 17 Z', G, D, 1)
		+ line('M13.5 18 H14.5 M17.5 18 H18.5', D, 1.2)
		+ p('M14.5 23 H17.5 V30 H14.5 Z', LAPIS, D, 1.1))


@icon('the djed pillar, the backbone of Osiris and a sign of stability, gold banded with lapis.')
def djed():
	return (p('M12 9 H20 V29 H12 Z')
		+ ''.join(p(f'M7 {y} H25 V{y + 2.6} H7 Z', G, D, 1.1) for y in (3, 7, 11, 15))
		+ line('M7 5.6 H25 M7 9.6 H25', LAPIS, 1.1)
		+ line('M12 20 H20 M12 24 H20', LAPIS, 1.6)
		+ line('M10 29.5 H22', D, 2))


@icon('the canopic jar of Imsety, one of the four sons of Horus: a calcite jar with a human-headed lid.')
def canopic():
	return (p('M7 16 C5 21 6 27 10 29 C12 30 20 30 22 29 C26 27 27 21 25 16 Z', WHITE)
		+ p('M15 19 H17 V27 H15 Z', LAPIS, D, 0.8)
		+ p('M6 14.5 H26 V17 H6 Z')
		+ p('M9 15 C8.5 10 10 6 12.5 4.5 H19.5 C22 6 23.5 10 23 15 Z', LAPIS)
		+ p('M12 7.5 C12 5 13.8 3.5 16 3.5 C18.2 3.5 20 5 20 7.5 V11 C20 13 18.2 14.5 16 14.5 C13.8 14.5 12 13 12 11 Z', '#e8c090', D, 1.1)
		+ line('M14 8.5 H15 M17 8.5 H18', D, 1))


@icon('a shabti, a small figure of blue faience that would work in the next world in its owner\'s place.')
def shabti():
	return (p('M11.5 8 C11.5 4.5 13.5 2.5 16 2.5 C18.5 2.5 20.5 4.5 20.5 8 C21.5 10 22 12.5 21.5 15 C21.5 20 20.5 25 19.5 28 C19 29.5 17.5 30 16 30 C14.5 30 13 29.5 12.5 28 C11.5 25 10.5 20 10.5 15 C10 12.5 10.5 10 11.5 8 Z', '#4aa8d0')
		+ p('M11.5 8 C11.5 4.5 13.5 2.5 16 2.5 C18.5 2.5 20.5 4.5 20.5 8 L21 13 H18.5 L18 7 H14 L13.5 13 H11 Z', '#10283a', D, 0.8)
		+ line('M12 16 L20 13 M20 16 L12 13', '#10283a', 1.3)
		+ line('M14 19.5 H18 M14 22 H18 M14.5 24.5 H17.5', '#10283a', 1))


@icon('the heart scarab, carved in green stone and set in gold, laid over the heart of the dead.')
def heart():
	return (p('M4 26 H28 V29.5 H4 Z')
		+ p('M16 4 C23 4 27 9 27 16 C27 22 22 26 16 26 C10 26 5 22 5 16 C5 9 9 4 16 4 Z', '#2e6a42')
		+ p('M11 9 C11 5.5 21 5.5 21 9 C21 11 11 11 11 9 Z', '#4a8a5a', D, 1)
		+ line('M16 11 V25 M9 12.5 C12 11 20 11 23 12.5', D, 1.1)
		+ line('M8 18 C8 14 10 12.5 12 12.5', '#fff', 1, ' opacity=".4"'))


@icon('the ivory wand: a curved blade of hippopotamus tusk carved with protective creatures, laid by mothers and newborns.')
def wand():
	blade = 'M3 18 C8 8 24 8 29 18 L27 20.5 C22 13 10 13 5 20.5 Z'
	return (p(blade, '#f4ead0')
		+ p('M3 18 L1.5 21 L5 20.5 Z M29 18 L30.5 21 L27 20.5 Z')
		+ line('M9 14.5 C10 13 11.5 13 12 14.5 M15 12.5 V14.5 M16.5 12.5 V14.5 M20 13.5 C21 12.5 22.5 13 23 14.5', D, 1)
		+ circle(15.8, 11.5, 0.9, CARN, D, 0.5))


# ---- the river and the sky ----------------------------------------------------------

@icon('the disk of Ra: the sun\'s disc of carnelian set in gold, with short rays around it.')
def suns():
	rays = ''.join(f'M{16 + 11 * math.cos(a):.1f} {16 + 11 * math.sin(a):.1f} L{16 + 14.5 * math.cos(a):.1f} {16 + 14.5 * math.sin(a):.1f} ' for a in [i * math.pi / 6 for i in range(12)])
	return (line(rays, D, 3) + line(rays, G, 1.6)
		+ circle(16, 16, 9.5)
		+ circle(16, 16, 6, CARN, D, 1.1)
		+ line('M13 13.5 C14 12.2 15.5 11.8 17 12', '#fff', 1, ' opacity=".5"'))


@icon('the sun disk of Sekhmet: the lioness Goddess\'s head in gold, with the red disc of the sun above it.')
def sekhmet():
	return (circle(16, 7.5, 6, CARN, D, 1.2)
		+ p('M8 30 C7 25 7 21 9 18 C7 15 8 11 12 10 C14 9.5 17 9.5 19 10.5 C21 11.5 23 13 24 14.5 L28 17 C29.5 18 29 20.5 27 20.5 L25 21 C23 22 21 22 20 21.5 C19 24 19 27 20 30 Z')
		+ p('M9 18 C7 15 8 11 12 10 C13 13 13 17 14 20 C14 23 15 25 17 26 C13 26 10 23 9 18 Z', '#c07a2a', D, 1)
		+ circle(20.5, 14.5, 1, D, D, 0.4)
		+ line('M24 18.5 C22.5 18 21 18.5 20.5 19.5', D, 1)
		+ line('M13 5 C14 3.5 15.5 3 17 3.2', '#fff', 1, ' opacity=".45"'))


@icon('the golden barque: a sacred boat with papyrus-flower ends, a shrine amidships and a steering oar.')
def journey():
	return (line('M24 14 L27.5 27', D, 2.2)
		+ p('M2 16 C6 22 11 24 16 24 C21 24 26 22 30 16 C28 23 22 27 16 27 C10 27 4 23 2 16 Z')
		+ p('M2 16 C1.5 12 3 9 5 8 C5.5 10.5 5 13.5 4 16 Z M30 16 C30.5 12 29 9 27 8 C26.5 10.5 27 13.5 28 16 Z')
		+ p('M11 23 V14 C11 12 21 12 21 14 V23 Z', LAPIS)
		+ p('M11 14 C11 12 21 12 21 14 V15.5 H11 Z'))


@icon('the boatman\'s oar: a long steering oar with a wide blade painted with the eye of Horus.')
def wanderer():
	return (line('M4 28 L20 12', D, 3.4) + line('M4 28 L20 12', '#c89048', 1.8)
		+ p('M18 14 L25 3.5 C27 2 29.5 4.5 28 6.5 L17.5 13.5 Z')
		+ p('M21.5 8.5 C22.5 7.5 24.5 6.5 25.5 7 C25 8 23 9.5 21.5 8.5 Z', WHITE, D, 0.8)
		+ circle(23.6, 7.8, 0.7, D, D, 0.3)
		+ line('M4 28 L6 30', D, 2))


@icon('falling waters: a jar tipped to pour a stream of water, the offering of cool water to the Gods.')
def cascade():
	return (p('M6 11 C4 8 6 4 10 4 C12 4 13.5 5 14 6.5 L17.5 8.5 L16 11 C17 15 15 18 11 18.5 C7.5 19 5 16 6 11 Z')
		+ p('M14 6.5 L19.5 5.5 L20.5 7.5 L17.5 8.5 Z')
		+ p('M19.5 6.5 C23 7.5 25 11 25 16 V26', 'none', WATER, 2.6)
		+ p('M19 27 C19 25.5 31 25.5 31 27 C31 28.8 19 28.8 19 27 Z', WATER, D, 1)
		+ line('M21 27 H29', '#dff0fa', 0.8))


@icon('the great flood: the river rising over the fields, wave upon wave, as it did each summer.')
def omega():
	def wave(y, fill):
		d = f'M2 {y + 6} C2 {y} 6 {y - 2} 9 {y + 1} C10 {y + 2.5} 9 {y + 4} 7.5 {y + 3.5} C9 {y + 7} 14 {y + 6} 16 {y + 2} C18 {y - 2} 24 {y - 3} 28 {y} C30 {y + 2} 30 {y + 5} 30 {y + 6} Z'
		return p(d, fill, D, 1.2)
	return (wave(4, '#9fd0f0') + wave(12, WATER) + wave(20, '#2f6fc0') + line('M2 30 H30', D, 1.6))


@icon('the cataract: rapids breaking white between the granite boulders of the river.')
def cataract():
	return (p('M2 22 C6 20 10 21 14 20 C18 19 22 21 30 20 V29 H2 Z', WATER, D, 1.1)
		+ p('M3 20 C3 15 6 12 10 12 C13 12 15 15 14 20 Z', '#6a5a60')
		+ p('M17 21 C16 16 19 12 23 12 C27 12 29 15 29 20 Z', '#7a6a70')
		+ p('M11 24 C11 21 14 20 16 21 C18 20 21 21 21 24 Z', '#5a4a50')
		+ line('M5 25 C7 24 9 26 11 25 M19 26 C21 25 23 27 25 26', '#fff', 1.4)
		+ line('M14 15 C15 17 15 19 14.5 20', '#fff', 1.4)
		+ line('M6 15 C7 14 8.5 13.5 10 14', '#fff', 1, ' opacity=".4"'))


@icon('the royal granary: domed silos of mud brick, filled from the top and emptied by a door at the foot.')
def granary():
	def silo(x, w, h):
		return (p(f'M{x} 28 V{28 - h + w / 2} C{x} {28 - h - w / 3} {x + w} {28 - h - w / 3} {x + w} {28 - h + w / 2} V28 Z')
			+ p(f'M{x + w / 2 - 1.8} 28 V{24.5} H{x + w / 2 + 1.8} V28 Z', D, D, 0.5))
	return (silo(2, 9, 16) + silo(11.5, 9, 20) + silo(21, 9, 16)
		+ line('M1 28.5 H31', D, 2)
		+ line('M14 10 L16 8 L18 10', '#fff3ae', 1.1))


@icon('the offering table: a mat with a loaf of bread on it, the sign hetep, with a jug and a lotus.')
def offering():
	return (p('M4 20 H28 V23 H4 Z')
		+ p('M8 23 H11 L10 29 H9 Z M21 23 H24 L23 29 H22 Z')
		+ p('M13.5 20 V9 C13.5 7 18.5 7 18.5 9 V20 Z', '#e8c080')
		+ p('M7 20 C6 16 7 13 9 12.5 C11 13 12 16 11 20 Z', CARN)
		+ p('M24 20 V14 M24 14 C22 12 22 9 24 8 C26 9 26 12 24 14', 'none', GREEN, 1.4)
		+ p('M22 20 H26', 'none', D, 1))


@icon('the senet board: thirty squares in three rows, with the spools and cones that were played on it.')
def senet():
	grid = ''.join(line(f'M{5 + i * 2.2:.1f} 11 V21', D, 0.7) for i in range(1, 10)) + line('M5 14.3 H27 M5 17.7 H27', D, 0.7)
	return (p('M3 9 H29 V23 H3 Z')
		+ p('M5 11 H27 V21 H5 Z', '#f0dcae', D, 0.9) + grid
		+ p('M9.5 14.3 V17.7 H11.7 V14.3 Z M18.3 11 V14.3 H20.5 V11 Z M24.9 17.7 V21 H27 V17.7 Z', LAPIS, D, 0.6)
		+ p('M6 7 L7.5 3 L9 7 Z M11 7 L12.5 3 L14 7 Z', G, D, 1)
		+ p('M19 7 V3.5 H22 V7 Z M24 7 V3.5 H27 V7 Z', CARN, D, 1)
		+ line('M4 23 V27 M28 23 V27', D, 2))


@icon('the workmen\'s lamp: a clay dish of oil with a wick and flame, as the tomb-builders of Deir el-Medina used.')
def lamp():
	return (p('M16 3.5 C13.5 7 13 9 13 10.5 A3 3 0 0 0 19 10.5 C19 9 18.5 7 16 3.5 Z', '#ffb13b', '#a84a10', 1)
		+ p('M16 7.5 C15 9 14.8 9.8 14.8 10.5 A1.2 1.2 0 0 0 17.2 10.5 C17.2 9.8 17 9 16 7.5 Z', '#fff3ae', 'none', 0)
		+ p('M3.5 19 C3.5 15.5 9 13.5 16 13.5 C23 13.5 28.5 15.5 28.5 19 C28.5 22.5 23 25 16 25 C9 25 3.5 22.5 3.5 19 Z', '#b8683a')
		+ p('M8 17.5 C8 16 12 15.3 16 15.3 C20 15.3 24 16 24 17.5 C24 19 20 19.7 16 19.7 C12 19.7 8 19 8 17.5 Z', '#5a2e10', D, 0.8)
		+ line('M16 13.5 V17', D, 1.2)
		+ p('M9 25 H23 L22 28 H10 Z', '#8a4a20'))


@icon('the tomb plan: a sheet with the plan of a royal tomb, its corridors and halls drawn in red and black, like the plan of Ramesses IV\'s tomb.')
def tombplan():
	return (p('M4 5 L27 3 L28.5 27 L5.5 29 Z', '#f6e6b8')
		+ p('M9 9 H13 V13 H16 V9 H22 V17 H18 V23 H11 V19 H9 Z', 'none', CARN, 1.3)
		+ line('M18 12 H20 M13 20 H16', '#1a1410', 1)
		+ p('M11 19 H18 V23 H11 Z', 'none', '#1a1410', 1)
		+ line('M24 22 L26 24', D, 1))


# ---- people and Gods ------------------------------------------------------------

@icon('the swift sandals: a pair of sandals of woven papyrus, with a strap between the toes and over the foot.')
def spare():
	def sandal(x, y, flip):
		s = f'<g transform="translate({x} {y}) scale({flip} 1)">'
		s += p('M0 -12 C3 -12 4.5 -9 4.5 -5 C4.5 0 3.5 4 3.5 8 C3.5 11 2 12.5 0 12.5 C-2 12.5 -3.5 11 -3.5 8 C-3.5 4 -4.5 0 -4.5 -5 C-4.5 -9 -3 -12 0 -12 Z', '#e8c888')
		s += line('M-3.5 -1 C-2 1 2 1 3.5 -1 M0 -9 V0', D, 1.2)
		s += line('M-3 5 H3 M-3 8 H3', '#b88a48', 0.8)
		return s + '</g>'
	return sandal(10, 15, 1) + sandal(22, 17, -1)


@icon('the face of Bes, the household God who guarded sleep and children: a lion\'s mane, tall plumes, His tongue out.')
def streak():
	return (p('M9 11 L10 2 L13 9 L16 1 L19 9 L22 2 L23 11 Z')
		+ p('M16 9 C9 9 4 13 4 19 C4 25 9 30 16 30 C23 30 28 25 28 19 C28 13 23 9 16 9 Z', '#b8641e')
		+ line('M4.6 16 L2.5 18 L4.4 20 L2.8 23 M27.4 16 L29.5 18 L27.6 20 L29.2 23', D, 1.2)
		+ p('M16 12 C11 12 8 15 8 19 C8 24 11 27 16 27 C21 27 24 24 24 19 C24 15 21 12 16 12 Z', G, D, 1.2)
		+ line('M11 17.5 H14 M18 17.5 H21', D, 1.6)
		+ line('M14.5 21 H17.5', D, 1.3)
		+ p('M14.8 23 H17.2 V26 C17.2 27 14.8 27 14.8 26 Z', CARN, D, 0.9))


@icon('the double chord: an arched harp, a curved neck rising from a sound box, strung between the two.')
def duet():
	return (p('M5 25 H22 C21 28.5 17 30 13 30 C9 30 6 28.5 5 25 Z')
		+ line('M20.5 25 C24 20 26 13 25 3.5', D, 4.2) + line('M20.5 25 C24 20 26 13 25 3.5', G, 2.2)
		+ line('M8 25 L24.6 7 M11 25 L25.2 11 M14 25 L25 15.5 M17 25 L24 20', LAPIS, 1)
		+ circle(25, 3.5, 1.8, CARN, D, 0.9))


names = sys.argv[1:] or list(ICONS)
for n in names:
	comment, fn = ICONS[n]
	with open(os.path.join(OUT, n + '.svg'), 'w') as f:
		f.write(svg(n, comment[0].upper() + comment[1:], fn()))
print('drew', len(names), 'relic icons')
