// ---------- winning and losing a stop ----------
function levelWon() {
	if (trial && !trial.done && !trial.failed) {
		if (trial.goal === 'moves_to_spare') {
			trial.n = core.movesLeft;
			if (trial.n >= trial.target) completeTrial();
		} else if (trial.goal === 'no_boons' && !core.boonUsed) {
			trial.n = trial.target;
			completeTrial();
		}
	}
	if (trial && !trial.done) failTrial(true);
	const curseNote = save.curse
		? `<p class="curse-note">${T('win.curse', { curse: curseWords(save.curse) })}</p>`
		: '';
	trial = null;
	const bonus = core.movesLeft * 100;
	core.score += bonus;
	updateHUD();
	const ratio = core.movesLeft / core.startMoves,
		SS = CONTENT.settings.stars,
		stars = ratio >= SS.three ? 3 : ratio >= SS.two ? 2 : 1; // content/settings.json, "stars"
	save.stars[levelIdx] = Math.max(save.stars[levelIdx] || 0, stars);
	save.unlocked = Math.max(save.unlocked, Math.min(levelIdx + 1, LEVELS.length - 1));
	const earnK = boardMode(save.board).earn || 1;
	const nOmens = (core.omens || []).length,
		omenK = 1 + OMEN_BONUS * nOmens;
	const winGold = Math.round(
			((core.movesLeft * EARN.spareMoveGold + EARN.winGold) * earnK +
				upgradeTotal('win_gold', save.upg)) *
				omenK
		),
		winLapis = Math.round((EARN.winLapis + upgradeTotal('win_lapis', save.upg)) * omenK);
	const stopId = LEVELS[levelIdx].id;
	if (nOmens) {
		save.omens = save.omens || {};
		save.omens[stopId] = Math.max(save.omens[stopId] || 0, nOmens);
	}
	save.gold += winGold;
	save.goldEarned = (save.goldEarned || 0) + winGold;
	save.lapis += winLapis;
	save.lapisEarned = (save.lapisEarned || 0) + winLapis;
	const preFails = save.fails[levelIdx] || 0;
	save.fails[levelIdx] = 0;
	save.streak = (save.streak || 0) + 1;
	save.wins = (save.wins || 0) + 1;
	save.life.wins = (save.life.wins || 0) + 1;
	if (save.difficulty >= 2) save.life.hardWins = (save.life.hardWins || 0) + 1;
	const cs0 = core.stat || {};
	save.lastWin = {
		idx: levelIdx,
		stop: stopId,
		spare: core.movesLeft,
		noBoon: !core.boonUsed,
		omega: save.board === 'omega',
		board: save.board,
		difficulty: save.difficulty,
		duet: !!core.duetFired,
		preFails,
		omens: nOmens,
		suns: cs0.suns || 0,
		cascade: cs0.cascade || 0,
		specials: cs0.specials || 0,
	};
	const newSeals = stampSeals(levelIdx);
	persist();
	checkRelics();
	updateHUD();
	sfx('win');
	musicResolve(true);
	vibrate([0, 60, 90]);
	for (let i = 0; i < 40; i++) burst(Math.random() * N - 0.5, Math.random() * ROWS - 0.5, 1);
	const last = levelIdx === LEVELS.length - 1,
		next = LEVELS[levelIdx + 1],
		wonAt = levelIdx;
	const doorway = chamberOpen(chamberAt(levelIdx)) ? chamberAt(levelIdx) : null;
	if (doorway && !save.met['door:' + doorway.id]) {
		save.met['door:' + doorway.id] = 1;
		markNew('map');
		persist();
	}
	setTimeout(() => {
		busy = false;
		showMsg(
			`<h2 id="msgTitle">${T('win.title', { stop: core.level.name })}</h2>
			<p class="lede">${last ? T('win.lede_last', { first: LEVELS[0].name, last: LEVELS[LEVELS.length - 1].name }) : T('win.lede')}</p>
			<div class="stars">${[1, 2, 3].map(i => starSvg(i <= stars)).join('')}</div>
			<p style="text-align:center">${T('win.score', { score: core.score.toLocaleString() })}${bonus ? T('win.score_bonus', { bonus: bonus.toLocaleString(), n: core.movesLeft }) : ''}.</p>
			<p style="text-align:center">${T('win.rewards', { gold: winGold.toLocaleString(), lapis: winLapis.toLocaleString() })}${nOmens ? ` <em>${T('win.omens', { x: omenK.toFixed(1), n: nOmens })}</em>` : ''}</p>
			${sealsLine(levelIdx, newSeals)}
			${curseNote}
			${last ? `<p style="text-align:center">${T('win.journey_done')}</p>` : ''}`,
			[
				// the way on first, then the doorway, if one is here, then the rest, quietly
				last
					? [Tplain('win.map'), openMap, { kind: 'go', icon: iconSvg('dock', 'map') }]
					: [
							Tplain('win.sail', { stop: next.name }),
							() => goNext(levelIdx + 1),
							{ kind: 'go', sub: next.sub, icon: iconSvg('ui', 'barque') },
						],
				...(doorway
					? [
							[
								Tplain(placeKey(doorway, save.chambers[doorway.id] ? 'go_back' : 'explore'), {
									name: midSentence(doorway.title),
								}),
								() => startChamber(doorway, chamberFromWin(doorway, wonAt)),
								{
									kind: 'card',
									dark: true,
									oasis: !!doorway.oasis,
									icon: iconSvg('map', placeIcon(doorway)),
									sub: T(placeKey(doorway, save.chambers[doorway.id] ? 'win_again' : 'win_note'), {
										name: midSentence(doorway.title),
									}),
								},
							],
						]
					: []),
				...(last
					? [[Tplain('win.play_again'), () => openStop(levelIdx), { kind: 'quiet', icon: iconSvg('dock', 'restart') }]]
					: [
							[Tplain('win.map'), openMap, { kind: 'quiet', icon: iconSvg('dock', 'map') }],
							[Tplain('win.replay'), () => openStop(levelIdx), { kind: 'quiet', icon: iconSvg('dock', 'restart') }],
						]),
			],
			{ noClose: true }
		);
	}, 900);
}

function levelLost() {
	if ((save.charges.wind || 0) > 0) {
		save.charges.wind--;
		persist();
		core.movesLeft += 3;
		updateHUD();
		sfx('moves');
		popups.push({
			text: Tplain('popup.second_wind_moves'),
			x: N / 2,
			y: ROWS / 2,
			life: 2,
			size: 0.5,
			col: '#bfe8ff',
		});
		busy = false;
		return;
	}
	if (trial && !trial.done) failTrial(true);
	const curseNote = save.curse
		? `<p class="curse-note">${T('lose.curse', { curse: curseWords(save.curse) })}</p>`
		: '';
	trial = null;
	sfx('lose');
	musicResolve(false);
	const left = core.remaining();
	// persistence: the Gods notice a traveller who keeps trying
	save.streak = 0;
	const f = (save.fails[levelIdx] || 0) + 1;
	save.fails[levelIdx] = f;
	let gift = '';
	if (f === PERSISTENCE.boonAtFail) {
		const b = randomBoon();
		save.boons.push(b);
		gift = ` and ${BOONS[b].name}`;
		renderBoons();
	}
	persist();
	const nextBonus = Math.min(PERSISTENCE.maxFails, f) * PERSISTENCE.movesPerFail;
	// only a genuine near miss is offered the extra moves
	// the near-miss offer: the stall's first item that gives moves right away
	const breath = STALL.find(x => x.give && x.give.moves),
		price = breath ? stallPrice(breath) : 0,
		close = left <= Math.max(5, Math.round(core.total * 0.15)),
		canBuy = !!breath && close && save[breath.cur] >= price;
	setTimeout(() => {
		busy = false;
		const acts = [];
		if (canBuy)
			acts.push([
				`${breath.name} (${price} ${breath.cur})`,
				() => {
					save[breath.cur] -= price;
					core.stallBought[breath.id] = (core.stallBought[breath.id] || 0) + 1;
					core.movesLeft += breath.give.moves;
					persist();
					updateHUD();
					sfx('moves');
					musicStopBegins();
					musicFollow();
					popups.push({
						text: Tplain('popup.n_moves', { n: breath.give.moves }),
						x: N / 2,
						y: ROWS / 2,
						life: 1.6,
						size: 0.6,
						col: '#bfe8ff',
					});
					save.fails[levelIdx] = Math.max(0, f - 1);
					persist();
				},
				{ kind: 'card', sub: T('lose.buy', { n: breath.give.moves }) },
			]);
		acts.unshift([Tplain('lose.try_again'), () => startLevel(levelIdx), { kind: 'go', icon: iconSvg('dock', 'restart') }]);
		acts.push([Tplain('lose.map'), openMap, { kind: 'quiet', icon: iconSvg('dock', 'map') }]);
		showMsg(
			`<h2 id="msgTitle">${T('lose.title')}</h2>
			<p class="lede">${T('lose.lede', { n: left })}</p>
			<p class="persist-note">${T('lose.persist', { n: nextBonus })}${gift}.</p>
			<p style="text-align:center">${T('lose.tip')}</p>${curseNote}`,
			acts,
			{ noClose: true }
		);
	}, 700);
}
