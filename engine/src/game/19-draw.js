/* =============================================================================
 * 19-draw.js: the game loop: moving things and drawing the board every
 * frame.
 *
 * What's here:
 *   frame()             runs every frame (30-boot.js starts it): update(),
 *                       then draw(). Frames slow down when nothing moves
 *                       (idleWanted()), to save the battery.
 *   update()            moves falling and swapping amulets and the effects
 *   draw()              paints the board: the cached floor (01-caches.js),
 *                       the amulets, badges, effects and popups
 *   drawTile()          one amulet, with the mark of a special (How to play
 *                       uses it too)
 *   fewerEffects(),     fewer effects: the Settings choice and the careful
 *   setEffects(),       automatic that watches cascades on a slow phone
 *   watchEffects()
 *
 * Don't make gradients or shadows here per square per frame: cache them
 * (the manual, part 2, "Performance").
 *
 * Changes in the save: nothing (fewer effects is kept in this browser).
 * ===========================================================================*/

// ---------- update / draw ----------
const SWAP_SPEED = 7.5,
	GRAV = 38;
let lastFrameTime = performance.now(),
	lastDraw = 0,
	busyAnim = false,
	lastSig = '';
// ---------- fewer effects ----------
// Settings, "Effects" ('effects', a device setting, 00-open.js): 'full',
// 'fewer', or 'auto'. Automatic turns them down only on a phone that reports
// 4 GB of memory or less, where at least a fifth of the frames during
// cascades were slow, at two different stops ('effects-slow' keeps
// which). A good phone never meets the first condition, so a hitch or two
// can never cost it its effects.
let effectsChoice = deviceSetting('effects', 'auto');
const fxWatch = { frames: 0, slow: 0 };
function fewerEffects() {
	const choice = deviceSetting('effects', 'auto');
	return choice === 'fewer' || (choice === 'auto' && deviceSetting('effects-auto', '') === 'on');
}
function setEffects(choice) {
	effectsChoice = choice;
	setDeviceSetting('effects', choice);
	if (lowFx !== fewerEffects()) {
		lowFx = !lowFx;
		fit();
	}
}
function watchEffects(dt) {
	if (lowFx || effectsChoice !== 'auto' || !(navigator.deviceMemory <= 4)) return;
	fxWatch.frames++;
	if (dt > 0.028) fxWatch.slow++;
	if (fxWatch.frames < 240) return;
	const stop = LEVELS[levelIdx] && LEVELS[levelIdx].id;
	if (fxWatch.slow * 5 >= fxWatch.frames && stop) {
		const stops = deviceSetting('effects-slow', '').split(' ').filter(Boolean);
		if (!stops.includes(stop)) stops.push(stop);
		setDeviceSetting('effects-slow', stops.join(' '));
		if (stops.length >= 2) {
			setDeviceSetting('effects-auto', 'on');
			lowFx = true;
			fit();
			announce(
				T('settings.fx_auto_label'),
				T('settings.fx_auto_name'),
				'',
				T('settings.fx_auto_extra'),
			);
		}
	}
	fxWatch.frames = fxWatch.slow = 0;
}

// 2: something moves that should be smooth; 1: only the specials' slow glow;
// 0: the board is still
function idleWanted() {
	if (armed >= 0 || hint || selected >= 0 || eventState || popups.length || bgDirty || bgCells.size)
		return 2;
	const cells = core ? core.cells : [];
	let glow = 0;
	for (let sq = 0; sq < cells.length; sq++) {
		const tile = cells[sq];
		if (tile && (tile.pop || tile.land)) return 2;
		if (tile && tile.special) glow = 1;
	}
	return glow;
}

function frame(now) {
	const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
	lastFrameTime = now;
	animTime += dt;
	update(dt);
	if (busyAnim) watchEffects(dt);
	// Idle redraws: 30 a second (15 on a struggling device) while something on
	// the board still moves by itself (a badge, the selected amulet, a hint,
	// popups); 12 a second when only the specials' slow glow moves (nearly
	// always, and it still looks smooth); when the board is truly still, 4 a
	// second. Each
	// canvas frame is handed to the compositor whether or not it changed, so a
	// still board drawn 30 times a second was wasted work and battery.
	const want = idleWanted(),
		idleGap = want === 2 ? (lowFx ? 66 : 33) : want === 1 ? 83 : 250;
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
	for (let sq = 0; sq < COLS * ROWS; sq++) {
		const tile = core && core.cells[sq];
		if (!tile) continue;
		const tr = (sq / COLS) | 0,
			tc = sq % COLS;
		if (tile.x === undefined) {
			tile.x = tc;
			tile.y = tr;
			tile.vy = 0;
		}
		if (tile.x !== tc) {
			const d = tc - tile.x,
				s = SWAP_SPEED * dt;
			tile.x = Math.abs(d) <= s ? tc : tile.x + Math.sign(d) * s;
			moving = true;
		}
		if (tile.y !== tr) {
			if (tr > tile.y && !tile.swapping) {
				tile.vy = (tile.vy || 0) + GRAV * dt;
				tile.y += tile.vy * dt;
				if (tile.y >= tr) {
					tile.y = tr;
					if (tile.vy > 6) {
						tile.land = 1;
						sfx('land');
					}
					tile.vy = 0;
				}
			} else {
				const d = tr - tile.y,
					s = SWAP_SPEED * dt;
				tile.y = Math.abs(d) <= s ? tr : tile.y + Math.sign(d) * s;
			}
			moving = true;
		}
		if (tile.land) {
			tile.land = Math.max(0, tile.land - dt * 5);
		}
		if (tile.pop) {
			tile.pop = Math.max(0, tile.pop - dt * 2.5);
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
			burst(o.to % COLS, (o.to / COLS) | 0, 5);
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
function drawTile(tile, x, y, scale = 1, alpha = 1, pen = ctx, C = squareSize) {
	const size = C * 0.86 * scale,
		px = x * C + C / 2,
		py = y * C + C / 2;
	const band = tile.special === 'h' || tile.special === 'v',
		turn = tile.special === 'v' ? Math.PI / 2 : 0;
	// put(picture, strength, grow, turn): the picture centred on the square
	const put = (img, a = 1, k = 1, rot = 0) => {
		if (!img) return;
		const w = C * 1.5 * k;
		pen.save();
		pen.translate(px, py);
		if (rot) pen.rotate(rot);
		pen.globalAlpha = alpha * a;
		pen.drawImage(img, -w / 2, -w / 2, w, w);
		pen.restore();
	};
	// behind the amulet
	if (tile.special === 'bomb')
		put(SPECIAL['ring-glow'], 0.25 + 0.25 * (0.5 + 0.5 * Math.sin(animTime * 5)));
	if (band) {
		put(SPECIAL['band-glow'], 0.22 + 0.12 * Math.sin(animTime * 6), 1, turn);
		put(SPECIAL.band, 1, 1, turn);
	}
	if (tile.special === 'star') put(SPECIAL['star-glow'], 0.2 + 0.14 * Math.sin(animTime * 5));
	pen.globalAlpha = alpha;
	if (!lowFx && pen === ctx && C === squareSize) {
		const hi = haloImg();
		pen.drawImage(hi, px - C / 2, py - C / 2, C, C);
	}
	const pw = BADGES[tile.special] && BADGES[tile.special].colour; // the glow round a badged amulet
	if (pw) {
		const p = 0.5 + 0.5 * Math.sin(animTime * 4 + (tile.id || 0));
		const ag = pen.createRadialGradient(px, py, C * 0.1, px, py, C * 0.52);
		ag.addColorStop(0, pw + 'aa');
		ag.addColorStop(1, pw + '00');
		pen.globalAlpha = alpha * (0.55 + 0.45 * p);
		pen.fillStyle = ag;
		pen.fillRect(px - C / 2, py - C / 2, C, C);
		pen.globalAlpha = alpha;
	}
	const land = tile.land || 0,
		sq = 1 - land * 0.12;
	const w = size * (1 + land * 0.08),
		h = size * sq;
	const flat = pen === ctx && C === squareSize && !land && Math.abs(scale - 1) < 0.001;
	const cached = flat ? tileAt(TILE_SPRITES[tile.type]) : null;
	if (cached) pen.drawImage(cached, px - w / 2, py - h / 2, w, h);
	else if (TILE_SPRITES[tile.type])
		pen.drawImage(TILE_SPRITES[tile.type], px - w / 2, py - h / 2 + (size - h) / 2, w, h);
	if (pw) drawBadge(pen, tile.special, px + C * 0.26, py + C * 0.26, C * 0.2);
	if (tile.cover) put(coverPicture(tile)); // an amulet under a cover (content/covers/)
	// in front: the band's arrows and the star's points move in and out, the ring turns
	if (band) put(SPECIAL['band-arrows'], 1, 1 + Math.sin(animTime * 6) * 0.068, turn);
	if (tile.special === 'star') put(SPECIAL['star-points'], 1, 1 + Math.sin(animTime * 6) * 0.06);
	if (tile.special === 'bomb') put(SPECIAL.ring, 1, 1, animTime * 0.8);
	pen.globalAlpha = 1;
}

// A badge's picture, images/badges/<id>.svg: 96 x 96, the badge a circle of
// radius 24 in the middle, drawn here at radius r. The badges themselves are
// content files (content/badges/, BADGES in 01-core.js).

function drawBadge(pen, kind, x, y, r) {
	const img = BADGE[kind];
	if (img) pen.drawImage(img, x - 2 * r, y - 2 * r, 4 * r, 4 * r);
}

function draw() {
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (!core) {
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		if (ctx.isGL) ctx.flush();
		return;
	}
	if (bgDirty) buildBg();
	else if (bgCells.size) paintBgCells();
	if (bgLayer) ctx.drawImage(bgLayer, 0, 0);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	for (const [k, fl] of flashes) {
		const row = (k / COLS) | 0,
			col = k % COLS;
		ctx.fillStyle = `rgba(255,250,210,${fl * 0.7})`;
		ctx.fillRect(col * squareSize + 1, row * squareSize + 1, squareSize - 2, squareSize - 2);
	}
	if (armed >= 0) {
		ctx.save();
		ctx.strokeStyle = 'rgba(255,214,90,' + (0.5 + 0.3 * Math.sin(animTime * 5)) + ')';
		ctx.lineWidth = 4;
		ctx.strokeRect(2, 2, COLS * squareSize - 4, ROWS * squareSize - 4);
		ctx.restore();
	}
	if (selected >= 0) {
		const row = (selected / COLS) | 0,
			col = selected % COLS;
		ctx.save();
		ctx.shadowColor = '#ffd65a';
		ctx.shadowBlur = 14;
		ctx.strokeStyle = '#ffe99a';
		ctx.lineWidth = 3;
		ctx.strokeRect(col * squareSize + 3, row * squareSize + 3, squareSize - 6, squareSize - 6);
		ctx.restore();
	}
	if (showCursor && cursor >= 0) {
		const row = (cursor / COLS) | 0,
			col = cursor % COLS;
		ctx.save();
		ctx.setLineDash([5, 4]);
		ctx.strokeStyle = '#e8f0ff';
		ctx.lineWidth = 2.5;
		ctx.strokeRect(col * squareSize + 5, row * squareSize + 5, squareSize - 10, squareSize - 10);
		ctx.restore();
	}
	for (let sq = 0; sq < COLS * ROWS; sq++) {
		const tile = core.cells[sq];
		if (!tile || tile.x === undefined) continue;
		let x = tile.x,
			y = tile.y,
			sc = 1 + (tile.pop || 0) * 0.3;
		if (hint && (hint[0] === sq || hint[1] === sq)) {
			const o = hint[0] === sq ? hint[1] : hint[0];
			const dx = (o % COLS) - (sq % COLS),
				dy = ((o / COLS) | 0) - ((sq / COLS) | 0);
			const w = Math.max(0, Math.sin(animTime * 9)) * 0.09;
			x += dx * w;
			y += dy * w;
		}
		if (sq === selected) sc *= 1 + 0.06 * Math.sin(animTime * 7) + 0.04;
		if (y < -1) continue;
		drawTile(tile, x, y, sc);
	}
	dying.forEach(d => {
		const p = d.t / 0.3;
		drawTile(d.tile, d.x, d.y, 1 + p * 0.35, 1 - p);
	});
	beams.forEach(b => {
		if (b.dir === 'd1' || b.dir === 'd2') {
			ctx.save();
			const th = squareSize * 0.6 * b.life,
				L = Math.hypot(COLS, ROWS) * squareSize;
			ctx.translate(b.c * squareSize + squareSize / 2, b.r * squareSize + squareSize / 2);
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
		const th = squareSize * 0.7 * b.life;
		const g =
			b.dir === 'h'
				? ctx.createLinearGradient(
						0,
						b.idx * squareSize + squareSize / 2 - th / 2,
						0,
						b.idx * squareSize + squareSize / 2 + th / 2,
					)
				: ctx.createLinearGradient(
						b.idx * squareSize + squareSize / 2 - th / 2,
						0,
						b.idx * squareSize + squareSize / 2 + th / 2,
						0,
					);
		g.addColorStop(0, 'rgba(255,200,80,0)');
		g.addColorStop(0.5, `rgba(255,250,215,${b.life})`);
		g.addColorStop(1, 'rgba(255,200,80,0)');
		ctx.fillStyle = g;
		if (b.dir === 'h')
			ctx.fillRect(0, b.idx * squareSize + squareSize / 2 - th / 2, COLS * squareSize, th);
		else ctx.fillRect(b.idx * squareSize + squareSize / 2 - th / 2, 0, th, ROWS * squareSize);
		ctx.restore();
	});
	rings.forEach(r => {
		ctx.strokeStyle = `rgba(255,225,140,${r.life})`;
		ctx.lineWidth = squareSize * 0.18 * r.life;
		ctx.beginPath();
		ctx.arc(
			r.x * squareSize + squareSize / 2,
			r.y * squareSize + squareSize / 2,
			squareSize * (r.big ? 4 : 1.6) * (1 - r.life) + squareSize * 0.3,
			0,
			TAU,
		);
		ctx.stroke();
	});
	orbs.forEach(o => {
		const x0 = (o.from % COLS) + 0.5,
			y0 = ((o.from / COLS) | 0) + 0.5,
			x1 = (o.to % COLS) + 0.5,
			y1 = ((o.to / COLS) | 0) + 0.5,
			e = o.t < 0 ? 0 : o.t,
			mx = (x0 + x1) / 2,
			my = Math.min(y0, y1) - 1.8;
		const x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * mx + e * e * x1,
			y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * my + e * e * y1;
		const og = ctx.createRadialGradient(
			x * squareSize,
			y * squareSize,
			0,
			x * squareSize,
			y * squareSize,
			squareSize * 0.35,
		);
		og.addColorStop(0, 'rgba(255,255,230,1)');
		og.addColorStop(0.35, 'rgba(255,214,90,.9)');
		og.addColorStop(1, 'rgba(255,180,40,0)');
		ctx.fillStyle = og;
		ctx.beginPath();
		ctx.arc(x * squareSize, y * squareSize, squareSize * 0.35, 0, TAU);
		ctx.fill();
	});
	particles.forEach(p => {
		const a = Math.min(1, p.life * 2);
		ctx.fillStyle = p.col;
		ctx.globalAlpha = a;
		const s = p.s * squareSize;
		ctx.save();
		ctx.translate(p.x * squareSize, p.y * squareSize);
		ctx.rotate(p.life * 6);
		ctx.fillRect(-s / 2, -s / 8, s, s / 4);
		ctx.fillRect(-s / 8, -s / 2, s / 4, s);
		ctx.restore();
	});
	ctx.globalAlpha = 1;
	if (eventState && eventState.ev.fog) {
		// the night crossing: only lamplight shows the board
		const L = eventState.lamp,
			x = L.x * squareSize,
			y = L.y * squareSize,
			r = squareSize * (2.9 + Math.sin(animTime * 2.3) * 0.12);
		const fg = ctx.createRadialGradient(x, y, r * 0.35, x, y, r);
		fg.addColorStop(0, 'rgba(8,8,20,0)');
		fg.addColorStop(0.6, 'rgba(8,8,20,.55)');
		fg.addColorStop(1, 'rgba(6,6,16,.95)');
		ctx.fillStyle = fg;
		ctx.fillRect(0, 0, COLS * squareSize, ROWS * squareSize);
	}
	popups.forEach(p => {
		const a = Math.min(1, p.life * 2);
		ctx.globalAlpha = a;
		ctx.font = `400 ${p.size * squareSize}px 'IM Fell Double Pica', Georgia, serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const half = ctx.measureText(p.text).width / 2 + squareSize * 0.15,
			x = Math.min(Math.max(p.x * squareSize, half), COLS * squareSize - half),
			y = Math.min(Math.max(p.y * squareSize, squareSize * 0.4), ROWS * squareSize - squareSize * 0.4);
		ctx.lineWidth = squareSize * 0.08;
		ctx.strokeStyle = '#2b1606';
		ctx.strokeText(p.text, x, y);
		ctx.fillStyle = p.col || '#ffe38a';
		ctx.fillText(p.text, x, y);
	});
	ctx.globalAlpha = 1;
	if (ctx.isGL) ctx.flush(); // WebGL (02-board-pen.js): hand the batch to the graphics chip
}
