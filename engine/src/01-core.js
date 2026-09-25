/* =============================================================================
 * 01-core.js  —  the rules of the game, with no browser code at all.
 *
 * Everything here can be run in plain Node, which is how the simulators in
 * tools/ test the difficulty of every stop. Keep it that way: no document,
 * window, canvas or sound here. It is loaded on its own, before the rest.
 *
 * The game's content (stops, amulets, trials, relics, river events, the
 * stall, the looks) is NOT written here: it lives in content/, which build.py
 * checks and pours into CONTENT below. This file holds the rules those files
 * plug into.
 *
 * What's here:
 *   CONTENT, T()        everything from content/; T(key) gives the
 *                       words on screen (content/text.jsonc)
 *   LEVELS, TRIALS ...  short names for parts of CONTENT, used everywhere
 *   BOARD_MODES         Classic, Grand, Ruins and Omega, and how each builds
 *                       its floor
 *   DIFFICULTY          the four difficulties
 *   helpers             the words every rule is written in: where a square
 *                       is (rowOf, neighbours, around, rowSquares ...), which
 *                       squares hold what (bareStones, plainAmulets,
 *                       edgeOfFloor ...), choosing (pickSome, pickOne) and
 *                       changing (thicken, coverAmulet, makeSpecial ...)
 *   COVERS              what an amulet can be held under (content/covers/)
 *   SPECIAL_POWERS      what the special amulets do
 *   BADGE_POWERS        what badges do (content/badges/ picks one each)
 *   HARDSHIPS           what curses and omens do (content/curses/, omens/)
 *   BOONS               the boons from content/boons/
 *   conditionMet()      whether a relic is found or a look unlocked
 *   Core                one game of one stop: the grid, matching, falling,
 *                       specials, covers, scoring; play() is one whole move
 *   stopOptions()       everything a stop needs to start; the game and every
 *                       simulator build their boards through it
 *
 * Changes in the save: nothing (it never sees the save; the game passes in
 * what it needs).
 * ===========================================================================*/

// ===== CONTENT (filled in by build.py from the content/ folder) =====
const CONTENT = /*CONTENT*/ null;
// ---- the words on screen (content/text.jsonc) ------------------------------
// T("section.key", {n: 3}) gives the text for a key, ready to put in the page:
// **bold** and *italic* become bold and italic, {name} is filled from vars,
// and {n|omen|omens} picks the singular or plural by the number n. The build
// checks that every key used in the code exists in the file.
const TEXT = CONTENT.text || {};
function T(key, vars) {
	const s = TEXT[key];
	if (s == null) return key;
	return fill(s, vars);
}

// Words from content, made ready for the page: **bold**, *italic*, line
// breaks, and {name} or {n|one|many} filled in from vars.
function fill(s, vars) {
	s = s
		.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(.+?)\*/g, '<em>$1</em>')
		.replace(/\n/g, '<br>');
	if (vars) {
		s = s.replace(/\{(\w+)\|([^|}]*)\|([^}]*)\}/g, (m, k, one, many) =>
			k in vars ? (+vars[k] === 1 ? one : many) : m,
		);
		s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
	}
	return s;
}

if (!CONTENT) throw new Error('No content: build the game with build.py, which fills this in from content/.');

// ===== CORE (DOM-free game logic) =====
// COLS is the number of columns, ROWS the number of rows. A square board has
// them equal; on a tall phone screen ROWS can be larger so the floor fills the
// screen. The squares are one list: square sq = row * COLS + col throughout.
let COLS = 8,
	ROWS = 8;
// An amulet's type is a number: 0 to 5 for the six kinds at a stop, and
// SUN_TYPE for a sun (the special made by five in a row), which is of no kind: swapped with an amulet, it
// clears every amulet of that kind.
const SUN_TYPE = 6;
// ---- move budget tuning ----------------------------------------------------
// base:  multiplies every stop's moves (lower is harder)
// size:  how strongly moves grow with the amount of floor. Bigger boards cascade
//        more on their own, so moves must grow more slowly than the floor does.
//        Tuned with tools/sim.js so Classic, Grand, Ruins and tall phone boards
//        all win about equally often.
// tall:  tall boards (phones) cascade even more down their long columns, so
//        moves shrink a little by the board's width-to-height ratio. Each
//        board mode sets its own `tall` and `moves`, since wide boards gain
//        more from extra height than narrow ones do.
const MOVE_TUNING = { base: 0.82, size: 0.12, tall: 0.6 };
// ---- floor shapes -----------------------------------------------------
// Besides its own floor plan, each stop can be played on a few shared shapes
// (content/floor-shapes/), chosen at random when the stop begins, so replays
// look different. A shape is an 8x8 plan like a stop's own; it is scaled for
// Grand and tall boards. `ease` (move_multiplier) nudges the move budget for
// shapes that are harder or easier to clear.
const SHAPES = CONTENT.shapes;
// Which shared shapes each stop may use, in LEVELS order (each stop's
// "shared_floor_shapes").
const STOP_SHAPES = CONTENT.stops.map(stop => stop.shapes || []);
// The stop's own plan comes up about 40% of the time; otherwise one of its shapes.
function pickShape(idx) {
	const pool = STOP_SHAPES[idx] || [];
	if (!pool.length || Math.random() < 0.4)
		return { id: 'own', name: T('shapes.own'), map: LEVELS[idx].map, ease: 1 };
	const id = pool[Math.floor(Math.random() * pool.length)];
	return { id, name: SHAPES[id].name, map: SHAPES[id].map, ease: SHAPES[id].ease };
}

// ---- board modes -------------------------------------------------------
// Each mode decides the grid size and how a stop's floor plan is built.
// To add one: give it an id, a grid size n, and a layout(level, idx) that
// returns n strings of n characters ('.' hole, '0' already gold, '1' bare
// stone, '2' thick stone). Move budgets scale automatically from the number
// of layers in the plan, so no other tuning is needed.
const BOARD_MODES = [
	{
		id: 'classic',
		n: 8,
		moves: 1,
		tall: 0.3,
		layout: (level, idx, cols, rows, base) => {
			base = base || level.map;
			return cols === 8 && rows === 8 ? base : expandMap(base, cols, rows);
		},
	},
	{
		id: 'grand',
		n: 10,
		moves: 1.08,
		tall: 0.85,
		layout: (level, idx, cols, rows, base) => expandMap(base || level.map, cols, rows),
	},
	{
		id: 'omega',
		n: 0,
		moves: 1,
		tall: 0,
		sizeExp: 0.5,
		refTotal: 52,
		refMoves: 26,
		maxTypes: 5,
		earn: 0.5,
		dynamic: true,
		layout: (level, idx, cols, rows, base, variant) => omegaPlan(level, idx, cols, rows, variant),
	},
	{
		id: 'ruins',
		n: 12,
		moves: 1.14,
		tall: 1.1,
		refTotal: 52,
		refMoves: 25,
		layout: (level, idx, cols, rows, base, variant) =>
			ruinsPlan(level, idx * 5 + (variant || 0), cols, rows),
	},
];

// their name, size label and description: content/text.jsonc, "boards"
BOARD_MODES.forEach(m =>
	['name', 'label', 'desc'].forEach(f =>
		Object.defineProperty(m, f, { get: () => T(`boards.${m.id}.${f}`), enumerable: true }),
	),
);
function boardMode(id) {
	return BOARD_MODES.find(m => m.id === id) || BOARD_MODES[0];
}

// Grow an 8x8 plan to cols x rows by extending its edge rows and columns, so a
// stop keeps its shape at any board size, just larger or taller.
function expandMap(map, cols, rows) {
	rows = rows || cols;
	// columns: scale across evenly
	const wide = map.map(r => {
		let s = '';
		for (let c = 0; c < cols; c++) s += r[Math.min(7, Math.floor((c * 8) / cols))];
		return s;
	});
	if (rows === 8) return wide;
	if (rows < 8) {
		const out = [];
		for (let r = 0; r < rows; r++) out.push(wide[Math.min(7, Math.floor((r * 8) / rows))]);
		return out;
	}
	// rows: repeat rows that have stone in them, spread evenly, so gaps between
	// parts of a shape stay thin and the shape itself grows taller
	let cand = wide.map((r, i) => (/[^.]/.test(r) ? i : -1)).filter(i => i >= 0);
	if (!cand.length) cand = [0, 1, 2, 3, 4, 5, 6, 7];
	const extra = rows - 8,
		count = new Array(8).fill(1);
	for (let j = 0; j < extra; j++)
		count[cand[Math.floor(((j + 0.5) * cand.length) / extra) % cand.length]]++;
	const out = [];
	wide.forEach((r, i) => {
		for (let k = 0; k < count[i]; k++) out.push(r);
	});
	return out;
}

function rng(seed) {
	let s = (seed * 16807) % 2147483647;
	return () => {
		s = (s * 16807) % 2147483647;
		return (s - 1) / 2147483646;
	};
}

// A ruined floor: a 12x12 slab with stepped bites taken out of its corners and
// edges. Plans are generated from a fixed seed per stop, so a stop always looks
// the same, then checked so that every stone can still be matched.
function ruinsPlan(level, idx, cols, rows) {
	const n = cols || 12,
		m = rows || n;
	for (let attempt = 0; attempt < 80; attempt++) {
		const rnd = rng(idx * 97 + attempt * 13 + 7);
		const g = [];
		for (let r = 0; r < m; r++) g.push(new Array(n).fill('1'));
		// stepped bites out of each corner, of differing depth
		const bite = (r0, c0, dr, dc) => {
			let w = 1 + Math.floor(rnd() * 5);
			for (let i = 0; i < 3 + Math.floor(rnd() * 5); i++) {
				const r = r0 + dr * i;
				if (r < 0 || r >= m || w <= 0) break;
				for (let j = 0; j < w; j++) {
					const cc = c0 + dc * j;
					if (cc < 0 || cc >= n) break;
					g[r][cc] = '.';
				}
				w -= Math.floor(rnd() * 2) + (rnd() < 0.35 ? 0 : 1);
			}
		};
		bite(0, 0, 1, 1);
		bite(0, n - 1, 1, -1);
		bite(m - 1, 0, -1, 1);
		bite(m - 1, n - 1, -1, -1);
		// notches cut into the edges
		const notch = () => {
			const side = Math.floor(rnd() * 4),
				len = 2 + Math.floor(rnd() * 3),
				d = 1 + Math.floor(rnd() * 3),
				at = 2 + Math.floor(rnd() * ((side < 2 ? n : m) - 5));
			for (let i = 0; i < len; i++)
				for (let j = 0; j < d; j++) {
					let r, cc;
					if (side === 0) {
						r = j;
						cc = at + i;
					} else if (side === 1) {
						r = m - 1 - j;
						cc = at + i;
					} else if (side === 2) {
						r = at + i;
						cc = j;
					} else {
						r = at + i;
						cc = n - 1 - j;
					}
					if (r >= 0 && r < m && cc >= 0 && cc < n) g[r][cc] = '.';
				}
		};
		notch();
		if (rnd() < 0.8) notch();
		if (rnd() < 0.4) notch();
		// sometimes a collapsed patch inside the floor
		if (rnd() < 0.5) {
			const r0 = 3 + Math.floor(rnd() * Math.max(1, m - 7)),
				c0 = 3 + Math.floor(rnd() * Math.max(1, n - 7));
			for (let r = r0; r < r0 + 2; r++) for (let cc = c0; cc < c0 + 2; cc++) g[r][cc] = '.';
		}
		// thick stone through the middle of the slab
		for (let r = 0; r < m; r++)
			for (let c = 0; c < n; c++)
				if (g[r][c] === '1' && (r + c) % 7 === 0 && r > 2 && r < m - 3) g[r][c] = '2';
		const out = g.map(r => r.join(''));
		const cells = playable(out),
			want = n * m;
		if (cells >= want * 0.62 && cells <= want * 0.82 && allMatchable(out)) return out;
	}
	return expandMap(level.map, n, m);
}

// The omega floor: usually two ruined banks with a channel of water between
// them (matches can't cross the water), sometimes one vast ruin.
function omegaPlan(level, idx, cols, rows, variant) {
	variant = variant || 0;
	const split = cols >= 20 && variant % 5 !== 0; // two banks only when each can be nine or more wide
	if (!split) return ruinsPlan(level, idx * 7 + variant, cols, rows);
	const gap = cols >= 18 ? 2 : 1,
		left = Math.floor((cols - gap) / 2),
		right = cols - gap - left;
	const L = ruinsPlan(level, idx * 7 + variant, left, rows),
		R = ruinsPlan(level, idx * 7 + variant + 50, right, rows);
	return L.map((row, r) => row + '.'.repeat(gap) + R[r]);
}

function playable(rows) {
	let n = 0;
	rows.forEach(r => {
		for (const ch of r) if (ch !== '.') n++;
	});
	return n;
}

// Every playable square must sit in a run of three across or down, or nothing
// could ever be matched there.
function allMatchable(rows) {
	const m = rows.length,
		n = rows[0].length,
		ok = (row, col) => row >= 0 && col >= 0 && row < m && col < n && rows[row][col] !== '.';
	for (let r = 0; r < m; r++)
		for (let c = 0; c < n; c++) {
			if (!ok(r, c)) continue;
			let h = false,
				v = false;
			for (let d = -2; d <= 0; d++) {
				if (ok(r, c + d) && ok(r, c + d + 1) && ok(r, c + d + 2)) h = true;
				if (ok(r + d, c) && ok(r + d + 1, c) && ok(r + d + 2, c)) v = true;
			}
			if (!h && !v) return false;
		}
	return true;
}

function setBoardSize(cols, rows) {
	COLS = cols;
	ROWS = rows || cols;
}

// ---- helpers: the words the rules are written in ---------------------------
// Small functions that every rule below uses, so a badge power, a hardship or
// a special says what it does in a line or two ("pick n bare stones and
// thicken them") and the fiddly parts (rows and columns, the edge of the
// board, keeping the total right) are written once. A new rule should be
// made of these; a new helper belongs here, beside its kind, with its twin in
// godot/rules/rules.gd. Lists of squares are always in board order, top left
// first, so the same random numbers pick the same squares.

// -- where a square is --
function rowOf(sq) {
	return (sq / COLS) | 0;
}

function colOf(sq) {
	return sq % COLS;
}

function onBoard(row, col) {
	return row >= 0 && col >= 0 && row < ROWS && col < COLS;
}

// the square at a row and column, or -1 off the board
function squareAt(row, col) {
	return onBoard(row, col) ? row * COLS + col : -1;
}

// -- squares near a square --
// the four squares beside it (above, below, left, right) that are on the board
function neighbours(sq) {
	const row = rowOf(sq),
		col = colOf(sq);
	return [
		[row - 1, col],
		[row + 1, col],
		[row, col - 1],
		[row, col + 1],
	]
		.filter(([r, c]) => onBoard(r, c))
		.map(([r, c]) => r * COLS + c);
}

// every square within reach of it, itself included: reach 1 is the block of
// nine around it, reach 2 the block of twenty-five
function around(sq, reach = 1) {
	const row = rowOf(sq),
		col = colOf(sq),
		out = [];
	for (let dr = -reach; dr <= reach; dr++)
		for (let dc = -reach; dc <= reach; dc++)
			if (onBoard(row + dr, col + dc)) out.push((row + dr) * COLS + col + dc);
	return out;
}

// -- lines of squares --
function rowSquares(row) {
	const out = [];
	for (let col = 0; col < COLS; col++) out.push(row * COLS + col);
	return out;
}

function colSquares(col) {
	const out = [];
	for (let row = 0; row < ROWS; row++) out.push(row * COLS + col);
	return out;
}

// both diagonals through a square, out to the edges (the square itself twice)
function diagonalSquares(sq) {
	const row = rowOf(sq),
		col = colOf(sq),
		m = Math.max(COLS, ROWS),
		out = [];
	for (let d = -m; d <= m; d++)
		for (const c of [col + d, col - d]) if (onBoard(row + d, c)) out.push((row + d) * COLS + c);
	return out;
}

// -- squares of the floor, by what is on them --
// the squares of the floor (not the gaps) for which test(sq, tile) holds
function squaresWhere(core, test) {
	const out = [];
	for (let sq = 0; sq < COLS * ROWS; sq++) if (core.mask[sq] && test(sq, core.cells[sq])) out.push(sq);
	return out;
}

// floor squares on the edge of the floor: beside a gap or the board's edge
function edgeOfFloor(core) {
	return squaresWhere(core, sq => neighbours(sq).length < 4 || neighbours(sq).some(j => !core.mask[j]));
}

function bareStones(core) {
	return squaresWhere(core, sq => core.floor[sq] === 1);
}

function thickStones(core) {
	return squaresWhere(core, sq => core.floor[sq] >= 2);
}

// stones still to gild, bare or thick
function stonesLeft(core) {
	return squaresWhere(core, sq => core.floor[sq] > 0);
}

function gildedSquares(core) {
	return squaresWhere(core, sq => core.floor[sq] === 0);
}

// amulets with no special, no badge and no cover
function plainAmulets(core) {
	return squaresWhere(core, (sq, tile) => tile && !tile.special && !tile.cover);
}

// amulets under a cover (under that cover, given its id)
function coveredAmulets(core, id) {
	return squaresWhere(core, (sq, tile) => tile && tile.cover && (!id || tile.cover === id));
}

function amuletsOfType(core, type) {
	return squaresWhere(core, (sq, tile) => tile && tile.type === type);
}

// -- choosing at random --
// the list itself, shuffled (the same shuffle everywhere: one random number
// for each place from the end, so both versions of the game agree)
function shuffled(list) {
	for (let i = list.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[list[i], list[j]] = [list[j], list[i]];
	}
	return list;
}

// n of them, chosen at random (all of them, if there are no more)
function pickSome(list, n) {
	return shuffled(list).slice(0, n);
}

// one of them, chosen at random, or -1 if there are none
function pickOne(list) {
	return list.length ? list[Math.floor(Math.random() * list.length)] : -1;
}

// -- changing the floor and the amulets --
// a bare stone becomes thick (it then needs two matches)
function thicken(core, sq) {
	if (core.floor[sq] !== 1) return false;
	core.floor[sq] = 2;
	core.total++;
	return true;
}

// the amulet on a square is held under a cover (COVERS, content/covers/)
function coverAmulet(core, sq, id) {
	const tile = core.cells[sq];
	tile.cover = id;
	tile.layers = COVERS[id].layers;
}

// one layer of an amulet's cover breaks; the last frees it. Returns what the
// game shows: the square, the cover, and the layers left.
function breakCover(tile, sq) {
	const cover = tile.cover;
	tile.layers--;
	if (tile.layers <= 0) uncover(tile);
	return { k: sq, cover, left: tile.layers };
}

function uncover(tile) {
	tile.cover = null;
	tile.layers = 0;
}

// the amulet on a square becomes a special (h, v, bomb, sun or star) or wears
// a badge; any cover comes off
function makeSpecial(core, sq, special) {
	const tile = core.cells[sq];
	uncover(tile);
	tile.special = special;
	if (special === 'sun') tile.type = SUN_TYPE;
}

// Covers n plain amulets, chosen at random (from among `from`, if given), with
// a cover. One that would leave no possible move stays uncovered. Returns the
// squares covered.
function coverAmulets(core, n, id, from) {
	const done = [];
	if (!id) return done;
	for (const sq of shuffled(from || plainAmulets(core))) {
		if (done.length >= n) break;
		coverAmulet(core, sq, id);
		if (core.hasMove()) done.push(sq);
		else uncover(core.cells[sq]);
	}
	return done;
}

// ---- covers: what an amulet can be held in (content/covers/) ---------------
// A cover holds the amulet under it: as sand in a tomb or water in an oasis.
// Each is a content file; what it does is in its fields:
//   layers     how many hits break it (a hit takes one layer)
//   brokenBy   'beside': a clear on it or beside it is a hit; 'on': only on it
//   matches    the held amulet still counts in a run where it lies (it is
//              never taken while covered: the run breaks a layer instead)
//   spreads    after a move in which no cover of its kind broke, it grows onto
//              one plain amulet beside it
//   letters    its letters in a floor plan: [on bare stone, on thick stone]
// A held amulet can't be moved and fires no power; the board shuffles round it.
//   COVERS[id]: {id, name, text, popup, layers, brokenBy, matches, spreads,
//               letters, sound, burst, shownOn}
const COVERS = {};
(CONTENT.covers || []).forEach(c => (COVERS[c.id] = c));
const COVER_IDS = Object.keys(COVERS);
// the letter in a floor plan -> [the cover, the stone under it]
const COVER_LETTERS = {};
COVER_IDS.forEach(id => COVERS[id].letters.forEach((ch, i) => (COVER_LETTERS[ch] = [id, i + 1])));

// how many layers of stone a letter of a floor plan stands for
function planStone(ch) {
	if (ch === '.') return 0;
	return COVER_LETTERS[ch] ? COVER_LETTERS[ch][1] : +ch;
}

// whether an amulet is held so that it matches nothing
function held(tile) {
	return !!tile.cover && !COVERS[tile.cover].matches;
}

const COMBO = new Set(['h', 'v', 'bomb', 'sun', 'star']);
// ---- specials: what the special amulets do ----------------------------------
// A run of four makes a band (h across, v down), an L or T a ring (bomb), one
// with an arm of four a star, a run of five a sun (see clearStep). Cleared,
// each fires its power, written as a badge power is (below): fire(core, at)
// adds the squares it clears to at.aff. A new special needs a power here, a
// rule in clearStep for what makes it, and its picture (SPECIAL_PICTURES in
// build.py; drawTile in src/game/19-draw.js).
const SPECIAL_POWERS = {
	// the whole row
	h: { fire: (core, at) => at.aff.push(...rowSquares(at.r)) },
	// the whole column
	v: { fire: (core, at) => at.aff.push(...colSquares(at.c)) },
	// the nine squares around it
	bomb: { fire: (core, at) => at.aff.push(...around(at.k)) },
	// both diagonals
	star: { fire: (core, at) => at.aff.push(...diagonalSquares(at.k)) },
	// every amulet of the kind most common on the board (swapped with an
	// amulet, a sun takes that amulet's kind instead: see clearStep)
	sun: {
		fire: (core, at) => {
			const count = new Array(core.types).fill(0);
			core.cells.forEach((tile, sq) => {
				if (tile && tile.type < SUN_TYPE && !at.clear.has(sq)) count[tile.type]++;
			});
			let most = 0;
			count.forEach((n, type) => {
				if (n > count[most]) most = type;
			});
			at.aff.push(...amuletsOfType(core, most));
		},
	},
};
// ---- badges ----------------------------------------------------------------
// A badge is a small mark an amulet can fall wearing; clearing the amulet uses
// its power. The badges are content files (content/badges/): each has its
// words, its weight (how often it turns up when a badge does), its glow
// colour, and one of the powers below. Most are gifts. The cursed ones
// (BAD_BADGES) are deliberately rare: about one badge in fifty, so roughly one
// every four or five stops on Normal, and never on Relaxed or in river events.
// They wear a red ring so a careful player can steer round them; a careless
// cascade may not.
//
// For each power: `amount` is the number it uses when the badge's file gives
// none, and fire(core, at, n) does it. `at` is where it fires and what this
// clearing has done so far: {k, r, c} the square, its row and column; `aff`,
// the squares it clears (push to it); `clear`, those already clearing;
// `extraGild` and `unGild`, stones badges gild or un-gild this turn; `brush`,
// covered amulets whose cover loses a layer; `coverLater`, [square, cover]
// for amulets covered once the clearing is done. fire()
// returns what the game shows (src/game/21-moves.js, BADGE_SHOWS): the amount
// that took effect (n) and the stones it touched (targets). A new kind of
// badge needs a power here and a way to show it there; build.py reads the
// names from this list.
const BADGE_POWERS = {
	// golden light gilds n bare stones anywhere
	gild_stones: {
		amount: 4,
		fire: (core, at, n) => gildLater(at, pickSome(stonesFree(core, at), n)),
	},
	// gilds the stones in the nine squares around it
	gild_around: {
		fire: (core, at) =>
			gildLater(
				at,
				around(at.k).filter(sq => isFree(core, at, sq)),
			),
	},
	// gilds the stones in the n squares around it on every side (2: the
	// twenty-five around it)
	gild_wide: {
		amount: 2,
		fire: (core, at, n) =>
			gildLater(
				at,
				around(at.k, n).filter(sq => isFree(core, at, sq)),
			),
	},
	// gilds the stones in its row and its column, clearing nothing
	gild_row_and_column: {
		fire: (core, at) =>
			gildLater(
				at,
				[...rowSquares(at.r), ...colSquares(at.c)].filter(
					(sq, i, all) => all.indexOf(sq) === i && isFree(core, at, sq),
				),
			),
	},
	// clears the whole row and the whole column it sits in
	row_and_column: {
		fire: (core, at) => {
			at.aff.push(...rowSquares(at.r), ...colSquares(at.c));
			return {};
		},
	},
	// clears the n squares around it on every side (1: the nine around it)
	clear_around: {
		amount: 1,
		fire: (core, at, n) => {
			at.aff.push(...around(at.k, n));
			return {};
		},
	},
	// clears every amulet of its own kind
	clear_its_kind: {
		fire: (core, at) => {
			at.aff.push(...amuletsOfType(core, core.cells[at.k].type));
			return {};
		},
	},
	// breaks one layer of every cover on the board
	break_covers: {
		fire: (core, at) => {
			const targets = coveredAmulets(core);
			at.brush.push(...targets);
			return { n: targets.length, targets };
		},
	},
	// n more moves
	extra_moves: {
		amount: 3,
		fire: (core, at, n) => {
			core.movesLeft += n;
			return { n };
		},
	},
	// n lapis into the purse (the game pays it, when it shows the badge)
	give_lapis: {
		amount: 3,
		fire: (core, at, n) => ({ n }),
	},
	// n moves lost, but never the last one
	lose_moves: {
		amount: 2,
		fire: (core, at, n) => {
			const lost = Math.min(n, Math.max(0, core.movesLeft - 1));
			core.movesLeft -= lost;
			return { n: lost };
		},
	},
	// n gilded stones, not being gilded right now, turn bare again
	ungild_stones: {
		amount: 3,
		fire: (core, at, n) => {
			const picked = pickSome(
				gildedSquares(core).filter(sq => !at.clear.has(sq) && !at.unGild.includes(sq)),
				n,
			);
			at.unGild.push(...picked);
			return { targets: picked };
		},
	},
	// n bare stones, not being gilded right now, turn thick
	thicken_stones: {
		amount: 3,
		fire: (core, at, n) => {
			const picked = pickSome(
				bareStones(core).filter(sq => !at.clear.has(sq) && !at.extraGild.includes(sq)),
				n,
			);
			picked.forEach(sq => thicken(core, sq));
			return { n: picked.length, targets: picked };
		},
	},
	// n plain amulets, not being cleared, are covered with the game's first
	// cover (content/covers/) once this clearing is done
	cover_amulets: {
		amount: 2,
		fire: (core, at, n) => {
			const id = COVER_IDS[0];
			if (!id) return { n: 0, targets: [] };
			const picked = pickSome(
				plainAmulets(core).filter(sq => !at.clear.has(sq) && !at.aff.includes(sq)),
				n,
			);
			picked.forEach(sq => at.coverLater.push([sq, id]));
			return { n: picked.length, targets: picked };
		},
	},
};

// For the badge powers: the stones that can still be gilded this turn (not
// gold, not being gilded or cleared already), and whether a square is one.
function isFree(core, at, sq) {
	return core.mask[sq] && core.floor[sq] > 0 && !at.clear.has(sq) && !at.extraGild.includes(sq);
}

function stonesFree(core, at) {
	return squaresWhere(core, sq => isFree(core, at, sq));
}

// the stones are gilded once this clearing is done; returns what the game shows
function gildLater(at, squares) {
	at.extraGild.push(...squares);
	return { targets: squares };
}

//   BADGES[id]: {id, name, looks, text, effect, n, popup, popupNone, cursed, weight, colour}
const BADGES = {};
CONTENT.badges.forEach(b => {
	const n = b.amount || BADGE_POWERS[b.effect].amount;
	BADGES[b.id] = Object.assign({}, b, { n, text: fill(b.text, { n }) });
});
const BADGE_WEIGHTS = {};
CONTENT.badges.forEach(b => (BADGE_WEIGHTS[b.id] = b.weight));
const POWERS = Object.keys(BADGES),
	BAD_BADGES = POWERS.filter(id => BADGES[id].cursed),
	MAX_GOOD_BADGES = CONTENT.settings.maxGoodBadges;
// badMult makes the cursed ones more likely (an omen, more_cursed_badges)
function pickBadge(allowBad, badMult = 1) {
	const pool = POWERS.filter(b => BADGE_WEIGHTS[b] > 0 && (allowBad || !BAD_BADGES.includes(b))),
		w = b => BADGE_WEIGHTS[b] * (BAD_BADGES.includes(b) ? badMult : 1);
	let r = Math.random() * pool.reduce((a, b) => a + w(b), 0);
	for (const b of pool) {
		r -= w(b);
		if (r < 0) return b;
	}
	return pool[0];
}

// The stops, in journey order (content/stops/). Each has: id, name, sub,
// fact, moves, types (the number of amulets), set (their names), x/y/anchor
// on the map, map (its own 8x8 floor plan), shapes, floor (stone colour),
// audio {root, scale, inst}, scene, backing and frame (read in 03 and 04).
const LEVELS = CONTENT.stops;

class Core {
	constructor(level, opts = {}) {
		this.level = level;
		this.types = level.types;
		this.badBadges = !!opts.badBadges;
		this.badMult = opts.badMult || 1;
		this.mask = new Array(COLS * ROWS).fill(false);
		this.floor = new Array(COLS * ROWS).fill(0);
		this.cells = new Array(COLS * ROWS).fill(null);
		// a cover's letters in a floor plan (COVER_LETTERS) are stone with an
		// amulet under that cover when the board is first filled: [square, cover]
		this.coverAt = [];
		(opts.map || level.map).forEach((row, r) => {
			for (let col = 0; col < COLS; col++) {
				const ch = row[col],
					sq = r * COLS + col;
				if (ch !== '.') {
					this.mask[sq] = true;
					this.floor[sq] = planStone(ch);
					if (COVER_LETTERS[ch]) this.coverAt.push([sq, COVER_LETTERS[ch][0]]);
				}
			}
		});
		this.total = this.floor.reduce((a, b) => a + b, 0);
		this.score = 0; // Move budget scales with how much floor there is to gild, so new plans and
		// new board modes need no hand tuning.
		// Floors built from the stop's own plan scale against that plan. Generated
		// floors (Ruins, Omega) don't resemble it, so they scale against a common
		// reference size instead, or stops with big plans of their own lose out.
		const baseTotal =
			opts.refTotal ||
			level.map
				.join('')
				.split('')
				.reduce((a, ch) => a + planStone(ch), 0) ||
			1;
		// generated floors budget from a common base, with more for six amulet types,
		// which cascade far less on a big floor than five do
		const baseMoves = opts.refMoves ? opts.refMoves * (this.types >= 6 ? 1.9 : 1) : level.moves;
		this.startMoves = Math.max(
			8,
			Math.round(
				baseMoves *
					MOVE_TUNING.base *
					(opts.modeMoves || 1) *
					(opts.movesMult || 1) *
					(opts.ease || 1) *
					Math.pow(this.total / baseTotal, opts.sizeExp != null ? opts.sizeExp : MOVE_TUNING.size) *
					Math.pow(Math.min(1, COLS / ROWS), opts.tall != null ? opts.tall : MOVE_TUNING.tall) *
					(opts.areaCap ? Math.pow(Math.min(1, opts.areaCap / (COLS * ROWS)), 0.5) : 1),
			) +
				(opts.movesBonus || 0) -
				(opts.movesPenalty || 0),
		);
		this.movesLeft = this.startMoves;
		this.uid = 1;
		this.powerChance = opts.powerChance != null ? opts.powerChance : 0.03;
	}
	clone() {
		const o = Object.create(Core.prototype);
		Object.assign(o, this);
		o.mask = this.mask.slice();
		o.floor = this.floor.slice();
		o.cells = this.cells.map(tile =>
			tile
				? {
						type: tile.type,
						special: tile.special,
						id: tile.id,
						cover: tile.cover || null,
						layers: tile.layers || 0,
					}
				: null,
		);
		return o;
	}
	newTile(type) {
		return {
			type: type == null ? Math.floor(Math.random() * this.types) : type,
			special: null,
			id: this.uid++,
		};
	}
	t(row, col) {
		if (row < 0 || col < 0 || row >= ROWS || col >= COLS) return null;
		return this.cells[row * COLS + col];
	}
	// an amulet under a cover (COVERS) can't be moved, and is in no run unless
	// its cover lets it match (see clearStep for how covers break)
	typeAt(row, col) {
		const tile = this.t(row, col);
		return tile && tile.type !== SUN_TYPE && !held(tile) ? tile.type : -1;
	}
	remaining() {
		let s = 0;
		for (let sq = 0; sq < COLS * ROWS; sq++) if (this.mask[sq]) s += this.floor[sq];
		return s;
	}
	won() {
		return this.remaining() === 0;
	}
	fill() {
		for (let tries = 0; tries < 300; tries++) {
			for (let row = 0; row < ROWS; row++)
				for (let col = 0; col < COLS; col++) {
					const sq = row * COLS + col;
					if (!this.mask[sq]) {
						this.cells[sq] = null;
						continue;
					}
					const opts = [];
					for (let ty = 0; ty < this.types; ty++) {
						if (this.typeAt(row, col - 1) === ty && this.typeAt(row, col - 2) === ty) continue;
						if (this.typeAt(row - 1, col) === ty && this.typeAt(row - 2, col) === ty) continue;
						opts.push(ty);
					}
					this.cells[sq] = this.newTile(opts[Math.floor(Math.random() * opts.length)]);
				}
			this.coverAt.forEach(([sq, id]) => {
				if (this.cells[sq]) coverAmulet(this, sq, id);
			});
			if (this.hasMove()) return;
		}
	}
	lineLen(row, col, dr, dc, ty) {
		let n = 0;
		row += dr;
		col += dc;
		while (this.typeAt(row, col) === ty) {
			n++;
			row += dr;
			col += dc;
		}
		return n;
	}
	runAt(sq) {
		const row = (sq / COLS) | 0,
			col = sq % COLS,
			ty = this.typeAt(row, col);
		if (ty < 0) return false;
		return (
			1 + this.lineLen(row, col, 0, -1, ty) + this.lineLen(row, col, 0, 1, ty) >= 3 ||
			1 + this.lineLen(row, col, -1, 0, ty) + this.lineLen(row, col, 1, 0, ty) >= 3
		);
	}
	swap(a, b) {
		const tile = this.cells[a];
		this.cells[a] = this.cells[b];
		this.cells[b] = tile;
	}
	adjacent(a, b) {
		const ra = (a / COLS) | 0,
			ca = a % COLS,
			rb = (b / COLS) | 0,
			cb = b % COLS;
		return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
	}
	isValid(a, b) {
		if (!this.adjacent(a, b)) return false;
		const ta = this.cells[a],
			tb = this.cells[b];
		if (!ta || !tb || ta.cover || tb.cover) return false;
		if (ta.special === 'sun' || tb.special === 'sun') return true;
		if (COMBO.has(ta.special) && COMBO.has(tb.special)) return true;
		this.swap(a, b);
		const ok = this.runAt(a) || this.runAt(b);
		this.swap(a, b);
		return ok;
	}
	allMoves() {
		const m = [];
		for (let sq = 0; sq < COLS * ROWS; sq++) {
			const row = (sq / COLS) | 0,
				col = sq % COLS;
			if (col < COLS - 1 && this.isValid(sq, sq + 1)) m.push([sq, sq + 1]);
			if (row < ROWS - 1 && this.isValid(sq, sq + COLS)) m.push([sq, sq + COLS]);
		}
		return m;
	}
	hasMove() {
		for (let sq = 0; sq < COLS * ROWS; sq++) {
			const row = (sq / COLS) | 0,
				col = sq % COLS;
			if (col < COLS - 1 && this.isValid(sq, sq + 1)) return true;
			if (row < ROWS - 1 && this.isValid(sq, sq + COLS)) return true;
		}
		return false;
	}
	findRuns() {
		const runs = [];
		for (let row = 0; row < ROWS; row++) {
			let col = 0;
			while (col < COLS) {
				const ty = this.typeAt(row, col);
				if (ty < 0) {
					col++;
					continue;
				}
				let e = col + 1;
				while (e < COLS && this.typeAt(row, e) === ty) e++;
				if (e - col >= 3) {
					const cells = [];
					for (let x = col; x < e; x++) cells.push(row * COLS + x);
					runs.push({ dir: 'h', cells });
				}
				col = e;
			}
		}
		for (let col = 0; col < COLS; col++) {
			let row = 0;
			while (row < ROWS) {
				const ty = this.typeAt(row, col);
				if (ty < 0) {
					row++;
					continue;
				}
				let e = row + 1;
				while (e < ROWS && this.typeAt(e, col) === ty) e++;
				if (e - row >= 3) {
					const cells = [];
					for (let y = row; y < e; y++) cells.push(y * COLS + col);
					runs.push({ dir: 'v', cells });
				}
				row = e;
			}
		}
		return runs;
	}
	// One clearing step. Returns null if nothing to clear.
	clearStep(swap, mult = 1, seed = null) {
		const clear = new Set(),
			created = new Map(),
			triggered = new Set(),
			fired = [],
			extraGild = [],
			unGild = [],
			brush = [],
			coverLater = [];
		if (swap) {
			const [a, b] = swap,
				ta = this.cells[a],
				tb = this.cells[b];
			if (ta && tb && (ta.special === 'sun' || tb.special === 'sun')) {
				const s = ta.special === 'sun' ? a : b,
					o = s === a ? b : a,
					to = this.cells[o];
				clear.add(s);
				triggered.add(s);
				fired.push({ k: s, kind: 'sun' });
				if (to.special === 'sun') {
					this.cells.forEach((tile, sq) => {
						if (tile) clear.add(sq);
					});
					triggered.add(o);
				} else {
					const ty = to.type;
					this.cells.forEach((tile, sq) => {
						if (tile && tile.type === ty) clear.add(sq);
					});
				}
			} else if (ta && tb && COMBO.has(ta.special) && COMBO.has(tb.special)) {
				clear.add(a);
				clear.add(b);
			}
		}
		if (!clear.size && seed) {
			seed.forEach(sq => {
				if (this.cells[sq]) clear.add(sq);
			});
		}
		if (!clear.size) {
			const runs = this.findRuns();
			if (!runs.length) return null;
			const prefer = new Set(swap || []);
			const cellRuns = new Map();
			runs.forEach((run, i) =>
				run.cells.forEach(sq => {
					clear.add(sq);
					if (!cellRuns.has(sq)) cellRuns.set(sq, []);
					cellRuns.get(sq).push(i);
				}),
			);
			const used = new Set();
			const place = (cands, special) => {
				for (const sq of cands) {
					const tile = this.cells[sq];
					if (tile && !tile.special && !created.has(sq)) {
						created.set(sq, special);
						return true;
					}
				}
				return false;
			};
			for (const [k, ids] of cellRuns) {
				if (ids.length < 2 || ids.some(i => used.has(i))) continue;
				const big = ids.some(i => runs[i].cells.length >= 5);
				// an L or T with an arm of four: the rare star
				const star = !big && ids.some(i => runs[i].cells.length >= 4);
				if (place([k, ...ids.flatMap(i => runs[i].cells)], big ? 'sun' : star ? 'star' : 'bomb'))
					ids.forEach(i => used.add(i));
			}
			runs.forEach((run, i) => {
				if (used.has(i) || run.cells.length < 4) return;
				const L = run.cells.length,
					pref = run.cells.filter(sq => prefer.has(sq)),
					mid = run.cells[(L - 1) >> 1];
				place([...pref, mid, ...run.cells], L >= 5 ? 'sun' : run.dir);
				used.add(i);
			});
		}
		const queue = [...clear].filter(
			sq =>
				this.cells[sq] &&
				this.cells[sq].special &&
				!this.cells[sq].cover &&
				!triggered.has(sq) &&
				!created.has(sq),
		);
		while (queue.length) {
			const sq = queue.shift();
			if (triggered.has(sq)) continue;
			triggered.add(sq);
			const tile = this.cells[sq],
				aff = [],
				at = { k: sq, r: rowOf(sq), c: colOf(sq), aff, clear, extraGild, unGild, brush, coverLater };
			if (SPECIAL_POWERS[tile.special]) {
				SPECIAL_POWERS[tile.special].fire(this, at);
				fired.push({ k: sq, kind: tile.special });
			} else if (BADGES[tile.special]) {
				// a badge: its power (BADGE_POWERS, above)
				const b = BADGES[tile.special];
				const shown = BADGE_POWERS[b.effect].fire(this, at, b.n);
				fired.push(Object.assign({ k: sq, kind: tile.special, effect: b.effect }, shown));
			}
			for (const a of aff) {
				const u = this.cells[a];
				if (!u || created.has(a)) continue;
				clear.add(a);
				if (u.special && !u.cover && !triggered.has(a)) queue.push(a);
			}
		}
		// covers: a covered amulet caught in the clear is not taken; its cover
		// loses a layer instead, and so does one beside anything cleared if its
		// cover breaks so, and one a badge brushed. One layer a step at most.
		// Its stone is gilded later, when the amulet itself is matched.
		const brushed = [],
			hit = new Set();
		const hitCover = sq => {
			const tile = this.cells[sq];
			if (!tile || !tile.cover || hit.has(sq)) return;
			hit.add(sq);
			brushed.push(breakCover(tile, sq));
		};
		for (const sq of [...clear]) {
			if (this.cells[sq] && this.cells[sq].cover) {
				clear.delete(sq);
				hitCover(sq);
			}
		}
		for (const sq of clear)
			for (const j of neighbours(sq)) {
				const tile = this.cells[j];
				if (tile && tile.cover && COVERS[tile.cover].brokenBy === 'beside' && !clear.has(j))
					hitCover(j);
			}
		brush.forEach(hitCover);
		const cleared = [];
		for (const sq of clear) {
			if (created.has(sq)) continue;
			cleared.push({ k: sq, tile: this.cells[sq] });
			this.cells[sq] = null;
		}
		const gild = [];
		for (const sq of clear) {
			if (this.mask[sq] && this.floor[sq] > 0) {
				this.floor[sq]--;
				gild.push({ k: sq, now: this.floor[sq] });
			}
		}
		for (const sq of extraGild) {
			if (this.floor[sq] > 0) {
				this.floor[sq]--;
				gild.push({ k: sq, now: this.floor[sq], blessed: true });
			}
		}
		const buried = [];
		for (const sq of unGild) {
			if (this.floor[sq] === 0 && !gild.some(g => g.k === sq)) {
				this.floor[sq] = 1;
				buried.push(sq);
			}
		}
		const made = [];
		for (const [k, s] of created) {
			makeSpecial(this, k, s);
			made.push({ k, tile: this.cells[k] });
		}
		// amulets a badge covers (cover_amulets), if they are still there
		const covered = [];
		for (const [sq, id] of coverLater)
			if (this.cells[sq] && !this.cells[sq].cover && !created.has(sq)) {
				coverAmulet(this, sq, id);
				covered.push(sq);
			}
		const pts = (cleared.length + made.length) * 10 * mult + made.length * 40 + gild.length * 5;
		this.score += pts;
		return { cleared, made, gild, pts, fired, buried, brushed, covered };
	}
	gravity() {
		const moves = [],
			spawns = [];
		for (let col = 0; col < COLS; col++) {
			const rows = [];
			for (let row = 0; row < ROWS; row++) if (this.mask[row * COLS + col]) rows.push(row);
			const tiles = [];
			for (let i = rows.length - 1; i >= 0; i--) {
				const sq = this.cells[rows[i] * COLS + col];
				if (sq) tiles.push(sq);
			}
			const numNew = rows.length - tiles.length;
			for (let j = 0; j < rows.length; j++) {
				const idx = rows.length - 1 - j,
					row = rows[idx],
					sq = row * COLS + col;
				if (j < tiles.length) {
					const tile = tiles[j];
					if (this.cells[sq] !== tile) moves.push({ tile: tile, k: sq });
					this.cells[sq] = tile;
				} else {
					const tile = this.newTile();
					this.cells[sq] = tile;
					spawns.push({ tile: tile, k: sq, startRow: idx - numNew });
					if (
						this.powerChance &&
						Math.random() < this.powerChance &&
						this.powerCount() < MAX_GOOD_BADGES
					)
						tile.special = pickBadge(this.badBadges && !this.curseOnBoard(), this.badMult);
				}
			}
		}
		return { moves, spawns };
	}
	// the two-badge limit counts only the good badges, so a curse the player is
	// steering round never blocks a gift from falling; and one curse at a time
	powerCount() {
		let n = 0;
		for (const tile of this.cells)
			if (tile && POWERS.includes(tile.special) && !BAD_BADGES.includes(tile.special)) n++;
		return n;
	}
	curseOnBoard() {
		return this.cells.some(tile => tile && BAD_BADGES.includes(tile.special));
	}
	shuffle() {
		const ks = [];
		for (let sq = 0; sq < COLS * ROWS; sq++)
			if (this.mask[sq] && !(this.cells[sq] && this.cells[sq].cover)) ks.push(sq); // covered amulets stay put
		const tiles = ks.map(sq => this.cells[sq]);
		for (let tries = 0; tries < 300; tries++) {
			for (let i = tiles.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[tiles[i], tiles[j]] = [tiles[j], tiles[i]];
			}
			ks.forEach((sq, i) => (this.cells[sq] = tiles[i]));
			if (!this.findRuns().length && this.hasMove()) return;
		}
		this.fill();
	}
	// After a move: each kind of cover that spreads, and of which none broke
	// during the move (broken: a Set of cover ids), grows onto one plain amulet
	// beside one of its own, chosen at random. Returns [{k, cover}].
	spread(broken) {
		const grown = [];
		COVER_IDS.forEach(id => {
			if (!COVERS[id].spreads || broken.has(id)) return;
			const from = coveredAmulets(this, id);
			if (!from.length) return;
			const beside = plainAmulets(this).filter(sq => neighbours(sq).some(j => from.includes(j)));
			const sq = pickOne(beside);
			if (sq < 0) return;
			coverAmulet(this, sq, id);
			grown.push({ k: sq, cover: id });
		});
		return grown;
	}
	// One whole move with nothing shown, as the simulators and tests play it:
	// swap, clear and fall until the board is still, let covers spread, shuffle
	// a board with no move left, and use up a move. each(res, mult) hears of
	// every clearing step. Returns the number of steps. (The game plays a move
	// the same way, with pictures: attemptSwap and cascade in src/game/21-moves.js.)
	play(a, b, each) {
		this.swap(a, b);
		const broken = new Set();
		let mult = 1,
			res = this.clearStep([a, b], mult);
		while (res) {
			if (each) each(res, mult);
			res.brushed.forEach(c => broken.add(c.cover));
			this.gravity();
			mult++;
			res = this.clearStep(null, mult);
		}
		this.spread(broken);
		if (!this.won() && !this.hasMove()) this.shuffle();
		this.movesLeft--;
		return mult - 1;
	}
}

// name is the id (content/settings.jsonc, conditions); label is the name on
// screen and text what it means (content/text.jsonc)
const DIFFICULTY = CONTENT.settings.difficulty.map(d =>
	Object.assign({}, d, {
		label: T('difficulty_names.' + d.name.toLowerCase()),
		text: T('difficulty.' + d.name.toLowerCase()),
	}),
);
// The trials a stop can offer (content/trials/). `goal` is one of the measures
// tracked in trialProgress() and levelWon() in src/game/; `text` may hold
// {target} and {amulets}, filled in when the trial is offered.
const TRIALS = CONTENT.trials;
// ---- hardships: what curses and omens do ---------------------------------
// A curse is what a failed trial costs at the next stop (content/curses/); an
// omen is a hardship a player chooses to brave, for a richer reward
// (content/omens/). Both are content files, and each chooses one of these
// hardships and gives its n.
//
// A hardship may have two parts:
//   options(o, n)     changes how the stop is built (see stopOptions below)
//   board(core, n, h) changes the board once it is filled (startLevel, in
//                     src/game/05-state.js); h is the curse or omen, whose
//                     "cover" names the cover a hardship uses
// A new kind of hardship needs a new entry here, and nothing else: build.py
// reads the names from this list.
const HARDSHIPS = {
	// n fewer moves
	fewer_moves: {
		options: (o, n) => {
			o.movesPenalty += n;
		},
	},
	// n percent fewer moves
	fewer_moves_percent: {
		options: (o, n) => {
			o.movesMult *= 1 - n / 100;
		},
	},
	// n bare stones, chosen at random, start thick
	thick_stones: {
		board: (core, n) => pickSome(bareStones(core), n).forEach(sq => thicken(core, sq)),
	},
	// one bare stone in n, chosen at random, starts thick
	thick_stones_share: {
		board: (core, n) => {
			const bare = bareStones(core);
			pickSome(bare, Math.ceil(bare.length / n)).forEach(sq => thicken(core, sq));
		},
	},
	// n bare stones along the edge of the floor, chosen at random, start thick
	thick_edges: {
		board: (core, n) =>
			pickSome(
				edgeOfFloor(core).filter(sq => core.floor[sq] === 1),
				n,
			).forEach(sq => thicken(core, sq)),
	},
	// badged amulets fall n percent less often (100: none at all)
	fewer_badges: {
		options: (o, n) => {
			o.powerChance *= 1 - n / 100;
		},
	},
	// cursed badges fall, n times as often (even where they otherwise wouldn't)
	more_cursed_badges: {
		options: (o, n) => {
			o.badBadges = true;
			o.badMult *= n;
		},
	},
	// n amulets, chosen at random, start under a cover (the curse's or omen's
	// "cover", else the game's first), as in a chamber: they can't be moved
	// until the cover is broken. Not before the chambers have arrived, where
	// the player learns about covers.
	buried_amulets: {
		stage: 'chambers',
		board: (core, n, h) => coverAmulets(core, n, h.cover),
	},
	// n amulets along the edge of the floor start under a cover, likewise
	covered_edges: {
		stage: 'chambers',
		board: (core, n, h) => {
			const edge = edgeOfFloor(core);
			coverAmulets(
				core,
				n,
				h.cover,
				plainAmulets(core).filter(sq => edge.includes(sq)),
			);
		},
	},
	// no boons can be used (see armBoon)
	no_boons: {
		board: core => {
			core.noBoons = true;
		},
	},
};

// ---- curses ----------------------------------------------------------------
// `by` is the strength on each of the four difficulties, easiest first.
// A strength of 0 means the curse never falls there.
const CURSES = CONTENT.curses.map(c => ({
	id: c.id,
	name: c.name,
	effect: c.effect,
	cover: c.cover,
	by: c.by,
	text: n => fill(n >= 100 && c.textAll ? c.textAll : c.text, { n }),
}));

// The hardships at a stop: the omens braved, then a curse carried from a
// failed trial (save.curse: {id, n, effect}, found by its id; an older save
// may carry a curse whose file is gone). Each is {effect, n}.
function hardshipsAt(omens, curse) {
	const list = [];
	(omens || []).forEach(id => {
		const o = OMENS.find(x => x.id === id);
		if (o) list.push({ effect: HARDSHIPS[o.effect], n: o.n, cover: o.cover || COVER_IDS[0] });
	});
	if (curse) {
		const c = CURSES.find(x => x.id === curse.id);
		const effect = HARDSHIPS[c ? c.effect : curse.effect];
		if (effect) list.push({ effect, n: curse.n, cover: (c && c.cover) || COVER_IDS[0] });
	}
	return list;
}

// ---- omens: hardships chosen on purpose -----------------------------------
// At a stop already gilded, the player may brave any of these before setting
// out (content/omens/, each choosing one of the HARDSHIPS above). Each one
// braved adds OMEN_BONUS to the gold and lapis the win pays, and the most
// braved at once is remembered for the stop (save.omens[stop id]).
const OMENS = CONTENT.omens.map(o => ({
	id: o.id,
	name: o.name,
	effect: o.effect,
	cover: o.cover,
	n: o.amount,
	text: fill(o.text, { n: o.amount }),
}));
const OMEN_BONUS = CONTENT.settings.omenBonus; // content/settings.jsonc, "omens"

// ---- boons: held powers the player spends ----------------------------------
// The boons are content files (content/boons/): each has its words, its icon
// and one of the effects in BOON_EFFECTS (src/game/07-trials-boons.js), which
// also says whether the player chooses a square for it (`target`).
//   BOONS[id]: {id, short, name, desc, effect, amount, icon, great, popup, popupNone}
const BOONS = {};
CONTENT.boons.forEach(b => {
	BOONS[b.id] = Object.assign({}, b);
});
// The boons a "random" reward can be: those marked "random_reward", the great
// ones, never the small tools (the chisel, the band and Bes are sold at the stall).
const GREAT_BOONS = CONTENT.boons.filter(b => b.great).map(b => b.id);
function randomBoon(pool) {
	pool = !pool || !pool.length || pool.includes('random') ? GREAT_BOONS : pool;
	return pool[Math.floor(Math.random() * pool.length)];
}

// ---- the treasury: lasting upgrades (content/treasury/) --------------------
// Each has a price per level and an `effect`, whose amounts add up across
// every upgrade with that effect: see upgradeTotal().
//   extra_moves   moves at every stop          badge_chance  added to the badge chance
//   trial_chance  added to the trial chance    win_gold / win_lapis  paid for each stop won
const UPGRADES = CONTENT.upgrades;
UPGRADES.forEach(u => {
	u.cost = t => u.prices[Math.min(t, u.prices.length - 1)];
});

function upgradeTotal(effect, owned) {
	return UPGRADES.reduce(
		(a, u) => a + (u.effect === effect ? ((owned || {})[u.id] || 0) * u.amount : 0),
		0,
	);
}

// ---- the stall: one-time purchases (content/stall/) -------------------------
// Prices rise by STALL_RISE each time the same thing is bought during one stop,
// and reset at the next stop, so the stall helps without replacing skill.
// kind: 'now' acts at once, 'boon' adds a boon, 'charge' is held until needed.
// give: {moves:n} | {reshuffle:true} | {boon:[names or 'random']} | {wind:n}
const STALL = CONTENT.stall;
const STALL_RISE = CONTENT.settings.stallRise;
// What playing earns (content/settings.jsonc, "earnings").
const EARN = CONTENT.settings.earn;
// Relics for the museum (content/relics/): `when` says what finds one.
const RELICS = CONTENT.relics;
// Tomb and temple chambers (content/chambers/): a small dim board beside a
// stop, opened once that stop is gilded. `at` is the stop's index.
const CHAMBERS = CONTENT.chambers || [];
// ---- conditions ------------------------------------------------------------
// When a relic is found, and when a look is unlocked, is written as a block of
// conditions in the content files; every one must hold. Counters are "at
// least"; win_* conditions look at the stop just won (save.lastWin).
const CONDITION_COUNTERS = {
	stars: s => (s.stars || []).reduce((a, b) => a + (b || 0), 0),
	three_star_stops: s => (s.stars || []).filter(x => x === 3).length,
	stops_gilded: s => (s.stars || []).filter(Boolean).length,
	stops_won: s => (s.life && s.life.wins) || 0,
	hard_wins: s => (s.life && s.life.hardWins) || 0,
	trials_finished: s => s.trialsDone || 0,
	river_events: s => (s.life && s.life.events) || 0,
	relics_found: s => Object.keys(s.relics || {}).length,
	suns_forged: s => s.suns || 0,
	best_cascade: s => s.bestCascade || 0,
	thick_stones_cracked: s => s.thickCracked || 0,
	gold_earned: s => s.goldEarned || 0,
	chambers_explored: s => Object.keys(s.chambers || {}).length,
	gold_held: s => s.gold || 0,
	lapis_held: s => s.lapis || 0,
	win_streak: s => s.streak || 0,
	journeys: s => s.journeys || 1,
	seals_stamped: s =>
		Object.values(s.seals || {}).reduce((a, v) => a + (v || []).filter(Boolean).length, 0),
	omens_braved: s => Object.values(s.omens || {}).reduce((a, v) => a + (v || 0), 0),
};

function conditionMet(when, s) {
	if (!when) return true;
	const w = s.lastWin;
	for (const k in when) {
		const v = when[k];
		if (CONDITION_COUNTERS[k]) {
			if (CONDITION_COUNTERS[k](s) < v) return false;
			continue;
		}
		if (k === 'relic') {
			if (!(s.relics || {})[v]) return false;
			continue;
		}
		if (!w) return false; // everything else is about the stop just won
		if (k === 'win_moves_to_spare' && !(w.spare >= v)) return false;
		if (k === 'win_on_difficulty' && !((w.difficulty != null ? w.difficulty : s.difficulty) >= v))
			return false;
		if (k === 'win_at_stop' && (w.stop || (LEVELS[w.idx] || {}).id) !== v) return false;
		if (k === 'win_without_boons' && !w.noBoon) return false;
		if (k === 'win_on_board' && (w.board || (w.omega ? 'omega' : '')) !== v) return false;
		if (k === 'win_two_specials_at_once' && !w.duet) return false;
		if (k === 'win_after_failures' && !((w.preFails || 0) >= v)) return false;
		if (k === 'win_with_omens' && !((w.omens || 0) >= v)) return false;
		if (k === 'win_suns_forged' && !((w.suns || 0) >= v)) return false;
		if (k === 'win_best_cascade' && !((w.cascade || 0) >= v)) return false;
		if (k === 'win_specials_made' && !((w.specials || 0) >= v)) return false;
	}
	return true;
}

// ---- amulet sets (cosmetic, earned by playing; content/amulet-sets/) ----
// Each re-renders the same amulet drawings through a canvas filter, so a new
// one costs nothing but a content file. `need` is checked in checkLooks().
const SKINS = CONTENT.skins;
function skinById(id) {
	return SKINS.find(s => s.id === id) || SKINS[0];
}

// ---- board frames (content/frames/): face, shade (lower-right), edge -------
// A frame of null keeps each stop's own carved stone colours.
const FRAMES = CONTENT.frames;
function frameById(id) {
	return FRAMES.find(f => f.id === id) || FRAMES[0];
}

// ---- sparkle colours (content/sparkles/): the two colours a burst uses ----
const SPARKLES = CONTENT.sparkles;
function sparkleById(id) {
	return SPARKLES.find(s => s.id === id) || SPARKLES[0];
}

// ---- amulets: names for the codex and for trials (content/amulets/) ------
// AMULET_INFO[name] = [display name, meaning]; AMULET_NAMES[name] = plural.
const AMULET_INFO = {},
	AMULET_NAMES = {};
Object.entries(CONTENT.amulets).forEach(([id, a]) => {
	AMULET_INFO[id] = [a.name, a.meaning];
	AMULET_NAMES[id] = a.plural;
});

// ---- river events (content/river-events/) --------------------------------
// Between stops, the boat is sometimes interrupted. An event is either a short
// puzzle on its own little board with its own goal, or a choice. Failing a
// puzzle costs nothing but the reward. Kinds of goal:
//   gild     gild the whole (small) floor, as at a stop
//   collect  clear a number of one amulet, named by its picture name
//   score    reach a score within the moves
// `set` optionally replaces the amulets; `fog` plays the board by lamplight;
// `weight` makes an event more (2) or less (0.5) likely than the others.
const EVENTS = CONTENT.events;
const EVENT_CHANCE = CONTENT.settings.eventChance; // how often sailing to the next stop is interrupted
function pickEvent(avoid) {
	const pool = EVENTS.filter(e => e.id !== avoid && (e.weight == null || e.weight > 0));
	if (!pool.length) return null;
	let r = Math.random() * pool.reduce((a, e) => a + (e.weight == null ? 1 : e.weight), 0);
	for (const e of pool) {
		r -= e.weight == null ? 1 : e.weight;
		if (r < 0) return e;
	}
	return pool[pool.length - 1];
}

// ---- persistence: failing a stop makes the next try kinder ------------------
// Consecutive failures at the same stop add moves to the next attempt; the
// second failure also hands over a boon. Winning the stop resets the count.
const PERSISTENCE = CONTENT.settings.persistence;
// On a first journey badges arrive at a later stop (settings.jsonc, "staging").
// The stops are balanced with badges in play, so until they arrive a stop
// gets this many times its moves instead (settings.jsonc, staging,
// "extra_moves_before_badges_percent").
const MOVES_BEFORE_BADGES = CONTENT.settings.movesBeforeBadges || 1;

// ---- building a stop's board ------------------------------------------------
// Everything that shapes a stop's board, in one place. startLevel() in
// src/game/05-state.js builds the player's board with it, and the simulators in tools/
// build theirs with it, so a balance test plays the very stop a player gets.
//   level, idx      the stop and its index; mode (a BOARD_MODES entry)
//   cols, rows      the board's size; shape (from pickShape) and variant (0-4)
//   difficulty      an index into DIFFICULTY; upg, the Treasury upgrades owned
//   fails           failures in a row at this stop (persistence moves)
//   badgesOn, cursesOn   whether those parts of the game have arrived
//   omens, curse    the omens braved and a trial's curse, if any
function persistenceMoves(fails) {
	return Math.min(PERSISTENCE.maxFails, fails || 0) * PERSISTENCE.movesPerFail;
}

function stopOptions(p) {
	const d = DIFFICULTY[p.difficulty],
		mode = p.mode,
		upg = p.upg || {};
	const badges = p.badgesOn !== false;
	const chance = !badges ? 0 : d.powerChance + upgradeTotal('badge_chance', upg);
	const o = {
		map: mode.layout(p.level, p.idx, p.cols, p.rows, p.shape.map, p.variant || 0),
		ease: p.shape.ease,
		modeMoves: mode.moves,
		tall: mode.tall,
		sizeExp: mode.sizeExp,
		refTotal: mode.refTotal,
		refMoves: mode.refMoves,
		areaCap: mode.areaCap,
		movesMult: d.movesMult,
		movesBonus: upgradeTotal('extra_moves', upg) + persistenceMoves(p.fails),
		movesPenalty: 0,
		powerChance: chance,
		badBadges: p.difficulty > 0 && p.cursesOn !== false,
		badMult: 1,
	};
	// the omens braved and a curse carried (HARDSHIPS)
	hardshipsAt(p.omens, p.curse).forEach(h => {
		if (h.effect.options) h.effect.options(o, h.n);
	});
	// more moves until badges arrive (after the hardships, so the sums round as they always have)
	if (!badges) o.movesMult *= MOVES_BEFORE_BADGES;
	return o;
}

// ===== END CORE =====
