// ---------- effects ----------
function burst(x, y, n = 7) {
	if (reduceMotion) n = 2;
	else if (lowFx) n = Math.min(n, 3);
	if (particles.length > (lowFx ? 120 : 260)) return;
	const spk = sparkleById(save.sparkle);
	for (let i = 0; i < n; i++) {
		const a = Math.random() * TAU,
			spd = 0.8 + Math.random() * 2.2;
		particles.push({
			x: x + 0.5,
			y: y + 0.5,
			vx: Math.cos(a) * spd,
			vy: Math.sin(a) * spd - 1,
			life: 0.5 + Math.random() * 0.4,
			s: 0.1 + Math.random() * 0.1,
			col: Math.random() < 0.7 ? spk.a : spk.b,
		});
	}
}

// phone vibration: a short buzz on matches, specials and a win; off unless the
// player turns it on (Menu → Sound, music and vibration), and kept gentle when the player asks for reduced motion
function vibrate(p) {
	if (!save.vibrate) return;
	try {
		if (reduceMotion) p = Math.min(p, 10);
		if (window.AndroidVibrate) AndroidVibrate.vibrate(JSON.stringify(p));
		else navigator.vibrate && navigator.vibrate(p);
	} catch (e) {}
}
