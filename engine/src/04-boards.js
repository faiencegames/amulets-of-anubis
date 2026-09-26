/* =============================================================================
 * 04-boards.js: what the board is made of: the colours of its frame, the
 * amulet sets (looks) and the floor squares.
 *
 * What's here:
 *   BOARDS              one per stop, in the order of LEVELS: the [face,
 *                       shade, edge] colours of the carved frame. What shows
 *                       through the gaps of the floor is a picture,
 *                       images/boards/<stop id>.
 *   TILE_SPRITES        the amulets in play, drawn in the chosen amulet set
 *   skinned()           an amulet set's pictures: the same drawings through a
 *                       canvas filter (content/amulet-sets/)
 *   FLOOR_SETS          the floor sets (content/floor-sets/, images/floors/)
 *   buildFloors()       makes FLOOR_STONE, FLOOR_THICK and FLOOR_GOLD, the
 *                       squares for the stop being played (05-state.js,
 *                       river events, the Treasury)
 *   floorTextures()     the same, for a preview, without touching the board
 *
 * Changes in the save: nothing.
 * ===========================================================================*/

// One board per stop, in LEVELS order: the colours of the carved frame round
// it. What is seen through the gaps of the floor is a picture,
// images/boards/<stop id>.svg (or .png / .jpg), shown by setBoard() in src/game/05-state.js.
const BOARDS = LEVELS.map(stop => ({ frame: stop.frame }));
let TILE_SPRITES = [],
	TILE_NAMES = []; // TILE_NAMES: which amulets the board is using right now
// Cosmetic finishes: the same drawings re-rendered through a canvas filter.
const skinCache = new Map();
function skinned(src, name, skinId) {
	if (SET_PICS[skinId] && SET_PICS[skinId][name]) src = SET_PICS[skinId][name]; // the set's own picture
	const skin = skinById(skinId);
	if (!skin.filter && !skin.glow) return src;
	const key = name + '|' + skinId;
	if (skinCache.has(key)) return skinCache.get(key);
	const c = document.createElement('canvas');
	c.width = c.height = PIC_SIZE;
	const pen = c.getContext('2d');
	if (skin.glow) {
		pen.save();
		pen.shadowColor = skin.glow;
		pen.shadowBlur = 14;
		for (let i = 0; i < 3; i++) pen.drawImage(src, 0, 0);
		pen.restore();
		pen.globalCompositeOperation = 'destination-out';
		pen.drawImage(src, 0, 0);
		pen.globalCompositeOperation = 'source-over';
	}
	pen.filter = skin.filter || 'none';
	pen.drawImage(src, 0, 0);
	pen.filter = 'none';
	if (skin.tint) {
		pen.globalCompositeOperation = 'source-atop';
		pen.globalAlpha = skin.tintAlpha || 0.25;
		pen.fillStyle = skin.tint;
		pen.fillRect(0, 0, PIC_SIZE, PIC_SIZE);
		pen.globalAlpha = 1;
		pen.globalCompositeOperation = 'source-over';
	}
	if (skinCache.size > 150) skinCache.clear(); // up to ~10 MB of 128px canvases
	skinCache.set(key, c);
	return c;
}

// ---------- floors: the squares under the amulets ----------
// Each floor set is a folder of pictures, images/floors/<set id>/: bare,
// thick, and one or more gilded squares (the gilded ones are mixed so a golden
// floor isn't repetitive). A set with "uses_each_stops_own_stone" (ownStone)
// has see-through bare and thick pictures, laid over each stop's own
// stone colour; thick stone is that colour darkened.
let FLOOR_STONE = null,
	FLOOR_THICK = null,
	FLOOR_GOLD = null;
function shade(hex, f) {
	const n = parseInt(hex.slice(1), 16);
	const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * f));
	return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

const FLOOR_SETS = CONTENT.floorSets;
function floorSetById(id) {
	return FLOOR_SETS.find(f => f.id === id) || FLOOR_SETS[0];
}

// The squares of a floor set at stop i: [bare, thick, gilded...].
function floorSquares(setId, i) {
	const set = floorSetById(setId),
		p = FLOOR_PICS[set.id],
		col = THEMES[i].floor;
	const on = (under, img) =>
		makeCanvas(pen => {
			if (under) {
				pen.fillStyle = under;
				pen.fillRect(0, 0, PIC_SIZE, PIC_SIZE);
			}
			if (img) pen.drawImage(img, 0, 0, PIC_SIZE, PIC_SIZE);
		});
	return [
		on(set.ownStone && col, p.bare),
		on(set.ownStone && shade(col, 0.62), p.thick),
		...p.gilded.map(img => on(null, img)),
	];
}

// The three kinds of square for a floor set at stop i, without touching the
// board (used by the Customise previews).
function floorTextures(setId, i) {
	return floorSquares(setId, i).slice(0, 3);
}

// Builds FLOOR_STONE / FLOOR_THICK / FLOOR_GOLD for the stop being played.
function buildFloors(i) {
	[FLOOR_STONE, FLOOR_THICK, ...FLOOR_GOLD] = floorSquares(save.floor, i);
	scaledTiles.clear();
	bgDirty = true;
}
