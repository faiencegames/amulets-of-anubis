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
// strip with the barque between the stop just left and the one ahead, so the
// player sees at a glance that this happens on the way.
function riverHead(ev, next) {
	const from = LEVELS[next - 1] || LEVELS[0],
		to = LEVELS[next];
	return `<p class="river-kicker"><span class="arrow-label">${T('event.kicker')}</span></p><h2 id="msgTitle">${ev.title}</h2>
		<div class="route" role="img" aria-label="${Tplain('event.between', { from: from.name, to: to.name })}">
			<span class="route-stop from">${from.name}</span><span class="route-water">${iconSvg('ui', 'barque', 'class="route-boat" aria-hidden="true"')}</span><span class="route-stop to">${to.name}</span></div>`;
}

// What a reward block gives, as the "You get:" line of a card: a single boon
// shows its icon, name and what it does, as on a trial card; gold and lapis
// show their symbols.
function getLine(r) {
	if (r.boon && r.boon !== 'random' && !r.gold && !r.lapis)
		return `<p class="trial-prize">${BOON_ICON[r.boon] || ''}<span><span class="arrow-label prize-label">${T('event.get')}</span><strong>${BOONS[r.boon].name}</strong><br>${BOONS[r.boon].desc}</span></p>`;
	return `<p class="trial-prize"><span><span class="arrow-label prize-label">${T('event.get')}</span>${rewardText(r)}</span></p>`;
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

// The small 8 x 8 board of a river puzzle or a chamber, in the scenery,
// amulets and music of stop `at`. `state` is merged into eventState.
function setupSmallBoard(ev, at, state, sub) {
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
	TILE_SPRITES = names.map(n => skinned(SPR[n], n, save.skin));
	TILE_SPRITES[6] = skinned(SPR.sun, 'sun', save.skin);
	buildFloors(at);
	setBackdrop(at, ev.scene || LEVELS[at].id);
	setBoard(at);
	document.body.classList.remove('omega');
	setBoardSize(8, 8);
	document.body.classList.toggle('in-chamber', !!ev.torch);
	music.inside = !!ev.torch;
	musicVolume();
	core = new Core(
		{ name: ev.title, sub, fact: ev.text, map: ev.map, moves: ev.moves, types: names.length },
		Object.assign({ map: ev.map, powerChance: 0.02 }, ev.chamber ? returnBadges(ev) : {})
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
			lamp: { x: N / 2, y: ROWS / 2, tx: N / 2, ty: ROWS / 2 },
		},
		state
	);
	dying = [];
	particles = [];
	popups = [];
	beams = [];
	rings = [];
	orbs = [];
	flashes.clear();
	hint = null;
	core.cells.forEach((t, k) => {
		if (!t) return;
		t.x = k % N;
		t.y = ((k / N) | 0) - ROWS - 1 - (k % N) * 0.35 - Math.random() * 0.2;
		t.vy = 0;
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
		`${riverHead(ev, next)}
		<p class="story">${ev.text}</p>
		<div class="trial-card river-card static"><p class="trial-goal"><span class="arrow-label">${T('trial.do')}</span>${T('event.goal', { goal: goal.text, n: core.startMoves })}</p>
		${getLine(ev.reward)}
		<p class="trial-risk calm">${T('event.no_harm')}</p></div>`,
		[
			[Tplain('event.begin'), () => {}, { kind: 'go', icon: iconSvg('ui', 'barque') }],
			[
				Tplain('event.skip'),
				() => {
					eventState = null;
					startLevel(next);
				},
				{ kind: 'quiet' },
			],
		]
	);
}

function eventAfterMove() {
	updateHUD();
	persist();
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
		for (let i = 0; i < 30; i++) burst(Math.random() * N - 0.5, Math.random() * ROWS - 0.5, 1);
		setTimeout(() => {
			busy = false;
			showMsg(
				`${chamberHead(c)}<p class="lede">${T(placeKey(c, 'won'))}</p>
			<p class="river-outcome" style="text-align:center">${T('event.gain', { reward: rewardText(paid) })}</p>`,
				[[after.label, leaveChamber, { kind: 'go', icon: iconSvg('ui', 'barque') }]],
				{ noClose: true }
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
		for (let i = 0; i < 30; i++) burst(Math.random() * N - 0.5, Math.random() * ROWS - 0.5, 1);
		setTimeout(() => {
			busy = false;
			showMsg(
				`<h2 id="msgTitle">${ev.title}</h2><p class="lede">${T('event.won')}</p>
			<p class="river-outcome" style="text-align:center">${T('event.gain', { reward: rewardText(ev.reward) })}</p>`,
				[
					[
						Tplain('event.sail', { stop: LEVELS[next].name }),
						() => {
							eventState = null;
							startLevel(next);
						},
						{ kind: 'go', sub: LEVELS[next].sub, icon: iconSvg('ui', 'barque') },
					],
				],
				{ noClose: true }
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
					[after.label, leaveChamber, { kind: 'quiet' }],
				],
				{ noClose: true }
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
						{ kind: 'go', sub: LEVELS[next].sub, icon: iconSvg('ui', 'barque') },
					],
					[Tplain('event.try_again'), () => startEvent(ev, next), { kind: 'quiet', icon: iconSvg('dock', 'restart') }],
				],
				{ noClose: true }
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
			? `<p class="trial-prize"><span><span class="arrow-label prize-label">${T('event.pay')}</span>${rewardText(ch.cost)}</span></p>`
			: ch.takeBoon
				? `<p class="trial-prize"><span><span class="arrow-label prize-label">${T('event.pay')}</span>${T('event.pay_boon')}</span></p>`
				: '';
		const get = ch.gamble
			? `<p class="trial-prize"><span><span class="arrow-label prize-label">${T('event.get')}</span>${T('event.gamble_get')}</span></p><p class="trial-risk">${T('event.gamble_risk')}</p>`
			: ch.give
				? getLine(ch.give)
				: '';
		return `<div class="trial-card river-card${no ? ' blocked' : ''}" role="button" tabindex="${no ? -1 : 0}" aria-disabled="${!!no}" data-ch="${i}">
			<p class="trial-goal">${ch.label}</p>${pay}${get}${no ? `<p class="trial-risk">${no}</p>` : ''}</div>`;
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
							{ kind: 'go', sub: LEVELS[next].sub, icon: iconSvg('ui', 'barque') },
						],
					],
					{ onClose: () => startLevel(next) }
				),
			50
		);
	};
	showMsg(
		`${riverHead(ev, next)}<p class="story">${ev.text}</p>${doing.map(card).join('')}`,
		leaving.map(ch => [ch.label, () => startLevel(next), { kind: 'quiet' }]),
		{ onClose: () => startLevel(next) }
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
