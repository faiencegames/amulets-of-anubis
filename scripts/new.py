#!/usr/bin/env python3
"""
Starts a new thing for the game from a ready-made, commented file.

	python scripts/new.py                    asks what you want to make
	python scripts/new.py stop siwa          makes content/stops/13-siwa.jsonc
	python scripts/new.py relic golden-ankh  makes content/relics/26-golden-ankh.jsonc

(On Windows you may need  py scripts\\new.py ... , or just double-click scripts\\new.bat.)

The new file works as it is: build straight away and it is in the game. Then
open it in a text editor, read the comments, and change what you like. Build
again, and double-click dist/try-it.html to try it (it opens the game in
try-out mode, right at the stop or river event you changed last).
"""
import os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # the project folder, one up from scripts/

# kind: (folder, what it is, template). {id} and {name} are filled in.
KINDS = {}
def kind(key, folder, what):
	def add(template):
		KINDS[key] = (folder, what, template)
		return template
	return add

kind('stop', 'stops', 'a new stop on the journey, with its own floor, scenery and music')("""\
// A stop on the journey. Everything here is explained in docs/content-reference.md
// ("stops"). The number at the front of the file name sets its place.
{
	"id": "{id}",                 // permanent: saves remember the stop by this
	"name": "{name}",
	"subtitle": "A short line under the name",

	// The codex note. Keep it accurate and plain: it is meant to teach.
	"history": "Write a short, true note about the place here.",

	"moves": 24,                  // the move budget; more moves is easier
	"amulets": ["ankh", "scarab", "eye", "lotus", "cat"],   // 4 to 6, all different
	// or several lists, and each start picks one at random:
	//   "amulets": [["ankh", "scarab", "eye", "lotus", "cat"], ["djed", "feather", "eye", "lotus"]],

	// The floor: . gap   0 already gilded   1 bare stone   2 thick stone
	"floor_plan": [
		"..1111..",
		".111111.",
		"11122111",
		"11222211",
		"11222211",
		"11122111",
		".111111.",
		"..1111.."
	],
	"shared_floor_shapes": ["diamond", "pools"],   // other plans it sometimes uses

	"stone_colour": "#b89a6a",
	"music": {"key": "E3", "scale": "phrygian", "instrument": "flute"},

	// Its pictures: the scenery behind everything is images/backdrops/{id}.svg,
	// and what shows through the gaps in the floor is images/boards/{id}.svg.
	// Copies of Saqqara's were made for you; draw over them, or swap in a .png
	// or .jpg with the same name.
	"frame_colours": ["#6a4524", "#2a1808", "#a07a44"],   // face, shade, edge

	// Where the dot sits on the Nile map: x 0-360, y 0-560 (north is at the top).
	"map_position": {"x": 60, "y": 300, "label": "right"},

	// Three seals: small challenges, stamped the first time a win here meets
	// them. Keep their order once people have played.
	"seals": [
		{"text": "Win without spending a boon", "when": {"win_without_boons": true}},
		{"text": "Make six special amulets", "when": {"win_specials_made": 6}},
		{"text": "Win with an omen braved", "when": {"win_with_omens": 1}}
	]
}
""")

kind('relic', 'relics', 'a relic for the museum, found by doing something')("""\
// A relic for the museum: found once, kept on every journey.
// The conditions you can use are listed in docs/content-reference.md.
{
	"id": "{id}",
	"name": "{name}",
	"description": "Win ten stops.",        // says how it is found
	"found_when": {"stops_won": 10},
	"reward": {"lapis": 10},                  // optional: gold, lapis and/or a boon

	// The icon: borrow one from images/icons/relics/ by its name, or draw your
	// own as images/icons/relics/{id}.svg (32 by 32) and delete this line.
	"icon": "wanderer"
}
""")

kind('event-puzzle', 'river-events', 'a river event with a small board to play')("""\
// Something that can happen on the river between two stops: a short puzzle.
{
	"id": "{id}",
	"kind": "puzzle",
	"title": "{name}",
	"text": "What happens, in a sentence or two.",

	// gild the floor, or {"type": "collect", "amulet": "fish", "count": 12},
	// or {"type": "score", "points": 3000}
	"goal": {"type": "gild"},
	"moves": 18,
	"amulet_types": 5,
	"floor_plan": [
		"........",
		".111111.",
		".111111.",
		".112211.",
		".112211.",
		".111111.",
		".111111.",
		"........"
	],
	"reward": {"gold": 50},
	"weight": 1          // 2 makes it come up twice as often as the others
}
""")

kind('chamber', 'chambers', 'a tomb, temple or oasis beside a stop')("""\
// A tomb, temple or oasis beside a stop: a small board, opened once that stop
// is gilded. Only one per stop.
{
	"id": "{id}",
	"at": "saqqara",       // the id of the stop it is beside
	"setting": "tomb",     // "tomb" (dim, torchlit, sand) or "oasis" (daylight, water)
	"name": "{name}",
	"text": "What the place is, in two or three sentences. Keep it true.",
	"scenery": "tomb",     // the picture behind the board: tomb, sanctuary, oasis, or your own
	"moves": 26,
	// . gap, 1 stone, 2 thick stone, 0 already gold; s is a stone with an
	// amulet buried in sand on it, S a thick stone with one (w and W: under
	// water, for an oasis). A covered amulet can't be moved: a match beside it
	// clears it. Every patch of sand or water must touch a square that starts clear.
	"floor_plan": [
		"........",
		"11111111",
		"1s1ss1s1",
		"11111111",
		"11111111",
		"1s1ss1s1",
		"11111111",
		"........"
	],
	"reward": {"lapis": 15}     // paid the first time it is explored
}
""")

kind('event-choice', 'river-events', 'a river event where the player makes a choice')("""\
// Something that can happen on the river between two stops: a choice.
{
	"id": "{id}",
	"kind": "choice",
	"title": "{name}",
	"text": "What happens, in a sentence or two.",
	"choices": [
		{"label": "Pay 40 gold for a boon", "cost": {"gold": 40}, "give": {"boon": "random"}},
		{"label": "Trust to the Gods", "gamble": true},
		{"label": "Sail on"}
	]
}
""")

kind('trial', 'trials', 'a trial a priest can set, with a boon as the prize')("""\
// A trial a priest can set at a stop. Finish it and the boon is the player's.
// Goals: clear_amulets, make_specials, cascade, gild_in_one_move,
// clear_in_one_move, moves_to_spare, make_suns, make_bands, crack_thick,
// gild_half_quickly, no_boons, combine_specials.
{
	"id": "{id}",
	"goal": "make_specials",
	"target": 5,
	"text": "Make five special amulets",
	"progress_label": "Specials made",
	"boon": "flood"
}
""")

kind('boon', 'boons', 'a boon: a held power the player spends')("""\
// A boon: a held power the player spends when they choose. Players keep
// boons by id, so don't change the id once people play. Its icon is
// images/icons/boons/<id>.svg; or name another icon there in "icon".
{
	"id": "{id}",
	// until you draw images/icons/boons/{id}.svg, it borrows this one
	"icon": "wisdom",
	"short": "Short",         // on its button (about 8 letters)
	"name": "{name}",
	// {n} in the description is the amount
	"description": "Grants {n} extra moves.",
	// what it does, one of the effects the game knows (* = the player picks
	// a square; "amount" changes the number, and has a default):
	//   "extra_moves"        n more moves (6)
	//   "gild_stones"        n stones, chosen at random, lose a layer (8)
	//   "thin_thick_stones"  every thick or cracked stone loses a layer
	//   "cord_row" *         every stone in the chosen row loses a layer
	//   "shatter_one" *      shatters one amulet and gilds the stone under it
	//   "shatter_square" *   shatters an n by n square (5; use an odd number)
	//   "make_banded" *      the amulet becomes a banded amulet
	//   "make_sun" *         the amulet becomes the winged sun
	//   "make_ringed"        n amulets become ringed amulets (3)
	//   "shuffle"            the amulets are shuffled, and n more moves (2)
	"effect": "extra_moves",
	"amount": 4,
	// shown on the board when it is used ({n} is the amount)
	"popup": "+{n} moves",
	// true: it can be the boon a "random" reward gives
	"random_reward": false
}
""")

kind('badge', 'badges', 'a badge an amulet can fall wearing, with a power')("""\
// A badge: a small mark an amulet can fall wearing; matching the amulet uses
// its power. Its picture is images/badges/<id>.svg (96 x 96, the badge a
// circle of radius 24 in the middle).
{
	"id": "{id}",
	"name": "{name}",
	// how it looks, shown after its name in How to play
	"looks": "what it looks like",
	// what it does, in How to play; {n} is the amount
	"text": "Gives you {n} extra moves.",
	// what it does when the amulet is cleared, one of the powers the game
	// knows; "amount" changes the number, and has a default:
	//   "gild_stones"      golden light gilds n bare stones anywhere (4)
	//   "gild_around"      gilds the stones in the nine squares around it
	//   "row_and_column"   clears the whole row and column it sits in
	//   "extra_moves"      n more moves (3)
	//   "give_lapis"       n lapis into the purse (3)
	//   "lose_moves"       n moves lost, never the last one (2)
	//   "ungild_stones"    n gilded stones turn bare again (3)
	"effect": "extra_moves",
	"amount": 2,
	// shown on the board when it fires ({n} is the amount)
	"popup": "+{n} moves",
	// true: a cursed badge, with a red ring; never on Relaxed or in river events
	"cursed": false,
	// how often it turns up when a badge falls: one with 10 comes ten times as
	// often as one with 1; 0 switches it off
	"weight": 3,
	// the glow round an amulet wearing it
	"colour": "#7ad08a"
}
""")

kind('curse', 'curses', 'a curse: what a failed trial costs at the next stop')("""\
// A curse: what failing a trial costs, or an unkind river, at the next stop
// only. The player sees it before accepting a trial, so the choice is informed.
{
	"id": "{id}",
	"name": "{name}",
	// what it does; {n} is the strength below. The game adds "at the next stop"
	// where it is needed, so leave that out.
	"text": "{n} fewer moves",
	// what it does, one of the hardships the game knows (the same list the
	// omens use); n is its strength below:
	//   "fewer_moves"          n fewer moves
	//   "fewer_moves_percent"  n percent fewer moves
	//   "thick_stones"         n bare stones start thick
	//   "thick_stones_share"   one bare stone in n starts thick
	//   "buried_amulets"       n amulets start buried in sand
	//   "fewer_badges"         badged amulets fall n percent less often (100: none)
	//   "more_cursed_badges"   cursed badges fall, n times as often
	//   "no_boons"             no boons can be used
	"effect": "fewer_moves",
	// how strong it is on each difficulty; 0 means it never falls there.
	// Keep Relaxed at 0: failing a trial on Relaxed costs nothing.
	"strength": {"Relaxed": 0, "Normal": 2, "Hard": 4, "Pharaoh": 6}
}
""")

kind('omen', 'omens', 'an omen: a hardship braved at a gilded stop, for more reward')("""\
// An omen: a hardship a player may choose to brave at a stop they have
// already gilded, for a richer reward (settings.jsonc, "omens"). It lasts for
// that stop and its restarts. Saves remember omens by id: don't change it.
{
	"id": "{id}",
	"name": "{name}",
	// what the player is told; {n} is the amount
	"text": "{n} fewer moves",
	// what it does, one of the hardships the game knows (the same list the
	// curses use); "amount" is its n:
	//   "fewer_moves"          n fewer moves
	//   "fewer_moves_percent"  n percent fewer moves
	//   "thick_stones"         n bare stones start thick
	//   "thick_stones_share"   one bare stone in n starts thick
	//   "buried_amulets"       n amulets start buried in sand
	//   "fewer_badges"         badged amulets fall n percent less often (100: none)
	//   "more_cursed_badges"   cursed badges fall, n times as often
	//   "no_boons"             no boons can be used (needs no amount)
	"effect": "fewer_moves",
	"amount": 3
}
""")

kind('stall', 'stall', "something to buy at Anubis's stall")("""\
// Something Anubis sells: bought for one stop, used once.
// "gives" is one of: {"moves": n}, {"reshuffle": true}, {"second_wind": n},
// or {"boon": ["flood"]} (a boon name, or "random").
// "icon" is its picture in images/icons/stall/ (breath, bread, sands, chest,
// wind, or a new SVG of your own); leave it out for a boon, which shows its own.
{
	"id": "{id}",
	"name": "{name}",
	"description": "Four extra moves, right now.",
	"icon": "breath",
	"currency": "gold",
	"price": 450,
	"gives": {"moves": 4}
}
""")

kind('upgrade', 'treasury', 'a lasting upgrade sold in the Treasury')("""\
// A lasting upgrade sold in the treasury. One price per level.
// Effects: extra_moves, badge_chance, trial_chance, win_gold, win_lapis.
{
	"id": "{id}",
	"name": "{name}",
	"description": "Five more gold for every stop you gild, for each level bought.",
	"currency": "gold",
	"prices": [400, 800, 1600],
	"effect": "win_gold",
	"amount_per_level": 5
}
""")

kind('floor-shape', 'floor-shapes', 'another floor plan that stops can use')("""\
// A shared floor plan. List its id under a stop's "shared_floor_shapes" to
// use it there. . gap   0 gilded   1 bare stone   2 thick stone
{
	"id": "{id}",
	"name": "{name}",
	"move_multiplier": 1.0,     // 1.1 gives 10% more moves, for a harder shape
	"floor_plan": [
		"11111111",
		"11111111",
		"11.11.11",
		"11111111",
		"11111111",
		"11.11.11",
		"11111111",
		"11111111"
	]
}
""")

kind('amulet', 'amulets', 'a brand-new amulet, with a picture to draw over')("""\
// A new amulet's name and codex text. Its picture is images/amulets/{id}.svg,
// a copy of the ankh to start from: draw over it, or put a square .png with a
// see-through background in its place. The picture fills its square as it is,
// so leave a little margin. Then put "{id}" in a stop's "amulets" to use it.
{
	"id": "{id}",
	"name": "{name}",
	"plural": "{name}s",
	"meaning": "What the symbol meant. Keep it accurate."
}
""")

kind('amulet-set', 'amulet-sets', 'a new look for the amulets (a recolouring)')("""\
// An amulet set: the same amulets, recoloured. Changes the look only.
// Keep it readable: shift the hue, don't make every amulet one colour.
{
	"id": "{id}",
	"name": "{name}",
	"description": "What it looks like, in a line.",
	"unlocked_by": {"stars": 20},
	"colour_changes": {"hue_shift": 30, "saturation": 1.2},
	"glow": "rgba(255,220,150,.5)"
}
""")

kind('floor-set', 'floor-sets', 'a new look for the stone floor')("""\
// A floor set: the stone under the amulets. Changes the look only.
// Its pictures are in images/floors/{id}/: bare.svg, thick.svg (cracked, so it
// reads as "needs two matches") and gilded-1.svg to gilded-4.svg, mixed on a
// golden floor. A copy of the marble floor was made for you; draw over it.
// Keep bare, thick and gilded easy to tell apart at a glance.
{
	"id": "{id}",
	"name": "{name}",
	"description": "What it looks like, in a line.",
	"unlocked_by": {"stops_won": 25}
}
""")

kind('frame', 'frames', 'a new board frame colour')("""\
// A board frame: the carved edge round the floor. Changes the look only.
{
	"id": "{id}",
	"name": "{name}",
	"description": "What it looks like, in a line.",
	"unlocked_by": {"stops_won": 15},
	"colours": {"face": "#7a3a60", "shade": "#2a1020", "edge": "#e8a8c8"}
}
""")

kind('sparkle', 'sparkles', 'new colours for the sparks that fly off a match')("""\
// Sparkle colours: the light that flies off a match. Two colours.
{
	"id": "{id}",
	"name": "{name}",
	"description": "What it looks like, in a line.",
	"unlocked_by": {"stars": 18},
	"colours": ["#ffb347", "#fff4e0"]
}
""")


def fail(msg):
	print(msg); sys.exit(1)

def menu():
	keys = list(KINDS)
	print('What would you like to make?\n')
	for i, k in enumerate(keys, 1): print(f'  {i:2}. {k:13} {KINDS[k][1]}')
	pick = input('\nType a number: ').strip()
	if not pick.isdigit() or not 1 <= int(pick) <= len(keys): fail('That is not one of the numbers.')
	k = keys[int(pick) - 1]
	ident = input(f'Give the {k} an id: lowercase letters, numbers and hyphens, like golden-barque: ').strip()
	return k, ident

def main():
	args = [a for a in sys.argv[1:] if not a.startswith('-')]
	if len(args) >= 2: k, ident = args[0].lower(), args[1]
	elif len(args) == 1: k, ident = args[0].lower(), input('Give it an id (lowercase, hyphens, like golden-barque): ').strip()
	else: k, ident = menu()
	if k not in KINDS: fail(f'I don\'t know "{k}". I can make: {", ".join(KINDS)}.')
	if not re.fullmatch(r'[a-z][a-z0-9-]*', ident or ''):
		fail(f'"{ident}" won\'t do as an id: use lowercase letters, numbers and hyphens, starting with a letter, like golden-barque.')
	folder, what, template = KINDS[k]
	d = os.path.join(HERE, 'content', folder)
	os.makedirs(d, exist_ok=True)
	for n in os.listdir(d):
		if n.endswith(('.json', '.jsonc')) and re.search(r'"id"\s*:\s*"' + re.escape(ident) + '"', open(os.path.join(d, n), encoding='utf-8').read()):
			fail(f'There is already one with the id "{ident}": content/{folder}/{n}. Pick another id.')
	nums = [int(m.group(1)) for n in os.listdir(d) for m in [re.match(r'(\d+)-', n)] if m]
	fname = f'{(max(nums) + 1 if nums else 1):02d}-{ident}.jsonc'
	name = ident.replace('-', ' ').capitalize()
	text = template.replace('{id}', ident).replace('{name}', name)
	with open(os.path.join(d, fname), 'w', encoding='utf-8') as f: f.write(text)
	# the pictures it needs, copied from an existing one to draw over
	import shutil
	pictures = {'stop': [('backdrops/saqqara.svg', f'backdrops/{ident}.svg'), ('boards/saqqara.svg', f'boards/{ident}.svg')],
				'amulet': [('amulets/ankh.svg', f'amulets/{ident}.svg')],
				'badge': [('badges/moves.svg', f'badges/{ident}.svg')],
				'floor-set': [('floors/marble', f'floors/{ident}')]}.get(k, [])
	for src, dst in pictures:
		src, dst = os.path.join(HERE, 'images', src), os.path.join(HERE, 'images', dst)
		if os.path.exists(dst) or not os.path.exists(src): continue
		(shutil.copytree if os.path.isdir(src) else shutil.copyfile)(src, dst)
		print(f'Copied a starting picture to images/{os.path.relpath(dst, os.path.join(HERE, "images"))}')
	print(f'\nMade content/{folder}/{fname}: {what}.')
	print('It works as it is. Next:')
	print(f'  1. Open it in a text editor and change it; the comments say what each line does.')
	if k == 'amulet': print(f'     Draw its picture over images/amulets/{ident}.svg, and add "{ident}" to a stop\'s "amulets".')
	if k in ('stop', 'floor-set'): print(f'     Draw over the pictures copied into images/ (see images/README.md).')
	if k == 'badge': print(f'     Draw its picture over images/badges/{ident}.svg.')
	if k == 'floor-shape': print(f'     Add "{ident}" to a stop\'s "shared_floor_shapes" to use it there.')
	print('  2. Build (build.bat, or python3 build.py), or leave scripts/watch running.')
	print('  3. Double-click dist/try-it.html to try it, with everything unlocked and your real save untouched.')

if __name__ == '__main__':
	main()
