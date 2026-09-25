/* =============================================================================
 * 07-trials-boons.js  —  trials, curses and boons.
 *
 * A trial is the extra challenge offered at the start of a stop
 * (content/trials/); failing one leaves a curse for the next stop
 * (content/curses/). Boons are one-use powers the player holds
 * (content/boons/); each boon's file names one of the effects in
 * BOON_EFFECTS.
 *
 * What's here:
 *   offerTrial(), makeTrial()  the trial card at the start of a stop
 *   trialProgress(), completeTrial(), failTrial()
 *                       a trial as it goes (21-moves.js, 24-win-lose.js)
 *   curseFor(), carryCurse(), curseWords()
 *                       picking a curse, keeping it for the next stop, and
 *                       saying what it does
 *   renderTrial(), renderBoons(), renderCurse()
 *                       the trial, boons and curse in the column beside the
 *                       board
 *   BOON_EFFECTS        what each kind of boon does. A new kind of boon is a
 *                       new entry here (the manual, part 2, "A new boon
 *                       effect").
 *   useBoon()           uses a boon, on a square if it needs one
 *                       (22-input.js)
 *
 * Changes in the save: curse, lapis (trial rewards), trialsDone, boons
 * (used up).
 * ===========================================================================*/

// ---------- trials and boons ----------
function shapeLabel() {
	return core && core.shapeName && core.shapeId !== 'own' ? core.shapeName : core ? core.level.sub : '';
}

// A curse for a trial card or an unkind river, at the strength of the
// player's difficulty (content/curses/); none on Relaxed. A hardship that
// waits for a stage (HARDSHIPS, "stage") can't fall before it.
function curseFor() {
	const lvl = save.difficulty;
	const waits = c => HARDSHIPS[c.effect].stage && !stageOn(HARDSHIPS[c.effect].stage);
	const pool = CURSES.filter(c => c.by[lvl] > 0 && !waits(c));
	if (!pool.length) return null;
	const c = pool[Math.floor(Math.random() * pool.length)];
	return { id: c.id, n: c.by[lvl], name: c.name, text: c.text(c.by[lvl]), effect: c.effect };
}

// A curse as it is kept in the save, for the next stop
function carryCurse(c) {
	save.curse = { id: c.id, n: c.n, name: c.name, text: c.text, effect: c.effect };
}

// What a carried curse does, in words ("3 fewer moves"). Older saves kept
// the words with " at the next stop" on the end; the curse's file wins.
function curseWords(curse) {
	const c = CURSES.find(x => x.id === curse.id);
	return c ? c.text(curse.n) : curse.text.replace(' at the next stop', '');
}

function renderCurse() {
	document.querySelectorAll('.curse-row').forEach(e => e.remove());
	const sp = $('stripPlace');
	if (sp && core)
		sp.innerHTML =
			`${core.level.name}<span class="strip-shape"> \u2014 ${shapeLabel()}</span>` +
			(core.curse ? ` <span class="strip-curse">${T('stop.cursed_mark')}</span>` : '');
	if (core && core.omens && core.omens.length && !eventState) {
		[$('trialRow'), $('trialRowM')].forEach(tr => {
			if (!tr) return;
			const d = document.createElement('div');
			d.className = 'curse-row omen-row';
			d.innerHTML = html`
				<span>
					${T('stop.omen_row', { names: core.omens.map(id => OMENS.find(o => o.id === id).name).join(', '), x: (1 + OMEN_BONUS * core.omens.length).toFixed(1) })}
				</span>`;
			if (tr.id !== 'trialRowM') tr.parentNode.insertBefore(d, tr);
		});
	}
	if (!core || !core.curse) return;
	[$('trialRow'), $('trialRowM')].forEach(tr => {
		if (!tr) return;
		const d = document.createElement('div');
		d.className = 'curse-row';
		d.innerHTML = `<span>${T('stop.cursed_row', { text: curseWords(core.curse) })}</span>`;
		if (tr.id !== 'trialRowM') tr.parentNode.insertBefore(d, tr);
	});
}

function failTrial(silent) {
	if (!trial || trial.done || trial.failed) return;
	trial.failed = true;
	if (trial.curse) {
		carryCurse(trial.curse);
		persist();
	}
	renderTrial();
	if (!silent) {
		popups.push({
			text: Tplain('popup.trial_failed'),
			x: COLS / 2,
			y: ROWS / 2 - 0.5,
			life: 2,
			size: 0.6,
			col: '#ffb0a0',
		});
		if (trial.curse)
			popups.push({
				text: trial.curse.name,
				x: COLS / 2,
				y: ROWS / 2 + 0.3,
				life: 2,
				size: 0.42,
				col: '#ffb0a0',
			});
		sfx('lose');
	}
}

// A trial's text may hold {target} and {amulets} (the plural of the amulet
// picked for a clear_amulets trial); trialText() fills them in.
function trialText(t, amulets) {
	return t.text.split('{target}').join(t.target).split('{amulets}').join(amulets);
}

function makeTrial(t) {
	const ty = t.goal === 'clear_amulets' ? Math.floor(Math.random() * core.types) : -1;
	const name = ty >= 0 ? AMULET_NAMES[THEMES[levelIdx].set[ty]] || 'amulets' : '';
	return {
		id: t.id,
		goal: t.goal,
		boon: t.boon,
		target: t.target,
		within: t.within || 10,
		type: ty,
		label: t.label,
		text: trialText(t, name),
		n: 0,
		done: false,
		curse: curseFor(),
	};
}

function offerTrial() {
	let thick = 0;
	for (let sq = 0; sq < COLS * ROWS; sq++) if (core.mask[sq] && core.floor[sq] > 1) thick++;
	const pool = TRIALS.filter(
		t =>
			!(t.goal === 'moves_to_spare' && DIFFICULTY[save.difficulty].movesMult < 0.8) &&
			!(t.needsThick && thick < t.needsThick),
	);
	if (pool.length < 2) return;
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}
	const [a, b] = [makeTrial(pool[0]), makeTrial(pool[1])];
	// a stone tile: the task, the boon it wins, and on a dark strip at the
	// foot what failing costs (the curse's words run on after its name)
	const risk = c =>
		c
			? T('trial.risk', { curse: c.name, text: c.text[0].toLowerCase() + c.text.slice(1) })
			: T('trial.no_risk');
	const card = (t, idx) => html`
		<div class="trial-card" role="button" tabindex="0" data-accept="${idx}">
			<div class="card-body">
				<p class="trial-goal">${t.text}</p>
				<p class="trial-prize">
					${BOON_ICON[t.boon]}
					<span>
						<strong>${BOONS[t.boon].name}</strong>
						<br>
						${BOONS[t.boon].desc}
					</span>
				</p>
			</div>
			<div class="card-foot">${risk(t.curse)}</div>
		</div>`;
	showMsg(
		`<h2 id="msgTitle">${T('trial.title')}</h2>
		<p class="lede">${T('trial.lede', { stop: core.level.name })}</p>
		${card(a, 0)}${card(b, 1)}`,
		[[Tplain('trial.decline'), () => {}, { kind: 'exit' }]],
	);
	$('msgBody')
		.querySelectorAll('.trial-card')
		.forEach(el => {
			const take = () => {
				trial = +el.dataset.accept === 0 ? a : b;
				renderTrial();
				closeOverlays();
			};
			el.onclick = take;
			el.onkeydown = e => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					take();
				}
			};
		});
}

function renderTrial() {
	[$('trialRow'), $('trialRowM')].forEach(el => renderTrialInto(el));
}

function renderTrialInto(el) {
	if (!el) return;
	if (eventState && core) {
		const g = eventGoalText();
		el.hidden = false;
		el.classList.remove('failed');
		el.classList.toggle('done', g.have >= g.need);
		el.innerHTML = html`
			<span class="trial-txt">${g.text}</span>
			<strong>${Math.min(g.have, g.need).toLocaleString()} / ${g.need.toLocaleString()}</strong>`;
		return;
	}
	if (!trial) {
		if (el.id === 'trialRowM' && stageOn('trials')) {
			el.hidden = false;
			el.classList.remove('done', 'failed');
			el.innerHTML = `<span class="trial-txt quiet">${T('trial.none')}</span>`;
		} else el.hidden = true;
		return;
	}
	el.hidden = false;
	el.innerHTML = html`
		<span class="trial-txt">${trial.done ? '\u2713 ' : trial.failed ? '\u2717 ' : ''}${trial.text}</span>
		<strong>
			${trial.failed ? T('trial.failed') : Math.min(trial.n, trial.target) + ' / ' + trial.target}
		</strong>`;
	el.classList.toggle('done', !!trial.done);
	el.classList.toggle('failed', !!trial.failed);
}

function renderBoons() {
	[$('boonRow'), $('boonRowM')].forEach(el => renderBoonsInto(el));
	applyStages();
}

// One tile per kind of boon held, in the order they were first gained, with
// a count when there are several. A tile stands for the first boon of its
// kind in save.boons, so arming and spending work on indexes as before.
function renderBoonsInto(el) {
	if (!el) return;
	// an (i) at the end opens How to play at Boons, for when the names are hidden
	// (not a ?, which on a phone would sit just above the dock's How to play)
	const help = html`
		<button type="button" class="boon-help" title="${Tplain('side.boons_help')}" aria-label="${Tplain('side.boons_help')}">
			i
		</button>`;
	if (!save.boons.length) {
		el.innerHTML = `<span class="boon-none">${T('side.no_boons')}</span>${help}`;
		wireBoonHelp(el);
		return;
	}
	const kinds = [];
	save.boons.forEach((b, i) => {
		const k = kinds.find(x => x.b === b);
		if (k) k.n++;
		else kinds.push({ b, i, n: 1 });
	});
	el.innerHTML =
		kinds
			.map(({ b, i, n }) => {
				const boon = BOONS[b],
					count = n > 1 ? `<b class="boon-n" aria-hidden="true">\u00d7${n}</b>` : '';
				const label = `${boon.name}${n > 1 ? ` (${n})` : ''}. ${boon.desc}`;
				return (
					`<button class="boon${armed === i ? ' armed' : ''}" data-i="${i}" title="${boon.name}: ${boon.desc}" aria-label="${label}">` +
					`${BOON_ICON[b]}<span>${boon.short}</span>${count}</button>`
				);
			})
			.join('') + help;
	el.querySelectorAll('.boon').forEach(b => (b.onclick = () => armBoon(+b.dataset.i)));
	wireBoonHelp(el);
}

function wireBoonHelp(el) {
	el.querySelector('.boon-help').onclick = () => {
		if (busy) return;
		sfx('ui');
		openHelp('boons');
	};
}

function armBoon(i) {
	if (busy || stopOver) return;
	const kind = save.boons[i];
	if (core && core.noBoons && !eventState) {
		popups.push({
			text: Tplain('stop.silent'),
			x: COLS / 2,
			y: ROWS / 2,
			life: 1.6,
			size: 0.5,
			col: '#ffb0a0',
		});
		sfx('bad');
		return;
	}
	if (!BOONS[kind].target) {
		useBoon(i, -1);
		return;
	}
	armed = armed === i ? -1 : i;
	selected = -1;
	renderBoons();
	if (armed >= 0)
		popups.push({
			text: Tplain('popup.choose_a_square'),
			x: COLS / 2,
			y: ROWS / 2,
			life: 1.6,
			size: 0.5,
			col: '#fff2c4',
		});
}

function trialProgress(res, mult, moveGild) {
	if (!trial || trial.done || trial.failed) return;
	// goals measured after every clearing step; the others are checked in
	// attemptSwap() (combine_specials, gild_half_quickly), useBoon() (no_boons)
	// and levelWon() (moves_to_spare, no_boons)
	const g = trial.goal;
	if (g === 'clear_amulets') trial.n += res.cleared.filter(o => o.tile.type === trial.type).length;
	else if (g === 'make_specials') trial.n += res.made.length;
	else if (g === 'cascade') trial.n = Math.max(trial.n, mult);
	else if (g === 'gild_in_one_move') trial.n = Math.max(trial.n, moveGild);
	else if (g === 'clear_in_one_move') trial.n = Math.max(trial.n, res.moveClear || 0);
	else if (g === 'make_suns') trial.n += res.made.filter(m => m.tile.special === 'sun').length;
	else if (g === 'make_bands')
		trial.n += res.made.filter(m => m.tile.special === 'h' || m.tile.special === 'v').length;
	else if (g === 'crack_thick') trial.n += res.gild.filter(g => g.now === 1 && !g.blessed).length;
	if (trial.n >= trial.target) completeTrial();
	renderTrial();
}

function completeTrial() {
	if (!trial || trial.done) return;
	trial.done = true;
	save.boons.push(trial.boon);
	save.trialsDone = (save.trialsDone || 0) + 1;
	save.lapis += 3;
	persist();
	checkRelics();
	renderBoons();
	renderTrial();
	popups.push({
		text: Tplain('popup.trial_complete'),
		x: COLS / 2,
		y: ROWS / 2 - 0.8,
		life: 2,
		size: 0.62,
		col: '#fff2c4',
	});
	popups.push({
		text: BOONS[trial.boon].name,
		x: COLS / 2,
		y: ROWS / 2 + 0.1,
		life: 2,
		size: 0.46,
		col: '#ffd65a',
	});
	for (let i = 0; i < 26; i++) burst(Math.random() * COLS - 0.5, Math.random() * ROWS - 0.5, 1);
	sfx('blessing');
	sfx('create');
}

// ---------- what boons do ----------
// The boons are content files (content/boons/), and each names one of these
// effects. For each effect:
//   target    true: the player chooses a square first (see armBoon)
//   amount    the number it uses when the boon's file gives none
//   use(b, k) does it: b is the boon (b.n is its amount), k the chosen square
// A new kind of boon needs a new effect here, and nothing else: build.py
// reads the names from this list.
const BOON_EFFECTS = {
	// n more moves
	extra_moves: {
		target: false,
		amount: 6,
		use: async b => {
			core.movesLeft += b.n;
			updateHUD();
			sfx('moves');
			boonPopup(b, false, { x: COLS / 2, y: ROWS / 2, life: 1.6, size: 0.6, col: '#bfe8ff' });
			rings.push({ x: COLS / 2 - 0.5, y: ROWS / 2 - 0.5, life: 1, big: true });
		},
	},
	// n stones, chosen at random, lose a layer
	gild_stones: {
		target: false,
		amount: 8,
		use: async b => {
			const cand = [];
			for (let j = 0; j < COLS * ROWS; j++) if (core.mask[j] && core.floor[j] > 0) cand.push(j);
			for (let a = cand.length - 1; a > 0; a--) {
				const r = Math.floor(Math.random() * (a + 1));
				[cand[a], cand[r]] = [cand[r], cand[a]];
			}
			const picked = cand.slice(0, b.n);
			const src = picked.length ? picked[0] : 0;
			picked.forEach((t, j) => {
				core.floor[t]--;
				orbs.push({ from: src, to: t, t: -j * 0.08, dur: 0.6 });
			});
			bgDirty = true;
			sfx('blessing');
			boonPopup(b, false, { x: COLS / 2, y: 0.8, life: 1.8, size: 0.5, col: '#bfe8ff' });
			updateHUD();
			await settle();
		},
	},
	// every thick or cracked stone loses a layer
	thin_thick_stones: {
		target: false,
		use: async b => {
			let n = 0;
			for (let j = 0; j < COLS * ROWS; j++)
				if (core.mask[j] && core.floor[j] > 1) {
					core.floor[j]--;
					flashes.set(j, 1);
					burst(j % COLS, (j / COLS) | 0, 4);
					n++;
				}
			bgDirty = true;
			sfx('blessing');
			sfx('crack');
			boonPopup(b, !n, { x: COLS / 2, y: ROWS / 2, life: 1.8, size: 0.5, col: '#fff2c4' });
			updateHUD();
			await settle();
		},
	},
	// every stone in the chosen row loses a layer: the cord runs out from the
	// chosen square
	cord_row: {
		target: true,
		use: async (b, sq) => {
			const r0 = (sq / COLS) | 0;
			const c0 = sq % COLS;
			let n = 0;
			for (let col = 0; col < COLS; col++) {
				const j = r0 * COLS + col;
				if (core.mask[j] && core.floor[j] > 0) {
					core.floor[j]--;
					orbs.push({ from: sq, to: j, t: -Math.abs(col - c0) * 0.06, dur: 0.45 });
					n++;
				}
			}
			bgDirty = true;
			beams.push({ dir: 'h', idx: r0, life: 1 });
			sfx('blessing');
			boonPopup(b, !n, {
				x: COLS / 2,
				y: r0 + (r0 < 1 ? 1.1 : -0.4),
				life: 1.6,
				size: 0.46,
				col: '#fff2a0',
			});
			updateHUD();
			await settle();
		},
	},
	// shatters the chosen amulet and gilds the stone under it
	shatter_one: {
		target: true,
		use: async (b, sq) => {
			sfx('crack', 1, (sq % COLS) / COLS);
			await cascade(null, [sq], true);
		},
	},
	// shatters an n by n square around the chosen amulet
	shatter_square: {
		target: true,
		amount: 5,
		use: async (b, sq) => {
			const r0 = (sq / COLS) | 0;
			const c0 = sq % COLS;
			const reach = Math.floor(b.n / 2);
			const keys = [];
			for (let row = r0 - reach; row <= r0 + reach; row++)
				for (let col = c0 - reach; col <= c0 + reach; col++) {
					if (row < 0 || col < 0 || row >= ROWS || col >= COLS) continue;
					const j = row * COLS + col;
					if (core.mask[j] && core.cells[j]) keys.push(j);
				}
			sfx('bomb', 1, c0 / COLS);
			rings.push({ x: c0, y: r0, life: 1, big: true });
			await cascade(null, keys, true);
		},
	},
	// the chosen amulet becomes a banded amulet, across or down
	make_banded: {
		target: true,
		use: async (b, sq) => {
			makeSpecial(core, sq, Math.random() < 0.5 ? 'h' : 'v');
			core.cells[sq].pop = 1;
			sfx('create');
		},
	},
	// the chosen amulet becomes a sun
	make_sun: {
		target: true,
		use: async (b, sq) => {
			makeSpecial(core, sq, 'sun');
			core.cells[sq].pop = 1;
			sfx('create');
			boonPopup(b, false, {
				x: (sq % COLS) + 0.5,
				y: ((sq / COLS) | 0) + 0.2,
				life: 1.5,
				size: 0.44,
				col: '#ffd65a',
			});
		},
	},
	// n amulets, chosen at random, become ringed amulets
	make_ringed: {
		target: false,
		amount: 3,
		use: async b => {
			pickSome(plainAmulets(core), b.n).forEach(j => {
				const tile = core.cells[j];
				tile.special = 'bomb';
				tile.pop = 1;
				rings.push({ x: j % COLS, y: (j / COLS) | 0, life: 1 });
				burst(j % COLS, (j / COLS) | 0, 6);
			});
			sfx('create');
			sfx('bomb');
			boonPopup(b, false, { x: COLS / 2, y: ROWS / 2, life: 1.6, size: 0.5, col: '#ffc0a0' });
		},
	},
	// the amulets are shuffled into a new order, and n more moves
	shuffle: {
		target: false,
		amount: 2,
		use: async b => {
			core.movesLeft += b.n;
			updateHUD();
			sfx('shuffle');
			sfx('moves');
			boonPopup(b, false, { x: COLS / 2, y: ROWS / 2, life: 1.6, size: 0.5, col: '#bfe8ff' });
			core.cells.forEach(tile => {
				if (tile) tile.swapping = true;
			});
			core.shuffle();
			await settle();
			core.cells.forEach(tile => {
				if (tile) tile.swapping = false;
			});
		},
	},
};

// Each boon learns from its effect whether it needs a square, and its amount
Object.values(BOONS).forEach(b => {
	const effect = BOON_EFFECTS[b.effect];
	b.target = effect.target;
	b.n = b.amount || effect.amount;
	b.desc = fill(b.desc, { n: b.n });
});

// The words a boon shows on the board when used (its "popup"), or when there
// was nothing for it to do ("popup_when_nothing"); none if its file has none.
function boonPopup(b, nothing, where) {
	const text = nothing && b.popupNone ? b.popupNone : b.popup;
	if (!text) return;
	popups.push(Object.assign({ text: fillPlain(text, { n: b.n }) }, where));
}

async function useBoon(i, k) {
	if (busy || stopOver) return;
	const kind = save.boons[i];
	if (!kind) return;
	busy = true;
	armed = -1;
	selected = -1;
	core.boonUsed = true;
	if (trial && trial.goal === 'no_boons' && !trial.done) failTrial();
	save.boons.splice(i, 1);
	persist();
	renderBoons();
	const boon = BOONS[kind];
	if (boon) await BOON_EFFECTS[boon.effect].use(boon, k);
	updateHUD();
	if (eventState) return eventAfterMove();
	if (core.won()) return levelWon();
	if (core.movesLeft <= 0) return levelLost();
	busy = false;
}
