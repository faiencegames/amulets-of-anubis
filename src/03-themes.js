/* =============================================================================
 * 03-themes.js  —  each stop's theme, taken from its file in content/stops/.
 *
 * What's here:
 *   THEMES              one entry per stop, in the order of LEVELS:
 *                         floor  base colour of the bare stone
 *                         set    which amulets are in play
 *                         audio  {root, scale, inst}: the home note in Hz, the
 *                                scale as steps, and the instrument
 *                       Used by the sound, the music, the board and How to
 *                       play.
 *
 * The scenery behind a stop is a picture, images/backdrops/<stop id>.svg,
 * shown by setBackdrop() in src/game/05-state.js.
 *
 * Changes in the save: nothing.
 * ===========================================================================*/

const THEMES = LEVELS.map(stop => ({ floor: stop.floor, set: stop.set, audio: stop.audio }));
