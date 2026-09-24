// ---------- DOM ----------
const $ = id => document.getElementById(id);
// T() as plain text, for titles, labels and anything set with textContent
function Tplain(key, vars) {
	return plainText(T(key, vars));
}

// words from a content file as plain text, with {n} and the like filled in
function fillPlain(s, vars) {
	return plainText(fill(s, vars));
}

function plainText(html) {
	const d = document.createElement('div');
	d.innerHTML = html;
	return d.textContent;
}

const canvas = $('board'),
	ctx = canvas.getContext('2d');
let cs = 60,
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
	const cell = Math.max(20, Math.min(availW / N, availH / ROWS, 78));
	const w = Math.floor(cell * N),
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
	cs = w / N;
	forceDraw = true;
	scaledTiles.clear();
	halo = null;
	bgDirty = true;
}

const ro = new ResizeObserver(() => fit());
ro.observe(document.querySelector('.playfield'));
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 150));
fit();
