/* =============================================================================
 * 13-saves.js  —  saving to a code and back, and starting a new journey.
 *
 * What's here:
 *   openSaves()         the Saves scroll (the Menu, the title screen): copy
 *                       the save out as a code, paste one in, or reset
 *                       everything
 *   saveCode(), readCode()
 *                       the save as text (the edition's export_prefix,
 *                       "AMULETS1:", and a code) and back;
 *                       an imported save goes through applySaveDefaults()
 *                       (00-open.js)
 *   openNewJourney()    starts the river again from the first stop. Relics
 *                       and earned looks stay; everything that buys power is
 *                       reset.
 *
 * Changes in the save: all of it (importing, resetting, a new journey).
 * ===========================================================================*/

// ---------- save and restore ----------
// The whole save is one JSON object. It is exported as text with a short
// prefix, so it can be copied into a note, an email or an archive and pasted
// back into any copy of the game: browser, installed app or Android.
function saveCode() {
	return (
		EDITION.exportPrefix +
		btoa(
			unescape(
				encodeURIComponent(
					JSON.stringify(Object.assign({}, save, { exportedAt: new Date().toISOString() })),
				),
			),
		)
	);
}

function readCode(text) {
	const t = (text || '').trim();
	if (!t.startsWith(EDITION.exportPrefix)) throw new Error(Tplain('saves.not_a_save'));
	const data = JSON.parse(
		decodeURIComponent(escape(atob(t.slice(EDITION.exportPrefix.length).replace(/\s+/g, '')))),
	);
	if (!data || typeof data !== 'object' || !Array.isArray(data.stars))
		throw new Error(Tplain('saves.damaged'));
	return data;
}

function openSaves() {
	const code = saveCode(),
		stars = save.stars.reduce((a, b) => a + (b || 0), 0);
	$('msgBody').innerHTML = html`
		<h2 id="msgTitle">${T('saves.title')}</h2>
		<p class="lede">${T('saves.lede')}</p>
		<p class="save-sum">
			${T('saves.summary', { stars, relics: Object.keys(save.relics).length, gold: save.gold.toLocaleString(), lapis: save.lapis })}
		</p>
		<h3 class="shop-head">${T('saves.export')}</h3>
		<textarea class="code" id="exportCode" readonly rows="4">${code}</textarea>
		<div class="actions">
			<button class="btn" id="copyCode">${T('saves.copy')}</button>
			<button class="btn" id="dlCode">${T('saves.file')}</button>
		</div>
		<p class="save-msg" id="exportMsg"></p>
		<h3 class="shop-head">${T('saves.restore')}</h3>
		<textarea class="code" id="importCode" rows="4" placeholder="${T('saves.paste')}"></textarea>
		<div class="actions"><button class="btn" id="doImport">${T('saves.restore_button')}</button></div>
		<p class="save-msg" id="importMsg"></p>
		<hr class="title-hr">
		<div class="title-reset"><button class="btn danger" id="saveReset">${T('saves.reset')}</button></div>`;
	// the complete reset asks twice: the second press within four seconds deletes everything
	$('saveReset').onclick = () => {
		const btn = $('saveReset');
		if (btn.dataset.confirm) {
			localStorage.removeItem(SAVE_KEY);
			location.reload();
			return;
		}
		btn.dataset.confirm = '1';
		btn.textContent = Tplain('saves.reset_sure');
		setTimeout(() => {
			if (btn.isConnected) {
				delete btn.dataset.confirm;
				btn.textContent = Tplain('saves.reset');
			}
		}, 4000);
	};
	$('copyCode').onclick = async () => {
		const ta = $('exportCode');
		let ok = false;
		try {
			await navigator.clipboard.writeText(ta.value);
			ok = true;
		} catch (e) {
			ta.focus();
			ta.select();
			try {
				ok = document.execCommand('copy');
			} catch (e2) {}
		}
		$('exportMsg').textContent = ok ? Tplain('saves.copied') : Tplain('saves.selected');
	};
	$('dlCode').onclick = () => {
		try {
			const a = document.createElement('a');
			a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
			a.download = EDITION.saveFileName + new Date().toISOString().slice(0, 10) + '.txt';
			document.body.appendChild(a);
			a.click();
			a.remove();
			$('exportMsg').textContent = Tplain('saves.file_maybe');
		} catch (e) {
			$('exportMsg').textContent = Tplain('saves.file_no');
		}
	};
	$('doImport').onclick = () => {
		try {
			const data = readCode($('importCode').value);
			const s2 = data.stars.reduce((a, b) => a + (b || 0), 0);
			$('importMsg').innerHTML = html`
					${T('saves.found', { stars: s2, relics: Object.keys(data.relics || {}).length })} 
					<button class="btn" id="confirmImport">${T('saves.replace')}</button>`;
			$('confirmImport').onclick = () => {
				delete data.exportedAt;
				save = applySaveDefaults(
					Object.assign(
						{
							unlocked: 0,
							stars: [],
							sound: true,
							seenHelp: true,
							current: 0,
							difficulty: 1,
							board: 'classic',
							fill: true,
							skin: FIRST_LOOKS.skin,
							skins: { [FIRST_LOOKS.skin]: 1 },
							charges: {},
							boons: [],
							trialsDone: 0,
							gold: 0,
							lapis: 0,
							upg: {},
							relics: {},
						},
						data,
					),
				);
				persist();
				applyColours();
				applyMotion();
				closeOverlays();
				startLevel(Math.min(save.current || 0, save.unlocked || 0));
				popups.push({
					text: Tplain('saves.restored'),
					x: COLS / 2,
					y: ROWS / 2,
					life: 2,
					size: 0.6,
					col: '#fff2c4',
				});
			};
		} catch (e) {
			$('importMsg').textContent = e.message || Tplain('saves.unreadable');
		}
	};
	openOverlay('ovMsg');
}

// ---------- new journey ----------
// Starts the river again from the first stop. Relics and earned amulet sets stay as
// trophies, and settings are kept; everything that buys power is reset.
function openNewJourney() {
	const stars = save.stars.reduce((a, b) => a + (b || 0), 0),
		relics = Object.keys(save.relics).length,
		sets = Object.keys(save.skins).length;
	const up = UPGRADES.reduce((a, u) => a + (save.upg[u.id] || 0), 0);
	const J = (k, v) => T('journey.' + k, v);
	$('msgBody').innerHTML = html`
		<h2 id="msgTitle">${J('title')}</h2>
		<p class="lede">${J('lede', { first: LEVELS[0].name })}</p>
		<div class="journey-cols">
			<div>
				<h3 class="shop-head">${J('keep')}</h3>
				<ul class="plain">
					<li>${J('relics')} ${gildBar(relics, RELICS.length)}</li>
					<li>
						${J('looks', { sets, floors: Object.keys(save.floors || {}).length, frames: Object.keys(save.frames || {}).length, sparkles: Object.keys(save.sparkles || {}).length })}
					</li>
					<li>${J('settings')}</li>
				</ul>
			</div>
			<div>
				<h3 class="shop-head">${J('leave')}</h3>
				<ul class="plain">
					<li>${J('stops', { n: save.unlocked + 1, stars })}</li>
					<li>${J('money', { gold: save.gold.toLocaleString(), lapis: save.lapis })}</li>
					<li>
						${J('upgrades', { n: up, boons: save.boons.length })}${save.charges.wind ? J('wind', { n: save.charges.wind }) : ''}
					</li>
					<li>${J('counters')}</li>
				</ul>
			</div>
		</div>
		<p class="curse-note" style="color:var(--ink-3)">${J('way_back')}</p>
		<div class="actions">
			<button class="btn" id="njSave">${J('save_first')}</button>
			<button class="btn" id="njGo">${J('begin')}</button>
			<button class="btn" data-a="close">${J('cancel')}</button>
		</div>`;
	$('njSave').onclick = () => {
		closeOverlays();
		openSaves();
	};
	$('msgBody').querySelector('[data-a="close"]').onclick = closeOverlays;
	$('njGo').onclick = () => {
		const keep = {
			relics: save.relics,
			skins: save.skins,
			skin: save.skin,
			floors: save.floors,
			floor: save.floor,
			frames: save.frames,
			frame: save.frame,
			sparkles: save.sparkles,
			sparkle: save.sparkle,
			vibrate: save.vibrate,
			vibrateChosen: save.vibrateChosen,
			life: save.life,
			music: save.music,
			musicVol: save.musicVol,
			sfxVol: save.sfxVol,
			difficulty: save.difficulty,
			board: save.board,
			fill: save.fill,
			sound: save.sound,
			seenHelp: true,
			journeys: (save.journeys || 1) + 1,
			seals: save.seals,
			omens: save.omens,
		};
		// a fresh save, with every field a loaded save gets (applySaveDefaults,
		// 00-open.js): the per-stop failures, the stages met and the rest
		save = applySaveDefaults(
			Object.assign(
				{
					unlocked: 0,
					stars: [],
					current: 0,
					gold: 0,
					lapis: 0,
					goldBits: 0,
					lapisBits: 0,
					upg: {},
					boons: [],
					charges: {},
					trialsDone: 0,
					suns: 0,
					bestCascade: 0,
					wins: 0,
					lastWin: null,
					curse: null,
				},
				keep,
			),
		);
		trial = null;
		persist();
		closeOverlays();
		updateHUD();
		startLevel(0);
		popups.push({
			text: Tplain('journey.popup', { n: save.journeys }),
			x: COLS / 2,
			y: ROWS / 2 - 0.4,
			life: 2.4,
			size: 0.7,
			col: '#fff2c4',
		});
		popups.push({
			text: Tplain('journey.awaits', { stop: LEVELS[0].name }),
			x: COLS / 2,
			y: ROWS / 2 + 0.5,
			life: 2.4,
			size: 0.44,
			col: '#ffd65a',
		});
		sfx('win');
	};
	openOverlay('ovMsg');
}
