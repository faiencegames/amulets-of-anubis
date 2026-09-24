// ---------- seals ----------
// Seals: three challenges per stop (content/stops/, "seals"), stamped the
// first time a win there meets them, each worth SEAL_LAPIS. Saved by stop id
// and position, so they survive a new journey and reordered stops.
const SEAL_LAPIS = CONTENT.settings.sealLapis; // content/settings.json, "seals"
function sealsOf(i) {
	return (save.seals || {})[LEVELS[i].id] || [];
}

function stampSeals(i) {
	if (!stageOn('seals')) return [];
	const L = LEVELS[i],
		got = sealsOf(i).slice(),
		fresh = [];
	(L.seals || []).forEach((sl, j) => {
		if (!got[j] && conditionMet(sl.when, save)) {
			got[j] = 1;
			fresh.push(j);
		}
	});
	if (fresh.length) {
		save.seals = save.seals || {};
		save.seals[L.id] = got;
		save.lapis += SEAL_LAPIS * fresh.length;
		fresh.forEach(j =>
			announce(
				T('banner.seal_stamped'),
				L.seals[j].text,
				SEAL_SVG,
				T('banner.seal_extra', { stop: L.name, n: SEAL_LAPIS }),
				'blessing'
			)
		);
	}
	return fresh;
}

const SEAL_SVG = iconSvg('ui', 'seal', 'class="ut-relic" aria-hidden="true"'); // content/icons/ui/seal.svg
function sealDots(i) {
	const got = sealsOf(i),
		n = (LEVELS[i].seals || []).length;
	return n ? Array.from({ length: n }, (_, j) => (got[j] ? '\u25CF' : '\u25CB')).join('') : '';
}

function sealsLine(i, fresh) {
	const L = LEVELS[i];
	if (!(L.seals || []).length || !stageOn('seals')) return '';
	const got = sealsOf(i);
	return `<ul class="seal-list">${L.seals.map((sl, j) => `<li class="${got[j] ? 'got' : ''}${fresh.includes(j) ? ' fresh' : ''}"><span class="seal-dot" aria-hidden="true">${got[j] ? '\u25CF' : '\u25CB'}</span>${sl.text}${fresh.includes(j) ? ` <strong>${T('stop.stamped')}</strong>` : got[j] ? ' <span class="seal-ok">\u2713</span>' : ''}</li>`).join('')}</ul>`;
}
