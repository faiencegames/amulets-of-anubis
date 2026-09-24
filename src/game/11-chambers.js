// ---------- tomb and temple chambers ----------
// A chamber is a small, dim board beside a stop (content/chambers/), with
// amulets buried in sand. Its doorway opens once that stop is gilded (and
// chambers are staged in); it is offered on the win screen, on the stop's
// card and by a doorway on the map. Its reward is paid the first time; each
// later visit pays its smaller return reward, and a tomb or temple grows
// more dangerous each time (returnBadges). `after` is where the
// player goes on leaving: {label, go}.
function chamberAt(i) {
	return CHAMBERS.find(c => c.at === i);
}

// A tomb or temple and an oasis share everything but their words and
// pictures: placeKey() turns a word's name into the text for this place.
const TOMB_WORDS = {
	kicker: 'chamber.kicker',
	sub: 'chamber.sub',
	hud: 'chamber.hud',
	enter: 'chamber.enter',
	cover: 'chamber.sand',
	again: 'chamber.again',
	go_back: 'win.go_back',
	won: 'chamber.won',
	lost: 'chamber.lost',
	lost_text: 'chamber.lost_text',
	heading: 'stop.chamber',
	card_new: 'stop.chamber_new',
	card_done: 'stop.chamber_done',
	locked: 'stop.chamber_locked',
	win_note: 'win.chamber',
	win_again: 'win.chamber_again',
	explore: 'win.explore',
	map_new: 'map.door_new',
	map_done: 'map.door_done',
};

function placeKey(c, word) {
	return c.oasis ? 'oasis.' + word : TOMB_WORDS[word];
}

function placeIcon(c) {
	return c.oasis ? 'oasis' : 'door';
} // images/icons/map/
function midSentence(name) {
	return name.replace(/^The /, 'the ');
} // "Explore the Serapeum"
function chamberOpen(c) {
	return !!c && stageOn('chambers') && (save.stars[c.at] || 0) > 0;
}

function chamberHead(c) {
	return `<p class="river-kicker chamber-kicker"><span class="arrow-label">${T(placeKey(c, 'kicker'), { stop: LEVELS[c.at].name })}</span></p><h2 id="msgTitle">${c.title}</h2>`;
}

function startChamber(c, after, again) {
	setupSmallBoard(c, c.at, { after }, Tplain(placeKey(c, 'sub'), { stop: LEVELS[c.at].name }));
	if (again) return; // straight back in after a failed try
	// the scroll opens on the entrance itself; the task is carved on a plaque
	const done = !!save.chambers[c.id],
		wins = save.chamberWins[c.id] || 0,
		stirs = !!returnBadges(c).badBadges;
	showMsg(
		`<div class="chamber-portal">${iconSvg('ui', c.oasis ? 'oasis-view' : 'chamber-door', 'aria-hidden="true"')}</div>
		${chamberHead(c)}<p class="chamber-text story">${c.text}</p>
		<div class="chamber-plaque">
			<p class="plaque-goal"><span class="arrow-label">${T('trial.do')}</span>${T('event.goal', { goal: T('event.gild'), n: core.startMoves })}</p>
			${getLine(visitReward(c))}
			${done ? `<p class="plaque-again">${T(placeKey(c, 'again'), { n: wins })}${stirs ? ' ' + T('chamber.stirs') : ''}</p>` : ''}
			<p class="plaque-sand">${T(placeKey(c, 'cover'))}</p>
		</div>`,
		[
			[Tplain(placeKey(c, 'enter')), () => {}, { kind: 'go', dark: true, oasis: !!c.oasis, icon: iconSvg('map', placeIcon(c)) }],
			[after.label, leaveChamber, { kind: 'quiet' }],
		],
		{ onClose: () => {} }
	);
}

// A tomb or temple already explored wakes when the player goes back in:
// cursed badges turn up, likelier with each return (settings.json,
// "returning"). Oases stay calm; there are never curses on Relaxed, or
// before curses have arrived on a first journey.
function returnBadges(c) {
	const wins = save.chamberWins[c.id] || 0;
	if (!wins) return {};
	const R = CONTENT.settings.returning;
	const out = { powerChance: R.badgeChance };
	if (c.torch && save.difficulty > 0 && stageOn('curses'))
		Object.assign(out, {
			badBadges: true,
			badMult: Math.min(R.most, R.curseMult + R.eachReturn * (wins - 1)),
		});
	return out;
}

// What this visit pays: the reward the first time; after that the return
// reward, which in a tomb or temple rises with each return, as the curses
// do, until they stop growing.
function visitReward(c) {
	const wins = save.chamberWins[c.id] || 0;
	if (!save.chambers[c.id]) return c.reward;
	if (!c.torch) return c.returnReward;
	const R = CONTENT.settings.returning;
	const steps = Math.min(wins - 1, Math.ceil((R.most - R.curseMult) / Math.max(1, R.eachReturn)));
	const mult = 1 + R.rewardGrowth * Math.max(0, steps);
	const out = {};
	for (const k of ['gold', 'lapis']) if (c.returnReward[k]) out[k] = Math.round(c.returnReward[k] * mult);
	return out;
}

function leaveChamber() {
	const after = eventState && eventState.after;
	eventState = null;
	if (after) after.go();
}

// "Explore the Serapeum" from the win screen (then sail on) or a stop's card
// (then back to the stop the player was at)
function chamberFromWin(c, i) {
	const last = i === LEVELS.length - 1;
	return last
		? {
				label: Tplain('win.map'),
				go: () => {
					startLevel(i);
					openMap();
				},
			}
		: { label: Tplain('win.sail', { stop: LEVELS[i + 1].name }), go: () => goNext(i + 1) };
}

function chamberFromCard() {
	const back = levelIdx;
	return { label: Tplain('chamber.back', { stop: LEVELS[back].name }), go: () => startLevel(back) };
}
