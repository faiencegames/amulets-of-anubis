/* =============================================================================
 * 04-boards.js  —  the board: frame colours, amulet sets and floors.
 *
 * BOARDS is built from the stops, one per stop, in the order of LEVELS:
 *   frame  [face, shade, edge] colours for the carved frame round the board
 * What shows through the gaps of the floor is a picture (images/boards/).
 * Below: amulet sets (skinned, the same pictures through a canvas filter) and
 * the floor squares, made from the pictures in images/floors/.
 * ===========================================================================*/

// One board per stop, in LEVELS order: the colours of the carved frame round
// it. What is seen through the gaps of the floor is a picture,
// images/boards/<stop id>.svg (or .png / .jpg), shown by setBoard() in src/game/05-state.js.
const BOARDS = LEVELS.map(L => ({ frame: L.frame }));
let TILE_SPRITES = [],
	TILE_NAMES = []; // TILE_NAMES: which amulets the board is using right now
// Cosmetic finishes: the same drawings re-rendered through a canvas filter.
const skinCache = new Map();
function skinned(src, name, skinId) {
	const skin = skinById(skinId);
	if (!skin.filter && !skin.glow) return src;
	const key = name + '|' + skinId;
	if (skinCache.has(key)) return skinCache.get(key);
	const c = document.createElement('canvas');
	c.width = c.height = S;
	const g = c.getContext('2d');
	if (skin.glow) {
		g.save();
		g.shadowColor = skin.glow;
		g.shadowBlur = 14;
		for (let i = 0; i < 3; i++) g.drawImage(src, 0, 0);
		g.restore();
		g.globalCompositeOperation = 'destination-out';
		g.drawImage(src, 0, 0);
		g.globalCompositeOperation = 'source-over';
	}
	g.filter = skin.filter || 'none';
	g.drawImage(src, 0, 0);
	g.filter = 'none';
	if (skin.tint) {
		g.globalCompositeOperation = 'source-atop';
		g.globalAlpha = skin.tintAlpha || 0.25;
		g.fillStyle = skin.tint;
		g.fillRect(0, 0, S, S);
		g.globalAlpha = 1;
		g.globalCompositeOperation = 'source-over';
	}
	if (skinCache.size > 150) skinCache.clear(); // up to ~10 MB of 128px canvases
	skinCache.set(key, c);
	return c;
}

// ---------- floors: the squares under the amulets ----------
// Each floor set is a folder of pictures, images/floors/<set id>/: bare,
// thick, and one or more gilded squares (the gilded ones are mixed so a golden
// floor isn't repetitive). A set with "uses_each_stops_own_stone" (the temple
// floor) has see-through bare and thick pictures, laid over each stop's own
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
		mk(g => {
			if (under) {
				g.fillStyle = under;
				g.fillRect(0, 0, S, S);
			}
			if (img) g.drawImage(img, 0, 0, S, S);
		});
	return [
		on(set.temple && col, p.bare),
		on(set.temple && shade(col, 0.62), p.thick),
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
