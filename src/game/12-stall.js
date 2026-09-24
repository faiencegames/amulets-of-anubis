// ---------- refunds ----------
// Everything bought since the stall or treasury was opened can be undone, in
// full, until that screen is closed (for misclicks). Each entry knows how to
// take itself back; closing any scroll clears the list.
let shopLog = [];
function logBuy(src, id, cur, price, undo) {
	shopLog.push({ src, id, cur, price, undo });
}

function canUndo(src, id) {
	return shopLog.some(e => e.src === src && e.id === id);
}

function undoBuy(src, id) {
	for (let i = shopLog.length - 1; i >= 0; i--) {
		const e = shopLog[i];
		if (e.src !== src || e.id !== id) continue;
		if (e.undo && e.undo() === false) {
			popups.push({
				text: Tplain('popup.already_used'),
				x: N / 2,
				y: ROWS / 2,
				life: 1.4,
				size: 0.5,
				col: '#ffb0a0',
			});
			return false;
		}
		save[e.cur] += e.price;
		shopLog.splice(i, 1);
		persist();
		updateHUD();
		renderBoons();
		sfx('refund');
		return true;
	}
	return false;
}

const UNDO_NOTE = () => `<p class="refund-note">${T('shop.undo_note')}</p>`;
// "5,000 gold   300 lapis", with the coin and gem icons
function purseLine() {
	return `<i class="g-ico gold"></i> ${T('shop.purse_gold', { n: save.gold.toLocaleString() })} &nbsp;&nbsp; <i class="g-ico lapis"></i> ${T('shop.purse_lapis', { n: save.lapis.toLocaleString() })}`;
}

function undoButton(src, id) {
	return canUndo(src, id)
		? `<button class="btn undo" data-undo-src="${src}" data-undo="${id}">${T('shop.undo')}</button>`
		: '';
}

// ---------- Anubis's stall ----------
function stallPrice(item) {
	const n = (core && core.stallBought[item.id]) || 0;
	return Math.round(item.price * Math.pow(STALL_RISE, n));
}

function openStall() {
	clearNew('stall');
	const row = it => {
		const price = stallPrice(it),
			can = save[it.cur] >= price && !(it.kind === 'now' && (!core || core.movesLeft <= 0));
		const held =
			it.kind === 'charge' && save.charges.wind
				? ` <span class="tier">${T('shop.held', { n: save.charges.wind })}</span>`
				: '';
		const one = it.kind === 'boon' && it.give.boon.length === 1 && BOON_ICON[it.give.boon[0]];
		return `<div class="shop-row"><div>${one ? `<span class="stall-ico" aria-hidden="true">${one}</span>` : ''}<strong>${it.name}</strong>${held}<br><span class="shop-desc">${it.desc}</span></div>
			<div class="buy-col">${undoButton('stall', it.id)}<button class="btn buy" data-i="${it.id}" ${can ? '' : 'disabled'}>${price.toLocaleString()} <i class="g-ico ${it.cur}"></i></button></div></div>`;
	};
	$('msgBody').innerHTML =
		`<div class="stall-head">${ANUBIS_BADGE}<div><h2 id="msgTitle">${T('stall.title')}</h2>
		<p class="lede">${T('stall.lede')}</p></div></div>
		<p class="purse">${purseLine()}</p>
		${UNDO_NOTE()}
		${STALL.map(row).join('')}
		<p class="stall-note">${T('stall.note')}</p>`;
	$('msgBody')
		.querySelectorAll('.buy')
		.forEach(
			b =>
				(b.onclick = async () => {
					const it = STALL.find(x => x.id === b.dataset.i),
						price = stallPrice(it);
					if (save[it.cur] < price || busy) return;
					save[it.cur] -= price;
					core.stallBought[it.id] = (core.stallBought[it.id] || 0) + 1;
					const gv = it.give || {};
					const takeBoon = b => () => {
						const j = save.boons.lastIndexOf(b);
						if (j < 0) return false;
						save.boons.splice(j, 1);
						core.stallBought[it.id]--;
					};
					if (gv.moves) {
						const n = gv.moves;
						core.movesLeft += n;
						popups.push({
							text: Tplain('popup.n_moves', { n: n }),
							x: N / 2,
							y: ROWS / 2,
							life: 1.6,
							size: 0.6,
							col: '#bfe8ff',
						});
						sfx('moves');
						logBuy('stall', it.id, it.cur, price, () => {
							if (core.movesLeft < n) return false;
							core.movesLeft -= n;
							core.stallBought[it.id]--;
						});
					} else if (gv.boon) {
						const b =
							gv.boon.length === 1 && gv.boon[0] !== 'random'
								? gv.boon[0]
								: randomBoon(gv.boon);
						save.boons.push(b);
						logBuy('stall', it.id, it.cur, price, takeBoon(b));
					} else if (gv.wind) {
						const n = gv.wind;
						save.charges.wind = (save.charges.wind || 0) + n;
						logBuy('stall', it.id, it.cur, price, () => {
							if (!(save.charges.wind >= n)) return false;
							save.charges.wind -= n;
							core.stallBought[it.id]--;
						});
					}
					persist();
					updateHUD();
					renderBoons();
					sfx(it.cur === 'gold' ? 'coins' : 'gems');
					if (gv.reshuffle) {
						closeOverlays();
						busy = true;
						sfx('shuffle');
						core.cells.forEach(t => {
							if (t) t.swapping = true;
						});
						core.shuffle();
						await settle();
						core.cells.forEach(t => {
							if (t) t.swapping = false;
						});
						busy = false;
						return;
					}
					if (it.kind !== 'now') sfx('create');
					openStall();
				})
		);
	$('msgBody')
		.querySelectorAll('.undo')
		.forEach(
			b =>
				(b.onclick = () => {
					undoBuy(b.dataset.undoSrc, b.dataset.undo);
					openStall();
				})
		);
	openOverlay('ovMsg');
}

const ANUBIS_BADGE = iconSvg('ui', 'anubis', 'class="stall-anubis" aria-hidden="true"'); // images/icons/ui/anubis.svg
