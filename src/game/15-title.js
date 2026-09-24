// ---------- the title screen ----------
// The landing screen: shown on every launch, and returned to from the menu.
// It is an overlay over the board that is already loaded for your current stop,
// so "Continue" closes it and you are back exactly where you were.
function openTitle() {
	const stars = save.stars.reduce((a, b) => a + (b || 0), 0),
		relics = Object.keys(save.relics).length;
	const fresh = (save.unlocked || 0) === 0 && stars === 0;
	const cur = core ? core.level.name : LEVELS[save.current || 0].name;
	$('msgBody').innerHTML = `
		<p class="title-kicker">${T('title.kicker')}</p>
		<h2 id="msgTitle">${fresh ? T('title.heading_new') : T('title.heading_back')}</h2>
		<p class="lede title-status">${(save.journeys || 1) > 1 ? T('title.status_journey', { n: save.journeys }) : ''}${T('title.status', { stop: cur, stars, relics, total: RELICS.length })}</p>
		<div class="title-desc">${T('title.description')
			.split('<br>')
			.map(p => `<p>${p}</p>`)
			.join('')}</div>
		<div class="title-help"><button class="btn" data-t="help">${T('title.how_to_play')}</button><button class="btn" data-t="diff">${T('title.difficulty_now', { difficulty: DIFFICULTY[save.difficulty].name })}</button></div>
		<div class="title-actions">
			<button class="menu-item primary" data-t="continue"><svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS.continue}</svg><span class="mi-text"><strong>${fresh ? T('title.begin') : T('title.continue')}</strong><span>${fresh ? T('title.begin_sub', { first: LEVELS[0].name }) : T('title.continue_sub', { stop: cur })}</span></span></button>
			<button class="menu-item" data-t="journey"><svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS.journey}</svg><span class="mi-text"><strong>${T('title.new_journey')}</strong><span>${T('title.new_journey_sub', { first: LEVELS[0].name })}</span></span></button>
			<button class="menu-item" data-t="saves"><svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS.saves}</svg><span class="mi-text"><strong>${T('title.saves')}</strong><span>${T('title.saves_sub')}</span></span></button>
		</div>
		${journeyRoadmap(true)}
		<hr class="title-hr">
		<div class="menu-grid">
			${[
				['map', 'map'],
				['treasury', 'treasury'],
				['museum', 'museum'],
				['customise', 'customise'],
				['diff', 'difficulty'],
				['audio', 'audio'],
				['help', 'help'],
			]
				.map(([id, k]) => [id, T('title.' + k), T('title.' + k + '_sub')])
				.map(
					([id, t, d]) => `
			<button class="menu-item" data-t="${id}"><svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS[id]}</svg><span class="mi-text"><strong>${t}</strong><span>${d}</span></span></button>`
				)
				.join('')}
		</div>
		<hr class="title-hr">
		<div class="title-reset"><button class="btn danger" id="titleReset">${T('title.reset')}</button></div>`;
	$('msgBody')
		.querySelectorAll('[data-t]')
		.forEach(
			b =>
				(b.onclick = () => {
					const t = b.dataset.t;
					sfx('ui');
					if (t === 'continue') {
						closeOverlays();
						if (!save.seenHelp) setTimeout(openHelp, 250);
						return;
					}
					closeOverlays();
					({
						map: openMap,
						treasury: openTreasury,
						museum: openMuseum,
						customise: openCustomise,
						diff: openDifficulty,
						audio: openAudio,
						help: openHelp,
						saves: openSaves,
						journey: openNewJourney,
					})[t]();
				})
		);
	wirePace($('msgBody'));
	$('titleReset').onclick = () => {
		const btn = $('titleReset');
		if (btn.dataset.confirm) {
			localStorage.removeItem(SAVE_KEY);
			location.reload();
			return;
		}
		btn.dataset.confirm = '1';
		btn.textContent = Tplain('title.reset_sure');
		setTimeout(() => {
			if (btn.isConnected) {
				delete btn.dataset.confirm;
				btn.textContent = Tplain('title.reset');
			}
		}, 4000);
	};
	openOverlay('ovMsg');
	$('ovMsg').querySelector('.scroll').classList.add('wide');
	$('ovMsg').classList.add('title-screen');
}
