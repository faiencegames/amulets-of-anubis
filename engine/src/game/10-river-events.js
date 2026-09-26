/* =============================================================================
 * 10-river-events.js: river events and the small boards they share with
 * tombs, temples and oases.
 *
 * Between stops the boat may meet something on the river
 * (content/river-events/): a choice, or a small puzzle board with a goal.
 *
 * What's here:
 *   goNext(from)        sail on from a stop: maybe a river event first, then
 *                       the next stop (after a win, or leaving a chamber)
 *   startEvent(ev)      shows an event: its choice, or its puzzle
 *   eventChoice()       a choice as cards, each saying what it costs and gives
 *   setupSmallBoard()   the board of a puzzle or a chamber, 8 wide and as tall
 *                       as its floor plan
 *                       (11-chambers.js uses it too)
 *   eventAfterMove()    after each move on a puzzle: goal met, or out of moves
 *   giveReward(), rewardText(), getLine()
 *                       paying a reward and saying it in words ("You get:")
 *   eventState          the event under way, or null
 *
 * Changes in the save: gold, lapis, boons, life, lastEvent; chambers and
 * chamberWins for chambers.
 * ===========================================================================*/

// ---------- river events ----------
let eventState = null; // {ev, next, collected, target, lamp} while an event puzzle is on the board
function goNext(next) {
	const ev =
		next > 0 && stageOn('events') && Math.random() < EVENT_CHANCE ? pickEvent(save.lastEvent) : null;
	if (ev) {
		save.lastEvent = ev.id;
		persist();
		return startEvent(ev, next);
	}
	startLevel(next);
}

// A small currency icon for gold and lapis, the same shapes the top bar uses,
// so a reward reads as a picture as well as a word. The boon keeps its name.
function iconHtml(kind, n) {
	return `<i class="g-ico ${kind}"></i>${T('reward.' + kind, { n: n.toLocaleString() })}`;
}

function rewardText(r) {
	const parts = [];
	if (r.gold) parts.push(iconHtml('gold', r.gold));
	if (r.lapis) parts.push(iconHtml('lapis', r.lapis));
	if (r.boon) parts.push(r.boon === 'random' ? T('event.any_boon') : BOONS[r.boon].name);
	return parts.join(Tplain('reward.and'));
}

// The head of every river event's scroll: "On the river", the title, and a
// strip with the boat between the stop just left and the one ahead, so the
// player sees at a glance that this happens on the way.
function riverHead(ev, next) {
	const from = LEVELS[next - 1] || LEVELS[0],
		to = LEVELS[next];
	return html`
		<p class="river-kicker"><span class="arrow-label">${T('event.kicker')}</span></p>
		<h2 id="msgTitle">${ev.title}</h2>
		<div class="route" role="img" aria-label="${Tplain('event.between', { from: from.name, to: to.name })}">
			<span class="route-stop from">${from.name}</span>
			<span class="route-water">
				${iconSvg('ui', 'boat', 'class="route-boat" aria-hidden="true"')}
			</span>
			<span class="route-stop to">${to.name}</span>
		</div>`;
}

// What a reward block gives, as the "You get:" line of a card: a single boon
// shows its icon, name and what it does, as on a trial card; gold and lapis
// show their symbols.
// bare: without the "You get:" label, where the reward is plainly the prize
function getLine(r, bare) {
	const label = bare ? '' : `<span class="arrow-label prize-label">${T('event.get')}</span>`;
	if (r.boon && r.boon !== 'random' && !r.gold && !r.lapis)
		return html`
			<p class="trial-prize">
				${BOON_ICON[r.boon] || ''}
				<span>
					${label}
					<strong>${BOONS[r.boon].name}</strong>
					<br>
					${BOONS[r.boon].desc}
				</span>
			</p>`;
	return html`
		<p class="trial-prize">
			<span>${label}${rewardText(r)}</span>
		</p>`;
}

function giveReward(r) {
	if (r.gold) save.gold += r.gold;
	if (r.lapis) save.lapis += r.lapis;
	if (r.boon) save.boons.push(r.boon === 'random' ? randomBoon() : r.boon);
	persist();
	updateHUD();
	renderBoons();
}

function eventDone() {
	const g = eventState.ev.goal;
	if (g.type === 'gild') return core.won();
	if (g.type === 'collect') return eventState.collected >= g.n;
	return core.score >= g.n;
}

function eventGoalText() {
	const ev = eventState.ev,
		g = ev.goal;
	if (g.type === 'gild')
		return { text: T('event.gild'), have: core.total - core.remaining(), need: core.total };
	if (g.type === 'collect')
		return {
			text: T('event.collect', {
				n: g.n,
				amulets: AMULET_NAMES[g.amulet] || T('event.collect_default'),
			}),
			have: eventState.collected,
			need: g.n,
		};
	return { text: T('event.score', { n: g.n.toLocaleString() }), have: core.score, need: g.n };
}

function eventCompleted() {
	save.life.events = (save.life.events || 0) + 1;
	checkRelics();
	persist();
}

// The small board of a river puzzle or a chamber (8 wide, as tall as its plan), in the scenery,
// amulets and music of stop `at`. `state` is merged into eventState.
function setupSmallBoard(ev, at, state, sub) {
	stopOver = false;
	tubeWas = -1;
	$('boardEnd').hidden = true;
	if (trial && !trial.done && !trial.failed) failTrial(true);
	trial = null;
	armed = -1;
	selected = -1;
	levelIdx = at;
	// a chamber may have several sets of amulets: pick one each time
	const th = THEMES[at];
	const pick = ev.sets ? ev.sets[Math.floor(Math.random() * ev.sets.length)] : ev.set || th.set;
	const names = pick.slice(0, ev.types);
	TILE_NAMES = names.slice();
	TILE_SPRITES = names.map(n => skinned(AMULET_PICS[n], n, save.skin));
	TILE_SPRITES[6] = skinned(AMULET_PICS.sun, 'sun', save.skin);
	buildFloors(at);
	setBackdrop(at, ev.scene || LEVELS[at].id);
	setBoard(at);
	document.body.classList.remove('omega');
	// the board is as tall as its floor plan: empty rows at its top and foot
	// are left out, so the squares fill the frame
	const plan = ev.map ? ev.map.slice() : null;
	while (plan && plan.length > 3 && !/[^.]/.test(plan[0])) plan.shift();
	while (plan && plan.length > 3 && !/[^.]/.test(plan[plan.length - 1])) plan.pop();
	setBoardSize(8, plan ? plan.length : 8);
	document.body.classList.toggle('in-chamber', !!ev.torch);
	music.inside = !!ev.torch;
	musicVolume();
	core = new Core(
		{ name: ev.title, sub, fact: ev.text, map: plan, moves: ev.moves, types: names.length },
		Object.assign({ map: plan, powerChance: 0.02 }, ev.chamber ? returnBadges(ev) : {}),
	);
	core.fill();
	core.boonUsed = false;
	core.stallBought = {};
	core.shapeName = null;
	core.curse = null;
	eventState = Object.assign(
		{
			ev,
			collected: 0,
			target: ev.goal.amulet ? names.indexOf(ev.goal.amulet) : -1,
			lamp: { x: COLS / 2, y: ROWS / 2, tx: COLS / 2, ty: ROWS / 2 },
		},
		state,
	);
	dying = [];
	particles = [];
	popups = [];
	beams = [];
	rings = [];
	orbs = [];
	flashes.clear();
	hint = null;
	core.cells.forEach((tile, sq) => {
		if (!tile) return;
		tile.x = sq % COLS;
		tile.y = ((sq / COLS) | 0) - ROWS - 1 - (sq % COLS) * 0.35 - Math.random() * 0.2;
		tile.vy = 0;
	});
	$('placeName').textContent = ev.title;
	$('placeSub').textContent = sub;
	$('placeFact').textContent = ev.text;
	$('legend').innerHTML = '';
	renderCurse();
	requestAnimationFrame(fitNote);
	$('stripPlace').textContent = ev.title;
	renderTrial();
	renderBoons();
	updateHUD();
	fit();
	musicStopBegins();
	musicFollow();
	busy = true;
	settle().then(() => {
		busy = false;
		idleTimer = 0;
	});
}

function startEvent(ev, next) {
	if (ev.kind === 'choice') return eventChoice(ev, next);
	setupSmallBoard(ev, next, { next }, Tplain('event.on_the_way', { stop: LEVELS[next].name }));
	const goal = eventGoalText();
	showMsg(
		html`
			${riverHead(ev, next)} <p class="story">${ev.text}</p>
			<div class="chamber-plaque">
				<div class="card-body">
					<p class="plaque-goal">${T('event.goal', { goal: goal.text, n: core.startMoves })}</p>
					${getLine(ev.reward, true)}
				</div>
				<div class="card-foot">${T('event.no_harm')}</div>
			</div>`,
		[
			[Tplain('event.begin'), () => {}, { kind: 'go', icon: iconSvg('ui', 'boat') }],
			[
				Tplain('event.skip'),
				() => {
					eventState = null;
					startLevel(next);
				},
				{ kind: 'quiet' },
			],
		],
	);
}

function eventAfterMove() {
	updateHUD();
	persist();
	if (eventDone() || core.movesLeft <= 0) stopOver = true;
	if (eventDone() && eventState.ev.chamber) {
		const c = eventState.ev,
			first = !save.chambers[c.id],
			after = eventState.after;
		const paid = visitReward(c);
		giveReward(paid);
		save.chamberWins[c.id] = (save.chamberWins[c.id] || 0) + 1;
		save.chambers[c.id] = save.chambers[c.id] || Date.now();
		persist();
		checkRelics();
		sfx('win');
		musicResolve(true);
		for (let i = 0; i < 30; i++) burst(Math.random() * COLS - 0.5, Math.random() * ROWS - 0.5, 1);
		setTimeout(() => {
			busy = false;
			showMsg(
				html`
					${chamberHead(c)}
					<p class="lede">${T(placeKey(c, 'won'))}</p>
					<p class="river-outcome" style="text-align:center">
						${T('event.gain', { reward: rewardText(paid) })}
					</p>`,
				[[after.label, leaveChamber, { kind: 'go', icon: iconSvg('ui', 'boat') }]],
				{ noClose: true },
			);
		}, 900);
		return;
	}
	if (eventDone()) {
		const ev = eventState.ev,
			next = eventState.next;
		giveReward(ev.reward);
		eventCompleted();
		sfx('win');
		musicResolve(true);
		for (let i = 0; i < 30; i++) burst(Math.random() * COLS - 0.5, Math.random() * ROWS - 0.5, 1);
		setTimeout(() => {
			busy = false;
			showMsg(
				html`
					<h2 id="msgTitle">${ev.title}</h2>
					<p class="lede">${T('event.won')}</p>
					<p class="river-outcome" style="text-align:center">
						${T('event.gain', { reward: rewardText(ev.reward) })}
					</p>`,
				[
					[
						Tplain('event.sail', { stop: LEVELS[next].name }),
						() => {
							eventState = null;
							startLevel(next);
						},
						{ kind: 'go', sub: LEVELS[next].sub, icon: iconSvg('ui', 'boat') },
					],
				],
				{ noClose: true },
			);
		}, 900);
		return;
	}
	if (core.movesLeft <= 0 && eventState.ev.chamber) {
		const c = eventState.ev,
			after = eventState.after;
		sfx('lose');
		musicResolve(false);
		setTimeout(() => {
			busy = false;
			showMsg(
				`${chamberHead(c)}<p class="lede">${T(placeKey(c, 'lost'))}</p>
			<p style="text-align:center">${T(placeKey(c, 'lost_text'))}</p>`,
				[
					[
						Tplain('event.try_again'),
						() => startChamber(c, after, true),
						{ kind: 'go', dark: true, oasis: !!c.oasis, icon: iconSvg('dock', 'restart') },
					],
					[after.label, leaveChamber, { kind: 'quiet', short: Tplain('chamber.leave') }],
				],
				{ noClose: true },
			);
		}, 700);
		return;
	}
	if (core.movesLeft <= 0) {
		const ev = eventState.ev,
			next = eventState.next;
		sfx('lose');
		musicResolve(false);
		setTimeout(() => {
			busy = false;
			showMsg(
				`<h2 id="msgTitle">${ev.title}</h2><p class="lede">${T('event.lost')}</p>
			<p style="text-align:center">${T('event.lost_text')}</p>`,
				[
					[
						Tplain('event.sail', { stop: LEVELS[next].name }),
						() => {
							eventState = null;
							startLevel(next);
						},
						{ kind: 'go', sub: LEVELS[next].sub, icon: iconSvg('ui', 'boat') },
					],
					[
						Tplain('event.try_again'),
						() => startEvent(ev, next),
						{ kind: 'quiet', icon: iconSvg('dock', 'restart') },
					],
				],
				{ noClose: true },
			);
		}, 700);
		return;
	}
	busy = false;
}

// A river choice: each choice that does something is a card, like a trial
// card, saying what you pay and what you get (with the gold and lapis
// symbols); a choice that does nothing ("Walk on") is a plain button below.
// A card you cannot afford stays visible, dimmed, with the reason.
function eventChoice(ev, next) {
	const doing = ev.choices.filter(ch => ch.cost || ch.give || ch.gamble || ch.takeBoon),
		leaving = ev.choices.filter(ch => !doing.includes(ch));
	const why = ch =>
		ch.cost && save.gold < (ch.cost.gold || 0)
			? T('event.short_gold')
			: ch.cost && save.lapis < (ch.cost.lapis || 0)
				? T('event.short_lapis')
				: ch.needBoon && !save.boons.length
					? T('event.no_boon')
					: '';
	const card = (ch, i) => {
		const no = why(ch);
		const pay = ch.cost
			? html`
				<p class="trial-prize">
					<span>
						<span class="arrow-label prize-label">${T('event.pay')}</span>
						${rewardText(ch.cost)}
					</span>
				</p>`
			: ch.takeBoon
				? html`
					<p class="trial-prize">
						<span>
							<span class="arrow-label prize-label">${T('event.pay')}</span>
							${T('event.pay_boon')}
						</span>
					</p>`
				: '';
		const get = ch.gamble
			? html`
				<p class="trial-prize">
					<span>
						<span class="arrow-label prize-label">${T('event.get')}</span>
						${T('event.gamble_get')}
					</span>
				</p>`
			: ch.give
				? getLine(ch.give)
				: '';
		const foot = no || (ch.gamble ? T('event.gamble_risk') : '');
		return html`
			<div class="trial-card river-card${no ? ' blocked' : ''}" role="button" tabindex="${no ? -1 : 0}" aria-disabled="${!!no}" data-ch="${i}">
				<div class="card-body">
					<p class="trial-goal">${ch.label}</p>
					${pay}${get}
				</div>
				${foot ? `<div class="card-foot">${foot}</div>` : ''}
			</div>`;
	};
	const choose = ch => {
		closeOverlays();
		let outcome = '';
		if (ch.cost) {
			save.gold -= ch.cost.gold || 0;
			save.lapis -= ch.cost.lapis || 0;
			outcome = T('event.paid', { cost: rewardText(ch.cost) });
		}
		if (ch.takeBoon) {
			const b = save.boons.pop();
			outcome = T('event.part_with', { boon: BOONS[b].name });
		}
		if (ch.give) {
			giveReward(ch.give);
			outcome += T('event.receive', {
				reward:
					ch.give.boon === 'random'
						? T('event.receive_boon', { boon: BOONS[save.boons[save.boons.length - 1]].name })
						: rewardText(ch.give),
			});
		}
		if (ch.gamble) {
			const c = curseFor();
			if (Math.random() < 0.5 || !c) {
				const b = randomBoon();
				save.boons.push(b);
				outcome = T('event.kind', { boon: BOONS[b].name });
			} else {
				carryCurse(c);
				outcome = T('event.unkind', { curse: c.name, text: c.text });
			}
		}
		eventCompleted();
		persist();
		updateHUD();
		renderBoons();
		setTimeout(
			() =>
				showMsg(
					`${riverHead(ev, next)}<p class="river-outcome" style="text-align:center">${outcome}</p>`,
					[
						[
							Tplain('event.sail', { stop: LEVELS[next].name }),
							() => startLevel(next),
							{ kind: 'go', sub: LEVELS[next].sub, icon: iconSvg('ui', 'boat') },
						],
					],
					{ onClose: () => startLevel(next) },
				),
			50,
		);
	};
	showMsg(
		`${riverHead(ev, next)}<p class="story">${ev.text}</p>${doing.map(card).join('')}`,
		leaving.map(ch => [ch.label, () => startLevel(next), { kind: 'exit' }]),
		{ onClose: () => startLevel(next) },
	);
	$('msgBody')
		.querySelectorAll('.river-card[data-ch]')
		.forEach(el => {
			if (el.classList.contains('blocked')) return;
			const take = () => choose(doing[+el.dataset.ch]);
			el.onclick = take;
			el.onkeydown = e => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					take();
				}
			};
		});
}
