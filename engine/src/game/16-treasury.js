/* =============================================================================
 * 16-treasury.js  —  the Treasury, and putting on a look.
 *
 * What's here:
 *   openTreasury()      the Treasury: lasting upgrades bought with gold and
 *                       lapis (content/treasury/); purchases can be taken
 *                       back until it closes (logBuy(), 12-stall.js)
 *   levelSquares()      an upgrade's level as gold squares
 *   applyLook()         puts on an amulet set, floor, frame or sparkle and
 *                       redraws the board. Always go through this: it also
 *                       empties the amulet picture cache.
 *   dockAmulet()        the Amulets button's picture: an amulet in the
 *                       amulet set in use (applyLook(), and 30-boot.js)
 *   skinPreview(), floorPreview(), cachedPreview()
 *                       the small pictures of each look, drawn once and kept
 *                       (the Customise screen uses them)
 *
 * Changes in the save: upg (upgrades bought), gold or lapis.
 * ===========================================================================*/

// ---------- the Treasury ----------
// Looks are bought here and put on with applyLook(); the previews of each
// look are drawn once and cached (the Customise screen uses them too).
// Re-dress the board in the chosen amulet set and floor, right now. The
// pre-scaled amulet cache is keyed by type, so it must be emptied, or the old
// pictures would keep being drawn until the next stop.
function applyLook() {
	if (TILE_NAMES.length) {
		TILE_SPRITES = TILE_NAMES.map(n => skinned(AMULET_PICS[n], n, save.skin));
		TILE_SPRITES[6] = skinned(AMULET_PICS.sun, 'sun', save.skin);
	}
	buildFloors(levelIdx);
	scaledTiles.clear();
	haloCanvas = null;
	bgDirty = true;
	dockAmulet();
}

// The Amulets button along the bottom shows a real amulet (content/settings.jsonc,
// "amulets_on_show", "button") in the amulet set in use; the drawn icon in
// web/shell.html stands in until the pictures have loaded.
function dockAmulet() {
	const btn = $('btnAmulets'),
		pic = AMULET_PICS[ON_SHOW.button] && skinned(AMULET_PICS[ON_SHOW.button], ON_SHOW.button, save.skin);
	if (!btn || !pic) return;
	let img = btn.querySelector('.dock-amulet');
	if (!img) {
		img = document.createElement('img');
		img.className = 'dock-amulet';
		img.alt = '';
		btn.querySelector('svg').replaceWith(img);
	}
	img.src = pic.toDataURL();
}

// Customise previews are cached: drawing and PNG-encoding thirty-odd of them
// every time the screen opened (and again on every click inside it, since a
// choice redraws the screen) took over 100 ms, several times that on a phone.
// A preview depends only on the look, the stop and the amulet set in use.
const previewCache = new Map();
function cachedPreview(key, make) {
	let u = previewCache.get(key);
	if (u) return u;
	if (previewCache.size > 160) previewCache.clear();
	u = make();
	previewCache.set(key, u);
	return u;
}

function floorPreview(id) {
	return cachedPreview(`f|${id}|${levelIdx}|${save.skin}`, () => {
		const c = document.createElement('canvas');
		c.width = 180;
		c.height = 60;
		const pen = c.getContext('2d');
		floorTextures(id, levelIdx).forEach((img, k) => pen.drawImage(img, k * 60 + 1, 1, 58, 58));
		pen.drawImage(skinned(AMULET_PICS[ON_SHOW.button], ON_SHOW.button, save.skin), 126, 6, 48, 48);
		return c.toDataURL();
	});
}

// Four amulets of the current stop, so a set is judged on what it will
// actually recolour here (two amulets alone could make a set look one colour).
function skinPreview(id) {
	return cachedPreview(`s|${id}|${levelIdx}`, () => skinPreviewDraw(id));
}

function skinPreviewDraw(id) {
	const here = ((THEMES[levelIdx] || THEMES[0]).set || []).filter(n => AMULET_PICS[n]);
	const names = (here.length >= 4 ? here : ON_SHOW.previews).slice(0, 4);
	const c = document.createElement('canvas');
	c.width = 200;
	c.height = 50;
	const pen = c.getContext('2d');
	names.forEach((n, i) => pen.drawImage(skinned(AMULET_PICS[n], n, id), i * 50, 0, 50, 50));
	return c.toDataURL();
}

// an upgrade's level as small gold squares, one for each level, gilded as
// they are bought (like the relic bar), with the words for screen readers
function levelSquares(n, of) {
	return html`
		<span class="gild-bar tier-bar" role="img" aria-label="${Tplain('treasury.level', { n, of })}">
			${Array.from({ length: of }, (_, j) => `<i${j < n ? ' class="on"' : ''}></i>`).join('')}
		</span>`;
}

function openTreasury() {
	clearNew('treasury');
	const row = u => {
		const t = save.upg[u.id] || 0,
			maxed = t >= u.tiers,
			cost = maxed ? 0 : u.cost(t),
			can = !maxed && save[u.cur] >= cost;
		return html`
			<div class="shop-row">
				<div>
					<strong>${u.name}</strong>
					<br>
					<span class="shop-desc">${u.desc}</span>
					${u.tiers > 1 ? levelSquares(t, u.tiers) : ''}
				</div>
				<div class="buy-col">
					${undoButton('upg', u.id)}${
						maxed
							? `<span class="owned">${T('shop.owned')}</span>`
							: html`
				<button class="btn buy" data-u="${u.id}" ${can ? '' : 'disabled'}>
					${cost.toLocaleString()} 
					<i class="g-ico ${u.cur}"></i>
				</button>`
					}
				</div>
			</div>`;
	};
	$('msgBody').innerHTML = `<h2 id="msgTitle">${T('treasury.title')}</h2>
		<p class="lede">${T('treasury.lede')}</p>
		<p class="purse">${purseLine()}</p>
		${UNDO_NOTE()}
		${UPGRADES.map(row).join('')}
		<p class="lede" style="margin-top:10px">${T('treasury.looks_note')}</p>`;
	$('msgBody')
		.querySelectorAll('.undo')
		.forEach(
			b =>
				(b.onclick = () => {
					undoBuy(b.dataset.undoSrc, b.dataset.undo);
					openTreasury();
				}),
		);
	$('msgBody')
		.querySelectorAll('.buy')
		.forEach(
			b =>
				(b.onclick = () => {
					const u = UPGRADES.find(x => x.id === b.dataset.u),
						t = save.upg[u.id] || 0,
						cost = u.cost(t);
					if (save[u.cur] < cost) return;
					save[u.cur] -= cost;
					save.upg[u.id] = t + 1;
					logBuy('upg', u.id, u.cur, cost, () => {
						save.upg[u.id] = Math.max(0, (save.upg[u.id] || 0) - 1);
					});
					persist();
					updateHUD();
					sfx(u.cur === 'gold' ? 'coins' : 'gems');
					sfx('create');
					openTreasury();
				}),
		);
	openOverlay('ovMsg');
}
