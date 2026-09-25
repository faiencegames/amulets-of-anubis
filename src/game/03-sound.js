/* =============================================================================
 * 03-sound.js  —  the sound effects, all made at run time with Web Audio:
 * plucked strings, bells, gongs, flutes, papyrus, the sistrum.
 *
 * What's here:
 *   sfx(name, n)        plays an effect ('match', 'gild', 'unroll', ...);
 *                       called from everywhere. When the music plays, pitched
 *                       effects take their notes from its chord.
 *   getCtx(), audioCtx  the audio engine, made on the player's first tap
 *   restartAudio()      starts it again, for the "Steadier sound" setting
 *   soundDelay()        how late this device plays sound, in milliseconds
 *   bell(), playInst(), note(), theme()
 *                       the instruments and notes, shared with 04-music.js
 *   prewarmKS(), prewarmBells()
 *                       make a stop's notes ahead of time, so a match never
 *                       waits for them (05-state.js, at the start of a stop)
 *
 * The effects play about 6 dB above the music; keep it so (the manual,
 * part 2, "Sound and music").
 *
 * Changes in the save: nothing (the sound settings are changed in
 * 14-menu.js).
 * ===========================================================================*/

// ---------- sound ----------
let audioCtx = null,
	sfxOut = null,
	sfxCentre = null,
	masterOut = null,
	audioArmed = false; // no audio engine until the player first taps: browsers mute it before that anyway, and creating it is slow
const ksCache = new Map();
function getCtx() {
	if (!audioCtx && !audioArmed) return null;
	if (!audioCtx) {
		try {
			// Phones get a larger audio buffer: with the default (about 5 ms on many
			// Android phones) a busy moment misses the deadline and crackles. The
			// extra 10 to 20 ms of delay can't be heard in a game like this.
			// 'playback' is only a wish, and each phone decides what it gives; a
			// player whose sound still hitches can ask for a buffer of a set size
			// ("Steadier sound", CONTENT.settings.steadyBuffer).
			const touch = window.matchMedia && matchMedia('(pointer: coarse)').matches,
				AC = window.AudioContext || window.webkitAudioContext;
			let buffer = touch ? 'playback' : null;
			if (save.steadySound) buffer = CONTENT.settings.steadyBuffer;
			try {
				audioCtx = new AC(buffer ? { latencyHint: buffer } : {});
			} catch (e) {
				audioCtx = new AC();
			}
			// master bus: a firm compressor then a little headroom, so music and a big
			// cascade landing together never clip
			const comp = audioCtx.createDynamicsCompressor();
			comp.threshold.value = -16;
			comp.knee.value = 6;
			comp.ratio.value = 10;
			comp.attack.value = 0.002;
			comp.release.value = 0.18;
			const trim = audioCtx.createGain();
			trim.gain.value = 0.8;
			comp.connect(trim).connect(audioCtx.destination);
			masterOut = comp;
			sfxOut = audioCtx.createGain();
			sfxOut.gain.value = 0.9 * (save.sfxVol == null ? 1 : save.sfxVol);
			sfxOut.connect(comp);
			sfxCentre = audioCtx.createGain();
			sfxCentre.gain.value = Math.SQRT1_2;
			sfxCentre.connect(sfxOut);
			// A small temple reverb. It runs on every sound, and a reverb is the
			// costliest thing the audio does, so it is kept cheap: a short tail, and
			// one channel, heard in the left ear and 13 ms later in the right, which
			// is as wide as two channels for half the work.
			const len = Math.floor(audioCtx.sampleRate * 1.1);
			const ir = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
			const d = ir.getChannelData(0);
			const k = Math.pow(0.001, 1 / len); // an exponential tail by repeated multiplication: cheaper than a power per sample
			let e = 1;
			for (let i = 0; i < len; i++) {
				d[i] = (Math.random() * 2 - 1) * e;
				e *= k;
			}
			const conv = audioCtx.createConvolver();
			conv.channelCount = 1;
			conv.channelCountMode = 'explicit';
			conv.buffer = ir;
			const sides = audioCtx.createChannelMerger(2);
			const later = audioCtx.createDelay(0.1);
			later.delayTime.value = 0.013;
			conv.connect(sides, 0, 0);
			conv.connect(later).connect(sides, 0, 1);
			const wet = audioCtx.createGain();
			wet.gain.value = 0.24;
			sfxOut.connect(conv);
			sides.connect(wet).connect(comp);
			setTimeout(() => {
				prewarmKS();
				prewarmBells();
			}, 0); // the stop began before there was an engine to warm
		} catch (e) {
			return null;
		}
	}
	if (audioCtx.state === 'suspended') audioCtx.resume();
	return audioCtx;
}

// Starts the audio engine again, so a new buffer size takes effect at once.
// The music starts again in the same stop; the made sound buffers are kept.
function restartAudio() {
	if (!audioCtx) return;
	const musicWasOn = music.running;
	stopMusic();
	clearInterval(music.timer);
	music.timer = null;
	music.ready = false;
	music.layers = {};
	const old = audioCtx;
	audioCtx = null;
	old.close().catch(() => {});
	lastLand = 0; // a time on the old engine's clock
	getCtx();
	if (musicWasOn) startMusic();
}

// The delay between a sound being started and being heard, in milliseconds,
// as this device reports it (0 if it doesn't)
function soundDelay() {
	if (!audioCtx) return 0;
	return Math.round(((audioCtx.baseLatency || 0) + (audioCtx.outputLatency || 0)) * 1000);
}

// One noise buffer, made once and shared: generating fresh noise for every
// sound caused visible stutters on phones. Callers stop it after `dur`.
let sharedNoise = null;
function noiseBuf(dur) {
	if (!sharedNoise) {
		const a = audioCtx,
			n = Math.floor(a.sampleRate * 3),
			b = a.createBuffer(1, n, a.sampleRate),
			d = b.getChannelData(0);
		for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
		sharedNoise = b;
	}
	return sharedNoise;
}

function envelope(gain, t, atk, vol, len) {
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(vol, t + atk);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
}

// Into the effects bus (or wherever routeTo points), through a panner only
// when the sound is off-centre: a panner per centred sound was pure cost.
// A centred panner plays a mono sound at .707 in each ear, so centred sounds
// share one bus at that level (sfxCentre) and sound exactly as before.
function toOut(g, pan) {
	if (!pan && !routeTo && sfxCentre) {
		g.connect(sfxCentre);
		return g;
	}
	const dest = routeTo || sfxOut;
	if (audioCtx.createStereoPanner) {
		const p = audioCtx.createStereoPanner();
		p.pan.value = pan;
		g.connect(p).connect(dest);
	} else g.connect(dest);
	return g;
}

function soundOut(vol, t, atk, len, pan = 0) {
	const gain = audioCtx.createGain();
	envelope(gain, t, atk, vol, len);
	return toOut(gain, pan);
}

// Karplus-Strong plucked string: a short noise burst circulating in a damped delay line
function ksBuffer(f, dur, bright, decay) {
	const key = [Math.round(f), dur, bright, decay].join('|');
	if (ksCache.has(key)) return ksCache.get(key);
	const sr = audioCtx.sampleRate,
		len = Math.floor(sr * dur),
		p = Math.max(2, Math.round(sr / f)),
		b = audioCtx.createBuffer(1, len, sr),
		d = b.getChannelData(0);
	const ring = new Float32Array(p);
	let prev = 0;
	for (let i = 0; i < p; i++) {
		prev = bright * (Math.random() * 2 - 1) + (1 - bright) * prev;
		ring[i] = prev;
	}
	let peak = 0;
	for (let i = 0; i < len; i++) {
		const j = i % p,
			v = ring[j];
		d[i] = v;
		ring[j] = decay * 0.5 * (v + ring[(j + 1) % p]);
		if (Math.abs(v) > peak) peak = Math.abs(v);
	}
	if (peak > 0) for (let i = 0; i < len; i++) d[i] /= peak;
	if (ksCache.size > 120) ksCache.clear();
	ksCache.set(key, b);
	return b;
}

function pluck(f, t, vol, { bright = 0.7, decay = 0.996, dur = 1.2, bend = 0, pan = 0 } = {}) {
	const s = audioCtx.createBufferSource();
	s.buffer = ksBuffer(f, dur, bright, decay);
	if (bend) {
		s.playbackRate.setValueAtTime(1 + bend, t);
		s.playbackRate.exponentialRampToValueAtTime(1, t + 0.06);
	}
	const g = soundOut(vol, t, 0.002, dur, pan);
	s.connect(g);
	s.start(t);
	s.stop(t + dur);
}

// Bells and gongs are sums of fading sine partials, always the same for a
// given pitch, so each is rendered once into a buffer and played as a single
// source. It is the same sound as four (or six) live oscillators, each with
// its own envelope and panner, for a small part of the audio work: a winged
// sun used to start over 150 nodes at once, which crackled on phones.
// Each envelope follows Web Audio's own exponential ramps (see envelope()); as
// those end at a fixed floor, a quiet bell fades sooner than a loud one, so a
// buffer is made at the loudness it is played at.
const BELL_PARTIALS = [
	[1, 1],
	[2.76, 0.5],
	[5.4, 0.28],
	[8.93, 0.14],
];

const GONG_PARTIALS = [
	[1, 1, 3.2],
	[1.52, 0.55, 2.6],
	[2.24, 0.4, 2],
	[2.93, 0.3, 1.6],
	[3.84, 0.2, 1.2],
	[5.1, 0.12, 0.9],
];

const toneCache = new Map();
let toneSamples = 0;
function toneBuffer(key, len, fill) {
	if (toneCache.has(key)) {
		const b = toneCache.get(key);
		toneCache.delete(key);
		toneCache.set(key, b);
		return b;
	} // most recent last
	const sr = audioCtx.sampleRate,
		n = Math.ceil(sr * len),
		b = audioCtx.createBuffer(1, n, sr);
	fill(b.getChannelData(0), sr);
	toneCache.set(key, b);
	toneSamples += n;
	for (const [k, old] of toneCache) {
		if (toneSamples < 6e6) break;
		toneCache.delete(k);
		toneSamples -= old.length;
	} // about 24 MB at most
	return b;
}

// one partial: frequency f (or a glide from f0 over `glide` seconds), rising
// from .0001 to `a` in `atk`, falling back to .0001 at `len`
function addPartial(d, sr, f, a, atk, len, f0 = f, glide = 0) {
	if (f >= sr / 2) return;
	const n = Math.min(d.length, Math.ceil(sr * len)),
		na = Math.max(1, Math.round(sr * atk)),
		up = Math.pow(a / 0.0001, 1 / na),
		down = Math.pow(0.0001 / a, 1 / Math.max(1, n - na));
	const ng = Math.round(sr * glide),
		gk = ng ? Math.pow(f / f0, 1 / ng) : 1;
	let e = 0.0001,
		ph = 0,
		fr = f0;
	for (let i = 0; i < n; i++) {
		d[i] += e * Math.sin(ph);
		ph += (TAU * fr) / sr;
		if (ph > TAU) ph -= TAU;
		e *= i < na ? up : down;
		if (i < ng) fr *= gk;
		else fr = f;
	}
}

function bellBuffer(f, dur, vol) {
	return toneBuffer('b|' + Math.round(f) + '|' + dur + '|' + vol.toFixed(4), dur, (d, sr) =>
		BELL_PARTIALS.forEach(([r, a], i) => addPartial(d, sr, f * r, vol * a, 0.002, dur / (1 + i * 0.7))),
	);
}

function bell(f, t, vol, dur = 1.6, pan = 0) {
	const s = audioCtx.createBufferSource();
	s.buffer = bellBuffer(f, dur, vol);
	toOut(s, pan);
	s.start(t);
}

function flute(f, t, vol, dur = 0.7, pan = 0) {
	const gain = audioCtx.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.linearRampToValueAtTime(vol, t + 0.05);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
	gain.connect(routeTo || sfxOut);
	const o = audioCtx.createOscillator();
	o.type = 'sine';
	o.frequency.value = f;
	const lfo = audioCtx.createOscillator();
	lfo.frequency.value = 5.5;
	const lg = audioCtx.createGain();
	lg.gain.value = f * 0.008;
	lfo.connect(lg).connect(o.frequency);
	o.connect(gain);
	const n = audioCtx.createBufferSource();
	n.buffer = noiseBuf(dur);
	const bp = audioCtx.createBiquadFilter();
	bp.type = 'bandpass';
	bp.frequency.value = f * 2;
	bp.Q.value = 4;
	const ng = audioCtx.createGain();
	ng.gain.value = 0.25;
	n.connect(bp).connect(ng).connect(gain);
	[o, lfo, n].forEach(x => {
		x.start(t);
		x.stop(t + dur);
	});
}

function playInst(inst, f, t, vol, pan = 0) {
	if (inst === 'harp') pluck(f, t, vol, { bright: 0.65, decay: 0.997, dur: 1.4, pan });
	else if (inst === 'lyre') pluck(f, t, vol, { bright: 0.95, decay: 0.994, dur: 1.1, pan });
	else if (inst === 'oud')
		pluck(f, t, vol * 1.1, { bright: 0.45, decay: 0.992, dur: 0.8, bend: 0.035, pan });
	else if (inst === 'flute') flute(f, t, vol * 0.8, 0.6, pan);
	else bell(f, t, vol * 0.7, 1.5, pan);
}

function noiseHit(
	t,
	{ vol = 0.2, dur = 0.15, type = 'lowpass', f = 800, f2 = null, q = 1, atk = 0.003 } = {},
) {
	const n = audioCtx.createBufferSource();
	n.buffer = noiseBuf(dur + 0.05);
	const fl = audioCtx.createBiquadFilter();
	fl.type = type;
	fl.Q.value = q;
	fl.frequency.setValueAtTime(f, t);
	if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
	const g = soundOut(vol, t, atk, dur);
	n.connect(fl).connect(g);
	n.start(t);
	n.stop(t + dur + 0.05);
}

function sweep(t, f1, f2, dur, vol, type = 'sine') {
	const o = audioCtx.createOscillator();
	o.type = type;
	o.frequency.setValueAtTime(f1, t);
	o.frequency.exponentialRampToValueAtTime(f2, t + dur);
	const g = soundOut(vol, t, 0.004, dur);
	o.connect(g);
	o.start(t);
	o.stop(t + dur + 0.02);
}

function gong(t, f = 82, vol = 0.3) {
	const s = audioCtx.createBufferSource();
	s.buffer = gongBufferFor(f, vol);
	toOut(s, 0);
	s.start(t);
	noiseHit(t, { vol: 0.08, dur: 0.25, f: 300 });
}

// Crinkling papyrus: a noise buffer made once, full of tiny random crackles,
// swept through a band-pass filter.
function paper(t, dur, rate, f1, f2, vol) {
	if (!paper.buf) {
		const a = audioCtx,
			n = Math.floor(a.sampleRate * 0.6),
			b = a.createBuffer(1, n, a.sampleRate),
			d = b.getChannelData(0);
		let e = 0;
		for (let i = 0; i < n; i++) {
			if (Math.random() < 0.004) e = 0.55 + Math.random() * 0.45;
			e *= 0.9975;
			d[i] = (Math.random() * 2 - 1) * (0.14 * (1 - i / n) + e * 0.9);
		}
		paper.buf = b;
	}
	const src = audioCtx.createBufferSource();
	src.buffer = paper.buf;
	src.playbackRate.value = rate;
	const bp = audioCtx.createBiquadFilter();
	bp.type = 'bandpass';
	bp.Q.value = 0.7;
	bp.frequency.setValueAtTime(f1, t);
	bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
	const g = soundOut(vol, t, 0.02, dur);
	src.connect(bp).connect(g);
	src.start(t);
	src.stop(t + dur + 0.05);
}

function sistrum(t, vol = 0.12) {
	if (!sistrum.buf) {
		const len = Math.floor(audioCtx.sampleRate * 0.55),
			buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate),
			d = buf.getChannelData(0);
		for (let i = 0; i < len; i++) {
			const tt = i / audioCtx.sampleRate;
			d[i] = (Math.random() * 2 - 1) * Math.exp(-tt * 6) * (0.55 + 0.45 * Math.sin(tt * TAU * 19));
		}
		sistrum.buf = buf;
	}
	const s = audioCtx.createBufferSource();
	s.buffer = sistrum.buf;
	const f = audioCtx.createBiquadFilter();
	f.type = 'bandpass';
	f.frequency.value = 7000;
	f.Q.value = 1.4;
	const gain = audioCtx.createGain();
	gain.gain.value = vol;
	s.connect(f).connect(gain).connect(sfxOut);
	s.start(t);
	[3520, 4186, 4699].forEach((fr, i) => bell(fr, t + i * 0.03, vol * 0.25, 0.5));
}

function theme() {
	return THEMES[levelIdx];
}

function note(i, oct = 1) {
	const th = theme().audio,
		s = th.scale;
	return (
		th.root *
		oct *
		2 ** ((s[((i % s.length) + s.length) % s.length] + 12 * Math.floor(i / s.length)) / 12)
	);
}

// Pre-generate Karplus-Strong buffers for this stop's chord tones at stop-start
// so the match hot path never pays the O(50k-sample) generation cost. The
// buffers are byte-identical to on-demand generation; only the timing moves
// earlier. Only harp/lyre/oud use KS buffers; flute and bell don't.
function prewarmKS() {
	if (!audioCtx) return;
	const th = THEMES[levelIdx];
	if (!th || !th.audio) return;
	const opts = {
		harp: { bright: 0.65, decay: 0.997, dur: 1.4 },
		lyre: { bright: 0.95, decay: 0.994, dur: 1.1 },
		oud: { bright: 0.45, decay: 0.992, dur: 0.8 },
	};
	const o = opts[th.audio.inst];
	if (!o) return;
	for (let i = 0; i < 32; i++) ksBuffer(note(i, 2), o.dur, o.bright, o.decay);
}

// The same for this stop's bells and gong, in idle moments so a stop still
// starts at once: the pitches the gild, create, sun, blessing and music bells
// use. Any bell not made here is made the first time it rings.
let bellJob = 0;
function prewarmBells() {
	if (!audioCtx) return;
	const job = ++bellJob,
		todo = [() => gongBufferFor(note(0, 0.5), 0.34)];
	for (let i = 0; i < 16; i++) todo.push(() => bellBuffer(note(i, 2), 0.6, 0.045)); // gild, following the music
	for (let i = 0; i < 12; i++)
		todo.push(
			() => bellBuffer(note(i, 4), 0.6, 0.045),
			() => bellBuffer(note(i, 4), 0.8, 0.05),
			() => bellBuffer(note(i, 4), 0.9, 0.04),
		); // gild, create, sun
	for (let i = 0; i < 10; i++) todo.push(() => bellBuffer(note(i, 3), 1, 0.05)); // blessing
	for (const i of [0, 2, 4, scaleLen()])
		for (const v of [0.5, 0.4, 0.35]) todo.push(() => bellBuffer(note(i, 4), 4, v)); // the music's bells
	const idle = window.requestIdleCallback || (f => setTimeout(() => f({ timeRemaining: () => 8 }), 60));
	const step = dl => {
		if (job !== bellJob) return;
		while (todo.length && dl.timeRemaining() > 4) todo.shift()();
		if (todo.length) idle(step);
	};
	idle(step);
}

function gongBufferFor(f, vol) {
	return toneBuffer('g|' + Math.round(f) + '|' + vol.toFixed(4), 3.2, (d, sr) =>
		GONG_PARTIALS.forEach(([r, a, len]) =>
			addPartial(d, sr, f * r, vol * a, 0.03, len, f * r * 1.01, 0.4),
		),
	);
}

let lastLand = 0;
// ---- effects that play along with the music ----
// When the music is on (and the setting allows), pitched effects take their
// notes from the chord the music is playing at that moment, not just from the
// stop's scale, so they never clash with it. Successive matches walk through
// the chord's notes and cascades climb them: the stones become an instrument.
let sfxWalk = 0;
function harmonising() {
	return (
		save.harmonise !== false &&
		typeof music !== 'undefined' &&
		music.running &&
		music.chord &&
		!music.resting
	);
}

function chordTone(k) {
	const L = scaleLen(),
		deg = music.chord.deg;
	return deg + [0, 2, 4][((k % 3) + 3) % 3] + L * Math.floor(k / 3);
}

// How far ahead a sound effect is started. The audio is made in batches, and
// on a phone (more so with Bluetooth) the clock can lag the batch being made:
// a sound due "now" may land in the past, skip its fade-in and click. 30 ms is
// too short to notice between a tap and its sound.
const SFX_LEAD = 0.03;
function sfx(name, n = 1, x = 0.5) {
	if (!save.sound) return;
	const a = getCtx();
	if (!a) return;
	const t = a.currentTime + SFX_LEAD,
		inst = theme().audio.inst,
		pan = (x - 0.5) * 1.2;
	switch (name) {
		case 'ui':
			pluck(660, t, 0.1, { bright: 0.3, decay: 0.97, dur: 0.18 });
			noiseHit(t, { vol: 0.05, dur: 0.03, type: 'highpass', f: 3000 });
			break;
		// a stone button pressed: a dull knock with a little grit
		case 'stone':
			sweep(t, 230, 140, 0.07, 0.11);
			noiseHit(t, { vol: 0.1, dur: 0.045, type: 'bandpass', f: 1300, q: 2 });
			noiseHit(t + 0.004, { vol: 0.035, dur: 0.015, type: 'highpass', f: 4200 });
			break;
		// a scroll unrolling: crinkling papyrus, then the rod settling
		case 'unroll':
			paper(t, 0.5, 1, 1300, 3300, 0.17);
			sweep(t + 0.44, 150, 75, 0.14, 0.16);
			noiseHit(t + 0.44, { vol: 0.06, dur: 0.08, f: 500 });
			break;
		case 'rollup':
			paper(t, 0.26, 1.5, 3200, 1500, 0.11);
			sweep(t + 0.22, 130, 70, 0.1, 0.1);
			break;
		case 'page':
			paper(t, 0.16, 2.1, 2600, 2200, 0.2);
			break;
		// coins for gold, glassy clinks for lapis, and the same falling back for a refund
		case 'coins':
			for (let i = 0; i < 4; i++)
				bell(
					1700 + Math.round(Math.random() * 11) * 100,
					t + i * 0.055 + Math.random() * 0.02,
					0.045,
					0.3,
					(Math.random() - 0.5) * 0.6,
				);
			break;
		case 'gems':
			[0, 1, 2].forEach(i => {
				sweep(t + i * 0.07, 2600 + i * 420, 2600 + i * 420, 0.12, 0.05);
				sweep(t + i * 0.07, 3900 + i * 600, 3900 + i * 600, 0.08, 0.025);
			});
			break;
		case 'refund':
			for (let i = 0; i < 4; i++)
				bell(2500 - i * 260, t + i * 0.06, 0.04, 0.28, (Math.random() - 0.5) * 0.6);
			break;
		case 'select':
			pluck(harmonising() ? note(chordTone(1), 2) : note(4, 2), t, 0.07, {
				bright: 0.35,
				decay: 0.985,
				dur: 0.3,
				pan,
			});
			break;
		case 'swap':
			noiseHit(t, { vol: 0.12, dur: 0.16, type: 'bandpass', f: 500, f2: 1400, q: 0.8, atk: 0.03 });
			pluck(220, t + 0.1, 0.06, { bright: 0.25, decay: 0.97, dur: 0.15, pan });
			break;
		case 'bad':
			sweep(t, 120, 70, 0.14, 0.22);
			noiseHit(t, { vol: 0.1, dur: 0.06, f: 500 });
			sweep(t + 0.13, 110, 65, 0.16, 0.18);
			noiseHit(t + 0.13, { vol: 0.08, dur: 0.06, f: 450 });
			break;
		case 'land':
			if (a.currentTime - lastLand < 0.05) return;
			lastLand = a.currentTime;
			noiseHit(t, { vol: 0.035, dur: 0.035, type: 'bandpass', f: 1800, q: 1.5 });
			break;
		case 'match': {
			if (harmonising()) {
				const k = (n === 1 ? (sfxWalk = (sfxWalk + 1) % 4) : sfxWalk) + Math.min(n - 1, 6);
				playInst(inst, note(chordTone(k), 2), t, 0.2, pan);
				playInst(inst, note(chordTone(k + 1), 2), t + 0.045, 0.13, pan);
				if (n >= 3) playInst(inst, note(chordTone(k + 2), 2), t + 0.09, 0.1, pan);
				break;
			}
			const i = Math.min(n - 1, 9);
			playInst(inst, note(i + 2, 2), t, 0.2, pan);
			playInst(inst, note(i + 4, 2), t + 0.045, 0.13, pan);
			if (n >= 3) playInst(inst, note(i + 6, 2), t + 0.09, 0.1, pan);
			break;
		}
		case 'gild':
			for (let j = 0; j < Math.min(n, 5); j++)
				bell(
					harmonising() ? note(chordTone(3 + j), 2) : note(7 + j, 4),
					t + 0.06 + j * 0.045,
					0.045,
					0.6,
					Math.random() - 0.5,
				);
			break;
		case 'crack':
			noiseHit(t, { vol: 0.18, dur: 0.07, type: 'highpass', f: 1200 });
			noiseHit(t + 0.03, { vol: 0.1, dur: 0.05, type: 'bandpass', f: 2400, q: 2 });
			sweep(t, 160, 90, 0.08, 0.08, 'triangle');
			break;
		case 'create':
			for (let j = 0; j < 5; j++) bell(note(j * 2, 4), t + j * 0.05, 0.05, 0.8);
			sistrum(t + 0.1, 0.1);
			break;
		case 'line':
			noiseHit(t, { vol: 0.28, dur: 0.4, type: 'bandpass', f: 300, f2: 5000, q: 1.8, atk: 0.02 });
			sweep(t, 300, 1200, 0.3, 0.06, 'triangle');
			break;
		case 'bomb':
			sweep(t, 170, 38, 0.5, 0.45);
			noiseHit(t, { vol: 0.3, dur: 0.45, f: 900, f2: 120 });
			noiseHit(t, { vol: 0.12, dur: 0.08, type: 'highpass', f: 2000 });
			break;
		case 'sun':
			gong(t, note(0, 0.5), 0.34);
			sistrum(t + 0.05, 0.16);
			for (let j = 0; j < 8; j++) bell(note(j, 4), t + 0.1 + j * 0.06, 0.04, 0.9);
			break;
		case 'moves':
			for (let j = 0; j < 3; j++) sweep(t + j * 0.1, 500 + j * 150, 1500 + j * 300, 0.09, 0.12);
			pluck(note(4, 2), t + 0.3, 0.12, { dur: 1 });
			break;
		case 'blessing':
			for (let j = 0; j < 10; j++) bell(note(j, 3), t + j * 0.04, 0.05, 1);
			sistrum(t, 0.1);
			break;
		case 'sand':
			noiseHit(t, {
				vol: 0.09 + Math.min(n, 4) * 0.015,
				dur: 0.32,
				type: 'bandpass',
				f: 2600,
				f2: 900,
				q: 0.9,
				atk: 0.05,
			});
			noiseHit(t + 0.05, { vol: 0.04, dur: 0.2, type: 'highpass', f: 5000 });
			break;
		case 'splash':
			noiseHit(t, {
				vol: 0.1 + Math.min(n, 4) * 0.015,
				dur: 0.26,
				type: 'bandpass',
				f: 1600,
				f2: 3600,
				q: 1.1,
				atk: 0.01,
			});
			sweep(t + 0.02, 520, 1150, 0.12, 0.05);
			sweep(t + 0.09, 700, 1400, 0.08, 0.03);
			break;
		case 'shuffle':
			noiseHit(t, { vol: 0.15, dur: 0.6, type: 'bandpass', f: 700, f2: 2200, q: 0.7, atk: 0.2 });
			break;
		case 'win':
			for (let j = 0; j < 9; j++) playInst(inst, note(j, 2), t + j * 0.09, 0.16, (j / 8 - 0.5) * 0.8);
			gong(t + 0.8, note(0, 0.5), 0.28);
			sistrum(t + 0.85, 0.12);
			break;
		case 'lose':
			for (let j = 0; j < 5; j++) playInst(inst, note(4 - j, 1), t + j * 0.2, 0.16);
			noiseHit(t + 0.2, { vol: 0.1, dur: 1.4, type: 'bandpass', f: 1500, f2: 400, q: 0.5, atk: 0.4 });
			break;
	}
}
