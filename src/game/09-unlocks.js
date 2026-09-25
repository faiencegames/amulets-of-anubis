/* =============================================================================
 * 09-unlocks.js  —  what unlocks looks and finds relics, and the banners that
 * announce it.
 *
 * Every look (amulet set, floor, frame, sparkle) and every relic has
 * conditions in its content file ("need", "found_when"), checked by
 * conditionMet() in 01-core.js.
 *
 * What's here:
 *   checkRelics()       finds whatever relics are now earned, then runs
 *                       checkLooks() for the looks (called after a win, a
 *                       loss, a move, a river event)
 *   conditionText(), lookNeedText(), needProgress()
 *                       what a locked look asks for, in words, and how far
 *                       along it is (the Customise screen)
 *   CONDITION_NAMES, CONDITION_TEXT
 *                       the words for each kind of condition. A new condition
 *                       needs its words here and in content/text.jsonc.
 *   announce()          a banner at the top of the screen, one at a time
 *                       (new relics, looks, seals, stages)
 *
 * checkLooks() also runs when Customise opens, for anything earned where no
 * check ran (a restored save).
 *
 * Changes in the save: skins, floors, frames, sparkles (unlocked looks).
 * ===========================================================================*/

// ---------- looks: when each is unlocked ----------
// Every amulet set, floor, frame and sparkle has a `need`: a block of
// conditions from its content file (see conditionMet in 01-core.js), or none.
function lookUnlocked(o) {
	return conditionMet(o.need, save);
}

// What a locked look (or anything with conditions) asks of the player, with
// progress so far. A content file can say it in its own words instead.
// What a condition asks, in words (content/text.jsonc, "conditions"). {n} is its
// number; for a relic, stop, difficulty or board, {name} is that thing's name.
const CONDITION_NAMES = {
	// with its article: "the Golden barque", and "the royal granary" for The royal granary
	relic: id => 'the ' + (RELICS.find(r => r.id === id) || { name: 'relic' }).name.replace(/^The /, ''),
	win_at_stop: id => (LEVELS.find(stop => stop.id === id) || { name: id }).name,
	win_on_difficulty: d => DIFFICULTY[d].name,
	win_on_board: b => boardMode(b).name,
};

const CONDITION_TEXT = new Proxy(
	{},
	{
		get: (o, k) =>
			TEXT['conditions.' + k] == null
				? undefined
				: v =>
						T(
							'conditions.' + k,
							CONDITION_NAMES[k]
								? { name: CONDITION_NAMES[k](v) }
								: { n: typeof v === 'number' ? v.toLocaleString() : v },
						),
	},
);
function conditionText(when) {
	if (!when) return '';
	return Object.keys(when)
		.map((k, i) => {
			let t = CONDITION_TEXT[k] ? CONDITION_TEXT[k](when[k]) : k;
			if (i > 0) t = t.charAt(0).toLowerCase() + t.slice(1); // "…, and win a stop on Hard"
			const have = CONDITION_COUNTERS[k] ? CONDITION_COUNTERS[k](save) : null;
			return have != null && have < when[k]
				? T('conditions.so_far', { text: t, n: have.toLocaleString() })
				: t;
		})
		.join(Tplain('conditions.and'));
}

function lookNeedText(o) {
	return o.needText || conditionText(o.need);
}

// How far a locked look is to unlocking, so the Customise screen can show a
// bar. Counted conditions give an exact "x of y". A one-off deed (a relic, a
// stop gilded, a win) has no bar on its own, as it would only read "0 of 1";
// among several conditions it counts as one of them.
function needProgress(o) {
	if (lookUnlocked(o)) return { pct: 100, have: null, need: null };
	const c = o.need ? Object.keys(o.need) : [];
	if (c.length === 1) {
		const k = c[0],
			v = o.need[k];
		if (k in CONDITION_COUNTERS)
			return {
				pct: Math.min(100, Math.round(((CONDITION_COUNTERS[k](save) || 0) / v) * 100)),
				have: Math.min(CONDITION_COUNTERS[k](save) || 0, v),
				need: v,
			};
		// one relic to find: its words say so, and a bar of "0 of 1" adds nothing
		return { pct: 0, have: null, need: null };
	}
	if (c.length > 1) {
		let met = 0;
		c.forEach(k => {
			if (k in CONDITION_COUNTERS) {
				if ((CONDITION_COUNTERS[k](save) || 0) >= o.need[k]) met++;
			} else if (k === 'relic') {
				if ((save.relics || {})[o.need[k]]) met++;
			}
		});
		return { pct: Math.round((met / c.length) * 100), have: met, need: c.length };
	}
	return { pct: 0, have: null, need: null };
}

function lookPopup(label, name, pic) {
	markNew('customise');
	announce(label, name, pic ? `<img src="${pic}" alt="">` : '', T('banner.look_where'), 'create');
}

function checkLooks() {
	FLOOR_SETS.forEach(f => {
		if (!save.floors[f.id] && lookUnlocked(f)) {
			save.floors[f.id] = 1;
			persist();
			lookPopup(T('banner_looks.floor'), f.name, floorPreview(f.id));
		}
	});
	SKINS.forEach(sk => {
		if (!save.skins[sk.id] && lookUnlocked(sk)) {
			save.skins[sk.id] = 1;
			persist();
			lookPopup(T('banner_looks.set'), sk.name, skinPreview(sk.id));
		}
	});
	FRAMES.forEach(f => {
		if (!save.frames[f.id] && lookUnlocked(f)) {
			save.frames[f.id] = 1;
			persist();
			lookPopup(T('banner_looks.frame'), f.name, framePreview(f.id));
		}
	});
	SPARKLES.forEach(s => {
		if (!save.sparkles[s.id] && lookUnlocked(s)) {
			save.sparkles[s.id] = 1;
			persist();
			lookPopup(T('banner_looks.sparkle'), s.name, sparklePreview(s.id));
		}
	});
}

// ---------- unlock banners ----------
// New relics and looks are shown as banners at the top of the screen, one at a
// time, above any open scroll. (They used to be canvas popups, which lasted two
// seconds, sat on top of each other and on top of the trial and cascade text,
// and were hidden under the victory scroll.) Each waits its turn; a tap sends
// it away early. Its sound plays when it appears, so a run of unlocks is heard
// one by one rather than all at once.
const announceQ = [];
let announceCur = null,
	announceTimer = 0;
function announce(label, name, pic, extra, sound) {
	announceQ.push({ label, name, pic, extra, sound });
	if (!announceCur) nextAnnounce();
	else announceMore();
}

function announceMore() {
	const m = announceCur && announceCur.querySelector('.ut-more');
	if (m) {
		m.textContent = announceQ.length ? Tplain('banner.more', { n: announceQ.length }) : '';
	}
}

function nextAnnounce() {
	const a = announceQ.shift(),
		box = $('toasts');
	if (!a || !box) {
		announceCur = null;
		return;
	}
	const el = document.createElement('div');
	el.className = 'unlock-toast';
	el.innerHTML = html`
		${a.pic ? `<span class="ut-pic" aria-hidden="true">${a.pic}</span>` : ''}
		<span class="ut-text">
			<small>${a.label}</small>
			<strong>${a.name}</strong>
			${a.extra ? `<span class="ut-extra">${a.extra}</span>` : ''}
		</span>
		<em class="ut-more" aria-hidden="true"></em>`;
	el.onclick = () => dismissAnnounce(el);
	box.appendChild(el);
	announceCur = el;
	announceMore();
	requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
	if (a.sound) sfx(a.sound);
	clearTimeout(announceTimer);
	announceTimer = setTimeout(() => dismissAnnounce(el), 4200);
}

function dismissAnnounce(el) {
	if (el !== announceCur || el.classList.contains('out')) return;
	clearTimeout(announceTimer);
	el.classList.add('out');
	el.classList.remove('in');
	setTimeout(
		() => {
			el.remove();
			nextAnnounce();
		},
		reduceMotion ? 60 : 320,
	);
}

// Every relic says in its content file what finds it (conditionMet).
function checkRelics() {
	// a relic found can complete another ("find eight relics"), so look again
	for (let pass = 0; pass < 3; pass++) {
		let found = false;
		RELICS.forEach(r => {
			if (!save.relics[r.id] && conditionMet(r.when, save)) {
				grantRelic(r.id);
				found = true;
			}
		});
		if (!found) break;
	}
	checkLooks();
}
