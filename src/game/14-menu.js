// ---------- sound and music settings ----------
function openAudio() {
	const pct = v => Math.round((v == null ? 1 : v) * 100);
	$('msgBody').innerHTML = `<h2 id="msgTitle">${T('audio.title')}</h2>
		<p class="lede">${T('audio.lede')}</p>
		<div class="audio-row"><label class="fill-toggle"><input type="checkbox" id="auMusic" ${save.music !== false ? 'checked' : ''}> ${T('audio.music')}</label>
			<input type="range" id="auMusicVol" min="0" max="100" value="${pct(save.musicVol == null ? 0.7 : save.musicVol)}" aria-label="${T('audio.music_volume')}"></div>
		<label class="fill-toggle harm-toggle"><input type="checkbox" id="auHarm" ${save.harmonise !== false ? 'checked' : ''} ${save.music === false ? 'disabled' : ''}> ${T('audio.harmonise')}</label>
		<div class="audio-row"><label class="fill-toggle"><input type="checkbox" id="auSfx" ${save.sound ? 'checked' : ''}> ${T('audio.effects')}</label>
			<input type="range" id="auSfxVol" min="0" max="100" value="${pct(save.sfxVol)}" aria-label="${T('audio.effects_volume')}"></div>
		<h3 class="shop-head">${T('audio.on_phones')}</h3>
		<label class="fill-toggle"><input type="checkbox" id="auVibe" ${save.vibrate ? 'checked' : ''}> ${T('audio.vibrate')}</label>
		<label class="fill-toggle"><input type="checkbox" id="auSteady" ${save.steadySound ? 'checked' : ''}> ${T('audio.steady')}</label>
		<p class="stall-note" id="auDelay"></p>`;
	const showDelay = () => {
		const ms = soundDelay();
		$('auDelay').textContent = ms ? Tplain('audio.delay', { ms }) : '';
	};
	showDelay();
	setTimeout(showDelay, 600); // some devices report the delay only once sound is playing
	$('auSteady').onchange = e => {
		save.steadySound = e.target.checked;
		persist();
		restartAudio();
		sfx('match', 2);
		setTimeout(showDelay, 600);
	};
	$('auMusic').onchange = e => {
		save.music = e.target.checked;
		persist();
		if (save.music) {
			getCtx();
			startMusic();
			musicVolume();
		} else stopMusic();
		$('auHarm').disabled = !save.music;
	};
	$('auHarm').onchange = e => {
		save.harmonise = e.target.checked;
		persist();
		if (save.harmonise) sfx('match', 1);
	};
	$('auMusicVol').oninput = e => {
		save.musicVol = e.target.value / 100;
		persist();
		musicVolume();
	};
	$('auSfx').onchange = e => {
		save.sound = e.target.checked;
		persist();
		if (save.sound) {
			getCtx();
			sfx('match', 3);
		}
	};
	$('auSfxVol').oninput = e => {
		save.sfxVol = e.target.value / 100;
		persist();
		if (sfxOut) sfxOut.gain.setTargetAtTime(0.9 * save.sfxVol, actx.currentTime, 0.05);
	};
	$('auSfxVol').onchange = () => sfx('match', 2);
	// vibration is off until the player turns it on; their choice is kept from then on
	$('auVibe').onchange = e => {
		save.vibrate = e.target.checked;
		save.vibrateChosen = true;
		persist();
		if (save.vibrate) vibrate(15);
	};
	openOverlay('ovMsg');
}

// ---------- menu ----------
// Menu and title-screen icons: content/icons/menu/<name>.svg (32 by 32)
const MENU_ICONS = {};
Object.keys(ICONS.menu || {}).forEach(k => {
	Object.defineProperty(MENU_ICONS, k, { get: () => iconArt('menu', k), enumerable: true });
});

function openMenu() {
	const items = [
		['map', T('menu.map'), T('menu.map_sub')],
		[
			'diff',
			T('menu.difficulty'),
			T('menu.difficulty_sub', { difficulty: DIFFICULTY[save.difficulty].name }),
		],
		...(stageOn('stall') ? [['stall', T('menu.stall'), T('menu.stall_sub')]] : []),
		['treasury', T('menu.treasury'), T('menu.treasury_sub')],
		[
			'museum',
			T('menu.museum'),
			T('menu.museum_sub', { n: Object.keys(save.relics).length, total: RELICS.length }),
		],
		['customise', T('menu.customise'), T('menu.customise_sub')],
		[
			'audio',
			T('menu.audio'),
			T('menu.audio_sub', {
				effects: save.sound ? Tplain('menu.on') : Tplain('menu.off'),
				music: save.music === false ? Tplain('menu.off') : Tplain('menu.on'),
				vibration: save.vibrate ? Tplain('menu.on') : Tplain('menu.off'),
			}),
		],
		['help', T('menu.help'), T('menu.help_sub')],
		['pace', T('menu.pace'), stageAllOn() ? T('menu.pace_sub_all') : T('menu.pace_sub')],
		['journey', T('menu.new_journey'), T('menu.new_journey_sub', { first: LEVELS[0].name }), 'quiet'],
	];
	$('msgBody').innerHTML =
		`<h2 id="msgTitle">${T('menu.title')}</h2><p class="lede">${(save.journeys || 1) > 1 ? T('menu.journey', { n: save.journeys }) : ''}${core ? (eventState ? T('menu.at_event') : T('menu.at_stop', { stop: core.level.name, n: levelIdx + 1, total: LEVELS.length })) : ''}</p>
		<div class="menu-top">
			<button class="menu-item primary" data-m="continue"><svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS.continue}</svg><span class="mi-text"><strong>${T('menu.back')}</strong><span>${T('menu.back_sub')}</span></span></button>
			<button class="menu-item full" data-m="title"><svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS.title}</svg><span class="mi-text"><strong>${T('menu.title_screen')}</strong><span>${T('menu.title_screen_sub')}</span></span></button>
			<button class="menu-item full" data-m="saves"><svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS.saves}</svg><span class="mi-text"><strong>${T('menu.saves')}</strong><span>${T('menu.saves_sub')}</span></span></button>
		</div>
		<hr class="title-hr">
		<div class="menu-grid">${items
			.map(
				([
					id,
					t,
					d,
					kind,
				]) => `<button class="menu-item${kind ? ' ' + kind : ''}${isNew(id === 'help' ? 'codex' : id) || (id === 'help' && Object.keys(save.fresh || {}).some(k => k.startsWith('codex:'))) ? ' has-new' : ''}" data-m="${id}">
			<svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS[id]}</svg><span class="mi-text"><strong>${t}</strong><span>${d}</span></span></button>`
			)
			.join('')}</div>`;
	$('msgBody')
		.querySelectorAll('.menu-item')
		.forEach(
			b =>
				(b.onclick = () => {
					const m = b.dataset.m;
					sfx('ui');
					if (m === 'continue') {
						closeOverlays();
						return;
					}
					closeOverlays();
					({
						pace: openPace,
						title: openTitle,
						map: openMap,
						stall: openStall,
						treasury: openTreasury,
						museum: openMuseum,
						customise: openCustomise,
						diff: openDifficulty,
						help: openHelp,
						saves: openSaves,
						journey: openNewJourney,
						audio: openAudio,
					})[m]();
				})
		);
	openOverlay('ovMsg');
	$('ovMsg').querySelector('.scroll').classList.add('wide');
}

// ---------- difficulty ----------
function openDifficulty() {
	const d0 = save.difficulty,
		fresh = core.movesLeft === core.startMoves && core.score === 0;
	const movesAt = (i, mid, fill) => {
		const m = boardMode(mid),
			wasN = N,
			wasR = ROWS,
			wasOmega = document.body.classList.contains('omega');
		if (m.dynamic) {
			document.body.classList.add('omega');
			const sz = omegaSize();
			setBoardSize(sz.cols, sz.rows);
			document.body.classList.toggle('omega', wasOmega);
		} else setBoardSize(m.n, fill ? rowsForScreen(m.n) : m.n);
		const Lp =
			m.maxTypes && core.level.types > m.maxTypes
				? Object.assign({}, core.level, { types: m.maxTypes })
				: core.level;
		const n = new Core(
			Lp,
			stopOptions({
				level: core.level,
				idx: levelIdx,
				mode: m,
				cols: N,
				rows: ROWS,
				shape: { map: null, ease: 1 },
				difficulty: i,
				upg: save.upg,
				badgesOn: stageOn('badges'),
			})
		).startMoves;
		const shape = N + ' \u00d7 ' + ROWS;
		setBoardSize(wasN, wasR);
		return { n, shape };
	};
	let pendMode = save.board,
		pendFill = save.fill !== false;
	$('msgBody').innerHTML = `<h2 id="msgTitle">${T('difficulty_screen.title')}</h2>
		<p class="lede">${T('difficulty_screen.lede')}</p>
		<div class="diff">
			<input type="range" id="diffRange" min="0" max="3" step="1" value="${d0}" aria-label="${T('difficulty_screen.slider')}" aria-valuetext="${DIFFICULTY[d0].name}">
			<div class="diff-ticks">${DIFFICULTY.map((d, i) => `<button type="button" data-i="${i}">${d.name}</button>`).join('')}</div>
		</div>
		<p id="diffText" class="diff-text"></p>
		<h3 class="shop-head" style="margin-top:14px">${T('difficulty_screen.board')}</h3>
		<div class="size-pick" id="sizePick">${BOARD_MODES.map(b => `<button type="button" data-m="${b.id}"><strong>${b.name}</strong><span class="size-label">${b.label}</span><span class="size-desc">${b.desc}</span></button>`).join('')}</div>
		<label class="fill-toggle"><input type="checkbox" id="fillChk" ${save.fill !== false ? 'checked' : ''}> ${T('difficulty_screen.fill')}</label>
		<p id="diffMoves" class="diff-moves"></p>
		<div class="actions" id="diffActions"></div>`;
	const range = $('diffRange');
	const render = () => {
		const i = +range.value,
			d = DIFFICULTY[i];
		range.setAttribute('aria-valuetext', d.name);
		range.style.setProperty('--p', (i / 3) * 100 + '%');
		$('msgBody')
			.querySelectorAll('.diff-ticks button')
			.forEach(b => b.classList.toggle('on', +b.dataset.i === i));
		$('diffText').textContent = d.text;
		$('msgBody')
			.querySelectorAll('.size-pick button')
			.forEach(b => b.classList.toggle('on', b.dataset.m === pendMode));
		const at = movesAt(i, pendMode, pendFill);
		$('diffMoves').textContent =
			Tplain('difficulty_screen.moves', { stop: core.level.name, n: at.n, shape: at.shape }) +
			(d.hintAfter ? '' : Tplain('difficulty_screen.no_hints')) +
			'.';
		const changed =
			i !== save.difficulty || pendMode !== save.board || pendFill !== (save.fill !== false);
		const DB = (a, k) => `<button class="btn" data-a="${a}">${T('difficulty_screen.' + k)}</button>`;
		$('diffActions').innerHTML = !changed
			? DB('close', 'done')
			: fresh
				? DB('restart', 'start') + DB('cancel', 'cancel')
				: DB('restart', 'restart') + DB('later', 'later') + DB('cancel', 'cancel');
		$('diffActions')
			.querySelectorAll('.btn')
			.forEach(
				b =>
					(b.onclick = () => {
						const a = b.dataset.a;
						if (a === 'restart' || a === 'later') {
							save.difficulty = +range.value;
							save.board = pendMode;
							save.fill = pendFill;
							persist();
						}
						closeOverlays();
						if (a === 'restart') startLevel(levelIdx);
						else updateHUD();
					})
			);
	};
	range.oninput = () => {
		render();
		sfx('select', 1, +range.value / 3);
	};
	$('msgBody')
		.querySelectorAll('.diff-ticks button')
		.forEach(
			b =>
				(b.onclick = () => {
					range.value = b.dataset.i;
					range.oninput();
				})
		);
	$('msgBody')
		.querySelectorAll('.size-pick button')
		.forEach(
			b =>
				(b.onclick = () => {
					pendMode = b.dataset.m;
					sfx('select');
					render();
				})
		);
	$('fillChk').onchange = e => {
		pendFill = e.target.checked;
		render();
	};
	render();
	openOverlay('ovMsg');
	setTimeout(() => range.focus(), 40);
}
