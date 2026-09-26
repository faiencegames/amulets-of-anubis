/* =============================================================================
 * 27-seals.js: seals: three challenges at each stop (content/stops/,
 * "seals"), each stamped the first time a win meets it and worth lapis.
 *
 * What's here:
 *   stampSeals()        after a win, stamps any seals newly met
 *                       (24-win-lose.js)
 *   sealsOf(i), sealsLine()
 *                       a stop's seals and how they show on the win scroll
 *   mark(), marks(), doorMark(), gildBar(), journeyRiver()
 *                       seals, omens and a doorway as small pictures (the
 *                       stop card's tiles)
 *   SEAL_LAPIS          what a seal is worth
 *
 * Changes in the save: seals, lapis.
 * ===========================================================================*/

// ---------- seals ----------
// Seals: three challenges per stop (content/stops/, "seals"), stamped the
// first time a win there meets them, each worth SEAL_LAPIS. Saved by stop id
// and position, so they survive a new journey and reordered stops.
const SEAL_LAPIS = CONTENT.settings.sealLapis; // content/settings.jsonc, "seals"
function sealsOf(i) {
	return (save.seals || {})[LEVELS[i].id] || [];
}

function stampSeals(i) {
	if (!stageOn('seals')) return [];
	const stop = LEVELS[i],
		got = sealsOf(i).slice(),
		fresh = [];
	(stop.seals || []).forEach((sl, j) => {
		if (!got[j] && conditionMet(sl.when, save)) {
			got[j] = 1;
			fresh.push(j);
		}
	});
	if (fresh.length) {
		save.seals = save.seals || {};
		save.seals[stop.id] = got;
		save.lapis += SEAL_LAPIS * fresh.length;
		fresh.forEach(j =>
			announce(
				T('banner.seal_stamped'),
				stop.seals[j].text,
				SEAL_SVG,
				T('banner.seal_extra', { stop: stop.name, n: SEAL_LAPIS }),
				'blessing',
			),
		);
	}
	return fresh;
}

const SEAL_SVG = iconSvg('ui', 'seal', 'class="ut-relic" aria-hidden="true"'); // images/icons/ui/seal.svg

// Small pictures for how far a stop has come, instead of words: a wax seal
// for each seal (greyed until stamped), the omen's mark for each omen (greyed until
// braved), the doorway with a seal on it once explored. `fresh` presses a
// seal on with a little stamp (web/css/11-journey.css).
function mark(icon, on, fresh = false) {
	return `<span class="mark${on ? '' : ' no'}${fresh ? ' fresh' : ''}" aria-hidden="true">${iconSvg('ui', icon)}</span>`;
}
function marks(icon, n, total) {
	return `<span class="marks">${Array.from({ length: total }, (_, j) => mark(icon, j < n)).join('')}</span>`;
}
// how much of something is found, as ten small floor squares that gild as
// it fills (relics, seals), instead of "12 of 40"; the words for screen readers
function gildBar(n, total) {
	const lit = n ? Math.max(1, Math.round((n / total) * 10)) : 0;
	return `<span class="gild-bar" role="img" aria-label="${Tplain('hud.bar_label', { n, total })}">${Array.from({ length: 10 }, (_, j) => `<i${j < lit ? ' class="on"' : ''}></i>`).join('')}</span>`;
}
// where the journey has got to: the stops as beads on a little river, the
// ones behind gilded, this one ringed (the top bar, the Menu)
function journeyRiver(at, big = false) {
	const n = LEVELS.length,
		w = big ? 150 : 64,
		h = big ? 18 : 10,
		r = big ? 4 : 2.2,
		pad = r * 1.6, // room for the larger ring of the stop you are at, even the first or last
		beads = Array.from({ length: n }, (_, j) => {
			const x = pad + (j * (w - 2 * pad)) / (n - 1),
				y = h / 2 - Math.sin((j / (n - 1)) * Math.PI * 2) * h * 0.28;
			return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${j === at ? r * 1.35 : r}" class="${j < at ? 'past' : j === at ? 'here' : 'ahead'}"/>`;
		}).join('');
	return `<svg class="river-beads" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${Tplain('hud.river_label', { n: at + 1, total: n })}"><path d="M${pad} ${h / 2} Q${w / 4} ${h * 0.1} ${w / 2} ${h / 2} T${w - pad} ${h / 2}"/>${beads}</svg>`;
}
function doorMark(ch) {
	return `<span class="door-mark${save.chambers[ch.id] ? '' : ' no'}" aria-hidden="true">${iconSvg('map', placeIcon(ch))}${save.chambers[ch.id] ? mark('seal', true) : ''}</span>`;
}
function sealsLine(i, fresh) {
	const stop = LEVELS[i];
	if (!(stop.seals || []).length || !stageOn('seals')) return '';
	const got = sealsOf(i);
	return html`
		<ul class="seal-list">
			${stop.seals
				.map(
					(sl, j) => html`
				<li class="${got[j] ? 'got' : ''}${fresh.includes(j) ? ' fresh' : ''}">
					${mark('seal', got[j], fresh.includes(j))}
					<span>${sl.text}</span>
				</li>`,
				)
				.join('')}
		</ul>`;
}
