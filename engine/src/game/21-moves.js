/* =============================================================================
 * 21-moves.js  —  playing a move: the swap, the matches, the cascade that
 * follows, and what they earn.
 *
 * What's here:
 *   attemptSwap(a, b)   swaps two amulets (22-input.js); if they match, runs
 *                       cascade(), else swaps them back
 *   cascade()           clear, score, fall and refill, again and again until
 *                       the board is still; then checks the trial, the river
 *                       event, the win and the loss
 *   showClear()         what one clearing earns: gold, lapis, sparks and
 *                       sounds (the numbers are EARN, content/settings.jsonc)
 *   BADGE_SHOWS         how each badge power shows on the board when it fires
 *                       (the powers are BADGE_POWERS, 01-core.js)
 *
 * Changes in the save: gold, lapis (and what they count towards: goldEarned,
 * lapisEarned, goldBits, lapisBits), suns, thickCracked, bestCascade.
 * ===========================================================================*/

// ---------- playing a move ----------
// attemptSwap() swaps two amulets and, if they match, runs cascade(): clear,
// score (showClear), fall and refill until the board settles.

// ---------- how a badge shows when it fires ----------
// One entry for each power in BADGE_POWERS (01-core.js). show(f, b, r, c)
// draws it: f is what fired (f.n, f.targets), b the badge (BADGES), r and c
// its row and column. `sounds` play once however many fire together; `buzz`
// is the stronger phone buzz of a good power; `harm` the warning buzz of a
// cursed one.
const BADGE_SHOWS = {
	gild_stones: {
		sounds: ['blessing'],
		buzz: true,
		show: (f, b, row, col) => {
			badgePopup(f, b, {
				x: Math.min(COLS - 2, Math.max(2, col + 0.5)),
				y: row + 0.1,
				life: 1.6,
				size: 0.42,
				col: '#fff2a0',
			});
			f.targets.forEach((to, i) => orbs.push({ from: f.k, to, t: -i * 0.12, dur: 0.55 }));
		},
	},
	gild_around: {
		sounds: ['blessing'],
		buzz: true,
		show: (f, b, row, col) => {
			badgePopup(f, b, {
				x: Math.min(COLS - 2, Math.max(2, col + 0.5)),
				y: row + 0.1,
				life: 1.5,
				size: 0.42,
				col: '#ffd0ea',
			});
			f.targets.forEach((to, i) => orbs.push({ from: f.k, to, t: -i * 0.05, dur: 0.4 }));
		},
	},
	row_and_column: {
		sounds: ['line'],
		buzz: true,
		show: (f, b, row, col) => {
			beams.push({ dir: 'h', idx: row, life: 1 });
			beams.push({ dir: 'v', idx: col, life: 1 });
			badgePopup(f, b, { x: col + 0.5, y: row + 0.1, life: 1.3, size: 0.42, col: '#ffc0a0' });
		},
	},
	extra_moves: {
		sounds: ['moves'],
		show: (f, b, row, col) => {
			badgePopup(f, b, { x: col + 0.5, y: row + 0.2, life: 1.5, size: 0.5, col: '#bfe8ff' });
			rings.push({ x: col, y: row, life: 1 });
		},
	},
	give_lapis: {
		sounds: ['create'],
		buzz: true,
		show: (f, b, row, col) => {
			save.lapis += f.n;
			badgePopup(f, b, { x: col + 0.5, y: row + 0.2, life: 1.6, size: 0.5, col: '#aebfff' });
			rings.push({ x: col, y: row, life: 1 });
		},
	},
	lose_moves: {
		sounds: ['bad', 'lose'],
		harm: true,
		show: (f, b, row, col) => {
			badgePopup(f, b, {
				x: Math.min(COLS - 2, Math.max(2, col + 0.5)),
				y: row + 0.1,
				life: 1.8,
				size: 0.46,
				col: '#ff9a8a',
			});
		},
	},
	ungild_stones: {
		sounds: ['bad', 'lose'],
		harm: true,
		show: (f, b, row, col) => {
			badgePopup(f, b, {
				x: Math.min(COLS - 2, Math.max(2, col + 0.5)),
				y: row + 0.1,
				life: 1.8,
				size: 0.46,
				col: '#ff9a8a',
			});
		},
	},
	// the powers no badge of this game may use yet, shown plainly: the badge's
	// words over it, and light, a beam or a burst where the power reached
	gild_wide: {
		sounds: ['blessing'],
		buzz: true,
		show: (f, b, row, col) => {
			badgePopup(f, b, nearBadge(row, col, 1.5, '#fff2a0'));
			f.targets.forEach((to, i) => orbs.push({ from: f.k, to, t: -i * 0.04, dur: 0.45 }));
		},
	},
	gild_row_and_column: {
		sounds: ['blessing', 'line'],
		buzz: true,
		show: (f, b, row, col) => {
			beams.push({ dir: 'h', idx: row, life: 1 });
			beams.push({ dir: 'v', idx: col, life: 1 });
			badgePopup(f, b, nearBadge(row, col, 1.4, '#fff2a0'));
			f.targets.forEach((to, i) => orbs.push({ from: f.k, to, t: -i * 0.04, dur: 0.4 }));
		},
	},
	clear_around: {
		sounds: ['bomb'],
		buzz: true,
		show: (f, b, row, col) => {
			rings.push({ x: col, y: row, life: 1, big: true });
			badgePopup(f, b, nearBadge(row, col, 1.3, '#ffc0a0'));
		},
	},
	clear_its_kind: {
		sounds: ['sun'],
		buzz: true,
		show: (f, b, row, col) => {
			rings.push({ x: col, y: row, life: 1, big: true });
			badgePopup(f, b, nearBadge(row, col, 1.4, '#ffd65a'));
		},
	},
	break_covers: {
		sounds: ['blessing'],
		buzz: true,
		show: (f, b, row, col) => {
			badgePopup(f, b, nearBadge(row, col, 1.5, '#fff2a0'));
			f.targets.forEach((to, i) => orbs.push({ from: f.k, to, t: -i * 0.05, dur: 0.45 }));
		},
	},
	thicken_stones: {
		sounds: ['bad', 'lose'],
		harm: true,
		show: (f, b, row, col) => {
			f.targets.forEach(sq => bgCells.add(sq));
			badgePopup(f, b, nearBadge(row, col, 1.8, '#ff9a8a'));
		},
	},
	cover_amulets: {
		sounds: ['bad', 'lose'],
		harm: true,
		show: (f, b, row, col) => badgePopup(f, b, nearBadge(row, col, 1.8, '#ff9a8a')),
	},
};

// where a badge's words go: over it, kept inside the board
function nearBadge(row, col, life, colour) {
	return { x: Math.min(COLS - 2, Math.max(2, col + 0.5)), y: row + 0.1, life, size: 0.44, col: colour };
}

// A fired badge's words on the board: its "popup", or its "popup_when_nothing"
// when its power could do nothing (f.n is 0)
function badgePopup(f, b, where) {
	const text = f.n === 0 && b.popupNone ? b.popupNone : b.popup;
	if (!text) return;
	popups.push(Object.assign({ text: fillPlain(text, { n: f.n }) }, where));
}
// covers that broke ({k, cover, left}), or grew (spread: {k, cover}): a
// burst of the cover's colours on each, and its sound once for each kind
function showCovers(list) {
	const count = {};
	list.forEach(({ k, cover }) => {
		const tile = core.cells[k];
		if (!tile) return;
		tile.pop = 0.5;
		count[cover] = (count[cover] || 0) + 1;
		const cols = COVERS[cover].burst;
		for (let i = 0; i < (lowFx ? 3 : 8); i++) {
			const a = Math.random() * TAU,
				sp = 0.5 + Math.random() * 1.4;
			particles.push({
				x: (k % COLS) + 0.5,
				y: ((k / COLS) | 0) + 0.6,
				vx: Math.cos(a) * sp,
				vy: Math.sin(a) * sp - 0.8,
				life: 0.5 + Math.random() * 0.4,
				s: 0.08 + Math.random() * 0.08,
				col: Math.random() < 0.6 ? cols[0] : cols[1],
			});
		}
	});
	Object.entries(count).forEach(([cover, n]) => sfx(COVERS[cover].sound, n));
}

function showClear(res, mult) {
	res.cleared.forEach(({ k, tile }) => {
		dying.push({ tile, x: tile.x, y: tile.y, t: 0 });
		burst(k % COLS, (k / COLS) | 0);
	});
	res.made.forEach(({ tile }) => {
		tile.pop = 1;
	});
	res.gild.forEach(({ k, now, blessed }) => {
		if (!blessed) flashes.set(k, now === 0 ? 1 : 0.55);
	});
	res.gild.forEach(({ k }) => bgCells.add(k));
	// a layer of a cover broken: a burst in the cover's colours and its sound
	// (content/covers/), once for each kind of cover however many broke
	showCovers(res.brushed || []);
	// amulets a badge covered
	(res.covered || []).forEach(sq => {
		if (core.cells[sq]) core.cells[sq].pop = 0.5;
	});
	// gilded stones turned bare again (ungild_stones), with a puff of dust
	(res.buried || []).forEach(sq => {
		bgCells.add(sq);
		for (let i = 0; i < 6; i++) {
			const a = Math.random() * TAU,
				sp = 0.6 + Math.random() * 1.6;
			particles.push({
				x: (sq % COLS) + 0.5,
				y: ((sq / COLS) | 0) + 0.5,
				vx: Math.cos(a) * sp,
				vy: Math.sin(a) * sp - 0.6,
				life: 0.6 + Math.random() * 0.4,
				s: 0.12 + Math.random() * 0.1,
				col: Math.random() < 0.6 ? '#c8a060' : '#8a6a3a',
			});
		}
	});
	const kinds = new Set();
	res.fired.forEach(f => {
		const row = (f.k / COLS) | 0,
			col = f.k % COLS;
		kinds.add(f.kind);
		if (f.kind === 'h') beams.push({ dir: 'h', idx: row, life: 1 });
		else if (f.kind === 'v') beams.push({ dir: 'v', idx: col, life: 1 });
		else if (f.kind === 'star') {
			beams.push({ dir: 'd1', r: row, c: col, life: 1 });
			beams.push({ dir: 'd2', r: row, c: col, life: 1 });
			popups.push({
				text: Tplain('popup.star_of_sopdet'),
				x: col + 0.5,
				y: row + 0.1,
				life: 1.3,
				size: 0.42,
				col: '#dcebff',
			});
		} else if (f.effect) BADGE_SHOWS[f.effect].show(f, BADGES[f.kind], row, col);
		else rings.push({ x: col, y: row, life: 1, big: f.kind === 'sun' });
	});
	const all = [...res.cleared.map(o => o.k), ...res.made.map(o => o.k)];
	const cx = all.reduce((s, sq) => s + (sq % COLS), 0) / all.length + 0.5,
		cy = all.reduce((s, sq) => s + ((sq / COLS) | 0), 0) / all.length + 0.5;
	popups.push({ text: '+' + res.pts, x: cx, y: cy, life: 1.1, size: 0.42 });
	if (mult >= 3)
		popups.push({
			text: Tplain('popup.cascade_n', { n: mult }),
			x: COLS / 2,
			y: ROWS / 2 - 0.6,
			life: 1.4,
			size: 0.62,
			col: '#fff2c4',
		});
	if (eventState) {
		eventState.lamp.tx = cx;
		eventState.lamp.ty = cy;
	}
	const pan = cx / COLS;
	sfx('match', mult, pan);
	musicCascade(mult, res.made);
	const golds = res.gild.filter(g => g.now === 0 && !g.blessed).length;
	if (golds) sfx('gild', golds);
	// earnings (content/settings.jsonc): one gold for every so many stones gilded,
	// one lapis for every so many specials made; the remainders carry over so
	// nothing is lost. Boards that earn less (Omega, whose size makes gold pour
	// in) count up to a larger number before paying out
	const earnK = boardMode(save.board).earn || 1;
	const per = Math.max(1, Math.round(EARN.stonesPerGold / earnK)),
		perL = Math.max(1, Math.round(EARN.specialsPerLapis / earnK));
	save.goldBits = (save.goldBits || 0) + res.gild.length;
	save.gold += Math.floor(save.goldBits / per);
	save.goldEarned = (save.goldEarned || 0) + Math.floor(save.goldBits / per);
	save.goldBits %= per;
	save.lapisBits = (save.lapisBits || 0) + res.made.length;
	save.lapis += Math.floor(save.lapisBits / perL);
	save.lapisEarned = (save.lapisEarned || 0) + Math.floor(save.lapisBits / perL);
	save.lapisBits %= perL;
	save.suns = (save.suns || 0) + res.made.filter(m => m.tile.special === 'sun').length;
	if (core.stat && !eventState) {
		core.stat.suns += res.made.filter(m => m.tile.special === 'sun').length;
		core.stat.specials += res.made.length;
		core.stat.cascade = Math.max(core.stat.cascade, mult);
	}
	if (mult > (save.bestCascade || 0)) save.bestCascade = mult;
	save.thickCracked = (save.thickCracked || 0) + res.gild.filter(g => g.now === 1 && !g.blessed).length;
	if (res.fired.length >= 2) core.duetFired = true;
	checkRelics();
	if (res.gild.some(g => g.now > 0 && !g.blessed)) sfx('crack', 1, pan);
	if (res.made.length) sfx('create', 1, pan);
	// the badges that fired, by power (BADGE_SHOWS)
	const shows = [...new Set(res.fired.filter(f => f.effect).map(f => f.effect))].map(e => BADGE_SHOWS[e]);
	const badgeSounds = shows.flatMap(sh => sh.sounds);
	if (kinds.has('sun')) sfx('sun');
	else if (kinds.has('bomb')) sfx('bomb', 1, pan);
	if (kinds.has('h') || kinds.has('v') || kinds.has('star') || badgeSounds.includes('line'))
		sfx('line', 1, pan);
	badgeSounds.filter(x => x !== 'line').forEach(x => sfx(x));
	if (shows.some(sh => sh.harm)) vibrate([0, 40, 60, 40]);
	// a soft buzz on the match; a stronger one when a special amulet or a good badge fires
	const specialFired =
		['sun', 'bomb', 'h', 'v', 'star'].some(x => kinds.has(x)) || shows.some(sh => sh.buzz);
	vibrate(specialFired ? 28 : 10);
}

async function cascade(swap, seed, noTrial) {
	let mult = 1,
		res = core.clearStep(swap, mult, seed),
		moveGild = 0,
		moveClear = 0;
	const broken = new Set(); // the covers that broke (for spreading ones)
	while (res) {
		res.brushed.forEach(c => broken.add(c.cover));
		moveGild += res.gild.length;
		moveClear += res.cleared.length;
		res.moveClear = moveClear;
		if (!noTrial) trialProgress(res, mult, moveGild);
		if (eventState && eventState.target >= 0)
			eventState.collected += res.cleared.filter(o => o.tile.type === eventState.target).length;
		showClear(res, mult);
		updateHUD();
		await settle();
		const g = core.gravity();
		g.spawns.forEach(s => {
			s.tile.x = s.k % COLS;
			s.tile.y = s.startRow;
			s.tile.vy = 0;
		});
		await settle();
		mult++;
		res = core.clearStep(null, mult);
	}
	// after a move of the player's, covers that spread grow (Core.spread)
	if (swap) {
		const grown = core.spread(broken);
		if (grown.length) {
			showCovers(grown);
			await settle();
		}
	}
	if (!core.won() && !core.hasMove()) {
		popups.push({
			text: Tplain('popup.the_amulets_shift'),
			x: COLS / 2,
			y: ROWS / 2,
			life: 1.6,
			size: 0.55,
			col: '#fff2c4',
		});
		sfx('shuffle');
		await delay(500);
		core.cells.forEach(tile => {
			if (tile) tile.swapping = true;
		});
		core.shuffle();
		await settle();
		core.cells.forEach(tile => {
			if (tile) tile.swapping = false;
		});
	}
}

async function attemptSwap(a, b) {
	if (busy || stopOver || !core.adjacent(a, b) || !core.cells[a] || !core.cells[b] || core.movesLeft <= 0)
		return;
	if (core.cells[a].cover || core.cells[b].cover) {
		const sq = core.cells[a].cover ? a : b;
		sfx('bad');
		selected = -1;
		popups.push({
			text: fillPlain(COVERS[core.cells[sq].cover].popup),
			x: Math.min(COLS - 2, Math.max(2, (sq % COLS) + 0.5)),
			y: ((sq / COLS) | 0) + 0.2,
			life: 1.6,
			size: 0.42,
			col: '#f4dca4',
		});
		return;
	}
	busy = true;
	hint = null;
	idleTimer = 0;
	selected = -1;
	const ta = core.cells[a],
		tb = core.cells[b];
	ta.swapping = tb.swapping = true;
	const valid = core.isValid(a, b);
	getCtx();
	sfx('swap');
	core.swap(a, b);
	await settle();
	if (!valid) {
		core.swap(a, b);
		sfx('bad');
		await settle();
		ta.swapping = tb.swapping = false;
		busy = false;
		return;
	}
	ta.swapping = tb.swapping = false;
	vibrate(16);
	if (
		trial &&
		trial.goal === 'combine_specials' &&
		!trial.done &&
		!trial.failed &&
		COMBO.has(ta.special) &&
		COMBO.has(tb.special)
	) {
		trial.n = trial.target;
		completeTrial();
	}
	core.movesLeft--;
	trialMoves++;
	updateHUD();
	await cascade([a, b]);
	if (trial && trial.goal === 'gild_half_quickly' && !trial.done && !trial.failed) {
		if ((core.total - core.remaining()) * 2 >= core.total) {
			trial.n = trial.target;
			completeTrial();
		} else if (trialMoves >= trial.within) failTrial();
	}
	updateHUD();
	persist();
	idleTimer = 0;
	if (eventState) return eventAfterMove();
	if (core.won()) return levelWon();
	if (core.movesLeft <= 0) return levelLost();
	busy = false;
}
