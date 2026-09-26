/* =============================================================================
 * 02-screen.js: the page and the board's size on it.
 *
 * What's here:
 *   $(id)               document.getElementById, used everywhere
 *   html`...`           HTML laid out over several lines for reading; the
 *                       line breaks are dropped before it reaches the page
 *   Tplain(), fillPlain() words from content/ as plain text, for titles and
 *                       labels (T() in 01-core.js gives them with bold and
 *                       italics)
 *   canvas, ctx         the board's canvas and its drawing context
 *   cs, dpr             the size of a square in pixels and the screen's
 *                       pixel density
 *   fit()               sizes the board to the window; runs on every resize
 *
 * Changes in the save: nothing.
 * ===========================================================================*/

// ---------- DOM ----------
const $ = id => document.getElementById(id);

// html`...`: HTML written over several lines, for reading. The line breaks
// and the indentation after them are dropped, so the page gets exactly the
// HTML as if it were written on one line. (A space that should show must be
// written before the line break.)
const html = (strings, ...values) =>
	strings.reduce(
		(out, s, i) => out + s.replace(/\n[\t ]*/g, '') + (i < values.length ? values[i] : ''),
		'',
	);

// T() as plain text, for titles, labels and anything set with textContent
function Tplain(key, vars) {
	return plainText(T(key, vars));
}

// words from a content file as plain text, with {n} and the like filled in
function fillPlain(s, vars) {
	return plainText(fill(s, vars));
}

function plainText(markup) {
	const d = document.createElement('div');
	d.innerHTML = markup;
	return d.textContent;
}

const canvas = $('board'),
	ctx = makeBoardPen(canvas); // 02-board-pen.js: WebGL where chosen, else 2D
let squareSize = 60,
	dpr = 1;
function fit() {
	const pf = document.querySelector('.playfield'),
		frame = document.querySelector('.board-frame'),
		tube = $('tube');
	if (!pf) return;
	const st = getComputedStyle(frame);
	const side = parseFloat(st.paddingLeft) * 2 + parseFloat(st.borderLeftWidth) * 2;
	const chromeH = frameChrome();
	const tw = tube.getBoundingClientRect().width,
		gap = tw ? parseFloat(getComputedStyle(pf).gap) || 0 : 0;
	const availW = pf.clientWidth - tw - gap - side;
	const availH = pf.clientHeight - chromeH;
	const cell = Math.max(20, Math.min(availW / COLS, availH / ROWS, 78));
	const w = Math.floor(cell * COLS),
		h = Math.floor(cell * ROWS);
	canvas.style.width = w + 'px';
	canvas.style.height = h + 'px';
	tube.style.height = h + chromeH + 'px';
	dpr = Math.min(window.devicePixelRatio || 1, lowFx ? 1.5 : 2);
	// very large boards: keep the canvas to about two million pixels, which is
	// what the browser has to push to the screen on every frame
	dpr = Math.max(1, Math.min(dpr, Math.sqrt(2.1e6 / (w * h))));
	canvas.width = Math.round(w * dpr);
	canvas.height = Math.round(h * dpr);
	squareSize = w / COLS;
	forceDraw = true;
	scaledTiles.clear();
	haloCanvas = null;
	bgDirty = true;
	if (ctx.reset && ctx.isGL) ctx.reset();
}

const resizeWatcher = new ResizeObserver(() => fit());
resizeWatcher.observe(document.querySelector('.playfield'));
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 150));
fit();
