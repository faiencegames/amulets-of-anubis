/* =============================================================================
 * 05-state.js: the stop being played: its state, starting it and the
 * display around the board.
 *
 * What's here:
 *   core                the game of the stop now on the board (a Core,
 *                       01-core.js)
 *   busy, selected, trial, armed, particles, popups ...
 *                       what is going on: an animation running, the chosen
 *                       amulet, the trial, a boon ready to use, the effects
 *   startLevel(i)       starts stop i: builds its board with stopOptions(),
 *                       sets the scenery, the music and the trial. Called
 *                       from the map, a win, a loss, a new journey, the boot.
 *   setBoard(), paintBoardFrame(), setBackdrop()
 *                       the board's size, its frame, the scenery behind it
 *   rowsForScreen(), omegaSize()
 *                       how many rows fit (a taller board on a phone)
 *   updateHUD()         the top bar, the gilding tube and the column beside
 *                       the board; call it after anything they show changes
 *   fitNote()           the stop's note beside the board, cut to whole lines
 *                       with "Read on"
 *   settle(), delay()   wait for the board to stop moving, or for a time
 *
 * Changes in the save: current (the stop being played), curse (used up),
 * omenPick.
 * ===========================================================================*/

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
// the stop (or tomb, or river puzzle) is over, won or lost: no more moves or
// boons on its board, and its rewards are paid once (levelWon, levelLost)
let stopOver = false;
let dying = [],
	particles = [],
	popups = [],
	beams = [],
	rings = [],
	flashes = new Map(),
	hint = null,
	idleTimer = 0,
	animTime = 0;
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
	const empty = col => {
		for (let row = 0; row < ROWS; row++) if (core.mask[row * COLS + col]) return false;
		return true;
	};
	let first = -1,
		last = -1;
	for (let col = 0; col < COLS; col++)
		if (!empty(col)) {
			if (first < 0) first = col;
			last = col;
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
			0,
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
	stopOver = false;
	tubeWas = -1; // no sand for the new floor
	$('boardEnd').hidden = true;
	if (document.body.classList.contains('in-chamber')) {
		document.body.classList.remove('in-chamber');
		music.inside = false;
		musicVolume();
	}
	scaledTiles.clear(); // drop the previous level's pre-scaled sprites (their canvases are about to be replaced)
	levelIdx = i;
	save.current = i;
	persist();
	const stop = LEVELS[i],
		th = THEMES[i];
	// a stop that lists several amulet sets plays a different one each start
	if (stop.sets) {
		const pick = stop.sets[Math.floor(Math.random() * stop.sets.length)];
		stop.set = th.set = pick;
		stop.types = pick.length;
	}
	TILE_NAMES = th.set.slice();
	TILE_SPRITES = th.set.map(n => skinned(AMULET_PICS[n], n, save.skin));
	TILE_SPRITES[6] = skinned(AMULET_PICS.sun, 'sun', save.skin);
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
	const Lp =
		mode.maxTypes && stop.types > mode.maxTypes
			? Object.assign({}, stop, { types: mode.maxTypes })
			: stop;
	if (Lp !== stop) {
		TILE_NAMES = th.set.slice(0, Lp.types);
		TILE_SPRITES = TILE_NAMES.map(n => skinned(AMULET_PICS[n], n, save.skin));
		TILE_SPRITES[6] = skinned(AMULET_PICS.sun, 'sun', save.skin);
	}
	const curse = save.curse || null;
	save.curse = null;
	// omens chosen on the stop scroll apply to this stop (and its restarts) only,
	// and only once it has been gilded
	if (save.omenPick && save.omenPick.stop !== stop.id) save.omenPick = null;
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
			level: stop,
			idx: i,
			mode,
			cols: COLS,
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
		}),
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
		if (h.effect.board) h.effect.board(core, h.n, h);
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
	core.cells.forEach((tile, sq) => {
		if (!tile) return;
		tile.x = sq % COLS;
		tile.y = ((sq / COLS) | 0) - ROWS - 1 - (sq % COLS) * 0.35 - Math.random() * 0.2;
		tile.vy = 0;
	});
	$('placeName').textContent = stop.name;
	$('placeSub').textContent = stop.sub;
	$('placeFact').textContent = stop.fact;
	$('stripPlace').innerHTML = `${stop.name}<span class="strip-shape"> \u2014 ${shapeLabel()}</span>`;
	$('placeSub').textContent =
		stop.sub + (core.shapeName && core.shapeId !== 'own' ? ` \u00b7 ${core.shapeName}` : '');
	renderCurse();
	requestAnimationFrame(fitNote);
	const hasThick = stop.map.some(r => [...r].some(ch => planStone(ch) === 2));
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
				x: COLS / 2,
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
				x: COLS / 2,
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

let tubeWas = 0; // how many stones were gilded at the last update (the sand)

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
if (window.ResizeObserver)
	new ResizeObserver(() => fitNote()).observe(document.querySelector('.side .tablet'));
window.addEventListener('resize', () => fitNote());

$('placeMore').onclick = () => {
	if (busy) return;
	const text = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
	showMsg(
		html`
			<h2 id="msgTitle">${text($('placeName').textContent)}</h2>
			<p class="lede">${text($('placeSub').textContent)}</p>
			<p class="fact">${text($('placeFact').textContent)}</p>`,
		[[Tplain('place.back'), () => {}, { kind: 'exit' }]],
	);
};

// Sand for the stones a move gilded: on a desktop, a grain for each falls
// down the tube onto the heap; on a phone, where the plaque fills with sand
// from the left, grains blow off its edge. A bigger move pours more sand.
function pourSand(stones, full) {
	if (reduceMotion || lowFx) return;
	const tube = $('tubeBody'),
		plaque = $('stripPlaque'),
		inTube = tube.offsetHeight > 0,
		box = inTube ? tube : plaque;
	if (!box.animate || !box.offsetHeight) return;
	const n = Math.max(3, Math.min(inTube ? 30 : 14, stones * (inTube ? 2 : 1))),
		h = box.clientHeight,
		w = box.clientWidth,
		cols = inTube
			? ['#f6d676', '#fff2b8', '#e8b93e', '#fbe3a0']
			: ['#c8902c', '#a8701c', '#e8b93e', '#8a5a14'];
	for (let i = 0; i < n; i++) {
		const grain = document.createElement('i'),
			size = 2.5 + Math.random() * 2.5;
		grain.className = 'grain';
		grain.style.cssText = `width:${size}px;height:${size}px;background:${cols[i % 4]}`;
		box.appendChild(grain);
		let path;
		if (inTube) {
			// from the top, somewhere near the middle, down to the heap
			const x = w * (0.35 + Math.random() * 0.3),
				land = h * (1 - full / 100) - 2;
			path = [
				{ transform: `translate(${x}px, -4px)` },
				{ transform: `translate(${x + (Math.random() - 0.5) * 8}px, ${land}px)` },
			];
		} else {
			// from the edge of the sand, a little way on with the wind, and down
			const x = (w * full) / 100,
				y = h * (0.15 + Math.random() * 0.7);
			path = [
				{ transform: `translate(${x - 3}px, ${y}px)`, opacity: 1 },
				{
					transform: `translate(${x + 8 + Math.random() * 22}px, ${y + 2 + Math.random() * 6}px)`,
					opacity: 0,
				},
			];
		}
		const a = grain.animate(path, {
			duration: 380 + Math.random() * 300,
			delay: Math.random() * (inTube ? 520 : 400),
			easing: inTube ? 'cubic-bezier(.5,0,1,1)' : 'ease-out',
			fill: 'both',
		});
		a.onfinish = () => grain.remove();
	}
}

function updateHUD() {
	$('movesNum').textContent = core.movesLeft;
	$('gMoves').classList.toggle('low', core.movesLeft <= 5 && core.movesLeft > 0);
	const done = core.total - core.remaining();
	$('gildTxt').textContent = `${done} / ${core.total}`;
	const full = core.total ? (done / core.total) * 100 : 100;
	if (done > tubeWas && tubeWas >= 0) pourSand(done - tubeWas, full);
	tubeWas = done;
	// the tube beside the board; on a phone, the plaque under the top bar
	$('tubeFill').style.height = full + '%';
	$('stripPlaque').style.setProperty('--gild', full + '%');
	// the stop's name over the river of stops (in a chamber, the stop it is
	// beside; on the river, "On the river"; the river of beads still shows where
	// the journey has got to)
	$('stopTxt').textContent = eventState
		? eventState.ev.chamber
			? LEVELS[eventState.ev.at].name
			: Tplain('event.kicker')
		: core.level.name;
	$('stopRiver').innerHTML = $('stripRiver').innerHTML = journeyRiver(levelIdx); // top bar; phone plaque
	$('goldTxt').textContent = save.gold.toLocaleString();
	$('lapisTxt').textContent = save.lapis.toLocaleString();
	const found = Object.keys(save.relics || {}).length;
	$('relicBar').innerHTML = gildBar(found, RELICS.length);
	if ($('starTxt'))
		$('starTxt').innerHTML =
			`${save.stars.reduce((a, b) => a + (b || 0), 0)} <span class="star-mark">\u2605</span>`;
	// The relic strip is 20-odd SVGs; rebuilding it on every HUD update (several
	// times a move) cost several ms of style and layout each time. Only redraw it
	// when the set of relics found changes.
	const strip = $('relicStrip'),
		stripKey = RELICS.map(r => (save.relics[r.id] ? 1 : 0)).join('') + '|' + save.floor + '|' + levelIdx;
	const sq = museumSquares();
	if (strip && sq && strip.dataset.k !== stripKey) {
		strip.dataset.k = stripKey;
		// the newest found first, so the row shows what was found lately; the
		// rest wait, greyed. Each stands on a square of the floor, gilded once
		// found, as in the Museum. (save.relics holds when each was found.)
		strip.innerHTML = [
			...RELICS.filter(r => save.relics[r.id]).sort((a, b) => save.relics[b.id] - save.relics[a.id]),
			...RELICS.filter(r => !save.relics[r.id]),
		]
			.map(
				r =>
					html`
						<span class="relic-slot${save.relics[r.id] ? ' has' : ''}" style="background-image:url(${save.relics[r.id] ? sq.gilded : sq.bare})" title="${save.relics[r.id] ? r.name + ': ' + r.desc : Tplain('museum.unknown')}">
							${relicIcon(r.id)}
						</span>`,
			)
			.join('');
	}
	$('scoreTxt').textContent = core.score.toLocaleString();
	musicFollow();
	if (eventState) renderTrial();
	$('diffTxt').textContent = DIFFICULTY[save.difficulty].label;
	$('diffTxt').onclick = () => {
		sfx('ui');
		openDifficulty();
	};
	renderTrial();
}
