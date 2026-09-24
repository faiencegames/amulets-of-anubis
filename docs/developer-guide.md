# Developer guide

A match-3 game: twelve stops down the Nile, each with its own amulets, scenery
and music scale. Match three or more to gild the floor beneath them; gild the
whole floor before the moves run out.

Everything is plain HTML, CSS and JavaScript with no dependencies, no build
tools to install beyond Python, and no sound files. Every picture (amulets,
scenery, floors, badges, icons) is a file in `images/`, mostly SVG, and every
sound is synthesised at run time.

**Not a programmer?** Start with the [beginner's guide](beginners-guide.md): pictures, words,
numbers and new stops, with no JavaScript knowledge needed.
---


**Adding content, the quick way:** `python3 scripts/new.py` (or double-click
`scripts/new.bat`) makes a ready, commented file for a new stop, relic, event, shop
item or look; `python3 build.py --watch` rebuilds on every save; and
`dist/try-it.html` opens the game in try-out mode (separate save, everything
unlocked) at the stop or event you changed last. See `docs/beginners-guide.md`.

## The big idea: content and code are separate

The game splits into two halves, and keeping them apart is the whole point of
the current design:

* **Code** is in `src/`. It holds the *rules*: how a match clears, how gravity
  works, how the board is generated, how the music follows the play. It draws no
  pictures: those are files in `images/`, which the code only places, scales
  and animates. Code is what you change when a *kind of behaviour* is new.
* **Content** is in `content/`. It is everything a player can *see or read
  that is not a rule*: the stops, the amulets and what they mean, the trials,
  the relics, the river events, the things Anubis sells, the treasury upgrades,
  and all the cosmetic looks (amulet sets, floor sets, frames, sparkles).
  Content is one small file per thing.

`build.py` is the seam between the two. It reads every file in `content/`,
checks each one against a schema and reports any mistake by file and line,
checks that references point at things that exist, and then pours the checked
content into a placeholder in `src/01-core.js` (`/*CONTENT*/null`). The result
is one self-contained HTML file.

So the day-to-day act of adding things is almost never editing code: **it is
writing a content file and building.** The sections below say exactly which
file to add for each thing, and what to do in `src/` when a change does need
code.

```
build.py              reads content/ and images/, checks them, writes the one file
content/              all the content, one file per thing  (see "The content" below)
images/               every picture: amulets, scenery, floors, specials, badges, icons (images/README.md)
src/01-core.js        the rules (Core, board modes, difficulty, boons, conditions)
src/00-open.js        opens the closure; loads and migrates the saved data
src/02-pictures.js    loads the pictures before the game starts (SPR, SPECIAL, BADGE, FLOOR_PICS)
src/03-themes.js      per-stop themes (floor colour, amulets, music) built from content
src/04-boards.js      per-stop frame colours, amulet sets (skinned), floor squares
src/game/             the running game, one file per part: drawing, input, sound, music,
                      trials, events, tombs, shops, screens, HUD (listed in its README.md)
web/shell.html        page markup ({{text.keys}} from content/text.json, {{svg:group/name}} from images/icons/); the /*STYLES*/, /*FONTS*/, /*CORE*/, /*UI*/ holes
web/css/              the stylesheet, one file per part of the screen (see below)
web/fonts.css         the two typefaces, embedded, so the game never goes online
web/manifest.webmanifest, web/sw.js    the installable web app
tools/sim.js          plays every stop with a bot to check the difficulty
tools/events-sim.js   plays each puzzle river event with a bot
platforms/android/    the Android wrapper (a WebView activity)
platforms/desktop/    the desktop wrapper (Electron)
```

Build and play:

```sh
python3 build.py && open dist/amulets-of-anubis.html
```

Check the content without writing anything:

```sh
python3 build.py --check
```

Check the difficulty after any change to stops, shapes or the rules:

```sh
node tools/sim.js 1 classic     # difficulty 0-3, board classic|grand|ruins
```

It prints a win rate per stop from a number of bot playthroughs (default 16;
pass a number at the end for more). As a rule of thumb, on Normal aim for 95–100%
on the early stops and 75–90% on the last few. The bot plays greedily with no
planning, so a human on Normal should do a little better.

---

## The content

`content/` has one folder per kind of thing, and `content/settings.json` for
the few whole-game numbers. Each file is one `{ ... }` block. Files may carry
`//` comments and trailing commas (the build allows them), which is how the
existing files explain themselves. **The number at the front of a file name
sets the order** of the things of that kind, so `03-giza.json` comes after
`02-saqqara.json`.

| Folder | One file is | Where it lands in the game |
|--------|-------------|----------------------------|
| `content/stops/` | a stop on the journey | `LEVELS` (the journey, in order) |
| `content/amulets/` | what the codex says about an amulet | the codex and trial names |
| `content/trials/` | a trial a priest can set | `TRIALS` |
| `content/boons/` | a boon: a held power the player spends | `BOONS` |
| `content/badges/` | a badge an amulet can fall wearing | `BADGES` |
| `content/curses/` | what a failed trial costs at the next stop | `CURSES` |
| `content/omens/` | a hardship braved at a gilded stop, for more reward | `OMENS` |
| `content/relics/` | a relic for the museum | `RELICS` |
| `content/river-events/` | a puzzle or choice on the river | `EVENTS` |
| `content/anubis-stall/` | a one-time purchase | `STALL` |
| `content/treasury/` | a lasting upgrade | `UPGRADES` |
| `content/floor-shapes/` | a shared floor shape | `SHAPES` |
| `content/amulet-sets/` | a cosmetic amulet finish | `SKINS` |
| `content/floor-sets/` | a cosmetic floor | the floor textures |
| `content/frames/` | a cosmetic board frame | the frame colours |
| `content/sparkles/` | a sparkle colour | the burst colours |
| `content/settings.json` | the whole-game numbers | event chance, stall rise, persistence, earnings |

A few rules the build enforces, so you know what it is checking:

* **Order is the file name.** Rename the number and you move the thing.
* **Ids are permanent.** `id` is what saves remember things by. Don't change it
  once people play.
* **References are checked.** A stop's `shared_floor_shapes`, a relic's
  `found_when`, an event's collected amulet, a stall item's boon: the build
  checks that each one points at something that exists, and suggests the nearest
  match if you mistype.
* **Each cosmetic kind keeps its free one.** Every save starts with one look of
  each kind: the amulet set `faience`, the floor `temple`, the frame `temple`,
  the sparkle `gold`. Keep those ids.
* **Some folders must not be empty.** Stops, trials, the stall, and the four
  cosmetic kinds each need at least one.
* **On error, nothing is written.** If a content file is wrong, the build stops
  and says which file, which line and what to do, and leaves the last good game
  file alone.

Every field of every kind is documented in the sample files themselves (each
carries a short comment) and in `docs/content-reference.md`. The sections below are
the *recipes*: copy the nearest existing file, change what you need, build.

---

## The game's systems, and when a player meets them

A quick map of everything the game does, with where each lives. The codex in
the game (Help) explains the same things to players.

| System | What it is | Where |
|---|---|---|
| Specials | Made by the shape of a match: four in a row = banded, L or T = ringed (Star of Sopdet if one arm is four), five = winged sun | `clearStep` in `01-core.js` |
| Badges | Marks a new amulet can fall wearing; matching it uses the power. Gifts: Khepri's blessing, water clock, Strike of Horus, Bloom of Nefertem, Gem of the east | `content/badges/` (powers: `BADGE_POWERS` in `01-core.js`; how they show: `BADGE_SHOWS` in `game/21-moves.js`) |
| Cursed badges | Red-ringed and rare: Coils of Apep (−2 moves, never the last), Sandstorm of Set (3 gilded stones turn bare). One at a time, never on Relaxed or in river events | `BAD_BADGES` in `01-core.js` |
| Boons | Held power-ups the player spends: flood, hammer, wisdom, scales, chisel, band, Ra, Seshat, Sekhmet, Bes | `content/boons/` (effects: `BOON_EFFECTS` in `game/07-trials-boons.js`) |
| Trials | A priest's task at a stop; finish it for a boon, fail it and the next stop is cursed | `content/trials/`, `content/curses/` (what they do: `HARDSHIPS` in `01-core.js`) |
| Seals | Three challenges per stop, stamped the first time a win meets them, 6 lapis each | `"seals"` in `content/stops/`, `stampSeals()` |
| Omens | Hardships chosen at a gilded stop; each adds 30% gold and lapis | `OMENS` in `01-core.js`, applied in `startLevel()` |
| Relics | Found once by deeds; kept across journeys | `content/relics/` |
| River events | Puzzles and choices between stops | `content/river-events/` |
| Chambers | A tomb, temple or oasis beside a stop: a small board with some amulets covered (`t.sand`, and `t.wet` for water, which only changes the picture): a covered amulet can't be moved and is in no run; a clear on or beside it uncovers it (`brushed` in `clearStep`). Tombs are lit by torches (`torchLayer()`, cached per size); oases are in daylight. The words differ through `placeKey()`, the pictures through `placeIcon()`; a chamber's own scenery is `ev.scene`. Opened once its stop is gilded; offered on the win screen, the stop card and the map. Plays through the river-event board (`setupSmallBoard()`); the reward is paid once (`save.chambers`) | `content/chambers/`, `startChamber()` in `game/11-chambers.js` |
| Anubis's stall, Treasury | One-time help; lasting upgrades | `content/anubis-stall/`, `content/treasury/` |
| Looks | Amulet sets, floors, frames, sparkles, earned by playing | `content/amulet-sets/` etc. |

### Staging: one thing at a time

On a player's first journey the systems arrive one by one, each announced by a
banner (`STAGES` and `stageOn()` in `src/game/26-stages.js`):

| Once the journey reaches… | Arrives |
|---|---|
| stop 1 | matching and specials only |
| stop 2 (after the first win) | seals |
| stop 3 | badges |
| stop 4 | trials and boons |
| stop 5 | Anubis's stall |
| after stop 6 | river events |
| stop 8 | cursed badges |
| stop 9 | tombs, temples and oases (beside the gilded stops) |
| the whole journey gilded | omens |

Until then a system is not just quiet but hidden: the stall button and menu
entry, the boon row, the empty trial line, seal dots on the map and the codex
tabs all appear with their system. Everything is on from the second journey,
in try-out mode, and for saves from before staging existed (`save.staged` is
`'all'`). **Menu → Learning pace** lets a player turn everything on at once,
or go back to one at a time while still on the first journey; it changes only
what is shown, never what is unlocked.

Players are told about this up front: the title screen and the top of How to
play → Basics both show **"The game grows as you travel"**, a list of every
stage with what it is, when it arrives, and a tick once it is open, plus a
button to Learning pace (`journeyRoadmap()` in `src/game/26-stages.js`; the list is built
from `STAGES`, so a new stage appears there by itself).

### Telling the player something new appeared

* **Banners** (`announce()`): a queued banner at the top of the screen, above
  any scroll, for each new system, relic, look and seal. Tap to dismiss; each
  waits its turn.
* **"New" dots** (`markNew()` / `clearNew()`): a small red dot on a dock button,
  its Menu entry, and codex tabs, until the player opens that screen. New
  systems mark where they live (the stall button, the map, their codex tabs), a
  new look marks Customise, a new relic marks the Museum. They are saved
  (`save.fresh`), so a dot survives closing the game.

### Try-out mode

`#try` at the end of the game's address (or `dist/try-it.html`, which the build
writes) opens a separate save with every stop, look and system on, a full purse
and one of each boon; `#try=<id>` jumps to a stop, plays a river event or goes into a chamber. The
real save is never touched. It is meant for people adding content.

## How to add things

### A new stop (level)

1. Copy `content/stops/01-memphis.json` to a new file at the end of the
   folder, numbered after the last stop (`content/stops/13-<id>.json`). Change:
   `id`, `name`, `subtitle`, `history`, `moves`, and the `amulets` list (four
   to six names).
2. `floor_plan` is eight strings of eight characters: `.` gap, `0` already
   gold, `1` bare stone, `2` thick stone (needs two matches). Every stone needs
   room for three in a row through it, or it could never clear. The build
   checks this and says which square is stuck.
3. `map_position` places the stop on the Nile map (viewBox 360×560, the river
   runs from Alexandria at the top to Abu Simbel at the bottom); `label` is
   `"right"` or `"left"`.
4. `music` is `{key, scale, instrument}`: a note like `"D3"`, a scale name
   (`hijaz`, `dorian`, `major` and so on, or a raw list of semitone steps), and one
   of `harp | lyre | oud | flute | bell`.
5. Its pictures: `images/backdrops/<id>.svg` (the scenery) and
   `images/boards/<id>.svg` (through the gaps of the floor). `scripts/new.py`
   copies Saqqara's to start from; `scenery` / `board_backing` in the stop
   file can name another stop's picture instead.
6. `shared_floor_shapes` lists the shared shapes this stop may be played on;
   each must exist in `content/floor-shapes/`.

Then run `node tools/sim.js 1 classic` and adjust `moves` until the win rate
sits in the band above. The Grand and Ruins boards rescale moves on their own.

You do not need to touch any code: the per-stop theme and board are *built
from the stop file and its pictures* at build time, so a new stop
automatically gets its place in the journey, the map, the codex and the
journey menu.

### A new amulet

An amulet has two halves: its **name, plural and meaning** (content) and its
**picture**.

1. Add `content/amulets/NN-<id>.json` with `id`, `name`, `plural`, `meaning`.
   This is what the codex shows and what a trial calls it ("Clear 14 scarabs").
2. Draw `images/amulets/<id>.svg` (or `.png`): square, see-through
   background, a small margin; it fills its square as drawn.
   `scripts/new.py amulet <id>` does both, starting from a copy of the ankh.
3. Put the `id` into any stop's `amulets` list in `content/stops/`.

Keep the amulets of one stop clearly different in **colour and silhouette**.
That is what makes a board readable at a glance.

### A new trial

Add `content/trials/NN-<id>.json`:

```json
{
  "id": "corners",
  "goal": "clear_amulets",
  "target": 14,
  "text": "Clear {target} {amulets}",
  "progress_label": "Cleared",
  "boon": "flood"
}
```

`goal` is one of: `clear_amulets`, `make_specials`, `cascade`,
`gild_in_one_move`, `clear_in_one_move`, `moves_to_spare`, `make_suns`,
`make_bands`, `crack_thick`, `gild_half_quickly`, `no_boons`,
`combine_specials`. `text` may hold `{target}` and `{amulets}`, filled in when
the trial is offered. Optional: `only_if_thick_stones` (a number) restricts a
trial to floors with that many thick stones; `within_moves` sets the time for
`gild_half_quickly`. `boon` is the reward and must be a real boon.

The *measuring* of a goal lives in `trialProgress()` (`src/game/07-trials-boons.js`)
and `levelWon()` (`src/game/24-win-lose.js`). Every goal above is already
measured there, so a new trial file needs no code. You only touch the code if
you are inventing a **brand-new goal type**. In that case, add its name to
`TRIAL_GOALS` in `build.py` (so the build knows it) and measure it in those two.

### A new boon

A boon is a held power the player spends when they choose. Every boon is a
file in `content/boons/`; the code knows a set of *effects* (extra moves,
gilding stones, making a winged sun...), and a boon's file picks one and may
set its amount. So most new boons are content only. Worked through:

**1. Start the file.** `python3 scripts/new.py boon ptah` writes
`content/boons/11-ptah.json`: a boon that already works (four extra moves),
with every field explained. It borrows Wisdom's icon until it has its own.

**2. Say what it is and does.**

```jsonc
{
	"id": "ptah",
	"icon": "wisdom",
	"short": "Ptah",
	"name": "Breath of Ptah",
	"description": "Thins every thick stone by one layer.",
	"effect": "thin_thick_stones",
	"popup": "Ptah breathes on the stone",
	"popup_when_nothing": "No stone to soften",
	"random_reward": false
}
```

`short` is the label on its button, so keep it to about eight letters.
`{n}` in the description or the popup is the amount. `random_reward: true`
makes it one of the boons a "random" reward can give (the great ones; the
small tools such as the chisel are sold at the stall instead); if you set it,
add the boon to the Priest's chest description
(`content/anubis-stall/09-chest.json`), which names them. The id is how
players keep the boon in their save: don't change it once people play.

**3. Give it a way to be found.** A boon on its own is only listed in How to
play. Name it where a boon is given: a trial's `boon`, a stall item's
`"gives": {"boon": ["ptah"]}`, a river event's reward, or set
`random_reward`.

**4. Its icon.** Draw `images/icons/boons/ptah.svg` (32 by 32, in the style
of the others, gradient ids of its own) and delete the `"icon"` line.

**5. Build and try.** `python3 build.py`, then `dist/try-it.html`: try-out
mode holds every boon, so it is in the row under the board. A mistake is
named by file and field (an unknown effect, a missing icon, a `short` too
long for its button).

**A new kind of effect** is code. Effects live in `BOON_EFFECTS` in
`src/game/07-trials-boons.js`, each with a comment saying what it does:
`target` (whether the player picks a square first), `amount` (the default
number), and `use(b, k)`, which does it; `b` is the boon (`b.n` its amount)
and `k` the chosen square. Boons that clear squares call
`cascade(null, keys, true)`: the `true` stops the blast from advancing a
trial, which would otherwise let boons pay for themselves. `build.py` reads
the effect names from this list, so a boon file can use a new one as soon as
it is there; add it to the effects listed in `content-reference.md` and in
the boon files' comment.

### A new amulet finish (cosmetic skin)

Add `content/amulet-sets/NN-<id>.json`. A finish re-renders the *existing*
amulet drawings through a colour filter, so it costs no drawing:

```json
{
  "id": "silver",
  "name": "Silver and shell",
  "description": "Cold metal and pale shell.",
  "unlocked_by": {"stars": 20},
  "colour_changes": { "saturation": 0.6, "brightness": 1.15, "hue_shift": 190 },
  "glow": "rgba(220,235,255,.6)"
}
```

`colour_changes` takes any of `hue_shift` (degrees), `saturation`,
`brightness`, `contrast`, `sepia`, `greyscale`, in the order you write them.
Alternatively write a ready-made `css_filter` string (not both). `glow` and
`{tint, tint_strength}` are optional. `unlocked_by` is a block of conditions
(see relics below); `null` means available from the start.

Keep filters that **shift** hue rather than remove it: a finish that makes
every amulet one colour ruins readability, since players match by colour first
and silhouette second. `checkLooks()` in `src/game/09-unlocks.js` decides when it
opens and what the locked card says.

### A new floor set

Add `content/floor-sets/NN-<id>.json` (name, description, `unlocked_by`) and
its pictures in `images/floors/<id>/`: `bare`, `thick`, and `gilded` or
`gilded-1` … `gilded-4`. `scripts/new.py floor-set <id>` copies the marble
floor's to start from. The standard floor (`temple`) has
`"uses_each_stops_own_stone": true`: its `bare` and `thick` pictures are
see-through and laid over each stop's own `stone_colour`.

Check a new set with every stop's amulets on it: an amulet the same colour as
the floor all but disappears (a blue floor hides the scarab, turquoise hides
the Eye of Horus).

### A new board frame or sparkle

* `content/frames/NN-<id>.json`: `colours` is `{face, shade, edge}`, or
  `null` to let each stop keep its own carved stone.
* `content/sparkles/NN-<id>.json`: `colours` is a list of exactly two colours,
  the two the match burst uses.

Both are pure looks; `unlocked_by` controls when they open.

### A new upgrade (treasury)

Add `content/treasury/NN-<id>.json`:

```json
{
  "id": "luck",
  "name": "The priest's eye",
  "description": "Badged amulets fall a little more often.",
  "currency": "lapis",
  "prices": [400, 900, 1800],
  "effect": "badge_chance",
  "amount_per_level": 3
}
```

`effect` is one of `extra_moves`, `badge_chance`, `trial_chance`, `win_gold`,
`win_lapis`; the effect's amounts add up across every upgrade that shares it
(`upgradeTotal()` in `src/01-core.js`). `prices` is one price per level.

### A new relic

Add `content/relics/NN-<id>.json`:

```json
{
  "id": "first",
  "name": "Scribe's palette",
  "description": "Gild your first floor.",
  "found_when": {"stops_won": 1},
  "reward": {"gold": 25}
}
```

`found_when` is a block of conditions, and every one of them must hold. The counters are
`stars`, `three_star_stops`, `stops_gilded`, `stops_won`, `hard_wins`,
`trials_finished`, `river_events`, `relics_found`, `suns_forged`,
`best_cascade`, `thick_stones_cracked`, `gold_earned`, `gold_held`,
`lapis_held`, `win_streak`, `journeys`; the win conditions (about the stop
just won) are `win_moves_to_spare`, `win_on_difficulty`, `win_at_stop`,
`win_without_boons`, `win_on_board`, `win_two_specials_at_once`,
`win_after_failures`; and `relic` (one relic unlocks the next). `reward` is
optional `{gold, lapis, boon}`.

For the icon: draw `images/icons/relics/<id>.svg`, or name another icon in
that folder in `icon`, or drop a picture `images/relics/<id>.png`. Without
one it shows a plain gold disc. The museum and the awarding (`checkRelics()`
in `src/game/09-unlocks.js`) pick the file up by itself.

### Something new in Anubis's stall

Add `content/anubis-stall/NN-<id>.json`. An item gives exactly one of four
things:

```json
{ "id": "moves", "name": "Three more breaths", "description": "Three extra moves, right now.",
  "currency": "gold", "price": 500, "gives": { "moves": 3 } }
```

`gives` is one of: `{"moves": n}` (act now), `{"reshuffle": true}` (act now),
`{"second_wind": n}` (a held charge, like Second wind), or `{"boon": [names
or "random"]}` (adds a boon to the hand). The one-time price is `price`; the
build's `STALL_RISE` (from `settings.json`) makes it dearer each repeat at the
same stop, resetting at the next. What actually happens on purchase is in
`openStall()` in `src/game/12-stall.js`. The four kinds above are already handled,
so a new item needs no code. Every purchase is recorded with `logBuy()` so the
player can undo it until the screen closes.

### A new floor shape

Add `content/floor-shapes/NN-<id>.json`: a `name`, an 8×8 `floor_plan` (same
characters as a stop's), and `move_multiplier` (an `ease`) that gives harder
shapes a few more moves. Then list the `id` under `shared_floor_shapes` in any
stop's file. The build checks the plan is matchable; confirm with
`node tools/sim.js` that a stop using it still wins about as often as its own
floor.

### A new curse

A curse is what failing a trial costs at the next stop (an unkind river can
bring one too). Every curse is a file in `content/curses/`; the code only
knows a few *effects* a curse can have, and a file picks one. So most new
curses are content only. Worked through from an empty file:

**1. Start the file.** Run `python3 scripts/new.py curse sand` (or
double-click `scripts/new.bat` and choose "curse"). It writes
`content/curses/04-sand.json`, a curse that already works, with every field
explained. Change its `name` to "Drifting sand".

**2. Choose what it does.** Pick one of the hardships (the file's comments
and `content-reference.md` list them) and write its words with `{n}` where
the strength goes:

```jsonc
{
	"id": "sand",
	"name": "Drifting sand",
	"text": "{n} bare stones turn thick",
	"effect": "thick_stones",
	"strength": {"Relaxed": 0, "Normal": 3, "Hard": 6, "Pharaoh": 9}
}
```

Leave "at the next stop" out of the text: the trial card and the river add it
("If you fail: drifting sand — 3 bare stones turn thick at the next stop"),
and the board says "Cursed: 3 bare stones turn thick" while it lasts. Keep
Relaxed at 0: failing a trial on Relaxed is meant to cost nothing.

**3. Build and look.** `python3 build.py`. A mistake is named by file and
field (a misspelt effect, a strength above 100 for `fewer_badges`, a
difficulty spelt wrong). Then open `dist/try-it.html`, pick a Normal stop,
and look at How to play → Trials: the new curse is in the list of curses on
Normal. Accept a trial and let it fail to see it at the next stop.

**4. Check the balance.** A curse makes the next stop harder, so ask
whether a player who failed a trial should face it. Three thick stones is
mild; ten is felt. `node tools/journey-sim.js 1 60` doesn't play curses (the
bot never takes trials), so judge the strength against the three curses
already there.

**A new kind of hardship** is a little code. Curses and omens share one list
of what they can do, `HARDSHIPS` in `src/01-core.js`, each with a comment
saying what it does. A hardship may have two parts: `options(o, n)` changes
how the stop is built (the numbers `stopOptions()` hands to the board: moves,
badge chance...), and `board(core, n)` changes the board once it is filled.
For example, one that buries n amulets in sand, as in the tombs:

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

`build.py` reads the names from this list, so a curse or omen file can use
`"effect": "buried_amulets"` as soon as it is there. Add a line for it to
the list in the curse and omen files' comments, `content-reference.md` and
the template in `scripts/new.py`. `save.curse` keeps the curse's id,
strength, words and effect; `startLevel()` (`src/game/05-state.js`) reads it
once and clears it.

### A new badge

A badge is a small mark an amulet can fall wearing; clearing the amulet uses
its power. Every badge is a file in `content/badges/` with a picture in
`images/badges/`; the code knows a set of *powers* (gild stones, extra
moves, clear a row and column...), and a badge's file picks one and may set
its amount. Worked through:

**1. Start the file.** `python3 scripts/new.py badge scarab` writes
`content/badges/08-scarab.json` (a badge that already works: two extra
moves) and copies a starting picture to `images/badges/scarab.svg`.

**2. Say what it is and does.**

```jsonc
{
	"id": "scarab",
	"name": "Scarab's gift",
	"looks": "green beetle",
	"text": "Gilds five bare stones anywhere on the floor.",
	"effect": "gild_stones",
	"amount": 5,
	"popup": "Scarab's gift",
	"cursed": false,
	"weight": 3,
	"colour": "#7ad08a"
}
```

`looks` follows its name in How to play ("Scarab's gift (green beetle)"),
so a player can tell badges apart. `weight` is how often it turns up when a
badge falls, against the others: the water clock has 10, the gem of the east
3. A `cursed` badge wears a red ring, never falls on Relaxed or in river
events, and should do harm (`lose_moves`, `ungild_stones`). `colour` is the
glow round an amulet wearing it.

**3. Its picture.** Draw over `images/badges/scarab.svg`: 96 by 96, the
badge a circle of radius 24 in the middle, bold and readable at a few
pixels, in the style of the others.

**4. Build and try.** `python3 build.py`, then `dist/try-it.html`. A badge
turns up about one amulet in fifty, so to see it quickly, give it a large
`weight` for a moment. Then check the balance: a gift that gilds five stones
makes stops easier, so run `node tools/journey-sim.js 1 60` before and after.

**A new kind of power** is code, in two places: the power itself in
`BADGE_POWERS` (`src/01-core.js`), which is part of the rules the
simulators play, and how it shows in `BADGE_SHOWS`
(`src/game/21-moves.js`): its popup, beams or golden orbs, its sound, and
whether it buzzes. Each entry has a comment. `build.py` reads the power
names from `BADGE_POWERS`.

### A new omen

An omen is a hardship a player chooses to brave at a stop they have already
gilded, for a richer reward (each adds `omens.reward_percent_each` in
`settings.json`). Every omen is a file in `content/omens/` and picks one of
the same `HARDSHIPS` as the curses, with one `amount`:

```jsonc
{
	"id": "sand",
	"name": "Drifting sand",
	"text": "{n} amulets start buried in sand",
	"effect": "buried_amulets",
	"amount": 6
}
```

It appears at once on the stop scroll of every gilded stop (once omens have
arrived on the first journey) and in How to play → Seals and omens. Saves
remember omens by id (the ones braved now, and the most braved at each stop),
so don't change an id once people play. An omen should be felt but fair: try
it at a few stops on Normal before keeping it.

### A new river event

Add `content/river-events/NN-<id>.json`. Two kinds:

* **A puzzle** has a small `floor_plan`, `moves`, `amulet_types` (4–6), an
  optional `amulets` list, a `goal` (`{"type":"gild"}`,
  `{"type":"collect","amulet":"scarab","count":14}`, or
  `{"type":"score","points":3500}`) and a `reward`. Optional: `by_lamplight`
  (play by lamplight) and `weight`. A `collect` goal needs its own `amulets`
  list and the amulet to collect must be among the first `amulet_types` of it.
* **A choice** has `choices`, each a `{label, cost?, give?, take_a_boon?,
  gamble?}`. It is kind to offer one that simply walks on.

`reward` (and `cost`/`give`) is a block of `gold`, `lapis` and/or `boon`.
`EVENT_CHANCE` in `settings.json` sets how often sailing on is interrupted; a
per-event `weight` nudges one event rarer or more likely. Test a new puzzle
before trusting it: `node tools/events-sim.js`. A greedy bot should win
somewhere between half and nine times in ten.

### About the Omega board (code)

`omega` in `BOARD_MODES` (`src/01-core.js`) has no fixed size: `omegaSize()`
in `src/game/05-state.js` fits as many squares as the window holds, and
`omegaPlan()` builds either one great ruin or, when the floor is wide enough,
two banks with a channel of the Nile between them. Generated floors (Ruins and
Omega) budget their moves from `refMoves` and a common reference size `refTotal`
rather than from each stop's own plan, and Omega plays with at most five amulet
types (`maxTypes`), since a sixth is very hard to spot among three hundred
squares.

### A new amulet's codex entry

That is just `content/amulets/NN-<id>.json` (see "A new amulet"). The codex
lists only amulets that some stop actually uses, so the entry is enough.

---

## The music

The score is generated live in `src/game/04-music.js`, using only the browser's built-in Web Audio (no library, no files).

* **Harmony.** Each stop's key and scale come from `music` in its content file.
  `PROGRESSIONS` lists chord sequences as steps through that scale; a new chord
  arrives every two bars.
* **Layers.** `MUSIC_LAYERS` sets each voice's volume and how much reverb and
  delay it gets: drone, choir pad, arpeggio, pulse bass, kalimba, lead (the
  stop's own instrument), bells and temple wind. `musicArrange()` decides which
  layers play in each cycle, crossfading them in and out.
* **Effects that play along.** With music on (and the setting allowed), pitched
  effects take their notes from the chord the music is playing at that moment
  (`chordTone()`); successive matches walk through it and cascades climb it.
* **Following the game.** `musicFollow()` turns moves left into *tension* (more
  arpeggio and pulse bass, a quicker tempo) and gilding into *progress* (a
  brighter pad). `musicCascade()` rings bells on big cascades,
  `musicResolve()` settles the music when a stop ends, and `musicDuck()` muffles
  it while a menu is open.

To hear a change without playing, record it: the test scripts capture the
engine's output to a file, which is how its loudness (about −22 LUFS at the
default volume, well under the sound effects) was set.

## Balancing

The numbers split between the two halves, just like everything else.

In **content** (change the file, build):

* `content/settings.json`: event chance, stall price rise, persistence, and
  all the earnings (gold/lapis per stone, per special, per win).
* Each stop's `moves` in `content/stops/`.
* Prices in `content/treasury/` (`prices`) and `content/anubis-stall/` (`price`).
* Each river event's `moves` and goal.
* The `need` on each look, if you want sets to take longer to earn.
* Seal challenges (`"seals"` in each stop file).

In **code** (`src/01-core.js`, then re-simulate):

* `MOVE_TUNING`: the overall move budget, and how it scales with floor size.
  Each entry in `BOARD_MODES` also has `moves` and `tall` for its own board.
* `DIFFICULTY`: the slider steps, move multiplier, power chance, hint delay.
* Each badge's `weight` in `content/badges/`: how often it turns up once a
  badge falls (the two cursed ones together about 1 badge in 20);
  `OMEN_BONUS`; `SEAL_LAPIS` (in `src/game/27-seals.js`).

After changing any of these, measure instead of guessing:

```sh
node tools/journey-sim.js 1 60         # first journeys, as a new player meets them
node tools/journey-sim.js 1 60 later   # later journeys, everything on
node tools/sim.js 1 classic 8 8        # difficulty, board, columns, rows
node tools/sim.js 1 ruins 12 19        # other board shapes
```

Every simulator builds its boards with `stopOptions()` in `01-core.js`, the
function `startLevel()` uses, so a test plays the stop a player gets:
difficulty, Treasury upgrades, persistence moves, omens, a trial's curse, and
whether badges and cursed badges have arrived yet. (The first journey keeps
badges back until stop 3, and the stops were balanced with badges in play, so
until they arrive a stop gives more moves: staging,
`extra_moves_before_badges_percent` in settings.json.)

The bot plays greedily and never plans, so it is weaker than a person. On
Normal it wins about 68–70% of first tries on a first journey and on later
ones, desktop and phone boards alike; Relaxed about 90–95%; Hard about 50%.

For prices and unlock thresholds, play whole journeys instead:

```sh
node tools/econ-sim.js 8 13 4 1       # columns, rows, journeys, difficulty
```

It prints the gold and lapis earned and the looks, relics and seals unlocked
after each journey. The current pace: one straight playthrough opens about a
third of the looks and half the relics; the rest take four or five journeys,
with a few left for skill. For leaks and frame times, `tools/perf/soak.py`.

## How the game works inside

`Core` (in `01-core.js`) holds three flat arrays of `N × ROWS`: `mask` (is this
a playable square), `floor` (layers of stone left: 0 is gilded) and `cells`
(the tile, or null). A tile is `{type, special, id}`. `N` is the number of
*columns* and `ROWS` the number of rows. Boards are often taller than wide, so
index by `k = r * N + c` and never assume a square.

A move runs as: `isValid` → `swap` → `clearStep` → `gravity` → `clearStep`
again until nothing clears. `clearStep` finds runs of three or more, decides
which special amulets are created, sets off any specials caught in the blast
(including chains), reduces the floor under everything cleared, and returns
lists of what happened. The game layer animates those lists; it never works out
the rules itself, which is why the bot can play the same code headlessly.

**Specials** are made by the shape of a match: four in a row makes a banded
amulet, an L or T a ringed one (the Star of Sopdet if one arm is four long),
five in a row a winged sun. **Badges** are marks a new amulet can fall wearing,
at the difficulty's `powerChance`, at most two at once. Which badge is picked
by the `weight` in each file in `content/badges/`; the `cursed` ones (Apep
takes moves, Set's sandstorm buries gilded stones) are kept rare and switched
off on Relaxed and in river events (`badBadges` in the `Core` options). When
a badged amulet is cleared, `clearStep` runs its power from `BADGE_POWERS`
(`01-core.js`), and `showClear` shows it with `BADGE_SHOWS`
(`src/game/21-moves.js`). See "A new badge" above.

`N` and `ROWS` are module-level `let`s set by `setBoardSize()` before a stop is
built, so the same code serves the 8, 10 and 12 wide boards and the tall phone
boards.

Saved data lives in one `localStorage` key, `amulets-nile-v1`: progress, stars,
gold, lapis, upgrades, relics, held boons and settings. Every write goes through
`persist()`, wrapped in try/catch, and the game runs fine when storage fails.
Fields are stored by stop *id*, and the save records the order of stop ids it
was made with, so adding or reordering content stops moves progress to follow
its stop (see `remapStops` in `00-open.js`).

## Performance

The board is drawn on one canvas, and most of it is cached:

* **The floor** (stone, cracked stone, gold, and the shadows under the squares)
  is drawn once into an offscreen canvas and copied each frame. Anything that
  changes the floor must set `bgDirty = true`, or the change won't show until
  the next resize. Gilding, the Flood and the Scales of Anubis already do.
* **Amulets** are pre-scaled to the current square size (`tileAt`), so each
  frame is a 1:1 copy rather than a 128 px sprite being shrunk. Cleared on
  resize and on changing stop or finish.
* **Idle frames**: when nothing is moving the loop draws at most 30 times a
  second, and only 4 when nothing on the board moves by itself at all
  (`idleWanted()`); a change of selection, hint or score redraws at once.
  Animations still run at full rate.
* **Customise previews** are cached per look, stop and amulet set, and drawn in
  idle time after a stop starts (`warmPreviews()`).
* **The HUD's relic strip** is only rebuilt when a relic is found.
* **Shared SVG gradients** live once in `#sharedDefs`: icons shown twice (the
  boon row exists for wide and narrow screens) would otherwise lose their fill
  in Firefox.
* **No blurred CSS round the board**: its inner shadow and vignette are painted
  into the floor layer, since Firefox repainted the CSS versions every frame.
* **Only changed squares are repainted** on the floor layer after a match
  (`bgCells`); the whole floor is redrawn only when the board is resized or
  rebuilt.
* **Sound buffers are made once**: one shared noise buffer, one sistrum rattle,
  plucked-string buffers cached per note. Generating them per sound caused
  stutters. The audio engine itself is created on the player's first tap.
  The plucked-string (Karplus-Strong) buffers for a stop's chord tones are
  pre-generated at stop start (`prewarmKS`), so a cascade's match sounds never
  pay the ~50k-sample generation cost on the hot path.
* **Bells and the gong are buffers too.** Each is a sum of fading sine
  partials, rendered once per pitch and loudness (`bellBuffer`, `toneBuffer`)
  and played as one source; the envelopes follow Web Audio's own exponential
  ramps, so they sound as the live oscillators did. A winged sun went from
  157 nodes to 18. A stop's usual bells are made in idle time
  (`prewarmBells`); the cache holds about 24 MB at most.
* **Centred sounds have no panner.** They share one bus at .707
  (`sfxCentre`), the level a centred panner gave them.
* **Phones get a larger audio buffer** (`latencyHint:'playback'` on a coarse
  pointer). The default is about 5 ms on many Android phones; a busy moment
  that misses it is heard as a crackle. Phone crackle is an *audio thread*
  problem: judge a change by the work per render slice, not frame rate. The
  way to measure it: render the sound code in an `OfflineAudioContext`, with
  `suspend()` every 0.1 s, and time each slice (average and worst).
* **The reverbs are the costliest sound nodes by far.** Timed offline, the
  music's old 2.6 s stereo hall cost more than the pad, drone, echo, wind and
  compressor together. It is now one channel, cut at 1.8 s (where the old
  tail had faded to about -46 dB), with a copy 17 ms later in the right ear:
  the same level and width, about a third of the work. The effects' 1.1 s
  reverb is one channel the same way (13 ms), half the work. Keep new
  reverbs short and one-channel.
* **Music notes are never started late** (`musicTick`): the score is
  scheduled 0.4 s ahead (`MUSIC_AHEAD`), nothing starts sooner than 30 ms
  from now (`MUSIC_MARGIN`), and a step whose time has already passed keeps
  its chord change but plays no short notes. A note started in the past skips
  its fade-in and clicks. Sound effects start 30 ms ahead (`SFX_LEAD`) for
  the same reason.
* **"Steadier sound"** (Menu → Sound, `save.steadySound`) is for a phone
  whose sound still hitches: 'playback' is only a wish and each phone decides
  its buffer, so this asks for a set size instead (`sound.steady_buffer_ms`
  in `settings.json`). `restartAudio()` makes a new engine so it takes effect
  at once; the screen shows the delay the device reports (`soundDelay()`).
* **Layers**: the board backing and the scenery have their own composited
  surfaces (`will-change`), so redrawing the board doesn't repaint them.
* **Canvas size** is capped at about two million pixels, which matters on the
  Omega board at high pixel density.
* **Slow devices**: a long run of slow frames during animation sets `lowFx`,
  which drops the soft halo under each amulet, trims sparks and lowers the
  canvas pixel ratio from 2 to 1.5. Pixel ratio is capped at 2 regardless.

## Packaging

* **Web / installable app.** Serve the built file with
  `web/manifest.webmanifest` and `web/sw.js` beside it (rename the built file
  `index.html`). The fonts are already embedded, so the game works fully
  offline.
* **Android.** `platforms/android/` holds a WebView activity that loads the built file
  from `assets/index.html`, plus its manifest. Build it with the standard
  Android tools; one quirk worth knowing is that `d8` refuses a class that
  implements a generic interface here, which is why `MainActivity` implements
  the raw `ValueCallback`.

## The stylesheet (web/css/)

The CSS is split by part of the screen, and the build joins the files in
file-name order into the one game file. Order matters in CSS (a later rule wins
a tie), so the numbers are the order:

| File | What it styles |
|---|---|
| `01-base.css` | colours and fonts (the `--` variables), the reset, the page and scenery |
| `02-layout.css` | the app shell grid, carved stone strips |
| `03-hud.css` | the top bar and its gauges |
| `04-board.css` | the stage, side tablet, board frame and canvas, gilding tube, Omega layout |
| `05-dock.css` | the buttons along the bottom, one row that fills the width |
| `06-scroll-and-buttons.css` | papyrus scrolls, the stats tablet, sandstone buttons |
| `07-side-panel.css` | trial and boon rows, place notes, relic strip |
| `08-shops-and-looks.css` | board size picker, toggles, Treasury and stall rows, Customise cards |
| `09-codex-and-sound.css` | How to play tabs, sound and music |
| `10-screens.css` | close button, New journey, menu, title screen, difficulty |
| `11-journey.css` | seals and omens, Learning pace, "The game grows as you travel" |
| `12-notices.css` | unlock banners, staging, "new" dots, try-out badge |
| `13-overlays.css` | every scroll screen, help lists, Basics legend, Nile map |
| `20-small-screens.css` | phones and short windows; last on purpose, so it overrides |

Put a new rule in the file for the part of the screen it styles. Rules for
phones go in `20-small-screens.css` (or in an `@media` block beside the rule,
where that is clearer). A new file is picked up by the build automatically;
number it for where it must sit in the order.

## Screenshots (docs/images/)

The screenshots in the README and the guides are taken by a script, so they
follow the game when it changes. A full `./build.sh` retakes them after
building the game and before the docs (`./build.sh screenshots` does only
that). It needs Node.js; the first time it fetches Playwright and a browser,
and if it can't take them it says so and keeps the old ones. By hand:

```sh
cd tools/screenshots
npm install && npx playwright install chromium    # the first time only
node take.mjs              # every screenshot
node take.mjs tomb map     # or just some; it lists the names if one is wrong
```

It plays the built game in a headless browser with a prepared save, a journey
part-way down the river (`journeySave()` in `take.mjs`), opens each screen and
writes a JPEG. Scrolls are cut out on their own. The game's dice are seeded
and motion is reduced, so the same build gives the same pictures, and a
picture is only replaced when it looks different: a build doesn't mark every
screenshot as changed in git. To add a screenshot, add a
scene to `SCENES` and a `<figure>` to `docs/screenshots.md`. Playwright
is only for this and the two checks beside it; the game and the build never
need it.

`node smoke.mjs` in the same folder is a quick play-through: a new player
and one part-way down the river, on a desktop and a phone, making moves and
opening every screen. It fails if the page logs an error. Run it after any
change to the code in `src/`.

## Pictures and icons (images/)

No picture is drawn by code. `build.py` embeds every file in `images/` in
`PICTURES` (`/*IMAGES*/null` in `00-open.js`): SVG as its text (the game makes
data: addresses from it, a third smaller than base64), other pictures as
base64. `loadPictures()` in `02-pictures.js` turns them into images before the
game starts: `SPR` (amulets, 128 px canvases), `SPECIAL` and `BADGE`
(placed and animated by `drawTile()` / `drawBadge()`), and `FLOOR_PICS` (made
into floor squares by `floorSquares()` in `04-boards.js`). Scenery and board
backings are shown as `<img>` by `setBackdrop()` / `setBoard()`. The build
checks that every stop, floor set, special and badge has its picture; which
specials exist is `SPECIAL_PICTURES` in `build.py`; the badges are the
files in `content/badges/`. `images/README.md` gives every folder, name and
size.

Icons (`images/icons/<group>/<name>.svg`) go into the page as SVG rather than
as pictures: the build puts them in `ICONS` (`/*ICONS*/null` in `src/game/06-icons.js`),
and the page's own icons (`{{svg:dock/map}}`) are filled in at build time. In
the code, `iconSvg(group, name, attrs)` gives a whole icon, and
`iconArt(group, name)` its inside only, with its `<defs>` moved once into the
shared defs (`sharedDefs`): Firefox loses gradients whose first copy is
hidden, so ids in `<defs>` must be unique across the icon files.

## Words on screen (content/text.json)

Player-facing words live in `content/text.json`, not in the code. In the
code, `T('win.title', {stop: name})` returns a key's text with `**bold**`,
`*italic*` and new lines turned into HTML, `{stop}` filled in, and
`{n|stone|stones}` choosing by number; `Tplain()` gives the same as plain text
for titles and button labels. In `web/shell.html`, `{{hud.moves}}` is filled at
build time. The build searches the code for every `T('…')` and `{{…}}` and
fails if the file lacks one; keys the code makes from an id (stages, boons,
omens, curses, difficulty, codex tabs) are listed in `TEXT_FAMILIES` in
`build.py`. New UI text should go through `T()`.

All of the game's own screens now take their words from the file; what stays
in the code is only what isn't read (ids, sound names, CSS classes).

## House style

Amulets and scenery are hand-drawn vector work in the spirit of 1990s
educational CD-ROMs: papyrus, carved sandstone, tomb-painting colour bands.
Colours are defined once as CSS custom properties in `web/css/01-base.css`. The
historical notes are meant to stay accurate; when adding a stop, prefer the
plainly documented fact over the colourful legend. Content files are where the
words a player reads live, so keep them in the game's own voice: stops, stones,
floors, gilded, amulets, specials, badges, boons, trials, curses, relics.
