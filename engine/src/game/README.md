# src/game — the running game

Everything the player sees move, hear or click, one file per part of the
game. The rules themselves (matching, cascades, specials, boons, curses) are
in `src/01-core.js`, which has no browser code so the simulators can run it.

`build.py` joins these files in file-name order, after `00-open.js`,
`02-pictures.js`, `03-themes.js` and `04-boards.js`, and `web/shell.html`
wraps them all in one function. Each file is complete JavaScript on its own.
So:

* **The numbers are the order.** A `let` or `const` that is used while the
  game starts (by `fit()`, or anything the boot calls) must sit in an earlier
  file than its first use, or the game throws on load. Functions don't mind:
  a `function` can be called from any file.
* **A new file** needs only a name with the right number; the build picks it
  up. Keep one part of the game per file.
* **To find something**, search the folder for its name (`openStall`,
  `useBoon`). Headings such as `// ---------- sound ----------` mark the
  parts inside a file.

| File | Holds |
|------|-------|
| `01-caches.js` | The drawing caches: the floor and its shadows, pre-scaled amulets, drawn once and reused every frame |
| `02-screen.js` | `$()`, `Tplain()`, the canvas and `fit()`, which sizes the board to the window |
| `03-sound.js` | The sound effects, synthesised: plucked strings, bells, gongs, stone |
| `04-music.js` | The generated music, and how the game talks to it |
| `05-state.js` | The game's state, `startLevel()`, the board frame, the scenery and the HUD |
| `06-icons.js` | `iconSvg()` and `iconArt()`: the SVG icons from `images/icons/` |
| `07-trials-boons.js` | Curses, trials (offer, progress, reward) and using a boon |
| `08-relics.js` | The relic icons and `grantRelic()` |
| `09-unlocks.js` | When each look unlocks, and the banners that announce new things |
| `10-river-events.js` | River events between stops: the choice cards, and the small boards they play on |
| `11-chambers.js` | Tombs, temples and oases beside the stops, and returning to them |
| `12-stall.js` | Refunds, and the stall |
| `13-saves.js` | Save codes, and starting a new journey |
| `14-menu.js` | Sound and music settings, the menu, and the difficulty screen |
| `15-title.js` | The title screen |
| `16-treasury.js` | The Treasury, `applyLook()`, and the previews of each look |
| `17-museum.js` | The Museum of relics |
| `18-customise.js` | The Customise screen |
| `19-draw.js` | One animation frame: update and draw, the amulets and badges |
| `20-effects.js` | Sparks and vibration |
| `21-moves.js` | Playing a move: swapping, clearing, scoring, falling, cascades |
| `22-input.js` | Pointer, drag and keyboard |
| `23-scrolls.js` | Scrolls and overlays: `showMsg()`, opening and closing |
| `24-win-lose.js` | Winning and losing a stop |
| `25-codex.js` | How to play |
| `26-stages.js` | Staging: the game's parts arriving one at a time |
| `27-seals.js` | Seals: the three challenges at each stop |
| `28-map.js` | The map, the stop card, and the stop's amulets |
| `29-buttons.js` | What each button on the screen does |
| `30-boot.js` | Starting the game once the pictures are loaded |
