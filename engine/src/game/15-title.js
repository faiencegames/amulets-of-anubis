/* =============================================================================
 * 15-title.js: the title screen.
 *
 * Its own layer (#ovTitle) over the scenery of the stop the player is at,
 * with the rest of the game hidden (body.at-title). Shown on every launch
 * and from the Menu.
 *
 * What's here:
 *   openTitle()         the title screen: Continue and the smaller ways in
 *                       (How to play, sound, saves, a new journey)
 *
 * Changes in the save: nothing.
 * ===========================================================================*/

// ---------- the title screen ----------
// The landing screen: shown on every launch, and returned to from the menu.
// It lies over the scenery of the stop you are at, with the rest of the game
// hidden behind it (body.at-title), so "Continue" takes it away and you are
// back exactly where you were.
function openTitle() {
	const stars = save.stars.reduce((a, b) => a + (b || 0), 0),
		relics = Object.keys(save.relics).length;
	const fresh = (save.unlocked || 0) === 0 && stars === 0;
	const cur = core ? core.level.name : LEVELS[save.current || 0].name;
	const small = [
		['help', T('title.how_to_play')],
		['diff', T('title.difficulty_now', { difficulty: DIFFICULTY[save.difficulty].label })],
		['saves', T('title.saves')],
		...(fresh ? [] : [['journey', T('title.new_journey')]]),
	];
	$('titleBody').innerHTML = html`
		${iconSvg('ui', 'title-mark', 'class="title-mark" aria-hidden="true"')} <h1 class="title-name" id="titleName">${T('title.name')}</h1>
		<p class="title-sub">${T('title.sub')}</p>
		<hr class="title-hr">
		<p class="title-status">
			${fresh ? T('title.heading_new') : `${T('title.heading_back')} \u00b7 ${(save.journeys || 1) > 1 ? T('title.status_journey', { n: save.journeys }) : ''}${T('title.status', { stop: cur })} <span class="title-count" title="${Tplain('title.stars_title', { stars })}">${starSvg(true)} ${stars}</span> · <span class="title-count" title="${Tplain('title.relics_title', { n: relics, total: RELICS.length })}"><span class="g-ico jar"></span> ${T('title.relics', { n: relics, total: RELICS.length })}</span>`}
		</p>
		<button class="act-go title-go" data-t="continue">
			${iconSvg('ui', 'boat')}
			<span class="act-words">
				${fresh ? T('title.begin') : T('title.continue')}
				<small>
					${fresh ? T('title.begin_sub', { first: LEVELS[0].name }) : T('title.continue_sub', { stop: cur })}
				</small>
			</span>
			<span class="act-arrow" aria-hidden="true">\u203a</span>
		</button>
		<div class="title-small">
			${small.map(([id, name]) => `<button class="btn" data-t="${id}">${name}</button>`).join('')}
		</div>
		<p class="title-quote">
			${T('title.quote')}
			<span class="title-quote-by">${T('title.quote_by')}</span>
		</p>
		<button class="title-sound" data-t="audio" title="${Tplain('title.sound')}" aria-label="${Tplain('title.sound')}">
			<svg viewBox="0 0 32 32" aria-hidden="true">${iconArt('ui', 'speaker')}</svg>
		</button>`; // the sound button last, so Continue gets the focus first
	$('titleBody')
		.querySelectorAll('[data-t]')
		.forEach(
			b =>
				(b.onclick = () => {
					const t = b.dataset.t;
					sfx('ui');
					closeOverlays();
					if (t === 'continue') {
						if (!save.seenHelp) setTimeout(openHelp, 250);
						return;
					}
					({
						diff: openDifficulty,
						audio: () => openSettings('sound'),
						help: openHelp,
						saves: openSaves,
						journey: openNewJourney,
					})[t]();
				}),
		);
	openOverlay('ovTitle');
	document.body.classList.add('at-title');
	document.body.classList.remove('booting');
}
