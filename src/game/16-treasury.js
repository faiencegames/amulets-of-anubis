// ---------- the Treasury ----------
// Looks are bought here and put on with applyLook(); the previews of each
// look are drawn once and cached (the Customise screen uses them too).
// Re-dress the board in the chosen amulet set and floor, right now. The
// pre-scaled amulet cache is keyed by type, so it must be emptied, or the old
// pictures would keep being drawn until the next stop.
function applyLook() {
	if (TILE_NAMES.length) {
		TILE_SPRITES = TILE_NAMES.map(n => skinned(SPR[n], n, save.skin));
		TILE_SPRITES[6] = skinned(SPR.sun, 'sun', save.skin);
	}
	buildFloors(levelIdx);
	scaledTiles.clear();
	halo = null;
	bgDirty = true;
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
		const g = c.getContext('2d');
		floorTextures(id, levelIdx).forEach((img, k) => g.drawImage(img, k * 60 + 1, 1, 58, 58));
		g.drawImage(skinned(SPR.scarab, 'scarab', save.skin), 126, 6, 48, 48);
		return c.toDataURL();
	});
}

// Four amulets of the current stop, so a set is judged on what it will
// actually recolour here (two amulets alone could make a set look one colour).
function skinPreview(id) {
	return cachedPreview(`s|${id}|${levelIdx}`, () => skinPreviewDraw(id));
}

function skinPreviewDraw(id) {
	const here = ((THEMES[levelIdx] || THEMES[0]).set || []).filter(n => SPR[n]);
	const names = (here.length >= 4 ? here : ['scarab', 'ankh', 'eye', 'lotus']).slice(0, 4);
	const c = document.createElement('canvas');
	c.width = 200;
	c.height = 50;
	const g = c.getContext('2d');
	names.forEach((n, i) => g.drawImage(skinned(SPR[n], n, id), i * 50, 0, 50, 50));
	return c.toDataURL();
}

function openTreasury() {
	clearNew('treasury');
	const row = u => {
		const t = save.upg[u.id] || 0,
			maxed = t >= u.tiers,
			cost = maxed ? 0 : u.cost(t),
			can = !maxed && save[u.cur] >= cost;
		return `<div class="shop-row">
			<div><strong>${u.name}</strong>${u.tiers > 1 ? ` <span class="tier">${t}/${u.tiers}</span>` : ''}<br><span class="shop-desc">${u.desc}</span></div>
			<div class="buy-col">${undoButton('upg', u.id)}${maxed ? `<span class="owned">${T('shop.owned')}</span>` : `<button class="btn buy" data-u="${u.id}" ${can ? '' : 'disabled'}>${cost.toLocaleString()} <i class="g-ico ${u.cur}"></i></button>`}</div>
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
				})
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
				})
		);
	openOverlay('ovMsg');
}
