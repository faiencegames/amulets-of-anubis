/* =============================================================================
 * 02-pictures.js  —  loads every picture before the game starts.
 *
 * The pictures are files in images/ (see images/README.md); the build embeds
 * them in PICTURES (00-open.js). Nothing here draws: this only turns them into
 * images the canvas can paint.
 *   SPR[name]       amulets, each a 128 x 128 canvas (images/amulets/)
 *   SPECIAL[name]   the marks of special amulets (images/specials/)
 *   BADGE[kind]     badges (images/badges/)
 *   FLOOR_PICS[id]  {bare, thick, gilded:[...]} per floor set (images/floors/)
 * Backdrops, board backings and relic pictures are used straight from
 * PICTURES by the code that shows them.
 * ===========================================================================*/

const S = 128; // amulets and floor squares are handled at 128 x 128
function mk(fn) {
	const c = document.createElement('canvas');
	c.width = c.height = S;
	const g = c.getContext('2d');
	g.lineJoin = 'round';
	g.lineCap = 'round';
	fn(g);
	return c;
}

const SPR = {},
	SPECIAL = {},
	BADGE = {},
	FLOOR_PICS = {};

function loadImage(src) {
	return new Promise(done => {
		const img = new Image();
		img.onload = () => done(img);
		img.onerror = () => {
			console.warn('Could not load a picture');
			done(null);
		};
		img.src = src;
	});
}

function loadPictures() {
	const jobs = [];
	const each = (group, into, make) =>
		Object.entries(PICTURES[group]).forEach(([name, src]) =>
			jobs.push(
				loadImage(src).then(img => {
					if (img) into[name] = make ? make(img, name) : img;
				})
			)
		);
	// an amulet fills its square as drawn (in proportion); an amulet with no file in
	// content/amulets/ still gets a name for the codex and for trials
	each('amulets', SPR, (img, name) => {
		if (!AMULET_NAMES[name]) AMULET_NAMES[name] = name.replace(/-/g, ' ') + 's';
		if (!AMULET_INFO[name])
			AMULET_INFO[name] = [
				name.replace(/-/g, ' ').replace(/^./, m => m.toUpperCase()),
				Tplain('amulets.added'),
			];
		return mk(g => {
			const k = Math.min(S / img.width, S / img.height); // kept in proportion, centred
			g.drawImage(
				img,
				(S - img.width * k) / 2,
				(S - img.height * k) / 2,
				img.width * k,
				img.height * k
			);
		});
	});
	each('specials', SPECIAL);
	each('badges', BADGE);
	Object.entries(PICTURES.floors).forEach(([id, f]) => {
		const out = (FLOOR_PICS[id] = { bare: null, thick: null, gilded: [] });
		jobs.push(
			loadImage(f.bare).then(i => (out.bare = i)),
			loadImage(f.thick).then(i => (out.thick = i)),
			...f.gilded.map((src, k) => loadImage(src).then(i => (out.gilded[k] = i)))
		);
	});
	return Promise.all(jobs);
}
