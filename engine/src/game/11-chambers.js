/* =============================================================================
 * 11-chambers.js: tombs, temples and oases: the small, dim boards beside a
 * stop, often with amulets under covers (content/chambers/, content/covers/).
 *
 * A chamber's doorway opens once its stop is gilded. Tombs and temples wake
 * when the player goes back in (cursed badges, rising rewards); oases stay
 * calm. The board itself is set up by setupSmallBoard() in
 * 10-river-events.js.
 *
 * What's here:
 *   chamberAt(i)        the chamber beside stop i, if any
 *   chamberOpen()       whether its doorway is open
 *   startChamber()      goes in; chamberFromWin() and chamberFromCard() go in
 *                       from the win scroll or the stop card
 *   visitReward(), returnBadges()
 *                       what a visit pays and the badges a return wakes
 *   leaveChamber()      comes out, to the next stop or back to the one before
 *   placeKey(), placeIcon()
 *                       the words and picture for a tomb, temple or oasis
 *                       (TOMB_WORDS)
 *   coversNote()        the note on a chamber's card about the covers on its
 *                       floor (content/covers/, "chamber_note")
 *   midSentence(), withArticle()
 *                       a name as it reads inside a sentence ("the Great
 *                       Hall"), by the article in content/text.jsonc, "names"
 *                       (also for relics, in 09-unlocks.js)
 *
 * Changes in the save: nothing directly (10-river-events.js records the
 * visits and pays the rewards).
 * ===========================================================================*/

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
	enter: 'chamber.enter',
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
	explore_short: 'win.explore_short',
	go_back_short: 'win.go_back_short',
	map_new: 'map.door_new',
	map_done: 'map.door_done',
};

// the note at the foot of a chamber's card: for each cover on its floor, the
// cover's "chamber_note" (content/covers/)
function coversNote(plan) {
	const here = new Set();
	for (const ch of plan.join('')) if (COVER_LETTERS[ch]) here.add(COVER_LETTERS[ch][0]);
	if (!here.size) return '';
	const notes = COVER_IDS.filter(id => here.has(id)).map(id => fill(COVERS[id].chamberNote));
	return `<div class="card-foot">${notes.join(' ')}</div>`;
}

function placeKey(c, word) {
	return c.oasis ? 'oasis.' + word : TOMB_WORDS[word];
}

function placeIcon(c) {
	return c.oasis ? 'oasis' : 'door';
} // images/icons/map/

// A name as it reads inside a sentence: "The Great Hall" becomes "the Great
// Hall" ("Explore the Great Hall"). The article and its form inside a
// sentence are the game's words (content/text.jsonc, "names"); a game or
// language without them leaves them out, and names stay as they are.
function midSentence(name) {
	const article = TEXT['names.article'] || '';
	return article && name.startsWith(article)
		? (TEXT['names.article_mid_sentence'] || '') + name.slice(article.length)
		: name;
}

// A name with its article inside a sentence, whether it has one or not:
// "the Silver key", and "the old mill" for The old mill.
function withArticle(name) {
	const article = TEXT['names.article'] || '';
	return (
		(TEXT['names.article_mid_sentence'] || '') +
		(article && name.startsWith(article) ? name.slice(article.length) : name)
	);
}
function chamberOpen(c) {
	return !!c && stageOn('chambers') && (save.stars[c.at] || 0) > 0;
}

function chamberHead(c) {
	return html`
		<p class="river-kicker chamber-kicker">
			<span class="arrow-label">${T(placeKey(c, 'kicker'), { stop: LEVELS[c.at].name })}</span>
		</p>
		<h2 id="msgTitle">${c.title}</h2>`;
}

function startChamber(c, after, again) {
	setupSmallBoard(c, c.at, { after }, Tplain(placeKey(c, 'sub'), { stop: LEVELS[c.at].name }));
	if (again) return; // straight back in after a failed try
	// the scroll opens on the entrance itself; the task is carved on a plaque
	const done = !!save.chambers[c.id],
		wins = save.chamberWins[c.id] || 0,
		stirs = !!returnBadges(c).badBadges;
	showMsg(
		html`
			<div class="chamber-portal">
				${iconSvg('ui', c.oasis ? 'oasis-view' : 'chamber-door', 'aria-hidden="true"')}
			</div> ${chamberHead(c)}
			<p class="chamber-text story">${c.text}</p>
			<div class="chamber-plaque">
				<div class="card-body">
					<p class="plaque-goal">${T('event.goal', { goal: T('event.gild'), n: core.startMoves })}</p>
					${getLine(visitReward(c), true)} ${
						done
							? html`
				<p class="plaque-again">
					${T(placeKey(c, 'again'), { n: wins })}${stirs ? ' ' + T('chamber.stirs') : ''}
				</p>`
							: ''
					}
				</div>
				${coversNote(c.map)}
			</div>`,
		[
			[
				Tplain(placeKey(c, 'enter')),
				() => {},
				{ kind: 'go', dark: true, oasis: !!c.oasis, icon: iconSvg('map', placeIcon(c)) },
			],
			[after.label, leaveChamber, { kind: 'quiet', short: Tplain('chamber.leave') }],
		],
		{ onClose: () => {} },
	);
}

// A tomb or temple already explored wakes when the player goes back in:
// cursed badges turn up, likelier with each return (settings.jsonc,
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

// "Explore the Great Hall" from the win screen (then sail on) or a stop's card
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
