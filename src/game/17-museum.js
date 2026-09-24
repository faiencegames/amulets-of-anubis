// ---------- the museum ----------
// The relics: found by deeds along the river, never bought, so they have a
// room of their own rather than a shelf in the Treasury.
function openMuseum() {
	clearNew('museum');
	const relic = r => {
		const has = !!save.relics[r.id];
		return `<div class="relic${has ? ' has' : ''}" title="${r.desc}"><span class="relic-ico">${relicIcon(r.id)}</span><strong>${has ? r.name : T('museum.unknown')}</strong><span>${r.desc}</span></div>`;
	};
	$('msgBody').innerHTML = `<h2 id="msgTitle">${T('museum.title')}</h2>
		<p class="lede">${T('museum.lede')} ${T('museum.count', { n: Object.keys(save.relics).length, total: RELICS.length })}</p>
		<div class="relics">${RELICS.map(relic).join('')}</div>
		<button class="btn" id="relicsCodex" style="width:100%;margin-top:8px">${T('museum.codex')}</button>`;
	$('relicsCodex').onclick = () => {
		sfx('page');
		openHelp('relics');
	};
	openOverlay('ovMsg');
}
