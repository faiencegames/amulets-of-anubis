#!/usr/bin/env python3
"""
Builds the whole game into one file: dist/amulets-of-anubis.html

	python build.py          (on Windows you may need:  py build.py)
	python build.py --check  only check the content files; write nothing
	python build.py --watch  build again by itself whenever you save a file
							 (leave it running; press Ctrl+C to stop)

It also writes dist/try-it.html: double-click it to open the game in try-out
mode, with a separate save and everything unlocked, straight at the stop or
river event you changed last. (Your real save is never touched.)
To start a new thing from a ready-made file:  python scripts/new.py

It needs only Python 3, and the file it makes needs only a web browser.
Everything is put inside that one file: the code, the stylesheet (web/css/,
joined in file-name order), the fonts, the content
files in content/, and every picture in images/ (see images/README.md):

	images/amulets/<name>.svg        an amulet (.svg, .png, .jpg or .webp)
	images/backdrops/<stop>.svg      the scenery behind a stop, by its id (giza.svg)
	images/boards/<stop>.svg         what shows through the gaps of that stop's board
	images/floors/<set>/             a floor set: bare, thick and gilded squares
	images/specials/, images/badges/ the marks of special amulets, and badges
	images/icons/                    every icon (buttons, boons, relics, menu, map)
	images/relics/<relic>.png        a picture for a relic, instead of its icon

The content files (stops, relics, river events, trials, shops, looks...) are
checked before anything is written. If one has a mistake, the build stops and
says which file, which line and what to do; the last good game file is left
alone.

For the simulators in tools/:  python build.py --content-json  prints the
checked content, as the game sees it, and nothing else.
"""
import base64, difflib, json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))

# --watch: rebuild whenever a file in content/, images/, src/ or web/ changes.
# Each build runs as a fresh process, so a mistake in one never stops the next.
if '--watch' in sys.argv:
	def stamp():
		out = {}
		for d in ('content', 'images', 'src', 'web'):
			for root, _, files in os.walk(os.path.join(HERE, d)):
				for n in files:
					try: out[os.path.join(root, n)] = os.path.getmtime(os.path.join(root, n))
					except OSError: pass
		return out
	print('Watching content/, images/, src/ and web/. Save a file to rebuild; Ctrl+C to stop.\n')
	last = None
	try:
		while True:
			now = stamp()
			if now != last:
				if last is not None: print('\n--- ' + time.strftime('%H:%M:%S') + ' a file changed, building again ---')
				subprocess.call([sys.executable, os.path.join(HERE, 'build.py')])
				print('\nRefresh the game in your browser to see it.')
				last = now
			time.sleep(1)
	except KeyboardInterrupt:
		print('\nStopped watching.'); sys.exit(0)
def path(*p): return os.path.join(HERE, *p)
def read(*p):
	with open(path(*p), encoding='utf-8') as f: return f.read()
def rel(p): return os.path.relpath(p, HERE).replace(os.sep, '/')
# The running game is split into one file per part in src/game/, joined in
# file-name order (the numbers), like the stylesheet in web/css/.
GAME_FILES = sorted(n for n in os.listdir(path('src', 'game')) if n.endswith('.js'))
def game_source(): return ''.join(read('src', 'game', n) for n in GAME_FILES)

QUIET = '--content-json' in sys.argv
def say(*a):
	if not QUIET: print(*a)

errors, warnings = [], []

# =============================================================================
# Names built into the code. Content files may use these; the build checks
# them so a typing slip is caught here, not in the middle of a game.
# The lists below are fixed; the ones read from src/ follow the code by
# themselves. Keep both in step with the code.
# =============================================================================
INSTRUMENTS = ['harp', 'lyre', 'oud', 'flute', 'bell']
BOARD_MODES = ['classic', 'grand', 'ruins', 'omega']
SCALES = {
	'hijaz': [0,1,4,5,7,8,10], 'double harmonic': [0,1,4,5,7,8,11], 'dorian': [0,2,3,5,7,9,10],
	'minor': [0,2,3,5,7,8,10], 'major': [0,2,4,5,7,9,11], 'mixolydian': [0,2,4,5,7,9,10],
	'lydian': [0,2,4,6,7,9,11], 'phrygian': [0,1,3,5,7,8,10],
	'major pentatonic': [0,2,4,7,9], 'minor pentatonic': [0,3,5,7,10],
}
TRIAL_GOALS = ['clear_amulets', 'make_specials', 'cascade', 'gild_in_one_move', 'clear_in_one_move',
			   'moves_to_spare', 'make_suns', 'make_bands', 'crack_thick', 'gild_half_quickly',
			   'no_boons', 'combine_specials']
UPGRADE_EFFECTS = {   # effect: how the amount in the file is scaled for the game
	'extra_moves': 1, 'badge_chance': 0.01, 'trial_chance': 0.01, 'win_gold': 1, 'win_lapis': 1,
}
# conditions for relics and for unlocking looks; a number means "at least"
COUNT_CONDITIONS = ['stars', 'three_star_stops', 'stops_gilded', 'stops_won', 'hard_wins', 'trials_finished',
					'river_events', 'relics_found', 'suns_forged', 'best_cascade', 'thick_stones_cracked',
					'gold_earned', 'gold_held', 'lapis_held', 'win_streak', 'journeys', 'seals_stamped', 'omens_braved',
					'chambers_explored']
WIN_CONDITIONS = ['win_moves_to_spare', 'win_on_difficulty', 'win_at_stop', 'win_without_boons',
				  'win_on_board', 'win_two_specials_at_once', 'win_after_failures',
				  'win_with_omens', 'win_suns_forged', 'win_best_cascade', 'win_specials_made']
# the pictures of the special amulets' marks, in images/specials/ (see drawTile in src/game/19-draw.js)
SPECIAL_PICTURES = ['band', 'band-glow', 'band-arrows', 'ring', 'ring-glow', 'star-glow', 'star-points', 'sand', 'water']
COLOUR_CHANGES = {'hue_shift': 'hue-rotate({}deg)', 'saturation': 'saturate({})', 'brightness': 'brightness({})',
				  'contrast': 'contrast({})', 'sepia': 'sepia({})', 'greyscale': 'grayscale({})'}

def js_block(file, start):
	"""The text of one `const X = {...}` block in a source file (up to its closing `};`)."""
	src = read('src', file); i = src.find(start)
	if i < 0: return ''
	j = src.find('\n};', i); return src[i:j]
# the boons: their ids come from content/boons/, read first of all the content
# (see load_content), so the trials, stall and events can be checked against them
BOONS = []
def game_block(start):
	"""The text of one `const X = {...}` block in src/game/ (up to its closing `};`)."""
	src = game_source(); i = src.find(start)
	return src[i:src.find('\n};', i)] if i >= 0 else ''
# what a boon can do: the effects in BOON_EFFECTS (src/game/07-trials-boons.js)
BOON_EFFECTS = re.findall(r'^\t(\w+):\s*\{', game_block('const BOON_EFFECTS = {'), re.M)
# what curses and omens can do: the HARDSHIPS in 01-core.js; each file chooses one
HARDSHIPS = re.findall(r'^\t(\w+):\s*\{', js_block('01-core.js', 'const HARDSHIPS = {'), re.M)
DIFFICULTIES = ['Relaxed', 'Normal', 'Hard', 'Pharaoh']   # names are fixed: saves and conditions use them
# what a badge can do: the BADGE_POWERS in 01-core.js; a badge file chooses one
BADGE_POWERS = re.findall(r'^\t(\w+):\s*\{', js_block('01-core.js', 'const BADGE_POWERS = {'), re.M)
# Icons: every SVG in images/icons/<group>/<name>.svg, cleaned of comments and
# the XML line, for the game (ICONS in src/game/06-icons.js) and for {{svg:...}} in
# web/shell.html. Replace a file to change an icon; keep its viewBox.
def load_icons():
	icons = {}
	base = path('images', 'icons')
	for group in sorted(os.listdir(base)) if os.path.isdir(base) else []:
		gdir = os.path.join(base, group)
		if not os.path.isdir(gdir): continue
		for n in sorted(os.listdir(gdir)):
			if not n.endswith('.svg'): continue
			svg = open(os.path.join(gdir, n), encoding='utf-8').read()
			svg = re.sub(r'<\?xml[^>]*\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>', '', svg).strip()
			if not svg.startswith('<svg') or not svg.endswith('</svg>'):
				errors.append(f'images/icons/{group}/{n}: should be one <svg ...> ... </svg> drawing.'); continue
			if 'viewBox' not in svg.split('>', 1)[0]:
				errors.append(f'images/icons/{group}/{n}: the <svg> needs a viewBox, like viewBox="0 0 32 32".'); continue
			icons.setdefault(group, {})[n[:-4]] = svg
	return icons
ICONS = load_icons()
RELIC_ICONS = sorted(ICONS.get('relics', {}))

# =============================================================================
# Pictures
# =============================================================================
TYPES = {'.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif', '.svg':'image/svg+xml'}

def picture_files(folder):
	"""{name: full path} for every picture in images/<folder>/."""
	found = {}
	d = path('images', folder)
	if not os.path.isdir(d): return found
	for name in sorted(os.listdir(d)):
		stem, ext = os.path.splitext(name)
		if name.startswith('.') or name.lower().endswith(('.txt', '.md')): continue
		if ext.lower() not in TYPES:
			warnings.append(f'images/{folder}/{name}: not a picture type I can use (use .png, .jpg, .webp, .gif or .svg)'); continue
		key, full = stem.strip().lower().replace(' ', '-'), os.path.join(d, name)
		if key in found:   # two pictures with one name: a dropped-in .png or .jpg wins over the .svg
			keep, skip = (full, found[key]) if found[key].lower().endswith('.svg') else (found[key], full)
			warnings.append(f'{rel(keep)} is used instead of {rel(skip)}; delete one of them to silence this.')
			full = keep
		found[key] = full
	return found

def embed(full):
	"""A picture for the game file: SVG as its text (the game makes it an
	address), anything else as a base64 data: address."""
	if full.lower().endswith('.svg'):
		svg = re.sub(r'<\?xml[^>]*\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>', '', open(full, encoding='utf-8').read()).strip()
		if not svg.startswith('<svg'): errors.append(f'{rel(full)}: should be one <svg ...> ... </svg> drawing.')
		return svg
	return data_uri(full)

def data_uri(full):
	size = os.path.getsize(full)
	if size > 2_000_000:
		warnings.append(f'{rel(full)}: {size//1024} KB is large; the game file will grow by that much. Consider making it smaller.')
	with open(full, 'rb') as f:
		return f'data:{TYPES[os.path.splitext(full)[1].lower()]};base64,' + base64.b64encode(f.read()).decode()

# =============================================================================
# Reading content files: JSON, with // comments and trailing commas allowed
# =============================================================================
def strip_comments(text):
	"""Blank out // and /* */ comments and trailing commas, keeping every
	character's line and column, so error positions stay true."""
	out, i, n, in_str = [], 0, len(text), False
	while i < n:
		ch = text[i]
		if in_str:
			out.append(ch)
			if ch == '\\' and i + 1 < n: out.append(text[i+1]); i += 2; continue
			if ch == '"': in_str = False
			i += 1; continue
		if ch == '"': in_str = True; out.append(ch); i += 1; continue
		if text.startswith('//', i):
			while i < n and text[i] != '\n': out.append(' '); i += 1
			continue
		if text.startswith('/*', i):
			while i < n and not text.startswith('*/', i): out.append('\n' if text[i] == '\n' else ' '); i += 1
			out.append('  '); i += 2; continue
		if ch == ',':
			# a comma just before a closing bracket (skipping space and comments) is dropped
			k = i + 1
			while k < n and (text.startswith('//', k) or text.startswith('/*', k) or text[k] in ' \t\r\n'):
				if text.startswith('//', k):
					while k < n and text[k] != '\n': k += 1
				elif text.startswith('/*', k):
					e = text.find('*/', k); k = n if e < 0 else e + 2
				else: k += 1
			if k < n and text[k] in '}]': out.append(' '); i += 1; continue
		out.append(ch); i += 1
	return ''.join(out)

HINTS = [
	("Expecting ',' delimiter", 'A comma is probably missing at the end of the line before this one (or a " is missing).'),
	('Expecting property name enclosed in double quotes', 'Field names need double quotes, like "name":. Single quotes \' don\'t work in these files.'),
	('Expecting value', 'Something is missing here: a value, a quote mark, or a bracket. Text needs "double quotes"; true, false and numbers don\'t.'),
	('Invalid control character', 'Text in quotes has to stay on one line. For a long text, write a list of lines: ["first part", "second part"].'),
	('Unterminated string', 'A text is missing its closing " mark.'),
	("Expecting ':' delimiter", 'A field name must be followed by a colon, like "moves": 20.'),
	('Extra data', 'There is something after the final }. A file holds one { ... } block; check that the brackets balance.'),
	('Invalid \\escape', 'A backslash \\ inside text starts a special code. To write a backslash, type two: \\\\.'),
]

def load_json(full):
	try:
		with open(full, encoding='utf-8-sig') as f: text = f.read()
	except UnicodeDecodeError:
		errors.append(f'{rel(full)}: this file is not saved as plain UTF-8 text. Save it again from a plain text editor.'); return None
	# a name given twice in one block is a slip (the second would quietly win)
	twice = []
	def no_twice(pairs):
		seen = set()
		for k, _ in pairs:
			if k in seen: twice.append(k)
			seen.add(k)
		return dict(pairs)
	try:
		obj = json.loads(strip_comments(text), object_pairs_hook=no_twice)
		for k in twice:
			at = [str(i + 1) for i, l in enumerate(text.split('\n')) if f'"{k}":' in l]
			errors.append(f'{rel(full)}: "{k}" is written twice in the same block, so the second would quietly win. '
						  f'Two of these lines are in one block: {", ".join(at)}. Rename or remove one.')
		return None if twice else obj
	except json.JSONDecodeError as e:
		hint = next((h for k, h in HINTS if e.msg.startswith(k)), '')
		lines = text.split('\n'); line = lines[e.lineno-1] if 0 < e.lineno <= len(lines) else ''
		errors.append(f'{rel(full)}, line {e.lineno}: this is not valid content ({e.msg}).\n'
					  f'      {line.strip()[:90]}\n'
					  f'      {hint}')
		return None

def content_files(folder):
	"""Every .json file in content/<folder>/, in order of file name."""
	d = path('content', folder)
	if not os.path.isdir(d): return []
	names = sorted((n for n in os.listdir(d) if n.lower().endswith(('.json', '.jsonc')) and not n.startswith(('.', '_'))), key=str.lower)
	for n in os.listdir(d):
		if not n.startswith(('.', '_')) and not n.lower().endswith(('.json', '.jsonc', '.md', '.txt')) and os.path.isfile(os.path.join(d, n)):
			warnings.append(f'content/{folder}/{n}: ignored; content files must end in .json')
	return [os.path.join(d, n) for n in names]

# =============================================================================
# Checking one file
# =============================================================================
class Bad(Exception): pass

class Check:
	"""Reads fields out of one content block, checking each and recording a
	plain-English message if something is off. `where` names the file."""
	def __init__(self, obj, where, known=None):
		self.obj, self.where = obj, where
		if not isinstance(obj, dict):
			self.fail('should be one { ... } block of fields.')
		if known is not None:
			for k in obj:
				if k not in known:
					close = difflib.get_close_matches(k, known, 1, .6)
					warnings.append(f'{where}: I don\'t know the field "{k}", so it is ignored.' + (f' Did you mean "{close[0]}"?' if close else f' Fields here: {", ".join(known)}.'))
	def fail(self, msg):
		errors.append(f'{self.where}: {msg}'); raise Bad()
	def warn(self, msg): warnings.append(f'{self.where}: {msg}')
	def has(self, key): return key in self.obj and self.obj[key] is not None
	def get(self, key, default=None): return self.obj.get(key, default)

	def id(self, key='id'):
		v = self.obj.get(key)
		if not isinstance(v, str) or not re.fullmatch(r'[a-z][a-z0-9-]*', v):
			self.fail(f'"{key}" must be a short name of lowercase letters, numbers and hyphens, starting with a letter, like "{key}": "golden-barque". Saves remember things by it, so don\'t change it once people play.')
		return v
	def text(self, key, required=True, default=''):
		if key not in self.obj:
			if required: self.fail(f'needs a "{key}" (some text in double quotes).')
			return default
		return as_text(self.obj[key], f'{self.where}: "{key}"')
	def whole(self, key, required=True, default=None, lo=None, hi=None):
		if key not in self.obj:
			if required: self.fail(f'needs a "{key}" (a whole number).')
			return default
		v = self.obj[key]
		if isinstance(v, bool) or not isinstance(v, (int, float)) or v != int(v):
			self.fail(f'"{key}" should be a whole number, like 20 (without quotes); it is {json.dumps(v, ensure_ascii=False)}.')
		v = int(v)
		if lo is not None and v < lo: self.fail(f'"{key}" should be at least {lo}; it is {v}.')
		if hi is not None and v > hi: self.fail(f'"{key}" should be at most {hi}; it is {v}.')
		return v
	def number(self, key, required=True, default=None, lo=None, hi=None):
		if key not in self.obj:
			if required: self.fail(f'needs a "{key}" (a number).')
			return default
		v = self.obj[key]
		if isinstance(v, bool) or not isinstance(v, (int, float)):
			self.fail(f'"{key}" should be a number, like 1.2 (without quotes); it is {json.dumps(v, ensure_ascii=False)}.')
		if lo is not None and v < lo: self.fail(f'"{key}" should be at least {lo}; it is {v}.')
		if hi is not None and v > hi: self.fail(f'"{key}" should be at most {hi}; it is {v}.')
		return v
	def yes(self, key):
		v = self.obj.get(key, False)
		if not isinstance(v, bool): self.fail(f'"{key}" should be true or false (without quotes).')
		return v
	def choice(self, key, options, required=True, default=None):
		if key not in self.obj:
			if required: self.fail(f'needs a "{key}": one of {", ".join(options)}.')
			return default
		v = self.obj[key]
		if v not in options:
			close = difflib.get_close_matches(str(v), options, 1, .5)
			self.fail(f'"{key}" is "{v}", which I don\'t know.' + (f' Did you mean "{close[0]}"?' if close else '') + f' Choose one of: {", ".join(options)}.')
		return v
	def colour(self, key, required=True, default=None):
		if key not in self.obj:
			if required: self.fail(f'needs a "{key}" colour, like "#a8977a".')
			return default
		return as_colour(self.obj[key], self, key)
	def listof(self, key, required=True, lo=0, hi=None):
		if key not in self.obj:
			if required: self.fail(f'needs a "{key}" list, written in square brackets: [ ... ].')
			return []
		v = self.obj[key]
		if not isinstance(v, list): self.fail(f'"{key}" should be a list in square brackets, like ["a", "b"].')
		if len(v) < lo: self.fail(f'"{key}" needs at least {lo} {"item" if lo == 1 else "items"}; it has {len(v)}.')
		if hi is not None and len(v) > hi: self.fail(f'"{key}" can have at most {hi} items; it has {len(v)}.')
		return v
	def sub(self, key, known, required=True):
		if key not in self.obj or self.obj[key] is None:
			if required: self.fail(f'needs a "{key}" block: {{ ... }}.')
			return None
		return Check(self.obj[key], f'{self.where} ("{key}")', known)

def as_text(v, where):
	if isinstance(v, list) and v and all(isinstance(x, str) for x in v): v = ' '.join(x.strip() for x in v)
	if not isinstance(v, str):
		errors.append(f'{where} should be text in double quotes.'); raise Bad()
	if '<' in v or '>' in v:
		warnings.append(f'{where}: the text contains < or >, which the game may read as page markup. Leave them out if the text looks wrong.')
	return v

COLOUR_RE = re.compile(r'#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?|(rgba?|hsla?)\([^()]*\)|[a-zA-Z]+')
def as_colour(v, ck, key):
	if not isinstance(v, str) or not COLOUR_RE.fullmatch(v.strip()):
		ck.fail(f'"{key}": {json.dumps(v, ensure_ascii=False)} doesn\'t look like a colour. Use a colour code like "#c8962e", or "rgba(255,255,255,.5)" for see-through.')
	return v.strip()

def gradient(v, ck, key):
	"""["#a", "#b 55%", "#c"] -> [[0,"#a"], [.55,"#b"], [1,"#c"]]."""
	if isinstance(v, str): v = [v]
	if not isinstance(v, list) or not v: ck.fail(f'"{key}" should be a list of one or more colours.')
	out = []
	for i, item in enumerate(v):
		at = None
		if isinstance(item, str):
			m = re.fullmatch(r'(.*\S)\s+(\d+(?:\.\d+)?)%', item.strip())
			if m: item, at = m.group(1), float(m.group(2)) / 100
		col = as_colour(item, ck, key)
		if at is None: at = 0 if len(v) == 1 else i / (len(v) - 1)
		out.append([round(at, 4), col])
	return out

def plan(v, ck, key, need_stone=True, sand=False):
	"""Checks an 8 x 8 floor plan. With sand (tomb chambers), s and S are
	stone and thick stone with an amulet buried in sand on them."""
	if not isinstance(v, list) or len(v) != 8 or not all(isinstance(r, str) for r in v):
		ck.fail(f'"{key}" must be a list of 8 rows, each in quotes, like "11111111".')
	for i, row in enumerate(v):
		if len(row) != 8: ck.fail(f'"{key}" row {i+1} ("{row}") has {len(row)} squares; every row needs exactly 8.')
		bad = sorted(set(row) - set('.012' + ('sSwW' if sand else '')))
		if bad: ck.fail(f'"{key}" row {i+1} ("{row}") contains {", ".join(repr(b) for b in bad)}. Use only . (gap), 0 (already gold), 1 (bare stone) and 2 (thick stone)'
						+ (', s and S (stone and thick stone with an amulet buried in sand), and w and W (the same under water).' if sand else '.'))
	cells = sum(ch != '.' for r in v for ch in r)
	if cells < 9: ck.fail(f'"{key}" has only {cells} squares to play on; that is too few.')
	ok = lambda r, c: 0 <= r < 8 and 0 <= c < 8 and v[r][c] != '.'
	for r in range(8):
		for c in range(8):
			if not ok(r, c): continue
			if not any(all(ok(r, c+d+j) for j in range(3)) or all(ok(r+d+j, c) for j in range(3)) for d in (-2, -1, 0)):
				ck.fail(f'"{key}": the square at row {r+1}, column {c+1} can never be matched. Every square needs room for three in a row, across or down, through it.')
	if need_stone and not any(ch in '12sSwW' for r in v for ch in r):
		ck.fail(f'"{key}" has no stone to gild (no 1 or 2 anywhere), so it would be won before it began.')
	if sand:
		# sand is brushed off by a match beside it, so every patch of sand
		# must touch a square that starts clear, or it could never be reached
		seen = set()
		for r in range(8):
			for c in range(8):
				if v[r][c] not in 'sSwW' or (r, c) in seen: continue
				patch, todo, touches = set(), [(r, c)], False
				while todo:
					y, x = todo.pop()
					if (y, x) in patch: continue
					patch.add((y, x))
					for yy, xx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
						if not ok(yy, xx): continue
						if v[yy][xx] in 'sSwW': todo.append((yy, xx))
						else: touches = True
				seen |= patch
				if not touches: ck.fail(f'"{key}": the sand or water at row {r+1}, column {c+1} touches no clear square, so it could never be cleared.')
		clear_cells = sum(ch in '012' for row in v for ch in row)
		if clear_cells < 16: ck.fail(f'"{key}" buries too much: only {clear_cells} squares start clear, and the board needs room to make matches.')
	return v

# =============================================================================
# Each kind of content
# =============================================================================
IDS = {}      # folder -> ids, for cross-references
LATER = []    # (where, folder, id, field): references checked once everything is read

def check_condition(v, ck, key):
	"""found_when / unlocked_by: every condition in the block must hold."""
	if v is None: return None
	if not isinstance(v, dict) or not v:
		ck.fail(f'"{key}" should be a block of conditions, like {{"stars": 15}}, or null for "from the start".')
	out = {}
	allowed = COUNT_CONDITIONS + ['relic'] + WIN_CONDITIONS
	for k, x in v.items():
		if k not in allowed:
			close = difflib.get_close_matches(k, allowed, 1, .5)
			ck.fail(f'"{key}" uses "{k}", which I don\'t know.' + (f' Did you mean "{close[0]}"?' if close else '') + ' docs/content-reference.md lists them all.')
		if k in COUNT_CONDITIONS or k in ('win_moves_to_spare', 'win_after_failures', 'win_with_omens', 'win_suns_forged', 'win_best_cascade', 'win_specials_made'):
			if isinstance(x, bool) or not isinstance(x, int) or x < 1: ck.fail(f'"{key}": "{k}" should be a whole number of 1 or more.')
		elif k in ('win_without_boons', 'win_two_specials_at_once'):
			if x is not True: ck.fail(f'"{key}": "{k}" should be true.')
		elif k == 'win_on_difficulty':
			names = {d.lower(): i for i, d in enumerate(DIFFICULTIES)}
			if not isinstance(x, str) or x.lower() not in names: ck.fail(f'"{key}": "win_on_difficulty" should be one of {", ".join(DIFFICULTIES)}.')
			x = names[x.lower()]
		elif k == 'win_on_board':
			if x not in BOARD_MODES: ck.fail(f'"{key}": "win_on_board" should be one of {", ".join(BOARD_MODES)}.')
		elif k in ('relic', 'win_at_stop'):
			if not isinstance(x, str): ck.fail(f'"{key}": "{k}" should be an id in quotes.')
			LATER.append((ck.where, 'relics' if k == 'relic' else 'stops', x, key))
		out[k] = x
	return out

def check_reward(v, ck, key, allow_random=True):
	if not isinstance(v, dict) or not v: ck.fail(f'"{key}" should be a block like {{"gold": 50}}, {{"lapis": 5}} or {{"boon": "hammer"}}.')
	out = {}
	for k, x in v.items():
		if k in ('gold', 'lapis'):
			if isinstance(x, bool) or not isinstance(x, int) or x < 1: ck.fail(f'"{key}": "{k}" should be a whole number of 1 or more.')
		elif k == 'boon':
			ok = BOONS + (['random'] if allow_random else [])
			if x not in ok: ck.fail(f'"{key}": the boon "{x}" doesn\'t exist. Boons: {", ".join(ok)}.')
		else: ck.fail(f'"{key}" can hold "gold", "lapis" and "boon"; "{k}" is not one of them.')
		out[k] = x
	return out

def check_amulet(name, ck, key):
	if name not in AMULET_NAMES_ALL:
		close = difflib.get_close_matches(str(name), AMULET_NAMES_ALL, 1, .6)
		ck.fail(f'"{key}" uses the amulet "{name}", which I can\'t find.' + (f' Did you mean "{close[0]}"?' if close else '') +
				f' Amulets are the pictures in images/amulets/; add images/amulets/{name}.svg (or .png) for a new one.')

def check_amulet_list(ck, key, lo, hi):
	names = ck.listof(key, lo=lo, hi=hi)
	for n in names: check_amulet(n, ck, key)
	if len(set(names)) != len(names): ck.fail(f'"{key}" lists the same amulet twice.')
	return names

# ---- stops ------------------------------------------------------------------
STOP_FIELDS = ['id', 'name', 'subtitle', 'history', 'moves', 'amulets', 'floor_plan', 'shared_floor_shapes', 'stone_colour',
			   'music', 'scenery', 'board_backing', 'frame_colours', 'map_position', 'seals']
USED_PICTURES = set()

def note_hz(v, ck):
	if isinstance(v, (int, float)) and not isinstance(v, bool) and 40 <= v <= 1000: return v
	m = re.fullmatch(r'([A-Ga-g])([#b]?)(\d)', str(v).strip())
	if not m: ck.fail(f'"key" should be a note like "D3", "F#3" or "Bb2"; it is {json.dumps(v)}.')
	semis = {'c':0,'d':2,'e':4,'f':5,'g':7,'a':9,'b':11}[m.group(1).lower()] + {'#':1,'b':-1,'':0}[m.group(2)]
	midi = 12 * (int(m.group(3)) + 1) + semis
	hz = round(440 * 2 ** ((midi - 69) / 12), 2)
	if not 55 <= hz <= 440: ck.warn(f'the key {v} is {hz} Hz; keys between A1 and A4 (55 to 440 Hz) sound best.')
	return hz

def stop_picture(ck, key, stop_id, number, folder):
	"""The picture for a stop's scenery or board backing: the file named in
	the stop's own file, else images/<folder>/<stop id>, else <number>."""
	files = PICTURE_FILES[folder]
	name = ck.get(key)
	if name is not None:
		name = os.path.splitext(str(name))[0].lower()
		if name not in files:
			close = difflib.get_close_matches(name, sorted(files), 1, .5)
			ck.fail(f'"{key}": there is no picture images/{folder}/{name}.svg (or .png / .jpg).' + (f' Did you mean "{close[0]}"?' if close else ''))
			return None
	else:
		name = stop_id if stop_id in files else str(number) if str(number) in files else None
		if name is None:
			ck.fail(f'needs a picture for its {key.replace("_", " ")}: add images/{folder}/{stop_id}.svg (or .png / .jpg). '
					f'Copying another stop\'s picture is a good start.')
			return None
	USED_PICTURES.add(files[name])
	PICTURES[folder][stop_id] = embed(files[name])
	return rel(files[name])

STOPS_READ = [0]   # how many stop files have been read, so a picture may be named by number (3.svg)

def stop(ck):
	sid = ck.id()
	STOPS_READ[0] += 1; number = STOPS_READ[0]
	# "amulets" is one list of 4-6 names, or a list of such lists: then each
	# time the stop starts, the game picks one of them at random
	raw = ck.get('amulets')
	if isinstance(raw, list) and raw and all(isinstance(x, list) for x in raw):
		sets = [check_amulet_list(Check({'amulets': x}, f'{ck.where} ("amulets", set {i + 1})'), 'amulets', 4, 6) for i, x in enumerate(raw)]
	else:
		sets = [check_amulet_list(ck, 'amulets', 4, 6)]
	types = sets[0]
	mp = ck.sub('map_position', ['x', 'y', 'label'])
	music = ck.sub('music', ['key', 'scale', 'instrument'], False) or Check({}, ck.where)
	scale = music.get('scale', 'hijaz')
	if isinstance(scale, str): scale = SCALES[music.choice('scale', list(SCALES))]
	elif not (isinstance(scale, list) and scale and all(isinstance(s, int) and not isinstance(s, bool) and 0 <= s < 12 for s in scale)):
		music.fail('"scale" should be a scale name, like "dorian", or a list of steps in semitones, like [0, 2, 3, 5, 7, 9, 10].')
	frame = ck.listof('frame_colours', False, 3, 3) or ['#6a4524', '#2a1808', '#a07a44']
	shapes = ck.listof('shared_floor_shapes', False)
	for s in shapes: LATER.append((ck.where, 'floor-shapes', s, 'shared_floor_shapes'))
	return {
		'id': sid, 'name': ck.text('name'), 'sub': ck.text('subtitle', False), 'fact': ck.text('history', False),
		'moves': ck.whole('moves', lo=5, hi=120), 'types': len(types), 'set': types, **({'sets': sets} if len(sets) > 1 else {}),
		'x': mp.number('x', lo=0, hi=360), 'y': mp.number('y', lo=0, hi=560),
		'anchor': 'start' if mp.choice('label', ['right', 'left'], False, 'right') == 'right' else 'end',
		'map': plan(ck.get('floor_plan'), ck, 'floor_plan'), 'shapes': shapes, 'floor': ck.colour('stone_colour', False, '#a8977a'),
		'audio': {'root': note_hz(music.get('key', 'D3'), music), 'scale': scale, 'inst': music.choice('instrument', INSTRUMENTS, False, 'harp')},
		'scene': stop_picture(ck, 'scenery', sid, number, 'backdrops'),
		'backing': stop_picture(ck, 'board_backing', sid, number, 'boards'),
		'frame': [as_colour(c, ck, 'frame_colours') for c in frame],
		'seals': stop_seals(ck),
	}

# A stop's seals: three challenges, each stamped the first time a win at that
# stop meets its conditions. Keep their order: saves remember them by position.
def stop_seals(ck):
	if not ck.has('seals'): return []
	raw = ck.get('seals')
	if not isinstance(raw, list) or len(raw) != 3:
		ck.fail('"seals" should be a list of exactly three, each {"text": "...", "when": {...}}.')
	out = []
	for i, x in enumerate(raw):
		sc = Check(x if isinstance(x, dict) else {}, f'{ck.where} (seal {i+1})', ['text', 'when'])
		if not isinstance(x, dict): sc.fail('each seal should be a block like {"text": "Win without a boon", "when": {"win_without_boons": true}}.')
		when = check_condition(sc.get('when'), sc, 'when')
		if not when: sc.fail('"when" should say what the seal asks for, like {"win_moves_to_spare": 8}.')
		out.append({'text': sc.text('text'), 'when': when})
	return out

# ---- shared floor shapes, amulets, trials --------------------------------------
def shape(ck):
	return {'id': ck.id(), 'name': ck.text('name'), 'ease': ck.number('move_multiplier', False, 1, .5, 3), 'map': plan(ck.get('floor_plan'), ck, 'floor_plan')}

def amulet(ck):
	aid = ck.id()
	if aid not in AMULET_NAMES_ALL:
		ck.warn(f'there is no drawing or picture for the amulet "{aid}" yet. Add images/amulets/{aid}.png to use it.')
	return {'id': aid, 'name': ck.text('name'), 'plural': ck.text('plural'), 'meaning': ck.text('meaning', False)}

def trial(ck):
	goal = ck.choice('goal', TRIAL_GOALS)
	t = {'id': ck.id(), 'goal': goal, 'target': ck.whole('target', lo=1), 'text': ck.text('text'),
		 'label': ck.text('progress_label', False, 'Progress'), 'boon': ck.choice('boon', BOONS)}
	if goal == 'clear_amulets' and '{amulets}' not in t['text']:
		ck.warn('the text doesn\'t say which amulet to clear. Write {amulets} where its name should go, like "Clear {target} {amulets}".')
	if ck.has('only_if_thick_stones'): t['needsThick'] = ck.whole('only_if_thick_stones', lo=1)
	if goal == 'gild_half_quickly': t['within'] = ck.whole('within_moves', False, 10, 1)
	return t

# ---- boons -----------------------------------------------------------------
def boon(ck):
	bid = ck.id()
	b = {'id': bid, 'short': ck.text('short'), 'name': ck.text('name'), 'desc': ck.text('description'),
		 'effect': ck.choice('effect', BOON_EFFECTS), 'great': ck.yes('random_reward')}
	if ck.has('amount'): b['amount'] = ck.whole('amount', lo=1, hi=99)
	if ck.has('popup'): b['popup'] = ck.text('popup')
	if ck.has('popup_when_nothing'): b['popupNone'] = ck.text('popup_when_nothing')
	if len(b['short']) > 10: ck.warn(f'"short" is {len(b["short"])} letters; it is the label on a small button, so keep it to about 8.')
	icons = ICONS.get('boons', {})
	b['icon'] = ck.get('icon', bid)
	if b['icon'] not in icons:
		ck.fail(f'there is no icon for it: draw images/icons/boons/{bid}.svg, or name one that is there in "icon": {", ".join(sorted(icons))}.')
	return b

# ---- badges ----------------------------------------------------------------
def badge(ck):
	bid = ck.id()
	b = {'id': bid, 'name': ck.text('name'), 'looks': ck.text('looks'), 'text': ck.text('text'),
		 'effect': ck.choice('effect', BADGE_POWERS), 'popup': ck.text('popup'), 'cursed': ck.yes('cursed'),
		 'weight': ck.number('weight', lo=0, hi=1000), 'colour': ck.colour('colour')}
	if not re.fullmatch(r'#[0-9a-fA-F]{6}', b['colour']):
		ck.fail(f'"colour" should be written like "#ffd65a" (six digits after the #): the glow is made from it.')
	if ck.has('amount'): b['amount'] = ck.whole('amount', lo=1, hi=99)
	if ck.has('popup_when_nothing'): b['popupNone'] = ck.text('popup_when_nothing')
	if bid in PICTURE_FILES['badges']: PICTURES['badges'][bid] = embed(PICTURE_FILES['badges'][bid])
	else: ck.fail(f'there is no picture for it: draw images/badges/{bid}.svg (96 x 96, the badge a circle of radius 24 in the middle).')
	return b

# ---- curses ----------------------------------------------------------------
def curse(ck):
	c = {'id': ck.id(), 'name': ck.text('name'), 'text': ck.text('text'), 'effect': ck.choice('effect', HARDSHIPS)}
	if ck.has('text_at_full_strength'): c['textAll'] = ck.text('text_at_full_strength')
	if 'at the next stop' in c['text']:
		ck.warn('"text": leave out "at the next stop"; the game adds it where it is needed.')
	st = ck.sub('strength', DIFFICULTIES)
	c['by'] = [st.whole(d, True, None, 0, 100) for d in DIFFICULTIES]
	if c['by'][0] > 0: st.warn('"Relaxed" is above 0: failing a trial on Relaxed is meant to cost nothing.')
	if not any(c['by']): st.warn('every strength is 0, so this curse never falls.')
	return c

# ---- omens -----------------------------------------------------------------
def omen(ck):
	o = {'id': ck.id(), 'name': ck.text('name'), 'text': ck.text('text'), 'effect': ck.choice('effect', HARDSHIPS)}
	if o['effect'] == 'no_boons': o['amount'] = ck.whole('amount', False, 1, 0, 100)
	else: o['amount'] = ck.whole('amount', lo=1, hi=100)
	return o

# ---- relics ----------------------------------------------------------------
def relic(ck):
	rid = ck.id()
	when = check_condition(ck.get('found_when'), ck, 'found_when')
	if not when: ck.fail('needs "found_when": what the player must do to find it, like {"best_cascade": 5}.')
	r = {'id': rid, 'name': ck.text('name'), 'desc': ck.text('description'), 'when': when}
	if ck.has('reward'): r['reward'] = check_reward(ck.get('reward'), ck, 'reward', False)
	icon = ck.get('icon', rid)
	if rid in PICTURE_FILES['relics']:
		PICTURES['relics'][rid] = embed(PICTURE_FILES['relics'][rid])
	elif icon in RELIC_ICONS: r['icon'] = icon
	elif ck.has('icon'):
		ck.fail(f'"icon": there is no icon "{icon}" in images/icons/relics/. There are: {", ".join(RELIC_ICONS)}. Or add images/icons/relics/{rid}.svg, or a picture called images/relics/{rid}.png.')
	return r

# ---- river events ------------------------------------------------------------
def event(ck):
	kind = ck.choice('kind', ['puzzle', 'choice'])
	e = {'id': ck.id(), 'kind': kind, 'title': ck.text('title'), 'text': ck.text('text'), 'weight': ck.number('weight', False, 1, 0, 100)}
	if kind == 'puzzle':
		g = ck.sub('goal', ['type', 'amulet', 'count', 'points'])
		gt = g.choice('type', ['gild', 'collect', 'score'])
		goal = {'type': gt}
		types = ck.whole('amulet_types', lo=4, hi=6)
		if ck.has('amulets'): e['set'] = check_amulet_list(ck, 'amulets', types, 6)
		if gt == 'collect':
			goal['amulet'] = g.get('amulet'); goal['n'] = g.whole('count', lo=1)
			if 'set' not in e: ck.fail('a "collect" goal needs its own "amulets" list, so the amulet to collect is always on the board.')
			if goal['amulet'] not in e['set'][:types]: ck.fail(f'the goal collects "{goal["amulet"]}", which must be among the first {types} of "amulets".')
		if gt == 'score': goal['n'] = g.whole('points', lo=1)
		e.update(goal=goal, moves=ck.whole('moves', lo=3, hi=80), types=types,
				 map=plan(ck.get('floor_plan'), ck, 'floor_plan', need_stone=(gt == 'gild')),
				 reward=check_reward(ck.get('reward'), ck, 'reward'))
		if ck.yes('by_lamplight'): e['fog'] = True
	else:
		choices = []
		for i, c in enumerate(ck.listof('choices', lo=1, hi=5)):
			cc = Check(c, f'{ck.where} (choice {i+1})', ['label', 'cost', 'give', 'take_a_boon', 'gamble'])
			ch = {'label': cc.text('label')}
			if cc.has('cost'):
				if isinstance(cc.get('cost'), dict) and 'boon' in cc.get('cost'): cc.fail('"cost" can be gold and lapis; to take a boon, write "take_a_boon": true.')
				ch['cost'] = check_reward(cc.get('cost'), cc, 'cost', False)
			if cc.has('give'): ch['give'] = check_reward(cc.get('give'), cc, 'give')
			if cc.yes('take_a_boon'): ch['takeBoon'] = ch['needBoon'] = True
			if cc.yes('gamble'): ch['gamble'] = True
			choices.append(ch)
		e['choices'] = choices
		if all(len(c) > 1 for c in choices): ck.warn('every choice does something; it is kind to offer one that simply walks on, like {"label": "Walk on"}.')
	return e

# ---- tomb and temple chambers ------------------------------------------------
def chamber(ck):
	"""A small board beside a stop, opened once that stop is gilded: a tomb or
	temple (dim, by torchlight, with sand) or an oasis (daylight, with water)."""
	at = ck.get('at')
	if not isinstance(at, str): ck.fail('"at" should be the id of the stop the chamber is beside, like "saqqara".')
	LATER.append((ck.where, 'stops', at, 'at'))
	types = ck.whole('amulet_types', False, 5, lo=4, hi=6)
	setting = ck.choice('setting', ['tomb', 'oasis'], False, 'tomb')
	cid = ck.id()
	c = {'id': cid, 'at': at, 'title': ck.text('name'), 'text': ck.text('text'), 'kind': 'puzzle', 'goal': {'type': 'gild'},
		 'moves': ck.whole('moves', lo=3, hi=80), 'types': types, 'chamber': True,
		 'torch': setting == 'tomb', 'oasis': setting == 'oasis',
		 'map': plan(ck.get('floor_plan'), ck, 'floor_plan', sand=True),
		 'reward': check_reward(ck.get('reward'), ck, 'reward'),
		 # paid on each later visit; without one, half the gold and lapis
		 'returnReward': check_reward(ck.get('return_reward'), ck, 'return_reward') if ck.has('return_reward') else None}
	# "amulets" is one list, or a list of lists as for a stop: then each
	# time the chamber opens, the game picks one of them at random
	raw = ck.get('amulets')
	if isinstance(raw, list) and raw and all(isinstance(x, list) for x in raw):
		sets = [check_amulet_list(Check({'amulets': x}, f'{ck.where} ("amulets", set {i + 1})'), 'amulets', types, 6) for i, x in enumerate(raw)]
		c['set'] = sets[0]
		if len(sets) > 1:
			c['sets'] = sets
	elif ck.has('amulets'):
		c['set'] = check_amulet_list(ck, 'amulets', types, 6)
	if not c['returnReward']:
		r = c['reward']
		c['returnReward'] = {k: max(1, r[k] // 2) for k in ('gold', 'lapis') if k in r} or {'gold': 50}
	scene = chamber_scenery(ck, cid)
	if scene: c['scene'] = scene
	return c

def chamber_scenery(ck, cid):
	"""A chamber's own scenery: the picture named in "scenery", else
	images/backdrops/<chamber id>, else none (the stop's scenery is used).
	Chambers sharing a picture share one copy of it in the game, kept under
	"chamber:<picture>"; this returns that key."""
	files = PICTURE_FILES['backdrops']
	name = ck.get('scenery')
	if name is not None:
		name = os.path.splitext(str(name))[0].lower()
		if name not in files:
			close = difflib.get_close_matches(name, sorted(files), 1, .5)
			ck.fail(f'"scenery": there is no picture images/backdrops/{name}.svg (or .png / .jpg).' + (f' Did you mean "{close[0]}"?' if close else ''))
	elif cid in files: name = cid
	if not name: return None
	USED_PICTURES.add(files[name])
	key = 'chamber:' + name
	if key not in PICTURES['backdrops']: PICTURES['backdrops'][key] = embed(files[name])
	return key

# ---- Anubis's stall and the treasury -------------------------------------------
def stall(ck):
	it = {'id': ck.id(), 'name': ck.text('name'), 'desc': ck.text('description'),
		  'cur': ck.choice('currency', ['gold', 'lapis']), 'price': ck.whole('price', lo=1)}
	g = ck.sub('gives', ['moves', 'reshuffle', 'boon', 'second_wind'])
	if len(g.obj) != 1: g.fail('should give exactly one thing: "moves", "reshuffle", "boon" or "second_wind".')
	k, v = next(iter(g.obj.items()))
	if k == 'moves': it.update(kind='now', give={'moves': g.whole('moves', lo=1, hi=20)})
	elif k == 'reshuffle':
		if v is not True: g.fail('"reshuffle" should be true.')
		it.update(kind='now', give={'reshuffle': True})
	elif k == 'second_wind': it.update(kind='charge', give={'wind': g.whole('second_wind', lo=1, hi=5)})
	elif k == 'boon':
		pool = v if isinstance(v, list) else [v]
		for b in pool:
			if b not in BOONS + ['random']: g.fail(f'the boon "{b}" doesn\'t exist. Boons: {", ".join(BOONS)}, or "random".')
		it.update(kind='boon', give={'boon': pool})
	return it

def upgrade(ck):
	prices = ck.listof('prices', lo=1, hi=10)
	for p in prices:
		if isinstance(p, bool) or not isinstance(p, int) or p < 1: ck.fail('"prices" should be a list of whole numbers, one per level, like [300, 600, 1200].')
	eff = ck.choice('effect', list(UPGRADE_EFFECTS))
	return {'id': ck.id(), 'name': ck.text('name'), 'desc': ck.text('description'), 'cur': ck.choice('currency', ['gold', 'lapis']),
			'tiers': len(prices), 'prices': prices, 'effect': eff,
			'amount': round(ck.number('amount_per_level', lo=0) * UPGRADE_EFFECTS[eff], 6)}

# ---- looks -----------------------------------------------------------------
def look(ck):
	return {'id': ck.id(), 'name': ck.text('name'), 'desc': ck.text('description'),
			'need': check_condition(ck.get('unlocked_by'), ck, 'unlocked_by'), 'needText': ck.text('how_to_unlock', False, None)}

def skin(ck):
	s = look(ck)
	if ck.has('colour_changes') and ck.has('css_filter'): ck.fail('use either "colour_changes" or "css_filter", not both.')
	if ck.has('colour_changes'):
		cc = ck.sub('colour_changes', list(COLOUR_CHANGES))
		parts = []
		for k in cc.obj:          # in the order written: the order matters
			if k not in COLOUR_CHANGES: continue
			n = cc.number(k, lo=-360 if k == 'hue_shift' else 0, hi=360 if k == 'hue_shift' else 4)
			parts.append(COLOUR_CHANGES[k].format('%g' % n))
		s['filter'] = ' '.join(parts)
	if ck.has('css_filter'): s['filter'] = ck.text('css_filter')
	if ck.has('glow'): s['glow'] = ck.colour('glow')
	if ck.has('tint'): s['tint'] = ck.colour('tint'); s['tintAlpha'] = ck.number('tint_strength', False, .25, 0, 1)
	return s

def floor_set(ck):
	"""A floor set is a folder of pictures, images/floors/<id>/: bare, thick and
	gilded (or gilded-1, gilded-2 ... to mix several)."""
	f = look(ck)
	if ck.yes('uses_each_stops_own_stone'): f['temple'] = True
	files = picture_files('floors/' + f['id'])
	where = f'images/floors/{f["id"]}/'
	missing = [k for k in ('bare', 'thick') if k not in files]
	gilded = [files[k] for k in sorted(files, key=lambda k: (len(k), k)) if k == 'gilded' or re.fullmatch(r'gilded-\d+', k)]
	if not gilded: missing.append('gilded')
	if missing:
		ck.fail(f'needs the pictures {", ".join(m + ".svg" for m in missing)} in {where} (or .png / .jpg). '
				f'Copying another floor set\'s folder is a good start.')
		return f
	PICTURES['floors'][f['id']] = {'bare': embed(files['bare']), 'thick': embed(files['thick']), 'gilded': [embed(g) for g in gilded]}
	f['files'] = {'bare': rel(files['bare']), 'thick': rel(files['thick']), 'gilded': [rel(g) for g in gilded]}
	return f

def frame(ck):
	f = look(ck)
	if ck.get('colours') is None: f['frame'] = None
	else:
		c = ck.sub('colours', ['face', 'shade', 'edge'])
		f['frame'] = [c.colour('face'), c.colour('shade'), c.colour('edge')]
	return f

def sparkle(ck):
	s = look(ck)
	s['a'], s['b'] = [as_colour(c, ck, 'colours') for c in ck.listof('colours', lo=2, hi=2)]
	return s

LOOK_FIELDS = ['id', 'name', 'description', 'unlocked_by', 'how_to_unlock']
# (folder, key in the game, fields, reader, the free look every save starts with)
KINDS = [
	('boons', 'boons', ['id', 'short', 'name', 'description', 'effect', 'amount', 'popup', 'popup_when_nothing', 'random_reward', 'icon'], boon, None),
	('floor-shapes', 'shapes', ['id', 'name', 'move_multiplier', 'floor_plan'], shape, None),
	('stops', 'stops', STOP_FIELDS, stop, None),
	('amulets', 'amulets', ['id', 'name', 'plural', 'meaning'], amulet, None),
	('trials', 'trials', ['id', 'goal', 'target', 'text', 'progress_label', 'boon', 'only_if_thick_stones', 'within_moves'], trial, None),
	('relics', 'relics', ['id', 'name', 'description', 'found_when', 'reward', 'icon'], relic, None),
	('badges', 'badges', ['id', 'name', 'looks', 'text', 'effect', 'amount', 'popup', 'popup_when_nothing', 'cursed', 'weight', 'colour'], badge, None),
	('curses', 'curses', ['id', 'name', 'text', 'text_at_full_strength', 'effect', 'strength'], curse, None),
	('omens', 'omens', ['id', 'name', 'text', 'effect', 'amount'], omen, None),
	('river-events', 'events', ['id', 'kind', 'title', 'text', 'weight', 'goal', 'moves', 'amulet_types', 'amulets', 'by_lamplight', 'floor_plan', 'reward', 'choices'], event, None),
	('chambers', 'chambers', ['id', 'at', 'name', 'text', 'setting', 'scenery', 'moves', 'amulet_types', 'amulets', 'floor_plan', 'reward', 'return_reward'], chamber, None),
	('anubis-stall', 'stall', ['id', 'name', 'description', 'currency', 'price', 'gives'], stall, None),
	('treasury', 'upgrades', ['id', 'name', 'description', 'currency', 'prices', 'effect', 'amount_per_level'], upgrade, None),
	('amulet-sets', 'skins', LOOK_FIELDS + ['colour_changes', 'css_filter', 'glow', 'tint', 'tint_strength'], skin, 'faience'),
	('floor-sets', 'floorSets', LOOK_FIELDS + ['uses_each_stops_own_stone'], floor_set, 'temple'),
	('frames', 'frames', LOOK_FIELDS + ['colours'], frame, 'temple'),
	('sparkles', 'sparkles', LOOK_FIELDS + ['colours'], sparkle, 'gold'),
]
NEED_AT_LEAST_ONE = {'badges', 'boons', 'stops', 'trials', 'stall', 'skins', 'floorSets', 'frames', 'sparkles'}

def settings():
	"""content/settings.json: the numbers that tune the game. Every field is
	optional; what is left out keeps the value written here as the default."""
	full = path('content', 'settings.json')
	s = load_json(full) if os.path.isfile(full) else {}
	if s is None: s = {}
	try:
		ck = Check(s, 'content/settings.json', ['river_event_percent', 'stall_price_rise_percent', 'persistence', 'earnings',
												'stops_open_at_start', 'stars', 'trial_offer_percent', 'staging', 'badges', 'returning',
												'omens', 'seals', 'difficulty', 'sound'])
		p = ck.sub('persistence', ['extra_moves_per_failure', 'failures_that_count', 'boon_after_failures'], False) or Check({}, ck.where)
		e = ck.sub('earnings', ['stones_per_gold', 'specials_per_lapis', 'gold_for_winning', 'gold_per_spare_move', 'lapis_for_winning'], False) or Check({}, ck.where)
		st = ck.sub('stars', ['three_stars_moves_left_percent', 'two_stars_moves_left_percent'], False) or Check({}, ck.where)
		# staging: the stop (1-12) each part of the game arrives at on a first
		# journey; omens may also be "after the journey"
		sg = ck.sub('staging', ['learning_pace', 'seals', 'badges', 'trials', 'stall', 'events', 'curses', 'chambers', 'omens',
							   'extra_moves_before_badges_percent'], False) or Check({}, ck.where)
		stage_defaults = {'seals': 2, 'badges': 3, 'trials': 4, 'stall': 5, 'events': 6, 'curses': 8, 'chambers': 9, 'omens': 'after the journey'}
		staging = {}
		for k, d in stage_defaults.items():
			v = sg.get(k, d)
			if v == 'after the journey': staging[k] = 'journey'
			elif isinstance(v, int) and not isinstance(v, bool) and 1 <= v <= 99: staging[k] = v - 1   # stop number -> how far the journey has got
			else: sg.fail(f'"{k}" should be a stop number, like 3 (from stop 3){", or \"after the journey\"" if k == "omens" else ""}.')
		pace = sg.choice('learning_pace', ['one at a time', 'everything now'], False, 'one at a time')
		# each badge's weight is in its file (content/badges/)
		b = ck.sub('badges', ['most_good_badges_at_once'], False) or Check({}, ck.where)
		rt = ck.sub('returning', ['badge_chance_percent', 'curse_multiplier', 'each_return', 'most', 'reward_percent_each_return'], False) or Check({}, ck.where)
		returning = {'badgeChance': rt.number('badge_chance_percent', False, 5, 0, 20) / 100,
					 'curseMult': rt.number('curse_multiplier', False, 3, 1, 50),
					 'eachReturn': rt.number('each_return', False, 2, 0, 50),
					 'most': rt.number('most', False, 12, 1, 100),
					 'rewardGrowth': rt.number('reward_percent_each_return', False, 50, 0, 500) / 100}
		so = ck.sub('sound', ['steady_buffer_ms'], False) or Check({}, ck.where)
		om = ck.sub('omens', ['reward_percent_each'], False) or Check({}, ck.where)
		se = ck.sub('seals', ['lapis_each'], False) or Check({}, ck.where)
		diff_default = {'Relaxed': (140, 4.0, 6), 'Normal': (100, 2.2, 9), 'Hard': (85, 1.5, 15), 'Pharaoh': (72, 0.8, 0)}
		dv = ck.get('difficulty', {}) or {}
		if not isinstance(dv, dict) or set(dv) - set(diff_default):
			ck.fail(f'"difficulty" should name some of: {", ".join(diff_default)}.')
		difficulty = []
		for name, (mp, bp, ha) in diff_default.items():
			dc = Check(dv.get(name, {}), f'content/settings.json ("difficulty", {name})', ['moves_percent', 'badge_chance_percent', 'hint_after_seconds'])
			difficulty.append({'name': name, 'movesMult': dc.number('moves_percent', False, mp, 30, 300) / 100,
							   'powerChance': dc.number('badge_chance_percent', False, bp, 0, 20) / 100,
							   'hintAfter': dc.number('hint_after_seconds', False, ha, 0, 120)})
		return {'eventChance': ck.number('river_event_percent', False, 30, 0, 100) / 100, 'returning': returning,
				'steadyBuffer': so.number('steady_buffer_ms', False, 80, 20, 500) / 1000,
				'stallRise': 1 + ck.number('stall_price_rise_percent', False, 30, 0, 200) / 100,
				'stopsOpen': ck.whole('stops_open_at_start', False, 1, 1, 99),
				'trialChance': ck.number('trial_offer_percent', False, 35, 0, 100) / 100,
				'stars': {'three': st.number('three_stars_moves_left_percent', False, 30, 0, 100) / 100,
						  'two': st.number('two_stars_moves_left_percent', False, 15, 0, 100) / 100},
				'staging': staging, 'paceAll': pace == 'everything now',
				'movesBeforeBadges': 1 + sg.number('extra_moves_before_badges_percent', False, 50, 0, 200) / 100,
				'maxGoodBadges': b.whole('most_good_badges_at_once', False, 2, 0, 10),
				'omenBonus': om.number('reward_percent_each', False, 30, 0, 500) / 100,
				'sealLapis': se.whole('lapis_each', False, 6, 0, 1000),
				'difficulty': difficulty,
				'persistence': {'movesPerFail': p.whole('extra_moves_per_failure', False, 2, 0, 10),
								'maxFails': p.whole('failures_that_count', False, 3, 0, 10),
								'boonAtFail': p.whole('boon_after_failures', False, 2, 0, 20)},
				'earn': {'stonesPerGold': e.whole('stones_per_gold', False, 2, 1, 50),
						 'specialsPerLapis': e.whole('specials_per_lapis', False, 2, 1, 50),
						 'winGold': e.whole('gold_for_winning', False, 25, 0, 10000),
						 'spareMoveGold': e.number('gold_per_spare_move', False, 2, 0, 1000),
						 'winLapis': e.whole('lapis_for_winning', False, 1, 0, 1000)}}
	except Bad: return None

# content/text.json: the words on screen. Nested groups are flattened into
# keys like "win.title"; the code asks for them with T('win.title'), and
# web/shell.html with {{hud.moves}}. Every key the code uses must be there.
TEXT_FAMILIES = {   # keys the code builds from an id, so they can't be found by searching
	'stages': (['seals', 'badges', 'trials', 'stall', 'events', 'curses', 'chambers', 'omens'], ['title', 'what', 'text']),
	'difficulty': (['relaxed', 'normal', 'hard', 'pharaoh'], None),
	'boards': (['classic', 'grand', 'omega', 'ruins'], ['name', 'label', 'desc']),
	'reward': (['gold', 'lapis'], None),
	'conditions': (None, None),   # filled below from the condition lists
	'codex.tabs': (['basics', 'amulets', 'specials', 'badges', 'boons', 'floors', 'trials', 'events', 'places', 'relics', 'omens', 'shops'], None),
	'codex.places': (['intro', 'sand', 'sand_text', 'water', 'water_text', 'tombs', 'tombs_text', 'oases', 'oases_text', 'line', 'reward'], None),
	'customise.tabs': (['sets', 'floors', 'frames', 'sparkles'], None),
	# an oasis's words, looked up by placeKey() in src/game/11-chambers.js
	'oasis': (['kicker', 'sub', 'hud', 'enter', 'cover', 'again', 'won', 'lost', 'lost_text', 'heading', 'card_new', 'card_done',
			   'locked', 'win_note', 'win_again', 'explore', 'map_new', 'map_done'], None),
	'popup': (['buried', 'under_water'], None),
}
def load_text():
	full = path('content', 'text.json')
	raw = load_json(full) if os.path.isfile(full) else None
	if raw is None:
		errors.append('content/text.json: the file with the words on screen is missing or could not be read.'); return {}
	flat = {}
	def walk(obj, prefix):
		for k, v in obj.items():
			key = prefix + k
			if isinstance(v, dict): walk(v, key + '.')
			elif isinstance(v, str): flat[key] = v
			else: errors.append(f'content/text.json: "{key}" should be text in quotes.')
	if not isinstance(raw, dict): errors.append('content/text.json: should be one { ... } block.'); return {}
	walk(raw, '')
	used = set()
	code = ''.join(read('src', n) for n in sorted(os.listdir(path('src'))) if n.endswith('.js')) + game_source()
	used |= {k for k in re.findall(r"\bT(?:plain)?\('([\w.]+)'", code) if not k.endswith('.')}   # 'difficulty.'+name is a family
	used |= set(re.findall(r'\{\{([\w.]+)\}\}', read('web', 'shell.html')))
	for fam, (ids, fields) in TEXT_FAMILIES.items():
		if fam == 'conditions': ids = COUNT_CONDITIONS + WIN_CONDITIONS + ['relic', 'so_far', 'and']
		for i in ids:
			if fields: used |= {f'{fam}.{i}.{f}' for f in fields}
			else: used.add(f'{fam}.{i}')
	missing = sorted(k for k in used if k not in flat)
	for k in missing:
		close = difflib.get_close_matches(k, list(flat), 1, .7)
		errors.append(f'content/text.json: the game needs the text "{k}", but it is not there.' + (f' Did you mean "{close[0]}"?' if close else ''))
	return flat

def load_content():
	content = {}
	broken = set()   # folders with a file that couldn't be read: don't blame other files for missing ids there
	for folder, kind, fields, reader, first in KINDS:
		items, seen = [], {}
		for full in content_files(folder):
			obj = load_json(full)
			if obj is None: broken.add(folder); continue
			try: item = reader(Check(obj, rel(full), fields))
			except Bad: broken.add(folder); continue
			if item['id'] in seen:
				errors.append(f'{rel(full)}: the id "{item["id"]}" is already used by {seen[item["id"]]}. Each one needs its own id.'); continue
			seen[item['id']] = rel(full); items.append(item)
		IDS[folder] = set(seen)
		if kind == 'boons': BOONS[:] = [i['id'] for i in items]
		if kind == 'badges' and items and not any(i['weight'] > 0 and not i['cursed'] for i in items):
			errors.append('content/badges/: at least one badge that is not cursed needs a "weight" above 0.')
		if first and first not in seen and content_files(folder):
			errors.append(f'content/{folder}/: keep the one with the id "{first}". Every player starts with it, and saves rely on it.')
		if kind in NEED_AT_LEAST_ONE and not items and not errors:
			errors.append(f'content/{folder}/: there is nothing here. The game needs at least one.')
		content[kind] = {i.pop('id'): i for i in items} if kind in ('shapes', 'amulets') else items
	for where, folder, ref, field in LATER:
		if ref not in IDS.get(folder, ()) and folder not in broken:
			close = difflib.get_close_matches(ref, sorted(IDS.get(folder, ())), 1, .5)
			what = {'floor-shapes': 'floor shape', 'stops': 'stop', 'relics': 'relic'}[folder]
			errors.append(f'{where}: "{field}" names "{ref}", but there is no {what} with that id in content/{folder}/.' + (f' Did you mean "{close[0]}"?' if close else ''))
	order = [st['id'] for st in content.get('stops', [])]
	taken = {}
	for ch in content.get('chambers', []):
		if ch['at'] in taken: errors.append(f'content/chambers/: "{ch["id"]}" and "{taken[ch["at"]]}" are both at "{ch["at"]}". A stop can have one chamber.')
		taken[ch['at']] = ch['id']
		ch['at'] = order.index(ch['at']) if ch['at'] in order else 0
	content['settings'] = settings()
	content['text'] = load_text()
	return content

# =============================================================================
# The build
# =============================================================================
say('Building Amulets of Anubis...')
PICTURE_FILES = {f: picture_files(f) for f in ('amulets', 'specials', 'badges', 'backdrops', 'boards', 'relics')}
PICTURES = {'amulets': {}, 'specials': {}, 'badges': {}, 'backdrops': {}, 'boards': {}, 'floors': {}, 'relics': {}}
for name, full in PICTURE_FILES['amulets'].items():
	if not re.fullmatch(r'[a-z][a-z0-9-]*', name):
		warnings.append(f'{rel(full)}: the file name must start with a letter and use only letters, numbers and hyphens, like golden-scarab.svg'); continue
	PICTURES['amulets'][name] = embed(full)
if 'sun' not in PICTURES['amulets']: errors.append('images/amulets/sun.svg is missing: it is the winged sun, the special amulet made by five in a row.')
AMULET_NAMES_ALL = sorted(n for n in PICTURES['amulets'] if n != 'sun')   # the winged sun is a special, not a stop's amulet
for folder, needed in (('specials', SPECIAL_PICTURES),):   # the badges' pictures are checked with their files
	for name in needed:
		if name in PICTURE_FILES[folder]: PICTURES[folder][name] = embed(PICTURE_FILES[folder][name])
		else: errors.append(f'images/{folder}/{name}.svg is missing; the game draws it.')

CONTENT = load_content()

for folder in ('backdrops', 'boards'):
	for name, full in PICTURE_FILES[folder].items():
		if full not in USED_PICTURES: warnings.append(f'{rel(full)} is not used by any stop or chamber: name it after one\'s id, or name it in its file.')
for rid in PICTURE_FILES['relics']:
	if rid not in IDS.get('relics', ()): warnings.append(f'images/relics/{rid}: there is no relic with the id "{rid}".')
say(f'  pictures: {sum(len(v) for v in PICTURES.values())} from images/, {sum(len(v) for v in ICONS.values())} icons')

def report():
	out = sys.stderr if QUIET else sys.stdout
	if warnings:
		print('\nThings to check:', file=out)
		for w in warnings: print('  - ' + w, file=out)
	if errors:
		print(f'\n{len(errors)} {"problem" if len(errors) == 1 else "problems"} in the content files. Nothing was built; the last good game file is unchanged.\n', file=out)
		for e in errors: print('  x ' + e + '\n', file=out)
		print('Fix the first one, build again, and repeat. docs/beginners-guide.md, "If something goes wrong", can help.', file=out)

if errors:
	report(); sys.exit(1)
content_json = json.dumps(CONTENT, ensure_ascii=False, separators=(',', ':'))
if QUIET:
	print(content_json); report(); sys.exit(0)
say(f'  content: {len(CONTENT["stops"])} stops, {len(CONTENT.get("chambers", []))} chambers, {len(CONTENT["relics"])} relics, {len(CONTENT["boons"])} boons, {len(CONTENT["badges"])} badges, {len(CONTENT["curses"])} curses, {len(CONTENT["omens"])} omens, {len(CONTENT["events"])} river events, '
	f'{len(CONTENT["trials"])} trials, {len(CONTENT["stall"]) + len(CONTENT["upgrades"])} things to buy, '
	f'{sum(len(CONTENT[k]) for k in ("skins", "floorSets", "frames", "sparkles"))} looks')
if '--check' in sys.argv:
	report(); say('\nThe content files are fine. (Checked only; nothing was written.)'); sys.exit(0)

core = read('src', '01-core.js').replace('/*CONTENT*/null', content_json.replace('</', '<\\/'))
ui = ''.join(read('src', n) for n in ['00-open.js', '02-pictures.js', '03-themes.js', '04-boards.js']) + game_source()
ui = ui.replace('/*IMAGES*/null', json.dumps(PICTURES, ensure_ascii=False).replace('</', '<\\/'))
if '/*ICONS*/null' not in ui: errors.append('src/game/06-icons.js: the /*ICONS*/null placeholder is missing.')
ui = ui.replace('/*ICONS*/null', json.dumps(ICONS))
# The stylesheet lives in web/css/, one file per part of the screen; they are
# joined in file-name order (the numbers), so later files can override earlier
# ones on purpose (20-small-screens.css last).
css_files = sorted(n for n in os.listdir(path('web', 'css')) if n.endswith('.css'))
styles = '\n'.join(read('web', 'css', n) for n in css_files)
# the words in the page itself ({{hud.moves}} and the like) come from content/text.json
def shell_text(m):
	t = (CONTENT or {}).get('text', {}).get(m.group(1), m.group(1))
	return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
def shell_svg(m):
	group, name = m.group(1).split('/', 1)
	svg = ICONS.get(group, {}).get(name)
	if svg is None: return f'<!-- missing icon images/icons/{group}/{name}.svg -->'
	return svg.replace('<svg', '<svg ' + (m.group(2) or '').strip() + ' aria-hidden="true" focusable="false"', 1)
shell_src = re.sub(r'\{\{svg:([\w-]+/[\w-]+)((?:\s+[\w-]+="[^"]*")*)\}\}', shell_svg, read('web', 'shell.html'))
html = (re.sub(r'\{\{([\w.]+)\}\}', shell_text, shell_src)
		.replace('/*STYLES*/', styles)
		.replace('/*FONTS*/', read('web', 'fonts.css'))
		.replace('/*CORE*/', core)
		.replace('/*UI*/', ui))
os.makedirs(path('dist'), exist_ok=True)
with open(path('dist', 'amulets-of-anubis.html'), 'w', encoding='utf-8') as f: f.write(html)

# dist/try-it.html: opens the game in try-out mode at the stop, river event or
# chamber whose file was changed most recently (see TRY in src/00-open.js)
def newest_id():
	best = (0, None)
	for folder in ('stops', 'river-events', 'chambers'):
		d = path('content', folder)
		for n in os.listdir(d) if os.path.isdir(d) else []:
			if not n.endswith('.json'): continue
			m = re.search(r'"id"\s*:\s*"([\w-]+)"', read('content', folder, n))
			t = os.path.getmtime(os.path.join(d, n))
			if m and t > best[0]: best = (t, m.group(1))
	return best[1]
target = newest_id()
hashpart = '#try' + (f'={target}' if target else '')
with open(path('dist', 'try-it.html'), 'w', encoding='utf-8') as f:
	f.write(f'<!doctype html><meta charset="utf-8"><title>Try it</title>'
			f'<meta http-equiv="refresh" content="0;url=amulets-of-anubis.html{hashpart}">'
			f'<p>Opening the game in try-out mode&hellip; <a href="amulets-of-anubis.html{hashpart}">click here</a> if nothing happens.</p>')
say(f'Done: dist/amulets-of-anubis.html ({len(html)//1024} KB)')
say(f'To test: double-click dist/try-it.html (try-out mode{", at " + target if target else ""}; your real save is untouched)')
report()
