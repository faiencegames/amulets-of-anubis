/* =============================================================================
 * 14-menu.js: the Menu and the settings it opens.
 *
 * What's here:
 *   openMenu()          the Menu: eight tiles in two rows (the map, How to
 *                       play, the Treasury, Customise, the Museum, sound,
 *                       difficulty and the stall or Learning pace) and the
 *                       ways out of the game small at the foot
 *   openSettings()      Settings: sound and music, vibration, colours,
 *                       motion and effects, this device; five tiles, each
 *                       opening its part (settingsSound() and the rest)
 *   openDifficulty()    difficulty, board shape and "fill the screen"; a
 *                       change restarts the stop
 *   MENU_ICONS          the Menu's icons (images/icons/menu/)
 *
 * Changes in the save: the settings: sound, music, musicVol, sfxVol,
 * harmonise, steadySound, vibrate, vibrateChosen, colours, motion,
 * difficulty, board, fill.
 * ===========================================================================*/

// ---------- settings ----------
// Settings: five parts as tiles, each with how it stands, opening one at a
// time with a way back to the tiles. Sound, vibration, colours and motion are
// kept in the save; how the board is drawn and fewer effects belong to this
// device (deviceSetting(), 00-open.js).
const SETTINGS_PARTS = ['sound', 'vibration', 'colours', 'motion', 'device'];
function settingsGist(part) {
	const onOff = v => Tplain(v ? 'menu.on' : 'menu.off');
	if (part === 'sound') return T('menu.tiles.audio_state', { music: onOff(save.music !== false) });
	if (part === 'vibration') return canVibrate ? onOff(save.vibrate) : T('settings.not_here');
	if (part === 'colours') return T('settings.colours_gist.' + save.colours);
	if (part === 'motion') return T('settings.motion_gist.' + save.motion);
	return T(
		boardPen === 'none'
			? 'settings.device_plain'
			: boardPen === 'gl'
				? 'settings.device_gl'
				: 'settings.device_2d',
	);
}

// a row of stone choices, the chosen one pressed in (like the board sizes)
function settingsPick(id, options, chosen) {
	return html`
		<div class="size-pick${options.length === 3 ? ' three' : ''}" id="${id}" role="radiogroup">
			${options
				.map(
					([value, name, desc]) => html`
				<button type="button" role="radio" data-v="${value}" class="${value === chosen ? 'on' : ''}" aria-checked="${value === chosen}">
					<strong>${name}</strong>
					${desc ? `<span class="size-desc">${desc}</span>` : ''}
				</button>`,
				)
				.join('')}
		</div>`;
}
function onPick(id, choose) {
	$(id)
		.querySelectorAll('button')
		.forEach(
			b =>
				(b.onclick = () => {
					sfx('ui');
					$(id)
						.querySelectorAll('button')
						.forEach(o => {
							o.classList.toggle('on', o === b);
							o.setAttribute('aria-checked', o === b);
						});
					choose(b.dataset.v);
				}),
		);
}

function openSettings(part) {
	if (!part) {
		$('msgBody').innerHTML = html`
			<h2 id="msgTitle">${T('settings.title')}</h2>
			<p class="lede">${T('settings.lede')}</p>
			<div class="set-tiles">
				${SETTINGS_PARTS.map(
					p => html`
					<button type="button" class="stop-tile" data-part="${p}">
						<b>${T('settings.' + p)}</b>
						<span>${settingsGist(p)}</span>
					</button>`,
				).join('')}
			</div>`;
		$('msgBody')
			.querySelectorAll('[data-part]')
			.forEach(
				b =>
					(b.onclick = () => {
						sfx('ui');
						openSettings(b.dataset.part);
					}),
			);
		openOverlay('ovMsg');
		return;
	}
	const back = html`
		<button type="button" class="codex-back set-back" id="setBack">‹ ${T('settings.title')}</button>`;
	const parts = {
		sound: settingsSound,
		vibration: settingsVibration,
		colours: settingsColours,
		motion: settingsMotion,
		device: settingsDevice,
	};
	$('msgBody').innerHTML = back + parts[part]();
	$('setBack').onclick = () => {
		sfx('ui');
		openSettings();
		const tile = $('msgBody').querySelector(`[data-part="${part}"]`);
		if (tile) tile.focus();
	};
	({
		sound: wireSound,
		vibration: wireVibration,
		colours: wireColours,
		motion: wireMotion,
		device: wireDevice,
	})[part]();
	openOverlay('ovMsg');
}

// ---------- sound and music ----------
function settingsSound() {
	const pct = v => Math.round((v == null ? 1 : v) * 100);
	return html`
		<h2 id="msgTitle">${T('audio.title')}</h2>
		<p class="lede">${T('audio.lede')}</p>
		<div class="audio-row">
			<label class="fill-toggle">
				<input type="checkbox" id="auMusic" ${save.music !== false ? 'checked' : ''}> ${T('audio.music')}
			</label>
			<input type="range" id="auMusicVol" min="0" max="100" value="${pct(save.musicVol == null ? 0.7 : save.musicVol)}" aria-label="${T('audio.music_volume')}">
		</div>
		<label class="fill-toggle harm-toggle">
			<input type="checkbox" id="auHarm" ${save.harmonise !== false ? 'checked' : ''} ${save.music === false ? 'disabled' : ''}> ${T('audio.harmonise')}
		</label>
		<div class="audio-row">
			<label class="fill-toggle">
				<input type="checkbox" id="auSfx" ${save.sound ? 'checked' : ''}> ${T('audio.effects')}
			</label>
			<input type="range" id="auSfxVol" min="0" max="100" value="${pct(save.sfxVol)}" aria-label="${T('audio.effects_volume')}">
		</div>
		<label class="fill-toggle">
			<input type="checkbox" id="auSteady" ${save.steadySound ? 'checked' : ''}> ${T('audio.steady')}
		</label>
		<p class="stall-note" id="auDelay"></p>`;
}
function wireSound() {
	const showDelay = () => {
		const ms = soundDelay();
		if ($('auDelay')) $('auDelay').textContent = ms ? Tplain('audio.delay', { ms }) : '';
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
		if (sfxOut) sfxOut.gain.setTargetAtTime(0.9 * save.sfxVol, audioCtx.currentTime, 0.05);
	};
	$('auSfxVol').onchange = () => sfx('match', 2);
}

// ---------- vibration ----------
function settingsVibration() {
	return html`
		<h2 id="msgTitle">${T('settings.vibration')}</h2>
		<label class="fill-toggle">
			<input type="checkbox" id="auVibe" ${save.vibrate && canVibrate ? 'checked' : ''} ${canVibrate ? '' : 'disabled'}> ${T('audio.vibrate')}
		</label>
		${canVibrate ? '' : `<p class="stall-note">${T('audio.no_vibrate')}</p>`}`;
}
// vibration is off until the player turns it on; their choice is kept from then on
function wireVibration() {
	$('auVibe').onchange = e => {
		save.vibrate = e.target.checked;
		save.vibrateChosen = true;
		persist();
		if (save.vibrate) vibrate(15);
	};
}

// ---------- colours ----------
function settingsColours() {
	return html`
		<h2 id="msgTitle">${T('settings.colours')}</h2>
		<p class="lede">${T('settings.colours_lede')}</p>
		${settingsPick(
			'setColours',
			COLOUR_MODES.map(m => [m, T('settings.colours_name.' + m), T('settings.colours_desc.' + m)]),
			save.colours,
		)}
		<p class="stall-note">${T('settings.colours_note')}</p>`;
}
function wireColours() {
	onPick('setColours', v => {
		save.colours = v;
		persist();
		applyColours();
	});
}

// ---------- motion and effects ----------
function settingsMotion() {
	const three = (key, values) =>
		values.map(v => [v, T(`settings.${key}_name.${v}`), T(`settings.${key}_desc.${v}`)]);
	const auto = effectsChoice === 'auto' && lowFx;
	return html`
		<h2 id="msgTitle">${T('settings.motion')}</h2>
		<h3 class="shop-head">${T('settings.motion_head')}</h3>
		${settingsPick('setMotion', three('motion', ['phone', 'less', 'full']), save.motion)}
		<h3 class="shop-head">${T('settings.fx_head')}</h3>
		${settingsPick('setFx', three('fx', ['auto', 'full', 'fewer']), effectsChoice)}
		<p class="stall-note" id="setFxNote">${T(auto ? 'settings.fx_note_on' : 'settings.fx_note')}</p>`;
}
function wireMotion() {
	onPick('setMotion', v => {
		save.motion = v;
		persist();
		applyMotion();
	});
	onPick('setFx', v => {
		setEffects(v);
		$('setFxNote').innerHTML = T(v === 'auto' && lowFx ? 'settings.fx_note_on' : 'settings.fx_note');
	});
}

// ---------- this device ----------
function settingsDevice() {
	return html`
		<h2 id="msgTitle">${T('settings.device')}</h2>
		<label class="fill-toggle">
			<input type="checkbox" id="auGL" ${boardPen === 'gl' ? 'checked' : ''} ${boardPen === 'none' ? 'disabled' : ''}> ${T('audio.webgl')}
		</label>
		<p class="stall-note" id="auGLNote">${T(boardPen === 'none' ? 'audio.webgl_none' : 'audio.webgl_note')}</p>
		<p class="stall-note">${T('settings.device_note')}</p>`;
}
// how the board is drawn: kept in this browser only, from the next start (02-board-pen.js)
function wireDevice() {
	$('auGL').onchange = e => {
		setDeviceSetting('renderer', e.target.checked ? 'gl' : '2d');
		$('auGLNote').textContent = Tplain('audio.webgl_next');
	};
}

// ---------- menu ----------
// Menu and title-screen icons: images/icons/menu/<name>.svg (32 by 32)
const MENU_ICONS = {};
Object.keys(ICONS.menu || {}).forEach(k => {
	Object.defineProperty(MENU_ICONS, k, { get: () => iconArt('menu', k), enumerable: true });
});

// The Menu: back to the board first, then eight tiles, then the three ways out
// of the game (title screen, saves, a new journey) small at the foot. Until
// The stall opens on a first journey, its tile is the learning pace, so
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
			gildBar(Object.keys(save.relics).length, RELICS.length),
			T('menu.museum_sub', { n: Object.keys(save.relics).length, total: RELICS.length }),
		],
		[
			'diff',
			T('menu.tiles.difficulty'),
			DIFFICULTY[save.difficulty].label,
			T('menu.difficulty_sub', { difficulty: DIFFICULTY[save.difficulty].label }),
		],
		['customise', T('menu.tiles.customise'), '', T('menu.customise_sub')],
		[
			'audio',
			T('menu.tiles.settings'),
			T('menu.tiles.audio_state', { music: onOff(save.music !== false) }),
			T('menu.settings_sub'),
		],
		['help', T('menu.tiles.help'), '', T('menu.help_sub')],
	];
	const fresh = id =>
		isNew(id === 'help' ? 'codex' : id) ||
		(id === 'help' && Object.keys(save.fresh || {}).some(k => k.startsWith('codex:')));
	const foot = [
		['title', T('menu.title_screen')],
		['saves', T('menu.saves')],
		['journey', T('menu.new_journey_short')],
	];
	$('msgBody').innerHTML = html`
			<h2 id="msgTitle">${T('menu.title')}</h2>
			<p class="lede">
				${(save.journeys || 1) > 1 ? T('menu.journey', { n: save.journeys }) : ''}${core ? (eventState ? T('menu.at_event') : `${core.level.name} ${journeyRiver(levelIdx, true)}`) : ''}
			</p>
			<button class="act-go" data-m="continue">
				<span class="act-ico">
					<svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS.continue}</svg>
				</span>
				<span class="act-words">${T('menu.back')}<small>${T('menu.back_sub')}</small></span>
				<span class="act-arrow" aria-hidden="true">\u203a</span>
			</button>
			<hr class="title-hr">
			<div class="menu-tiles">
				${tiles
					.map(
						([id, name, state, what]) =>
							html`
						<button class="menu-tile${fresh(id) ? ' has-new' : ''}" data-m="${id}" title="${plainText(what)}">
							<svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS[id]}</svg>
							<strong>${name}</strong>
							${state ? `<small>${state}</small>` : ''}
						</button>`,
					)
					.join('')}
			</div>
			<div class="menu-foot">
				${foot
					.map(
						([id, name]) =>
							html`
						<button class="act-quiet" data-m="${id}">
							<svg viewBox="0 0 32 32" aria-hidden="true">${MENU_ICONS[id]}</svg>
							${name}
						</button>`,
					)
					.join('')}
			</div>`;
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
						audio: () => openSettings(),
					})[m]();
				}),
		);
	openOverlay('ovMsg');
	$('ovMsg').querySelector('.scroll').classList.add('wide');
}

// ---------- difficulty ----------
// A small picture of a board's floor plan for the board choice: bare stone,
// thick stone and gold squares on the dark of the board's backing. A plan,
// not a picture from images/: it follows the stop and the screen.
function boardPic(board, cols, rows) {
	const colour = ['#e3b440', '#a39db2', '#716b82'];
	let squares = '';
	board.mask.forEach((on, sq) => {
		if (on)
			squares += `<rect x="${(sq % cols) + 0.08}" y="${Math.floor(sq / cols) + 0.08}" width="0.84" height="0.84" fill="${colour[board.floor[sq]] || colour[1]}"/>`;
	});
	return `<svg viewBox="0 0 ${cols} ${rows}"><rect width="${cols}" height="${rows}" fill="#1c1208"/>${squares}</svg>`;
}

function openDifficulty() {
	const d0 = save.difficulty,
		fresh = core.movesLeft === core.startMoves && core.score === 0;
	const movesAt = (i, mid, fill) => {
		const m = boardMode(mid),
			wasN = COLS,
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
		const board = new Core(
			Lp,
			stopOptions({
				level: core.level,
				idx: levelIdx,
				mode: m,
				cols: COLS,
				rows: ROWS,
				shape: { map: null, ease: 1 },
				difficulty: i,
				upg: save.upg,
				badgesOn: stageOn('badges'),
			}),
		);
		const shape = COLS + ' \u00d7 ' + ROWS,
			pic = boardPic(board, COLS, ROWS);
		setBoardSize(wasN, wasR);
		return { n: board.startMoves, shape, pic };
	};
	let pendMode = save.board,
		pendFill = save.fill !== false;
	$('msgBody').innerHTML = html`
		<h2 id="msgTitle">${T('difficulty_screen.title')}</h2>
		<p class="lede">${T('difficulty_screen.lede')}</p>
		<div class="diff">
			<input type="range" id="diffRange" min="0" max="3" step="1" value="${d0}" aria-label="${T('difficulty_screen.slider')}" aria-valuetext="${DIFFICULTY[d0].label}">
			<div class="diff-ticks">
				${DIFFICULTY.map((d, i) => `<button type="button" data-i="${i}">${d.label}</button>`).join('')}
			</div>
		</div>
		<p id="diffText" class="diff-text"></p>
		<h3 class="shop-head" style="margin-top:14px">${T('difficulty_screen.board')}</h3>
		<div class="size-pick" id="sizePick">
			${BOARD_MODES.map(
				b => html`
			<button type="button" data-m="${b.id}">
				<span class="board-pic" aria-hidden="true"></span>
				<strong>${b.name}</strong>
				<span class="size-label">${b.label}</span>
				<span class="size-desc">${b.desc}</span>
			</button>`,
			).join('')}
		</div>
		<label class="fill-toggle">
			<input type="checkbox" id="fillChk" ${save.fill !== false ? 'checked' : ''}> ${T('difficulty_screen.fill')}
		</label>
		<p id="diffMoves" class="diff-moves"></p>
		<div class="actions" id="diffActions"></div>`;
	const range = $('diffRange');
	const render = () => {
		const i = +range.value,
			d = DIFFICULTY[i];
		range.setAttribute('aria-valuetext', d.label);
		range.style.setProperty('--p', (i / 3) * 100 + '%');
		$('msgBody')
			.querySelectorAll('.diff-ticks button')
			.forEach(b => b.classList.toggle('on', +b.dataset.i === i));
		$('diffText').textContent = d.text;
		$('msgBody')
			.querySelectorAll('.size-pick button')
			.forEach(b => {
				b.classList.toggle('on', b.dataset.m === pendMode);
				// each board's picture, as it would be at this stop (and with "fill the screen")
				const pic = b.querySelector('.board-pic');
				if (pic.dataset.fill !== String(pendFill)) {
					const board = movesAt(i, b.dataset.m, pendFill);
					pic.innerHTML = board.pic;
					pic.dataset.fill = pendFill;
					if (!boardMode(b.dataset.m).dynamic)
						b.querySelector('.size-label').textContent = board.shape;
				}
			});
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
					}),
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
				}),
		);
	$('msgBody')
		.querySelectorAll('.size-pick button')
		.forEach(
			b =>
				(b.onclick = () => {
					pendMode = b.dataset.m;
					sfx('select');
					render();
				}),
		);
	$('fillChk').onchange = e => {
		pendFill = e.target.checked;
		render();
	};
	render();
	openOverlay('ovMsg');
	setTimeout(() => range.focus(), 40);
}
