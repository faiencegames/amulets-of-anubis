"""
The docs that follow the code by themselves. The build runs this with

	python3 build.py --docs

and it does three things:

  1. It rewrites the appendix of docs/content-reference.md ("every name the
	 build knows") from the names in the code and the build, so that list is
	 never out of date.
  2. It checks the rest of the reference, which is written by hand: every
	 setting of every kind of content file has a row in its table, no row
	 names a setting that doesn't exist, "yes" and "no" in the Needed column
	 agree with what the build really insists on and the tables of boon
	 effects, badge powers, hardships and conditions list exactly what the
	 code knows.
  3. It writes docs/code-map.md, a map of the code, from the note at the top
	 of every file.

It prints what doesn't agree and exits with 1 if anything doesn't, so the
reference can't quietly fall behind. An ordinary build of the example game
runs the checks too (without writing anything) and lists what it finds under
"Things to check".

The docs are the engine's (docs/ beside build.py), not the game's.
"""
import os, re, subprocess, textwrap

# a file whose note has a line starting "Private:" stays out of the map of
# the code (and so out of anything made from it)
PRIVATE_MARK = re.compile(r'^Private:', re.M)


def names(words, code=True):
	"""`a`, `b` and `c`: a list for a sentence, with no comma before "and"."""
	w = [f'`{x}`' if code else x for x in words]
	return w[0] if len(w) == 1 else ', '.join(w[:-1]) + ' and ' + w[-1]


# ---- 1. the appendix ----------------------------------------------------------

def appendix(b):
	"""The appendix, each paragraph wrapped like the rest of the file."""
	paras = appendix_text(b).strip().split('\n\n')
	wrap = lambda p: p if p.startswith('#') else textwrap.fill(' '.join(p.split()), 76, break_long_words=False, break_on_hyphens=False)
	return '\n\n'.join(wrap(p) for p in paras) + '\n'


def appendix_text(b):
	diffs = [d for d, _ in b['DIFFICULTY_DEFAULTS']]
	return f"""## Appendix: every name the build knows

*This appendix is written by the build (`python3 build.py --docs`) from the
names in the code, so it always matches the engine. Please don't change it
by hand: your change would be replaced the next time.*

The sections above list most of these already. This appendix puts all of
them in one place. The build checks every content file against them and if
one of them ever changes, the build's error message lists the current ones.

**Conditions** (for `found_when` and `unlocked_by`). Counted:
{names(b['COUNT_CONDITIONS'])}. About the stop just won:
{names(b['WIN_CONDITIONS'])}. And `relic`, so one relic can unlock the next.

**Trial goals:** {names(b['TRIAL_GOALS'])}.

**Badge powers** (`effect` in badges): {names(b['BADGE_POWERS'])}.

**Hardships** (`effect` in curses and omens): {names(b['HARDSHIPS'])}.

**Boon effects:** {names(b['BOON_EFFECTS'])}.

**Boons** (in rewards, stall items and events): the ids of the files in
`content/boons/`, or `"random"` for one drawn at random from those with
`"random_reward": true`.

**Cover sounds:** {names(b['COVER_SOUNDS'])}. **Cover rules:** `broken_by` is
`beside` or `on`, `layers` goes from 1 to 9, `matches` and `spreads` are
`true` or `false`.

**Amulets:** every picture in `images/amulets/` is an amulet a stop can use
(except `sun`, which is a special).

**Special amulets' pictures** (in `images/specials/`): {names(b['SPECIAL_PICTURES'])}.

**Relic icons:** any file in `images/icons/relics/` (without its ending),
or a picture `images/relics/<id>.png`.

**Music:** the instruments are {names(b['INSTRUMENTS'])}. The scales are
{names(list(b['SCALES']))}, or a list of semitone steps of your own, like
`[0, 2, 3, 5, 7, 9, 10]`.

**Sounds** (to replace with a recording in `sounds/`): {names(b['EFFECT_NAMES'])}.

**Treasury effects:** {names(list(b['UPGRADE_EFFECTS']))}.

**Colour changes** (in amulet sets): {names(list(b['COLOUR_CHANGES']))},
applied in the order you write them (`hue_shift` is in degrees).

**Currencies:** {names(b['CURRENCIES'])}.

**Kinds of board** (for `win_on_board`): {names(b['BOARD_MODES'])}.

**Difficulties** (for `win_on_difficulty`): the four `name`s in
`settings.jsonc` (`difficulty`), which are {names(diffs)} unless your game
names its own.

**Event goals** (`goal.type`): {names(b['EVENT_GOALS'])}.

**Floor-plan characters:** `.` for a gap, `0` for already gilded, `1` for
bare stone, `2` for thick stone and each cover's two `letters`.

**The starting looks:** those named in `edition.jsonc` (`starting_looks`), or
otherwise the first file of each kind. Every save begins with them and relies
on them, so keep their ids.
"""


# ---- 2. checking the reference -------------------------------------------------

def sections(text):
	"""The reference cut at its headings: [(heading, [lines])]."""
	out, head, body = [], '', []
	for line in text.splitlines():
		if line.startswith('#'):
			out.append((head, body)); head, body = line, []
		else:
			body.append(line)
	out.append((head, body))
	return out


def tables(lines):
	"""The tables in a section: for each, its header's first cell and its rows,
	as (the name in backticks in the first cell, the second cell)."""
	found, cur = [], None
	for line in lines + ['']:
		if line.startswith('|'):
			cells = [c.strip() for c in line.strip().strip('|').split('|')]
			if cur is None:
				cur = (cells[0], [])
			elif not set(cells[0]) <= set('-: '):
				m = re.match(r'`([a-z_][a-z_.]*)', cells[0])
				if m: cur[1].append((m.group(1), cells[1] if len(cells) > 1 else ''))
		elif cur is not None:
			found.append(cur); cur = None
	return found


def needed(b, folder, reader, fields):
	"""What the build really insists on: for each field, True if every file
	that has it fails without it, False if none does, None if no file has it
	(or it is needed only sometimes)."""
	Check, Bad, errors, warnings = b['Check'], b['Bad'], b['errors'], b['warnings']
	out = {}
	files = b['content_files'](folder)
	def attempt(obj, where):
		"""Read one file again: the errors it gives (none if it reads)."""
		ne, nw = len(errors), len(warnings)
		try:
			reader(Check(obj, where, fields))
		except Bad:
			pass
		new = errors[ne:]
		del errors[ne:]; del warnings[nw:]
		return new
	for f in fields:
		results = []
		for full in files:
			obj = b['load_json'](full)
			if not isinstance(obj, dict) or f not in obj: continue
			# a file that can't be read twice (a cover's letters are taken by
			# then) says nothing either way
			if attempt(obj, b['rel'](full)): continue
			new = attempt({k: v for k, v in obj.items() if k != f}, b['rel'](full))
			results.append(any(f'"{f}"' in e for e in new))
		out[f] = None if not results else (True if all(results) else False if not any(results) else None)
	return out


def check(b, text, with_needed=False):
	"""What in the handwritten reference doesn't match the code."""
	problems = []
	parts = sections(text)
	def section(test):
		for head, body in parts:
			if test(head): return head, body
		return None, None
	# every kind of content file: its settings table
	for folder, kind, fields, reader, first in b['KINDS']:
		head, body = section(lambda h: f'`content/{folder}/`' in h)
		if head is None:
			problems.append(f'no section for content/{folder}/ (a heading with `content/{folder}/` in it)'); continue
		rows = [r for t in tables(body) if t[0].startswith('Setting') for r in t[1]] or None
		if rows is not None and head.startswith('### '):   # the looks: the settings they share are one level up
			k = [h for h, _ in parts].index(head)
			parent = next(bd for h, bd in reversed(parts[:k]) if h.startswith('## '))
			rows += [r for t in tables(parent) if t[0].startswith('Setting') for r in t[1]]
		if rows is None:
			problems.append(f'{head.strip("# ")}: no table of settings (one that starts "| Setting")'); continue
		have = {r[0]: r[1] for r in rows}
		for f in fields:
			if f not in have: problems.append(f'{head.strip("# ")}: the setting `{f}` has no row in the table')
		for f in have:
			if f not in fields: problems.append(f'{head.strip("# ")}: `{f}` has a row, but the build knows no such setting')
		if with_needed:
			real = needed(b, folder, reader, fields)
			for f, said in have.items():
				if f not in real or real[f] is None: continue
				if said == 'yes' and not real[f]: problems.append(f'{head.strip("# ")}: `{f}` is marked as needed, but the build accepts a file without it')
				if said == 'no' and real[f]: problems.append(f'{head.strip("# ")}: `{f}` is marked as not needed, but the build stops without it')
	# the lists of names that have a table of their own
	named = [
		('`content/boons/`', 'Effect', b['BOON_EFFECTS'], 'boon effect'),
		('`content/badges/`', 'Power', b['BADGE_POWERS'], 'badge power'),
		('`content/curses/`', 'Hardship', b['HARDSHIPS'], 'hardship'),
		('## Conditions', 'Condition', b['COUNT_CONDITIONS'] + b['WIN_CONDITIONS'], 'condition'),
	]
	for where, header, want, what in named:
		head, body = section(lambda h: where in h)
		if head is None: problems.append(f'no section "{where}" for the {what}s'); continue
		have = [r[0] for t in tables(body) if t[0].startswith(header) for r in t[1]]
		for n in want:
			if n not in have: problems.append(f'{head.strip("# ")}: the {what} `{n}` has no row')
		for n in have:
			if n not in want: problems.append(f'{head.strip("# ")}: `{n}` has a row, but there is no such {what}')
	# settings.jsonc: every group of settings is in its table
	head, body = section(lambda h: h.startswith('## settings.jsonc'))
	if head is not None:
		have = {r[0].split('.')[0] for t in tables(body) for r in t[1]}
		for f in b['SETTINGS_FIELDS']:
			if f not in have: problems.append(f'settings.jsonc: `{f}` has no row in the table')
		for f in have:
			if f not in b['SETTINGS_FIELDS']: problems.append(f'settings.jsonc: `{f}` has a row, but the build knows no such setting')
	# the appendix is the build's
	i = text.find('## Appendix: every name the build knows')
	if i < 0 or text[i:].strip() != appendix(b).strip():
		problems.append('the appendix is out of date: python3 build.py --docs writes it again')
	return problems


# ---- 3. the map of the code ------------------------------------------------------

def header(text, name):
	"""The note at the top of a file, as plain lines."""
	if name.endswith('.py'):
		m = re.match(r'(?:#![^\n]*\n)?\s*"""(.*?)"""', text, re.S)
		if m: return m.group(1).strip('\n').splitlines()
		lines = []
		for line in text.splitlines():
			if not line.startswith('#'): break
			if not line.startswith('#!'): lines.append(line[1:].removeprefix(' '))
		return lines
	if text.lstrip().startswith('/*'):
		body = text[text.find('/*') + 2:text.find('*/')]
		lines = [re.sub(r'^\s?\*? ?', '', line, count=1) for line in body.splitlines()]
		return [line for line in lines if not re.fullmatch(r'\s*=+\s*', line)]
	lines = []
	for line in text.splitlines():
		if not line.startswith('//'): break
		lines.append(line[2:].removeprefix(' '))
	return lines


def code_map(b):
	engine = b['ENGINE']
	try:
		tracked = subprocess.run(['git', 'ls-files'], cwd=engine, capture_output=True, text=True, check=True).stdout.split()
	except (OSError, subprocess.CalledProcessError):
		tracked = [os.path.relpath(os.path.join(r, n), engine).replace(os.sep, '/') for d in ('src', 'web', 'tools') for r, _, ns in os.walk(os.path.join(engine, d)) for n in ns]
		tracked.append('build.py')
	def private(f):
		with open(os.path.join(engine, f), encoding='utf-8') as fh: return bool(PRIVATE_MARK.search('\n'.join(header(fh.read(), f))))
	def pick(test): return sorted(f for f in tracked if test(f) and not private(f))
	groups = [
		('The build', pick(lambda f: f == 'build.py')),
		('The rules and the start-up (`src/`)', pick(lambda f: re.fullmatch(r'src/[^/]+\.js', f))),
		('The running game (`src/game/`)', pick(lambda f: re.fullmatch(r'src/game/[^/]+\.js', f))),
		('The stylesheet (`web/css/`)', pick(lambda f: re.fullmatch(r'web/css/[^/]+\.css', f))),
		('The tools (`tools/`)', pick(lambda f: re.fullmatch(r'tools/(screenshots/)?[^/]+\.(js|mjs|py)', f))),
	]
	out = ['# A map of the code', '',
		   '*This map is written by the build (`python3 build.py --docs`) from the note',
		   'at the top of every file, so it always matches the code. To change what it',
		   'says about a file, change that file\'s note.*', '',
		   'Every file of the engine starts with a note: what the file is for, the main',
		   'functions in it ("What\'s here") and what it changes in a player\'s save. This',
		   'page puts all of those notes in one place, in the order the build joins the',
		   'files. Part 2 of the manual explains how the parts work together. (A game',
		   'that carries the engine in its `engine/` folder may carry fewer of the tools.)', '']
	for title, files in groups:
		if not files: continue
		out += [f'## {title}', '']
		for f in files:
			with open(os.path.join(engine, f), encoding='utf-8') as fh: lines = header(fh.read(), f)
			while lines and not lines[0].strip(): lines.pop(0)
			while lines and not lines[-1].strip(): lines.pop()
			out += [f'### `{f}`', '']
			if not lines:
				out += ['*(This file has no note yet.)*', '']; continue
			# the first paragraph as text, the rest as it is written in the file
			first = []
			while lines and lines[0].strip():
				first.append(lines.pop(0).strip())
			intro = ' '.join(first)
			intro = re.sub(rf'^{re.escape(os.path.basename(f))}\s*[:—-]*\s*', '', intro)
			out += [intro[:1].upper() + intro[1:], '']
			while lines and not lines[0].strip(): lines.pop(0)
			if lines:
				out += ['```text'] + [line.replace('\t', '    ').rstrip() for line in lines] + ['```', '']
	return '\n'.join(out).rstrip() + '\n'


# ---- running it ------------------------------------------------------------------

def reference_path(b): return os.path.join(b['ENGINE'], 'docs', 'content-reference.md')


def run(b):
	"""python3 build.py --docs: write what is written by the build, then check the rest."""
	ref = reference_path(b)
	if not os.path.isfile(ref):
		print(f'There is no {os.path.relpath(ref)}, so there is nothing to write.'); return 1
	with open(ref, encoding='utf-8') as f: text = f.read()
	i = text.find('## Appendix: every name the build knows')
	new = (text[:i] if i >= 0 else text.rstrip() + '\n\n---\n\n') + appendix(b)
	if new != text:
		with open(ref, 'w', encoding='utf-8') as f: f.write(new)
		print(f'Wrote the appendix of {os.path.relpath(ref)}.')
	cm = os.path.join(b['ENGINE'], 'docs', 'code-map.md')
	made = code_map(b)
	old = open(cm, encoding='utf-8').read() if os.path.isfile(cm) else ''
	if made != old:
		with open(cm, 'w', encoding='utf-8') as f: f.write(made)
		print(f'Wrote {os.path.relpath(cm)}.')
	problems = check(b, new, with_needed=True)
	if problems:
		print(f'\nThe content reference doesn\'t match the code in {len(problems)} {"place" if len(problems) == 1 else "places"}:\n')
		for p in problems: print('  - ' + p)
		print(f'\nThe tables are written by hand, in {os.path.relpath(ref)}. Add or fix those rows, then run this again.')
		return 1
	print('The content reference and the map of the code match the code.')
	return 0


def quick(b):
	"""For an ordinary build: the checks, as warnings, writing nothing."""
	ref = reference_path(b)
	if not os.path.isfile(ref): return []
	with open(ref, encoding='utf-8') as f: text = f.read()
	out = [f'{os.path.relpath(ref)}: {p}' for p in check(b, text)]
	cm = os.path.join(b['ENGINE'], 'docs', 'code-map.md')
	if not os.path.isfile(cm) or open(cm, encoding='utf-8').read() != code_map(b):
		out.append(f'{os.path.relpath(cm)} is out of date: python3 build.py --docs writes it again')
	return out
