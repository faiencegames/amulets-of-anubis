// A first journey, as a new player meets it: the parts of the game arrive at
// the stops settings.jsonc says (badges, cursed badges...), a lost stop is
// tried again with the persistence moves, and every board is built by
// stopOptions() in 01-core.js, exactly as the game builds it. It reports, for
// each stop, how often the first try wins and how many tries it takes, on the
// board sizes players see: 8 x 8 (a desktop window) and 8 x 13 (a phone).
//
//	node tools/journey-sim.js                 Normal, 40 journeys per board size
//	node tools/journey-sim.js 1 80            difficulty (0-3), journeys
//	node tools/journey-sim.js 1 40 later      a later journey: everything on
//
// The bot is greedy: it takes the move that gilds most, never plans and never
// spends a boon, so a person should do somewhat better. Aim, on Normal, for a
// first try that wins about 70-80% of the time early on and 60-70% late.

const K = require('./load-core')(['LEVELS', 'Core', 'setBoardSize', 'boardMode', 'pickShape', 'stopOptions', 'CONTENT', 'PERSISTENCE']);
const difficulty = +(process.argv[2] || 1), journeys = +(process.argv[3] || 40), later = process.argv[4] === 'later';
const staging = K.CONTENT.settings.staging, mode = K.boardMode('classic');
// a part of the game is on once the journey has reached its stop (stageOn in src/game/26-stages.js)
const on = (part, i) => later || (typeof staging[part] === 'number' && i >= staging[part]);

const play = (core, a, b) => core.play(a, b);   // one move, as the game plays it (Core.play)
function attempt(i, cols, rows, fails) {
	const L = K.LEVELS[i];
	const core = new K.Core(L, K.stopOptions({
		level: L, idx: i, mode, cols, rows, shape: K.pickShape(i), variant: Math.floor(Math.random() * 5),
		difficulty, fails, badgesOn: on('badges', i), cursesOn: on('curses', i),
	}));
	core.fill();
	while (core.movesLeft > 0 && !core.won()) {
		const moves = core.allMoves();
		if (!moves.length) { core.shuffle(); continue; }
		let best = null, bestValue = -1e9;
		for (const [a, b] of moves) {
			const c = core.clone(), before = c.remaining();
			play(c, a, b);
			const value = (before - c.remaining()) * 10 + Math.random();
			if (value > bestValue) { bestValue = value; best = [a, b]; }
		}
		play(core, best[0], best[1]);
	}
	return core.won();
}
for (const [cols, rows] of [[8, 8], [8, 13]]) {
	K.setBoardSize(cols, rows);
	const firstTry = K.LEVELS.map(() => 0), tries = K.LEVELS.map(() => 0);
	for (let j = 0; j < journeys; j++) {
		K.LEVELS.forEach((L, i) => {
			let fails = 0;
			while (!attempt(i, cols, rows, fails) && fails < 12) fails++;
			if (fails === 0) firstTry[i]++;
			tries[i] += fails + 1;
		});
	}
	const pct = n => Math.round(100 * n / journeys);
	const avg = pct(firstTry.reduce((a, b) => a + b, 0) / K.LEVELS.length);
	console.log(`${later ? 'later journey' : 'first journey'}, difficulty ${difficulty}, ${cols}x${rows}:`);
	console.log('  wins first try  ', firstTry.map(pct).map(n => String(n).padStart(3)).join(' '), `  | average ${avg}%`);
	console.log('  tries per stop  ', tries.map(t => (t / journeys).toFixed(1).padStart(3)).join(' '));
}
