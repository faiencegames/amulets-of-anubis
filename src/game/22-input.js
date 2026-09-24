// ---------- input ----------
let drag = null;
function cellAt(e) {
	const r = canvas.getBoundingClientRect();
	const c = Math.floor((e.clientX - r.left) / cs),
		rr = Math.floor((e.clientY - r.top) / cs);
	if (c < 0 || c >= N || rr < 0 || rr >= ROWS) return -1;
	const k = rr * N + c;
	return core.mask[k] && core.cells[k] ? k : -1;
}

canvas.addEventListener('pointerdown', e => {
	if (busy) return;
	showCursor = false;
	ac();
	const k = cellAt(e);
	if (k < 0) {
		selected = -1;
		return;
	}
	if (armed >= 0) {
		useBoon(armed, k);
		return;
	}
	canvas.setPointerCapture(e.pointerId);
	if (selected >= 0 && core.adjacent(selected, k)) {
		const s = selected;
		selected = -1;
		attemptSwap(s, k);
		return;
	}
	selected = selected === k ? -1 : k;
	cursor = k;
	drag = { k, x: e.clientX, y: e.clientY };
	if (selected >= 0) {
		sfx('select', 1, (k % N) / N);
		vibrate(8);
	}
});

canvas.addEventListener('pointermove', e => {
	if (!drag || busy) return;
	const dx = e.clientX - drag.x,
		dy = e.clientY - drag.y;
	if (Math.max(Math.abs(dx), Math.abs(dy)) < cs * 0.35) return;
	const r = (drag.k / N) | 0,
		c = drag.k % N;
	let t = -1;
	if (Math.abs(dx) > Math.abs(dy)) {
		if (dx > 0 && c < N - 1) t = drag.k + 1;
		else if (dx < 0 && c > 0) t = drag.k - 1;
	} else {
		if (dy > 0 && r < ROWS - 1) t = drag.k + N;
		else if (dy < 0 && r > 0) t = drag.k - N;
	}
	const from = drag.k;
	drag = null;
	if (t >= 0 && core.mask[t] && core.cells[t]) {
		selected = -1;
		attemptSwap(from, t);
	}
});

['pointerup', 'pointercancel'].forEach(ev =>
	canvas.addEventListener(ev, () => {
		drag = null;
	})
);
canvas.addEventListener('keydown', e => {
	const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
	if (cursor < 0) {
		cursor = core.cells.findIndex(Boolean);
	}
	if (dirs[e.key]) {
		e.preventDefault();
		showCursor = true;
		const [dr, dc] = dirs[e.key];
		const r = ((cursor / N) | 0) + dr,
			c = (cursor % N) + dc;
		if (r < 0 || r >= ROWS || c < 0 || c >= N) return;
		const t = r * N + c;
		if (selected >= 0) {
			if (core.mask[t] && core.cells[t]) {
				const s = selected;
				selected = -1;
				cursor = t;
				attemptSwap(s, t);
			}
			return;
		}
		let rr = r,
			cc = c;
		while (rr >= 0 && rr < ROWS && cc >= 0 && cc < N && !core.mask[rr * N + cc]) {
			rr += dr;
			cc += dc;
		}
		if (rr >= 0 && rr < ROWS && cc >= 0 && cc < N) cursor = rr * N + cc;
	} else if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		showCursor = true;
		if (busy) return;
		if (armed >= 0) {
			useBoon(armed, cursor);
			return;
		}
		if (core.cells[cursor]) selected = selected === cursor ? -1 : cursor;
	} else if (e.key === 'Escape') {
		selected = -1;
		if (armed >= 0) {
			armed = -1;
			renderBoons();
		}
	}
});
