#!/usr/bin/env python3
"""
The manual as a website and as a PDF, made from the Markdown in docs/.

	python3 tools/docs/build.py              the website, in dist/docs/
	python3 tools/docs/build.py --pdf        and the manual as a PDF, on A4 and on A5
	python3 tools/docs/build.py --pdf --a5   ... only on A5 pages (nicer on a phone); --a4 likewise
	python3 tools/docs/build.py --look ink   in another look (tools/docs/looks/)

Which pages there are, in which order, and which of them go into the PDF is
written in docs/site.json, beside the Markdown:

	{
		"title": "The Tessera manual",
		"look": "paper",
		"pages": [["README.md", "index", "Start here", "Tessera"], ...],
		"printed": ["docs/manual/part-1-making-a-game.md", ...]
	}

Each page is [its Markdown file, the page's name, its short name in the
list of pages, the group it is listed under]. The Markdown stays the one
true copy: this only turns it into pages. Links between listed pages stay
in the site; links to anything else go to the file itself.

A game can have a look of its own: "look" in site.json may name a
stylesheet in the game's folder ("docs/look.css") instead of one of the
engine's looks. It sets the same variables (see base.css).

The website needs no server and fetches nothing: open dist/docs/index.html.
The folder can be copied anywhere as it is, a web server included.
The PDF needs Playwright (tools/screenshots/), like the screenshots. Nothing
here is needed to build or play a game.
"""
import html as _html, json, os, re, shutil, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE = os.path.dirname(os.path.dirname(HERE))
E = lambda s: _html.escape(s, quote=True)


def find_root():
	"""The folder whose docs/site.json says what to make: the one after
	--from, else the folder we're in, else the game the engine sits in (as
	its engine/ folder), else the engine's own."""
	if '--from' in sys.argv: return os.path.abspath(sys.argv[sys.argv.index('--from') + 1])
	for d in (os.getcwd(), os.path.dirname(ENGINE), ENGINE):
		if os.path.isfile(os.path.join(d, 'docs', 'site.json')): return d
	return None


# Where the pages come from and go to. Another script may import this one for
# its Markdown (Page, slug, sections) without making anything.
ROOT = find_root() or os.getcwd()
OUT = os.path.join(ROOT, 'dist', 'docs')


def read(rel):
	with open(os.path.join(ROOT, rel), encoding='utf-8') as f: return f.read()


# ---- code, coloured -------------------------------------------------------------
# A few colours for the kinds of code the manual shows. Small on purpose: the
# page must not need a library from somewhere else.
RULES = {
	'jsonc': [(r'//[^\n]*', 'c'), (r'"(?:[^"\\\n]|\\.)*"(?=\s*:)', 'k'), (r'"(?:[^"\\\n]|\\.)*"', 's'),
			  (r'\b(?:true|false|null)\b', 'b'), (r'-?\b\d+(?:\.\d+)?\b', 'n')],
	'js': [(r'//[^\n]*', 'c'), (r"'(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\"|`[^`]*`", 's'),
		   (r'\b(?:const|let|var|function|async|await|for|while|if|else|return|true|false|null|of|in|new)\b', 'b'),
		   (r'\b[A-Za-z_]\w*(?=\s*:(?!:))', 'k'), (r'\b[A-Za-z_]\w*(?=\()', 'f'), (r'\b\d+(?:\.\d+)?\b', 'n')],
	'sh': [(r'#[^\n]*', 'c'), (r'(?:(?<=^)|(?<=\n)|(?<=&& )|(?<=\| ))[\w./-]+', 'f'), (r'(?<=\s)--?[\w-]+', 'b'),
		   (r'"[^"\n]*"|\'[^\'\n]*\'', 's')],
	'python': [(r'#[^\n]*', 'c'), (r"'[^'\n]*'|\"[^\"\n]*\"", 's'),
			   (r'\b(?:import|from|def|class|return|if|elif|else|for|while|in|not|and|or|None|True|False)\b', 'b'),
			   (r'\b[A-Za-z_][\w.]*(?=\()', 'f'), (r'\b\d+\b', 'n')],
}
for a, b in (('json', 'jsonc'), ('javascript', 'js'), ('bash', 'sh'), ('shell', 'sh'), ('console', 'sh'), ('py', 'python')):
	RULES[a] = RULES[b]


def highlight(code, lang):
	rules = RULES.get(lang)
	if not rules: return _html.escape(code, quote=False)
	pattern = re.compile('|'.join('(%s)' % r for r, _ in rules))
	out, i = [], 0
	for m in pattern.finditer(code):
		out.append(_html.escape(code[i:m.start()], quote=False))
		out.append('<span class="%s">%s</span>' % (rules[m.lastindex - 1][1], _html.escape(m.group(0), quote=False)))
		i = m.end()
	out.append(_html.escape(code[i:], quote=False))
	return ''.join(out)


# ---- Markdown ---------------------------------------------------------------------
# The Markdown the manual uses: headings, paragraphs, lists (nested, numbered),
# tables, block quotes, fenced code, images and links, **bold**, *italic* and
# `code`. HTML written into the Markdown passes through as it is.

def slug(text):
	s = re.sub(r'<[^>]+>|[`*_‘’“”]', '', text)
	s = re.sub(r'[^\w\s-]', '', s)
	return re.sub(r'\s+', '-', s.strip()).lower()


OPENS = set(' \t\n([{—–-/')


def curly(text):
	"""Straight quotes made curly, outside tags and code: after a space or a
	bracket (or at the start) one opens, anywhere else it closes."""
	out, prev = [], None
	for part in re.split(r'(<[^>]*>|\x00CODE\d+\x00)', text):
		if part.startswith(('<', '\x00')):
			out.append(part); continue
		chars = []
		for ch in part:
			if ch == '"': ch = '“' if prev is None or prev in OPENS else '”'
			elif ch == "'": ch = '‘' if prev is None or prev in OPENS else '’'
			chars.append(ch); prev = ch
		out.append(''.join(chars))
	return ''.join(out)


class Page:
	"""One Markdown file on its way to becoming a page: it knows where it came
	from, so it can turn its links and pictures into the right addresses."""
	def __init__(self, src, hrefs):
		self.src, self.hrefs, self.dir = src, hrefs, os.path.dirname(src)
		self.pictures = set()

	def norm(self, ref): return os.path.normpath(os.path.join(self.dir, ref)).replace(os.sep, '/')

	def link(self, target):
		if target.startswith(('http://', 'https://', 'mailto:', '#')): return target
		path, _, anchor = target.partition('#')
		for key in (path, self.norm(path)):
			if key in self.hrefs: return self.hrefs[key] + ('#' + anchor if anchor else '')
		return os.path.relpath(os.path.join(ROOT, self.norm(path)), OUT).replace(os.sep, '/') + ('#' + anchor if anchor else '')

	def picture(self, ref):
		if ref.startswith(('http://', 'https://', 'data:')): return ref
		self.pictures.add(self.norm(ref))
		return 'files/' + self.norm(ref)

	def inline(self, text):
		code = []
		def stash(m):
			code.append(m.group(1)); return '\x00CODE%d\x00' % (len(code) - 1)
		text = re.sub(r'`([^`]+)`', stash, text)
		text = re.sub(r'&(?!amp;|lt;|gt;|quot;|nbsp;|#\d+;|#x[0-9a-f]+;)', '&amp;', text)
		text = re.sub(r'!\[([^\]]*)\]\(([^)\s]+)\)', lambda m: '<img src="%s" alt="%s">' % (self.picture(m.group(2)), E(m.group(1))), text)
		text = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lambda m: '<a href="%s">%s</a>' % (self.link(m.group(2)), m.group(1)), text)
		text = re.sub(r'<(?!/?(?:a|img|br|b|i|em|strong|kbd|sup|sub)\b)', '&lt;', text)
		text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
		text = re.sub(r'(?<!\*)\*([^*\n]+)\*(?!\*)', r'<em>\1</em>', text)
		text = re.sub(r'(?<![\w_])_([^_\n]+)_(?![\w_])', r'<em>\1</em>', text)
		text = curly(text)
		return re.sub(r'\x00CODE(\d+)\x00', lambda m: '<code>%s</code>' % _html.escape(code[int(m.group(1))], quote=False), text)

	def cells(self, line):
		"""A table row's cells; a "|" written as "\\|" stays in its cell."""
		line = line.strip()
		if line.startswith('|'): line = line[1:]
		if line.endswith('|') and not line.endswith('\\|'): line = line[:-1]
		return [c.strip().replace('\\|', '|') for c in re.split(r'(?<!\\)\|', line)]

	def html(self, md):
		lines = md.replace('\r\n', '\n').split('\n')
		out, para, i = [], [], 0
		def flush():
			if para: out.append('<p>%s</p>' % self.inline(' '.join(para))); para.clear()
		while i < len(lines):
			line = lines[i]
			m = re.match(r'^\s*```(\w*)\s*$', line)
			if m:
				flush()
				indent = len(line) - len(line.lstrip())
				buf, i = [], i + 1
				while i < len(lines) and not re.match(r'^\s*```\s*$', lines[i]):
					buf.append(lines[i][indent:] if lines[i][:indent].strip() == '' else lines[i]); i += 1
				i += 1
				lang = m.group(1) or 'text'
				out.append('<pre class="code" data-lang="%s"><code>%s</code></pre>' % (lang, highlight('\n'.join(buf), lang)))
				continue
			if not line.strip():
				flush(); i += 1; continue
			m = re.match(r'^(#{1,6})\s+(.*)$', line)
			if m:
				flush()
				n, raw = len(m.group(1)), m.group(2).strip()
				out.append('<h%d id="%s">%s</h%d>' % (n, slug(raw), self.inline(raw), n))
				i += 1; continue
			if re.match(r'^\s*([-*_])\s*(\1\s*){2,}$', line):
				flush(); out.append('<hr>'); i += 1; continue
			if line.lstrip().startswith('>'):
				flush(); buf = []
				while i < len(lines) and lines[i].lstrip().startswith('>'):
					buf.append(re.sub(r'^\s*>\s?', '', lines[i])); i += 1
				out.append('<blockquote>%s</blockquote>' % self.html('\n'.join(buf)))
				continue
			if '|' in line and i + 1 < len(lines) and re.match(r'^\s*\|?[\s:|-]+\|[\s:|-]*$', lines[i + 1]):
				flush()
				head = self.cells(line)
				aligns = ['center' if c.strip().startswith(':') and c.strip().endswith(':') else 'right' if c.strip().endswith(':') else ''
						  for c in self.cells(lines[i + 1])]
				i += 2; rows = []
				while i < len(lines) and '|' in lines[i] and lines[i].strip():
					rows.append(self.cells(lines[i])); i += 1
				al = lambda k: ' style="text-align:%s"' % aligns[k] if k < len(aligns) and aligns[k] else ''
				out.append('<div class="table"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (
					''.join('<th%s>%s</th>' % (al(k), self.inline(c)) for k, c in enumerate(head)),
					''.join('<tr>%s</tr>' % ''.join('<td%s>%s</td>' % (al(k), self.inline(r[k] if k < len(r) else '')) for k in range(len(head))) for r in rows)))
				continue
			m = re.match(r'^(\s*)([-*+]|\d+\.)\s+(.*)$', line)
			if m:
				flush()
				html, i = self.list_html(lines, i)
				out.append(html)
				continue
			if line.lstrip().startswith('<'):
				flush(); buf = []
				while i < len(lines) and lines[i].strip():
					buf.append(lines[i]); i += 1
				block = '\n'.join(buf)
				block = re.sub(r'src="([^"]+)"', lambda m: 'src="%s"' % self.picture(m.group(1)), block)
				block = re.sub(r'href="([^"#][^"]*)"', lambda m: 'href="%s"' % self.link(m.group(1)), block)
				out.append(block); continue
			para.append(line.strip()); i += 1
		flush()
		return '\n'.join(out)

	def list_html(self, lines, i):
		"""A list and the lists inside it, and the line after it. An item may
		carry on over several lines and may have a table or code indented under it."""
		first = re.match(r'^(\s*)([-*+]|\d+\.)', lines[i])
		base, ordered = len(first.group(1)), first.group(2)[0].isdigit()
		start = int(first.group(2)[:-1]) if ordered else 1
		items = []
		while i < len(lines):
			m = re.match(r'^(\s*)([-*+]|\d+\.)\s+(.*)$', lines[i])
			if m and len(m.group(1)) == base:
				items.append([m.group(3)]); i += 1; continue
			if lines[i].strip() == '':
				# a blank line ends the list, unless an indented part of the item follows
				j = i + 1
				if j < len(lines) and (len(lines[j]) - len(lines[j].lstrip()) > base) and items:
					items[-1].append(''); i += 1; continue
				break
			indent = len(lines[i]) - len(lines[i].lstrip())
			if indent > base and items:
				items[-1].append(lines[i][base + 2:] if lines[i][:base + 2].strip() == '' else lines[i].strip()); i += 1; continue
			if not m and items and indent <= base and not re.match(r'^\s*([-*+]|\d+\.)\s', lines[i]):
				items[-1].append(lines[i].strip()); i += 1; continue
			break
		end = i
		tag = 'ol' if ordered else 'ul'
		body = []
		for item in items:
			text = '\n'.join(item)
			inner = self.html(text) if ('\n\n' in text or re.search(r'\n\s*([-*+]|\d+\.)\s|\n\s*```|\n\s*\|', text)) else self.inline(' '.join(x.strip() for x in item))
			if inner.startswith('<p>') and inner.count('<p>') == 1 and inner.endswith('</p>') and '\n' not in inner: inner = inner[3:-4]
			body.append('<li>%s</li>' % inner)
		return '<%s%s>%s</%s>' % (tag, ' start="%d"' % start if ordered and start != 1 else '', ''.join(body), tag), end


# ---- the site -------------------------------------------------------------------------

def text_of(html):
	t = re.sub(r'<[^>]+>', ' ', html)
	for a, b in (('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'), ('&quot;', '"'), ('&#x27;', "'")): t = t.replace(a, b)
	return re.sub(r'\s+', ' ', t).strip()


def sections(html, title):
	"""A page cut at its headings, for the search: (heading, its anchor, text)."""
	out, head, anchor, body = [], title, '', ''
	for part in re.split(r'(<h[1-4][^>]*>.*?</h[1-4]>)', html, flags=re.S):
		m = re.match(r'<h[1-4] id="([^"]*)">(.*?)</h[1-4]>', part, re.S)
		if m:
			if text_of(body): out.append((head, anchor, text_of(body)))
			head, anchor, body = text_of(m.group(2)), m.group(1), ''
		else: body += part
	if text_of(body): out.append((head, anchor, text_of(body)))
	return out


def look_css(name):
	path = os.path.join(ROOT, name) if name.endswith('.css') else os.path.join(HERE, 'looks', name + '.css')
	if not os.path.isfile(path): sys.exit(f'There is no look "{name}" (in tools/docs/looks/, or a .css file in the game\'s folder).')
	with open(os.path.join(HERE, 'base.css'), encoding='utf-8') as f: base = f.read()
	with open(path, encoding='utf-8') as f: css = f.read()
	# a look may use the engine's own typefaces: /*FONTS*/ becomes web/fonts.css
	if '/*FONTS*/' in css:
		with open(os.path.join(ENGINE, 'web', 'fonts.css'), encoding='utf-8') as f: css = css.replace('/*FONTS*/', f.read())
	return base + '\n' + css


PAGE = """<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · {site}</title>
<link rel="stylesheet" href="files/docs.css">
</head>
<body>
<header class="top">
	<a class="site" href="index.html">{site}</a>
	<input id="search" type="search" placeholder="Search the manual" aria-label="Search the manual" autocomplete="off">
	<button type="button" id="theme" aria-label="Light or dark">&#9680;</button>
</header>
<div id="results" hidden></div>
<div class="wrap">
<nav class="pages" aria-label="Pages"><details open><summary>Pages</summary>{nav}</details></nav>
<main class="article">
{body}
<nav class="turn">{prev}{next}</nav>
</main>
</div>
<script src="files/search-index.js"></script>
<script src="files/docs.js"></script>
</body>
</html>
"""


def build(site, look):
	pages = site['pages']
	hrefs = {src: name + '.html' for src, name, *_ in pages}
	# a fresh folder each time, keeping the PDFs made before
	if os.path.isdir(OUT):
		for name in os.listdir(OUT):
			full = os.path.join(OUT, name)
			if os.path.isdir(full): shutil.rmtree(full)
			elif not name.endswith('.pdf'): os.remove(full)
	os.makedirs(os.path.join(OUT, 'files'))
	made, index = [], []
	for src, name, nav, group in pages:
		pg = Page(src, hrefs)
		html = pg.html(read(src))
		title = next((text_of(m) for m in re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.S)), nav)
		made.append((src, name, nav, group, title, html, pg.pictures))
		for head, anchor, text in sections(html, title):
			index.append({'p': name + '.html' + ('#' + anchor if anchor else ''), 'n': nav, 't': head, 'x': text[:700]})
	for n, (src, name, nav, group, title, html, pictures) in enumerate(made):
		for pic in pictures:
			full = os.path.join(ROOT, pic)
			if os.path.isfile(full):
				os.makedirs(os.path.dirname(os.path.join(OUT, 'files', pic)), exist_ok=True)
				shutil.copyfile(full, os.path.join(OUT, 'files', pic))
			else: print(f'  {src}: the picture {pic} is missing')
		groups, listing = [], ''
		for s2, n2, nav2, g2 in pages:
			if g2 not in groups:
				groups.append(g2); listing += ('</ul>' if len(groups) > 1 else '') + f'<h2>{E(g2)}</h2><ul>'
			listing += '<li><a href="%s.html"%s>%s</a></li>' % (n2, ' aria-current="page"' if n2 == name else '', E(nav2))
		listing += '</ul>'
		prev = '<a class="prev" href="%s.html">&larr; %s</a>' % (made[n - 1][1], E(made[n - 1][2])) if n else '<span></span>'
		nxt = '<a class="next" href="%s.html">%s &rarr;</a>' % (made[n + 1][1], E(made[n + 1][2])) if n + 1 < len(made) else ''
		with open(os.path.join(OUT, name + '.html'), 'w', encoding='utf-8') as f:
			f.write(PAGE.format(title=E(title), site=E(site['title']), nav=listing, body=html, prev=prev, next=nxt))
	with open(os.path.join(OUT, 'files', 'docs.css'), 'w', encoding='utf-8') as f: f.write(look_css(look))
	with open(os.path.join(OUT, 'files', 'search-index.js'), 'w', encoding='utf-8') as f:
		f.write('window.SEARCH=' + json.dumps(index, ensure_ascii=False) + ';')
	shutil.copyfile(os.path.join(HERE, 'docs.js'), os.path.join(OUT, 'files', 'docs.js'))
	if 'index' not in [m[1] for m in made]:
		with open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8') as f:
			f.write('<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=%s.html">' % made[0][1])
	print(f'Wrote {len(made)} pages to {os.path.relpath(OUT)}/ (open index.html).')
	return made


# ---- the PDF ----------------------------------------------------------------------------

PRINT = """<!doctype html>
<html lang="en-GB" data-theme="light" class="print {size}">
<head><meta charset="utf-8"><title>{site}</title><link rel="stylesheet" href="files/docs.css"></head>
<body class="article">
<section class="cover"><h1>{site}</h1><p>{when}</p></section>
<section class="contents"><h2>Contents</h2><ol>{contents}</ol></section>
{chapters}
</body>
</html>
"""


def pdf(site, made, a5):
	chosen = site.get('printed') or [m[0] for m in made]
	by_src = {m[0]: m for m in made}
	contents, chapters = [], []
	for k, src in enumerate(chosen):
		if src not in by_src: sys.exit(f'docs/site.json: "{src}" is printed but isn\'t one of the pages.')
		_, name, nav, group, title, html, _ = by_src[src]
		# links to other pages become links within the book
		html = re.sub(r'href="([\w-]+)\.html(#[^"]*)?"', lambda m: 'href="#%s"' % ((m.group(2) or '#' + m.group(1))[1:]), html)
		html = re.sub(r'<h1 id="[^"]*">', '<h1 id="%s">' % name, html, count=1)
		contents.append('<li><a href="#%s">%s</a></li>' % (name, E(title)))
		chapters.append('<section class="chapter">%s</section>' % html)
	page = os.path.join(OUT, 'print.html')
	with open(page, 'w', encoding='utf-8') as f:
		f.write(PRINT.format(site=E(site['title']), when=time.strftime('%-d %B %Y'), size='a5' if a5 else 'a4',
							 contents=''.join(contents), chapters='\n'.join(chapters)))
	out = os.path.join(OUT, re.sub(r'\W+', '-', site['title'].lower()).strip('-') + ('-a5' if a5 else '') + '.pdf')
	tool = os.path.join(ENGINE, 'tools', 'screenshots', 'pdf.mjs')
	subprocess.run(['node', tool, page, out, site['title'], 'A5' if a5 else 'A4'], check=True)


if __name__ == '__main__':
	if not find_root(): sys.exit('There is no docs/site.json here, so I don\'t know which pages to make.')
	with open(os.path.join(ROOT, 'docs', 'site.json'), encoding='utf-8') as f: site = json.load(f)
	look = sys.argv[sys.argv.index('--look') + 1] if '--look' in sys.argv else site.get('look', 'paper')
	made = build(site, look)
	if '--pdf' in sys.argv:
		for a5 in ([True] if '--a5' in sys.argv else [False] if '--a4' in sys.argv else [False, True]):
			pdf(site, made, a5)
