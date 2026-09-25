// A quick play-through of the built game, to catch a page error before a
// player does. Run it after any change to the code:
//
//	python3 build.py
//	node tools/screenshots/smoke.mjs
//
// It starts a new player and a player part-way down the river, on a desktop
// and on a phone. On each it makes moves with the keyboard, taps the hint and
// opens every screen from the dock and the menu. It prints what it did and
// fails (exit code 1) if the page logs a single error. It does not judge how
// anything looks: take.mjs and the pictures in docs/images/ do that.
//
// On a Mac the browser uses the real graphics chip (ANGLE on Metal), so the
// board is drawn with WebGL as on a phone (src/game/02-board-pen.js); one
// more run uses a browser without it, for the plain canvas the game falls
// back to.

import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GAME = 'file://' + path.join(ROOT, 'dist', 'amulets-of-anubis.html');
const SAVE_KEY = 'amulets-nile-v1';

// part-way down the river, with every part of the game staged in
const JOURNEY = {
	unlocked: 8, current: 5, difficulty: 1, board: 'classic', sound: false, music: false,
	seenHelp: true, staged: 'all', journeys: 1, met: {}, fresh: {},
	stars: [3, 2, 3, 2, 2, 1, 2, 0, 0, 0, 0, 0], fails: {},
	gold: 1240, lapis: 86, goldEarned: 5200, lapisEarned: 310,
	boons: ['flood', 'hammer', 'wisdom'], charges: {}, upg: {},
	relics: { first: 1, cascade: 1 }, chambers: { serapeum: 1 },
};
const DESKTOP = { viewport: { width: 1280, height: 800 } };
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
// the buttons that open a screen, each closed again with Escape
const SCREENS = ['#btnMap', '#btnHelp', '#btnAmulets', '#btnStall', '#btnTreasury', '#btnCustomise', '#openMuseum', '#btnMenu', '#stripPlace'];

const errors = [];
const GPU = process.platform === 'darwin' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [];
let browser = await chromium.launch({ args: GPU });

async function play(label, device, save) {
	const page = await browser.newPage({ ...device, reducedMotion: 'reduce' });
	page.on('pageerror', e => errors.push(`${label}: ${e}`));
	page.on('console', m => { if (m.type() === 'error') errors.push(`${label}: console: ${m.text()}`); });
	if (save) await page.addInitScript(([key, s]) => localStorage.setItem(key, JSON.stringify(s)), [SAVE_KEY, save]);
	await page.goto(GAME);
	await page.waitForTimeout(1500);

	// past the title screen and any banner or trial offer
	await page.click('#ovTitle [data-t="continue"]').catch(() => {});
	for (let i = 0; i < 4 && await page.$('.overlay.open'); i++) {
		await page.keyboard.press('Escape');
		await page.waitForTimeout(300);
	}

	// moves with the keyboard: walk the cursor about and try each direction
	await page.focus('#board');
	const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
	let tries = 0;
	for (let i = 0; i < 40; i++) {
		await page.keyboard.press(keys[i % 4]);
		if (i % 3 === 0) await page.keyboard.press('ArrowDown');
		await page.keyboard.press('Enter');
		await page.keyboard.press(keys[(i * 7) % 4]);
		tries++;
		await page.waitForTimeout(120);
		if (await page.$('.overlay.open')) {
			await page.keyboard.press('Escape');
			await page.waitForTimeout(200);
			await page.focus('#board').catch(() => {});
		}
	}
	await page.click('#btnHint').catch(() => {});

	// every screen, opened and closed
	let opened = 0;
	for (const sel of SCREENS) {
		const el = await page.$(sel);
		if (!el || !await el.isVisible()) continue;
		await el.click().catch(() => {});
		await page.waitForTimeout(350);
		if (await page.$('.overlay.open')) opened++;
		// the tabs inside a screen, if it has any
		for (const tab of await page.$$('.overlay.open [role="tab"]')) {
			await tab.click().catch(() => {});
			await page.waitForTimeout(80);
		}
		// the chapters of How to play (each click draws the page anew, so look them up by name)
		for (const id of await page.$$eval('.overlay.open .codex-book [data-t]', els => [...new Set(els.map(e => e.dataset.t))])) {
			await page.click(`.overlay.open .codex-book [data-t="${id}"]:visible`).catch(() => {});
			await page.waitForTimeout(80);
		}
		await page.keyboard.press('Escape');
		await page.waitForTimeout(250);
	}
	const pen = await page.evaluate(() => (document.getElementById('board').getContext('webgl') ? 'WebGL' : 'canvas'));
	console.log(`${label}: ${tries} moves tried, ${opened} screens opened, the board drawn with ${pen}`);
	await page.close();
}

await play('new player, desktop', DESKTOP, null);
await play('new player, phone', PHONE, null);
await play('journey, desktop', DESKTOP, JOURNEY);
await play('journey, phone', PHONE, JOURNEY);
await browser.close();
// the fallback: a browser without the graphics chip draws with the plain canvas
browser = await chromium.launch();
await play('journey, phone, no graphics chip', PHONE, JOURNEY);
await browser.close();

if (errors.length) {
	console.log(`\n${errors.length} error(s):`);
	for (const e of errors) console.log('  ' + e);
	process.exit(1);
}
console.log('\nNo errors.');
