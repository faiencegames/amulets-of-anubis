/* =============================================================================
 * 17-museum.js: the Museum: the relics found so far and the ones still
 * to find, with what each was and what finds it.
 *
 * What's here:
 *   openMuseum()        the Museum scroll (the Menu, the relics beside the
 *                       board)
 *   museumSquares()      a bare and a gilded square of the floor in use, as
 *                       pictures (the Museum and the relic strip beside the
 *                       board, 05-state.js)
 *
 * Changes in the save: nothing.
 * ===========================================================================*/

// ---------- the museum ----------
// The relics: found by deeds along the river, never bought, so they have a
// room of their own rather than a shelf in the Treasury.
// The relics stand on a floor like the board's, in the floor look in use:
// a found relic on gilded stone, one still to find a faint shape on bare
// stone. Filling the museum gilds its floor. Tapping a square shows that
// relic on the carved plaque above: what it is, the deed that finds it, and
// what it gave (or gives).
let museumFloor = null; // the two squares as pictures, made once per floor look and stop
function museumSquares() {
	if (!FLOOR_STONE || !FLOOR_GOLD[0]) return null; // not drawn yet, at start-up
	const key = save.floor + '|' + levelIdx;
	if (!museumFloor || museumFloor.key !== key)
		museumFloor = { key, bare: FLOOR_STONE.toDataURL(), gilded: FLOOR_GOLD[0].toDataURL() };
	return museumFloor;
}

function openMuseum() {
	clearNew('museum');
	museumSquares();
	const square = (r, i) => {
		const has = !!save.relics[r.id];
		return html`
			<button type="button" class="relic-sq${has ? ' has' : ''}" data-i="${i}" aria-label="${has ? r.name : T('museum.unknown')}" style="background-image:url(${has ? museumFloor.gilded : museumFloor.bare})">
				${relicIcon(r.id)}
			</button>`;
	};
	$('msgBody').innerHTML = html`
		<h2 id="msgTitle">${T('museum.title')}</h2>
		<p class="lede">${T('museum.lede')}</p>
		<div class="chamber-plaque relic-plaque" id="relicPlaque" aria-live="polite"></div>
		<div class="relic-floor">${RELICS.map(square).join('')}${fillers()}</div>
		<button class="btn" id="relicsCodex" style="width:100%;margin-top:10px">${T('museum.codex')}</button>`;
	// plain floor to finish the last row: eight across on a wide screen, five
	// on a phone, so the squares each needs are marked for it
	function fillers() {
		const n = RELICS.length,
			wide = (8 - (n % 8)) % 8,
			narrow = (5 - (n % 5)) % 5;
		return Array.from(
			{ length: Math.max(wide, narrow) },
			(_, k) =>
				`<span class="relic-sq filler${k < wide ? ' w' : ''}${k < narrow ? ' n' : ''}" style="background-image:url(${museumFloor.bare})" aria-hidden="true"></span>`,
		).join('');
	}
	const show = i => {
		const r = RELICS[i],
			has = !!save.relics[r.id];
		document.querySelectorAll('.relic-sq').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
		// every relic has a foot, so the plaque keeps its height from one to the next
		const foot = r.reward
			? `<div class="card-foot"><strong>${T(has ? 'museum.gave' : 'museum.gives')}</strong> ${rewardText(r.reward)}</div>`
			: `<div class="card-foot">${T('museum.nothing')}</div>`;
		$('relicPlaque').innerHTML = html`
			<div class="card-body relic-plaque-body${has ? '' : ' unknown'}">
				${relicIcon(r.id)}
				<div>
					<p class="plaque-goal">${has ? r.name : T('museum.unknown')}</p>
					<p>${r.desc}</p>
				</div>
			</div>${foot}`;
	};
	document.querySelectorAll('.relic-sq').forEach(b => {
		b.onclick = () => {
			sfx('select');
			show(+b.dataset.i);
		};
	});
	// the plaque is as tall as its tallest relic, so it never jumps
	openOverlay('ovMsg');
	let tallest = 0;
	RELICS.forEach((r, i) => {
		show(i);
		tallest = Math.max(tallest, $('relicPlaque').offsetHeight);
	});
	$('relicPlaque').style.minHeight = tallest + 'px';
	// it starts on the relic found most recently, or the first to find
	const found = RELICS.map((r, i) => [save.relics[r.id] || 0, i]).filter(([t]) => t);
	show(found.length ? found.sort((a, b) => b[0] - a[0])[0][1] : 0);
	$('relicsCodex').onclick = () => {
		sfx('page');
		openHelp('relics');
	};
}
