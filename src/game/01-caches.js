/* =============================================================================
 * src/game/  —  the running game: drawing, animation, input, sound, music,
 * trials and boons, river events, tombs, shops, screens and the HUD.
 *
 * One file per part of the game. The build joins them in file-name order into
 * one closure (opened in 00-open.js, closed at the end of 30-boot.js), so the
 * order matters for `let` and `const` that are used at start-up: see
 * README.md in this folder for what each file holds.
 * ===========================================================================*/

// ---------- drawing caches ----------
// The floor, its shadows and the amulet sprites never change between moves, so
// they are drawn once into offscreen canvases and blitted each frame. This is
// what keeps the game smooth on a mid-range phone.
let bgLayer = null,
	bgDirty = true,
	halo = null,
	lowFx = false,
	forceDraw = true;
const bgCells = new Set(); // squares to repaint on the floor layer without redrawing all of it
const scaledTiles = new Map();
function tileAt(sprite, key) {
	const px = Math.round(cs * 0.86 * dpr);
	if (px < 8) return null;
	let c = scaledTiles.get(sprite);
	if (!c || c.width !== px) {
		c = document.createElement('canvas');
		c.width = c.height = px;
		c.getContext('2d').drawImage(sprite, 0, 0, px, px);
		scaledTiles.set(sprite, c);
	}
	return c;
}

function haloImg() {
	const px = Math.max(4, Math.round(cs * dpr));
	if (halo && halo.width === px) return halo;
	halo = document.createElement('canvas');
	halo.width = halo.height = px;
	const g = halo.getContext('2d'),
		r = px * 0.46,
		cx = px / 2,
		cy = px / 2 + px * 0.04;
	const hg = g.createRadialGradient(cx, cy, px * 0.1, cx, cy, r);
	hg.addColorStop(0, 'rgba(30,14,0,.3)');
	hg.addColorStop(1, 'rgba(30,14,0,0)');
	g.fillStyle = hg;
	g.beginPath();
	g.arc(cx, cy, r, 0, TAU);
	g.fill();
	return halo;
}

function buildBg() {
	if (!core || !canvas.width) return;
	if (!bgLayer) bgLayer = document.createElement('canvas');
	bgLayer.width = canvas.width;
	bgLayer.height = canvas.height;
	const g = bgLayer.getContext('2d');
	g.setTransform(dpr, 0, 0, dpr, 0, 0);
	// the shading over the board backing (seen in the gaps): a vignette and a
	// soft inner shadow round the edge. Wide screens only; phones run edge to
	// edge and look better flat. Once per layer build, never per frame.
	if (!matchMedia('(max-width: 860px)').matches) {
		const W = N * cs,
			H = ROWS * cs;
		const vg = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.hypot(W, H) * 0.56);
		vg.addColorStop(0, 'rgba(0,0,0,0)');
		vg.addColorStop(0.4, 'rgba(0,0,0,0)');
		vg.addColorStop(1, 'rgba(0,0,0,.35)');
		g.fillStyle = vg;
		g.fillRect(0, 0, W, H);
		const e = 26;
		[
			[0, 0, W, e, 0, 0, 0, e],
			[0, H - e, W, e, 0, H, 0, H - e],
			[0, 0, e, H, 0, 0, e, 0],
			[W - e, 0, e, H, W, 0, W - e, 0],
		].forEach(([x, y, w, h, x0, y0, x1, y1]) => {
			const lg = g.createLinearGradient(x0, y0, x1, y1);
			lg.addColorStop(0, 'rgba(0,0,0,.55)');
			lg.addColorStop(1, 'rgba(0,0,0,0)');
			g.fillStyle = lg;
			g.fillRect(x, y, w, h);
		});
		g.strokeStyle = 'rgba(0,0,0,.5)';
		g.lineWidth = 2;
		g.strokeRect(1, 1, W - 2, H - 2);
	}
	g.save();
	g.shadowColor = 'rgba(0,0,0,.6)';
	g.shadowBlur = cs * 0.35;
	g.shadowOffsetY = cs * 0.06;
	g.fillStyle = '#1a1006';
	g.beginPath();
	for (let k = 0; k < N * ROWS; k++) if (core.mask[k]) g.rect((k % N) * cs, ((k / N) | 0) * cs, cs, cs);
	g.fill();
	g.restore();
	const river = riverCols();
	if (river.length) {
		const x0 = river[0] * cs,
			w = river.length * cs,
			h = ROWS * cs;
		const wg = g.createLinearGradient(x0, 0, x0 + w, 0);
		wg.addColorStop(0, '#1d4f73');
		wg.addColorStop(0.5, '#2f78a6');
		wg.addColorStop(1, '#1d4f73');
		g.fillStyle = wg;
		g.fillRect(x0 + 2, 0, w - 4, h);
		g.strokeStyle = 'rgba(220,240,255,.35)';
		g.lineWidth = 1.5;
		for (let y = cs * 0.4; y < h; y += cs * 0.55) {
			const off = ((y / cs) * 37) % (w * 0.5);
			g.beginPath();
			g.moveTo(x0 + 6 + off * 0.3, y);
			g.quadraticCurveTo(x0 + w * 0.3 + off * 0.2, y - 4, x0 + w * 0.5, y);
			g.quadraticCurveTo(x0 + w * 0.7, y + 4, x0 + w - 6, y);
			g.stroke();
		}
		g.fillStyle = 'rgba(60,110,50,.55)';
		for (let y = 0; y < h; y += cs * 1.3) {
			g.fillRect(x0 + 1, y + cs * 0.2, 3, cs * 0.5);
			g.fillRect(x0 + w - 4, y + cs * 0.7, 3, cs * 0.45);
		}
	}
	for (let k = 0; k < N * ROWS; k++) {
		if (!core.mask[k]) continue;
		const r = (k / N) | 0,
			c = k % N,
			f = core.floor[k];
		const img =
			f === 0 ? FLOOR_GOLD[(r * 3 + c * 5) % FLOOR_GOLD.length] : f === 1 ? FLOOR_STONE : FLOOR_THICK;
		g.drawImage(img, c * cs + 1, r * cs + 1, cs - 2, cs - 2);
	}
	bgDirty = false;
	bgCells.clear();
}

function paintBgCells() {
	if (!bgLayer || !bgCells.size) return;
	const g = bgLayer.getContext('2d');
	g.setTransform(dpr, 0, 0, dpr, 0, 0);
	for (const k of bgCells) {
		if (!core.mask[k]) continue;
		const r = (k / N) | 0,
			c = k % N,
			f = core.floor[k];
		const img =
			f === 0 ? FLOOR_GOLD[(r * 3 + c * 5) % FLOOR_GOLD.length] : f === 1 ? FLOOR_STONE : FLOOR_THICK;
		g.drawImage(img, c * cs + 1, r * cs + 1, cs - 2, cs - 2);
	}
	bgCells.clear();
}
