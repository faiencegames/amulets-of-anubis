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

// The Menu: back to the board first, then eight tiles, then the three ways out
// of the game (title screen, saves, a new journey) small at the foot. Until
// Anubis's stall opens on a first journey, its tile is the learning pace, so
// the tiles always make two full rows.
function openMenu() {
	const onOff = v => Tplain(v ? 'menu.on' : 'menu.off');
	const tiles = [
		['map', T('menu.tiles.map'), '', T('menu.map_sub')],
		['treasury', T('menu.tiles.treasury'), '', T('menu.treasury_sub')],
		stageOn('stall')
			? ['stall', T('menu.tiles.stall'), '', T('menu.stall_sub')]
			: ['pace', T('menu.tiles.pace'), '', T('menu.pace_sub')],
		[
			'museum',
			T('menu.tiles.museum'),
			T('menu.tiles.museum_n', { n: Object.keys(save.relics).length, total: RELICS.length }),
			T('menu.museum_sub', { n: Object.keys(save.relics).length, total: RELICS.length }),
		],
		['diff', T('menu.tiles.difficulty'), DIFFICULTY[save.difficulty].name, T('menu.difficulty_sub', { difficulty: DIFFICULTY[save.difficulty].name })],
		['customise', T('menu.tiles.customise'), '', T('menu.customise_sub')],
		[
			'audio',
			T('menu.tiles.audio'),
			T('menu.tiles.audio_state', { music: onOff(save.music !== false) }),
			T('menu.audio_sub', { effects: onOff(save.sound), music: onOff(save.music !== false), vibration: onOff(save.vibrate) }),
		],
		['help', T('menu.tiles.help'), '', T('menu.help_sub')],
	];
	const fresh = id => isNew(id === 'help' ? 'codex' : id) || (id === 'help' && Object.keys(save.fresh || {}).some(k => k.startsWith('codex:')));
	const foot = [
		['title', T('menu.title_screen')],
		['saves', T('menu.saves')],
		['journey', T('menu.new_journey_short')],
	];
	$('msgBody').innerHTML =
		`<h2 id="msgTitle">${T('menu.title')}</h2><p class="lede">${(save.journeys || 1) > 1 ? T('menu.journey', { n: save.journeys }) : ''}${core ? (eventState ? T('menu.at_event') : T('menu.at_stop', { stop: core.level.name, n: levelIdx + 1, total: LEVELS.length })) : ''}</p>
		<button class="act-go" data-m="continue"><span class="act-ico"><svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS.continue}</svg></span><span class="act-words">${T('menu.back')}<small>${T('menu.back_sub')}</small></span><span class="act-arrow" aria-hidden="true">\u203a</span></button>
		<hr class="title-hr">
		<div class="menu-tiles">${tiles
			.map(
				([id, name, state, what]) =>
					`<button class="menu-tile${fresh(id) ? ' has-new' : ''}" data-m="${id}" title="${plainText(what)}"><svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS[id]}</svg><strong>${name}</strong>${state ? `<small>${state}</small>` : ''}</button>`
			)
			.join('')}</div>
		<div class="menu-foot">${foot
			.map(([id, name]) => `<button class="act-quiet" data-m="${id}"><svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS[id]}</svg>${name}</button>`)
			.join('')}</div>`;
	$('msgBody')
		.querySelectorAll('[data-m]')
		.forEach(
			b =>
				(b.onclick = () => {
					const m = b.dataset.m;
					sfx('ui');
					closeOverlays();
					if (m === 'continue') return;
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
