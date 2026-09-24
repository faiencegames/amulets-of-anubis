// Checks that every amulet set stays easy to tell apart in every look.
//
//	python3 build.py           # not needed: this reads the content itself
//	node check-looks.mjs       # a report, and looks-check.png beside it
//
// For every look (content/amulet-sets/) it draws each amulet the way the game
// does (skinned() in 04-boards.js: the same canvas filter, glow and tint), and
// takes its average colour in Lab, the colour space in which distances match
// what the eye sees. Then, for every set of every stop, tomb, temple and oasis,
// it measures how far apart each pair of amulets is (ΔE). Two amulets whose
// colours come closer than CLOSE can only be told apart by their shape.
// The report lists, per look, how many pairs are too close, and the worst ones;
// looks-check.png shows each look's worst set so they can be judged by eye.
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CLOSE = 14;   // ΔE below this: easily confused on a small phone screen

const content = JSON.parse(spawnSync('python3', ['build.py', '--content-json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }).stdout);
const places = [
	...content.stops.map(s => ({ name: s.name, sets: s.sets || [s.set] })),
	...content.chambers.map(c => ({ name: c.title, sets: c.sets || [c.set || []] })).filter(p => p.sets[0].length),
];
const names = [...new Set(places.flatMap(p => p.sets.flat()))];
const pictures = Object.fromEntries(names.map(n => [n, 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'images/amulets', n + '.svg')).toString('base64')]));

const browser = await chromium.launch();
const page = await browser.newPage();
const colours = await page.evaluate(async ({ pictures, skins }) => {
	const S = 128;
	const load = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
	const imgs = {};
	for (const [n, src] of Object.entries(pictures)) {
		const img = await load(src);
		const c = document.createElement('canvas'); c.width = c.height = S; c.getContext('2d').drawImage(img, 0, 0, S, S);
		imgs[n] = c;
	}
	// the same steps as skinned() in 04-boards.js
	function skinned(src, skin) {
		const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
		if (skin.glow) { g.save(); g.shadowColor = skin.glow; g.shadowBlur = 14; for (let i = 0; i < 3; i++) g.drawImage(src, 0, 0); g.restore();
			g.globalCompositeOperation = 'destination-out'; g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-over'; }
		g.filter = skin.filter || 'none'; g.drawImage(src, 0, 0); g.filter = 'none';
		if (skin.tint) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = skin.tintAlpha || .25; g.fillStyle = skin.tint; g.fillRect(0, 0, S, S); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
		return c;
	}
	// average colour of the amulet itself (the glow outside it is left out)
	function lab(canvas, mask) {
		const d = canvas.getContext('2d').getImageData(0, 0, S, S).data, m = mask.getContext('2d').getImageData(0, 0, S, S).data;
		let r = 0, g = 0, b = 0, w = 0;
		for (let i = 0; i < d.length; i += 4) { const a = m[i + 3] / 255; if (a < .5) continue; r += d[i] * a; g += d[i + 1] * a; b += d[i + 2] * a; w += a; }
		const lin = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
		const [R, G, B] = [r / w, g / w, b / w].map(lin);
		const X = (R * .4124 + G * .3576 + B * .1805) / .95047, Y = R * .2126 + G * .7152 + B * .0722, Z = (R * .0193 + G * .1192 + B * .9505) / 1.08883;
		const f = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
		return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
	}
	const out = {};
	for (const skin of skins) {
		out[skin.id] = {};
		for (const [n, c] of Object.entries(imgs)) out[skin.id][n] = lab(skin.filter || skin.glow || skin.tint ? skinned(c, skin) : c, c);
	}
	return out;
}, { pictures, skins: content.skins });

const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const report = [];
for (const skin of content.skins) {
	const col = colours[skin.id];
	const close = [];
	let worstSet = null, worstMin = 1e9;
	for (const p of places) p.sets.forEach((set, si) => {
		let min = 1e9;
		for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) {
			const d = dE(col[set[i]], col[set[j]]);
			min = Math.min(min, d);
			if (d < CLOSE) close.push({ d, a: set[i], b: set[j], where: `${p.name} ${si + 1}` });
		}
		if (min < worstMin) { worstMin = min; worstSet = { where: `${p.name}, set ${si + 1}`, set }; }
	});
	close.sort((x, y) => x.d - y.d);
	const uniq = [...new Map(close.map(c => [[c.a, c.b].sort().join('+'), c])).values()];
	report.push({ skin, close, uniq, worstSet, worstMin });
}
report.sort((a, b) => b.close.length - a.close.length);
console.log(`Pairs of amulets in one set whose colours are closer than ΔE ${CLOSE} (${places.reduce((n, p) => n + p.sets.length, 0)} sets checked):\n`);
for (const r of report) {
	console.log(`${(content.skins.find(s => s.id === r.skin.id).id).padEnd(10)} ${String(r.close.length).padStart(3)} close pairs` + (r.uniq.length ? ':  ' + r.uniq.slice(0, 6).map(c => `${c.a}/${c.b} ${c.d.toFixed(0)}`).join(', ') + (r.uniq.length > 6 ? ', …' : '') : ''));
}

// a picture of each look's worst set, to judge by eye
const rows = report.map(r => ({ id: r.skin.id, where: r.worstSet.where, min: r.worstMin, set: r.worstSet.set, skin: r.skin }));
const png = await page.evaluate(async ({ rows, pictures }) => {
	const S = 128, cell = 56, W = 200 + 6 * (cell + 6), H = rows.length * (cell + 12) + 10;
	const out = document.createElement('canvas'); out.width = W; out.height = H; const o = out.getContext('2d');
	o.fillStyle = '#c9b48a'; o.fillRect(0, 0, W, H); o.font = '13px sans-serif'; o.fillStyle = '#2a1703';
	const load = src => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
	for (const [ri, r] of rows.entries()) {
		const y = 8 + ri * (cell + 12);
		o.fillStyle = '#2a1703'; o.fillText(r.id, 8, y + 22); o.fillText(`${r.where}`, 8, y + 38); o.fillText(`closest ΔE ${r.min.toFixed(0)}`, 8, y + 52);
		for (const [i, n] of r.set.entries()) {
			const img = await load(pictures[n]);
			const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
			const skin = r.skin;
			if (skin.glow) { g.save(); g.shadowColor = skin.glow; g.shadowBlur = 14; for (let k = 0; k < 3; k++) g.drawImage(img, 0, 0, S, S); g.restore();
				g.globalCompositeOperation = 'destination-out'; g.drawImage(img, 0, 0, S, S); g.globalCompositeOperation = 'source-over'; }
			g.filter = skin.filter || 'none'; g.drawImage(img, 0, 0, S, S); g.filter = 'none';
			if (skin.tint) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = skin.tintAlpha || .25; g.fillStyle = skin.tint; g.fillRect(0, 0, S, S); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
			o.fillStyle = '#b8a078'; o.fillRect(200 + i * (cell + 6) - 2, y - 2, cell + 4, cell + 4);
			o.drawImage(c, 200 + i * (cell + 6), y, cell, cell);
		}
	}
	return out.toDataURL('image/png');
}, { rows, pictures });
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'looks-check.png'), Buffer.from(png.split(',')[1], 'base64'));
console.log('\nThe worst set of each look: tools/screenshots/looks-check.png');
await browser.close();
