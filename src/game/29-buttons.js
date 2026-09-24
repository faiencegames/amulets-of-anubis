// ---------- buttons ----------
$('btnMap').onclick = () => {
	if (!busy) openMap();
};

$('btnHelp').onclick = () => {
	if (!busy) openHelp();
};

$('btnStall').onclick = () => {
	if (!busy && stageOn('stall')) openStall();
};

$('btnMenu').onclick = () => {
	if (!busy) openMenu();
};

$('btnTreasury').onclick = () => {
	if (!busy) openTreasury();
};

$('btnCustomise').onclick = () => {
	if (!busy) openCustomise();
};

$('openMuseum').onclick = $('relicStrip').onclick = () => {
	if (!busy) openMuseum();
};

// the relics counter at the top opens the museum too
{
	const g = document.querySelector('.g-relics');
	if (g) {
		g.classList.add('clickable');
		g.setAttribute('role', 'button');
		g.tabIndex = 0;
		g.onclick = () => {
			if (!busy) openMuseum();
		};
		g.onkeydown = e => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				g.onclick();
			}
		};
	}
}

$('stripPlace').onclick = () => {
	if (busy) return;
	showMsg(
		`<h2 id="msgTitle">${core.level.name}</h2><p class="lede">${core.level.sub}</p><p class="fact">${core.level.fact}</p><h3 class="help-h">${T('place.amulets_heading')}</h3>${amuletList()}`,
		[[Tplain('place.back'), () => {}]]
	);
};

$('btnAmulets').onclick = showAmulets;
$('btnRestart').onclick = () => {
	if (busy) return;
	const used = core && core.movesLeft < core.startMoves;
	const again = () => {
		if (eventState && eventState.ev.chamber) startChamber(eventState.ev, eventState.after, true);
		else if (eventState) startEvent(eventState.ev, eventState.next);
		else startLevel(levelIdx);
	};
	if (!used) {
		again();
		return;
	} // nothing played yet: no need to ask
	showMsg(
		`<h2 id="msgTitle">${T('restart.title')}</h2>
		<p class="lede">${T('restart.played', { n: core.startMoves - core.movesLeft })}</p>
		<p style="text-align:center">${T('restart.text')}${trial && !trial.done && !trial.failed && trial.curse ? T('restart.trial') : ''}</p>`,
		[
			[Tplain('restart.keep'), () => {}],
			[Tplain('restart.restart'), again],
		]
	);
};

$('btnHint').onclick = () => {
	if (busy) return;
	const m = core.allMoves();
	if (m.length) {
		hint = m[Math.floor(Math.random() * m.length)];
	}
};

function syncSound() {}

syncSound();

// every stone-like control knocks when pressed (codex tabs rustle instead)
document.addEventListener('click', e => {
	if (!e.target.closest) return;
	if (
		e.target.closest(
			'.btn, .rbtn, .menu-item, .close-x, .stop-btn, .skin:not([disabled]), .size-pick button, .boon, .strip-place, .diff-ticks button, .trial-card'
		)
	)
		sfx('stone');
});

function syncInfoOpen() {
	const d = $('infoSheet');
	if (d) d.open = window.innerWidth > 760;
}

window.addEventListener('resize', syncInfoOpen);
syncInfoOpen();
