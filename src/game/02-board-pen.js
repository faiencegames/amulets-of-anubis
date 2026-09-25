/* =============================================================================
 * 02-board-pen.js  —  the board drawn with WebGL, on the graphics chip.
 *
 * A trial (September 2026): on a phone, drawing the board with the canvas's
 * own calls cost more than the game's rules. GLPen understands the few
 * canvas calls the board uses (19-draw.js) and turns them into WebGL: every
 * picture goes into one big texture (an atlas), so a frame of amulets, glows
 * and sparks reaches the graphics chip in one or two batches instead of
 * hundreds of calls. Gradients, rings and text are drawn by a second small
 * shader. The drawing code itself doesn't change.
 *
 * It is used wherever WebGL works on the graphics chip, unless the player
 * turned it off (Menu, Settings, "This device": localStorage "amulets-renderer"
 * = "2d"). Where WebGL is missing, fails to compile its two small programs,
 * or would run only in software, the board is a plain 2D canvas, as before.
 * Measured on three phones on 25 September 2026: about a quarter less work
 * for the page's main thread on the two newer ones.
 *
 * What's here:
 *   makeBoardPen(canvas)  the board's pen (02-screen.js): GLPen or 2D
 *   boardPen              which it is: 'gl', '2d' (turned off) or 'none'
 *                         (WebGL can't be used here); the Sound screen shows it
 *   class GLPen           the canvas calls the board uses, in WebGL
 *   glColour()            a CSS colour as premultiplied numbers
 *
 * A picture drawn on the board that changes afterwards (the floor layer,
 * bgLayer) must be marked: picture.glDirty = true (01-caches.js does).
 *
 * Changes in the save: nothing (the choice is in localStorage, not the save).
 * ===========================================================================*/

let boardPen = '2d';
function makeBoardPen(canvas) {
	let want = null;
	try {
		want = localStorage.getItem('amulets-renderer');
	} catch (e) {}
	if (want !== '2d') {
		const pen = GLPen.works() ? GLPen.create(canvas) : null;
		if (pen) {
			boardPen = 'gl';
			return pen;
		}
		boardPen = 'none';
	}
	return canvas.getContext('2d');
}

// '#rgb', '#rrggbb', '#rrggbbaa', 'rgb(...)', 'rgba(...)' as [r, g, b, a], 0 to 1
const glColourCache = new Map();
function glColour(css) {
	let c = glColourCache.get(css);
	if (c) return c;
	const s = String(css).trim();
	if (s[0] === '#') {
		const h = s.slice(1),
			long = h.length > 4,
			part = i => (long ? parseInt(h.slice(i * 2, i * 2 + 2), 16) : parseInt(h[i] + h[i], 16)) / 255;
		c = [part(0), part(1), part(2), (long ? h.length === 8 : h.length === 4) ? part(3) : 1];
	} else {
		const n = s
			.replace(/^rgba?\(|\)$/g, '')
			.split(',')
			.map(parseFloat);
		c = [n[0] / 255, n[1] / 255, n[2] / 255, n.length > 3 ? n[3] : 1];
	}
	if (glColourCache.size > 400) glColourCache.clear();
	glColourCache.set(css, c);
	return c;
}

const GL_SPRITE_VS = `
attribute vec2 aPos; attribute vec2 aUV; attribute vec4 aCol;
uniform vec2 uRes; varying vec2 vUV; varying vec4 vCol;
void main() {
	vUV = aUV; vCol = aCol;
	gl_Position = vec4(aPos.x / uRes.x * 2.0 - 1.0, 1.0 - aPos.y / uRes.y * 2.0, 0.0, 1.0);
}`;
const GL_SPRITE_FS = `
precision mediump float;
uniform sampler2D uTex; varying vec2 vUV; varying vec4 vCol;
void main() { gl_FragColor = texture2D(uTex, vUV) * vCol; }`;
// gradients (linear, radial), a ring and a round spot, in the drawing's own
// units (vLocal), so they look as the canvas would draw them
const GL_SHAPE_VS = `
attribute vec2 aPos; attribute vec2 aLocal;
uniform vec2 uRes; varying vec2 vLocal;
void main() {
	vLocal = aLocal;
	gl_Position = vec4(aPos.x / uRes.x * 2.0 - 1.0, 1.0 - aPos.y / uRes.y * 2.0, 0.0, 1.0);
}`;
const GL_SHAPE_FS = `
precision mediump float;
varying vec2 vLocal;
uniform int uMode; uniform vec2 uA; uniform vec2 uB; uniform vec2 uR; uniform float uAA;
uniform vec4 uC0; uniform vec4 uC1; uniform vec4 uC2; uniform vec4 uC3; uniform vec4 uS; uniform float uN;
vec4 stops(float t) {
	t = clamp(t, 0.0, 1.0);
	if (uN < 1.5 || t <= uS.x) return uC0;
	if (uN < 2.5 || t <= uS.y) return mix(uC0, uC1, clamp((t - uS.x) / max(uS.y - uS.x, 1e-5), 0.0, 1.0));
	if (uN < 3.5 || t <= uS.z) return mix(uC1, uC2, clamp((t - uS.y) / max(uS.z - uS.y, 1e-5), 0.0, 1.0));
	return mix(uC2, uC3, clamp((t - uS.z) / max(uS.w - uS.z, 1e-5), 0.0, 1.0));
}
void main() {
	if (uMode == 0) {
		vec2 d = uB - uA;
		gl_FragColor = stops(dot(vLocal - uA, d) / max(dot(d, d), 1e-5));
	} else if (uMode == 1) {
		gl_FragColor = stops((length(vLocal - uA) - uR.x) / max(uR.y - uR.x, 1e-5));
	} else if (uMode == 2) {
		float e = abs(length(vLocal - uA) - uR.x) - uR.y * 0.5;
		gl_FragColor = uC0 * (1.0 - smoothstep(-uAA, uAA, e));
	} else {
		float d = length(vLocal - uA);
		gl_FragColor = stops((d - uR.x) / max(uR.y - uR.x, 1e-5)) * (1.0 - smoothstep(uB.x - uAA, uB.x + uAA, d));
	}
}`;

class GLPen {
	// Tried on a spare canvas first: once the board's canvas has a WebGL
	// context it can never have a 2D one, so the fallback must be decided
	// before. No: no WebGL, too small a texture limit, a program that doesn't
	// compile, or WebGL in software only (slower than the plain canvas).
	static works() {
		try {
			const gl = document.createElement('canvas').getContext('webgl');
			if (!gl || gl.getParameter(gl.MAX_TEXTURE_SIZE) < 2048) return false;
			const info = gl.getExtension('WEBGL_debug_renderer_info'),
				name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
			if (/swiftshader|llvmpipe|software/i.test(name)) return false;
			const ok = [
				[gl.VERTEX_SHADER, GL_SPRITE_VS],
				[gl.FRAGMENT_SHADER, GL_SPRITE_FS],
				[gl.VERTEX_SHADER, GL_SHAPE_VS],
				[gl.FRAGMENT_SHADER, GL_SHAPE_FS],
			].every(([type, src]) => {
				const sh = gl.createShader(type);
				gl.shaderSource(sh, src);
				gl.compileShader(sh);
				return gl.getShaderParameter(sh, gl.COMPILE_STATUS);
			});
			const lose = gl.getExtension('WEBGL_lose_context');
			if (lose) lose.loseContext();
			return ok;
		} catch (e) {
			return false;
		}
	}

	static create(canvas) {
		let gl = null;
		try {
			gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
		} catch (e) {}
		return gl ? new GLPen(canvas, gl) : null;
	}

	constructor(canvas, gl) {
		this.canvas = canvas;
		this.gl = gl;
		this.isGL = true;
		this.globalAlpha = 1;
		this.fillStyle = '#000';
		this.strokeStyle = '#000';
		this.lineWidth = 1;
		this.font = '10px serif';
		this.textAlign = 'start';
		this.textBaseline = 'alphabetic';
		this.shadowColor = 'transparent';
		this.shadowBlur = 0;
		this.m = [1, 0, 0, 1, 0, 0];
		this.stack = [];
		this.path = null;
		this.strokeLast = null;
		this.measurer = document.createElement('canvas').getContext('2d');
		this.texts = new Map();
		canvas.addEventListener('webglcontextlost', e => e.preventDefault());
		canvas.addEventListener('webglcontextrestored', () => this.setup());
		this.setup();
	}

	// programs, buffers and an empty atlas; again after the context is lost
	setup() {
		const gl = this.gl;
		const program = (vs, fs) => {
			const p = gl.createProgram();
			[
				[gl.VERTEX_SHADER, vs],
				[gl.FRAGMENT_SHADER, fs],
			].forEach(([type, src]) => {
				const s = gl.createShader(type);
				gl.shaderSource(s, src);
				gl.compileShader(s);
				gl.attachShader(p, s);
			});
			gl.linkProgram(p);
			return p;
		};
		this.sprite = program(GL_SPRITE_VS, GL_SPRITE_FS);
		this.shape = program(GL_SHAPE_VS, GL_SHAPE_FS);
		this.loc = {};
		for (const [p, names] of [
			[this.sprite, ['aPos', 'aUV', 'aCol', 'uRes', 'uTex']],
			[
				this.shape,
				[
					'aPos',
					'aLocal',
					'uRes',
					'uMode',
					'uA',
					'uB',
					'uR',
					'uAA',
					'uC0',
					'uC1',
					'uC2',
					'uC3',
					'uS',
					'uN',
				],
			],
		])
			for (const n of names)
				this.loc[(p === this.sprite ? 's.' : 'h.') + n] =
					n[0] === 'a' ? gl.getAttribLocation(p, n) : gl.getUniformLocation(p, n);
		this.buf = gl.createBuffer();
		this.verts = new Float32Array(6 * 8 * 3000);
		this.count = 0; // vertices waiting in the batch
		this.batchTex = null;
		this.pages = []; // the atlas: 2048 x 2048 textures, filled shelf by shelf
		this.placed = new WeakMap(); // picture -> { tex, u0, v0, u1, v1 }
		this.single = new WeakMap(); // large pictures (the floor layer): a texture each
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		this.white = this.place(this.whiteCanvas());
	}

	whiteCanvas() {
		const c = document.createElement('canvas');
		c.width = c.height = 4;
		const pen = c.getContext('2d');
		pen.fillStyle = '#fff';
		pen.fillRect(0, 0, 4, 4);
		return c;
	}

	newTexture(w, h) {
		const gl = this.gl,
			tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return tex;
	}

	// a small picture into the atlas, once; a large one into a texture of its own
	place(img) {
		const w = img.naturalWidth || img.width,
			h = img.naturalHeight || img.height;
		if (!w || !h) return null; // not loaded yet
		const gl = this.gl;
		if (w > 512 || h > 512 || img.glSingle) {
			let t = this.single.get(img);
			if (!t || t.w !== w || t.h !== h) {
				this.flush();
				if (t) gl.deleteTexture(t.tex);
				t = { tex: this.newTexture(w, h), w, h, u0: 0, v0: 0, u1: 1, v1: 1 };
				this.single.set(img, t);
				img.glDirty = true;
			}
			if (img.glDirty) {
				this.flush();
				gl.bindTexture(gl.TEXTURE_2D, t.tex);
				gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, img);
				img.glDirty = false;
			}
			return t;
		}
		let p = this.placed.get(img);
		if (p) return p;
		const S = 2048,
			pad = 2;
		let page = this.pages[this.pages.length - 1];
		if (page && page.x + w > S) {
			// a new shelf under the last
			page.y += page.shelf + pad;
			page.x = 0;
			page.shelf = 0;
		}
		if (!page || page.y + h > S) {
			if (this.pages.length >= 4) return null;
			page = { tex: this.newTexture(S, S), x: 0, y: 0, shelf: 0 };
			this.pages.push(page);
		}
		this.flush();
		gl.bindTexture(gl.TEXTURE_2D, page.tex);
		gl.texSubImage2D(gl.TEXTURE_2D, 0, page.x, page.y, gl.RGBA, gl.UNSIGNED_BYTE, img);
		p = {
			tex: page.tex,
			u0: (page.x + 0.5) / S,
			v0: (page.y + 0.5) / S,
			u1: (page.x + w - 0.5) / S,
			v1: (page.y + h - 0.5) / S,
		};
		page.x += w + pad;
		page.shelf = Math.max(page.shelf, h);
		this.placed.set(img, p);
		return p;
	}

	// ---- the canvas's state ----
	save() {
		this.stack.push([
			this.m.slice(),
			this.globalAlpha,
			this.fillStyle,
			this.strokeStyle,
			this.lineWidth,
			this.font,
			this.textAlign,
			this.textBaseline,
		]);
	}
	restore() {
		const s = this.stack.pop();
		if (s)
			[
				this.m,
				this.globalAlpha,
				this.fillStyle,
				this.strokeStyle,
				this.lineWidth,
				this.font,
				this.textAlign,
				this.textBaseline,
			] = s;
	}
	setTransform(a, b, c, d, e, f) {
		this.m = [a, b, c, d, e, f];
	}
	translate(x, y) {
		const m = this.m;
		m[4] += m[0] * x + m[2] * y;
		m[5] += m[1] * x + m[3] * y;
	}
	rotate(r) {
		const m = this.m,
			cs = Math.cos(r),
			sn = Math.sin(r);
		this.m = [
			m[0] * cs + m[2] * sn,
			m[1] * cs + m[3] * sn,
			m[2] * cs - m[0] * sn,
			m[3] * cs - m[1] * sn,
			m[4],
			m[5],
		];
	}
	setLineDash() {} // the keyboard cursor is drawn solid
	createLinearGradient(x0, y0, x1, y1) {
		return { kind: 0, a: [x0, y0], b: [x1, y1], r: [0, 0], stops: [], addColorStop: GLPen.addStop };
	}
	createRadialGradient(x0, y0, r0, x1, y1, r1) {
		return { kind: 1, a: [x1, y1], b: [0, 0], r: [r0, r1], stops: [], addColorStop: GLPen.addStop };
	}
	static addStop(at, css) {
		this.stops.push([at, css]);
	}

	// ---- drawing ----
	clearRect() {
		const gl = this.gl;
		this.count = 0;
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	// one quad of a picture, corners (x, y) to (x + w, y + h) in the drawing's units
	quad(p, x, y, w, h, col) {
		if (!p) return;
		if (this.batchTex !== p.tex || this.count + 6 > this.verts.length / 8) this.flush();
		this.batchTex = p.tex;
		const m = this.m,
			v = this.verts,
			x1 = x + w,
			y1 = y + h;
		let i = this.count * 8;
		const put = (px, py, u, t) => {
			v[i] = m[0] * px + m[2] * py + m[4];
			v[i + 1] = m[1] * px + m[3] * py + m[5];
			v[i + 2] = u;
			v[i + 3] = t;
			v[i + 4] = col[0];
			v[i + 5] = col[1];
			v[i + 6] = col[2];
			v[i + 7] = col[3];
			i += 8;
		};
		put(x, y, p.u0, p.v0);
		put(x1, y, p.u1, p.v0);
		put(x, y1, p.u0, p.v1);
		put(x1, y, p.u1, p.v0);
		put(x1, y1, p.u1, p.v1);
		put(x, y1, p.u0, p.v1);
		this.count += 6;
	}

	drawImage(img, x, y, w, h) {
		const p = this.place(img);
		if (!p) return;
		if (w === undefined) {
			w = img.naturalWidth || img.width;
			h = img.naturalHeight || img.height;
		}
		const a = this.globalAlpha;
		this.quad(p, x, y, w, h, [a, a, a, a]);
	}

	solid(css, x, y, w, h) {
		const c = glColour(css),
			a = c[3] * this.globalAlpha;
		this.quad(this.white, x, y, w, h, [c[0] * a, c[1] * a, c[2] * a, a]);
	}

	fillRect(x, y, w, h) {
		if (typeof this.fillStyle === 'object')
			this.shapeDraw(this.fillStyle.kind, this.fillStyle, x, y, w, h);
		else this.solid(this.fillStyle, x, y, w, h);
	}

	strokeRect(x, y, w, h) {
		const l = this.lineWidth,
			s = this.strokeStyle;
		this.solid(s, x - l / 2, y - l / 2, w + l, l);
		this.solid(s, x - l / 2, y + h - l / 2, w + l, l);
		this.solid(s, x - l / 2, y + l / 2, l, h - l);
		this.solid(s, x + w - l / 2, y + l / 2, l, h - l);
	}

	beginPath() {
		this.path = null;
	}
	arc(x, y, r) {
		this.path = [x, y, r];
	}
	fill() {
		if (!this.path) return;
		const [x, y, r] = this.path,
			g =
				typeof this.fillStyle === 'object'
					? this.fillStyle
					: { kind: 1, a: [x, y], r: [0, r], stops: [[0, this.fillStyle]] };
		this.shapeDraw(3, { ...g, b: [r, 0] }, x - r, y - r, 2 * r, 2 * r);
	}
	stroke() {
		if (!this.path) return;
		const [x, y, r] = this.path,
			l = this.lineWidth,
			o = r + l;
		this.shapeDraw(
			2,
			{ a: [x, y], b: [0, 0], r: [r, l], stops: [[0, this.strokeStyle]] },
			x - o,
			y - o,
			2 * o,
			2 * o,
		);
	}

	// a gradient, ring or spot over the rectangle (x, y, w, h): its own draw
	shapeDraw(mode, g, x, y, w, h) {
		this.flush();
		const gl = this.gl,
			L = this.loc,
			m = this.m,
			a = this.globalAlpha;
		gl.useProgram(this.shape);
		gl.uniform2f(L['h.uRes'], this.canvas.width, this.canvas.height);
		gl.uniform1i(L['h.uMode'], mode);
		gl.uniform2f(L['h.uA'], g.a[0], g.a[1]);
		gl.uniform2f(L['h.uB'], g.b[0], g.b[1]);
		gl.uniform2f(L['h.uR'], g.r[0], g.r[1]);
		gl.uniform1f(L['h.uAA'], 0.8 / Math.max(0.1, Math.hypot(m[0], m[1])));
		const stops = g.stops.slice(0, 4);
		['h.uC0', 'h.uC1', 'h.uC2', 'h.uC3'].forEach((k, i) => {
			const c = glColour((stops[i] || stops[stops.length - 1] || [0, 'rgba(0,0,0,0)'])[1]),
				al = c[3] * a;
			gl.uniform4f(L[k], c[0] * al, c[1] * al, c[2] * al, al);
		});
		const at = i => (stops[i] ? stops[i][0] : 1);
		gl.uniform4f(L['h.uS'], at(0), at(1), at(2), at(3));
		gl.uniform1f(L['h.uN'], stops.length);
		const X = (px, py) => m[0] * px + m[2] * py + m[4],
			Y = (px, py) => m[1] * px + m[3] * py + m[5];
		const d = new Float32Array(
			[
				[x, y],
				[x + w, y],
				[x, y + h],
				[x + w, y],
				[x + w, y + h],
				[x, y + h],
			].flatMap(([px, py]) => [X(px, py), Y(px, py), px, py]),
		);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
		gl.bufferData(gl.ARRAY_BUFFER, d, gl.STREAM_DRAW);
		this.attribs([
			[L['h.aPos'], 2, 16, 0],
			[L['h.aLocal'], 2, 16, 8],
		]);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	attribs(list) {
		const gl = this.gl;
		for (let i = 0; i < 4; i++) gl.disableVertexAttribArray(i);
		for (const [loc, size, stride, off] of list) {
			if (loc < 0) continue;
			gl.enableVertexAttribArray(loc);
			gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off);
		}
	}

	// ---- text (the popups): drawn once into a small canvas, then a picture ----
	measureText(s) {
		this.measurer.font = this.font;
		return this.measurer.measureText(s);
	}
	strokeText(s, x, y) {
		this.strokeLast = [s, this.strokeStyle, this.lineWidth];
	}
	fillText(s, x, y) {
		const stroke = this.strokeLast && this.strokeLast[0] === s ? this.strokeLast : null,
			key = [s, this.font, this.fillStyle, stroke && stroke[1], stroke && stroke[2], this.m[0]].join(
				'|',
			);
		let c = this.texts.get(key);
		if (!c) {
			const scale = Math.hypot(this.m[0], this.m[1]),
				lw = stroke ? stroke[2] : 0;
			this.measurer.font = this.font;
			const mt = this.measurer.measureText(s),
				size = parseFloat(this.font.replace(/^\D*/, '')) || 16,
				w = mt.width + lw * 2 + 4,
				h = size * 1.4 + lw * 2;
			c = document.createElement('canvas');
			c.width = Math.ceil(w * scale);
			c.height = Math.ceil(h * scale);
			const pen = c.getContext('2d');
			pen.scale(scale, scale);
			pen.font = this.font;
			pen.textAlign = 'center';
			pen.textBaseline = 'middle';
			if (stroke) {
				pen.lineWidth = lw;
				pen.strokeStyle = stroke[1];
				pen.strokeText(s, w / 2, h / 2);
			}
			pen.fillStyle = this.fillStyle;
			pen.fillText(s, w / 2, h / 2);
			c.w = w;
			c.h = h;
			c.glSingle = true; // a texture of its own, dropped with the others below
			if (this.texts.size > 40) this.dropTexts();
			this.texts.set(key, c);
		}
		// placed as the board places it: centred, middle
		const a = this.globalAlpha;
		this.quad(this.place(c), x - c.w / 2, y - c.h / 2, c.w, c.h, [a, a, a, a]);
		this.strokeLast = null;
	}

	// ---- the end of a frame, and a new board size ----
	flush() {
		if (!this.count) return;
		const gl = this.gl,
			L = this.loc;
		gl.useProgram(this.sprite);
		gl.uniform2f(L['s.uRes'], this.canvas.width, this.canvas.height);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.batchTex);
		gl.uniform1i(L['s.uTex'], 0);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
		gl.bufferData(gl.ARRAY_BUFFER, this.verts.subarray(0, this.count * 8), gl.STREAM_DRAW);
		this.attribs([
			[L['s.aPos'], 2, 32, 0],
			[L['s.aUV'], 2, 32, 8],
			[L['s.aCol'], 4, 32, 16],
		]);
		gl.drawArrays(gl.TRIANGLES, 0, this.count);
		this.count = 0;
	}

	dropTexts() {
		for (const c of this.texts.values()) {
			const t = this.single.get(c);
			if (t) this.gl.deleteTexture(t.tex);
		}
		this.texts.clear();
	}

	// the square size changed (fit()): the scaled pictures are all new
	reset() {
		const gl = this.gl;
		this.count = 0;
		this.pages.forEach(p => gl.deleteTexture(p.tex));
		this.pages = [];
		this.placed = new WeakMap();
		this.dropTexts();
		this.white = this.place(this.whiteCanvas());
	}
}
