# Content reference

This is the field-by-field reference for the files in this folder. Each file is
one `{ ... }` block describing one thing. The build (`build.py`) reads every
file, checks each field, and pours the result into the game; if a field is
wrong it stops and tells you which file, which line and what to do, and writes
nothing.

The examples below are real files from this folder, trimmed to the point.
Every field that appears anywhere is in the table for its section.

## The rules that apply to every file

- **One thing per file.** A file holds a single `{ ... }` block.
- **Order is the file name.** The number at the front sets the order of the
  things of that kind: `03-giza.jsonc` comes after `02-saqqara.jsonc`. Renumber
  to reorder; the build reads files in name order.
- **`id` is permanent.** It is what saves remember things by. Use lowercase
  letters, numbers and hyphens, starting with a letter, like `"golden-barque"`.
  Don't change an id once people have played.
- **Text** goes in double quotes. **Numbers** go bare. **Yes/no** is `true` or
  `false`. **Lists** go in square brackets, one item per line if it is long.
  Long text can be a list of lines, which the build joins with spaces:
  `["the first part", "the second part"]`.
- **Comments** start with `//` and are fine anywhere (so each file can explain
  its own fields). That is why the files end in `.jsonc`, "JSON with
  comments": editors know the comments are allowed. The build also forgives a
  comma before a closing bracket, but some editors don't, so leave it out.
  Keep the brackets and quotes balanced.
- **Colours** are `#rrggbb` (or `#rgb`), or `rgba(…)` / `hsla(…)` for
  see-through.
- A field the build doesn't recognise is ignored, and the build tells you,
  often with the closest match.

## The floor plan (used by stops, shapes, event puzzles and chambers)

Eight strings of eight characters.

| char | meaning |
|------|---------|
| `.`  | a gap: no square here |
| `0`  | already gilded (counts as a gilded floor square, nothing to do) |
| `1`  | bare stone: one match gilds it |
| `2`  | thick stone: two matches gild it |
| `s`  | *chambers only:* bare stone with an amulet buried in sand on it |
| `S`  | *chambers only:* thick stone with an amulet buried in sand on it |
| `w`  | *chambers only:* bare stone with an amulet under water on it (oases) |
| `W`  | *chambers only:* thick stone with an amulet under water on it |

Sand and water follow the same rule; only the picture differs. A covered
amulet can't be moved and is in no match. A match (or a blast) next
to it, or on it, brushes the sand off; from then on it is an ordinary amulet,
and its stone is gilded when it is matched. In a chamber the build also checks
that every patch of sand or water touches a square that starts clear, and that
at least 16 squares start clear.

The build checks that every non-gap square sits on a run of three across or
down (or it could never be matched) and that there is at least some stone to
gild. A stop plan that has no `1` or `2` is rejected outright.

```json
"floor_plan": [
  "00000000",
  "01111110",
  "01111110",
  "01122110",
  "01122110",
  "01111110",
  "01111110",
  "00000000"
]
```

## The condition block (used by relics and the looks)

A `found_when` or `unlocked_by` block is a set of conditions, **every one of
which must hold**. `null` means "from the start". Numbers mean "at least this
many". The counters:

| condition | counts |
|-----------|--------|
| `stars` | total stars earned |
| `three_star_stops` | stops with three stars |
| `stops_gilded` | stops won at least once |
| `stops_won` | stops won, all time |
| `hard_wins` | stops won on Hard or Pharaoh |
| `trials_finished` | trials finished |
| `river_events` | river events played |
| `relics_found` | relics in the museum |
| `suns_forged` | winged suns made |
| `best_cascade` | the longest cascade so far |
| `thick_stones_cracked` | thick stones gilded |
| `gold_earned` | gold earned, all time |
| `gold_held` | gold on hand |
| `lapis_held` | lapis on hand |
| `win_streak` | current streak of wins |
| `journeys` | journeys begun |
| `seals_stamped` | seals stamped, all stops |
| `omens_braved` | the most omens braved at each stop, added up |

About the stop **just won** (a relic can be found the moment you win a stop
that meets these):

| condition | value |
|-----------|-------|
| `win_moves_to_spare` | number of moves left |
| `win_on_difficulty` | a difficulty name, `"Normal"` … |
| `win_at_stop` | a stop id |
| `win_without_boons` | `true` |
| `win_on_board` | a board: `classic` / `grand` / `ruins` / `omega` |
| `win_two_specials_at_once` | `true` |
| `win_after_failures` | number of earlier failures here |
| `win_with_omens` | number of omens braved |
| `win_suns_forged` | winged suns forged during the stop |
| `win_best_cascade` | the longest cascade during the stop |
| `win_specials_made` | special amulets made during the stop |

And `relic`: one relic unlocks the next (a relic id).

```json
"found_when": { "stops_won": 1 }
"found_when": { "win_at_stop": "giza", "win_moves_to_spare": 5 }
"unlocked_by": { "stars": 15 }
```

## The reward block (used by relics and river events)

A block of any of `gold`, `lapis` (whole numbers of 1 or more) and `boon` (a
boon id, or `"random"`).

```json
"reward": { "gold": 45 }
"reward": { "lapis": 25 }
"reward": { "boon": "hammer" }
```

---

## Stops (`content/stops/`)

`amulets` is either one list of 4 to 6 amulet names, or a list of such lists,
like `[["ankh","scarab","eye","lotus","cat"], ["djed","feather","eye","lotus"]]`:
then each time the stop starts (restarts included) the game picks one list at
random, and plays with that many types.

One stop on the journey, in order.

| field | required | what it is |
|-------|:--------:|------------|
| `id` | yes | short lowercase id, permanent |
| `name` | yes | the stop's name |
| `subtitle` | no | a short line under the name |
| `history` | no | the codex note; accurate plain fact |
| `moves` | yes | the base move budget (5–120) |
| `amulets` | yes | 4–6 amulet names, no repeats |
| `floor_plan` | yes | the stop's own 8×8 plan |
| `shared_floor_shapes` | no | list of floor-shape ids this stop may use |
| `stone_colour` | no | the bare-stone colour (default `#a8977a`) |
| `music` | no | `{key, scale, instrument}` (see below) |
| `scenery` | no | another picture in `images/backdrops/` to use (default: the one named after the stop's id) |
| `board_backing` | no | another picture in `images/boards/` to use (default: the one named after the stop's id) |
| `frame_colours` | no | exactly 3 colours `[face, shade, edge]` for the carved frame |
| `map_position` | yes | `{x, y, label}` on the Nile map |
| `seals` | no | three challenges: `[{"text": "...", "when": {conditions}}, ...]`, stamped the first time a win here meets `when`. Keep their order: saves remember seals by position |

**`music`**: `key` is a note like `"D3"` (or a frequency 40–1000 Hz); `scale`
is a name (`hijaz`, `double harmonic`, `dorian`, `minor`, `major`, `mixolydian`,
`lydian`, `phrygian`, `major pentatonic`, `minor pentatonic`) or a raw list of
semitone steps; `instrument` is one of `harp`, `lyre`, `oud`, `flute`, `bell`.

**Pictures.** A stop's scenery is `images/backdrops/<id>.svg` and its board
backing `images/boards/<id>.svg` (or `.png` / `.jpg`); the build stops if
one is missing. `scenery` and `board_backing` name a different picture
instead, without the ending: `"scenery": "giza"`. See `images/README.md`.

**`map_position`**: `x` 0–360, `y` 0–560 (the river runs from Alexandria at
the top to Abu Simbel at the bottom), `label` is `"right"` or `"left"` (which
side of the dot the name sits on).

## Amulets (`content/amulets/`)

What the codex says about an amulet. Its picture is `images/amulets/<id>.svg`
(or `.png`).

| field | required | what it is |
|-------|:--------:|------------|
| `id` | yes | the amulet's name (matches its drawing or picture) |
| `name` | yes | the display name |
| `plural` | yes | the plural, for trials ("clear 14 scarabs") |
| `meaning` | no | the codex text; accurate |

## Trials (`content/trials/`)

A trial a priest can set at a stop. Finish it and the boon is the player's.

| field | required | what it is |
|-------|:--------:|------------|
| `id` | yes | short id |
| `goal` | yes | one of the goals below |
| `target` | yes | the number to reach (1 or more) |
| `text` | yes | what it says; may hold `{target}` and `{amulets}` |
| `progress_label` | no | the label on the progress bar (default "Progress") |
| `boon` | yes | the boon offered on success |
| `only_if_thick_stones` | no | only offer this if the floor has this many thick stones |
| `within_moves` | no | for `gild_half_quickly`: the move limit |

Goals: `clear_amulets`, `make_specials`, `cascade`, `gild_in_one_move`,
`clear_in_one_move`, `moves_to_spare`, `make_suns`, `make_bands`,
`crack_thick`, `gild_half_quickly`, `no_boons`, `combine_specials`. A
`clear_amulets` trial should put `{amulets}` in its text so it names the amulet.

## Boons (`content/boons/`)

A held power the player spends when they choose. Players keep boons by id.

| field | required | what it is |
|-------|:--------:|------------|
| `id` | yes | short id; saves keep boons by it, so don't change it |
| `short` | yes | the label on its button (about 8 letters) |
| `name` | yes | its full name, like "Wisdom of Thoth" |
| `description` | yes | what it does; `{n}` is the amount |
| `effect` | yes | one of the effects below |
| `amount` | no | the number the effect uses (each has a default) |
| `popup` | no | shown on the board when it is used; `{n}` is the amount |
| `popup_when_nothing` | no | shown instead when there was nothing for it to do |
| `random_reward` | no | `true`: it can be the boon a "random" reward gives |
| `icon` | no | the icon in `images/icons/boons/` to use (default: its id) |

Effects (★ the player chooses a square): `extra_moves` (n more moves, 6),
`gild_stones` (n stones chosen at random lose a layer, 8),
`thin_thick_stones` (every thick or cracked stone loses a layer), `cord_row`
★ (every stone in the row loses a layer), `shatter_one` ★ (shatters one
amulet and gilds the stone under it), `shatter_square` ★ (an n by n square,
5; use an odd number), `make_banded` ★, `make_sun` ★, `make_ringed` (n
amulets become ringed, 3), `shuffle` (the amulets shuffled, and n more
moves, 2).

## Badges (`content/badges/`)

A small mark an amulet can fall wearing; clearing the amulet uses its
power. Its picture is `images/badges/<id>.svg` (96 by 96, the badge a circle
of radius 24 in the middle); the build won't take a badge without one.

| field | required | what it is |
|-------|:--------:|------------|
| `id` | yes | short id, and the picture's name |
| `name` | yes | its name, like "Blessing of Khepri" |
| `looks` | yes | how it looks, shown after the name in How to play: "gold sparkle" |
| `text` | yes | what it does, in How to play; `{n}` is the amount |
| `effect` | yes | one of the powers below |
| `amount` | no | the number the power uses (each has a default) |
| `popup` | yes | shown on the board when it fires; `{n}` is the amount |
| `popup_when_nothing` | no | shown instead when it could do nothing |
| `cursed` | yes | `true`: a red ring, never on Relaxed or in river events |
| `weight` | yes | how often it turns up when a badge falls, against the others; 0 switches it off |
| `colour` | yes | the glow round an amulet wearing it, like `"#ffd65a"` |

Powers: `gild_stones` (golden light gilds n bare stones anywhere, 4),
`gild_around` (gilds the stones in the nine squares around it),
`row_and_column` (clears its row and column), `extra_moves` (n more moves,
3), `give_lapis` (n lapis, 3), `lose_moves` (n moves lost, never the last,
2), `ungild_stones` (n gilded stones turn bare, 3).

## Curses (`content/curses/`)

What failing a trial costs (or an unkind river), at the next stop only. A
trial card names its curse before the player accepts.

| field | required | what it is |
|-------|:--------:|------------|
| `id` | yes | short id; a save carrying the curse remembers it |
| `name` | yes | its name, like "Weight of stone" |
| `text` | yes | what it does, with `{n}` for the strength: "{n} bare stones turn thick". Leave out "at the next stop"; the game adds it |
| `text_at_full_strength` | no | used instead of `text` when the strength is 100 |
| `effect` | yes | one of the effects below |
| `strength` | yes | `{"Relaxed": 0, "Normal": 3, "Hard": 5, "Pharaoh": 7}`: how strong it is on each difficulty; 0 means it never falls there. Keep Relaxed at 0 |

Effects, shared with the omens (the hardships): `fewer_moves` (n fewer
moves), `fewer_moves_percent` (n percent fewer moves), `thick_stones` (n bare
stones start thick), `thick_stones_share` (one bare stone in n starts thick),
`buried_amulets` (n amulets start buried in sand, as in a tomb),
`fewer_badges` (badged amulets fall n percent less often; 100 means none),
`more_cursed_badges` (cursed badges fall, n times as often), `no_boons` (no
boons can be used). A strength is at most 100.

## Omens (`content/omens/`)

A hardship a player may choose to brave at a stop they have already gilded,
for a richer reward (`omens.reward_percent_each` in `settings.jsonc`). It
lasts for that stop and its restarts. Saves remember omens by id.

| field | required | what it is |
|-------|:--------:|------------|
| `id` | yes | short id; don't change it once people play |
| `name` | yes | its name, like "Chaos stirs" |
| `text` | yes | what it does; `{n}` is the amount |
| `effect` | yes | one of the hardships above |
| `amount` | yes (not for `no_boons`) | its n, 1 to 100 |

## Relics (`content/relics/`)

A relic for the museum: found once, kept on every journey.

| field | required | what it is |
|-------|:--------:|------------|
| `id` | yes | short id |
| `name` | yes | the relic's name |
| `description` | yes | what it is / how it was found |
| `found_when` | yes | a condition block |
| `reward` | no | a reward block |
| `icon` | no | an icon in `images/icons/relics/` by name; or a picture `images/relics/<id>.png` |

## River events (`content/river-events/`)

Something that can happen on the river between two stops. Two kinds.

Common fields: `id`, `kind` (`"puzzle"` or `"choice"`), `title`, `text`,
`weight` (how likely it is, 0–100, default 1; the overall chance is
`river_event_percent` in `settings.jsonc`).

**A puzzle** is a short game on its own little board:

| field | required | what it is |
|-------|:--------:|------------|
| `goal` | yes | `{"type":"gild"}` or `{"type":"collect","amulet":"…","count":n}` or `{"type":"score","points":n}` |
| `amulet_types` | yes | how many amulet kinds (4–6) |
| `amulets` | no | which amulets; a `collect` goal needs this, and the collected amulet must be among the first `amulet_types` |
| `moves` | yes | the move budget (3–80) |
| `floor_plan` | yes | the small 8×8 board |
| `reward` | no | a reward block |
| `by_lamplight` | no | `true` to play the board dim and small |

**A choice** offers a small decision:

| field | required | what it is |
|-------|:--------:|------------|
| `choices` | yes | a list of 1–5, each `{label, cost?, give?, take_a_boon?, gamble?}` |

`cost` and `give` are reward blocks (a choice can cost gold/lapis and give
gold/lapis/boon). `take_a_boon` trades one of the player's boons. `gamble`
means the outcome is left to chance. It is kind to include a choice that simply
walks on.

On the scroll, each choice that does something is a card, like a trial card:
the `label` as its heading, then "You pay:" and "You get:" lines built from
`cost`, `give`, `take_a_boon` and `gamble`, with the gold and lapis symbols. So
keep the `label` a short action ("Pay him for the channel", "Join the dance")
and leave the price out of it. A choice that does nothing becomes the way out, full
width below the cards. A card the player cannot afford stays on the scroll,
dimmed, with the reason.

## Chambers (`content/chambers/`)

A place beside a stop, with a small board of its own. It is either a **tomb or
temple** (`"setting": "tomb"`, the default): dim, lit by torches, some amulets
buried in sand; or an **oasis** (`"setting": "oasis"`): in daylight, some
amulets under water. The two differ only in their look and words. Its doorway opens once that stop is gilded (and the
"chambers" stage has arrived, see `settings.jsonc`). The player finds it on the
win screen, on the stop's card and as a doorway beside the stop on the map.
The goal is always to gild the floor. The reward is paid the first time; every
later visit pays `return_reward`. A tomb or temple also wakes each time the
player goes back in: cursed badges turn up, likelier with each return, and its
return reward grows with them (`reward_percent_each_return`)
(`"returning"` in `settings.jsonc`; not on Relaxed, and not before curses have
arrived on a first journey). Oases stay calm.

| field | required | what it is |
|-------|:--------:|------------|
| `id` | yes | unique id (saves remember explored chambers by it) |
| `at` | yes | the id of the stop it is beside; one chamber per stop |
| `setting` | no | `"tomb"` (default) or `"oasis"` |
| `scenery` | no | a picture in `images/backdrops/` to show behind the board (`"tomb"`, `"sanctuary"`, `"oasis"` are there to share); without it, `images/backdrops/<id>`, else the stop's own scenery |
| `name` | yes | its name, as a title ("The Serapeum") |
| `text` | yes | what the place is, two or three sentences; keep it true |
| `moves` | yes | the move budget, 3–80 |
| `floor_plan` | yes | 8 × 8, and may use `s`, `S`, `w` and `W` (see the floor plan) |
| `reward` | yes | a reward block, paid the first time |
| `return_reward` | no | gold and lapis paid on a later visit; in a tomb or temple it is the first return's, and grows with each return after (default: half the gold and lapis of `reward`, or 50 gold) |
| `amulet_types` | no | 4–6 (default 5) |
| `amulets` | no | its own amulet list (default: the stop's), or a list of such lists: then each time it opens, one is picked at random, as for a stop |

It uses the stop's amulets and music unless it has its own `amulets`; a tomb
darkens its scenery and muffles the music, as if through the walls. Check a new chamber with `node tools/events-sim.js`; the bot
should win it about 60–80% of the time on a first visit; the sim also plays
each tomb and temple as a first and a fourth return, which should be harder.

## Anubis's stall (`content/anubis-stall/`)

Something Anubis sells: bought for one stop, used once (or held).

| field | required | what it is |
|-------|:--------:|------------|
| `id` | yes | short id |
| `name` | yes | the name shown |
| `description` | yes | what it does |
| `icon` | no | a picture in `images/icons/stall/` (without `.svg`); an item that gives one boon shows the boon's own without it |
| `currency` | yes | `gold` or `lapis` |
| `price` | yes | the one-time price (the build raises it `stall_price_rise_percent` each repeat at the same stop) |
| `gives` | yes | exactly one of the four below |

`gives` is one of: `{"moves": n}` (extra moves now), `{"reshuffle": true}`
(reshuffle now), `{"second_wind": n}` (a held charge, used later), or
`{"boon": [ … ]}` (adds a boon to the hand; names or `"random"`).

## Treasury (`content/treasury/`)

A lasting upgrade: bought once per level, kept for good.

| field | required | what it is |
|-------|:--------:|------------|
| `id` | yes | short id |
| `name` | yes | the name shown |
| `description` | yes | what it does |
| `currency` | yes | `gold` or `lapis` |
| `prices` | yes | one price per level, a list of whole numbers |
| `effect` | yes | what it changes (see below) |
| `amount_per_level` | yes | how much, per level |

Effects: `extra_moves` (moves at every stop), `badge_chance` (added to the
badge chance), `trial_chance` (added to the trial chance), `win_gold` and
`win_lapis` (paid for each stop won). Amounts add up across every upgrade that
shares an effect.

## The looks (amulet sets, floors, frames, sparkles)

All four kinds share the same base fields; the rest is what each one draws.
Every look is unlocked by a condition block (`null` = available from the start).

| field | required | what it is |
|-------|:--------:|------------|
| `id` | yes | short id |
| `name` | yes | the name shown |
| `description` | yes | what it looks like |
| `unlocked_by` | yes | a condition block, or `null` |
| `how_to_unlock` | no | text for the locked card |

One of each kind is the free starting look and must keep its id: the amulet set
`faience`, the floor `temple`, the frame `temple`, the sparkle `gold`.

### Amulet sets (`content/amulet-sets/`)

The same amulet drawings, recoloured through a colour filter. Give either
`colour_changes` (the named changes, applied in the order written) or a ready
`css_filter` string, but not both. Optional `glow` (a colour) and `tint` (a colour
with `tint_strength` 0–1).

Colour changes: `hue_shift` (degrees, −360 to 360), `saturation`, `brightness`,
`contrast`, `sepia`, `greyscale`. Keep the set readable: shift the hue, don't
make every amulet one colour.

### Floor sets (`content/floor-sets/`)

The stone under the amulets. The file gives the look its name, description
and unlock; the pictures are the folder `images/floors/<id>/`: `bare`, `thick`
and `gilded` (or `gilded-1` … `gilded-4`, mixed across a golden floor).
`"uses_each_stops_own_stone": true` (the temple floor) lays the see-through
`bare` and `thick` pictures over each stop's own `stone_colour`.

### Frames (`content/frames/`)

The carved edge round the floor. `colours` is `{face, shade, edge}`, or `null`
to let each stop keep its own carved stone.

### Sparkles (`content/sparkles/`)

The light that flies off a match. `colours` is a list of exactly two colours.

## settings.jsonc

The whole-game numbers. Every one is optional; leave one out and the game uses
the default shown. The file itself has a comment beside each.

| field | default | what it is |
|-------|:-------:|------------|
| `stops_open_at_start` | 1 | stops open before any is won |
| `staging.learning_pace` | "one at a time" | where new players start; or "everything now" |
| `staging.seals` … `staging.curses` | 2, 3, 4, 5, 6, 8 | the stop each part arrives at on a first journey (seals, badges, trials, stall, events, curses) |
| `staging.omens` | "after the journey" | or a stop number |
| `staging.extra_moves_before_badges_percent` | 50 | until badges arrive on a first journey, each stop gives this much more of its moves (the stops are balanced with badges in play) |
| `stars.three_stars_moves_left_percent` | 30 | share of moves left for three stars |
| `stars.two_stars_moves_left_percent` | 15 | … for two |
| `difficulty.<Relaxed/Normal/Hard/Pharaoh>` | 140/100/85/72, 4/2.2/1.5/0.8, 6/9/15/0 | `moves_percent`, `badge_chance_percent`, `hint_after_seconds` (0 = no hints) |
| `river_event_percent` | 30 | how often sailing on is interrupted by a river event |
| `trial_offer_percent` | 35 | how often a trial is offered when a stop begins |
| `badges.most_good_badges_at_once` | 2 | good badges on the board at once |
| `omens.reward_percent_each` | 30 | extra gold and lapis per omen braved |
| `seals.lapis_each` | 6 | lapis per seal stamped |
| `stall_price_rise_percent` | 30 | how much dearer a stall item gets each repeat at the same stop |
| `persistence.extra_moves_per_failure` | 2 | moves added for each consecutive failure |
| `persistence.failures_that_count` | 3 | up to this many failures add moves |
| `persistence.boon_after_failures` | 2 | a free boon after this many failures in a row |
| `earnings.stones_per_gold` | 2 | one gold for every this many stones gilded |
| `earnings.specials_per_lapis` | 2 | one lapis for every this many specials made |
| `earnings.gold_for_winning` | 25 | gold for gilding a stop |
| `earnings.gold_per_spare_move` | 2 | plus this for each move left over |
| `earnings.lapis_for_winning` | 1 | lapis for gilding a stop |
| `sound.steady_buffer_ms` | 80 | the audio buffer asked for when a player turns on "Steadier sound" (Menu → Settings → Sound and music); longer is steadier, but sounds come later |

## Pictures and icons (`images/`)

Every picture, one file each; `images/README.md` lists the folders, names and
sizes. Icons (`images/icons/`: `dock`, `boons`, `relics`, `menu`, `ui`, `map`)
must be SVG: keep each `viewBox`, and give gradients ids no other icon uses
(the game shares them across the page). A relic uses
`images/icons/relics/<its id>.svg` if there is one, else the icon named by its
`"icon"`; a picture in `images/relics/` wins over both. The build complains
about a file that isn't one `<svg viewBox="…">` drawing.

## text.jsonc

The words on screen, grouped by screen (`hud`, `dock`, `title`, `menu`,
`stages`, `win`, `lose`, `shop`, `stall`, `treasury`, `customise`, `saves`,
`audio`, `map`, `journey`, `trial`, `event`, `popup`, `codex`, `conditions`,
`boards`, `boons`, `omens`, `curses`, …). Keys on the
left stay; text on the right is yours. In the text: `**bold**`, `*italic*`,
`\n` for a new line, `{name}` for something the game fills in, and
`{n|one|many}` for a word that depends on a number. The build fails, naming
the key, if the game asks for one the file does not have.

---

## Appendix: every name the build knows about

The tables in the sections above list the condition and goal names. This
appendix lists the other names a content file may refer to, so the whole
reference is in one place. The build checks these against the code; if one of
them changes, the build's error message will list the current set.

### Condition names (for `found_when` and `unlocked_by`)

Counters (a number means "at least this many"):
`stars`, `three_star_stops`, `stops_gilded`, `stops_won`, `hard_wins`,
`trials_finished`, `river_events`, `relics_found`, `suns_forged`,
`best_cascade`, `thick_stones_cracked`, `gold_earned`, `gold_held`,
`lapis_held`, `win_streak`, `journeys`, `seals_stamped`, `omens_braved`,
`chambers_explored`.

About the stop just won:
`win_moves_to_spare`, `win_on_difficulty`, `win_at_stop`,
`win_without_boons`, `win_on_board`, `win_two_specials_at_once`,
`win_after_failures`, `win_with_omens`, `win_suns_forged`, `win_best_cascade`,
`win_specials_made`.

Special: `relic` (one relic id unlocks the next).

### Trial goals

`clear_amulets`, `make_specials`, `cascade`, `gild_in_one_move`,
`clear_in_one_move`, `moves_to_spare`, `make_suns`, `make_bands`,
`crack_thick`, `gild_half_quickly`, `no_boons`, `combine_specials`.

### Badge powers (`effect` in badges)

`gild_stones`, `gild_around`, `row_and_column`, `extra_moves`, `give_lapis`,
`lose_moves`, `ungild_stones`.

### Hardships (`effect` in curses and omens)

`fewer_moves`, `fewer_moves_percent`, `thick_stones`, `thick_stones_share`,
`buried_amulets`, `fewer_badges`, `more_cursed_badges`, `no_boons`.

### Boons (rewards, stall items, events)

The ids of the files in `content/boons/`: now `flood`, `hammer`, `wisdom`,
`scales`, `chisel`, `band`, `sun`, `seshat`, `sekhmet`, `bes`, or
`"random"` where a boon is drawn at random (one of those with
`"random_reward": true`: now `flood`, `hammer`, `wisdom`, `scales`, `sun`,
`seshat`, `sekhmet`).

### Boon effects (`effect`)

`extra_moves`, `gild_stones`, `thin_thick_stones`, `cord_row`, `shatter_one`,
`shatter_square`, `make_banded`, `make_sun`, `make_ringed`, `shuffle`.

### Amulets (`amulets`)

Every picture in `images/amulets/` is an amulet a stop can use (the winged
`sun` is a special, not an amulet). Those that come with the game:

`ankh`, `amphora`, `anubis`, `aten`, `bluelotus`, `cartouche`, `cat`,
`column`, `croc`, `crown`, `djed`, `eye`, `feather`, `fish`, `lighthouse`,
`lotus`, `mask`, `obelisk`, `papyrus`, `pyramid`, `scarab`, `star`, `tyet`,
`uraeus`.

### Relic icons (`icon`)

`first`, `cascade`, `trials`, `stars`, `suns`, `spare`, `pharaoh`,
`journey`, `jackal`, `wanderer`, `streak`, `omega`, `catalogue`, `granary`,
`treasury`, `chiselwork`, `duet`, `cataract`, `djed`, `offering`, `cord`,
`sistrum`, `sekhmet`, `signet`, `wand`, or a
picture in `images/relics/<id>.png`.

### Music instruments (`music.instrument`)

`harp`, `lyre`, `oud`, `flute`, `bell`.

### Music scales (`music.scale`)

`hijaz`, `double harmonic`, `dorian`, `minor`, `major`, `mixolydian`,
`lydian`, `phrygian`, `major pentatonic`, `minor pentatonic`, or a raw list
of semitone steps, like `[0, 2, 3, 5, 7, 9, 10]`.

### Treasury effects (`effect`)

`extra_moves`, `badge_chance`, `trial_chance`, `win_gold`, `win_lapis`.

### Amulet-set colour changes (`colour_changes`)

`hue_shift` (degrees), `saturation`, `brightness`, `contrast`, `sepia`,
`greyscale`, applied in the order written.

### Currencies (`currency`)

`gold`, `lapis`.

### Board modes (for `win_on_board`)

`classic`, `grand`, `ruins`, `omega`.

### Difficulties (for `win_on_difficulty`)

`Relaxed`, `Normal`, `Hard`, `Pharaoh`.

### River-event goal types (`goal.type`)

`gild`, `collect`, `score`.

### Floor-plan characters

`.` gap, `0` already gilded, `1` bare stone, `2` thick stone; in chambers
also `s` and `S`, stone and thick stone with an amulet buried in sand, and `w`
and `W`, the same under water.

### The free starting looks (keep these ids)

The amulet set `faience`, the floor `temple`, the frame `temple`, the sparkle
`gold`. Every save begins with these, and saves rely on them.
