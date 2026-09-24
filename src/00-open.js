/* =============================================================================
 * 00-open.js  —  opens the single closure that wraps the whole game, and loads
 * the player's saved data (progress, stars, gold, lapis, upgrades, relics,
 * held boons, settings) from one localStorage key. persist() writes it back.
 * ===========================================================================*/

(() => {
const TAU = Math.PI * 2;
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- persistence ----------
// Try-out mode, for people adding content: open the game with #try at the
// end of its address (dist/try-it.html does this for you). It keeps a separate
// save, so the real one is never touched, and opens everything: every stop,
// every look, a full purse and one of each boon. #try=<id> jumps straight to a
// stop, or plays a river event, by its id.
const TRY = /^#try\b/.test(location.hash);
const TRY_ID = (location.hash.match(/^#try=([\w-]+)/) || [])[1] || null;
const SAVE_KEY = TRY ? 'amulets-nile-try' : 'amulets-nile-v1';
let save = {
	unlocked: 0,
	stars: [],
	sound: true,
	seenHelp: false,
	current: 0,
	difficulty: 1,
	board: 'classic',
	fill: true,
	fails: {},
	skin: 'faience',
	skins: { faience: 1 },
	charges: {},
	boons: [],
	trialsDone: 0,
	gold: 0,
	lapis: 0,
	upg: {},
	relics: {},
	suns: 0,
	bestCascade: 0,
};

// Fill in defaults for any field a given save is missing. Idempotent: it is
// run both when the save loads from localStorage and when one is imported, so
// a code from an older build never leaves a look or setting undefined.
function applySaveDefaults(s) {
	s.life = s.life || { wins: s.wins || 0, events: 0, hardWins: 0 };
	s.floor = s.floor || 'temple';
	s.floors = s.floors || { temple: 1 };
	s.fails = s.fails || {};
	// cosmetic looks and phone vibration; older saves get the defaults
	s.frame = s.frame || 'temple';
	s.frames = s.frames || { temple: 1 };
	s.sparkle = s.sparkle || 'gold';
	s.sparkles = s.sparkles || { gold: 1 };
	s.steadySound = s.steadySound === true; // "Steadier sound": a larger audio buffer, off unless chosen
	s.vibrate = s.vibrateChosen ? s.vibrate === true : false; // off unless chosen in Sound, music and vibration (it used to start on)
	s.upg = s.upg || {};
	s.relics = s.relics || {};
	s.boons = (s.boons || []).filter(b => BOONS[b]); // a boon whose file is gone is let go
	s.skins = s.skins || { faience: 1 };
	s.charges = s.charges || {};
	s.seals = s.seals || {};
	s.omens = s.omens || {};
	s.chambers = s.chambers || {}; // tomb and temple chambers explored: id -> when first
	// how many times each was won; saves from before count an explored one once
	s.chamberWins = s.chamberWins || {};
	Object.keys(s.chambers).forEach(id => {
		if (!s.chamberWins[id]) s.chamberWins[id] = 1;
	});
	// staging (see STAGES in src/game/26-stages.js): a new player meets the game's systems
	// one at a time on the first journey. Saves made before staging existed, or
	// with any progress, have everything already.
	if (s.staged == null)
		s.staged =
			((s.life && s.life.wins) || 0) > 0 ||
			(s.unlocked || 0) > 0 ||
			(s.journeys || 1) > 1 ||
			CONTENT.settings.paceAll
				? 'all'
				: 1;
	// content/settings.json, "stops_open_at_start": how many stops are open before any is won
	s.unlocked = Math.max(s.unlocked || 0, Math.min(LEVELS.length, CONTENT.settings.stopsOpen) - 1);
	s.met = s.met || {};
	s.fresh = s.fresh || {}; // "new" dots still showing, until the player looks (markNew in src/game/26-stages.js)   // seals stamped and most omens braved, by stop id
	s.streak = s.streak || 0;
	s.thickCracked = s.thickCracked || 0;
	s.goldEarned = s.goldEarned || 0;
	s.lapisEarned = s.lapisEarned || 0;
	// older saves bought Second wind and Scarab cache as permanent upgrades; they
	// are now one-time goods, so refund them generously in kind
	if (s.upg.wind) {
		s.charges.wind = (s.charges.wind || 0) + 3;
		delete s.upg.wind;
	}
	if (s.upg.cache) {
		s.boons.push('flood', 'wisdom');
		delete s.upg.cache;
	}
	if (s.boardSize && !s.board) s.board = s.boardSize === 10 ? 'grand' : 'classic';
	if (!boardMode(s.board)) s.board = 'classic';
	remapStops(s);
	return s;
}

// Stars, failures and the furthest stop reached are stored by position in the
// journey. Stops are content files that can be added anywhere, so the save
// also keeps the order of stop ids it was made with; if the journey has
// changed since, everything is moved to follow its stop. Saves from before
// there were stop ids were made on the original twelve.
const ORIGINAL_STOPS = [
	'memphis',
	'saqqara',
	'giza',
	'faiyum',
	'amarna',
	'abydos',
	'karnak',
	'deir-el-bahari',
	'valley-of-the-kings',
	'philae',
	'abu-simbel',
	'alexandria',
];

function remapStops(s) {
	const now = LEVELS.map(L => L.id),
		was = Array.isArray(s.stopIds) ? s.stopIds : ORIGINAL_STOPS;
	if (was.join() !== now.join()) {
		const from = now.map(id => was.indexOf(id)); // old position of each stop, or -1 if new
		const stars = now.map((id, j) => (from[j] >= 0 ? s.stars[from[j]] || 0 : 0));
		const fails = {};
		now.forEach((id, j) => {
			if (from[j] >= 0 && s.fails[from[j]]) fails[j] = s.fails[from[j]];
		});
		// open every stop up to the furthest one that was open before
		let unlocked = 0;
		now.forEach((id, j) => {
			if (from[j] >= 0 && from[j] <= (s.unlocked || 0)) unlocked = j;
		});
		const cur = now.indexOf(was[s.current || 0]);
		if (s.lastWin && s.lastWin.stop == null && was[s.lastWin.idx]) s.lastWin.stop = was[s.lastWin.idx];
		if (s.lastWin && s.lastWin.stop) s.lastWin.idx = now.indexOf(s.lastWin.stop);
		s.stars = stars;
		s.fails = fails;
		s.unlocked = unlocked;
		s.current = cur >= 0 ? cur : Math.min(s.current || 0, unlocked);
	}
	s.stopIds = now;
}

try {
	const s = JSON.parse(localStorage.getItem(SAVE_KEY));
	if (s && typeof s === 'object') save = Object.assign(save, s);
} catch (e) {}
applySaveDefaults(save);
if (TRY) {
	save.seenHelp = true;
	save.unlocked = LEVELS.length - 1;
	LEVELS.forEach((L, i) => {
		if (!save.stars[i]) save.stars[i] = 1;
	}); // one star each, so omens can be tried
	[
		['skins', CONTENT.skins],
		['floors', CONTENT.floorSets],
		['frames', CONTENT.frames],
		['sparkles', CONTENT.sparkles],
	].forEach(([k, list]) =>
		list.forEach(o => {
			save[k][o.id] = 1;
		})
	);
	save.gold = Math.max(save.gold || 0, 99999);
	save.lapis = Math.max(save.lapis || 0, 9999);
	if (!save.boons.length) save.boons = Object.keys(BOONS);
	const at = LEVELS.findIndex(L => L.id === TRY_ID);
	if (at >= 0) save.current = at;
}

function persist() {
	try {
		localStorage.setItem(SAVE_KEY, JSON.stringify(save));
	} catch (e) {}
}

// ---------- pictures ----------
// Every picture in the game is a file in images/, and the build puts them all
// here (see images/README.md): amulets/, specials/ and badges/ by name,
// backdrops/ and boards/ by stop id, floors/ by floor set id, relics/ by relic
// id. SVG files arrive as text and become data: addresses here, which keeps
// the game file a third smaller than base64 would.
const PICTURES = (() => {
	const all = Object.assign(
		{ amulets: {}, specials: {}, badges: {}, backdrops: {}, boards: {}, floors: {}, relics: {} },
		/*IMAGES*/null || {}
	);
	const url = v =>
		typeof v === 'string'
			? v.startsWith('<')
				? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(v)
				: v
			: Array.isArray(v)
				? v.map(url)
				: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, url(x)]));
	return url(all);
})();
