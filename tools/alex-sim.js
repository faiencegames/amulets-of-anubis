// Win-rate probe for Alexandria (index 11) on Normal.
// Tests: no bonus, all upgrades (Mason's favour ×5 = +5 moves),
//        all upgrades + Wisdom boon (+6), all upgrades + Flood-equivalent.
const fs = require('fs');
const K = require('./load-core')(['LEVELS','Core','DIFFICULTY','setBoardSize','boardMode','pickShape','stopOptions']);

const diff = 1, modeId = 'classic', cols = 8, rows = 8, games = 200;
const D = K.DIFFICULTY[diff], mode = K.boardMode(modeId);
K.setBoardSize(+cols, +rows);
const idx = K.LEVELS.findIndex(L=>L.id==='alexandria'); // Alexandria

function play(core, a, b) {
	core.swap(a, b);
	let m = 1, res = core.clearStep([a, b], m);
	while (res) { core.gravity(); m++; res = core.clearStep(null, m); }
	if (!core.won() && !core.hasMove()) core.shuffle();
	core.movesLeft--;
}

function game(movesBonus) {
	const L = K.LEVELS[idx];
	const shape = K.pickShape(idx);
	// the board as the game builds it (stopOptions in 01-core.js), plus the extra moves tested
	const opts = K.stopOptions({ level: L, idx, mode, cols: +cols, rows: +rows, shape, variant: Math.floor(Math.random() * 5), difficulty: diff });
	opts.movesBonus += movesBonus || 0;
	const core = new K.Core(L, opts);
	core.fill();
	while (core.movesLeft > 0 && !core.won()) {
		const mv = core.allMoves();
		if (!mv.length) { core.shuffle(); continue; }
		let best = null, bv = -1e9;
		for (const [a, b] of mv) {
			const c = core.clone();
			const before = c.remaining();
			play(c, a, b);
			const v = (before - c.remaining()) * 10 + Math.random();
			if (v > bv) { bv = v; best = [a, b]; }
		}
		play(core, best[0], best[1]);
	}
	return core.won();
}

const variants = [
	['No boons, no upgrades', 0],
	['All upgrades (Mason ×5 = +5)', 5],
	['All upgrades + Wisdom (+6)', 11],
	['All upgrades + Flood-equiv (+8 extra gild ≈ +3 moves)', 8],
];

console.log(`Alexandria, Normal, ${cols}x${rows}, ${games} games each:`);
console.log('');
for (const [label, bonus] of variants) {
	let w = 0;
	for (let g = 0; g < games; g++) if (game(bonus)) w++;
	console.log(`${label}: ${Math.round(100 * w / games)}%  (${w}/${games})`);
}
