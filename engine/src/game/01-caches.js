/* =============================================================================
 * 01-caches.js  —  the drawing caches that keep the game smooth on a phone.
 *
 * The floor, its shadows and the amulet pictures don't change between moves,
 * so they are drawn once into offscreen canvases and copied onto the board
 * each frame. Anything that changes the floor (core.floor) must set
 * bgDirty = true, or the old floor stays on screen.
 *
 * What's here:
 *   buildBg(), bgLayer  the floor and its shadows, drawn once (19-draw.js)
 *   bgDirty, bgCells    "draw the whole floor again" and "draw these squares
 *                       again"
 *   scaledTiles, tileAt() the amulet pictures, scaled to the square size
 *   haloImg()           the glow round a chosen amulet
 *   RIVER_CHANNEL       the colours of the water down an Omega board
 *                       (content/settings.jsonc, "river_channel")
 *   lowFx               fewer effects: chosen in Settings, or turned on for a
 *                       slow phone (fewerEffects(), 19-draw.js)
 *
 * Changes in the save: nothing.
 * ===========================================================================*/

// ---------- drawing caches ----------
// The floor, its shadows and the amulet sprites never change between moves, so
// they are drawn once into offscreen canvases and blitted each frame. This is
// what keeps the game smooth on a mid-range phone.
let bgLayer = null,
	bgDirty = true,
	haloCanvas = null,
	lowFx = fewerEffects(),
	forceDraw = true;
const bgCells = new Set(); // squares to repaint on the floor layer without redrawing all of it
const RIVER_CHANNEL = CONTENT.settings.riverChannel; // edge, middle, ripples, reeds (or 'none')
const scaledTiles = new Map();
function tileAt(sprite, key) {
	const px = Math.round(squareSize * 0.86 * dpr);
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
	const px = Math.max(4, Math.round(squareSize * dpr));
	if (haloCanvas && haloCanvas.width === px) return haloCanvas;
	haloCanvas = document.createElement('canvas');
	haloCanvas.width = haloCanvas.height = px;
	const pen = haloCanvas.getContext('2d'),
		r = px * 0.46,
		cx = px / 2,
		cy = px / 2 + px * 0.04;
	const hg = pen.createRadialGradient(cx, cy, px * 0.1, cx, cy, r);
	hg.addColorStop(0, 'rgba(30,14,0,.3)');
	hg.addColorStop(1, 'rgba(30,14,0,0)');
	pen.fillStyle = hg;
	pen.beginPath();
	pen.arc(cx, cy, r, 0, TAU);
	pen.fill();
	return haloCanvas;
}

function buildBg() {
	if (!core || !canvas.width) return;
	if (!bgLayer) bgLayer = document.createElement('canvas');
	bgLayer.width = canvas.width;
	bgLayer.height = canvas.height;
	const pen = bgLayer.getContext('2d');
	pen.setTransform(dpr, 0, 0, dpr, 0, 0);
	// the shading over the board backing (seen in the gaps): a vignette and a
	// soft inner shadow round the edge. Wide screens only; phones run edge to
	// edge and look better flat. Once per layer build, never per frame.
	if (!matchMedia('(max-width: 860px)').matches) {
		const W = COLS * squareSize,
			H = ROWS * squareSize;
		const vg = pen.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.hypot(W, H) * 0.56);
		vg.addColorStop(0, 'rgba(0,0,0,0)');
		vg.addColorStop(0.4, 'rgba(0,0,0,0)');
		vg.addColorStop(1, 'rgba(0,0,0,.35)');
		pen.fillStyle = vg;
		pen.fillRect(0, 0, W, H);
		const e = 26;
		[
			[0, 0, W, e, 0, 0, 0, e],
			[0, H - e, W, e, 0, H, 0, H - e],
			[0, 0, e, H, 0, 0, e, 0],
			[W - e, 0, e, H, W, 0, W - e, 0],
		].forEach(([x, y, w, h, x0, y0, x1, y1]) => {
			const lg = pen.createLinearGradient(x0, y0, x1, y1);
			lg.addColorStop(0, 'rgba(0,0,0,.55)');
			lg.addColorStop(1, 'rgba(0,0,0,0)');
			pen.fillStyle = lg;
			pen.fillRect(x, y, w, h);
		});
		pen.strokeStyle = 'rgba(0,0,0,.5)';
		pen.lineWidth = 2;
		pen.strokeRect(1, 1, W - 2, H - 2);
	}
	pen.save();
	pen.shadowColor = 'rgba(0,0,0,.6)';
	pen.shadowBlur = squareSize * 0.35;
	pen.shadowOffsetY = squareSize * 0.06;
	pen.fillStyle = '#1a1006';
	pen.beginPath();
	for (let sq = 0; sq < COLS * ROWS; sq++)
		if (core.mask[sq])
			pen.rect((sq % COLS) * squareSize, ((sq / COLS) | 0) * squareSize, squareSize, squareSize);
	pen.fill();
	pen.restore();
	const river = riverCols();
	if (river.length) {
		const x0 = river[0] * squareSize,
			w = river.length * squareSize,
			h = ROWS * squareSize;
		const wg = pen.createLinearGradient(x0, 0, x0 + w, 0);
		// its colours: content/settings.jsonc, "river_channel"
		wg.addColorStop(0, RIVER_CHANNEL.edge);
		wg.addColorStop(0.5, RIVER_CHANNEL.middle);
		wg.addColorStop(1, RIVER_CHANNEL.edge);
		pen.fillStyle = wg;
		pen.fillRect(x0 + 2, 0, w - 4, h);
		pen.strokeStyle = RIVER_CHANNEL.ripples;
		pen.lineWidth = 1.5;
		for (let y = squareSize * 0.4; y < h; y += squareSize * 0.55) {
			const off = ((y / squareSize) * 37) % (w * 0.5);
			pen.beginPath();
			pen.moveTo(x0 + 6 + off * 0.3, y);
			pen.quadraticCurveTo(x0 + w * 0.3 + off * 0.2, y - 4, x0 + w * 0.5, y);
			pen.quadraticCurveTo(x0 + w * 0.7, y + 4, x0 + w - 6, y);
			pen.stroke();
		}
		// reeds along the banks, unless the game has none
		if (RIVER_CHANNEL.reeds !== 'none') {
			pen.fillStyle = RIVER_CHANNEL.reeds;
			for (let y = 0; y < h; y += squareSize * 1.3) {
				pen.fillRect(x0 + 1, y + squareSize * 0.2, 3, squareSize * 0.5);
				pen.fillRect(x0 + w - 4, y + squareSize * 0.7, 3, squareSize * 0.45);
			}
		}
	}
	for (let sq = 0; sq < COLS * ROWS; sq++) {
		if (!core.mask[sq]) continue;
		const row = (sq / COLS) | 0,
			col = sq % COLS,
			f = core.floor[sq];
		const img =
			f === 0
				? FLOOR_GOLD[(row * 3 + col * 5) % FLOOR_GOLD.length]
				: f === 1
					? FLOOR_STONE
					: FLOOR_THICK;
		pen.drawImage(img, col * squareSize + 1, row * squareSize + 1, squareSize - 2, squareSize - 2);
	}
	bgDirty = false;
	bgCells.clear();
	bgLayer.glDirty = true; // a WebGL board uploads it again (02-board-pen.js)
}

function paintBgCells() {
	if (!bgLayer || !bgCells.size) return;
	const pen = bgLayer.getContext('2d');
	pen.setTransform(dpr, 0, 0, dpr, 0, 0);
	for (const sq of bgCells) {
		if (!core.mask[sq]) continue;
		const row = (sq / COLS) | 0,
			col = sq % COLS,
			f = core.floor[sq];
		const img =
			f === 0
				? FLOOR_GOLD[(row * 3 + col * 5) % FLOOR_GOLD.length]
				: f === 1
					? FLOOR_STONE
					: FLOOR_THICK;
		pen.drawImage(img, col * squareSize + 1, row * squareSize + 1, squareSize - 2, squareSize - 2);
	}
	bgCells.clear();
	bgLayer.glDirty = true;
}
