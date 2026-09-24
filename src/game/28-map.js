// ---------- the map and the stop card ----------
// The stop scroll: shown when a stop is picked on the map. It lists the stop's
// seals and, once the stop is gilded, lets the player brave omens.
function openStop(i) {
	const L = LEVELS[i],
		won = (save.stars[i] || 0) > 0,
		st = save.stars[i] || 0;
	const pick = new Set(save.omenPick && save.omenPick.stop === L.id ? save.omenPick.list : []);
	const best = (save.omens || {})[L.id] || 0;
	const ch = chamberAt(i),
		chOpen = chamberOpen(ch);
	// the stop's parts: its seals, the omens to brave, a doorway. With more than
	// one, each is a small tile with the gist, and only the chosen one is open.
	const parts = [];
	const notes = [];
	if (stageOn('seals') && (L.seals || []).length)
		parts.push({
			id: 'seals',
			name: T('stop.seals'),
			gist: T('stop.seals_gist', { n: sealsOf(i).filter(Boolean).length, total: L.seals.length }),
			html: sealsLine(i, []),
		});
	if (won && stageOn('omens'))
		parts.push({
			id: 'omens',
			name: T('stop.omens'),
			gist: '',
			html: `<p class="shop-desc" style="text-align:center">${T('stop.omens_lede')}${best ? T('stop.omens_best', { n: best }) : ''}</p>
			<div class="omen-list">${OMENS.map(o => `<label class="fill-toggle omen"><input type="checkbox" data-o="${o.id}" ${pick.has(o.id) ? 'checked' : ''}> <span><strong>${o.name}</strong><br><span class="shop-desc">${o.text}</span></span></label>`).join('')}</div>`,
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
			gist: T(save.chambers[ch.id] ? 'stop.door_explored' : 'stop.door_open'),
			html: `<p class="trial-goal stop-door">${iconSvg('map', placeIcon(ch), 'class="door-ico" aria-hidden="true"')}${ch.title}</p><p>${chText}</p>`,
		});
	else if (ch && stageOn('chambers') && !won) notes.push(T(placeKey(ch, 'locked')));
	const tiles = parts.length > 1;
	const partsHtml = tiles
		? `<div class="stop-tiles" role="tablist">${parts.map((p, j) => `<button type="button" role="tab" class="stop-tile${j ? '' : ' on'}" aria-selected="${!j}" data-part="${p.id}"><b>${p.name}</b><span data-gist="${p.id}">${p.gist}</span></button>`).join('')}</div>
			${parts.map((p, j) => `<div class="stop-part" role="tabpanel" data-panel="${p.id}"${j ? ' hidden' : ''}>${p.html}</div>`).join('')}`
		: parts.map(p => `<h3 class="shop-head">${p.name}</h3>${p.html}`).join('');
	showMsg(
		`<h2 id="msgTitle">${L.name}</h2><p class="lede" style="text-align:center">${L.sub || ''}${st ? `<br>${'\u2605'.repeat(st)}${'\u2606'.repeat(3 - st)}` : ''}</p>
		${partsHtml}${notes.map(n => `<p class="shop-desc stop-note">${n}</p>`).join('')}`,
		[
			[
				Tplain('stop.set_out'),
				() => {
					const list = [...$('msgBody').querySelectorAll('.omen input:checked')].map(
						x => x.dataset.o
					);
					save.omenPick = list.length ? { stop: L.id, list } : null;
					persist();
					startLevel(i);
				},
				{ kind: 'go', icon: iconSvg('ui', 'barque'), sub: '<span id="omenTotal"></span>' },
			],
			// the doorway: with tiles, the big button becomes this while its tile is open
			...(chOpen
				? [
						[
							Tplain(placeKey(ch, save.chambers[ch.id] ? 'go_back' : 'explore'), { name: midSentence(ch.title) }),
							() => startChamber(ch, chamberFromCard()),
							{
								kind: tiles ? 'go' : 'card',
								dark: true,
								oasis: !!ch.oasis,
								hidden: tiles,
								icon: iconSvg('map', placeIcon(ch)),
								sub: tiles ? '' : chText,
							},
						],
					]
				: []),
		],
		{ onClose: openMap } // the \u00d7 goes back to the map, where the stop was chosen
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
				})
		);
	const total = () => {
		const n = $('msgBody').querySelectorAll('.omen input:checked').length,
			el = $('omenTotal'),
			gist = $('msgBody').querySelector('[data-gist="omens"]');
		if (el && won && stageOn('omens'))
			el.innerHTML = n
				? T('stop.total', { n, x: (1 + OMEN_BONUS * n).toFixed(1) })
				: T('stop.total_none');
		if (gist) gist.innerHTML = n ? T('stop.omens_some', { n }) : T('stop.omens_none');
	};
	$('msgBody')
		.querySelectorAll('.omen input')
		.forEach(
			x =>
				(x.onchange = () => {
					sfx('select');
					total();
				})
		);
	total();
}

function openMap() {
	clearNew('map');
	const sites = LEVELS.map((L, i) => {
		const locked = i > save.unlocked,
			st = save.stars[i] || 0,
			cur = i === levelIdx;
		const tx = L.anchor === 'start' ? L.x + 15 : L.x - 15;
		const hw = L.name.length * 7.6 + 34 + (chamberOpen(chamberAt(i)) ? 18 : 0),
			hx = L.anchor === 'start' ? L.x - 17 : L.x + 17 - hw; // a generous tap area over the marker and its name
		return `<g class="site" data-i="${i}" ${locked ? '' : 'tabindex="0" role="button"'} aria-label="${L.name}${locked ? ', locked' : st ? `, ${st} of 3 stars` : ''}" opacity="${locked ? 0.55 : 1}">
			<rect class="hit" x="${hx}" y="${L.y - 13}" width="${hw}" height="${st ? 30 : 26}" rx="6" fill="#000" fill-opacity="0"/>
			<g transform="translate(${L.x} ${L.y})">${iconArt('map', locked ? 'stop-locked' : 'stop')}</g>
			<circle class="mark" cx="${L.x}" cy="${L.y}" r="11" fill="none" stroke="${cur ? '#8e2415' : 'none'}" stroke-width="3.5"/>
			<text x="${L.x}" y="${L.y + 4.5}" text-anchor="middle" font-size="12" font-weight="700" fill="#2b1606">${i + 1}</text>
			<text class="site-name" x="${tx}" y="${L.y + 4}" text-anchor="${L.anchor}" font-size="13" font-weight="700" fill="${locked ? '#6b5a3a' : '#3a1e08'}" stroke="#ead7a4" stroke-width="3" paint-order="stroke">${L.name}</text>
			${st ? `<text x="${tx}" y="${L.y + 17}" text-anchor="${L.anchor}" font-size="11" fill="#9a6a12" stroke="#ead7a4" stroke-width="3" paint-order="stroke">${'\u2605'.repeat(st)}${'\u2606'.repeat(3 - st)}<tspan fill="#a8341c"> ${sealsOf(i).some(Boolean) ? sealDots(i) : ''}</tspan></text>` : ''}
			${chamberOpen(chamberAt(i)) ? `<g class="door-mark" data-anchor="${L.anchor}" transform="translate(${L.x} ${L.y}) scale(.8)" opacity="${save.chambers[chamberAt(i).id] ? 0.7 : 1}">${iconArt('map', placeIcon(chamberAt(i)))}</g>` : ''}
		</g>`;
	}).join('');
	$('mapBody').innerHTML =
		`<h2 style="margin:0 0 2px;font-family:var(--display);font-size:28px;color:var(--carnelian);text-align:center">${T('map.title')}</h2>
	 <p class="lede" style="text-align:center;margin:0 0 6px;font-style:italic;color:#6b4a22">${T('map.lede')}</p>
	 <div class="map-scroll" id="mapScroll"><svg id="mapSvg" viewBox="0 0 360 560" role="group" aria-label="${T('map.label')}">
		${iconInner('map', 'nile')}
		${sites}
	 </svg></div>
	 <h3 class="shop-head" style="margin-top:10px">${T('map.stops')}</h3>
	 <div class="stop-list">${LEVELS.map((L, i) => stopButton(L, i)).join('')}</div>
	 <div class="actions"><button class="btn" id="mapClose">${T('map.back')}</button></div>`;
	$('mapBody')
		.querySelectorAll('.stop-btn:not([disabled])')
		.forEach(
			el =>
				(el.onclick = () => {
					closeOverlays();
					openStop(+el.dataset.i);
				})
		);
	// on a phone the map is zoomed in: open it centred on the current stop
	requestAnimationFrame(() => {
		const sc = $('mapScroll'),
			svg = $('mapSvg');
		if (!sc || sc.scrollHeight <= sc.clientHeight + 4) return;
		const L = LEVELS[levelIdx],
			k = svg.getBoundingClientRect().height / 560,
			kx = svg.getBoundingClientRect().width / 360;
		sc.scrollTop = Math.max(0, L.y * k - sc.clientHeight / 2);
		sc.scrollLeft = Math.max(0, L.x * kx - sc.clientWidth / 2);
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
		const seals = (L.seals || []).length;
		if (seals && stageOn('seals'))
			notes.push(T('map.meta_seals', { n: sealsOf(i).filter(Boolean).length, total: seals }));
		const omens = (save.omens || {})[L.id];
		if (omens) notes.push(T('map.meta_omens', { n: omens }));
		const ch = chamberAt(i);
		if (chamberOpen(ch))
			notes.push(
				`${iconSvg('map', placeIcon(ch), 'class="door-ico" aria-hidden="true"')}${T(placeKey(ch, save.chambers[ch.id] ? 'map_done' : 'map_new'))}`
			);
	}
	const starText = locked ? '' : '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);
	return (
		`<button class="stop-btn${cur ? ' cur' : ''}" data-i="${i}" ${locked ? 'disabled' : ''}>` +
		`<b>${i + 1}</b>` +
		`<span class="stop-name">${L.name}</span>` +
		`<em class="stop-stars" aria-label="${T('map.stars', { n: stars })}">${starText}</em>` +
		(notes.length
			? `<small class="stop-meta">${notes.map(n => `<span>${n}</span>`).join(' \u00b7 ')}</small>`
			: '') +
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
		[[Tplain('place.back'), () => {}]]
	);
}
