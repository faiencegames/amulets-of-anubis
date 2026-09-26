// Plays the game on a real Android phone and measures it: the frame times the
// page sees, how busy the page's main thread is and Android's own frame
// statistics for the app (gfxinfo).
//
// Needs: the phone connected with USB debugging, a debug build of the app on
// it (ANDROID_DEBUG=1 ./build.sh android, then adb install -r ...), which
// carries the edge tests' hook (window.__edge). The game has to be running.
// With two phones connected, say which: ANDROID_SERIAL=<id from adb devices>.
//
//   node tools/perf/phone.mjs [moves] [label] [2d|gl]
//
// With 2d or gl it chooses how the board is drawn (the canvas, or WebGL,
// src/game/02-board-pen.js). It plays [moves] moves (default 30) with legal
// swaps, waits for each cascade to settle, then prints the results as one
// line of JSON, to keep with earlier runs.
//
// It never plays in the player's own save: it keeps a copy
// (dist/phone-save-backup.json, on this computer too), plays a fixed
// benchmark save (the same stop every time, so runs compare fairly) and
// puts the player's save back at the end. Only the game's own page and
// statistics are touched: nothing else on the phone.
//
// It speaks Chrome's DevTools protocol itself, over a WebSocket (built into
// Node), so it needs nothing installed and works with older WebViews.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const APP = 'com.amulets.nile';
const PORT = 9333;
const SAVE_KEY = 'amulets-nile-v1';
const [moves, label, renderer] = [Number(process.argv[2]) || 30, process.argv[3] || '', process.argv[4]];
// the benchmark's own save: Abydos (a large board), everything staged in, sound and music on
const BENCH = {
	unlocked: 8,
	current: 5,
	difficulty: 1,
	board: 'classic',
	seenHelp: true,
	staged: 'all',
	journeys: 1,
	sound: true,
	music: true,
	stars: [3, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 0],
	gold: 1000,
	lapis: 50,
	relics: { first: 1 },
};
// QUIET=1: sound and music off, to see what the audio costs
if (process.env.QUIET) BENCH.sound = BENCH.music = false;

const adbPath =
	['/opt/homebrew/share/android-commandlinetools/platform-tools/adb', process.env.ANDROID_HOME + '/platform-tools/adb'].find(
		p => p && fs.existsSync(p),
	) || 'adb';
const adb = (...args) => execFileSync(adbPath, args, { encoding: 'utf-8' });
const wait = ms => new Promise(r => setTimeout(r, ms));

const pid = adb('shell', 'pidof', APP).trim();
if (!pid) throw new Error('The game is not running on the phone.');
adb('forward', `tcp:${PORT}`, `localabstract:webview_devtools_remote_${pid}`);
const target = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find(t => t.type === 'page');

// a small DevTools client: send(method, params) gives the result
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => ((ws.onopen = res), (ws.onerror = rej)));
let nextId = 1;
const waiting = new Map();
ws.onmessage = e => {
	const m = JSON.parse(e.data);
	if (m.id && waiting.has(m.id)) {
		const [res, rej] = waiting.get(m.id);
		waiting.delete(m.id);
		if (m.error) rej(new Error(m.error.message));
		else res(m.result);
	}
};
const send = (method, params = {}) =>
	new Promise((res, rej) => {
		const id = nextId++;
		waiting.set(id, [res, rej]);
		ws.send(JSON.stringify({ id, method, params }));
	});
// run an expression in the page and give back its value
const run = async expr => {
	const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
	if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ': ' + expr.slice(0, 80));
	return r.result.value;
};
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
const escape = async () => {
	for (const type of ['keyDown', 'keyUp'])
		await send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
};

const playerSave = await run(`localStorage.getItem(${JSON.stringify(SAVE_KEY)})`);
if (playerSave) fs.writeFileSync(path.join(ROOT, 'dist', 'phone-save-backup.json'), playerSave);
// reload with a save (and the chosen way of drawing)
async function reloadWith(save, r) {
	const choose = r ? `localStorage.setItem('amulets-renderer', ${JSON.stringify(r)});` : '';
	await run(`localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(save)}); ${choose}
		setTimeout(() => location.reload(), 50); true`);
	await wait(5000);
}
await reloadWith(JSON.stringify(BENCH), renderer);
await run(`(document.querySelector('#ovTitle [data-t="continue"]') || { click() {} }).click(), true`);
await wait(1500);
for (let i = 0; i < 3 && (await run(`!!document.querySelector('.overlay.open')`)); i++) {
	await escape();
	await wait(500);
}
await wait(1000);
if (!(await run('!!window.__edge'))) throw new Error('No window.__edge: install a debug build (ANDROID_DEBUG=1).');
// LIGHT=1 or 2: measure a lighter game (__edge.light, tools/screenshots/edge.mjs)
if (process.env.LIGHT) {
	await run(`window.__edge.light(${Number(process.env.LIGHT)})`);
	await wait(1500);
}

// the main thread's busy time, from the browser's own counters
await send('Performance.enable');
const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
const before = await metrics();
// frame times as the page sees them
await run(`window.__ft = [];
	(() => {
		let last = performance.now();
		const tick = t => {
			window.__ft.push(t - last);
			last = t;
			if (window.__ftOn) requestAnimationFrame(tick);
		};
		window.__ftOn = true;
		requestAnimationFrame(tick);
	})();
	true`);
adb('shell', 'dumpsys', 'gfxinfo', APP, 'reset');
const t0 = Date.now();
let played = 0;
for (let i = 0; i < moves; i++) {
	const s = await run('window.__edge.state()');
	if (s.open.length || s.moves <= 0 || s.won) {
		// a scroll or a finished stop: start the stop again and carry on
		await escape();
		await run(`document.getElementById('btnRestart').click(), true`);
		await wait(2000);
		continue;
	}
	const m = await run('window.__edge.move()');
	if (!m) break;
	await mouse('mouseMoved', m[0].x, m[0].y);
	await mouse('mousePressed', m[0].x, m[0].y);
	for (let k = 1; k <= 4; k++)
		await mouse('mouseMoved', m[0].x + ((m[1].x - m[0].x) * k) / 4, m[0].y + ((m[1].y - m[0].y) * k) / 4);
	await mouse('mouseReleased', m[1].x, m[1].y);
	played++;
	for (let w = 0; w < 60; w++) {
		await wait(100);
		if (!(await run('window.__edge.state().busy'))) break;
	}
	await wait(250);
}
const secs = (Date.now() - t0) / 1000;
const ft = await run('(window.__ftOn = false), window.__ft');
const gfx = adb('shell', 'dumpsys', 'gfxinfo', APP);
const after = await metrics();
// the player's own save back, as it was
if (playerSave) await reloadWith(playerSave, null);
ws.close();

const pick = re => {
	const m = gfx.match(re);
	return m ? Number(m[1]) : null;
};
const sorted = [...ft].sort((a, b) => a - b),
	q = f => +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * f))].toFixed(1);
console.log(
	JSON.stringify({
		label,
		renderer: renderer || '',
		moves: played,
		seconds: +secs.toFixed(1),
		pageFrames: ft.length,
		pageFrameMs: { median: q(0.5), p90: q(0.9), p99: q(0.99) },
		pageOver33ms: ft.filter(x => x > 33.4).length,
		mainBusyPct: +((100 * (after.TaskDuration - before.TaskDuration)) / secs).toFixed(1),
		scriptPct: +((100 * (after.ScriptDuration - before.ScriptDuration)) / secs).toFixed(1),
		androidFrames: pick(/Total frames rendered: (\d+)/),
		late: (gfx.match(/Janky frames: \d+ \(([\d.]+%)\)/) || [])[1],
		frameMs: [pick(/^50th percentile: (\d+)ms/m), pick(/^90th percentile: (\d+)ms/m), pick(/^99th percentile: (\d+)ms/m)],
		gpuMs: [pick(/50th gpu percentile: (\d+)ms/), pick(/90th gpu percentile: (\d+)ms/), pick(/99th gpu percentile: (\d+)ms/)],
	}),
);
