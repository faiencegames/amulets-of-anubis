// The rules' own test: every helper, every kind of cover, every badge power
// and every hardship in src/01-core.js, each tried on a small board of its
// own, and checked. Run it after changing the rules:
//
//	node tools/rules-test.js                   with the game the build would build
//	node tools/rules-test.js --game <folder>   with another game
//
// It needs a game with at least one cover (the example has five). It also
// checks that every badge power has a way to show itself in the game
// (BADGE_SHOWS in src/game/21-moves.js). Nothing here is random in a way
// that matters: where a rule picks at random, the test checks what any pick
// must satisfy.

const fs = require('fs'),
	path = require('path');
const args = process.argv.slice(2);
if (args[0] === '--game') process.env.TESSERA_GAME = path.resolve(args[1]);

const K = require('./load-core')([
	'Core', 'setBoardSize', 'COVERS', 'COVER_IDS', 'BADGE_POWERS', 'HARDSHIPS', 'SPECIAL_POWERS', 'rowOf',
	'colOf', 'onBoard', 'squareAt', 'neighbours', 'around', 'rowSquares', 'colSquares', 'diagonalSquares',
	'squaresWhere', 'edgeOfFloor', 'bareStones', 'thickStones', 'stonesLeft', 'gildedSquares', 'plainAmulets',
	'coveredAmulets', 'amuletsOfType', 'shuffled', 'pickSome', 'pickOne', 'thicken', 'coverAmulet', 'breakCover',
	'uncover', 'makeSpecial', 'coverAmulets', 'planStone', 'held',
]);

let passed = 0;
const failed = [];
function check(what, ok) {
	if (ok) passed++;
	else failed.push(what);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A board from a plan, filled, with every amulet's kind set from `kinds` (a
// digit per square, '.' to leave it as filled), so a test knows what is where.
const FLAT = ['11111111', '11111111', '11111111', '11111111', '11111111', '11111111', '11111111', '11111111'];
function board(plan = FLAT, kinds = null) {
	K.setBoardSize(plan[0].length, plan.length);
	const core = new K.Core({ map: plan, moves: 20, types: 5 }, { map: plan, powerChance: 0 });
	core.fill();
	if (kinds)
		kinds.join('').split('').forEach((ch, sq) => {
			if (ch !== '.' && core.cells[sq]) core.cells[sq].type = +ch;
		});
	return core;
}
// a checkerboard of kinds: no runs anywhere
const CHECKER = ['01010101', '23232323', '01010101', '23232323', '01010101', '23232323', '01010101', '23232323'];

// ---- where squares are ----
K.setBoardSize(8, 8);
check('rowOf and colOf', K.rowOf(19) === 2 && K.colOf(19) === 3);
check('squareAt off the board is -1', K.squareAt(-1, 0) === -1 && K.squareAt(0, 8) === -1 && K.squareAt(1, 1) === 9);
check('neighbours of a corner', same(K.neighbours(0), [8, 1]));
check('neighbours in the middle', same(K.neighbours(27), [19, 35, 26, 28]));
check('around, reach 1', same(K.around(9), [0, 1, 2, 8, 9, 10, 16, 17, 18]));
check('around a corner stays on the board', K.around(0).length === 4 && K.around(0, 2).length === 9);
check('around, reach 2', K.around(27, 2).length === 25);
check('rowSquares and colSquares', same(K.rowSquares(1), [8, 9, 10, 11, 12, 13, 14, 15]) && K.colSquares(2)[7] === 58);
check('diagonalSquares from a corner', K.diagonalSquares(0).filter(sq => sq === 63).length === 1);
K.setBoardSize(6, 10);
check('a tall board: rows and columns', K.rowOf(13) === 2 && K.colOf(13) === 1 && K.colSquares(0).length === 10);
check('a tall board: onBoard', K.onBoard(9, 5) && !K.onBoard(5, 6));

// ---- squares by what is on them ----
{
	const core = board(['........', '.111111.', '.122221.', '.120021.', '.122221.', '.111111.', '........', '........']);
	check('bareStones', K.bareStones(core).length === 18);
	check('thickStones', K.thickStones(core).length === 10);
	check('gildedSquares', same(K.gildedSquares(core), [27, 28]));
	check('stonesLeft', K.stonesLeft(core).length === 28);
	check('edgeOfFloor is the ring outside', K.edgeOfFloor(core).length === 18 && K.edgeOfFloor(core).includes(9));
	check('squaresWhere skips the gaps', K.squaresWhere(core, () => true).length === 30);
	check('plainAmulets is every amulet on a new board', K.plainAmulets(core).length === 30);
	const two = K.amuletsOfType(core, core.cells[9].type);
	check('amuletsOfType', two.includes(9) && two.every(sq => core.cells[sq].type === core.cells[9].type));
}

// ---- choosing ----
{
	const list = [1, 2, 3, 4, 5, 6, 7];
	check('shuffled keeps every item', same(K.shuffled(list.slice()).sort(), list));
	const some = K.pickSome(list.slice(), 3);
	check('pickSome picks n different ones', some.length === 3 && new Set(some).size === 3);
	check('pickSome of too few gives them all', K.pickSome([1, 2], 5).length === 2);
	check('pickOne of none is -1', K.pickOne([]) === -1 && list.includes(K.pickOne(list)));
}

// ---- changing ----
{
	const core = board();
	const total = core.total;
	check('thicken a bare stone', K.thicken(core, 0) && core.floor[0] === 2 && core.total === total + 1);
	check('thicken a thick stone does nothing', !K.thicken(core, 0) && core.total === total + 1);
	K.makeSpecial(core, 5, 'sun');
	check('makeSpecial: a sun', core.cells[5].special === 'sun' && core.cells[5].type === 6);
	check('planStone', K.planStone('.') === 0 && K.planStone('2') === 2);
}

// ---- covers ----
check('the game has covers', K.COVER_IDS.length > 0);
K.COVER_IDS.forEach(id => {
	const c = K.COVERS[id];
	check(`${id}: its letters stand for stone and thick stone`, K.planStone(c.letters[0]) === 1 && K.planStone(c.letters[1]) === 2);
	// a board with the cover at square 27, and nothing matching anywhere
	const plan = FLAT.slice();
	plan[3] = '111' + c.letters[0] + '1111';
	const core = board(plan, CHECKER);
	const tile = core.cells[27];
	check(`${id}: a floor plan's letter covers the amulet`, tile.cover === id && tile.layers === c.layers);
	check(`${id}: a covered amulet can't be moved`, !core.isValid(27, 28) && !core.isValid(26, 27));
	check(`${id}: matches in place only if it says so`, (core.typeAt(3, 3) >= 0) === !!c.matches && K.held(tile) === !c.matches);
	// a clear beside it: a hit only for a cover broken "beside"
	let res = core.clearStep(null, 1, [28]);
	const layers = c.brokenBy === 'beside' ? c.layers - 1 : c.layers;
	check(`${id}: a clear beside it is ${c.brokenBy === 'beside' ? '' : 'not '}a hit`, (core.cells[27].layers || 0) === layers);
	// clears on it: never taken, one layer a step, until it is free
	const again = board(plan, CHECKER);
	const kept = again.cells[27];
	for (let i = 0; i < c.layers; i++) {
		res = again.clearStep(null, 1, [27]);
		check(`${id}: a clear on it takes a layer, not the amulet`, again.cells[27] === kept && res.brushed.length === 1 && res.brushed[0].cover === id);
	}
	check(`${id}: after its last layer the amulet is free`, !kept.cover && kept.layers === 0 && again.isValid(27, 28) === again.isValid(27, 28));
	// one layer a step, however many clears touch it
	if (c.layers > 1) {
		const many = board(plan, CHECKER);
		many.clearStep(null, 1, [26, 27, 28, 19, 35]);
		check(`${id}: one layer a step at most`, many.cells[27].layers === c.layers - 1);
	}
	// shuffling leaves it where it is
	const still = board(plan, CHECKER);
	const at = still.cells[27];
	still.shuffle();
	check(`${id}: a shuffle leaves it where it is`, still.cells[27] === at && at.cover === id);
	// spreading
	const grow = board(plan, CHECKER);
	const grown = grow.spread(new Set());
	if (c.spreads) {
		check(`${id}: spreads onto a plain amulet beside it`, grown.length === 1 && K.neighbours(27).includes(grown[0].k) && grow.cells[grown[0].k].cover === id);
		check(`${id}: doesn't spread after a move that broke it`, grow.spread(new Set([id])).length === 0);
	} else check(`${id}: doesn't spread`, grown.length === 0);
	// a cover from the helpers (on a board with moves: one that would leave
	// none stays uncovered)
	const helped = board();
	const done = K.coverAmulets(helped, 4, id);
	check(`${id}: coverAmulets covers n plain amulets`, done.length === 4 && done.every(sq => helped.cells[sq].cover === id));
	check(`${id}: coveredAmulets finds them`, same(K.coveredAmulets(helped, id), done.slice().sort((a, b) => a - b)));
});

// ---- the specials ----
{
	const core = board(FLAT, CHECKER);
	const at = sq => ({ k: sq, r: K.rowOf(sq), c: K.colOf(sq), aff: [], clear: new Set(), extraGild: [], unGild: [], brush: [], coverLater: [] });
	let a = at(27);
	K.SPECIAL_POWERS.h.fire(core, a);
	check('special h: its row', same(a.aff, K.rowSquares(3)));
	a = at(27);
	K.SPECIAL_POWERS.v.fire(core, a);
	check('special v: its column', same(a.aff, K.colSquares(3)));
	a = at(27);
	K.SPECIAL_POWERS.bomb.fire(core, a);
	check('special bomb: the nine around it', a.aff.length === 9);
	a = at(27);
	K.SPECIAL_POWERS.star.fire(core, a);
	check('special star: both diagonals', a.aff.includes(0) && a.aff.includes(63) && a.aff.includes(48) && a.aff.includes(6));
	a = at(27);
	K.SPECIAL_POWERS.sun.fire(core, a);
	const kind = core.cells[a.aff[0]].type;
	check('special sun: every amulet of one kind', a.aff.length === 16 && a.aff.every(sq => core.cells[sq].type === kind));
}

// ---- badge powers ----
{
	const shows = fs.readFileSync(path.join(__dirname, '..', 'src', 'game', '21-moves.js'), 'utf8');
	const block = shows.slice(shows.indexOf('const BADGE_SHOWS = {'));
	Object.keys(K.BADGE_POWERS).forEach(p =>
		check(`badge power ${p} has a way to show itself (BADGE_SHOWS)`, new RegExp('^\\t' + p + ': \\{', 'm').test(block)),
	);
	const fire = (power, n, prepare) => {
		const plan = FLAT.slice();
		plan[1] = '1' + K.COVERS[K.COVER_IDS[0]].letters[0] + '111111';
		const core = board(plan, CHECKER);
		if (prepare) prepare(core);
		const at = { k: 27, r: 3, c: 3, aff: [], clear: new Set([27]), extraGild: [], unGild: [], brush: [], coverLater: [] };
		const shown = K.BADGE_POWERS[power].fire(core, at, n != null ? n : K.BADGE_POWERS[power].amount) || {};
		return { core, at, shown };
	};
	let f = fire('gild_stones', 4);
	check('gild_stones: four free stones', f.at.extraGild.length === 4 && same(f.shown.targets, f.at.extraGild) && !f.at.extraGild.includes(27));
	f = fire('gild_around');
	check('gild_around: the eight around it (its own is clearing)', f.at.extraGild.length === 8);
	f = fire('gild_wide', 2);
	check('gild_wide 2: the twenty-four around it', f.at.extraGild.length === 24);
	f = fire('gild_row_and_column');
	check('gild_row_and_column: fourteen stones, none twice', f.at.extraGild.length === 14 && new Set(f.at.extraGild).size === 14);
	f = fire('row_and_column');
	check('row_and_column: clears its row and column', f.at.aff.length === 16);
	f = fire('clear_around', 2);
	check('clear_around 2: the twenty-five around it', f.at.aff.length === 25);
	f = fire('clear_its_kind');
	check('clear_its_kind: every amulet of its kind', f.at.aff.length === 16 && f.at.aff.every(sq => f.core.cells[sq].type === f.core.cells[27].type));
	f = fire('break_covers');
	check('break_covers: every covered amulet', same(f.at.brush, [9]) && f.shown.n === 1);
	const start = board().movesLeft;
	f = fire('extra_moves', 3);
	check('extra_moves', f.core.movesLeft === start + 3 && f.shown.n === 3);
	f = fire('lose_moves', 2);
	check('lose_moves', f.core.movesLeft === start - 2 && f.shown.n === 2);
	f = fire('lose_moves', 50);
	check('lose_moves never takes the last', f.core.movesLeft === 1);
	f = fire('give_lapis', 3);
	check('give_lapis tells the game how much', f.shown.n === 3);
	f = fire('ungild_stones', 3, core => [1, 2, 3, 4].forEach(sq => (core.floor[sq] = 0)));
	check('ungild_stones: three gilded stones', f.at.unGild.length === 3 && f.at.unGild.every(sq => sq >= 1 && sq <= 4));
	f = fire('thicken_stones', 3);
	check('thicken_stones: three bare stones turn thick', f.shown.n === 3 && f.shown.targets.every(sq => f.core.floor[sq] === 2));
	f = fire('cover_amulets', 2);
	check('cover_amulets: two amulets to cover once the clear is done', f.at.coverLater.length === 2 && f.shown.n === 2);
}

// ---- hardships ----
{
	const h = { cover: K.COVER_IDS[0] };
	let core = board();
	const total = core.total;
	K.HARDSHIPS.thick_stones.board(core, 5, h);
	check('thick_stones: five stones thick', K.thickStones(core).length === 5 && core.total === total + 5);
	core = board();
	K.HARDSHIPS.thick_stones_share.board(core, 4, h);
	check('thick_stones_share: one in four', K.thickStones(core).length === 16);
	core = board();
	K.HARDSHIPS.thick_edges.board(core, 6, h);
	const edge = K.edgeOfFloor(core);
	check('thick_edges: six on the edge', K.thickStones(core).length === 6 && K.thickStones(core).every(sq => edge.includes(sq)));
	core = board();
	K.HARDSHIPS.buried_amulets.board(core, 5, h);
	check('buried_amulets: five covered', K.coveredAmulets(core).length === 5 && core.hasMove());
	core = board();
	K.HARDSHIPS.covered_edges.board(core, 6, h);
	check('covered_edges: six on the edge', K.coveredAmulets(core).length === 6 && K.coveredAmulets(core).every(sq => edge.includes(sq)));
	const o = { movesPenalty: 0, movesMult: 1, powerChance: 0.1, badMult: 1 };
	K.HARDSHIPS.fewer_moves.options(o, 3);
	K.HARDSHIPS.fewer_moves_percent.options(o, 20);
	K.HARDSHIPS.fewer_badges.options(o, 50);
	K.HARDSHIPS.more_cursed_badges.options(o, 2);
	check('the options hardships', o.movesPenalty === 3 && o.movesMult === 0.8 && o.powerChance === 0.05 && o.badBadges && o.badMult === 2);
}

// ---- a whole move ----
{
	const core = board();
	const moves = core.allMoves();
	if (moves.length) {
		const before = core.movesLeft;
		core.play(moves[0][0], moves[0][1]);
		check('play uses a move', core.movesLeft === before - 1);
	}
}

console.log(`${passed} checks passed` + (failed.length ? `, ${failed.length} failed:` : '.'));
failed.forEach(f => console.log('  x ' + f));
process.exit(failed.length ? 1 : 0);
