/* =============================================================================
 * 03-themes.js  —  each stop's theme.
 *
 * THEMES is built from the stops, one entry per stop, in the order of LEVELS:
 *   floor   base colour of the bare stone slabs for that stop
 *   set     which amulets are in play (names of pictures in images/amulets/)
 *   audio   {root, scale, inst}: root note in Hz, scale as semitone steps,
 *           instrument: harp | lyre | oud | flute | bell
 * The scenery behind a stop is a picture: images/backdrops/<stop id>.svg
 * (or .png / .jpg), shown by setBackdrop() in src/game/05-state.js.
 * ===========================================================================*/

const THEMES = LEVELS.map(L => ({ floor: L.floor, set: L.set, audio: L.audio }));
