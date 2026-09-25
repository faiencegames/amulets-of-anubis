/* =============================================================================
 * 04-music.js  —  the music: a score made as it plays, in each stop's scale
 * and instrument (THEMES, 03-themes.js).
 *
 * Layers (a choir pad, a drone, plucks, an arpeggio, a pulse, a lead, bells)
 * come and go with how the stop is going: calm at first, busier as the moves
 * run out.
 *
 * What's here:
 *   startMusic(), stopMusic()  on and off (the Menu's sound settings)
 *   musicVolume()       follows the volume setting
 *   musicStopBegins(), musicFollow(), musicCascade(), musicResolve()
 *                       how the game talks to the music: a stop starts, the
 *                       moves run down, a cascade, a win or a loss
 *   music               the music's state; 03-sound.js reads its chord so
 *                       effects play in key
 *
 * Changes in the save: nothing.
 * ===========================================================================*/

// ---------- music ----------
// A generative score, built on plain Web Audio so it runs offline. Based on a
// layered design: a slow chord progression carried by a choir pad and a sub
// drone, with an arpeggio, a pulse bass, kalimba, plucked strings,
// bells and wind drifting in and out on top.
//
// It follows the game: each stop plays in its own key and scale; the lead
// voice is the stop's own instrument; the arrangement grows busier and the
// tempo quicker as moves run out; the pad brightens as the floor turns gold;
// big cascades ring bells; winning resolves the music; menus muffle it.
const MUSIC_LAYERS = {
	// gain and how much of each layer goes to the reverb and delay
	drone: { vol: 0.16, rev: 0.35, dly: 0 },
	choir: { vol: 0.1, rev: 0.7, dly: 0 },
	arp: { vol: 0.045, rev: 0.35, dly: 0.45 },
	pulse: { vol: 0.05, rev: 0.2, dly: 0 },
	kalimba: { vol: 0.07, rev: 0.4, dly: 0.35 },
	lead: { vol: 0.11, rev: 0.45, dly: 0.15 },
	bell: { vol: 0.05, rev: 0.8, dly: 0 },
	wind: { vol: 0.05, rev: 0.5, dly: 0 },
};

// Chord progressions as steps through the stop's scale (0 is the home note).
const PROGRESSIONS = [
	[0, 5, 6, 4],
	[0, 3, 4, 0],
	[0, 1, 0, 6],
	[0, 4, 5, 3],
	[0, 6, 5, 6],
	[0, 2, 3, 4],
];

const ARP_SHAPES = [
	[0, 1, 2, 3, 3, 2, 1, 0],
	[0, 2, 1, 3, 4, 2, 3, 1],
	[0, 3, 1, 2, 3, 0, 2, 1],
	[0, 1, 3, 2, 1, 3, 0, 2],
];

const music = {
	ready: false,
	running: false,
	layers: {},
	want: {},
	step: 0,
	next: 0,
	tempo: 92,
	prog: PROGRESSIONS[0],
	chordI: 0,
	cycle: 0,
	chord: null,
	arpShape: ARP_SHAPES[0],
	pad: [],
	drone: null,
	tension: 0,
	progress: 0,
	resting: false,
	duck: false,
	timer: null,
};

let routeTo = null; // when set, the shared instruments above play into this node instead of the effects bus
function musicSetup() {
	const a = getCtx();
	if (!a || music.ready) return !!a;
	music.bus = a.createGain();
	music.bus.gain.value = 0;
	music.muffle = a.createBiquadFilter();
	music.muffle.type = 'lowpass';
	music.muffle.frequency.value = 18000;
	// cut the deep rumble phone speakers can't play anyway; it only eats headroom
	music.hp = a.createBiquadFilter();
	music.hp.type = 'highpass';
	music.hp.frequency.value = 48;
	music.hp.Q.value = 0.7;
	music.bus.connect(music.hp).connect(music.muffle).connect(masterOut);
	// A long, dark hall for the music (separate from the short one on effects).
	// The reverb is the costliest part of the music for the phone, so it is kept
	// cheap: one channel, not two, and cut at 1.8 s, where the old 2.6 s tail had
	// already faded to about -46 dB. A copy a few milliseconds later on the
	// right keeps it as wide as before. About a third of the work of the old one.
	const fullLen = a.sampleRate * 2.6;
	const len = Math.floor(a.sampleRate * 1.8);
	const fadeLen = Math.floor(a.sampleRate * 0.15);
	const ir = a.createBuffer(1, len, a.sampleRate);
	const d = ir.getChannelData(0);
	const k = Math.pow(0.0005, 1 / fullLen); // the same slope as the old 2.6 s tail
	let lp = 0;
	let e = 1;
	for (let i = 0; i < len; i++) {
		lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4;
		const fade = Math.min(1, (len - i) / fadeLen); // no hard cut at the end
		d[i] = lp * e * fade;
		e *= k;
	}
	music.rev = a.createConvolver();
	music.rev.channelCount = 1;
	music.rev.channelCountMode = 'explicit';
	music.rev.buffer = ir;
	music.revIn = a.createGain();
	// The convolver scales every impulse to the same loudness per sample, so a
	// shorter one comes out quieter: this puts back the level of the old one.
	music.revIn.gain.value = 0.9 * Math.sqrt(2.6 / 1.8);
	// the hall in the left ear, and 17 ms later in the right
	const revSides = a.createChannelMerger(2);
	const revLater = a.createDelay(0.1);
	revLater.delayTime.value = 0.017;
	music.revIn.connect(music.rev);
	music.rev.connect(revSides, 0, 0);
	music.rev.connect(revLater).connect(revSides, 0, 1);
	revSides.connect(music.bus);
	// ping-pong delay, a dotted eighth apart
	music.dlyIn = a.createGain();
	const L = a.createDelay(2),
		R = a.createDelay(2),
		fL = a.createGain(),
		fR = a.createGain(),
		pL = a.createStereoPanner(),
		pR = a.createStereoPanner(),
		tone = a.createBiquadFilter();
	tone.type = 'lowpass';
	tone.frequency.value = 2600;
	fL.gain.value = fR.gain.value = 0.38;
	pL.pan.value = -0.7;
	pR.pan.value = 0.7;
	music.dlyIn.connect(tone).connect(L);
	L.connect(pL).connect(music.bus);
	L.connect(fL).connect(R);
	R.connect(pR).connect(music.bus);
	R.connect(fR).connect(L);
	pL.connect(music.revIn);
	music.delays = [L, R];
	for (const [name, cfg] of Object.entries(MUSIC_LAYERS)) {
		const gain = a.createGain();
		gain.gain.value = 0;
		const dry = a.createGain();
		dry.gain.value = 1;
		gain.connect(dry).connect(music.bus);
		const r = a.createGain();
		r.gain.value = cfg.rev;
		gain.connect(r).connect(music.revIn);
		if (cfg.dly) {
			const d = a.createGain();
			d.gain.value = cfg.dly;
			gain.connect(d).connect(music.dlyIn);
		}
		music.layers[name] = gain;
		music.want[name] = false;
	}
	// the choir pad shares one filter, so the whole pad can brighten at once
	music.padFilter = a.createBiquadFilter();
	music.padFilter.type = 'lowpass';
	music.padFilter.frequency.value = 900;
	music.padFilter.Q.value = 0.8;
	music.padFilter.connect(music.layers.choir);
	// wind: looping noise through a slowly wandering band-pass
	const nb = a.createBuffer(1, a.sampleRate * 2, a.sampleRate),
		nd = nb.getChannelData(0);
	let b0 = 0,
		b1 = 0,
		b2 = 0;
	for (let i = 0; i < nd.length; i++) {
		const w = Math.random() * 2 - 1;
		b0 = 0.99765 * b0 + w * 0.099;
		b1 = 0.963 * b1 + w * 0.2965;
		b2 = 0.57 * b2 + w * 1.0527;
		nd[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
	}
	music.windSrc = a.createBufferSource();
	music.windSrc.buffer = nb;
	music.windSrc.loop = true;
	music.windBP = a.createBiquadFilter();
	music.windBP.type = 'bandpass';
	music.windBP.frequency.value = 500;
	music.windBP.Q.value = 3;
	music.windSrc.connect(music.windBP).connect(music.layers.wind);
	music.windSrc.start();
	music.ready = true;
	return true;
}

function mNote(i, oct) {
	return note(i, oct);
} // a step of the stop's scale, in a given octave
function scaleLen() {
	return theme().audio.scale.length;
}

function buildChord(deg) {
	const L = scaleLen();
	return {
		deg,
		pad: [mNote(deg, 1), mNote(deg + 2, 1), mNote(deg + 4, 1), mNote(deg, 2)],
		arp: [mNote(deg, 2), mNote(deg + 2, 2), mNote(deg + 4, 2), mNote(deg, 4), mNote(deg + 2, 4)],
		bass: [mNote(deg, 0.5), mNote(deg + 4, 0.5)],
		root: mNote(deg % L, 0.5),
	};
}

function musicPadChord(ch, t) {
	const a = audioCtx;
	music.pad.forEach(v => {
		v.g.gain.cancelScheduledValues(t);
		v.g.gain.setTargetAtTime(0.0001, t, 0.9);
		v.o.forEach(o => o.stop(t + 5));
	});
	music.pad = ch.pad.map((f, i) => {
		const gain = a.createGain();
		gain.gain.setValueAtTime(0.0001, t);
		gain.gain.linearRampToValueAtTime(i === 3 ? 0.5 : 0.8, t + 2.2);
		const o = [-9, 0, 9].map(c => {
			const x = a.createOscillator();
			x.type = 'sawtooth';
			x.frequency.value = f;
			x.detune.value = c + (Math.random() * 4 - 2);
			x.connect(gain);
			x.start(t);
			return x;
		});
		gain.connect(music.padFilter);
		return { g: gain, o };
	});
	// each chord sweeps the pad filter; gilding more of the floor opens it further
	const bright = 600 + music.progress * 1500 + Math.random() * 500;
	music.padFilter.frequency.cancelScheduledValues(t);
	music.padFilter.frequency.setTargetAtTime(bright, t, 1.6);
}

function musicDrone(ch, t, dur) {
	const a = audioCtx,
		gain = a.createGain();
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.linearRampToValueAtTime(1, t + 2.5);
	gain.gain.setValueAtTime(1, t + dur - 0.2);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 2.5);
	gain.connect(music.layers.drone);
	[
		[ch.root * 2, 'triangle', 0.7],
		[ch.root, 'sine', 1],
	].forEach(([f, ty, v]) => {
		const o = a.createOscillator(),
			og = a.createGain();
		o.type = ty;
		o.frequency.value = f;
		og.gain.value = v;
		o.connect(og).connect(gain);
		o.start(t);
		o.stop(t + dur + 3);
	});
}

function musicArp(f, t, bright) {
	const a = audioCtx,
		o = a.createOscillator(),
		fl = a.createBiquadFilter(),
		gain = a.createGain();
	o.type = 'sawtooth';
	o.frequency.value = f;
	fl.type = 'lowpass';
	fl.Q.value = 3;
	const top = 250 * Math.pow(2, 2 + bright * 2.2);
	fl.frequency.setValueAtTime(top, t);
	fl.frequency.exponentialRampToValueAtTime(260, t + 0.22);
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(1, t + 0.008);
	gain.gain.exponentialRampToValueAtTime(0.12, t + 0.16);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
	o.connect(fl).connect(gain).connect(music.layers.arp);
	o.start(t);
	o.stop(t + 0.36);
}

function musicPulse(f, t) {
	const a = audioCtx,
		o = a.createOscillator(),
		fl = a.createBiquadFilter(),
		gain = a.createGain();
	o.type = 'square';
	o.frequency.value = f;
	fl.type = 'lowpass';
	fl.Q.value = 5;
	fl.frequency.setValueAtTime(180 * 16, t);
	fl.frequency.exponentialRampToValueAtTime(190, t + 0.15);
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(1, t + 0.005);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
	o.connect(fl).connect(gain).connect(music.layers.pulse);
	o.start(t);
	o.stop(t + 0.22);
}

function musicKalimba(f, t) {
	const a = audioCtx,
		c = a.createOscillator(),
		m = a.createOscillator(),
		mg = a.createGain(),
		gain = a.createGain();
	c.type = 'sine';
	c.frequency.value = f;
	m.type = 'triangle';
	m.frequency.value = f * 2.01;
	mg.gain.setValueAtTime(f * 3.5, t);
	mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.2);
	gain.gain.setValueAtTime(0.0001, t);
	gain.gain.exponentialRampToValueAtTime(1, t + 0.002);
	gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
	m.connect(mg).connect(c.frequency);
	c.connect(gain).connect(music.layers.kalimba);
	c.start(t);
	m.start(t);
	c.stop(t + 0.5);
	m.stop(t + 0.5);
}

function musicLead(f, t, vol = 1) {
	routeTo = music.layers.lead;
	playInst(theme().audio.inst, f, t, 0.5 * vol, (Math.random() - 0.5) * 0.6);
	routeTo = null;
}

function musicBell(f, t, vol = 1) {
	routeTo = music.layers.bell;
	bell(f, t, 0.5 * vol, 4, (Math.random() - 0.5) * 0.8);
	routeTo = null;
}

// Decide which layers play for the next cycle. Calm stops keep to pad, drone
// and a few plucks; as moves run out the arpeggio and pulse bass take over.
function musicArrange() {
	const T = music.tension,
		w = music.want,
		r = Math.random;
	if (music.resting) {
		Object.keys(w).forEach(k => (w[k] = false));
		w.choir = true;
		w.drone = true;
		w.wind = r() < 0.6;
		w.lead = r() < 0.5;
	} else {
		w.drone = r() < 0.85;
		w.choir = r() < 0.85;
		w.wind = r() < 0.55 - T * 0.3;
		w.lead = r() < 0.55;
		w.kalimba = r() < 0.45 - T * 0.2;
		w.bell = r() < 0.3;
		w.arp = r() < 0.3 + T * 0.65;
		w.pulse = T > 0.72 || r() < 0.08 + T * 0.6;
		if (!w.drone && !w.choir) w.choir = true;
		if (!w.arp && !w.pulse && !w.kalimba && !w.lead) w.lead = true;
	}
	musicApplyGains(3.2);
}

function musicApplyGains(fade) {
	if (!music.ready) return;
	const t = audioCtx.currentTime;
	for (const [k, g] of Object.entries(music.layers)) {
		const target = music.want[k] ? MUSIC_LAYERS[k].vol : 0;
		g.gain.cancelScheduledValues(t);
		g.gain.setTargetAtTime(Math.max(target, 0.00001), t, fade / 3);
	}
}

function musicVolume() {
	if (!music.ready) return;
	const t = audioCtx.currentTime;
	// .5 keeps the score about 6 dB under the sound effects at the default setting
	const v =
		save.music === false
			? 0
			: 0.5 * (save.musicVol == null ? 0.7 : save.musicVol) * (music.duck ? 0.45 : 1);
	music.bus.gain.cancelScheduledValues(t);
	music.bus.gain.setTargetAtTime(v, t, 0.5);
	// menus muffle the music; so do the stone walls of a chamber, a little
	music.muffle.frequency.cancelScheduledValues(t);
	music.muffle.frequency.setTargetAtTime(music.duck ? 1300 : music.inside ? 2400 : 18000, t, 0.3);
}

// `late`: the step's time had passed before it could be scheduled (see
// musicTick). The chords still change, so the harmony keeps its place, but no
// short notes are played.
function musicStep(step, t, late) {
	const spb = 60 / music.tempo / 4;
	if (step % 32 === 0) {
		// a new chord every two bars
		const deg = music.prog[music.chordI % music.prog.length];
		music.chord = buildChord(deg);
		if (music.want.choir) musicPadChord(music.chord, t);
		else if (music.pad.length) {
			music.pad.forEach(v => {
				v.g.gain.setTargetAtTime(0.0001, t, 0.9);
				v.o.forEach(o => o.stop(t + 5));
			});
			music.pad = [];
		}
		if (music.want.drone) musicDrone(music.chord, t, spb * 32);
		music.windBP && music.windBP.frequency.setTargetAtTime(250 + Math.random() * 750, t, 1.2);
		music.chordI++;
		if (music.chordI % music.prog.length === 0) {
			// end of a cycle: re-arrange, now and then a new progression
			music.cycle++;
			music.arpShape = ARP_SHAPES[Math.floor(Math.random() * ARP_SHAPES.length)];
			if (music.cycle >= 2 && Math.random() < 0.5) {
				music.prog = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)];
				music.cycle = 0;
			}
			musicArrange();
		}
	}
	const ch = music.chord;
	if (!ch || late) return;
	const busy = music.tension > 0.45; // arpeggio doubles up as tension rises
	if (music.want.arp && (busy || step % 2 === 0)) {
		const i = music.arpShape[(busy ? step : step / 2) % music.arpShape.length];
		musicArp(ch.arp[i % ch.arp.length], t, music.tension);
	}
	if (music.want.pulse && step % 2 === 0 && ((step / 2) % 2 === 1 || Math.random() < 0.2))
		musicPulse(ch.bass[(step / 2) % 2], t);
	if (music.want.kalimba && step % 3 === 0 && Math.random() < 0.5) {
		const L = scaleLen();
		musicKalimba(mNote(ch.deg + Math.floor(Math.random() * L), 2), t);
	}
	if (music.want.lead && step % 4 === 0 && Math.random() < 0.35) {
		const L = scaleLen();
		musicLead(mNote(ch.deg + [0, 2, 4, L][Math.floor(Math.random() * 4)], 2), t);
	}
	if (music.want.bell && step % 16 === 0 && Math.random() < 0.35)
		musicBell(mNote([0, 4, scaleLen()][Math.floor(Math.random() * 3)], 4), t);
}

// The music is scheduled ahead, on a timer, so a slow frame doesn't stop it.
// A note whose time has already passed when it is scheduled would skip its
// short fade-in and start mid-wave, a click; after a stall several would go
// off at once. So a late step plays no short notes (musicStep), and anything
// still to come is never scheduled closer than MUSIC_MARGIN from now.
const MUSIC_AHEAD = 0.4; // seconds scheduled in advance
const MUSIC_MARGIN = 0.03; // the soonest a note may start
function musicTick() {
	if (!music.running || !audioCtx) return;
	const spb = 60 / music.tempo / 4;
	const now = audioCtx.currentTime;
	if (music.next < now - 0.5) music.next = now + 0.05; // woke from a pause: don't rush to catch up
	while (music.next < now + MUSIC_AHEAD) {
		const late = music.next < now + MUSIC_MARGIN;
		musicStep(music.step, Math.max(music.next, now + MUSIC_MARGIN), late);
		music.next += spb;
		music.step++;
	}
}

function startMusic() {
	if (save.music === false || music.running) return;
	if (!musicSetup()) return;
	music.running = true;
	music.step = 0;
	music.chordI = 0;
	music.cycle = 0;
	music.next = audioCtx.currentTime + 0.1;
	music.prog = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)];
	musicArrange();
	musicVolume();
	if (!music.timer) music.timer = setInterval(musicTick, 40);
}

function stopMusic() {
	if (!music.running) return;
	music.running = false;
	const t = audioCtx.currentTime;
	music.bus.gain.cancelScheduledValues(t);
	music.bus.gain.setTargetAtTime(0.0001, t, 0.4);
	music.pad.forEach(v => v.o.forEach(o => o.stop(t + 3)));
	music.pad = [];
}

// ---- the game talks to the music through these ----
function musicStopBegins() {
	// a new stop: new key, calm start
	music.tension = 0;
	music.progress = 0;
	music.resting = false;
	music.tempo = 92;
	if (music.running) {
		music.step = Math.ceil(music.step / 32) * 32;
		music.chordI = 0;
		music.prog = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)];
		musicArrange();
	}
}

function musicFollow() {
	// called whenever moves or the floor change
	if (!core) return;
	const used = 1 - core.movesLeft / Math.max(1, core.startMoves);
	const low = core.movesLeft <= 5 ? 0.35 : 0;
	const t = Math.min(1, Math.max(0, used * 0.8 + low));
	const before = music.tension;
	music.tension = t;
	music.progress = core.total ? 1 - core.remaining() / core.total : 1;
	music.tempo = 92 + Math.round(t * 16);
	if (music.running && Math.floor(before * 3) !== Math.floor(t * 3)) musicArrange(); // re-arrange when tension changes band
}

function musicCascade(mult, made) {
	if (!music.running || !audioCtx) return;
	const t = audioCtx.currentTime + MUSIC_MARGIN,
		L = scaleLen();
	if (mult >= 3) {
		for (let i = 0; i < Math.min(mult + 2, 8); i++)
			musicKalimba(mNote((i * 2) % (L * 2), 2), t + i * 0.07);
		musicBell(mNote(0, 4), t, 0.8);
	}
	if (made && made.some(m => m.tile.special === 'sun'))
		[0, 2, 4].forEach((d, i) => musicBell(mNote(d, 4), t + i * 0.12, 0.7));
}

function musicResolve(won) {
	// end of a stop
	if (!music.running || !audioCtx) return;
	const t = audioCtx.currentTime + 0.1;
	music.resting = true;
	music.tension = 0;
	music.tempo = 84;
	if (won) {
		music.chord = buildChord(0);
		musicPadChord(music.chord, t);
		for (let i = 0; i < 10; i++) musicLead(mNote(i, 2), t + 0.4 + i * 0.09, 0.8);
		musicBell(mNote(0, 4), t + 1.3, 1);
	}
	musicArrange();
}

function musicDuck(on) {
	music.duck = on;
	musicVolume();
}

document.addEventListener('visibilitychange', () => {
	if (!audioCtx) return;
	if (document.hidden) audioCtx.suspend();
	else if (music.running || save.sound) audioCtx.resume();
});

window.addEventListener(
	'pointerdown',
	() => {
		audioArmed = true;
		if (save.music !== false && !music.running) {
			getCtx();
			setTimeout(startMusic, 350);
		}
	},
	{ capture: true },
);
window.addEventListener(
	'keydown',
	() => {
		audioArmed = true;
		if (save.music !== false && !music.running) {
			getCtx();
			setTimeout(startMusic, 350);
		}
	},
	{ capture: true },
);
// a light tactile click whenever any button is pressed (dock, menu, overlays);
// e.target.closest handles taps that land on the icon inside the button
document.addEventListener('click', e => {
	if (e.target.closest && e.target.closest('button')) vibrate(12);
});
