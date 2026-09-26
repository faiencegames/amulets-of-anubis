// Takes the screenshots used by the README and the guides (docs/images/), so
// they can be brought up to date in one go after the game changes. The scene
// "store" takes the phone pictures app stores show, into fastlane/.
//
//	python3 build.py                      # the game must be built first
//	cd engine/tools/screenshots && npm install && npx playwright install chromium
//	node tools/screenshots/take.mjs            # all of them
//	node tools/screenshots/take.mjs map tomb   # just these
//
// It plays the built game in a headless browser with a prepared save (a
// journey part-way down the Nile), opens each screen and saves a JPEG. A
// scroll is cut out on its own rather than shown over a darkened board.
// Set CHROME to a browser's path to use it instead of Playwright's own.
// Development only: the game itself never needs any of this. ./build.sh runs
// it as part of a full build.
//
// The same build gives the same pictures: the game's dice are seeded and
// motion is reduced and a picture is only replaced when it looks different
// (so a build doesn't mark every screenshot as changed in git).

import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Playwright is installed with the engine's test tools
const { chromium } = createRequire(path.join(ROOT, 'engine', 'tools', 'screenshots', 'package.json'))('playwright');
const GAME = 'file://' + path.join(ROOT, 'dist', 'amulets-of-anubis.html');
const OUT = path.join(ROOT, 'docs', 'images');
const SAVE_KEY = 'amulets-nile-v1';

// A journey part-way down the river: nine stops open, a few relics, the
// Serapeum explored, a handful of boons (some doubled, to show the counts).
function journeySave(changes = {}) {
	return Object.assign({
		unlocked: 8, current: 2, difficulty: 1, board: 'classic', fill: true, sound: false, music: false,
		seenHelp: true, staged: 'all', journeys: 1, met: {}, fresh: {},
		stars: [3, 2, 3, 2, 2, 1, 2, 0, 0, 0, 0, 0], fails: {},
		gold: 1240, lapis: 86, goldEarned: 5200, lapisEarned: 310,
		boons: ['flood', 'flood', 'hammer', 'wisdom', 'sun', 'seshat', 'hammer'], charges: {}, upg: { moves: 1, luck: 1 },
		relics: { first: 1, cascade: 1, trials: 1, duet: 1, lamp: 1 }, chambers: { serapeum: 1 },
		seals: { memphis: [1, 1, 0], saqqara: [1, 0, 0], giza: [1, 1, 1] }, omens: {},
		trialsDone: 6, suns: 4, bestCascade: 7, thickCracked: 60, streak: 2,
		life: { wins: 14, events: 4, hardWins: 0 },
		skin: 'faience', skins: { faience: 1, bronze: 1, turquoise: 1 },
		floor: 'temple', floors: { temple: 1, 'blue-tiles': 1 },
		frame: 'temple', frames: { temple: 1 }, sparkle: 'gold', sparkles: { gold: 1, lapis: 1 },
		vibrate: false,
	}, changes);
}

const DESKTOP = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 };
// a tall window for the scrolls with a lot in them, so they show more before cutting off
const TALL = { viewport: { width: 1280, height: 1150 }, deviceScaleFactor: 1.5 };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

let browser;
async function open(save, { device = DESKTOP, hash = '' } = {}) {
	const page = await browser.newPage({ ...device, reducedMotion: 'reduce' });
	page.on('pageerror', e => console.log('  page error:', String(e)));
	// seeded dice, so the same build deals the same boards every time
	await page.addInitScript(() => {
		let seed = 20260924;
		Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
	});
	if (save) await page.addInitScript(([key, s]) => {
		// only on the first load, so the game's own saving takes over afterwards
		if (!sessionStorage.getItem('shot')) { localStorage.setItem(key, JSON.stringify(s)); sessionStorage.setItem('shot', '1'); }
	}, [SAVE_KEY, save]);
	await page.goto(GAME + hash);
	await page.waitForTimeout(1400);
	return page;
}
// past the title screen, and any trial offer or banner, onto the board
async function toBoard(page) {
	await page.click('#ovTitle [data-t="continue"]').catch(() => {});
	await page.waitForTimeout(700);
	for (let i = 0; i < 3; i++) {
		if (!await page.$('.overlay.open')) break;
		await page.keyboard.press('Escape'); await page.waitForTimeout(400);
	}
	await page.waitForTimeout(900);
}
// Keep the old picture unless the new one looks different: same size, on
// average less than 0.2% apart per pixel, and fewer than 400 pixels clearly
// different, counts as the same. (Seeded runs come out almost identical; 1%
// was too loose, and missed a change of scenery behind a darkened tomb. The
// average alone missed a changed line of small text, hence the pixel count.)
let changed = 0, kept = 0;
async function save(name, buffer, dir = OUT) {
	const file = path.join(dir, name);
	if (fs.existsSync(file) && await looksSame(fs.readFileSync(file), buffer, name)) { kept++; return; }
	fs.writeFileSync(file, buffer); changed++;
	console.log('  wrote', name);
}
async function looksSame(a, b, name) {
	const type = name.endsWith('.png') ? 'image/png' : 'image/jpeg';
	const page = await browser.newPage();
	const diff = await page.evaluate(async ([a, b, type]) => {
		const load = async b64 => { const i = new Image(); i.src = `data:${type};base64,${b64}`; await i.decode(); return i; };
		const [x, y] = [await load(a), await load(b)];
		if (x.width !== y.width || x.height !== y.height) return 1;
		const c = document.createElement('canvas'); c.width = x.width; c.height = x.height;
		const g = c.getContext('2d', { willReadFrequently: true });
		g.drawImage(x, 0, 0); const dx = g.getImageData(0, 0, c.width, c.height).data;
		g.drawImage(y, 0, 0); const dy = g.getImageData(0, 0, c.width, c.height).data;
		let sum = 0, clear = 0;
		for (let i = 0; i < dx.length; i += 4) {
			const d = Math.abs(dx[i] - dy[i]) + Math.abs(dx[i + 1] - dy[i + 1]) + Math.abs(dx[i + 2] - dy[i + 2]);
			sum += d;
			if (d > 120) clear++;
		}
		return clear >= 400 ? 1 : sum / (dx.length * 0.75) / 255;
	}, [a.toString('base64'), b.toString('base64'), type]);
	await page.close();
	return diff < 0.002;
}
const shot = async (page, name) => save(name, await page.screenshot({ type: 'jpeg', quality: 82 }));
async function scroll(page, name, which = '#ovMsg') {
	await page.waitForTimeout(700);
	const el = await page.$(`${which} .scroll`);
	await save(name, await el.screenshot({ type: 'jpeg', quality: 84 }));
}

const SCENES = {
	// the board beside the side panel, at Giza
	async board() {
		const p = await open(journeySave({ current: 2 })); await toBoard(p);
		await shot(p, 'screenshot-giza.jpg'); await p.close();
	},
	// the title screen fills the window, over the scenery of the stop you're at
	async title() {
		const p = await open(journeySave());
		await p.waitForTimeout(700);
		await shot(p, 'screenshot-title.jpg'); await p.close();
	},
	async map() {
		const p = await open(journeySave()); await toBoard(p);
		await p.click('#btnMap'); await scroll(p, 'screenshot-map.jpg', '#ovMap'); await p.close();
	},
	// a gilded stop's card: seals, omens and its doorway
	async stop() {
		const p = await open(journeySave(), { device: TALL }); await toBoard(p);
		await p.click('#btnMap'); await p.waitForTimeout(500);
		await p.click('.stop-btn[data-i="1"]'); await p.waitForTimeout(400);
		// its Omens tile open, with one braved
		await p.click('[data-part="omens"]'); await p.click('.omen >> nth=0');
		await scroll(p, 'screenshot-omens.jpg'); await p.close();
	},
	async customise() {
		const p = await open(journeySave(), { device: TALL }); await toBoard(p);
		await p.click('#btnCustomise'); await scroll(p, 'screenshot-customise.jpg'); await p.close();
	},
	async help() {
		const p = await open(journeySave(), { device: TALL }); await toBoard(p);
		await p.click('#btnHelp'); await scroll(p, 'screenshot-how-to-play.jpg'); await p.close();
	},
	async treasury() {
		const p = await open(journeySave(), { device: TALL }); await toBoard(p);
		await p.click('#btnTreasury'); await scroll(p, 'screenshot-treasury.jpg'); await p.close();
	},
	async museum() {
		const p = await open(journeySave(), { device: TALL }); await toBoard(p);
		await p.click('#openMuseum'); await scroll(p, 'screenshot-museum.jpg'); await p.close();
	},
	async stall() {
		const p = await open(journeySave(), { device: TALL }); await toBoard(p);
		await p.click('#btnStall'); await scroll(p, 'screenshot-stall.jpg'); await p.close();
	},
	// the Menu: back to the board, eight tiles, the ways out small at the foot
	async menu() {
		const p = await open(journeySave()); await toBoard(p);
		await p.click('#btnMenu'); await scroll(p, 'screenshot-menu.jpg'); await p.close();
	},
	// a boon that asks for a square: the Hammer of Set aimed, the board glowing gold
	async aim() {
		const p = await open(journeySave()); await toBoard(p);
		await p.click('.side .boon[aria-label^="Hammer"]'); await p.waitForTimeout(600);
		await shot(p, 'screenshot-boon-aimed.jpg'); await p.close();
	},
	// the doorway at Giza, then the tomb itself by torchlight
	async tomb() {
		const p = await open(journeySave()); await toBoard(p);
		await p.click('#btnMap'); await p.waitForTimeout(500);
		await p.click('.stop-btn[data-i="2"]'); await p.waitForTimeout(500);
		await p.click('[data-part="door"]'); await p.waitForTimeout(300);
		await p.click('#ovMsg .act-go:not([hidden])'); await p.waitForTimeout(1500);
		await scroll(p, 'screenshot-chamber.jpg');
		await p.click('#ovMsg .act-go:not([hidden])'); await p.waitForTimeout(2200);
		await shot(p, 'screenshot-tomb.jpg'); await p.close();
	},
	// Siwa: an oasis in daylight, some amulets under water
	async oasis() {
		const p = await open(null, { hash: '#try=siwa' });
		await p.click('#ovMsg .act-go:not([hidden])'); await p.waitForTimeout(2200);
		await p.evaluate(() => document.querySelector('.try-badge')?.remove());
		await shot(p, 'screenshot-oasis.jpg'); await p.close();
	},
	async event() {
		const p = await open(null, { hash: '#try=ferry' });
		await scroll(p, 'screenshot-river-event.jpg'); await p.close();
	},
	// Karnak gilded (with a few Floods, to be quick), and its doorway offered
	async win() {
		const p = await open(journeySave({ current: 6, stars: [3, 2, 3, 2, 2, 1, 0, 0, 0, 0, 0, 0], boons: Array(30).fill('flood') }));
		await toBoard(p);
		for (let i = 0; i < 30 && !await p.$('#ovMsg.open'); i++) {
			const b = await p.$('.side .boon'); if (!b) break;
			await b.click(); await p.waitForTimeout(1300);
		}
		await p.waitForTimeout(1200);
		await scroll(p, 'screenshot-win.jpg'); await p.close();
	},
	async phone() {
		const p = await open(journeySave({ current: 4 }), { device: PHONE }); await toBoard(p);
		await shot(p, 'screenshot-phone-amarna.jpg'); await p.close();
	},
	// a trial offered at Abydos. Offers come by chance, and only when a stop
	// starts with no scroll open, so set out from the map until one comes.
	async trial() {
		const p = await open(journeySave({ current: 5, upg: { priest: 3 } }), { device: PHONE }); await toBoard(p);
		for (let n = 0; n < 20; n++) {
			await p.click('#btnMap'); await p.waitForTimeout(500);
			await p.click('.stop-btn[data-i="5"]'); await p.waitForTimeout(500);
			await p.click('#ovMsg .act-go:not([hidden])'); await p.waitForTimeout(1600);
			if (await p.$('.trial-card[data-accept]')) { await shot(p, 'screenshot-phone-trial.jpg'); await p.close(); return; }
			if (await p.$('.overlay.open')) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
		}
		console.log('  no trial was offered in 20 tries; kept the old picture'); await p.close();
	},
	// the phone pictures for app stores (F-Droid reads them from fastlane/):
	// the title, a board, the map, a tomb, a river event and a win
	async store() {
		const dir = path.join(ROOT, 'fastlane', 'metadata', 'android', 'en-US', 'images', 'phoneScreenshots');
		const phoneShot = async (p, n) => save(`${n}.png`, await p.screenshot({ type: 'png' }), dir);
		let p = await open(journeySave({ current: 4 }), { device: PHONE });
		await p.waitForTimeout(700);
		await phoneShot(p, 1);
		await toBoard(p);
		await phoneShot(p, 2);
		await p.click('#btnMap'); await p.waitForTimeout(900);
		await phoneShot(p, 3); await p.close();
		p = await open(journeySave(), { device: PHONE }); await toBoard(p);
		await p.click('#btnMap'); await p.waitForTimeout(500);
		await p.click('.stop-btn[data-i="2"]'); await p.waitForTimeout(500);
		await p.click('[data-part="door"]'); await p.waitForTimeout(300);
		await p.click('#ovMsg .act-go:not([hidden])'); await p.waitForTimeout(1500);
		await p.click('#ovMsg .act-go:not([hidden])'); await p.waitForTimeout(2200);
		await phoneShot(p, 4); await p.close();
		p = await open(null, { hash: '#try=ferry', device: PHONE }); await p.waitForTimeout(700);
		await p.evaluate(() => document.querySelector('.try-badge')?.remove());
		await phoneShot(p, 5); await p.close();
		p = await open(journeySave({ current: 6, stars: [3, 2, 3, 2, 2, 1, 0, 0, 0, 0, 0, 0], boons: Array(30).fill('flood') }),
			{ device: PHONE });
		await toBoard(p);
		for (let i = 0; i < 30 && !await p.$('#ovMsg.open'); i++) {
			const b = await p.$('.boon >> visible=true'); if (!b) break;
			await b.click(); await p.waitForTimeout(1300);
		}
		await p.waitForTimeout(1200);
		await phoneShot(p, 6); await p.close();
	},
	// the beginner's guide: try-out mode, and scripts/new.py in a terminal
	async tryout() {
		const p = await open(null, { hash: '#try=memphis', device: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } });
		await p.waitForTimeout(800);
		await shot(p, 'guide-try-out-mode.jpg'); await p.close();
	},
	async newpy() {
		const menu = spawnSync('python3', [path.join(ROOT, 'scripts', 'new.py')], { input: 'x\n', encoding: 'utf-8' }).stdout
			.replace(/Type a number:.*$/s, '');
		const text = '$ python3 scripts/new.py\n' + menu + 'Type a number: 1\n'
			+ 'Give the stop an id: lowercase letters, numbers and hyphens, like golden-barque: siwa\n'
			+ 'Copied a starting picture to images/backdrops/siwa.svg\nCopied a starting picture to images/boards/siwa.svg\n\n'
			+ 'Made content/stops/13-siwa.jsonc: a new stop on the journey, with its own floor, scenery and music.\n'
			+ 'It works as it is. Next:\n'
			+ '  1. Open it in a text editor and change it; the comments say what each line does.\n'
			+ '     Draw over the pictures copied into images/ (see images/README.md).\n'
			+ '  2. Build (build.bat, or python3 build.py), or leave scripts/watch running.\n'
			+ '  3. Double-click dist/try-it.html to try it, with everything unlocked and your real save untouched.';
		const page = await browser.newPage({ viewport: { width: 900, height: 200 }, deviceScaleFactor: 1.5 });
		const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
		await page.setContent(`<body style="margin:0;background:#1e1a17"><pre style="margin:0;padding:18px 22px;color:#e8e2d6;font:13px/1.45 Menlo,Consolas,monospace;white-space:pre">${esc(text)}</pre></body>`);
		await save('guide-new-py.png', await (await page.$('pre')).screenshot());
		await page.close();
	},
	// the manual's build error: a real build of a copy of the game whose
	// first stop has lost the comma after its "moves"
	async builderror() {
		const tmp = fs.mkdtempSync(path.join(ROOT, 'dist', 'build-error-'));
		for (const d of ['content', 'images', 'docs/manual']) fs.cpSync(path.join(ROOT, d), path.join(tmp, d), { recursive: true });
		for (const f of ['edition.jsonc', 'build.py']) fs.copyFileSync(path.join(ROOT, f), path.join(tmp, f));
		fs.symlinkSync(path.join(ROOT, 'engine'), path.join(tmp, 'engine'));
		const stops = path.join(tmp, 'content', 'stops');
		const first = path.join(stops, fs.readdirSync(stops).sort()[0]);
		fs.writeFileSync(first, fs.readFileSync(first, 'utf-8').replace(/("moves":\s*\d+),/, '$1'));
		const out = spawnSync('python3', [path.join(tmp, 'build.py')], { cwd: tmp, encoding: 'utf-8' });
		fs.rmSync(tmp, { recursive: true, force: true });
		const text = '$ python3 build.py\n' + (out.stdout + out.stderr).trim();
		const page = await browser.newPage({ viewport: { width: 900, height: 200 }, deviceScaleFactor: 1.5 });
		const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
		await page.setContent(`<body style="margin:0;background:#1e1a17"><pre style="margin:0;padding:18px 22px;color:#e8e2d6;font:13px/1.45 Menlo,Consolas,monospace;white-space:pre-wrap;width:860px">${esc(text)}</pre></body>`);
		await save('guide-build-error.png', await (await page.$('pre')).screenshot());
		await page.close();
	},
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SCENES);
browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME || undefined });
for (const name of names) {
	if (!SCENES[name]) { console.log(`No scene "${name}". There are: ${Object.keys(SCENES).join(', ')}`); continue; }
	await SCENES[name]();
}
await browser.close();
console.log(`${changed} ${changed === 1 ? 'picture' : 'pictures'} changed, ${kept} kept as they were.`);
