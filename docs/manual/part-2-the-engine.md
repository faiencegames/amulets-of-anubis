# Part 2: The engine

*The manual of Amulets of Anubis, for programmers: how the game works
inside, and how to change it.*

[Part 1](part-1-making-things.md) covers everything that is done with
content files and pictures. This part assumes you have read its chapter 3,
*How the game is put together*, and know some JavaScript and Python.

**Contents**

1. [The shape of it](#1-the-shape-of-it)
2. [The build](#2-the-build)
3. [The source](#3-the-source)
4. [The rules](#4-the-rules)
5. [The running game](#5-the-running-game)
6. [Screens and the interface](#6-screens-and-the-interface)
7. [The systems](#7-the-systems)
8. [Sound and music](#8-sound-and-music)
9. [Extending the engine](#9-extending-the-engine)
10. [Saving](#10-saving)
11. [Balance and the simulators](#11-balance-and-the-simulators)
12. [Performance](#12-performance)
13. [The stylesheet](#13-the-stylesheet)
14. [Testing](#14-testing)
15. [Packaging](#15-packaging)
16. [House style](#16-house-style)

---

## 1. The shape of it

The game is **one HTML file**, and it is meant to keep working, unchanged,
for decades. Four constraints follow from that, and every change has to
keep them:

- **One file.** `python3 build.py` writes `dist/amulets-of-anubis.html`, and
  that file is the game. It runs from `file://` with no server.
- **No network.** No CDNs, web fonts, analytics or `fetch`. The fonts are
  embedded. `grep -c "https://" dist/amulets-of-anubis.html` must print `0`.
- **No dependencies.** Plain HTML, CSS and JavaScript, no packages,
  frameworks or bundlers. The build needs Python 3; the game needs a
  browser. Pictures are files; every sound is synthesised.
- **Old WebViews.** The same file runs in the Android app, from Android 7
  up. Avoid what WebView lacks, or give it a fallback.

The organising idea is that **content and code are separate**. Everything
a player sees or reads that isn't a rule is content, one file per thing in
`content/`. The rules, the drawing, the sound and the screens are code, in
`src/`. `build.py` is the seam: it checks the content and pours it into
the code.

```
build.py            checks content/ and images/, joins src/ and web/, writes dist/
content/            the content, one file per thing, and text.json, settings.json
images/             every picture; icons in images/icons/<group>/
src/01-core.js      the rules, with no browser code (the simulators run it)
src/00-open.js      opens the closure, loads and migrates the save
src/02-pictures.js  loads the pictures before the game starts
src/03-themes.js    per-stop themes, built from the stops
src/04-boards.js    frame colours, amulet sets, floor squares
src/game/           the running game, one file per part (listed in its README)
web/shell.html      the page, with holes the build fills
web/css/            the stylesheet, one file per part of the screen
web/fonts.css       the two typefaces, embedded
tools/              simulators, performance checks, screenshots, drawing scripts
platforms/          the Android and desktop wrappers
```

## 2. The build

`build.py` runs in this order, and **writes nothing if any step fails**,
so a broken content file never ships a broken game.

1. **Name lists from the code.** Some names a content file may use are
   defined in the code, and the build reads them from it by pattern:
   boon effects (`BOON_EFFECTS` in `src/game/07-trials-boons.js`), badge
   powers (`BADGE_POWERS`) and hardships (`HARDSHIPS`, both in
   `src/01-core.js`). Others are listed at the top of `build.py`:
   instruments, scales, board modes, trial goals, upgrade effects,
   condition names, special pictures, colour changes. Add to those by
   hand when you add one in the code.
2. **Pictures and icons.** Every file in `images/` goes into `PICTURES`;
   every SVG in `images/icons/<group>/` into `ICONS`, cleaned of comments.
3. **Content.** Each folder in `content/` is read in file-name order. Files
   may carry `//` comments and trailing commas, which are stripped with
   line positions kept, so errors point at the right line. Each kind has a
   validator (`stop()`, `boon()`, `badge()` and so on) built on a small
   `Check` class that reports by file, field and line and suggests the
   nearest name for a typo. The `KINDS` table ties folders to validators.
4. **References.** Anything that names another thing (a stop's amulets and
   floor shapes, a relic's condition, a stall item's boon, a trial's boon)
   is checked once everything is read (`LATER`).
5. **Settings and text.** `settings()` parses `content/settings.json` into
   the numbers the code reads as `CONTENT.settings`. `content/text.json`
   is checked against the code: every `T('…')` and `{{…}}` must have a key.
   Keys the code builds from an id (`T('codex.tabs.' + id)`) can't be found
   by searching, so they are listed in `TEXT_FAMILIES`.
6. **Joining.** `src/00-open.js`, `02-pictures.js`, `03-themes.js`,
   `04-boards.js` and then every file in `src/game/` in name order are
   joined into one closure. `web/css/` is joined in name order.
7. **Filling the holes.** Literal string replacements put the checked
   content, pictures, icons, styles, fonts and code into
   `web/shell.html`: `/*CONTENT*/null`, `/*IMAGES*/null`, `/*ICONS*/null`,
   `/*STYLES*/`, `/*FONTS*/`, `/*CORE*/`, `/*UI*/`. **These placeholders
   are load-bearing**: change the spelling in one place and the build
   injects into nothing.

`--check` validates without writing. `--watch` rebuilds on save.
`--content-json` prints the checked content and nothing else, which is how
the simulators get it (`tools/load-core.js`). The build also writes
`dist/try-it.html`, which opens try-out mode at the file changed last.

## 3. The source

Everything in `src/` runs inside **one closure**, top to bottom, in file
order. So:

- **The numbers are the order.** A `let` or `const` used while the game
  starts (by `fit()`, or anything the boot calls) must be declared in an
  earlier file than its first use, or the game throws on load (a temporal
  dead zone). Functions are hoisted and don't mind.
- **A new file** needs only a name with the right number.
- **To find something**, search `src/game/` for its name. Headings like
  `// ---------- sound ----------` mark the parts inside a file.
  `src/game/README.md` lists what each file holds.

`src/01-core.js` holds the rules and has **no browser code** at all: no
`document`, `window`, canvas or audio. That is what lets the simulators run
the real rules in Node. Keep it that way.

The code is in one plain style throughout: tabs, one statement per line,
spaces after commas and around operators, braces on the same line, single
quotes, lines up to about 110 characters, a blank line between functions.

## 4. The rules

### The board

`Core` (in `01-core.js`) holds three flat arrays of length `N × ROWS`:

- `mask[k]`: is this square part of the floor;
- `floor[k]`: layers of stone left (`0` gilded, `1` bare, `2` thick);
- `cells[k]`: the amulet there, `{type, special, id}` and flags such as
  `badge`, `sand` or `wet`, or `null`.

`N` is the number of **columns** and `ROWS` the number of rows; boards are
often taller than wide, so index by `k = r * N + c` and never assume a
square. `N` and `ROWS` are module-level `let`s set by `setBoardSize()` before
a stop is built.

### A move

`isValid` → `swap` → `clearStep` → `gravity` → `clearStep` again, until
nothing clears. `clearStep` finds runs of three or more, decides which
specials are made, sets off specials caught in the blast (chains
included), fires the powers of cleared badges, reduces the floor under
everything cleared, and **returns lists of what happened**. The game layer
animates those lists and never works out a rule itself, which is why a
bot can play the same code headlessly.

**Specials** come from the shape of a match: four in a row makes a banded
amulet, an L or T a ringed one (the Star of Sopdet if one arm is four),
five in a row the winged sun. Two specials swapped together combine
(`COMBO`).

**Badges** are marks a new amulet can fall wearing, at the difficulty's
`powerChance`, picked by each badge's `weight` (`pickBadge()`). When a
badged amulet clears, `clearStep` calls its power from `BADGE_POWERS`,
which records what it did (`targets`, extra gilding) for the game to show.
Cursed badges are kept rare and switched off on Relaxed and in river events.

### Building a stop: `stopOptions()`

**Every board is built through `stopOptions()`**, the game's and the
simulators' alike, so a test plays the stop a player gets. It takes the
stop, the difficulty, the board mode and size, Treasury upgrades,
persistence, omens, a curse, and whether badges have arrived yet, and
returns the options `Core` is made with: the floor plan, the moves, the
badge chance. Hardships (curses and omens) change these options through
their `options(o, n)` part, and change the filled board through `board(core, n)`.

### Board modes

`BOARD_MODES` has one entry per board: `classic` (8 wide), `grand`,
`ruins` (generated ruins, `ruinsPlan()`) and `omega` (as large as the
window, `omegaPlan()`). Each gives its `layout()`, how its `moves` scale,
and `tall` (extra moves for a tall board). Omega is `dynamic`: its size is
measured from the window when a stop starts, by `omegaSize()`, and anything
that previews a board must measure the same way. Generated plans must pass
`allMatchable(rows)`: every playable square must lie on some run of three.

### Conditions

Relics, looks, seals and staging use one condition language: a block like
`{"stops_won": 10, "win_on_difficulty": "Hard"}` where every entry must
hold. `conditionMet(when, s)` checks it; `CONDITION_COUNTERS` holds the
counted ones and the win conditions read `s.lastWin`. `needProgress()`
in `game/09-unlocks.js` gives the "7 of 9" shown on a locked look, and
`conditionText()` the words.

## 5. The running game

- **State** (`game/05-state.js`): `startLevel()` builds a stop, sets up the
  board frame, the scenery, the note beside the board and the HUD.
  `updateHUD()` refreshes the numbers and the gilding tube.
- **Drawing** (`game/19-draw.js`): one canvas. `frame()` updates and draws
  the amulets, badges and effects each animation frame. The floor and its
  shadows are drawn once into an offscreen canvas (`game/01-caches.js`) and
  copied; anything that changes `core.floor` must set `bgDirty = true`.
- **Moves** (`game/21-moves.js`): swapping, `showClear()` animating what
  `clearStep` returned, falling, cascades, scoring and earnings.
- **Input** (`game/22-input.js`): pointer, drag and keyboard. Keyboard play
  (arrows, Enter, Escape) must keep working.
- **Effects** (`game/20-effects.js`): sparks, beams, orbs, rings, flashes,
  popups and vibration, all plain arrays that `frame()` draws.
- **Busy**: while a move plays out, `busy` is true and input waits.
  `settle()` returns a promise that resolves when the board is still.

## 6. Screens and the interface

The interface has a small set of rules. Follow them, and a new screen looks
like the rest without new CSS.

### Scrolls: `showMsg()`

Almost every screen is a papyrus scroll (`#ovMsg`), opened with
`showMsg(html, actions, opts)` in `game/23-scrolls.js`. Each action is
`[label, what it does]`, with an optional third part saying how it looks:

```js
showMsg(html, [
	[Tplain('win.sail', { stop: next.name }), () => goNext(i + 1), { kind: 'go', sub: next.sub, icon: iconSvg('ui', 'barque') }],
	[Tplain(placeKey(door, 'explore'), { name }), () => startChamber(door), { kind: 'card', dark: true, icon: iconSvg('map', placeIcon(door)) }],
	[Tplain('win.map'), openMap, { kind: 'quiet', icon: iconSvg('dock', 'map') }],
], { noClose: true });
```

- **`go`**: the usual next step. **One per scroll**: a big sandstone
  button, full width, with a line under it (`sub`) saying where it goes.
- **`card`**: another way to go, smaller, with a line under it.
- **`dark: true`**: the way into a tomb, in torchlit brown; with
  `oasis: true`, blue daylight.
- **`quiet`**: everything else (the map, replaying, leaving): small
  buttons in a row at the foot.
- **`hidden: true`** starts an action hidden, for a screen that swaps its
  big button (the stop card does, per tile).
- An action with none of these is a plain button, as in the shops.

`opts.noClose` hides the × and blocks Escape, for scrolls that need a
decision (winning, losing). `opts.onClose` says what closing means when it
isn't "back to the board": the stop card's × goes back to the map.

<img src="../images/screenshot-win.jpg" width="360" alt="Karnak gilded: stars, rewards, seals, then Sail to Deir el-Bahari as the big button, the doorway as a torchlit card, and the map and replay small at the foot">

*The three kinds on one scroll: `go` (sail on), a `card` with `dark: true`
(the doorway), and two `quiet` ones at the foot.*

### The visual language

- **Buttons are sandstone**: a beige gradient with a bevelled border
  (light top-left, dark bottom-right). **Chosen is pressed in**: the bevel
  reversed, a lighter face and a 2 px gold ring. Tabs, tiles, omen cards
  and the boon being aimed all use this.
- **Places have their own colour**: torchlit brown for a tomb, blue for an
  oasis, the stop's scenery for the title screen.
- **Dividers** are the painted band of the board's frame (`.title-hr`):
  lapis, carnelian, malachite and gold, edged in gold.
- **No scroll bars where they can be avoided.** Lay out to fit; when text
  might not fit, show whole lines and a way to read the rest.
- **Scrolls are a column of rod, sheet and rod.** The rods are
  `flex: none`, or a long scroll squeezes them thin.
- Words go through `T()`; nothing English is written into the code.

### The title screen

The title screen is its own layer, `#ovTitle`, over the scenery of the stop
you're at. `openTitle()` (`game/15-title.js`) sets `body.at-title`, which
hides the rest of the game so the scenery shows through. At start-up the
page carries `body.booting`, which hides everything but the overlays until
the title is up, so the board never flashes first. `closeOverlays()` takes
`at-title` away.

![The title screen over Giza's scenery](../images/screenshot-title.jpg)

### The Menu

`openMenu()` (`game/14-menu.js`): the big "Back to the board", the band,
**eight tiles** in two rows of four, and the three ways out of the game
(title screen, save and restore, a new journey) small at the foot. A tile
carries a word of state where it helps (`Normal`, `1 of 40`, `music off`)
and its full description as a tooltip. Until the stall opens on a first
journey, its tile is Learning pace, so the rows stay full. A new entry
should replace one, or become the ninth and tenth together.

<img src="../images/screenshot-menu.jpg" width="360" alt="The Menu: Back to the board, the band, eight tiles, and three small buttons at the foot">

### How to play

`openHelp(tab)` (`game/25-codex.js`). The chapters are `CODEX_GROUPS`, in
two groups, each with a picture in `images/icons/codex/<id>.svg` and a name
in `codex.tabs`. On a wide screen they run down the margin as an index; on
a narrow one (`CODEX_NARROW`, 640 px, the same as the stylesheet) How to
play opens on a contents page (`openHelp('contents')`), and each chapter
has the next and previous at its foot. A chapter waits for its stage on a
first journey (`CODEX_STAGE`). The website's How to play reads
`CODEX_GROUPS` from this file and lays itself out the same way.

![How to play on a wide screen: the index of chapters in the margin, a chapter open beside it](../images/screenshot-how-to-play.jpg)

### The stop card

`openStop(i)` (`game/28-map.js`): with more than one part to show (seals,
omens, a doorway), each is a tile with its gist ("1 of 3", "2 braved",
"explored"), and only the chosen one is open. The big button follows the
tile: "Set out" onto the stop, or into the doorway on its tile.

<img src="../images/screenshot-omens.jpg" width="360" alt="A stop's card with its Omens tile open and one omen braved">

### The column beside the board

On a desktop, the board has a column beside it: the stop's note, a tablet
(difficulty, stars, trial, boons) and the relics. It must fit without
scroll bars:

- **The note** shows whole lines only. `fitNote()` (`game/05-state.js`)
  measures it; if it overflows, the key to the stones goes first, then
  the note is cut to whole lines and ends in "Read on", which opens it in
  a scroll. A `ResizeObserver` on the tablet runs it again when the tablet
  grows.
- **The boons** are icons with names on a tall window, and icons only when
  the window is shorter than 820 px. A **?** after them opens How to play
  at Boons. On a phone they are icons only, at least 44 px, for thumbs.
- **The relics** are one row, found ones first, with a Museum button; the
  row opens the Museum too.

![The column beside the board at Giza, with the note, the tablet and the relics](../images/screenshot-giza.jpg)

On a phone the column becomes a strip under the board, and the note opens
from it:

<img src="../images/screenshot-phone-amarna.jpg" width="240" alt="Amarna on a phone: the board edge to edge, and the strip beneath it">

### Words on screen

Every player-facing word is in `content/text.json`. `T('win.title',
{stop})` returns the text with `**bold**`, `*italic*` and new lines made
HTML, `{stop}` filled in, and `{n|stone|stones}` chosen by number;
`Tplain()` gives plain text for titles and labels. In `web/shell.html`,
`{{hud.moves}}` is filled at build time. `plainText()` strips HTML for
attributes such as `title`.

### Icons

Icons are SVG files in `images/icons/<group>/`, never strings in the code.
`iconSvg(group, name, attrs)` gives a whole icon; `iconArt(group, name)`
its inside, with its `<defs>` moved once into the shared defs, because
Firefox loses a gradient whose first copy is hidden. So gradient ids must
be unique across icon files (only `relicGold` is shared on purpose). In
`web/shell.html`, `{{svg:dock/map}}` puts an icon in at build time.

### Staging and "new"

A new player meets the game's parts one at a time: `STAGES` and
`stageOn(id)` in `game/26-stages.js`, with the stop each arrives at in
`settings.json`. Until its stage, a part is hidden, not just quiet: its
buttons, Menu tile, How to play chapter and map marks. `announce()` shows a
banner; `markNew(key)` puts a red dot on where something lives until the
player opens it (`clearNew(key)`). A new stage needs `title`, `text` and
`what` in `text.json` (`stages.<id>`).

### Accessibility

Keep keyboard play working, `aria-label`s on icon buttons, focus on the
first sensible button of a scroll (the title screen's sound button comes
last in its markup for this reason), and respect `prefers-reduced-motion`.

## 7. The systems

| System | Where |
|---|---|
| Trials: offered, measured, rewarded | `content/trials/`; `trialProgress()` in `game/07-trials-boons.js`, `levelWon()` in `game/24-win-lose.js` |
| Boons: held, aimed, used | `content/boons/`; `BOON_EFFECTS`, `useBoon()` in `game/07-trials-boons.js` |
| Curses and omens | `content/curses/`, `content/omens/`; `HARDSHIPS` in `01-core.js`, applied through `stopOptions()` |
| Seals | `"seals"` in each stop; `stampSeals()` in `game/27-seals.js` |
| Relics | `content/relics/`; `checkRelics()` in `game/09-unlocks.js` |
| River events | `content/river-events/`; `game/10-river-events.js`, on a small board (`setupSmallBoard()`) |
| Tombs, temples, oases | `content/chambers/`; `game/11-chambers.js`. Covered amulets (`sand`, `wet`) can't move and are in no run; a clear beside one uncovers it. `placeKey()` picks an oasis's words, `placeIcon()` its picture |
| Anubis's stall, the Treasury | `content/anubis-stall/`, `content/treasury/`; `game/12-stall.js`, `game/16-treasury.js`. Every purchase is logged with `logBuy()` and can be undone until the screen closes |
| Looks | `content/amulet-sets/` and the rest; changing one goes through `applyLook()`, which also empties the pre-scaled amulet cache |

## 8. Sound and music

Everything is synthesised with Web Audio; there are no sound files.

- **Effects** (`game/03-sound.js`): plucked strings (Karplus-Strong),
  bells, gongs and stone, mostly rendered once into buffers and replayed.
- **Music** (`game/04-music.js`): generated live in the stop's key, scale
  and instrument. `PROGRESSIONS` are chord sequences through the scale;
  `MUSIC_LAYERS` the voices; `musicArrange()` brings them in and out;
  `musicFollow()` turns moves left into tension and gilding into brightness;
  `musicResolve()` ends a stop; `musicDuck()` muffles it under a scroll.
  Pitched effects take their notes from the chord playing (`chordTone()`).
- **Loudness**: music about −22 LUFS at the default volume, some 6 dB under
  the effects. Measure by recording the master output. Nothing below about
  50 Hz.
- **Crackle on phones** is an audio-thread problem, not a frame-rate one:
  see chapter 12.

## 9. Extending the engine

Most additions are content (Part 1). These need code.

### A new boon effect

Add an entry to `BOON_EFFECTS` (`game/07-trials-boons.js`): `target` (does
the player pick a square), `amount` (the default), and `use(b, k)` (`b.n`
is the amount, `k` the chosen square). A boon that clears squares should
call `cascade(null, keys, true)`: the `true` keeps the blast from advancing
a trial. The build reads the names from this list. Add the effect to the
comment in the boon files, the content reference and `scripts/new.py`'s
template. Part 1, chapter 9, walks through one.

### A new badge power

Two halves. The rule goes in `BADGE_POWERS` (`01-core.js`): `amount` and
`fire(core, at, n)`, which acts inside `clearStep` and returns what it did.
How it shows goes in `BADGE_SHOWS` (`game/21-moves.js`): its sounds,
whether it buzzes, and `show()` for popups, beams and orbs. Keep the rule
free of browser code: the simulators run it.

### A new hardship, for curses and omens

`HARDSHIPS` in `01-core.js`. `options(o, n)` changes the stop's options
before it is built (moves, badge chance); `board(core, n)` changes the
board once filled. Either or both. For example:

```js
	// n amulets, chosen at random, start buried in sand
	buried_amulets: {
		board: (core, n) => {
			const free = [];
			for (let k = 0; k < core.cells.length; k++) if (core.mask[k] && core.cells[k] && !core.cells[k].special) free.push(k);
			for (let j = free.length - 1; j > 0; j--) {
				const r = Math.floor(Math.random() * (j + 1));
				[free[j], free[r]] = [free[r], free[j]];
			}
			free.slice(0, n).forEach(k => (core.cells[k].sand = 1));
		},
	},
```

### A new trial goal

Add the name to `TRIAL_GOALS` in `build.py`, and measure it in
`trialProgress()` (during play) and `levelWon()` (goals judged at the end).

### A new condition

Counted conditions go in `CONDITION_COUNTERS` (`01-core.js`) and
`COUNT_CONDITIONS` (`build.py`); win conditions in `conditionMet()` and
`WIN_CONDITIONS`. Its words go in `text.json` under `conditions`.

### A new board mode

An entry in `BOARD_MODES` with `layout()`, `moves` and `tall`, its name in
`BOARD_MODES` in `build.py` and in `text.json` (`boards`). A generated
layout must pass `allMatchable()`. Run the simulators on it.

### A new special

Its pictures in `images/specials/`, their names in `SPECIAL_PICTURES` in
`build.py`, its rule in `clearStep`, its drawing in `drawTile()`.

### A new stage

An entry in `STAGE_MARKS` (`game/26-stages.js`), its stop in
`settings.json` (`staging`, parsed in `settings()`), its words in
`text.json` (`stages.<id>`), and `stageOn('<id>')` wherever it shows.

### A new setting

A field in `settings.json`, parsed with a default in `settings()` in
`build.py`, read as `CONTENT.settings`. Tuning numbers never go in the
code.

### A new saved field

See chapter 10: it needs a default in `applySaveDefaults()`.

## 10. Saving

Progress lives in `localStorage` under `amulets-nile-v1`, and players move
it between copies with export codes (Save and restore). So:

- **Never rename or repurpose a saved field.** New fields get a default in
  `applySaveDefaults()` (`src/00-open.js`). If a field's meaning changes,
  write a migration there.
- Progress is keyed by **stop id**, and the save records the order of ids
  it was made with, so adding or reordering stops moves progress with its
  stop (`remapStops`).
- Every write goes through `persist()`, in a `try`; the game runs even when
  storage fails.
- Try-out mode (`#try`) uses a separate save and never touches the real one.

## 11. Balance and the simulators

The simulators run `01-core.js` in Node with the checked content
(`tools/load-core.js`, through `build.py --content-json`), and build boards
through `stopOptions()`.

```sh
node tools/journey-sim.js 1 60          # first journeys, as a new player meets them
node tools/journey-sim.js 1 60 later    # later journeys, everything on
node tools/sim.js 1 classic 8 13 24     # difficulty, board, columns, rows, games
node tools/events-sim.js                # river event puzzles
node tools/econ-sim.js 8 13 4 1         # earnings and unlocks over whole journeys
```

The bot is greedy and never plans, so people do a little better. Targets on
Normal: about 65–75% first-try wins, first and later journeys alike, on
every board, early stops higher than late ones; Relaxed about 95%. At 60
journeys one stop's figure moves about ten points between runs, so judge
averages. River puzzles: between about 50% and 90%. Economy: about a third
of the looks after one journey.

What tunes what: each stop's `moves`, prices, event moves and the numbers in
`settings.json` (content); `MOVE_TUNING`, `BOARD_MODES` and `DIFFICULTY` in
`01-core.js` (code).

## 12. Performance

The target is a mid-range Android phone.

- **The floor** is cached in an offscreen canvas, and only changed squares
  are repainted after a match (`bgCells`).
- **Amulets** are pre-scaled to the square size (`tileAt`).
- **Idle frames**: 30 a second when something could move, 4 when nothing on
  the board moves by itself (`idleWanted()`); a long run of slow frames
  turns on `lowFx`.
- **No blurred CSS on or round the board**: Firefox repaints it every
  frame. Paint shading into the floor layer instead.
- **Gradients** used by repeated icons live once in the shared defs.
- **The sand tube** is a still tiled picture; only its height moves, and
  its stream of grains shows only while it fills.
- **Canvas size** is capped at about two million pixels.
- **Audio**: phones ask for a larger buffer (`latencyHint: 'playback'`);
  reverbs are one channel and short; plucked strings, bells and gongs are
  buffers made once; music is scheduled 0.4 s ahead and nothing starts
  sooner than 30 ms from now (`MUSIC_AHEAD`, `MUSIC_MARGIN`, `SFX_LEAD`);
  "Steadier sound" asks for a fixed buffer (`sound.steady_buffer_ms`).
  Judge an audio change by the work per render slice: render it in an
  `OfflineAudioContext` with `suspend()` every 0.1 s and time each slice.
- `tools/perf/soak.py` checks for leaks.

## 13. The stylesheet

`web/css/` is joined in file-name order, so the numbers are the order.

| File | Styles |
|---|---|
| `01-base.css` | colours and fonts (`--` variables), the page, the scenery |
| `02-layout.css` | the app grid |
| `03-hud.css` | the top bar, and coins (`.g-ico`) anywhere |
| `04-board.css` | the stage, the board frame and canvas, the sand tube |
| `05-dock.css` | the buttons along the bottom |
| `06-scroll-and-buttons.css` | scrolls and their rods, sandstone buttons, the drop cap |
| `07-side-panel.css` | the column beside the board: note, boons, relics |
| `08-shops-and-looks.css` | Treasury, stall, Customise |
| `09-codex-and-sound.css` | How to play, Customise tabs, sound |
| `10-screens.css` | the ×, the title screen, the Menu, dividers |
| `11-journey.css` | seals, omens, the stop card's tiles |
| `12-notices.css` | banners, "new" dots, the try-out badge |
| `13-overlays.css` | scrolls, `showMsg()`'s button kinds, the map |
| `20-small-screens.css` | phones and short windows, last on purpose |

Colours are variables in `01-base.css`. Put a rule in the file for its
part of the screen; phone rules in `20-small-screens.css` or an `@media`
block beside the rule.

## 14. Testing

After any change to `src/`:

```sh
python3 build.py
grep -c "https://" dist/amulets-of-anubis.html    # must print 0
node tools/screenshots/smoke.mjs
```

The smoke test plays the built game for a moment as a new player and as
one part-way down the river, on a desktop and a phone: moves, every screen,
every tab and chapter. It fails on any page error. The simulators only run
`01-core.js`, so they can't catch a mistake in `src/game/`.

Also: `node tools/screenshots/take.mjs` retakes the pictures in
`docs/images/` (and keeps any that look the same);
`node tools/screenshots/check-looks.mjs` checks every amulet set for
amulets too close in colour; `node tools/screenshots/pdf.mjs` prints an HTML
page to a PDF (the manual's PDF is made with it); `tools/perf/` has the performance checks.
Check layout at 390 × 844 and 360 × 780 as well as on a desktop: the page
must never scroll.

## 15. Packaging

`./build.sh` builds the game, the desktop apps (Windows, macOS, Linux
x64 and arm64, with Electron) and the Android app, then the docs and
screenshots. The [build guide](../build-guide.md) has what each needs and
how the Android app is signed. The installable web app is the built file
served as `index.html` with `web/manifest.webmanifest` and `web/sw.js`;
change the cache name in `web/sw.js` for each release.

## 16. House style

- **British English**, and **God, Gods and Goddess** capitalised, with
  their pronouns (He, She, They).
- **The game's own words**: stops, stones, floors, gilded, amulets,
  specials, badges, boons, trials, curses, relics.
- **Story text is a travel journal**: "we", past tense, gently old in
  rhythm but plain in words, short. **Interface text is plain** and in the
  present tense.
- **History must be true.** Prefer the documented fact to the legend, and
  leave out what you aren't sure of.
- **Watch the engine's size.** Prefer a content file to new code, and say
  how much code a change adds.
