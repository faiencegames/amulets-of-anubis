/* =============================================================================
 * 18-customise.js  —  Customise: where the player dresses the game. One tab
 * each for amulet sets, floors, the frame round the board and the sparkles.
 *
 * What's here:
 *   openCustomise()     the Customise scroll (the dock, the Menu); locked
 *                       looks show what unlocks them (09-unlocks.js)
 *   framePreview(), sparklePreview()
 *                       the small pictures of frames and sparkles
 *   warmPreviews()      draws the previews in idle moments, so the screen
 *                       opens quickly (05-state.js starts it)
 *
 * Choosing a look calls applyLook() (16-treasury.js).
 *
 * Changes in the save: skin, floor, frame, sparkle (the looks being worn).
 * ===========================================================================*/

// ---------- customise ----------
// Where the player dresses the game: amulet sets, floors, the frame round the
// board and the colour of the sparkles, one tab each (the amulet sets tab
// opens first). Vibration lives in Settings (openSettings). The Treasury still sells power; this is
// where looks live.
function framePreview(id) {
	return cachedPreview(`fr|${id}|${levelIdx}`, () => {
		const f = frameById(id),
			col = f.frame || (BOARDS[levelIdx] || BOARDS[0]).frame;
		const c = document.createElement('canvas');
		c.width = 120;
		c.height = 54;
		const pen = c.getContext('2d');
		pen.fillStyle = col[1];
		pen.fillRect(0, 0, c.width, c.height);
		pen.fillStyle = col[0];
		pen.fillRect(4, 4, c.width - 8, c.height - 8);
		pen.strokeStyle = col[2];
		pen.lineWidth = 3;
		pen.strokeRect(6, 6, c.width - 12, c.height - 12);
		pen.fillStyle = 'rgba(255,255,255,.25)';
		pen.fillRect(4, 4, c.width - 8, 3);
		return c.toDataURL();
	});
}

function sparklePreview(id) {
	return cachedPreview(`sp|${id}`, () => {
		const s = sparkleById(id);
		const c = document.createElement('canvas');
		c.width = 120;
		c.height = 30;
		const pen = c.getContext('2d');
		pen.fillStyle = '#1a1006';
		pen.fillRect(0, 0, c.width, c.height);
		for (let i = 0; i < 22; i++) {
			const x = 8 + ((i * 37) % 104),
				y = 6 + ((i * 53) % 22),
				r = 1.5 + (i % 3);
			pen.fillStyle = i % 2 ? s.a : s.b;
			pen.beginPath();
			pen.arc(x, y, r, 0, TAU);
			pen.fill();
		}
		return c.toDataURL();
	});
}

// Draw the previews a few at a time while the player is idle, so the first
// opening of Customise at a stop is quick too. Stops as soon as anything moves.
let warmJob = 0;
function warmPreviews() {
	const todo = [
		...SKINS.map(o => () => skinPreview(o.id)),
		...FLOOR_SETS.map(o => () => floorPreview(o.id)),
		...FRAMES.map(o => () => framePreview(o.id)),
		...SPARKLES.map(o => () => sparklePreview(o.id)),
	];
	const job = ++warmJob,
		idle = window.requestIdleCallback || (f => setTimeout(() => f({ timeRemaining: () => 8 }), 200));
	const step = dl => {
		if (job !== warmJob) return;
		if (busy || anyOverlayOpen()) {
			idle(step);
			return;
		}
		while (todo.length && dl.timeRemaining() > 6) todo.shift()();
		if (todo.length) idle(step);
	};
	idle(step);
}

let customiseTab = 'sets'; // the tab showing; a fresh open starts on the amulet sets
function openCustomise(tab) {
	const fresh = !$('ovMsg').classList.contains('open');
	if (tab) customiseTab = tab;
	else if (fresh) customiseTab = 'sets';
	clearNew('customise');
	checkLooks(); // anything earned where no check ran (a restored save, say) unlocks now
	// A locked look shows how far you are: a bar that fills as the condition
	// is met, with the number beside it. Unlocked and in-use looks show no bar.
	const lockBar = o => {
		const pr = needProgress(o);
		if (pr.have == null) return '';
		return html`
			<span class="lock" aria-hidden="true">
				<span class="lock-bar"><span class="lock-fill" style="width:${pr.pct}%"></span></span>
				<span class="lock-num">${T('customise.progress', { have: pr.have.toLocaleString(), need: pr.need.toLocaleString() })}</span>
			</span>`;
	};
	const skinCard = sk => {
		const have = !!save.skins[sk.id],
			on = save.skin === sk.id;
		return html`
			<button class="skin${have ? '' : ' locked'}${on ? ' on' : ''}" ${have ? `data-s="${sk.id}"` : 'disabled'}>
				<img src="${skinPreview(sk.id)}" alt="">
				<strong>${sk.name}</strong>
				<span>${have ? sk.desc : lookNeedText(sk)}</span>
				${have ? '' : lockBar(sk)}${on ? `<em class="equipped">${T('customise.in_use')}</em>` : ''}
			</button>`;
	};
	const floorCard = f => {
		const have = !!save.floors[f.id],
			on = save.floor === f.id;
		return html`
			<button class="skin${have ? '' : ' locked'}${on ? ' on' : ''}" ${have ? `data-f="${f.id}"` : 'disabled'}>
				<img src="${floorPreview(f.id)}" alt="">
				<strong>${f.name}</strong>
				<span>${have ? f.desc : lookNeedText(f)}</span>
				${have ? '' : lockBar(f)}${on ? `<em class="equipped">${T('customise.in_use')}</em>` : ''}
			</button>`;
	};
	const frameCard = f => {
		const have = !!save.frames[f.id],
			on = save.frame === f.id;
		return html`
			<button class="skin${have ? '' : ' locked'}${on ? ' on' : ''}" ${have ? `data-fr="${f.id}"` : 'disabled'}>
				<img src="${framePreview(f.id)}" alt="">
				<strong>${f.name}</strong>
				<span>${have ? f.desc : lookNeedText(f)}</span>
				${have ? '' : lockBar(f)}${on ? `<em class="equipped">${T('customise.in_use')}</em>` : ''}
			</button>`;
	};
	const sparkCard = s => {
		const have = !!save.sparkles[s.id],
			on = save.sparkle === s.id;
		return html`
			<button class="skin${have ? '' : ' locked'}${on ? ' on' : ''}" ${have ? `data-sp="${s.id}"` : 'disabled'}>
				<img src="${sparklePreview(s.id)}" alt="">
				<strong>${s.name}</strong>
				<span>${have ? s.desc : lookNeedText(s)}</span>
				${have ? '' : lockBar(s)}${on ? `<em class="equipped">${T('customise.in_use')}</em>` : ''}
			</button>`;
	};
	// Only the showing tab's cards are built: the previews are drawn on demand
	// and warmed in idle time, so building every list at once would stall the open.
	const cards = {
		sets: [SKINS, skinCard],
		floors: [FLOOR_SETS, floorCard],
		frames: [FRAMES, frameCard],
		sparkles: [SPARKLES, sparkCard],
	}[customiseTab];
	const body = `<div class="skins">${cards[0].map(cards[1]).join('')}</div>`;
	$('msgBody').innerHTML = html`
		<h2 id="msgTitle">${T('customise.title')}</h2>
		<p class="lede">${T('customise.lede')}</p>
		<div class="codex-tabs" role="tablist">
			${['sets', 'floors', 'frames', 'sparkles']
				.map(
					id => html`
			<button role="tab" aria-selected="${id === customiseTab}" class="${id === customiseTab ? 'on' : ''}" data-cu="${id}">
				${T('customise.tabs.' + id)}
			</button>`,
				)
				.join('')}
		</div>
		<div class="codex-body">${body}</div>`;
	$('msgBody')
		.querySelectorAll('.codex-tabs button')
		.forEach(
			b =>
				(b.onclick = () => {
					sfx('page');
					openCustomise(b.dataset.cu);
				}),
		);
	$('msgBody')
		.querySelectorAll('.skin[data-s]')
		.forEach(
			b =>
				(b.onclick = () => {
					save.skin = b.dataset.s;
					persist();
					sfx('select');
					applyLook();
					openCustomise();
				}),
		);
	$('msgBody')
		.querySelectorAll('.skin[data-f]')
		.forEach(
			b =>
				(b.onclick = () => {
					save.floor = b.dataset.f;
					persist();
					sfx('select');
					applyLook();
					openCustomise();
				}),
		);
	$('msgBody')
		.querySelectorAll('.skin[data-fr]')
		.forEach(
			b =>
				(b.onclick = () => {
					save.frame = b.dataset.fr;
					persist();
					sfx('select');
					paintBoardFrame(BOARDS[levelIdx] || BOARDS[0]);
					openCustomise();
				}),
		);
	$('msgBody')
		.querySelectorAll('.skin[data-sp]')
		.forEach(
			b =>
				(b.onclick = () => {
					save.sparkle = b.dataset.sp;
					persist();
					sfx('select');
					openCustomise();
				}),
		);
	openOverlay('ovMsg');
	if (tab || fresh) $('msgBody').scrollTop = 0;
}
