/* =============================================================================
 * 28-map.js: the map of the journey, the stop card and the Amulets
 * scroll.
 *
 * What's here:
 *   openMap()           the map: the river with every stop and a list under
 *                       it with each stop's stars and what else is there
 *   MAP_SIZE            the map's width and height: its picture's viewBox
 *                       (images/icons/map/background.svg)
 *   openStop(i)         the stop card: tiles for its seals, omens and
 *                       doorway, one open at a time; the big button follows
 *                       the open tile (onto the stop, or into the doorway)
 *   showAmulets(), amuletList()
 *                       the Amulets scroll: the amulets on the board and what
 *                       each meant
 *
 * Changes in the save: omenPick (the omens chosen for the next go at a
 * stop).
 * ===========================================================================*/

// ---------- the map and the stop card ----------
// the first sentence of a story, for a short line under a picture
function firstSentence(text) {
	const m = String(text).match(/^.*?[.!?](?=\s|$)/);
	return m ? m[0] : text;
}

// The stop scroll: shown when a stop is picked on the map. It lists the stop's
// seals and, once the stop is gilded, lets the player brave omens.
function openStop(i) {
	const stop = LEVELS[i],
		won = (save.stars[i] || 0) > 0,
		st = save.stars[i] || 0;
	const pick = new Set(save.omenPick && save.omenPick.stop === stop.id ? save.omenPick.list : []);
	const ch = chamberAt(i),
		chOpen = chamberOpen(ch);
	// the stop's parts: its seals, the omens to brave, a doorway. With more than
	// one, each is a small tile with the gist, and only the chosen one is open.
	const parts = [];
	const notes = [];
	if (stageOn('seals') && (stop.seals || []).length)
		parts.push({
			id: 'seals',
			name: T('stop.seals'),
			gist: marks('seal', sealsOf(i).filter(Boolean).length, stop.seals.length),
			say: T('stop.seals_gist', { n: sealsOf(i).filter(Boolean).length, total: stop.seals.length }),
			html: sealsLine(i, []),
		});
	if (won && stageOn('omens'))
		parts.push({
			id: 'omens',
			name: T('stop.omens'),
			gist: marks('omen', pick.size, OMENS.length),
			say: pick.size ? T('stop.omens_some', { n: pick.size }) : T('stop.omens_none'),
			html: html`
				<p class="shop-desc" style="text-align:center">
					${T('stop.omens_lede')}
				</p>
				<div class="omen-list">
					${OMENS.map(
						o => html`
				<label class="fill-toggle omen">
					<input type="checkbox" data-o="${o.id}" ${pick.has(o.id) ? 'checked' : ''}>${mark('omen', true)} <span><strong>${o.name}</strong><br><span class="shop-desc">${o.text}</span></span>
				</label>`,
					).join('')}
				</div>`,
		});
	else if (won) notes.push(T('stop.omens_later'));
	else notes.push(T('stop.omens_first_win'));
	const chText = chOpen
		? save.chambers[ch.id]
			? T(placeKey(ch, 'card_done'), { reward: rewardText(visitReward(ch)) })
			: T(placeKey(ch, 'card_new'), { reward: rewardText(ch.reward) })
		: '';
	if (chOpen)
		parts.push({
			id: 'door',
			name: T(placeKey(ch, 'heading')),
			gist: doorMark(ch),
			say: T(save.chambers[ch.id] ? 'stop.door_explored' : 'stop.door_open'),
			// the doorway's picture on a carved plaque, as on the doorway's own
			// scroll: the reward, then the first line of its story (or how often
			// it has been explored)
			html: html`
				<div class="chamber-plaque door-plaque">
					${iconSvg('ui', ch.oasis ? 'oasis-view' : 'chamber-door', 'class="door-pic" aria-hidden="true"')}
					<div class="card-body">
						<p class="plaque-goal">${ch.title}</p>
						<p class="trial-prize"><span>${rewardText(save.chambers[ch.id] ? visitReward(ch) : ch.reward)}</span></p>
					</div>
					<div class="card-foot">
						${save.chambers[ch.id] ? T(placeKey(ch, 'again'), { n: save.chamberWins[ch.id] || 1 }) : firstSentence(ch.text)}
					</div>
				</div>`,
		});
	else if (ch && stageOn('chambers') && !won) notes.push(T(placeKey(ch, 'locked')));
	const tiles = parts.length > 1;
	const partsHtml = tiles
		? html`
			<div class="stop-tiles" role="tablist">
				${parts
					.map(
						(p, j) => html`
			<button type="button" role="tab" class="stop-tile${j ? '' : ' on'}" aria-selected="${!j}" data-part="${p.id}">
				<b>${p.name}</b>
				<span data-gist="${p.id}" aria-label="${p.say}" role="img">${p.gist}</span>
			</button>`,
					)
					.join('')}
			</div> ${parts
				.map(
					(p, j) => html`
				<div class="stop-part" role="tabpanel" data-panel="${p.id}"${j ? ' hidden' : ''}>
					${p.html}
				</div>`,
				)
				.join('')}`
		: parts.map(p => `<h3 class="shop-head">${p.name}</h3>${p.html}`).join('');
	showMsg(
		html`
			<h2 id="msgTitle">${stop.name}</h2>
			<p class="lede" style="text-align:center">
				${stop.sub || ''}${
					st
						? html`
			<br>
			${'\u2605'.repeat(st)}${'\u2606'.repeat(3 - st)}`
						: ''
				}
			</p> ${partsHtml}${notes.map(n => `<p class="shop-desc stop-note">${n}</p>`).join('')}`,
		[
			[
				Tplain('stop.set_out'),
				() => {
					const list = [...$('msgBody').querySelectorAll('.omen input:checked')].map(
						x => x.dataset.o,
					);
					save.omenPick = list.length ? { stop: stop.id, list } : null;
					persist();
					startLevel(i);
				},
				{ kind: 'go', icon: iconSvg('ui', 'boat'), sub: '<span id="omenTotal"></span>' },
			],
			// the doorway: with tiles, the big button becomes this while its tile is open
			...(chOpen
				? [
						[
							Tplain(placeKey(ch, save.chambers[ch.id] ? 'go_back' : 'explore'), {
								name: midSentence(ch.title),
							}),
							() => startChamber(ch, chamberFromCard()),
							{
								kind: tiles ? 'go' : 'card',
								dark: true,
								oasis: !!ch.oasis,
								hidden: tiles,
								icon: iconSvg('map', placeIcon(ch)),
								sub: tiles ? '' : chText,
								short: tiles
									? Tplain(
											placeKey(
												ch,
												save.chambers[ch.id] ? 'go_back_short' : 'explore_short',
											),
										)
									: '',
							},
						],
					]
				: []),
		],
		{ onClose: openMap }, // the \u00d7 goes back to the map, where the stop was chosen
	);
	$('msgBody')
		.querySelectorAll('.stop-tile')
		.forEach(
			t =>
				(t.onclick = () => {
					sfx('select');
					$('msgBody')
						.querySelectorAll('.stop-tile')
						.forEach(x => {
							x.classList.toggle('on', x === t);
							x.setAttribute('aria-selected', x === t);
						});
					$('msgBody')
						.querySelectorAll('.stop-part')
						.forEach(p => (p.hidden = p.dataset.panel !== t.dataset.part));
					// the big button: into the doorway on its tile, otherwise onto the stop
					$('msgBody')
						.querySelectorAll('.act-go')
						.forEach(b => (b.hidden = (b.dataset.i === '1') !== (t.dataset.part === 'door')));
				}),
		);
	const total = () => {
		const n = $('msgBody').querySelectorAll('.omen input:checked').length,
			el = $('omenTotal'),
			gist = $('msgBody').querySelector('[data-gist="omens"]');
		if (el && won && stageOn('omens'))
			el.innerHTML = n
				? T('stop.total', { n, x: (1 + OMEN_BONUS * n).toFixed(1) })
				: T('stop.total_none');
		if (gist) {
			gist.innerHTML = marks('omen', n, OMENS.length);
			gist.setAttribute('aria-label', n ? T('stop.omens_some', { n }) : T('stop.omens_none'));
		}
	};
	$('msgBody')
		.querySelectorAll('.omen input')
		.forEach(
			x =>
				(x.onchange = () => {
					sfx('select');
					total();
				}),
		);
	total();
}

// The map is the size of its picture (its viewBox); the stops' places
// ("map_position") are on it. With no picture, a tall 360 by 560.
const MAP_SIZE = (() => {
	const m = /viewBox="([^"]+)"/.exec(iconSvg('map', 'background'));
	const [, , w, h] = (m ? m[1] : '0 0 360 560')
		.trim()
		.split(/[\s,]+/)
		.map(Number);
	return { w, h };
})();

function openMap() {
	clearNew('map');
	const sites = LEVELS.map((stop, i) => {
		const locked = i > save.unlocked,
			st = save.stars[i] || 0,
			cur = i === levelIdx;
		const tx = stop.anchor === 'start' ? stop.x + 15 : stop.x - 15;
		const hw = stop.name.length * 7.6 + 34 + (chamberOpen(chamberAt(i)) ? 18 : 0),
			hx = stop.anchor === 'start' ? stop.x - 17 : stop.x + 17 - hw; // a generous tap area over the marker and its name
		return `<g class="site" data-i="${i}" ${locked ? '' : 'tabindex="0" role="button"'} aria-label="${stop.name}${locked ? ', locked' : st ? `, ${st} of 3 stars` : ''}" opacity="${locked ? 0.55 : 1}">
			<rect class="hit" x="${hx}" y="${stop.y - 13}" width="${hw}" height="${st ? 30 : 26}" rx="6" fill="#000" fill-opacity="0"/>
			<g transform="translate(${stop.x} ${stop.y})">${iconArt('map', locked ? 'stop-locked' : 'stop')}</g>
			<circle class="mark${cur ? ' site-here' : ''}" cx="${stop.x}" cy="${stop.y}" r="11" fill="none" stroke="none" stroke-width="3.5"/>
			<text class="site-num" x="${stop.x}" y="${stop.y + 4.5}" text-anchor="middle" font-size="12" font-weight="700">${i + 1}</text>
			<text class="site-name${locked ? ' site-locked' : ''}" x="${tx}" y="${stop.y + 4}" text-anchor="${stop.anchor}" font-size="13" font-weight="700" stroke-width="3" paint-order="stroke">${stop.name}</text>
			${
				st
					? html`
				<text class="site-stars" x="${tx}" y="${stop.y + 17}" text-anchor="${stop.anchor}" font-size="11" stroke-width="3" paint-order="stroke">
					${'\u2605'.repeat(st)}${'\u2606'.repeat(3 - st)}
				</text>`
					: ''
			}
			${
				chamberOpen(chamberAt(i))
					? html`
				<g class="door-mark" data-anchor="${stop.anchor}" transform="translate(${stop.x} ${stop.y}) scale(.8)" opacity="${save.chambers[chamberAt(i).id] ? 0.7 : 1}">
					${iconArt('map', placeIcon(chamberAt(i)))}
				</g>`
					: ''
			}
		</g>`;
	}).join('');
	$('mapBody').innerHTML = `<h2>${T('map.title')}</h2>
	 <p class="lede map-lede">${T('map.lede')}</p>
	 <div class="map-scroll" id="mapScroll"><svg id="mapSvg" viewBox="0 0 ${MAP_SIZE.w} ${MAP_SIZE.h}" role="group" aria-label="${T('map.label')}">
		${iconInner('map', 'background')}
		${sites}
	 </svg></div>
	 <h3 class="shop-head" style="margin-top:10px">${T('map.stops')}</h3>
	 <div class="stop-list">${LEVELS.map((stop, i) => stopButton(stop, i)).join('')}</div>
	 ${exitButton(T('map.back'), 'id="mapClose"')}`;
	$('mapBody')
		.querySelectorAll('.stop-btn:not([disabled])')
		.forEach(
			el =>
				(el.onclick = () => {
					closeOverlays();
					openStop(+el.dataset.i);
				}),
		);
	// on a phone the map is zoomed in: open it centred on the current stop
	requestAnimationFrame(() => {
		const sc = $('mapScroll'),
			svg = $('mapSvg');
		if (!sc || sc.scrollHeight <= sc.clientHeight + 4) return;
		const stop = LEVELS[levelIdx],
			k = svg.getBoundingClientRect().height / MAP_SIZE.h,
			kx = svg.getBoundingClientRect().width / MAP_SIZE.w;
		sc.scrollTop = Math.max(0, stop.y * k - sc.clientHeight / 2);
		sc.scrollLeft = Math.max(0, stop.x * kx - sc.clientWidth / 2);
	});
	$('mapBody')
		.querySelectorAll('.site[tabindex]')
		.forEach(el => {
			const go = () => {
				closeOverlays();
				openStop(+el.dataset.i);
			};
			el.addEventListener('click', go);
			el.addEventListener('keydown', e => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					go();
				}
			});
		});
	$('mapClose').onclick = closeOverlays;
	openOverlay('ovMap');
	placeDoorMarks();
}

// One stop in the list under the map: its number and name, its stars, and a
// line in words saying what else is there (seals, omens, a doorway).
function stopButton(L, i) {
	const locked = i > save.unlocked,
		stars = save.stars[i] || 0,
		cur = i === levelIdx;
	const notes = [];
	if (locked) notes.push(T('map.locked'));
	else {
		// how far the stop has come, in pictures: its seals, the omens braved
		// there, its doorway (sealed once explored); the words for screen readers
		const seals = (L.seals || []).length,
			said = (words, pic) => `<span role="img" aria-label="${words}">${pic}</span>`;
		if (seals && stageOn('seals')) {
			const n = sealsOf(i).filter(Boolean).length;
			notes.push(said(T('map.meta_seals', { n, total: seals }), marks('seal', n, seals)));
		}
		const omens = (save.omens || {})[L.id];
		// one serpent and the count: small serpents in a row read as "SSS"
		if (omens)
			notes.push(
				said(
					T('map.meta_omens', { n: omens }),
					`<span class="marks">${mark('omen', true)}${omens > 1 ? `<b class="mark-n">\u00d7${omens}</b>` : ''}</span>`,
				),
			);
		const ch = chamberAt(i);
		if (chamberOpen(ch))
			notes.push(said(T(placeKey(ch, save.chambers[ch.id] ? 'map_done' : 'map_new')), doorMark(ch)));
	}
	const starText = locked ? '' : '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
	return (
		`<button class="stop-btn${cur ? ' cur' : ''}" data-i="${i}" ${locked ? 'disabled' : ''}>` +
		`<b>${i + 1}</b>` +
		`<span class="stop-name">${L.name}</span>` +
		`<em class="stop-stars" aria-label="${T('map.stars', { n: stars })}">${starText}</em>` +
		(notes.length ? `<small class="stop-meta">${notes.join('')}</small>` : '') +
		`</button>`
	);
}

// A doorway sits just past its stop's name, measured once the map is on
// screen: names differ too much in width to guess.
function placeDoorMarks() {
	$('mapSvg')
		.querySelectorAll('.door-mark')
		.forEach(door => {
			const name = door.parentNode.querySelector('.site-name').getBBox();
			const x = door.dataset.anchor === 'start' ? name.x + name.width + 10 : name.x - 10;
			door.setAttribute('transform', `translate(${x} ${name.y + name.height / 2}) scale(.8)`);
		});
}

// ---------- the stop's amulets ----------
// The amulets on the board and what they mean: the Amulets button opens a
// scroll that names and explains each one.
function amuletPictures() {
	return TILE_NAMES.map((n, i) => (TILE_SPRITES[i] ? TILE_SPRITES[i].toDataURL() : ''));
}

function amuletList() {
	const pics = amuletPictures();
	return (
		'<ul class="help-list codex">' +
		TILE_NAMES.map((n, i) => {
			const [name, meaning] = AMULET_INFO[n] || [n, ''];
			return `<li><img src="${pics[i]}" alt=""><div><strong>${name}</strong><br>${meaning}</div></li>`;
		}).join('') +
		'</ul>'
	);
}

function showAmulets() {
	if (busy) return;
	showMsg(
		`<h2 id="msgTitle">${T('place.amulets_title', { place: $('placeName').textContent })}</h2>` +
			amuletList(),
		[[Tplain('place.back'), () => {}, { kind: 'exit' }]],
	);
}
