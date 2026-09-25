/* =============================================================================
 * 08-relics.js  —  relics: their pictures, and what happens when one is found.
 *
 * Relics are content files (content/relics/), each saying in "found_when"
 * what finds it; 09-unlocks.js checks that after every stop.
 *
 * What's here:
 *   relicIcon(id)       a relic's picture: its own from images/relics/, else
 *                       the drawing its file names (images/icons/relics/),
 *                       else a plain gold disc. Undiscovered relics show it
 *                       dimmed (CSS).
 *   grantRelic(r)       the relic is found: pays its reward, shows a banner
 *                       and puts a "new" dot on the Museum
 *
 * Changes in the save: relics, and gold, lapis or boons from a relic's
 * reward.
 * ===========================================================================*/

// ---------- relic icons ----------
// One small drawing per relic, in a 32 x 32 box: gold with a dark outline.
// Undiscovered relics show the same drawing as a dim silhouette (CSS).
const RELIC_GOLD = 'url(#relicGold)',
	RELIC_INK = '#3b2406';
// Relic drawings: images/icons/relics/<name>.svg (32 by 32). A relic uses the
// one named by its "icon", or the one with its own id.
const RELIC_ICONS = {};
Object.keys(ICONS.relics || {}).forEach(k => {
	Object.defineProperty(RELIC_ICONS, k, { get: () => iconArt('relics', k), enumerable: true });
});

Object.keys(ICONS.relics || {}).forEach(k => iconArt('relics', k)); // register their gradients (relicGold) at once
// A relic's icon: its own picture from images/relics/ if there is one, else the
// drawing named by its "icon" (or its id), else a plain gold disc.
function relicIcon(id, cls = 'relic-svg') {
	const r = RELICS.find(x => x.id === id) || {},
		pic = PICTURES.relics[id];
	const art = pic
		? `<image href="${pic}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet"/>`
		: RELIC_ICONS[r.icon || id] ||
			'<circle cx="16" cy="16" r="10" fill="' +
				RELIC_GOLD +
				'" stroke="' +
				RELIC_INK +
				'" stroke-width="1.5"/>';
	return `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true">${art}</svg>`;
}

function grantRelic(id) {
	if (save.relics[id]) return;
	save.relics[id] = Date.now();
	const r = RELICS.find(x => x.id === id);
	let rw = '';
	if (r.reward) {
		if (r.reward.gold) save.gold += r.reward.gold;
		if (r.reward.lapis) save.lapis += r.reward.lapis;
		if (r.reward.boon) save.boons.push(r.reward.boon);
		rw = rewardText(r.reward);
	}
	persist();
	updateHUD();
	// rewardText is HTML (the gold and lapis icons), so it goes in the banner,
	// never onto the canvas, which would print the tags as letters.
	announce(T('banner.relic_found'), r.name, relicIcon(id, 'ut-relic'), rw ? '+ ' + rw : '', 'sun');
	markNew('museum');
	if (r.reward && r.reward.boon) renderBoons();
	for (let i = 0; i < 20; i++) burst(Math.random() * COLS - 0.5, Math.random() * ROWS - 0.5, 1);
}
