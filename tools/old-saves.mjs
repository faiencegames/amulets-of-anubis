// Old saves still load: a player's progress in the browser, and a save code
// made by an earlier version, both reach the game as they were. Run it after
// any change to how the save is read or written, or to edition.jsonc:
//
//	python3 build.py
//	node tools/old-saves.mjs
//
// The save key, the code's prefix and the code below are Amulets' own, as
// players have them. They are written out here on purpose, rather than read
// from edition.jsonc: the test is that the game still matches them.
//
//	node tools/old-saves.mjs --code <file.html>
//
// prints a save code made by the game file given, for a new fixture.

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Playwright comes with the screenshot tools (npm install there, once)
const tools = ['engine/tools/screenshots', 'tools/screenshots'].map(p => path.join(ROOT, p)).find(p => fs.existsSync(p));
const { chromium } = createRequire(path.join(tools, 'package.json'))('playwright');

const GAME = path.join(ROOT, 'dist', 'amulets-of-anubis.html');
const SAVE_KEY = 'amulets-nile-v1';
const PREFIX = 'AMULETS1:';

// A player part-way down the river, as 0.9.3 kept them. No stopIds: saves
// from before stops had ids are read against the original twelve.
const OLD_SAVE = {
	unlocked: 5, current: 4, difficulty: 1, board: 'classic', sound: false, music: false,
	seenHelp: true, staged: 'all', journeys: 1, stars: [3, 2, 3, 1, 2, 0, 0, 0, 0, 0, 0, 0], fails: {},
	gold: 1234, lapis: 56, skin: 'faience', skins: { faience: 1 }, floor: 'temple', floors: { temple: 1 },
	boons: ['flood'], charges: {}, upg: {}, relics: { first: 1 }, chambers: {},
};
// The same stops kept in another order: progress must follow each stop.
const MOVED_SAVE = Object.assign({}, OLD_SAVE, {
	stopIds: ['giza', 'memphis', 'saqqara', 'faiyum', 'amarna', 'abydos', 'karnak', 'deir-el-bahari',
		'valley-of-the-kings', 'philae', 'abu-simbel', 'alexandria'],
	stars: [3, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0], unlocked: 2, current: 0,
});
// A save code made by version 0.9.3 (Menu, Save and restore), gold 4321.
const OLD_CODE = fs.readFileSync(path.join(ROOT, 'tools', 'old-saves-0.9.3.txt'), 'utf-8').trim();

const browser = await chromium.launch();
const failures = [];
const expect = (what, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}: ${JSON.stringify(got)}`);
	if (!ok) failures.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
};

async function open(file, stored) {
	const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
	page.on('pageerror', e => failures.push(`page error: ${e}`));
	await page.addInitScript(([key, s]) => {
		if (s && !sessionStorage.getItem('seeded')) {
			localStorage.setItem(key, s);
			sessionStorage.setItem('seeded', '1');
		}
	}, [SAVE_KEY, stored && JSON.stringify(stored)]);
	await page.goto('file://' + file);
	await page.waitForTimeout(1200);
	return page;
}
const kept = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), SAVE_KEY);

async function openSaves(page) {
	await page.click('#ovTitle [data-t="saves"]');
	await page.waitForSelector('#exportCode');
}

if (process.argv[2] === '--code') {
	const page = await open(path.resolve(process.argv[3]), Object.assign({}, OLD_SAVE, { gold: 4321 }));
	await openSaves(page);
	console.log(await page.$eval('#exportCode', t => t.value));
	await browser.close();
	process.exit(0);
}

// 1. progress kept in the browser under the old key
let page = await open(GAME, OLD_SAVE);
expect('gold shown from the kept save', await page.$eval('#goldTxt', e => e.textContent), '1,234');
expect('lapis shown from the kept save', await page.$eval('#lapisTxt', e => e.textContent), '56');
await openSaves(page); // opening the saves writes nothing, but reads the whole save into a code
const code = await page.$eval('#exportCode', t => t.value);
expect('a new code starts with the old prefix', code.slice(0, PREFIX.length), PREFIX);
const inCode = JSON.parse(decodeURIComponent(escape(atob(code.slice(PREFIX.length)))));
expect('the code holds the kept stars', inCode.stars.slice(0, 6), [3, 2, 3, 1, 2, 0]);
expect('the code holds the look', [inCode.skin, inCode.floor, inCode.frame, inCode.sparkle], ['faience', 'temple', 'temple', 'gold']);
expect('an old save is read against the original stops', inCode.stopIds.slice(0, 3), ['memphis', 'saqqara', 'giza']);
await page.close();

// 2. stops kept in another order follow their stop
page = await open(GAME, MOVED_SAVE);
await openSaves(page);
const moved = JSON.parse(decodeURIComponent(escape(atob((await page.$eval('#exportCode', t => t.value)).slice(PREFIX.length)))));
expect('stars follow their stop', moved.stars.slice(0, 4), [1, 2, 3, 0]);
expect('the stop you were at follows it', moved.current, 2);
await page.close();

// 3. a code made by 0.9.3, restored into an empty game
page = await open(GAME, null);
await openSaves(page);
await page.fill('#importCode', OLD_CODE);
await page.click('#doImport');
await page.click('#confirmImport');
await page.waitForTimeout(800);
const restored = await kept(page);
expect('the old code is restored under the old key', restored && restored.gold, 4321);
expect('with its stars', restored && restored.stars.slice(0, 5), [3, 2, 3, 1, 2]);
expect('and its look', restored && [restored.skin, restored.floor], ['faience', 'temple']);
await page.close();

// 4. a setting kept for this device, under its old key
page = await open(GAME, OLD_SAVE);
await page.evaluate(() => localStorage.setItem('amulets-effects', 'fewer'));
await page.reload();
await page.waitForTimeout(1200);
await page.click('#ovTitle [data-t="continue"]');
for (let i = 0; i < 4 && (await page.$('.overlay.open')); i++) {
	await page.keyboard.press('Escape');
	await page.waitForTimeout(300);
}
await page.click('#btnMenu');
await page.click('[data-m="audio"]');
await page.click('[data-part="motion"]');
expect('the device setting is read from its old key', await page.$eval('#setFx button.on', b => b.dataset.v), 'fewer');
await page.close();

await browser.close();
if (failures.length) {
	console.log('\n' + failures.length + ' failed:\n  ' + failures.join('\n  '));
	process.exit(1);
}
console.log('\nOld saves load.');
