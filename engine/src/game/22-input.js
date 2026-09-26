/* =============================================================================
 * 22-input.js: the player's hands on the board: tapping, dragging and the
 * keyboard.
 *
 * What's here:
 *   cellAt(e)           the square under the finger or the mouse
 *   the pointer events  tap two amulets, or drag one onto its neighbour,
 *                       to swap them (attemptSwap(), 21-moves.js); with a
 *                       boon ready, a tap uses it (useBoon(),
 *                       07-trials-boons.js)
 *   the keyboard        arrows move a cursor, Enter or Space picks, Escape
 *                       lets go
 *
 * Changes in the save: nothing.
 * ===========================================================================*/

// ---------- input ----------
let drag = null;
function cellAt(e) {
	const r = canvas.getBoundingClientRect();
	const col = Math.floor((e.clientX - r.left) / squareSize),
		rr = Math.floor((e.clientY - r.top) / squareSize);
	if (col < 0 || col >= COLS || rr < 0 || rr >= ROWS) return -1;
	const sq = rr * COLS + col;
	return core.mask[sq] && core.cells[sq] ? sq : -1;
}

canvas.addEventListener('pointerdown', e => {
	if (busy) return;
	showCursor = false;
	getCtx();
	const sq = cellAt(e);
	if (sq < 0) {
		selected = -1;
		return;
	}
	if (armed >= 0) {
		useBoon(armed, sq);
		return;
	}
	canvas.setPointerCapture(e.pointerId);
	if (selected >= 0 && core.adjacent(selected, sq)) {
		const s = selected;
		selected = -1;
		attemptSwap(s, sq);
		return;
	}
	selected = selected === sq ? -1 : sq;
	cursor = sq;
	drag = { k: sq, x: e.clientX, y: e.clientY };
	if (selected >= 0) {
		sfx('select', 1, (sq % COLS) / COLS);
		vibrate(8);
	}
});

canvas.addEventListener('pointermove', e => {
	if (!drag || busy) return;
	const dx = e.clientX - drag.x,
		dy = e.clientY - drag.y;
	if (Math.max(Math.abs(dx), Math.abs(dy)) < squareSize * 0.35) return;
	const row = (drag.k / COLS) | 0,
		col = drag.k % COLS;
	let t = -1;
	if (Math.abs(dx) > Math.abs(dy)) {
		if (dx > 0 && col < COLS - 1) t = drag.k + 1;
		else if (dx < 0 && col > 0) t = drag.k - 1;
	} else {
		if (dy > 0 && row < ROWS - 1) t = drag.k + COLS;
		else if (dy < 0 && row > 0) t = drag.k - COLS;
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
	}),
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
		const row = ((cursor / COLS) | 0) + dr,
			col = (cursor % COLS) + dc;
		if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
		const sq = row * COLS + col;
		if (selected >= 0) {
			if (core.mask[sq] && core.cells[sq]) {
				const s = selected;
				selected = -1;
				cursor = sq;
				attemptSwap(s, sq);
			}
			return;
		}
		let rr = row,
			cc = col;
		while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && !core.mask[rr * COLS + cc]) {
			rr += dr;
			cc += dc;
		}
		if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) cursor = rr * COLS + cc;
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
