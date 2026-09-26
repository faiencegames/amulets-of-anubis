/* =============================================================================
 * 26-stages.js: staging: on a first journey the game's parts arrive one at
 * a time and "new" dots.
 *
 * What's here:
 *   STAGES              each part (trials, boons, the stall, badges, curses,
 *                       chambers, ...): the stop it arrives at is in
 *                       content/settings.jsonc ("staging"), its banner in
 *                       content/text.jsonc
 *   stageOn(name)       whether a part is on yet; check it before showing
 *                       anything that belongs to one
 *   meetStages()        banners for anything newly on (at the start of every
 *                       stop)
 *   markNew(), clearNew(), isNew()
 *                       "new" dots on the dock and the Menu, until that
 *                       screen is opened
 *   openPace()          Menu → Learning pace: everything on at once, or back
 *                       to one at a time
 *
 * Changes in the save: staged, met, fresh.
 * ===========================================================================*/

// ---------- staging: one new thing at a time ----------
// On the first journey the game's systems arrive one by one, each with a
// one-line banner the first time it is on. `at` is how far the journey must
// have got (save.unlocked, the furthest stop open, counted from 0); 'journey'
// means the whole journey has been gilded once. From the second journey on, in
// try-out mode, and for saves from before staging, everything is on.
// When each arrives is in content/settings.jsonc ("staging"); its words (title,
// banner text, and a line saying what it is) in content/text.jsonc ("stages").
const STAGE_MARKS = {
	seals: ['map', 'codex:omens'],
	badges: ['codex:badges'],
	trials: ['codex:trials', 'codex:boons'],
	stall: ['stall'],
	events: ['codex:events'],
	curses: ['codex:badges'],
	chambers: ['map', 'codex:places'],
	omens: ['map', 'codex:omens'],
};

const STAGES = Object.keys(STAGE_MARKS).map(id => ({
	id,
	at: CONTENT.settings.staging[id],
	mark: STAGE_MARKS[id],
	get title() {
		return T(`stages.${id}.title`);
	},
	get text() {
		return T(`stages.${id}.text`);
	},
	get what() {
		return T(`stages.${id}.what`);
	},
}));
// "The game grows as you travel": the list of what arrives when, with a tick
// for what is already on. Shown in How to play (Basics).
function stageWhen(st) {
	return st.at === 'journey'
		? T('roadmap.after_journey')
		: st.at === 1
			? T('roadmap.after_first_win')
			: T('roadmap.from_stop', { n: st.at + 1 });
}

function journeyRoadmap(compact) {
	const all = stageAllOn();
	const rows = STAGES.map(st => {
		const on = stageOn(st.id);
		return html`
			<li class="${on ? 'on' : ''}">
				<span class="rm-mark" aria-hidden="true">${on ? '\u2713' : '\u25CB'}</span>
				<span class="rm-text">
					<strong>${st.title}</strong> <span class="rm-what">\u2014 ${st.what}</span>
				</span>
				<span class="rm-when">${on ? T('roadmap.open') : stageWhen(st)}</span>
			</li>`;
	}).join('');
	return `<div class="roadmap${compact ? ' compact' : ''}">
		<p class="rm-head">${T('roadmap.head')} ${all ? T('roadmap.head_all') : T('roadmap.head_more')}</p>
		<ul class="rm-list">${rows}</ul>
		${
			all
				? ''
				: html`
			<p class="rm-foot">
				${T('roadmap.rather')} 
				<button type="button" class="btn small" data-pace>${T('roadmap.pace_button')}</button>
			</p>`
		}
	</div>`;
}

function wirePace(root) {
	root.querySelectorAll('[data-pace]').forEach(
		b =>
			(b.onclick = () => {
				sfx('ui');
				closeOverlays();
				openPace();
			}),
	);
}

function stageAllOn() {
	return TRY || save.staged === 'all' || (save.journeys || 1) > 1 || STAGES.every(st => stageOn(st.id));
}

// Menu -> Learning pace: a player who wants every system from the start can
// turn them all on at once (and back to one at a time, while still on the
// first journey).
function openPace() {
	const all = save.staged === 'all';
	showMsg(
		html`
			<h2 id="msgTitle">${T('pace.title')}</h2>
			<p class="lede">${T('pace.lede')}</p>
			<div class="size-pick pace-pick">
				<button type="button" data-p="staged" class="${all ? '' : 'on'}">
					<strong>${T('pace.one')}</strong>
					<span>${T('pace.one_sub')}</span>
				</button>
				<button type="button" data-p="all" class="${all ? 'on' : ''}">
					<strong>${T('pace.all')}</strong>
					<span>${T('pace.all_sub')}</span>
				</button>
			</div>
			<p class="shop-desc" style="text-align:center">
				${T('pace.note')}${(save.journeys || 1) > 1 ? T('pace.note_later') : ''}
			</p>`,
		[[Tplain('pace.done'), () => {}, { kind: 'exit' }]],
	);
	$('msgBody')
		.querySelectorAll('.pace-pick button')
		.forEach(
			b =>
				(b.onclick = () => {
					const want = b.dataset.p === 'all' ? 'all' : 1;
					if (save.staged === want) return;
					save.staged = want;
					if (want === 'all') {
						const fresh = STAGES.filter(st => !save.met[st.id]);
						fresh.forEach(st => {
							save.met[st.id] = 1;
							(st.mark || []).forEach(k => {
								save.fresh[k] = 1;
							});
						});
						if (fresh.length)
							announce(
								T('banner.everything'),
								T('banner.everything_name'),
								'',
								T('banner.everything_text'),
								'create',
							);
					}
					persist();
					applyStages();
					applyNewMarks();
					sfx('select');
					openPace();
				}),
		);
}

function stageOn(id) {
	if (TRY || save.staged === 'all' || (save.journeys || 1) > 1) return true;
	const st = STAGES.find(x => x.id === id);
	if (!st) return true;
	if (st.at === 'journey') return (save.stars[LEVELS.length - 1] || 0) > 0;
	return (save.unlocked || 0) >= st.at;
}

// banners for anything newly on; called whenever a stop starts
function meetStages() {
	STAGES.forEach(st => {
		if (!save.met[st.id] && stageOn(st.id)) {
			save.met[st.id] = 1;
			if (save.staged !== 'all' && !TRY) {
				announce(T('banner.new'), st.title, '', st.text, 'create');
				(st.mark || []).forEach(markNew);
			}
		}
	});
	persist();
	applyStages();
}

// "New" dots: something appeared that the player has not looked at yet. A dot
// sits on the dock button (and the Menu entry) until that screen is opened;
// codex:<tab> puts one on the Help button and on that codex tab.
function markNew(key) {
	save.fresh = save.fresh || {};
	save.fresh[key] = 1;
	persist();
	applyNewMarks();
}

function clearNew(key) {
	if (save.fresh && save.fresh[key]) {
		delete save.fresh[key];
		persist();
		applyNewMarks();
	}
}

function isNew(key) {
	return !!(save.fresh || {})[key];
}

function applyNewMarks() {
	const f = save.fresh || {},
		codex = Object.keys(f).some(k => k.startsWith('codex:'));
	[
		['btnMap', 'map'],
		['btnStall', 'stall'],
		['btnTreasury', 'treasury'],
		['btnCustomise', 'customise'],
	].forEach(([id, k]) => {
		const b = $(id);
		if (b) b.classList.toggle('has-new', !!f[k]);
	});
	const h = $('btnHelp');
	if (h) h.classList.toggle('has-new', codex);
	const m = $('btnMenu');
	if (m) m.classList.toggle('has-new', Object.keys(f).length > 0);
}

// what is shown depends on what is on: the stall button, and the boon row,
// which stays hidden until there is something in it or trials have begun
function applyStages() {
	const stall = stageOn('stall');
	[$('btnStall')].forEach(b => {
		if (b) b.hidden = !stall;
	});
	const showBoons = stageOn('trials') || (save.boons || []).length > 0;
	applyNewMarks();
	[$('boonRow'), $('boonRowM')].forEach(el => {
		if (el) el.hidden = !showBoons;
	});
	document.body.classList.toggle('no-boons', !showBoons); // on a phone the dock then keeps its own top edge
	document.body.classList.toggle('no-stall', !stall); // one dock button fewer, so the boons above follow
}
