// ---------- update / draw ----------
const SWAP_SPEED = 7.5,
	GRAV = 38;
let last = performance.now(),
	lastDraw = 0,
	slow = 0,
	frames = 0,
	busyAnim = false,
	lastSig = '';
function idleWanted() {
	if (armed >= 0 || hint || selected >= 0 || eventState || popups.length || bgDirty || bgCells.size)
		return true;
	const cells = core ? core.cells : [];
	for (let k = 0; k < cells.length; k++) {
		const t = cells[k];
		if (t && (t.special || t.pop || t.land)) return true;
	}
	return false;
}

function frame(now) {
	const dt = Math.min(0.05, (now - last) / 1000);
	last = now;
	time += dt;
	update(dt);
	// a run of long frames means a slower device: shed the costly extras once
	if (dt > 0.028 && busyAnim) {
		if (++slow > 40 && !lowFx) {
			lowFx = true;
			fit();
		}
	} else if (++frames > 120) {
		frames = 0;
		slow = Math.max(0, slow - 1);
	}
	// Idle redraws: 30 a second (15 on a struggling device) while something on
	// the board still moves by itself (a special's glow, a badge, the selected
	// amulet, a hint, popups); when the board is truly still, 4 a second. Each
	// canvas frame is handed to the compositor whether or not it changed, so a
	// still board drawn 30 times a second was wasted work and battery.
	const idleGap = idleWanted() ? (lowFx ? 66 : 33) : 250;
	// ...and at once when a selection, boon, hint or score changes, so a still
	// board never shows a stale highlight
	const sig =
		armed +
		'|' +
		selected +
		'|' +
		(hint ? hint[0] + ',' + hint[1] : '') +
		'|' +
		(core ? core.score + ',' + core.movesLeft + ',' + core.cells.length : '') +
		'|' +
		levelIdx;
	if (sig !== lastSig) {
		lastSig = sig;
		forceDraw = true;
	}
	if (busyAnim || forceDraw || now - lastDraw > idleGap) {
		draw();
		lastDraw = now;
		forceDraw = false;
	}
	requestAnimationFrame(frame);
}

function update(dt) {
	let moving = false;
	for (let k = 0; k < N * ROWS; k++) {
		const t = core && core.cells[k];
		if (!t) continue;
		const tr = (k / N) | 0,
			tc = k % N;
		if (t.x === undefined) {
			t.x = tc;
			t.y = tr;
			t.vy = 0;
		}
		if (t.x !== tc) {
			const d = tc - t.x,
				s = SWAP_SPEED * dt;
			t.x = Math.abs(d) <= s ? tc : t.x + Math.sign(d) * s;
			moving = true;
		}
		if (t.y !== tr) {
			if (tr > t.y && !t.swapping) {
				t.vy = (t.vy || 0) + GRAV * dt;
				t.y += t.vy * dt;
				if (t.y >= tr) {
					t.y = tr;
					if (t.vy > 6) {
						t.land = 1;
						sfx('land');
					}
					t.vy = 0;
				}
			} else {
				const d = tr - t.y,
					s = SWAP_SPEED * dt;
				t.y = Math.abs(d) <= s ? tr : t.y + Math.sign(d) * s;
			}
			moving = true;
		}
		if (t.land) {
			t.land = Math.max(0, t.land - dt * 5);
		}
		if (t.pop) {
			t.pop = Math.max(0, t.pop - dt * 2.5);
		}
	}
	dying = dying.filter(d => (d.t += dt) < 0.3);
	if (dying.length) moving = true;
	if (eventState) {
		const L = eventState.lamp;
		L.x += (L.tx - L.x) * Math.min(1, dt * 2.5);
		L.y += (L.ty - L.y) * Math.min(1, dt * 2.5);
	}
	particles = particles.filter(p => {
		p.life -= dt;
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		p.vy += 3 * dt;
		return p.life > 0;
	});
	popups = popups.filter(p => {
		p.life -= dt;
		p.y -= dt * 0.7;
		return p.life > 0;
	});
	beams = beams.filter(b => (b.life -= dt * 2.4) > 0);
	rings = rings.filter(r => (r.life -= dt * 2) > 0);
	orbs = orbs.filter(o => {
		o.t += dt / o.dur;
		if (o.t >= 1) {
			flashes.set(o.to, 1);
			burst(o.to % N, (o.to / N) | 0, 5);
			return false;
		}
		return true;
	});
	if (orbs.length) moving = true;
	for (const [k, v] of flashes) {
		const nv = v - dt * 1.6;
		if (nv <= 0) flashes.delete(k);
		else flashes.set(k, nv);
	}
	busyAnim =
		(eventState && eventState.ev.fog) ||
		moving ||
		dying.length > 0 ||
		particles.length > 0 ||
		orbs.length > 0 ||
		beams.length > 0 ||
		rings.length > 0 ||
		flashes.size > 0;
	if (!moving && waiters.length) {
		const w = waiters;
		waiters = [];
		w.forEach(f => f());
	}
	if (!busy && core && !anyOverlayOpen()) {
		idleTimer += dt;
		const ha = DIFFICULTY[save.difficulty].hintAfter;
		if (ha && idleTimer > ha && !hint) {
			const m = core.allMoves();
			if (m.length) hint = m[Math.floor(Math.random() * m.length)];
		}
	}
}

// One amulet on the board. The marks of a special amulet are pictures in
// images/specials/, each a square and a half across (192 x 192 for a 128
// square), centred on the amulet; here they are only placed and animated.
function drawTile(t, x, y, scale = 1, alpha = 1, g = ctx, C = cs) {
	const size = C * 0.86 * scale,
		px = x * C + C / 2,
		py = y * C + C / 2;
	const band = t.special === 'h' || t.special === 'v',
		turn = t.special === 'v' ? Math.PI / 2 : 0;
	// put(picture, strength, grow, turn): the picture centred on the square
	const put = (img, a = 1, k = 1, rot = 0) => {
		if (!img) return;
		const w = C * 1.5 * k;
		g.save();
		g.translate(px, py);
		if (rot) g.rotate(rot);
		g.globalAlpha = alpha * a;
		g.drawImage(img, -w / 2, -w / 2, w, w);
		g.restore();
	};
	// behind the amulet
	if (t.special === 'bomb') put(SPECIAL['ring-glow'], 0.25 + 0.25 * (0.5 + 0.5 * Math.sin(time * 5)));
	if (band) {
		put(SPECIAL['band-glow'], 0.22 + 0.12 * Math.sin(time * 6), 1, turn);
		put(SPECIAL.band, 1, 1, turn);
	}
	if (t.special === 'star') put(SPECIAL['star-glow'], 0.2 + 0.14 * Math.sin(time * 5));
	g.globalAlpha = alpha;
	if (!lowFx && g === ctx && C === cs) {
		const hi = haloImg();
		g.drawImage(hi, px - C / 2, py - C / 2, C, C);
	}
	const pw = BADGES[t.special] && BADGES[t.special].colour; // the glow round a badged amulet
	if (pw) {
		const p = 0.5 + 0.5 * Math.sin(time * 4 + (t.id || 0));
		const ag = g.createRadialGradient(px, py, C * 0.1, px, py, C * 0.52);
		ag.addColorStop(0, pw + 'aa');
		ag.addColorStop(1, pw + '00');
		g.globalAlpha = alpha * (0.55 + 0.45 * p);
		g.fillStyle = ag;
		g.fillRect(px - C / 2, py - C / 2, C, C);
		g.globalAlpha = alpha;
	}
	const land = t.land || 0,
		sq = 1 - land * 0.12;
	const w = size * (1 + land * 0.08),
		h = size * sq;
	const flat = g === ctx && C === cs && !land && Math.abs(scale - 1) < 0.001;
	const cached = flat ? tileAt(TILE_SPRITES[t.type]) : null;
	if (cached) g.drawImage(cached, px - w / 2, py - h / 2, w, h);
	else if (TILE_SPRITES[t.type])
		g.drawImage(TILE_SPRITES[t.type], px - w / 2, py - h / 2 + (size - h) / 2, w, h);
	if (pw) drawBadge(g, t.special, px + C * 0.26, py + C * 0.26, C * 0.2);
	if (t.sand) put(SPECIAL[t.wet ? 'water' : 'sand']); // an amulet under sand (tombs) or water (oases)
	// in front: the band's arrows and the star's points move in and out, the ring turns
	if (band) put(SPECIAL['band-arrows'], 1, 1 + Math.sin(time * 6) * 0.068, turn);
	if (t.special === 'star') put(SPECIAL['star-points'], 1, 1 + Math.sin(time * 6) * 0.06);
	if (t.special === 'bomb') put(SPECIAL.ring, 1, 1, time * 0.8);
	g.globalAlpha = 1;
}

// A badge's picture, images/badges/<id>.svg: 96 x 96, the badge a circle of
// radius 24 in the middle, drawn here at radius r. The badges themselves are
// content files (content/badges/, BADGES in 01-core.js).

function drawBadge(g, kind, x, y, r) {
	const img = BADGE[kind];
	if (img) g.drawImage(img, x - 2 * r, y - 2 * r, 4 * r, 4 * r);
}

function draw() {
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (!core) {
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		return;
	}
	if (bgDirty) buildBg();
	else if (bgCells.size) paintBgCells();
	if (bgLayer) ctx.drawImage(bgLayer, 0, 0);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	for (const [k, fl] of flashes) {
		const r = (k / N) | 0,
			c = k % N;
		ctx.fillStyle = `rgba(255,250,210,${fl * 0.7})`;
		ctx.fillRect(c * cs + 1, r * cs + 1, cs - 2, cs - 2);
	}
	if (armed >= 0) {
		ctx.save();
		ctx.strokeStyle = 'rgba(255,214,90,' + (0.5 + 0.3 * Math.sin(time * 5)) + ')';
		ctx.lineWidth = 4;
		ctx.strokeRect(2, 2, N * cs - 4, ROWS * cs - 4);
		ctx.restore();
	}
	if (selected >= 0) {
		const r = (selected / N) | 0,
			c = selected % N;
		ctx.save();
		ctx.shadowColor = '#ffd65a';
		ctx.shadowBlur = 14;
		ctx.strokeStyle = '#ffe99a';
		ctx.lineWidth = 3;
		ctx.strokeRect(c * cs + 3, r * cs + 3, cs - 6, cs - 6);
		ctx.restore();
	}
	if (showCursor && cursor >= 0) {
		const r = (cursor / N) | 0,
			c = cursor % N;
		ctx.save();
		ctx.setLineDash([5, 4]);
		ctx.strokeStyle = '#e8f0ff';
		ctx.lineWidth = 2.5;
		ctx.strokeRect(c * cs + 5, r * cs + 5, cs - 10, cs - 10);
		ctx.restore();
	}
	for (let k = 0; k < N * ROWS; k++) {
		const t = core.cells[k];
		if (!t || t.x === undefined) continue;
		let x = t.x,
			y = t.y,
			sc = 1 + (t.pop || 0) * 0.3;
		if (hint && (hint[0] === k || hint[1] === k)) {
			const o = hint[0] === k ? hint[1] : hint[0];
			const dx = (o % N) - (k % N),
				dy = ((o / N) | 0) - ((k / N) | 0);
			const w = Math.max(0, Math.sin(time * 9)) * 0.09;
			x += dx * w;
			y += dy * w;
		}
		if (k === selected) sc *= 1 + 0.06 * Math.sin(time * 7) + 0.04;
		if (y < -1) continue;
		drawTile(t, x, y, sc);
	}
	dying.forEach(d => {
		const p = d.t / 0.3;
		drawTile(d.tile, d.x, d.y, 1 + p * 0.35, 1 - p);
	});
	beams.forEach(b => {
		if (b.dir === 'd1' || b.dir === 'd2') {
			ctx.save();
			const th = cs * 0.6 * b.life,
				L = Math.hypot(N, ROWS) * cs;
			ctx.translate(b.c * cs + cs / 2, b.r * cs + cs / 2);
			ctx.rotate(b.dir === 'd1' ? Math.PI / 4 : -Math.PI / 4);
			const g = ctx.createLinearGradient(0, -th / 2, 0, th / 2);
			g.addColorStop(0, 'rgba(170,210,255,0)');
			g.addColorStop(0.5, `rgba(235,245,255,${b.life})`);
			g.addColorStop(1, 'rgba(170,210,255,0)');
			ctx.fillStyle = g;
			ctx.fillRect(-L, -th / 2, 2 * L, th);
			ctx.restore();
			return;
		}
		ctx.save();
		const th = cs * 0.7 * b.life;
		const g =
			b.dir === 'h'
				? ctx.createLinearGradient(0, b.idx * cs + cs / 2 - th / 2, 0, b.idx * cs + cs / 2 + th / 2)
				: ctx.createLinearGradient(b.idx * cs + cs / 2 - th / 2, 0, b.idx * cs + cs / 2 + th / 2, 0);
		g.addColorStop(0, 'rgba(255,200,80,0)');
		g.addColorStop(0.5, `rgba(255,250,215,${b.life})`);
		g.addColorStop(1, 'rgba(255,200,80,0)');
		ctx.fillStyle = g;
		if (b.dir === 'h') ctx.fillRect(0, b.idx * cs + cs / 2 - th / 2, N * cs, th);
		else ctx.fillRect(b.idx * cs + cs / 2 - th / 2, 0, th, ROWS * cs);
		ctx.restore();
	});
	rings.forEach(r => {
		ctx.strokeStyle = `rgba(255,225,140,${r.life})`;
		ctx.lineWidth = cs * 0.18 * r.life;
		ctx.beginPath();
		ctx.arc(
			r.x * cs + cs / 2,
			r.y * cs + cs / 2,
			cs * (r.big ? 4 : 1.6) * (1 - r.life) + cs * 0.3,
			0,
			TAU
		);
		ctx.stroke();
	});
	orbs.forEach(o => {
		const x0 = (o.from % N) + 0.5,
			y0 = ((o.from / N) | 0) + 0.5,
			x1 = (o.to % N) + 0.5,
			y1 = ((o.to / N) | 0) + 0.5,
			e = o.t < 0 ? 0 : o.t,
			mx = (x0 + x1) / 2,
			my = Math.min(y0, y1) - 1.8;
		const x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * mx + e * e * x1,
			y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * my + e * e * y1;
		const og = ctx.createRadialGradient(x * cs, y * cs, 0, x * cs, y * cs, cs * 0.35);
		og.addColorStop(0, 'rgba(255,255,230,1)');
		og.addColorStop(0.35, 'rgba(255,214,90,.9)');
		og.addColorStop(1, 'rgba(255,180,40,0)');
		ctx.fillStyle = og;
		ctx.beginPath();
		ctx.arc(x * cs, y * cs, cs * 0.35, 0, TAU);
		ctx.fill();
	});
	particles.forEach(p => {
		const a = Math.min(1, p.life * 2);
		ctx.fillStyle = p.col;
		ctx.globalAlpha = a;
		const s = p.s * cs;
		ctx.save();
		ctx.translate(p.x * cs, p.y * cs);
		ctx.rotate(p.life * 6);
		ctx.fillRect(-s / 2, -s / 8, s, s / 4);
		ctx.fillRect(-s / 8, -s / 2, s / 4, s);
		ctx.restore();
	});
	ctx.globalAlpha = 1;
	if (eventState && eventState.ev.torch) {
		// a chamber: dim, lit by two torches at the top corners, gently pulsing
		const L = torchLayer();
		ctx.globalAlpha = 0.95 + 0.05 * Math.sin(time * 1.9); // a slow pulse of torchlight ctx.drawImage(L,0,0,N*cs,ROWS*cs); ctx.globalAlpha=1;
	}
	if (eventState && eventState.ev.fog) {
		// the night crossing: only lamplight shows the board
		const L = eventState.lamp,
			x = L.x * cs,
			y = L.y * cs,
			r = cs * (2.9 + Math.sin(time * 2.3) * 0.12);
		const fg = ctx.createRadialGradient(x, y, r * 0.35, x, y, r);
		fg.addColorStop(0, 'rgba(8,8,20,0)');
		fg.addColorStop(0.6, 'rgba(8,8,20,.55)');
		fg.addColorStop(1, 'rgba(6,6,16,.95)');
		ctx.fillStyle = fg;
		ctx.fillRect(0, 0, N * cs, ROWS * cs);
	}
	popups.forEach(p => {
		const a = Math.min(1, p.life * 2);
		ctx.globalAlpha = a;
		ctx.font = `400 ${p.size * cs}px 'IM Fell Double Pica', Georgia, serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const half = ctx.measureText(p.text).width / 2 + cs * 0.15,
			x = Math.min(Math.max(p.x * cs, half), N * cs - half),
			y = Math.min(Math.max(p.y * cs, cs * 0.4), ROWS * cs - cs * 0.4);
		ctx.lineWidth = cs * 0.08;
		ctx.strokeStyle = '#2b1606';
		ctx.strokeText(p.text, x, y);
		ctx.fillStyle = p.col || '#ffe38a';
		ctx.fillText(p.text, x, y);
	});
	ctx.globalAlpha = 1;
}

// The chamber's darkness, made once per board size (gradients each frame are
// too dear on a phone): a dim wash, darker at the edges, with the warm light of
// two torches falling from the top corners.
let torchCache = null;
function torchLayer() {
	const w = Math.round(N * cs * dpr),
		h = Math.round(ROWS * cs * dpr),
		key = w + 'x' + h;
	if (torchCache && torchCache.key === key) return torchCache.c;
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	const g = c.getContext('2d');
	g.fillStyle = 'rgba(16,9,3,.42)';
	g.fillRect(0, 0, w, h);
	const v = g.createRadialGradient(
		w / 2,
		h * 0.55,
		Math.min(w, h) * 0.25,
		w / 2,
		h * 0.55,
		Math.max(w, h) * 0.75
	);
	v.addColorStop(0, 'rgba(10,5,1,0)');
	v.addColorStop(1, 'rgba(10,5,1,.7)');
	g.fillStyle = v;
	g.fillRect(0, 0, w, h);
	for (const x of [0, w]) {
		const t = g.createRadialGradient(x, 0, 0, x, 0, Math.max(w, h) * 0.6);
		t.addColorStop(0, 'rgba(255,170,70,.22)');
		t.addColorStop(1, 'rgba(255,150,50,0)');
		g.fillStyle = t;
		g.fillRect(0, 0, w, h);
	}
	torchCache = { key, c };
	return c;
}
