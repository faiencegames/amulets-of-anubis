// ---------- game state ----------
let core = null,
	levelIdx = 0,
	busy = false,
	selected = -1,
	cursor = -1,
	showCursor = false;
let trial = null,
	armed = -1,
	trialMoves = 0;
let dying = [],
	particles = [],
	popups = [],
	beams = [],
	rings = [],
	flashes = new Map(),
	hint = null,
	idleTimer = 0,
	time = 0;
let waiters = [],
	orbs = [];
const settle = () => new Promise(res => waiters.push(res));
const delay = ms => new Promise(res => setTimeout(res, ms));

// How many rows to use: a square board unless "fill the screen" is on and the
// space left for the board is clearly taller than it is wide (portrait phones).
// the move-budget settings a board mode carries, passed straight to Core
// Omega: as many squares as fit at a comfortable size
function omegaSize() {
	const pf = document.querySelector('.playfield');
	if (!pf) return { cols: 12, rows: 12 };
	const frame = document.querySelector('.board-frame'),
		st = getComputedStyle(frame);
	const side = parseFloat(st.paddingLeft) * 2 + parseFloat(st.borderLeftWidth) * 2;
	const tube = $('tube').getBoundingClientRect().width,
		gap = tube ? parseFloat(getComputedStyle(pf).gap) || 0 : 0;
	const w = pf.clientWidth - tube - gap - side,
		h = pf.clientHeight - frameChrome();
	const cell = window.innerWidth > 860 ? 44 : 38;
	return {
		cols: Math.max(8, Math.min(30, Math.floor(w / cell))),
		rows: Math.max(8, Math.min(22, Math.floor(h / cell))),
	};
}

// columns that are all water between two banks
function riverCols() {
	if (!core) return [];
	const empty = c => {
		for (let r = 0; r < ROWS; r++) if (core.mask[r * N + c]) return false;
		return true;
	};
	let first = -1,
		last = -1;
	for (let c = 0; c < N; c++)
		if (!empty(c)) {
			if (first < 0) first = c;
			last = c;
		}
	const out = [];
	for (let c = first + 1; c < last; c++) if (empty(c)) out.push(c);
	return out;
}

function frameChrome() {
	const frame = document.querySelector('.board-frame');
	if (!frame) return 0;
	const st = getComputedStyle(frame);
	return (
		parseFloat(st.paddingTop) * 2 +
		parseFloat(st.borderTopWidth) * 2 +
		[...frame.querySelectorAll('.band')].reduce(
			(a, b) =>
				a +
				b.getBoundingClientRect().height +
				parseFloat(getComputedStyle(b).marginTop) +
				parseFloat(getComputedStyle(b).marginBottom),
			0
		)
	);
}

// How many rows to use: square unless "fill the screen" is on and the space is
// clearly taller than wide. Rounds DOWN, so the board is limited by the width
// of the screen and runs edge to edge; any spare height is split above and below.
function rowsForScreen(cols) {
	if (save.fill === false) return cols;
	const pf = document.querySelector('.playfield');
	if (!pf || !pf.clientHeight) return cols;
	const frame = document.querySelector('.board-frame'),
		st = getComputedStyle(frame);
	const side = parseFloat(st.paddingLeft) * 2 + parseFloat(st.borderLeftWidth) * 2;
	const tube = $('tube').getBoundingClientRect().width,
		gap = tube ? parseFloat(getComputedStyle(pf).gap) || 0 : 0;
	const w = pf.clientWidth - tube - gap - side,
		h = pf.clientHeight - frameChrome();
	if (w <= 0 || h <= 0) return cols;
	return Math.max(cols, Math.min(cols + 7, Math.floor((cols * h) / w)));
}

function startLevel(i) {
	eventState = null;
	if (document.body.classList.contains('in-chamber')) {
		document.body.classList.remove('in-chamber');
		music.inside = false;
		musicVolume();
	}
	scaledTiles.clear(); // drop the previous level's pre-scaled sprites (their canvases are about to be replaced)
	levelIdx = i;
	save.current = i;
	persist();
	const L = LEVELS[i],
		th = THEMES[i];
	// a stop that lists several amulet sets plays a different one each start
	if (L.sets) {
		const pick = L.sets[Math.floor(Math.random() * L.sets.length)];
		L.set = th.set = pick;
		L.types = pick.length;
	}
	TILE_NAMES = th.set.slice();
	TILE_SPRITES = th.set.map(n => skinned(SPR[n], n, save.skin));
	TILE_SPRITES[6] = skinned(SPR.sun, 'sun', save.skin);
	buildFloors(i);
	setBackdrop(i);
	setBoard(i);
	prewarmKS();
	prewarmBells();
	// leaving a stop with a trial still open counts as failing it
	if (trial && !trial.done && !trial.failed) failTrial(true);
	const mode = boardMode(save.board);
	document.body.classList.toggle('omega', mode.id === 'omega');
	if (mode.dynamic) {
		const sz = omegaSize();
		setBoardSize(sz.cols, sz.rows);
	} else setBoardSize(mode.n, rowsForScreen(mode.n));
	const shape =
		mode.id === 'ruins'
			? { id: 'ruins', name: T('shapes.ruins'), map: null, ease: 1 }
			: mode.id === 'omega'
				? { id: 'omega', name: T('shapes.two_banks'), map: null, ease: 1 }
				: pickShape(i);
	// very large floors play with at most five amulet types
	const Lp = mode.maxTypes && L.types > mode.maxTypes ? Object.assign({}, L, { types: mode.maxTypes }) : L;
	if (Lp !== L) {
		TILE_NAMES = th.set.slice(0, Lp.types);
		TILE_SPRITES = TILE_NAMES.map(n => skinned(SPR[n], n, save.skin));
		TILE_SPRITES[6] = skinned(SPR.sun, 'sun', save.skin);
	}
	const curse = save.curse || null;
	save.curse = null;
	// omens chosen on the stop scroll apply to this stop (and its restarts) only,
	// and only once it has been gilded
	if (save.omenPick && save.omenPick.stop !== L.id) save.omenPick = null;
	const omens =
		save.omenPick && (save.stars[i] || 0) > 0
			? save.omenPick.list.filter(id => OMENS.some(o => o.id === id))
			: [];
	persist();
	const persistMoves = persistenceMoves(save.fails[i]);
	// the board itself is built as the simulators build it (stopOptions in 01-core.js)
	core = new Core(
		Lp,
		stopOptions({
			level: L,
			idx: i,
			mode,
			cols: N,
			rows: ROWS,
			shape,
			variant: Math.floor(Math.random() * 5),
			difficulty: save.difficulty,
			upg: save.upg,
			fails: save.fails[i],
			omens,
			curse,
			badgesOn: stageOn('badges'),
			cursesOn: stageOn('curses'),
		})
	);
	core.shapeName =
		mode.id === 'omega'
			? riverCols().length
				? Tplain('shapes.two_banks')
				: Tplain('shapes.great_ruin')
			: shape.name;
	core.shapeId = shape.id;
	core.curse = curse;
	core.persistMoves = persistMoves;
	core.boonUsed = false;
	core.stallBought = {};
	core.omens = omens;
	core.stat = { suns: 0, cascade: 0, specials: 0 };
	core.fill();
	// the omens braved and a curse carried, where they change the board (HARDSHIPS in 01-core.js)
	hardshipsAt(omens, curse).forEach(h => {
		if (h.effect.board) h.effect.board(core, h.n);
	});
	dying = [];
	particles = [];
	popups = [];
	beams = [];
	rings = [];
	orbs = [];
	flashes.clear();
	hint = null;
	selected = -1;
	core.cells.forEach((t, k) => {
		if (!t) return;
		t.x = k % N;
		t.y = ((k / N) | 0) - ROWS - 1 - (k % N) * 0.35 - Math.random() * 0.2;
		t.vy = 0;
	});
	$('placeName').textContent = L.name;
	$('placeSub').textContent = L.sub;
	$('placeFact').textContent = L.fact;
	$('stripPlace').textContent = `${L.name} \u2014 ${shapeLabel()}`;
	$('placeSub').textContent =
		L.sub + (core.shapeName && core.shapeId !== 'own' ? ` \u00b7 ${core.shapeName}` : '');
	renderCurse();
	requestAnimationFrame(fitNote);
	const hasThick = L.map.some(r => r.includes('2'));
	$('legend').innerHTML =
		'<span><i class="sw-stone"></i>Bare stone</span>' +
		(hasThick ? '<span><i class="sw-thick"></i>Thick stone, match twice</span>' : '') +
		'<span><i class="sw-gold"></i>Gilded</span>';
	updateHUD();
	trial = null;
	armed = -1;
	trialMoves = 0;
	renderTrial();
	renderBoons();
	meetStages();
	fit();
	musicStopBegins();
	musicFollow();
	busy = true;
	settle().then(() => {
		busy = false;
		idleTimer = 0;
		if (core.curse) {
			popups.push({
				text: core.curse.name,
				x: N / 2,
				y: ROWS / 2 - 0.4,
				life: 2.4,
				size: 0.52,
				col: '#ffb0a0',
			});
			sfx('lose');
		}
		if (core.persistMoves) {
			popups.push({
				text: Tplain('popup.persistence_n_moves', { n: core.persistMoves }),
				x: N / 2,
				y: ROWS / 2 + (core.curse ? 0.5 : 0),
				life: 2.4,
				size: 0.5,
				col: '#bfe8ff',
			});
		}
		// never on the very first start (the help is showing), nor over any open scroll
		if (
			save.seenHelp &&
			!anyOverlayOpen() &&
			stageOn('trials') &&
			Math.random() < CONTENT.settings.trialChance + upgradeTotal('trial_chance', save.upg)
		)
			offerTrial();
		warmPreviews();
	});
}

// A picture that fills its box and is cropped to it, for the board backing
// and the scenery (images/boards/, images/backdrops/)
function coverImg(src) {
	return src
		? `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`
		: '';
}

function setBoard(i) {
	document.getElementById('boardBg').innerHTML = coverImg(PICTURES.boards[LEVELS[i].id]);
	paintBoardFrame(BOARDS[i]);
}

// the carved frame round the floor: the chosen frame set the colours, or the
// stop's own stone when the player has not earned one yet
function paintBoardFrame(B) {
	const fr = document.querySelector('.board-frame');
	if (!fr) return;
	const f = frameById(save.frame),
		col = f.frame || B.frame;
	fr.style.setProperty('--fa', col[0]);
	fr.style.setProperty('--fb', col[1]);
	fr.style.setProperty('--fe', col[2]);
}

let bdFront = 0;
// the scenery of stop i, or of a chamber when `key` names its own picture
function setBackdrop(i, key = LEVELS[i].id) {
	const layers = document.querySelectorAll('#backdrop .bd');
	if (!layers.length) return;
	const cur = layers[bdFront],
		nxt = layers[1 - bdFront];
	if (cur.dataset.i === key) return;
	nxt.innerHTML = coverImg(PICTURES.backdrops[key]);
	nxt.dataset.i = key;
	nxt.classList.add('on');
	cur.classList.remove('on');
	bdFront = 1 - bdFront;
}

let tubeWas = 0,
	tubeTimer = 0; // how full the sand tube was, and when its stream stops

// The note beside the board shows as many whole lines as fit, without a
// scroll bar; when the rest won't fit, it ends in "Read on", which opens the
// whole note in a scroll. Measured again whenever the panel below it changes
// size (a boon won, a trial begun) and when the window does.
function fitNote() {
	const sheet = $('infoSheet'),
		fact = $('placeFact'),
		more = $('placeMore');
	if (!sheet || !sheet.offsetParent) return;
	fact.style.maxHeight = '';
	more.hidden = true;
	sheet.classList.remove('clipped');
	if (sheet.scrollHeight <= sheet.clientHeight + 1) return;
	sheet.classList.add('clipped'); // first the key to the stones below the note goes
	if (sheet.scrollHeight <= sheet.clientHeight + 1) return;
	more.hidden = false;
	const lh = parseFloat(getComputedStyle(fact).lineHeight) || 24,
		over = sheet.scrollHeight - sheet.clientHeight;
	fact.style.maxHeight = Math.max(2, Math.floor((fact.offsetHeight - over) / lh)) * lh + 'px';
}
if (window.ResizeObserver) new ResizeObserver(() => fitNote()).observe(document.querySelector('.side .tablet'));
window.addEventListener('resize', () => fitNote());

$('placeMore').onclick = () => {
	if (busy) return;
	const text = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
	showMsg(
		`<h2 id="msgTitle">${text($('placeName').textContent)}</h2><p class="lede">${text($('placeSub').textContent)}</p><p class="fact">${text($('placeFact').textContent)}</p>`,
		[[Tplain('place.back'), () => {}]]
	);
};

function updateHUD() {
	$('movesNum').textContent = core.movesLeft;
	$('gMoves').classList.toggle('low', core.movesLeft <= 5 && core.movesLeft > 0);
	const done = core.total - core.remaining();
	$('gildTxt').textContent = `${done} / ${core.total}`;
	const full = core.total ? (done / core.total) * 100 : 100;
	// sand runs into the tube while it rises (a stream of grains, for a moment)
	if (full > tubeWas) {
		$('tube').classList.add('filling');
		clearTimeout(tubeTimer);
		tubeTimer = setTimeout(() => $('tube').classList.remove('filling'), 900);
	}
	tubeWas = full;
	$('tubeFill').style.height = full + '%';
	$('hudProgFill').style.width = (core.total ? (done / core.total) * 100 : 100) + '%';
	$('stopTxt').textContent = eventState
		? eventState.ev.chamber
			? Tplain(placeKey(eventState.ev, 'hud'))
			: 'event'
		: `${levelIdx + 1}/${LEVELS.length}`;
	$('goldTxt').textContent = save.gold.toLocaleString();
	$('lapisTxt').textContent = save.lapis.toLocaleString();
	const found = Object.keys(save.relics || {}).length;
	$('relicTxt').textContent = `${found}/${RELICS.length}`;
	if ($('relicTxt2')) $('relicTxt2').textContent = `${found} / ${RELICS.length}`;
	if ($('starTxt'))
		$('starTxt').textContent = `${save.stars.reduce((a, b) => a + (b || 0), 0)} / ${LEVELS.length * 3}`;
	// The relic strip is 20-odd SVGs; rebuilding it on every HUD update (several
	// times a move) cost several ms of style and layout each time. Only redraw it
	// when the set of relics found changes.
	const strip = $('relicStrip'),
		stripKey = RELICS.map(r => (save.relics[r.id] ? 1 : 0)).join('');
	if (strip && strip.dataset.k !== stripKey) {
		strip.dataset.k = stripKey;
		// found ones first, so the row shows them; the rest wait, greyed
		strip.innerHTML = [...RELICS.filter(r => save.relics[r.id]), ...RELICS.filter(r => !save.relics[r.id])].map(
			r =>
				`<span class="relic-slot${save.relics[r.id] ? ' has' : ''}" title="${save.relics[r.id] ? r.name + ': ' + r.desc : 'Undiscovered relic'}">${relicIcon(r.id)}</span>`
		).join('');
	}
	$('scoreTxt').textContent = core.score.toLocaleString();
	musicFollow();
	if (eventState) renderTrial();
	$('diffTxt').textContent = DIFFICULTY[save.difficulty].name;
	$('diffTxt').onclick = () => {
		sfx('ui');
		openDifficulty();
	};
	renderTrial();
}
