/* =============================================================================
 * 25-codex.js  —  How to play, a book in chapters.
 *
 * What's here:
 *   openHelp(chapter)   opens it: on a wide screen the chapters run down the
 *                       margin, on a narrow one (CODEX_NARROW) it opens on a
 *                       contents page and turns like pages
 *   CODEX_GROUPS        the chapters, in two groups (on the board, on the
 *                       journey), each with a picture in
 *                       images/icons/codex/. The website reads this list too.
 *   CODEX_STAGE         the stage a chapter waits for on a first journey
 *                       (26-stages.js)
 *
 * The chapters' words are in content/text.jsonc ("codex"); the amulets'
 * names and meanings come from content/amulets/.
 *
 * Changes in the save: seenHelp.
 * ===========================================================================*/

// ---------- the codex (How to play) ----------
// Each amulet's name and what the symbol meant (AMULET_INFO) comes from
// content/amulets/; the codex lists only amulets that some stop uses.
// The chapters, in two groups. Names: content/text.jsonc, "codex.tabs"; each
// chapter's picture: images/icons/codex/<id>.svg.
const CODEX_GROUPS = [
	['board', ['basics', 'amulets', 'specials', 'badges', 'boons', 'floors']],
	['journey', ['trials', 'events', 'places', 'relics', 'omens', 'shops']],
];
// the stage a chapter waits for on a first journey (26-stages.js); the rest are there from the start
const CODEX_STAGE = {
	badges: 'badges',
	boons: 'trials',
	trials: 'trials',
	events: 'events',
	places: 'chambers',
	omens: 'seals',
};
// On a wide screen the chapters run down the margin. On a narrow one How to
// play opens on its contents, and each chapter turns to the next like a page.
const CODEX_NARROW = '(max-width: 640px)'; // the same width as in web/css/09-codex-and-sound.css
let codexLast = null; // the chapter last read, to open at again on a wide screen

function codexPic(id) {
	const svg = iconSvg('codex', id);
	return svg
		? svg.match(/^<svg[^>]*>/)[0].replace('<svg', '<svg aria-hidden="true" focusable="false"') +
				iconArt('codex', id) +
				'</svg>'
		: '';
}

function openHelp(tab) {
	const narrow = window.matchMedia && matchMedia(CODEX_NARROW).matches;
	tab = tab || (narrow ? 'contents' : codexLast || 'basics');
	const chapters = CODEX_GROUPS.map(([g, ids]) => [
		g,
		ids.filter(id => id === tab || stageOn(CODEX_STAGE[id] || '-')),
	]);
	const order = chapters.flatMap(([, ids]) => ids);
	if (tab !== 'contents') {
		clearNew('codex:' + tab);
		codexLast = tab;
	}
	// seen once it has been opened, however it is closed (so it does not open by itself again)
	if (!save.seenHelp) {
		save.seenHelp = true;
		persist();
	}
	const icon = (kind, type) => {
		const c = document.createElement('canvas');
		c.width = c.height = 96;
		drawTile(
			{ type: type == null ? (kind === 'sun' ? 6 : 1) : type, special: kind || null },
			0,
			0,
			1,
			1,
			c.getContext('2d'),
			96,
		);
		return c.toDataURL();
	};
	const spr = name => skinned(AMULET_PICS[name], name, save.skin).toDataURL();
	const floorImg = img => {
		const c = document.createElement('canvas');
		c.width = c.height = 64;
		c.getContext('2d').drawImage(img, 0, 0, 64, 64);
		return c.toDataURL();
	};
	const row = (img, title, text) =>
		`<li><img src="${img}" alt=""><div><strong>${title}</strong><br>${text}</div></li>`;
	let body = '';
	if (tab === 'basics') {
		const leg = (img, title, text) =>
			'<div class="legend-row"><img src="' +
			img +
			'" alt=""><div><strong>' +
			title +
			'.</strong> ' +
			text +
			'</div></div>';
		const B = k => T('codex.basics.' + k);
		body = `
		<p class="lede">${B('lede')}</p>
		${journeyRoadmap(false)}
		<h3 class="help-h">${B('pieces')}</h3>
		<div class="basics-legend">
			${leg(spr(ON_SHOW.howToPlay), B('amulet'), B('amulet_text'))}
			${leg(floorImg(FLOOR_STONE), B('bare'), B('bare_text'))}
			${leg(floorImg(FLOOR_GOLD[0]), B('gilded'), B('gilded_text'))}
		</div>
		<h3 class="help-h">${B('stop_works')}</h3>
		<ul class="help-points"><li>${B('swap')}</li><li>${B('gilds')}</li><li>${B('bigger')}</li><li>${B('stars')}</li></ul>
		<h3 class="help-h">${B('goes_wrong')}</h3>
		<ul class="help-points"><li>${B('fail_moves')}</li><li>${B('fail_boon')}</li><li>${B('fail_buy')}</li></ul>
		<h3 class="help-h">${B('money')}</h3>
		<ul class="help-points">
			<li>${T('codex.basics.earn', { gold: '<i class="g-ico gold"></i>', lapis: '<i class="g-ico lapis"></i>' })}</li>
			<li>${stageOn('stall') ? B('spend_stall') : B('spend')}</li>
			<li>${B('looks')}</li>
		</ul>
		<h3 class="help-h">${B('controls')}</h3>
		<ul class="help-points"><li>${B('touch')}</li><li>${B('keys')}</li><li>${B('menu')}</li><li>${B('music')}</li></ul>`;
	}
	if (tab === 'amulets') {
		const where = {};
		THEMES.forEach((t, i) =>
			[...new Set((LEVELS[i].sets || [t.set]).flat())].forEach(n => {
				(where[n] = where[n] || []).push(LEVELS[i].name);
			}),
		);
		// the tombs' and temples' own amulets, once the chambers have arrived
		if (stageOn('chambers'))
			CHAMBERS.forEach(c => {
				(c.set || THEMES[c.at].set)
					.slice(0, c.types)
					.forEach(n => (where[n] = where[n] || []).push(c.title));
			});
		body =
			`<p>${T('codex.amulets_intro')}</p><ul class="help-list codex">` +
			Object.keys(AMULET_INFO)
				.filter(n => where[n])
				.map(n =>
					row(
						spr(n),
						AMULET_INFO[n][0],
						AMULET_INFO[n][1] + `<br><em class="where">${where[n].join(', ')}</em>`,
					),
				)
				.join('') +
			`</ul>`;
	}
	const S = (k, img) => row(img, T('codex.' + k), T('codex.' + k + '_text'));
	if (tab === 'specials')
		body = html`
			<p>${T('codex.specials.intro')}</p>
			<ul class="help-list"> ${S('specials.band', icon('h'))}${S('specials.ring', icon('bomb'))}${S('specials.star', icon('star'))}${S('specials.sun', icon('sun'))}${S('specials.combo', icon('h'))}
			</ul>`;
	// a badge's line: its name, how it looks, and what it does (content/badges/)
	const badgeRow = id => row(icon(id), fill(`${BADGES[id].name} (${BADGES[id].looks})`), BADGES[id].text);
	if (tab === 'badges')
		body = `<p>${T('codex.badges.intro')}</p><ul class="help-list">
		${POWERS.filter(id => !BADGES[id].cursed)
			.map(badgeRow)
			.join('')}</ul>
		<p>${T('codex.badges.cursed_intro')}</p><ul class="help-list">
		${BAD_BADGES.map(badgeRow).join('')}</ul>`;
	if (tab === 'boons')
		body =
			`<p>${T('codex.boons.intro')}</p><ul class="help-list">` +
			Object.keys(BOONS)
				.map(k =>
					row(
						'data:image/svg+xml;utf8,' + encodeURIComponent(BOON_ICON_FULL[k]),
						BOONS[k].name,
						BOONS[k].desc +
							(BOONS[k].target ? ` <em class="where">${T('codex.boons.choose')}</em>` : ''),
					),
				)
				.join('') +
			`</ul>
		<p>${T('codex.boons.where')}</p>`;
	if (tab === 'floors')
		body = html`
			<ul class="help-list"> ${S('floors.bare', floorImg(FLOOR_STONE))}${S('floors.thick', floorImg(FLOOR_THICK))}${S('floors.gilded', floorImg(FLOOR_GOLD[0]))}
			</ul>
			<p>${T('codex.floors.kinds')}</p>
			<p>
				${T('codex.floors.shapes', {
					shapes: Object.values(SHAPES)
						.map(x => x.name.toLowerCase())
						.join(', '),
				})}
			</p>`;
	if (tab === 'trials') {
		const lvl = save.difficulty,
			cur = CURSES.filter(c => c.by[lvl] > 0);
		body =
			`<p>${T('codex.trials.intro')}</p>
		<h3 class="shop-head">${T('codex.trials.curses_on', { difficulty: DIFFICULTY[lvl].label })}</h3>
		${cur.length ? '<ul class="plain">' + cur.map(c => `<li><strong>${c.name}:</strong> ${c.text(c.by[lvl])}.</li>`).join('') + '</ul>' : `<p>${T('codex.trials.no_curses')}</p>`}
		<p>${T('codex.trials.harsher')}</p>
		<p>${T('codex.trials.river')}</p>
		<h3 class="shop-head">${T('codex.trials.every')}</h3><ul class="plain">` +
			TRIALS.map(
				t => `<li>${trialText(t, 'of one amulet')} \u2014 <em>${BOONS[t.boon].name}</em></li>`,
			).join('') +
			`</ul>`;
	}
	// which relics and looks count river events, named from their content files
	const eventGoals = () => {
		const n = [
			...RELICS.filter(r => r.when && r.when.river_events).map(r =>
				T('codex_more.relic_name', { name: r.name.replace(/^The /, '') }),
			),
			...[...SKINS, ...FLOOR_SETS, ...FRAMES, ...SPARKLES]
				.filter(o => o.need && o.need.river_events)
				.map(o => o.name.toLowerCase()),
		];
		return n.length
			? html`
				<p>
					${T('codex_more.event_counts', { list: n.length > 1 ? n.slice(0, -1).join(', ') + Tplain('codex_more.and') + n[n.length - 1] : n[0] })}
				</p>`
			: '';
	};
	const evGoal = e =>
		({
			gild: () => T('codex_more.event_gild'),
			collect: () =>
				T('codex_more.event_collect', {
					n: e.goal.n || '',
					amulets: AMULET_NAMES[e.goal.amulet] || '',
				}),
			score: () => T('codex_more.event_score', { n: (e.goal.n || 0).toLocaleString() }),
		})[e.goal.type]();
	if (tab === 'events')
		body = html`
			<p>${T('codex_more.events_intro')}</p>
			<ul class="plain">
				${EVENTS.map(
					e => html`
			<li>
				<strong>${e.title}.</strong> ${e.kind === 'puzzle' ? T('codex_more.event_line', { goal: evGoal(e), moves: e.moves, lamp: e.fog ? T('codex_more.event_lamp') : '', reward: rewardText(e.reward) }) : T('codex_more.event_choice')}
			</li>`,
				).join('')}
			</ul> ${eventGoals()}`;
	if (tab === 'omens')
		body = html`
			<p>${T('codex.omens.seals', { n: SEAL_LAPIS })}</p>
			<p>${T('codex.omens.omens')}</p>
			<ul class="help-list">
				${OMENS.map(o => `<li class="no-ico"><div><strong>${o.name}</strong><br>${o.text}.</div></li>`).join('')}
			</ul>
			<p>
				${gildBar(
					CONDITION_COUNTERS.seals_stamped(save),
					LEVELS.reduce((a, stop) => a + (stop.seals || []).length, 0),
				)}
			</p>`;
	// Tombs, temples and oases: what they are, what each cover means (with a
	// picture of an amulet under it, content/covers/), and where each lies.
	if (tab === 'places') {
		const P = k => T('codex.places.' + k);
		const covered = cover => {
			const c = document.createElement('canvas');
			c.width = c.height = 96;
			const pen = c.getContext('2d'),
				name = cover.shownOn;
			pen.drawImage(skinned(AMULET_PICS[name], name, save.skin), 7, 7, 82, 82);
			pen.drawImage(COVER_PICS[cover.id], -24, -24, 144, 144);
			return c.toDataURL();
		};
		const place = c =>
			`<li>${iconSvg('map', placeIcon(c), 'class="place-ico" aria-hidden="true"')}<div><strong>${c.title}${save.chambers[c.id] ? ' \u2713' : ''}</strong><br>` +
			`${T('codex.places.line', { stop: LEVELS[c.at].name, reward: rewardText(c.reward), again: rewardText(c.returnReward) })}</div></li>`;
		body = html`
			<p>${P('intro')}</p>
			<ul class="help-list codex">
				${COVER_IDS.map(id => row(covered(COVERS[id]), fill(COVERS[id].name), fill(COVERS[id].text))).join('')}
			</ul>
			<h3 class="help-h">${P('tombs')}</h3>
			<p>${P('tombs_text')}</p>
			<ul class="help-list">
				${CHAMBERS.filter(c => !c.oasis)
					.map(place)
					.join('')}
			</ul>
			<h3 class="help-h">${P('oases')}</h3>
			<p>${P('oases_text')}</p>
			<ul class="help-list">
				${CHAMBERS.filter(c => c.oasis)
					.map(place)
					.join('')}
			</ul>
			<p>${P('reward')}</p>`;
	}
	if (tab === 'relics') {
		const found = Object.keys(save.relics || {}).length;
		const rw = r => (r.reward ? '+ ' + rewardText(r.reward) : '');
		body = html`
			<p>${T('codex.relics.intro')}</p>
			<p class="lede" style="margin-bottom:8px">
				${gildBar(found, RELICS.length)}
			</p>
			<ul class="help-list">
				${RELICS.map(
					r => html`
			<li>
				${relicIcon(r.id)}
				<div>
					<strong>${save.relics[r.id] ? r.name : T('codex.relics.unknown')}</strong>
					<br>
					${r.desc}${r.reward ? ` <em class="where">${rw(r)}</em>` : ''}
				</div>
			</li>`,
				).join('')}
			</ul>`;
	}
	if (tab === 'shops')
		body = html`
			<p>${T('codex_more.shops_money')}</p>
			<p>
				${T('codex_more.shops_treasury', { upgrades: UPGRADES.map(u => u.name).join(', '), n: RELICS.length })}
			</p>
			<p>${T('codex_more.shops_customise')}</p>
			<p>${T('codex_more.shops_stall', { items: STALL.map(x => x.name.toLowerCase()).join(', ') })}</p>`;
	const name = id => T('codex.tabs.' + id);
	const dot = id => (isNew('codex:' + id) ? ' has-new' : '');
	const link = (id, cls) =>
		html`
			<button type="button" class="${cls}${id === tab ? ' on' : ''}${dot(id)}" data-t="${id}"${id === tab ? ' aria-current="page"' : ''}>
				${codexPic(id)}
				<span>${name(id)}</span>
			</button>`;
	const index = chapters
		.map(
			([g, ids]) =>
				`<h3>${T('codex.groups.' + g)}</h3>${ids.map(id => link(id, 'codex-link')).join('')}`,
		)
		.join('');
	let page;
	if (tab === 'contents') {
		page = `<div class="codex-contents">${chapters
			.map(
				([g, ids]) =>
					html`
						<div>
							<h3>${T('codex.groups.' + g)}</h3>
							${ids.map(id => link(id, 'codex-entry')).join('')}
						</div>`,
			)
			.join('')}</div>`;
	} else {
		const at = order.indexOf(tab),
			prev = order[at - 1],
			next = order[at + 1];
		const turn = (id, cls, text) =>
			id
				? `<button type="button" class="codex-turn-${cls}" data-t="${id}">${text}</button>`
				: '<span></span>';
		page = html`
			<div class="codex-leaf-top">
				<button type="button" class="codex-back" data-t="contents">
					${T('codex.back_to_contents')}
				</button>
				<span>${T('codex.chapter', { n: at + 1, total: order.length })}</span>
			</div>
			<h3 class="codex-heading">${codexPic(tab)}${name(tab)}</h3>
			<div class="codex-body">${body}</div>
			<div class="codex-turn">
				${turn(prev, 'prev', '\u2039 ' + (prev ? name(prev) : ''))}${turn(next, 'next', (next ? name(next) : '') + ' \u203a')}
			</div>`;
	}
	$('msgBody').innerHTML = html`
		<h2 id="msgTitle">${T('codex.title')}</h2>
		<div class="codex-book${tab === 'contents' ? ' at-contents' : ''}">
			<nav class="codex-index" aria-label="${Tplain('codex.contents')}">${index}</nav>
			<div class="codex-page">${page}</div>
		</div>`;
	$('msgBody')
		.querySelectorAll('.codex-book [data-t]')
		.forEach(
			b =>
				(b.onclick = () => {
					sfx('page');
					openHelp(b.dataset.t);
				}),
		);
	wirePace($('msgBody'));
	if (!$('ovMsg').classList.contains('open')) openOverlay('ovMsg');
	$('ovMsg').querySelector('.scroll').classList.add('wide'); // after opening, which sets the width back
	$('msgBody').scrollTop = 0;
}
