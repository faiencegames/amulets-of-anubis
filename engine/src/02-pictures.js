/* =============================================================================
 * 02-pictures.js  —  loads every picture before the game starts.
 *
 * The pictures are files in images/ (see images/README.md); the build embeds
 * them in PICTURES (00-open.js). Nothing here draws: this only turns them into
 * images the canvas can paint.
 *
 * What's here:
 *   loadPictures()      loads them all; 30-boot.js starts the game when done
 *   AMULET_PICS[name]   amulets, each a 128 x 128 canvas (images/amulets/)
 *   SPECIAL[name]       the marks of special amulets (images/specials/)
 *   BADGE[kind]         badges (images/badges/)
 *   COVER_PICS[name]    covers, drawn over an amulet (images/covers/), and
 *                       coverPicture(tile), the one for a tile's cover and
 *                       the layers it has left
 *   FLOOR_PICS[id]      {bare, thick, gilded:[...]} per floor set
 *                       (images/floors/)
 *   PIC_SIZE, makeCanvas()  the 128-pixel size, and a helper that makes a canvas
 *                       of it (used by 04-boards.js)
 *
 * Backdrops, board backings and relic pictures are used straight from
 * PICTURES by the code that shows them.
 *
 * Changes in the save: nothing.
 * ===========================================================================*/

const PIC_SIZE = 128; // amulets and floor squares are handled at 128 x 128
function makeCanvas(fn) {
	const c = document.createElement('canvas');
	c.width = c.height = PIC_SIZE;
	const pen = c.getContext('2d');
	pen.lineJoin = 'round';
	pen.lineCap = 'round';
	fn(pen);
	return c;
}

const AMULET_PICS = {},
	SPECIAL = {},
	BADGE = {},
	COVER_PICS = {},
	FLOOR_PICS = {};

// a cover with layers may have a picture for each number left (sand-2)
function coverPicture(tile) {
	return COVER_PICS[tile.cover + '-' + tile.layers] || COVER_PICS[tile.cover];
}

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
				}),
			),
		);
	// an amulet fills its square as drawn (in proportion); an amulet with no file in
	// content/amulets/ still gets a name for the codex and for trials
	each('amulets', AMULET_PICS, (img, name) => {
		if (!AMULET_NAMES[name]) AMULET_NAMES[name] = name.replace(/-/g, ' ') + 's';
		if (!AMULET_INFO[name])
			AMULET_INFO[name] = [
				name.replace(/-/g, ' ').replace(/^./, m => m.toUpperCase()),
				Tplain('amulets.added'),
			];
		return makeCanvas(pen => {
			const k = Math.min(PIC_SIZE / img.width, PIC_SIZE / img.height); // kept in proportion, centred
			pen.drawImage(
				img,
				(PIC_SIZE - img.width * k) / 2,
				(PIC_SIZE - img.height * k) / 2,
				img.width * k,
				img.height * k,
			);
		});
	});
	each('specials', SPECIAL);
	each('badges', BADGE);
	each('covers', COVER_PICS);
	Object.entries(PICTURES.floors).forEach(([id, f]) => {
		const out = (FLOOR_PICS[id] = { bare: null, thick: null, gilded: [] });
		jobs.push(
			loadImage(f.bare).then(i => (out.bare = i)),
			loadImage(f.thick).then(i => (out.thick = i)),
			...f.gilded.map((src, k) => loadImage(src).then(i => (out.gilded[k] = i))),
		);
	});
	return Promise.all(jobs);
}
