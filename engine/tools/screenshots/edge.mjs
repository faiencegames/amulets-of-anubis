// Edge cases: plays the built game down the awkward paths a player finds by
// accident (losing and leaving the scroll another way, winning and coming
// back, tapping during an animation, turning the phone, a broken save) and
// reports every dead end: no scroll open and a board that can't be played,
// or a scroll you can't get out of. Also any page error.
//
//	node tools/screenshots/edge.mjs            every case
//	node tools/screenshots/edge.mjs lose win   just those (names below)
//
// It plays a copy of the game (dist/edge/game.html) with a small window onto
// the board added (window.__edge), so it can run the moves out or gild the
// floor at once. The game itself is never changed. Build first.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { GAME as ROOT, GAME_FILE, EDITION, content, words } from '../where.mjs';

const WORK = path.join(ROOT, 'dist', 'edge');
const SAVE_KEY = EDITION.saveKey;

// Runs inside the game's own function, so it can see core, busy and the rest.
const HOOK = `
window.__edge = {
	state: () => ({
		busy, moves: core.movesLeft, won: core.won(), gold: save.gold, lapis: save.lapis, stars: save.stars[levelIdx] || 0,
		open: [...document.querySelectorAll('.overlay.open')].map(o => o.id),
		title: (document.querySelector('.overlay.open #msgTitle') || {}).textContent || '',
		closable: !!document.querySelector('.overlay.open .close-x') && getComputedStyle(document.querySelector('.overlay.open .close-x')).display !== 'none',
		event: !!eventState,
		over: stopOver,
	}),
	// the next move is the last one
	lastMove() { core.movesLeft = 1; updateHUD(); },
	// all the floor gilded but one stone, which the next move will very likely gild
	almostWon() {
		const bare = [];
		for (let sq = 0; sq < COLS * ROWS; sq++) if (core.mask[sq]) { core.floor[sq] = 0; bare.push(sq); }
		bgDirty = true; updateHUD();
	},
	// every effect at once, for comparing how the board draws them
	fx() {
		beams.push({ dir: 'h', idx: 2, life: 0.8 }, { dir: 'v', idx: 4, life: 0.8 }, { dir: 'd1', c: 3, r: 5, life: 0.8 });
		rings.push({ x: 2, y: 7, life: 0.6, big: false }, { x: 5, y: 8, life: 0.5, big: true });
		orbs.push({ from: 0, to: COLS * 6 + 5, t: 0.5, dur: 9 });
		flashes.set(COLS + 1, 0.9);
		popups.push({ text: '+120', x: 3, y: 3, life: 2, size: 0.6 });
		burst(5, 3, 1);
		selected = COLS * 4 + 2;
	},
	// a lighter game, for measuring a light mode: 1 fewer effects (lowFx, as a
	// slow device gets), 2 also no scenery behind the board
	light(level) {
		if (level >= 1) { lowFx = true; fit(); }
		if (level >= 2) {
			const st = document.createElement('style');
			st.textContent = '#backdrop { display: none !important; } body { background: #2a1d10 !important; }';
			document.head.appendChild(st);
		}
		return lowFx;
	},
	// a legal swap, as two points on the page
	// the Menu's "New journey…" scroll
	newJourney() { openNewJourney(); },
	move() {
		const m = core.allMoves()[0];
		if (!m) return null;
		const r = canvas.getBoundingClientRect(), at = sq => ({ x: r.left + ((sq % COLS) + 0.5) * squareSize, y: r.top + (((sq / COLS) | 0) + 0.5) * squareSize });
		return [at(m[0]), at(m[1])];
	},
};
`;

function makeCopy() {
	const html = fs.readFileSync(GAME_FILE, 'utf-8');
	const end = '\n})();\n</script>\n</body>';
	const i = html.lastIndexOf(end);
	if (i < 0) throw new Error('Could not find the end of the game function in the built file. Has web/shell.html changed?');
	fs.mkdirSync(WORK, { recursive: true });
	const file = path.join(WORK, 'game.html');
	fs.writeFileSync(file, html.slice(0, i) + HOOK + html.slice(i));
	return 'file://' + file;
}

// The game's own ids and words, from its content: the first chamber is
// explored in the save below (which is at the third stop, or the one before
// the last in a shorter journey), TOMB is the first dark one not yet explored,
// PUZZLE the first river puzzle. The buttons are found by their words.
const { stops, chambers = [], events, boons, relics } = content();
const LAST = stops.length - 1;
const upTo = n => Math.min(n, LAST);
const TOMB = (chambers.find((c, i) => i > 0 && c.torch) || chambers[0] || {}).id;
const PUZZLE = (events.find(e => e.kind === 'puzzle') || {}).id;
const MAP = words('win.map'), LOST = words('lose.title'), BEGIN = words('event.begin'), ENTER = words('chamber.enter'), SAVES = words('menu.saves');
const SAVE = {
	unlocked: upTo(8), current: Math.min(2, Math.max(0, LAST - 1)), difficulty: 1, board: 'classic', seenHelp: true, staged: 'all', journeys: 1, sound: false, music: false,
	stars: stops.map((stop, i) => [3, 2, 1, 2, 2, 1, 2][i] || 0), gold: 1240, lapis: 86, boons: boons.slice(0, 2).map(b => b.id),
	relics: Object.fromEntries(relics.slice(0, 1).map(r => [r.id, 1])),
	chambers: Object.fromEntries(chambers.slice(0, 1).map(c => [c.id, 1])), chamberWins: Object.fromEntries(chambers.slice(0, 1).map(c => [c.id, 1])),
};
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const DESKTOP = { viewport: { width: 1280, height: 800 } };

let browser, GAME;
const found = [];
function report(name, what) {
	found.push(`${name}: ${what}`);
	console.log(`  ! ${what}`);
}

async function open(device = PHONE, save = SAVE, { hash = '', before } = {}) {
	const page = await browser.newPage({ ...device, reducedMotion: 'reduce' });
	page.errors = [];
	page.on('pageerror', e => page.errors.push(String(e)));
	if (before) await page.addInitScript(before);
	if (save) await page.addInitScript(([k, s]) => { try { if (!sessionStorage.getItem('edge')) { localStorage.setItem(k, s); sessionStorage.setItem('edge', '1'); } } catch (e) {} }, [SAVE_KEY, JSON.stringify(save)]);
	await page.goto(GAME + hash);
	await page.waitForTimeout(1200);
	return page;
}
async function toBoard(page) {
	await page.click('#ovTitle [data-t="continue"]').catch(() => {});
	await page.waitForTimeout(600);
	for (let i = 0; i < 3 && (await page.$('.overlay.open')); i++) {
		await page.keyboard.press('Escape');
		await page.waitForTimeout(300);
	}
}
const state = page => page.evaluate(() => window.__edge.state());
async function swap(page) {
	const m = await page.evaluate(() => window.__edge.move());
	if (!m) return false;
	await page.mouse.move(m[0].x, m[0].y);
	await page.mouse.down();
	await page.mouse.move(m[1].x, m[1].y, { steps: 4 });
	await page.mouse.up();
	return true;
}
async function settle(page, ms = 2500) {
	for (let t = 0; t < ms; t += 250) {
		await page.waitForTimeout(250);
		const s = await state(page);
		if (!s.busy && s.open.length) break;
	}
	await page.waitForTimeout(300);
}
// the board is a dead end: nothing open, nothing to play, and no plaque on
// the board (showBoardEnd) with a way on
async function deadEnd(page, name, where) {
	const s = await state(page);
	const plaque = await page.$('#boardEnd:not([hidden]) .act-go');
	if (!s.open.length && !s.busy && (s.moves <= 0 || s.won) && !plaque) report(name, `${where}: a dead board (moves ${s.moves}, won ${s.won}), no scroll to go on from`);
	return s;
}
async function clickText(page, text) {
	const b = page.locator('.overlay.open button', { hasText: text }).first();
	if (!(await b.count())) return false;
	await b.click();
	await page.waitForTimeout(600);
	return true;
}
async function lose(page) {
	await page.evaluate(() => window.__edge.lastMove());
	// a swap made while the floor is still falling into place is ignored: try again
	for (let i = 0; i < 3; i++) {
		await swap(page);
		await settle(page, 5000); // a long cascade can take over three seconds
		const s = await state(page);
		if (s.moves !== 1 || s.open.length) return s; // the move was made
	}
	return state(page);
}
async function win(page) {
	await page.evaluate(() => window.__edge.almostWon());
	await swap(page);
	await settle(page, 4000);
	return state(page);
}

const CASES = {
	// lose, then leave the lose scroll by its map button and close the map
	async lose(name) {
		const page = await open(PHONE);
		await toBoard(page);
		let s = await lose(page);
		if (!s.open.includes('ovMsg')) report(name, `no lose scroll after running out of moves (${JSON.stringify(s)})`);
		if (s.closable) report(name, 'the lose scroll can be closed with × onto a dead board');
		await page.keyboard.press('Escape');
		await page.waitForTimeout(300);
		if (!(await state(page)).open.length) report(name, 'Escape closes the lose scroll onto a dead board');
		await clickText(page, MAP);
		await page.click('.overlay.open .close-x').catch(() => {});
		await page.waitForTimeout(500);
		s = await deadEnd(page, name, `lose → ${MAP} → ×`);
		// the plaque's way on starts the stop again
		if (await page.$('#boardEnd:not([hidden]) .act-go')) {
			await page.click('#boardEnd .act-go');
			await page.waitForTimeout(800);
			s = await state(page);
			if (s.moves <= 0 || s.open.length || !(await page.$('#boardEnd[hidden]'))) report(name, `the plaque's "Try again" left ${JSON.stringify(s)}`);
			await page.waitForTimeout(1500); // the new floor settles
			s = await lose(page);
			// a relic or a new look may be announced first, or a trial offered as
			// the stop starts again (which stops the move): close it, and lose again
			for (let i = 0; i < 4 && s.title !== LOST; i++) {
				if (s.open.length && s.title !== LOST) await page.keyboard.press('Escape');
				await settle(page, 3000);
				s = await state(page);
				if (!s.open.length && s.moves > 0 && !s.over) s = await lose(page);
			}
			if (!s.open.includes('ovMsg')) report(name, `no lose scroll the second time (${JSON.stringify(s)})`);
			await clickText(page, MAP);
			await page.click('.overlay.open .close-x').catch(() => {});
			await page.waitForTimeout(500);
		}
		// what Restart does on a lost board
		if (process.env.EDGE_DEBUG) console.log('  before Restart', JSON.stringify(await state(page)));
		await page.click('#btnRestart').catch(() => {});
		await page.waitForTimeout(600);
		s = await state(page);
		if (s.open.includes('ovMsg') && /again\?|sure/i.test(s.title)) report(name, `Restart on a lost board asks "${s.title}" though there is nothing to keep`);
		await page.close();
		return page.errors;
	},
	// win, leave by the map, come back and play on
	async win(name) {
		const page = await open(PHONE);
		await toBoard(page);
		let s = await win(page);
		if (!s.won) { console.log('  (could not win in one move this time)'); await page.close(); return page.errors; }
		const gold = s.gold;
		await clickText(page, MAP);
		await page.click('.overlay.open .close-x').catch(() => {});
		await page.waitForTimeout(500);
		s = await deadEnd(page, name, `win → ${MAP} → ×`);
		if (await swap(page)) {
			await settle(page, 4000);
			s = await state(page);
			if (s.gold > gold) report(name, `a move on a board already won paid again (+${s.gold - gold} gold)`);
			if (s.open.includes('ovMsg') && /gilded/i.test(s.title)) report(name, 'a move on a board already won shows the win again');
		}
		await page.click('#btnRestart').catch(() => {});
		await page.waitForTimeout(600);
		s = await state(page);
		if (s.open.includes('ovMsg') && /again\?|sure/i.test(s.title)) report(name, `Restart on a won board asks "${s.title}"`);
		await page.close();
		return page.errors;
	},
	// tap the dock in the moment between the last move and the lose scroll
	async race(name) {
		const page = await open(PHONE);
		await toBoard(page);
		await page.evaluate(() => window.__edge.lastMove());
		await swap(page);
		await page.waitForTimeout(150);
		for (const b of ['#btnMap', '#btnMenu', '#btnRestart', '#btnStall']) {
			await page.click(b, { timeout: 500 }).catch(() => {});
			await page.waitForTimeout(120);
		}
		await settle(page, 3000);
		const s = await state(page);
		if (s.open.length > 1) report(name, `two scrolls open at once: ${s.open.join(', ')}`);
		if (s.open.includes('ovMsg') && !/out of moves|lost|sand|try/i.test(s.title) && s.moves <= 0) report(name, `after tapping during the last move, the scroll is "${s.title}", not the lose scroll`);
		await page.keyboard.press('Escape');
		await page.waitForTimeout(400);
		await deadEnd(page, name, 'tapping the dock during the last move, then Escape');
		await page.close();
		return page.errors;
	},
	// a new journey from the Menu: the first stop starts, and can be played
	async journey(name) {
		const page = await open(PHONE);
		await toBoard(page);
		await page.evaluate(() => window.__edge.newJourney());
		await page.waitForTimeout(400);
		await page.click('#njGo');
		// the new journey's scroll takes a moment to roll up on a slow machine
		let s = await state(page);
		for (let t = 0; t < 5000 && s.open.length; t += 250) {
			await page.waitForTimeout(250);
			s = await state(page);
		}
		if (s.open.length) {
			const title = await page.evaluate(() => (document.querySelector('.overlay.open h2, .overlay.open h1') || {}).textContent || '');
			report(name, `a new journey left a scroll open: ${s.open.join(', ')} ("${title.trim()}")`);
		}
		if (s.moves <= 0) report(name, `a new journey's first stop has no moves (${JSON.stringify(s)})`);
		if (!(await swap(page))) report(name, 'a new journey\'s first stop has no move to make');
		await settle(page);
		await deadEnd(page, name, 'the first move of a new journey');
		await page.close();
		return page.errors;
	},
	// "Try again" twice quickly
	async double(name) {
		const page = await open(PHONE);
		await toBoard(page);
		await lose(page);
		const b = page.locator('.overlay.open .act-go').first();
		await b.dblclick().catch(() => {});
		await page.waitForTimeout(1200);
		const s = await state(page);
		if (s.moves <= 0) report(name, 'Try again, tapped twice, left no moves');
		await page.close();
		return page.errors;
	},
	// turn the phone mid-stop, and back
	async rotate(name) {
		const page = await open(PHONE);
		await toBoard(page);
		await swap(page);
		await page.waitForTimeout(400);
		for (const [w, h] of [[844, 390], [390, 844], [360, 780]]) {
			await page.setViewportSize({ width: w, height: h });
			await page.waitForTimeout(700);
			const over = await page.evaluate(() => [document.scrollingElement.scrollWidth - innerWidth, document.scrollingElement.scrollHeight - innerHeight]);
			if (over[0] > 1 || over[1] > 1) report(name, `at ${w}×${h} the page scrolls (${over[0]} px across, ${over[1]} px down)`);
		}
		await page.close();
		return page.errors;
	},
	// a save that can't be read, and storage that refuses to save
	async storage(name) {
		let page = await open(PHONE, null, { before: `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, '{"unlocked": 3, "stars": [1,')` });
		const s1 = await page.evaluate(() => !!document.querySelector('#ovTitle'));
		if (!s1) report(name, 'a broken save stops the game from starting');
		const e1 = page.errors;
		await page.close();
		page = await open(PHONE, null, { before: () => { Storage.prototype.setItem = () => { throw new Error('QuotaExceeded'); }; } });
		await toBoard(page);
		await swap(page);
		await page.waitForTimeout(800);
		const e2 = page.errors;
		await page.close();
		return [...e1, ...e2];
	},
	// a save code that isn't one
	async restore(name) {
		const page = await open(DESKTOP);
		await toBoard(page);
		await page.click('#btnMenu');
		await page.waitForTimeout(500);
		if (!(await clickText(page, SAVES))) { report(name, 'no Save and restore in the Menu'); await page.close(); return page.errors; }
		const ta = page.locator('.overlay.open textarea').last();
		await ta.fill('this is not a save code');
		await page.click('#doImport').catch(() => {});
		await page.waitForTimeout(600);
		const s = await state(page);
		const txt = await page.evaluate(() => document.querySelector('.overlay.open').innerText);
		if (!/not|couldn|can.t|invalid|isn/i.test(txt)) report(name, 'a wrong save code gives no message');
		if (!s.open.length) report(name, 'a wrong save code closes the screen');
		await page.close();
		return page.errors;
	},
	// every scroll opened over another, then Escape all the way back
	async stack(name) {
		const page = await open(DESKTOP);
		await toBoard(page);
		for (const b of ['#btnMap', '#btnMenu', '#btnHelp', '#btnCustomise', '#btnTreasury', '#btnStall']) {
			await page.click(b, { timeout: 800 }).catch(() => {});
			await page.waitForTimeout(250);
		}
		const s = await state(page);
		if (s.open.length > 1) report(name, `scrolls stacked: ${s.open.join(', ')}`);
		for (let i = 0; i < 4; i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
		const s2 = await state(page);
		if (s2.open.length) report(name, `Escape four times leaves ${s2.open.join(', ')} open`);
		await page.close();
		return page.errors;
	},
	// a browser's Back (Android's back swipe in Chrome): closes a scroll, asks on the board
	async browserback(name) {
		const page = await browser.newPage({ ...PHONE, reducedMotion: 'reduce' });
		page.errors = [];
		page.on('pageerror', e => page.errors.push(String(e)));
		await page.addInitScript(([k, s]) => { try { if (!sessionStorage.getItem('edge')) { localStorage.setItem(k, s); sessionStorage.setItem('edge', '1'); } } catch (e) {} }, [SAVE_KEY, JSON.stringify(SAVE)]);
		await page.goto('about:blank');
		await page.goto(GAME);
		await page.waitForTimeout(1200);
		await toBoard(page);
		await page.click('#btnStall');
		await page.waitForTimeout(400);
		await page.goBack({ timeout: 1500 }).catch(() => {});
		await page.waitForTimeout(500);
		let s = await state(page).catch(() => null);
		if (!s) { report(name, 'Back with the stall open left the game'); await page.close(); return page.errors; }
		if (s.open.length) report(name, `Back with the stall open left ${s.open.join(', ')} open`);
		await page.goBack({ timeout: 1500 }).catch(() => {});
		await page.waitForTimeout(500);
		s = await state(page).catch(() => null);
		if (!s) { report(name, 'the first Back on the board left the game'); await page.close(); return page.errors; }
		await page.goBack({ timeout: 1500 }).catch(() => {});
		await page.waitForTimeout(800);
		if (!page.url().startsWith('about:')) report(name, `a second Back on the board did not leave (at ${page.url().slice(-30)})`);
		await page.close();
		return page.errors;
	},
	// reload in the middle of a stop: the game should come back playable
	async reload(name) {
		const page = await open(PHONE);
		await toBoard(page);
		await swap(page);
		await page.waitForTimeout(1500);
		await page.reload();
		await page.waitForTimeout(1500);
		await toBoard(page);
		const s = await state(page);
		if (s.moves <= 0 || s.won) report(name, `after a reload the board can't be played (moves ${s.moves}, won ${s.won})`);
		await page.close();
		return page.errors;
	},
	// Second wind: three more moves instead of losing, then a real loss
	async wind(name) {
		const page = await open(PHONE, { ...SAVE, charges: { wind: 1 } });
		await toBoard(page);
		let s = await lose(page);
		if (s.open.length || s.moves !== 3) report(name, `with a Second wind held, running out gave moves ${s.moves} and ${s.open.join(', ') || 'no scroll'}`);
		for (let i = 0; i < 3; i++) { await swap(page); await settle(page, 1500); }
		await page.waitForTimeout(1500);
		s = await state(page);
		if (s.moves <= 0 && !s.open.length) report(name, `after the Second wind ran out, no lose scroll (${JSON.stringify(s)})`);
		await page.close();
		return page.errors;
	},
	// lose a river puzzle, then try every way off its scroll
	async river(name) {
		const page = await open(PHONE, SAVE, { hash: '#try=' + PUZZLE });
		await page.waitForTimeout(600);
		await clickText(page, BEGIN);
		for (let i = 0; i < 2 && (await page.$('.overlay.open')); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
		let s = await lose(page);
		if (!s.open.includes('ovMsg')) report(name, `no scroll after losing a river puzzle (${JSON.stringify(s)})`);
		await page.keyboard.press('Escape');
		await page.waitForTimeout(400);
		await deadEnd(page, name, 'lose a river puzzle → Escape');
		await page.close();
		return page.errors;
	},
	// win in a tomb: one way on, and no second payment
	async tombwin(name) {
		const page = await open(PHONE, SAVE, { hash: '#try=' + TOMB });
		await page.waitForTimeout(600);
		for (let i = 0; i < 2 && (await page.$('.overlay.open')); i++) {
			if (!(await clickText(page, ENTER))) await page.keyboard.press('Escape');
			await page.waitForTimeout(400);
		}
		let s = await win(page);
		if (!s.won) { console.log('  (could not win in one move this time)'); await page.close(); return page.errors; }
		const gold = s.gold;
		await page.keyboard.press('Escape');
		await page.waitForTimeout(400);
		s = await deadEnd(page, name, 'win in a tomb → Escape');
		if (!s.open.length && (await swap(page))) {
			await settle(page, 3000);
			if ((await state(page)).gold > gold) report(name, 'a move on a tomb already won paid again');
		}
		await page.close();
		return page.errors;
	},
	// Android's Back button (androidBack): closes a scroll, keeps a loss, leaves from the board
	async back(name) {
		const page = await open(PHONE);
		await toBoard(page);
		for (const b of ['#btnStall', '#btnMap', '#btnMenu', '#btnCustomise', '#btnHelp']) {
			await page.click(b).catch(() => {});
			await page.waitForTimeout(400);
			const r = await page.evaluate(() => androidBack());
			await page.waitForTimeout(300);
			const s = await state(page);
			if (r !== 'closed' || s.open.length) report(name, `Back on ${b} gave "${r}" and left ${s.open.join(', ') || 'nothing'} open`);
		}
		if ((await page.evaluate(() => androidBack())) !== 'closed') report(name, 'the first Back on the board leaves at once');
		if ((await page.evaluate(() => androidBack())) !== 'none') report(name, 'a second Back on the board does not leave');
		await page.waitForTimeout(3200);
		await lose(page);
		const r = await page.evaluate(() => androidBack());
		const s = await state(page);
		if (r !== 'closed' || !s.open.includes('ovMsg')) report(name, `Back on the lose scroll gave "${r}" and left ${s.open.join(', ') || 'nothing'} open`);
		await page.close();
		return page.errors;
	},
	// open the stall and buy while a move is still cascading
	async stallbusy(name) {
		const page = await open(PHONE);
		await toBoard(page);
		const before = await state(page);
		await swap(page);
		await page.waitForTimeout(120);
		await page.click('#btnStall', { timeout: 500 }).catch(() => {});
		await page.waitForTimeout(300);
		const buy = page.locator('.overlay.open .buy:not([disabled])').first();
		if (await buy.count()) {
			await buy.click().catch(() => {});
			await page.waitForTimeout(300);
		}
		await settle(page, 3000);
		await page.keyboard.press('Escape');
		await page.waitForTimeout(500);
		const s = await state(page);
		if (s.gold > before.gold + 200) report(name, `gold rose from ${before.gold} to ${s.gold} around a purchase`);
		await deadEnd(page, name, 'the stall during a cascade, then Escape');
		if (!s.open.length && s.moves > 0 && (await swap(page))) {
			await settle(page);
			if ((await state(page)).moves >= s.moves) report(name, 'the board takes no moves after the stall was used mid-cascade');
		}
		await page.close();
		return page.errors;
	},
	// the last stop won: the journey's end, and every way off it
	async laststop(name) {
		const page = await open(PHONE, { ...SAVE, unlocked: LAST, current: LAST });
		await toBoard(page);
		let s = await win(page);
		if (!s.won) { console.log('  (could not win in one move this time)'); await page.close(); return page.errors; }
		if (!s.open.includes('ovMsg')) report(name, 'no scroll after the last stop was won');
		await clickText(page, MAP);
		await page.click('.overlay.open .close-x').catch(() => {});
		await page.waitForTimeout(500);
		s = await deadEnd(page, name, `the last stop won → ${MAP} → ×`);
		if (await page.$('#boardEnd:not([hidden]) .act-go')) {
			await page.click('#boardEnd .act-go');
			await page.waitForTimeout(800);
			// "Play again" opens the stop's card; its big button sets out
			await page.click('.overlay.open .act-go').catch(() => {});
			await page.waitForTimeout(1200);
			s = await state(page);
			// a trial may be offered as the stop starts: a scroll that closes is a way on
			if (s.moves <= 0 || s.won || (s.open.length && !s.closable)) report(name, `the plaque's "Play again", then the stop card, left ${JSON.stringify(s)}`);
		}
		await page.close();
		return page.errors;
	},
	// a win that finds a relic and opens looks at the same time
	async unlocks(name) {
		const save = {
			...SAVE, current: 3, stars: [3, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0], wins: 0, life: { wins: 0 },
			relics: { suns: 1, trials: 1, cascade: 1, jackal: 1 },
		};
		const page = await open(PHONE, save);
		await toBoard(page);
		const s = await win(page);
		if (!s.won) { console.log('  (could not win in one move this time)'); await page.close(); return page.errors; }
		await page.waitForTimeout(3000);
		const after = await state(page);
		const toasts = await page.$$eval('.unlock-toast', t => t.map(x => x.textContent.replace(/\s+/g, ' ').trim()).join(' | '));
		if (!after.open.includes('ovMsg') || !/gilded/i.test(after.title)) report(name, `after the win the scroll is "${after.title}" (${after.open.join(', ') || 'none'})`);
		if (after.open.length > 1) report(name, `two scrolls at once: ${after.open.join(', ')}`);
		console.log(`  (on screen: ${toasts || 'no note'})`);
		await page.close();
		return page.errors;
	},
	// very long words, as a translation might have: nothing may push the page wider
	async longnames(name) {
		const page = await open({ ...PHONE, viewport: { width: 360, height: 780 } });
		await toBoard(page);
		await page.evaluate(() => {
			const long = 'The long valley of the eastern hills, where the quarrymen cut the dark stone';
			document.getElementById('stripPlace').textContent = long;
			document.getElementById('stopTxt').textContent = long;
			document.getElementById('goldTxt').textContent = '1,234,567';
			document.getElementById('lapisTxt').textContent = '98,765';
		});
		await page.waitForTimeout(300);
		const wide = await page.evaluate(() => {
			const out = [];
			if (document.documentElement.scrollWidth > innerWidth) out.push(`the page is ${document.documentElement.scrollWidth}px wide`);
			for (const el of document.querySelectorAll('.hud, .strip-plaque, .dock')) {
				const r = el.getBoundingClientRect();
				if (r.right > innerWidth + 1) out.push(`${el.className} reaches ${Math.round(r.right)}px`);
			}
			return out;
		});
		wide.forEach(w => report(name, w));
		await page.close();
		return page.errors;
	},
	// lose in a tomb, then leave by the lose scroll's other ways
	async tomb(name) {
		const page = await open(PHONE, SAVE, { hash: '#try=' + TOMB });
		await page.waitForTimeout(600);
		for (let i = 0; i < 2 && (await page.$('.overlay.open')); i++) {
			if (!(await clickText(page, ENTER))) await page.keyboard.press('Escape');
			await page.waitForTimeout(400);
		}
		let s = await lose(page);
		if (!s.open.includes('ovMsg')) report(name, `no scroll after running out of moves in a tomb (${JSON.stringify(s)})`);
		if (s.closable) {
			await page.click('.overlay.open .close-x');
			await page.waitForTimeout(500);
			await deadEnd(page, name, 'lose in a tomb → ×');
		}
		await page.close();
		return page.errors;
	},
};

// --copy: only write the copy with the hook (dist/edge/game.html), for a
// debug build of the Android app (ANDROID_DEBUG=1 ./build.sh android), which
// tools/perf/phone.mjs plays on a real phone
if (process.argv.includes('--copy')) {
	makeCopy();
	process.exit(0);
}
browser = await chromium.launch();
GAME = makeCopy();
const want = process.argv.slice(2);
for (const [name, run] of Object.entries(CASES)) {
	if (want.length && !want.includes(name)) continue;
	console.log(name);
	const errors = await run(name).catch(e => [String(e)]);
	for (const e of errors || []) report(name, `page error: ${e}`);
}
await browser.close();
console.log(found.length ? `\n${found.length} to look at:\n  ${found.join('\n  ')}` : '\nNo dead ends found.');
process.exitCode = found.length ? 1 : 0;
