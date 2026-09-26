# Content reference

*The place to look up the exact name of a setting. If you're just getting
started, part 1 of the manual is the better place to begin, since it
explains all of this step by step.*

This reference lists every setting of every kind of content file, which
can be found in your game's `content/` folder. Each file describes one
thing, such as a stop or a boon. When you build, the build
(`engine/build.py`) reads every one of these files and checks each
setting. If something is wrong, it stops and tells you which file, which
line and what to do about it. In that case, it doesn't write anything.

The examples below are shortened to what matters. The example game in
`example/content/` has a working file of almost every kind. The first
file of each kind also explains every one of its settings in comments. Those
first files are also what `new.sh` copies when you make something new.

## The rules for every file

- **One thing per file.** A file contains a single `{ ... }` block.
- **The file name decides the order.** The number at the front sets the
  order of the things of that kind: `03-stop-3.jsonc` comes after
  `02-stop-2.jsonc`. To reorder things, simply renumber the files.
- **An `id` is permanent.** Saves remember things by it. Use lower case
  letters, numbers and hyphens, starting with a letter, like
  `"old-harbour"`. Don't change an id once people have played your game.
- **Kinds of values.** Text goes in double quotes, numbers go without
  them, yes or no is `true` or `false` and lists go in square brackets.
  Long text can also be written as a list of lines, which the build joins
  with spaces: `["the first part", "the second part"]`.
- **Comments** start with `//` and are fine anywhere, so each file can
  explain its own settings. That's also why the files end in `.jsonc`,
  "JSON with comments": editors then know that comments are allowed. The
  build forgives a comma right before a closing bracket, but some editors
  don't, so it's best to leave it out.
- **Colours** are written as `#rrggbb` (or `#rgb`), or as `rgba(…)` or
  `hsla(…)` for see-through colours.
- **A setting the build doesn't know** is ignored. The build tells you
  about it, usually along with the name it thinks you meant.

## The floor plan

*Used by stops, floor shapes, event puzzles and chambers.*

A floor plan is a list of eight lines with eight characters each. Every
character is one square:

| Character | Square |
|---|---|
| `.` | a gap: there is no square here |
| `0` | stone that is already gilded, so there's nothing to do |
| `1` | bare stone: one match gilds it |
| `2` | thick stone: it takes two matches |
| a cover's letters | an amulet under that cover, on bare stone (the first letter) or on thick stone (the second). Each cover in `content/covers/` has two letters of its own. In the example, these are `s`/`S` for sand, `w`/`W` for water, `a`/`A` for amber, `n`/`N` for a net and `v`/`V` for ivy. |

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

**What the build checks.** Every square that isn't a gap has to sit on a
row of three squares, across or down, or it could never be matched. There
has to be some stone to gild at all: a stop's plan without a single `1`
or `2` is refused. Where a plan has covers, every patch of covers that
doesn't match has to touch a square that starts clear, so the player can
reach it. At least 16 squares have to start clear.

A covered amulet can't be moved. Unless its cover says otherwise (the
cover's `matches`), it isn't part of any match either. Once it's free,
it's an ordinary amulet again and its stone is gilded when it's matched.

## Conditions

*Used by relics (`found_when`) and by the looks (`unlocked_by`).*

A condition block is a group of conditions and **every one of them has
to be met**. `null` means "right from the start". A number means "at
least this many".

**Counted over all of the player's journeys:**

| Condition | What it counts |
|---|---|
| `stars` | stars earned |
| `three_star_stops` | stops with three stars |
| `stops_gilded` | stops won at least once |
| `stops_won` | stops won, all in all |
| `hard_wins` | stops won on the third or fourth difficulty |
| `trials_finished` | trials finished |
| `river_events` | events played |
| `relics_found` | relics in the Museum |
| `suns_forged` | suns made |
| `best_cascade` | the longest cascade so far |
| `thick_stones_cracked` | thick stones gilded |
| `gold_earned` | gold earned |
| `gold_held` | gold the player has right now |
| `lapis_held` | lapis the player has right now |
| `win_streak` | wins in a row right now |
| `journeys` | journeys begun |
| `seals_stamped` | seals stamped, at all stops |
| `omens_braved` | the most omens braved at each stop, added up |
| `chambers_explored` | chambers explored |

**About the stop that was just won** (so a relic can be found the moment
the player wins a stop that meets these):

| Condition | Its value |
|---|---|
| `win_moves_to_spare` | the number of moves left |
| `win_on_difficulty` | a difficulty's name, such as `"Normal"` |
| `win_at_stop` | a stop's id |
| `win_without_boons` | `true` |
| `win_on_board` | a kind of board: `classic`, `grand`, `ruins` or `omega` |
| `win_two_specials_at_once` | `true` |
| `win_after_failures` | the number of earlier failures at this stop |
| `win_with_omens` | the number of omens braved |
| `win_suns_forged` | suns made during the stop |
| `win_best_cascade` | the longest cascade during the stop |
| `win_specials_made` | special amulets made during the stop |

There is one more: `relic`, a relic's id, so that finding one relic can
unlock the next.

```json
"found_when": { "stops_won": 1 }
"found_when": { "win_at_stop": "stop-2", "win_moves_to_spare": 5 }
"unlocked_by": { "stars": 15 }
```

## Rewards

*Used by relics, events and chambers.*

A reward is a group of any of these: `gold` and `lapis` (whole numbers,
1 or more) and `boon` (a boon's id, or `"random"`).

```json
"reward": { "gold": 45 }
"reward": { "lapis": 25 }
"reward": { "boon": "hammer" }
```

---

## Stops (`content/stops/`)

A stop is one place on the journey, with its own floor, amulets, scenery
and music. The stops come one after the other, in the order of their file
names.

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name, which never changes |
| `name` | yes | the stop's name |
| `subtitle` | no | a short line under the name |
| `history` | no | the note beside the board |
| `moves` | yes | how many moves the player gets, before the difficulty and the size of the screen are taken into account (5 to 120) |
| `amulets` | yes | the amulets that fall here: 4 to 6 of them, each one only once (see below) |
| `floor_plan` | yes | the stop's own floor plan |
| `shared_floor_shapes` | no | a list of floor shapes this stop sometimes uses instead, by their ids |
| `stone_colour` | no | the colour of its bare stone (`#a8977a` if left out) |
| `music` | no | `{key, scale, instrument}` (see below) |
| `scenery` | no | another stop's picture in `images/backdrops/` to use instead of its own |
| `board_backing` | no | another stop's picture in `images/boards/` to use instead of its own |
| `frame_colours` | no | exactly 3 colours for the board's frame: `[face, shade, edge]` |
| `map_position` | yes | `{x, y, label}`: where it sits on the map (see below) |
| `seals` | no | three small challenges: `[{"text": "...", "when": {conditions}}, ...]`, each stamped the first time a win here meets its `when`. Keep their order once people play, since saves remember seals by their position. |

**`amulets`** is either one list of 4 to 6 amulet ids or a list of such
lists, like `[["round", "square", "triangle", "diamond"], ["round",
"drop", "star", "diamond"]]`. In that case, the game picks one of the
lists at random each time the stop starts (restarts included).

**`music`**: `key` is a note, like `"D3"` (or a frequency from 40 to
1000 Hz). `scale` is one of `hijaz`, `double harmonic`, `dorian`,
`minor`, `major`, `mixolydian`, `lydian`, `phrygian`, `major pentatonic`
or `minor pentatonic`, or a list of semitone steps of your own.
`instrument` is one of `harp`, `lyre`, `oud`, `flute` or `bell`.

**Pictures.** A stop's scenery is `images/backdrops/<id>.svg` and what
shows through the gaps in its floor is `images/boards/<id>.svg` (or a
`.png` or `.jpg` of the same name). The build stops if one of them is
missing. `scenery` and `board_backing` name a different picture instead,
without the ending: `"scenery": "stop-1"`.

**`map_position`**: `x` and `y` are measured in the map picture's own
units, which are set by the `viewBox` of `images/icons/map/background.svg`.
`label` is `"right"` or `"left"`: which side of the marker the stop's
name is shown on.

## Floor shapes (`content/floor-shapes/`)

A floor shape is a floor plan that several stops can share. A stop names
the ones it may use in its `shared_floor_shapes` and then, now and then,
it's played on one of them instead of its own `floor_plan`. That's a nice
way to give a stop some variety without drawing a new stop.

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name, which stops use in `shared_floor_shapes` |
| `name` | yes | its name |
| `floor_plan` | yes | the floor plan (see "The floor plan" above) |
| `move_multiplier` | no | how many moves a stop gets on this shape, compared to its own floor: 1.2 means a fifth more. From 0.5 to 3; 1 if left out. |

## Amulets (`content/amulets/`)

An amulet is one of the pieces the player swaps. This file contains what
How to play says about it. Its picture is `images/amulets/<id>.svg` (or
`.png`).

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name, the same as its picture's name |
| `name` | yes | its name |
| `plural` | yes | its name for more than one, which trials use ("clear 14 round gems") |
| `meaning` | no | what it means, in How to play |

## Trials (`content/trials/`)

A trial is a task that can be offered at the start of a stop. If the
player finishes it, they win its boon.

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name |
| `goal` | yes | what the player has to do (see below) |
| `target` | yes | how many (1 or more) |
| `text` | yes | the task in words; `{target}` is filled in with the number and `{amulets}` with the amulet's name |
| `progress_label` | no | the word beside the count (`"Progress"` if left out) |
| `boon` | yes | the id of the boon it gives |
| `only_if_thick_stones` | no | only offer it if the floor has at least this many thick stones |
| `within_moves` | no | for `gild_half_quickly`: the number of moves the player has to do it in |

The goals are `clear_amulets`, `make_specials`, `cascade`,
`gild_in_one_move`, `clear_in_one_move`, `moves_to_spare`, `make_suns`,
`make_bands`, `crack_thick`, `gild_half_quickly`, `no_boons` and
`combine_specials`. A `clear_amulets` trial should have `{amulets}` in its
text, so it names the amulet.

## Boons (`content/boons/`)

A boon is a power the player keeps and uses whenever they like. Players
keep boons by their id.

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name; saves keep boons by it, so don't change it |
| `short` | yes | the word on its button (about 8 letters) |
| `name` | yes | its full name, like "Mason's chisel" |
| `description` | yes | what it does; `{n}` is the amount |
| `effect` | yes | what it does (see below) |
| `amount` | no | the number the effect uses (each effect has a default) |
| `popup` | no | the words shown on the board when it's used; `{n}` is the amount |
| `popup_when_nothing` | no | the words shown instead when there was nothing for it to do |
| `random_reward` | no | `true`: it can be the boon a `"random"` reward gives |
| `icon` | no | the name of another icon in `images/icons/boons/` to use instead of its own |

The effects (★ means the player chooses a square first; the number is the
default amount):

| Effect | What it does |
|---|---|
| `extra_moves` | n more moves (6) |
| `gild_stones` | n stones, chosen at random, lose a layer (8) |
| `thin_thick_stones` | every thick or cracked stone loses a layer |
| `cord_row` ★ | every stone in the chosen row loses a layer |
| `shatter_one` ★ | shatters the chosen amulet and gilds the stone under it |
| `shatter_square` ★ | shatters an n by n square around the chosen amulet (5; use an odd number) |
| `make_banded` ★ | the chosen amulet becomes a banded amulet |
| `make_sun` ★ | the chosen amulet becomes a sun |
| `make_ringed` | n amulets, chosen at random, become ringed amulets (3) |
| `shuffle` | the amulets are shuffled and the player gets n more moves (2) |

## Badges (`content/badges/`)

A badge is a mark some amulets wear when they fall in. When the amulet is
matched, the badge's power is used. Its picture is
`images/badges/<id>.svg` (96 by 96, with the badge as a circle with a
radius of 24 in the middle); the build won't accept a badge without one.

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name, the same as its picture's name |
| `name` | yes | its name, like "Gilding badge" |
| `looks` | yes | a few words on how it looks, shown after its name in How to play, like "gold sparkle" |
| `text` | yes | what it does, in How to play; `{n}` is the amount |
| `effect` | yes | its power (see below) |
| `amount` | no | the number the power uses (each power has a default) |
| `popup` | yes | the word shown on the board when it's used; `{n}` is the amount |
| `popup_when_nothing` | no | the word shown instead when it couldn't do anything |
| `cursed` | no | `true`: it wears a red ring and never falls on the easiest difficulty or in events (`false` if left out) |
| `weight` | yes | how often it turns up compared to the other badges; 0 switches it off |
| `colour` | yes | the colour of the glow around an amulet wearing it, like `"#ffd65a"` |

The powers (the number is the default amount):

| Power | What it does |
|---|---|
| `gild_stones` | gilds n bare stones anywhere (4) |
| `gild_around` | gilds the stones in the nine squares around it |
| `gild_wide` | gilds the stones up to n squares away on every side (2) |
| `gild_row_and_column` | gilds the stones in its row and its column, without clearing anything |
| `row_and_column` | clears its whole row and its whole column |
| `clear_around` | clears everything up to n squares away on every side (1) |
| `clear_its_kind` | clears every amulet of its own kind |
| `break_covers` | breaks one layer of every cover on the board |
| `extra_moves` | n more moves (3) |
| `give_lapis` | n lapis (3) |
| `lose_moves` | n moves lost, but never the last one (2) |
| `ungild_stones` | n gilded stones turn bare again (3) |
| `thicken_stones` | n bare stones turn thick (3) |
| `cover_amulets` | n plain amulets go under the game's first cover (2) |

The last four are meant for cursed badges.

## Covers (`content/covers/`)

A cover is something that sits atop an amulet and keeps it in place, such
as sand, water, amber, a net or ivy. A covered amulet can't be swapped,
doesn't set off its special or badge and stays where it is when the board
is shuffled. Its picture is `images/covers/<id>.svg`, drawn over the
amulet on a canvas of 192 by 192 (the amulet's square goes from 32 to
160). A cover can also have `<id>-1.svg`, `<id>-2.svg` and so on, for
when it looks different with that many layers left. The first cover (by
file name) is the one curses, omens and the `cover_amulets` badge power
use, unless they're told otherwise. Part 1, chapter 8, "A new cover",
explains all of this with a worked example.

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name, the same as its picture's name |
| `name` | yes | its name in How to play, like "Buried in sand" |
| `text` | yes | what it means, in How to play |
| `popup` | yes | shown when the player tries to move a covered amulet |
| `chamber_note` | no | the line on the card of a chamber whose floor has it (the `popup` if left out) |
| `letters` | yes | its two letters for floor plans, on bare stone and on thick stone, like `["s", "S"]`. No other cover may use them and neither may be `.` or a digit. |
| `layers` | no | how many hits it takes to break, from 1 (the default) to 9 |
| `broken_by` | no | `"beside"` (the default): a clear on it or next to it is a hit. `"on"`: only a clear of its own square is. |
| `matches` | no | `true`: the amulet under it still counts in a match where it lies; the match takes off a layer and the amulet stays. `false` (the default): it's stuck until the cover is gone. |
| `spreads` | no | `true`: after a move that broke none of it, it grows over one plain amulet next to it. `false` by default. |
| `sound` | no | the sound it makes when it breaks: `sand` (the default), `splash`, `crack`, `stone`, `gild`, `blessing`, `create` or `land` |
| `burst` | no | the two colours of the specks it bursts into, like `["#e8c98a", "#b88a48"]` |
| `amulet_on_show` | no | the amulet How to play draws under it (the first amulet if left out) |

A cover loses at most one layer in each step of clearing, however many
matches touch it at once.

## Curses (`content/curses/`)

A curse is what failing a trial costs the player, at the next stop only.
The trial's card names its curse before the player accepts it.

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name; a save that carries the curse remembers it |
| `name` | yes | its name, like "Short road" |
| `text` | yes | what it does, with `{n}` for its strength: "{n} bare stones turn thick". Leave out "at the next stop", since the game adds that itself. |
| `text_at_full_strength` | no | used instead of `text` when the strength is 100 |
| `effect` | yes | what it does (see below) |
| `strength` | yes | how strong it is on each difficulty, by the difficulties' names in `settings.jsonc`, like `{"Relaxed": 0, "Normal": 3, "Hard": 5, "Hardest": 7}`. 0 means it never happens on that difficulty; keep the easiest one at 0. At most 100. |
| `cover` | no | for the effects that cover amulets: which cover to use, by its id (the first cover if left out) |

The effects are called **hardships** and the omens use the same list:

| Hardship | What it does |
|---|---|
| `fewer_moves` | n fewer moves |
| `fewer_moves_percent` | n per cent fewer moves |
| `thick_stones` | n bare stones, chosen at random, start thick |
| `thick_stones_share` | one bare stone in n starts thick |
| `thick_edges` | n bare stones along the edge of the floor start thick |
| `buried_amulets` | n amulets start under a cover, as in a chamber |
| `covered_edges` | n amulets along the edge of the floor start under a cover |
| `fewer_badges` | badged amulets fall n per cent less often (100 means none at all) |
| `more_cursed_badges` | cursed badges fall, n times as often |
| `no_boons` | no boons can be used |

## Omens (`content/omens/`)

An omen is a hardship a player may choose to face at a stop they've
already gilded, in exchange for a bigger reward (how much bigger is
`omens.reward_percent_each` in `settings.jsonc`). It lasts for that stop
and its restarts. Saves remember omens by their id.

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name; don't change it once people play |
| `name` | yes | its name, like "Short road" |
| `text` | yes | what it does; `{n}` is the amount |
| `effect` | yes | one of the hardships above |
| `amount` | yes (but not for `no_boons`) | how strong it is, from 1 to 100 |
| `cover` | no | for the hardships that cover amulets: which cover to use |

## Relics (`content/relics/`)

A relic is a lasting reward for something the player has done. It's found
once and then kept in the Museum for good.

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name |
| `name` | yes | the relic's name |
| `description` | yes | what it is, or how it's found |
| `found_when` | yes | a condition block |
| `reward` | no | a reward |
| `icon` | no | an icon in `images/icons/relics/`, by its name. A picture `images/icons/relics/<id>.svg` (or `images/relics/<id>.png`) is used instead if there is one. |

## Events (`content/river-events/`)

An event is something that can happen between two stops. There are two
kinds: a puzzle and a choice. (The folder is called `river-events`
because the engine began as a game about a river journey.)

Every event has these settings:

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name |
| `kind` | yes | `"puzzle"` or `"choice"` |
| `title` | yes | its title on the scroll |
| `text` | yes | what happens, in a sentence or two |
| `weight` | no | how likely it is compared to the other events, from 0 to 100 (1 if left out) |

How often events happen at all is `river_event_percent` in `settings.jsonc`.

**A puzzle** is a short game on a little board of its own:

| Setting | Needed? | What it is |
|---|:---:|---|
| `goal` | yes | `{"type": "gild"}`, `{"type": "collect", "amulet": "…", "count": n}` or `{"type": "score", "points": n}` |
| `amulet_types` | yes | how many kinds of amulet fall (4 to 6) |
| `amulets` | no | which amulets. A `collect` goal needs this and the amulet to collect has to be among the first `amulet_types` of them. |
| `moves` | yes | how many moves the player gets (3 to 80) |
| `floor_plan` | yes | its board |
| `reward` | yes | what winning the puzzle gives (see "Rewards" above) |
| `by_lamplight` | no | `true` to play the board dim and small |

**A choice** offers the player a small decision:

| Setting | Needed? | What it is |
|---|:---:|---|
| `choices` | yes | a list of 1 to 5 choices, each `{label, cost?, give?, take_a_boon?, gamble?}` |

`cost` and `give` are rewards: a choice can cost gold or lapis and give
gold, lapis or a boon. `take_a_boon` trades away one of the player's
boons. `gamble` leaves the outcome to chance. It's a good idea to always
include a choice that simply lets the player carry on.

On the scroll, each choice that does something becomes a card, much like
a trial's card. Its `label` is the heading, followed by "You pay:" and
"You get:" lines made from its `cost`, `give`, `take_a_boon` and `gamble`.
So keep the `label` a short action ("Pay for the shortcut", "Join the
dance") and leave the price out of it. A choice that does nothing becomes
the way out, below the cards. A card the player can't afford stays on
the scroll, dimmed, with the reason.

## Chambers (`content/chambers/`)

A chamber is an extra place beside a stop, with a small board of its own.
It opens once that stop has been gilded (and once the "chambers" stage
has arrived on a first journey; see `settings.jsonc`). The player finds
it on the win screen, on the stop's card and as a doorway beside the stop
on the map. The goal is always to gild the floor.

Its `setting` is either `"tomb"` (the default), which is dim and lit by
torches, or `"oasis"`, which is in daylight. (These are the engine's
names; what your game calls such places is up to its `text.jsonc`.) The
two only differ in how they look and in one more thing: a tomb wakes a
little more each time the player goes back in. Cursed badges turn up,
more likely with every return and its reward for returning grows with
them (`"returning"` in `settings.jsonc`; never on the easiest difficulty
and not before curses have arrived on a first journey). An oasis stays
calm.

Its floor plan may use any cover's letters and its card explains every
cover on its floor (with the cover's `chamber_note`). Its `reward` is
paid the first time; every later visit pays its `return_reward`.

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name (saves remember explored chambers by it) |
| `at` | yes | the id of the stop it's beside; a stop can only have one chamber |
| `setting` | no | `"tomb"` (the default) or `"oasis"` |
| `scenery` | no | a picture in `images/backdrops/` to show behind the board (several chambers can share one). If left out, `images/backdrops/<id>` is used, or else the stop's own scenery. |
| `name` | yes | its name, as a title ("The small hall") |
| `text` | yes | what the place is, in two or three sentences |
| `moves` | yes | how many moves the player gets (3 to 80) |
| `floor_plan` | yes | its floor, which may use any cover's letters |
| `reward` | yes | a reward, paid the first time |
| `return_reward` | no | the gold and lapis paid on a later visit. In a tomb, this is the first return's; it grows with each return after that. If left out, it's half the gold and lapis of `reward`, or else 50 gold. |
| `amulet_types` | no | 4 to 6 (5 if left out) |
| `amulets` | no | its own list of amulets (the stop's if left out), or a list of such lists, as for a stop |

It uses the stop's amulets and music unless it has its own `amulets`. A
tomb darkens its scenery and muffles the music, as if you were hearing it
through the walls.

**Checking a chamber.** Type `node engine/tools/events-sim.js`. On a
first visit, the bot should win it between about half and nine times in
ten (50 to 90 per cent). The bot also plays each tomb as a first and a
fourth return, which should come out harder.

## The stall (`content/stall/`)

Something the stall sells: bought for one stop and used once (or kept
until it's used, for a second wind or a boon).

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name |
| `name` | yes | its name |
| `description` | yes | what it does |
| `icon` | no | a picture in `images/icons/stall/`, without the `.svg`. Something that gives one boon shows the boon's own picture if left out. |
| `currency` | yes | `gold` or `lapis` |
| `price` | yes | what it costs (it gets dearer by `stall_price_rise_percent` each time it's bought again at the same stop) |
| `gives` | yes | exactly one of the four below |

`gives` is one of: `{"moves": n}` (more moves, right now),
`{"reshuffle": true}` (a reshuffle, right now), `{"second_wind": n}`
(another try after running out of moves, kept until it's needed) or
`{"boon": [ … ]}` (a boon for the player's hand, by its id or
`"random"`).

## The Treasury (`content/treasury/`)

A lasting upgrade: bought one level at a time and kept for good.

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name |
| `name` | yes | its name |
| `description` | yes | what it does |
| `currency` | yes | `gold` or `lapis` |
| `prices` | yes | one price per level, as a list of whole numbers |
| `effect` | yes | what it changes (see below) |
| `amount_per_level` | yes | how much each level adds |

The effects are `extra_moves` (more moves at every stop), `badge_chance`
(added to how often badges fall), `trial_chance` (added to how often
trials are offered), `win_gold` and `win_lapis` (paid for every stop
won). Upgrades with the same effect add up.

## The looks: amulet sets, floor sets, frames and sparkles

A look only changes how the game looks. All four kinds have the same
basic settings, plus a few of their own. Players unlock looks by playing,
or buy the ones that have a price.

| Setting | Needed? | What it is |
|---|:---:|---|
| `id` | yes | its internal name |
| `name` | yes | its name |
| `description` | yes | what it looks like |
| `unlocked_by` | no | a condition block; `null` or leaving it out means "from the start" |
| `how_to_unlock` | no | the words on its card while it's still locked |
| `currency` | with a price | what it's bought with: `gold` or `lapis` |
| `price` | with a currency | how much it costs in Customise. With no `unlocked_by` it can only be bought; with one, it can be earned or bought, whichever comes first |

Every player starts with one look of each kind. These are the ones named
in `edition.jsonc` (`starting_looks`), or otherwise the first file of
each kind. **Never delete a starting look or change its id**, since
saves rely on them.

### Amulet sets (`content/amulet-sets/`)

The same amulet pictures, recoloured, or pictures of the set's own. Besides
the settings every look has:

| Setting | Needed? | What it is |
|---|:---:|---|
| `colour_changes` | no | the colour changes below, applied in the order you write them |
| `css_filter` | no | a ready-made CSS filter instead (a set has one or the other, not both) |
| `glow` | no | a colour for a soft glow around each amulet |
| `tint` | no | a colour laid over the amulets |
| `tint_strength` | no | how strong the tint is, from 0 to 1 (0.25 if left out) |
| `pixel_art` | no | `true`: the set's pictures are pixel art and are drawn with crisp square pixels, never smoothed |

**Pictures of its own.** A set can bring its own pictures in
`images/amulet-sets/<its id>/`, named after the amulets (`round.png`,
`square.png` and so on). They're drawn instead of the usual ones and any
amulet without one keeps its usual picture. Small pixel-art pictures (say
16 by 16) look their best with `"pixel_art": true`.

The colour changes are `hue_shift` (in degrees, from −360 to 360),
`saturation`, `brightness`, `contrast`, `sepia` and `greyscale`. Keep the
amulets easy to tell apart: shift the colours rather than taking them
away, or every amulet ends up looking the same.

### Floor sets (`content/floor-sets/`)

The squares under the amulets. The file gives the look its name,
description and unlock; its pictures can be found in the folder
`images/floors/<id>/`: `bare`, `thick` and `gilded` (or `gilded-1` to
`gilded-4`, which are mixed across a golden floor). With
`"uses_each_stops_own_stone": true`, the see-through `bare` and `thick`
pictures are laid over each stop's own `stone_colour`.

| Setting | Needed? | What it is |
|---|:---:|---|
| `uses_each_stops_own_stone` | no | `true`: the see-through `bare` and `thick` pictures are laid over each stop's own `stone_colour` |

### Frames (`content/frames/`)

The board's frame.

| Setting | Needed? | What it is |
|---|:---:|---|
| `colours` | no | `{face, shade, edge}`; `null` or leaving it out lets each stop keep its own `frame_colours` |

### Sparkles (`content/sparkles/`)

The sparks when a stone is gilded.

| Setting | Needed? | What it is |
|---|:---:|---|
| `colours` | yes | a list of exactly two colours |

## settings.jsonc

The numbers for the whole game. Every single one is optional: if you
leave one out, the game uses the default shown here. The file itself has
a comment beside each of them, too.

| Setting | Default | What it is |
|---|:---:|---|
| `stops_open_at_start` | 1 | how many stops are open before any has been won |
| `staging.learning_pace` | "one at a time" | how new players start; or "everything now" |
| `staging.seals` … `staging.curses` | 2, 3, 4, 5, 6, 8 | the stop at which each part arrives on a first journey (seals, badges, trials, the stall, events, curses) |
| `staging.omens` | "after the journey" | or a stop's number |
| `staging.extra_moves_before_badges_percent` | 50 | until badges arrive on a first journey, each stop gives this much more of its moves (since the stops are balanced with badges in play) |
| `stars.three_stars_moves_left_percent` | 30 | how many of the moves have to be left for three stars |
| `stars.two_stars_moves_left_percent` | 15 | … and for two |
| `difficulty.<Relaxed/Normal/Hard/Hardest>` | 140/100/85/72, 4/2.2/1.5/0.8, 6/9/15/0 | `moves_percent`, `badge_chance_percent` and `hint_after_seconds` (0 means no hints). The four groups, from easiest to hardest, also name the difficulties (a game that names none gets Relaxed, Normal, Hard and Hardest). Curses, conditions and `text.jsonc` use these names, while players read `difficulty_names`. Saves keep a difficulty by its place, so never rename one. |
| `river_channel.water_edge`, `.water_middle`, `.ripples`, `.reeds` | "#1d4f73", "#2f78a6", "rgba(220,240,255,.35)", "none" | the colours of the water running down an Omega board: at its banks, in the middle, its ripples and the reeds along its banks ("none" for no reeds) |
| `river_event_percent` | 30 | how often moving on to the next stop is interrupted by an event |
| `trial_offer_percent` | 35 | how often a trial is offered when a stop begins |
| `badges.most_good_badges_at_once` | 2 | how many good badges can be on the board at once |
| `omens.reward_percent_each` | 30 | extra gold and lapis for each omen braved |
| `seals.lapis_each` | 6 | lapis for each seal stamped |
| `stall_price_rise_percent` | 30 | how much dearer a stall item gets each time it's bought again at the same stop |
| `persistence.extra_moves_per_failure` | 2 | moves added for each failure in a row |
| `persistence.failures_that_count` | 3 | up to this many failures add moves |
| `persistence.boon_after_failures` | 2 | a free boon after this many failures in a row |
| `earnings.stones_per_gold` | 2 | one gold for every this many stones gilded |
| `earnings.specials_per_lapis` | 2 | one lapis for every this many specials made |
| `earnings.gold_for_winning` | 25 | gold for gilding a stop |
| `earnings.gold_per_spare_move` | 2 | plus this much for each move left over |
| `earnings.lapis_for_winning` | 1 | lapis for gilding a stop |
| `returning.badge_chance_percent` | 5 | badges on the board when the player goes back into a chamber they've explored |
| `returning.curse_multiplier` | 3 | how much likelier the cursed badges are than their weight, on the first return |
| `returning.each_return`, `.most` | 2, 12 | what each further return adds to that, up to `most` |
| `returning.reward_percent_each_return` | 50 | how much more of a chamber's `return_reward` each return pays, until the curses stop growing |
| `amulets_on_show.button`, `.how_to_play` | the first amulet | the amulet shown on the Amulets button and in the floor previews, then the one in How to play |
| `amulets_on_show.previews` | the first four amulets | four amulets to show a look with where a stop has fewer of its own |
| `sound.steady_buffer_ms` | 80 | the sound buffer used when a player turns on "Steadier sound" (Menu → Settings → Sound and music). Longer is steadier, but sounds come a little later. |

## Pictures and icons (`images/`)

Every picture is a file of its own. Part 1 of the manual (chapter 6,
"Pictures") lists the folders, the
names and the sizes. `images/favicon.svg` is the picture in the browser's
tab.

The map is the size of `images/icons/map/background.svg` (its
`viewBox`) and each stop's `map_position` is a place on it. Icons (the
folders in `images/icons/`: `dock`, `boons`, `relics`, `menu`, `codex`,
`stall`, `ui` and `map`) have to be SVG files. Keep each one's
`viewBox` and give gradients ids that no other icon uses, since the game
shares them across the whole page. A relic uses
`images/icons/relics/<its id>.svg` if there is one and otherwise the
icon named by its `"icon"`; a picture in `images/relics/` is used before
either. The build complains about a file that isn't one
`<svg viewBox="…">` drawing.

## Sounds and music (`sounds/`, `music/`)

Recordings a game brings instead of the sounds and music the engine makes
up. Both folders sit in the game's folder, next to `images/`. Both are
optional.

| File | Plays |
|---|---|
| `sounds/<name>.mp3` | instead of the made-up sound of that name (the names are in the appendix, "Sounds") |
| `music/<stop id>.mp3` | over and over at that stop, instead of the made-up music |
| `music/default.mp3` | at every stop without a piece of its own |

`.wav`, `.ogg` and `.m4a` work too. The recordings go inside the game file,
so keep them small. A name the build doesn't know is left out and the
build says so, with the name it thinks you meant.

## text.jsonc

Every word on screen, grouped by screen (`hud`, `dock`, `title`, `menu`,
`stages`, `win`, `lose`, `shop`, `stall`, `treasury`, `customise`,
`saves`, `audio`, `map`, `journey`, `trial`, `event`, `popup`, `codex`,
`conditions`, `boards`, `boons`, `omens`, `curses` and so on). The keys
on the left stay as they are; the text on the right is yours.

In the text, you can use `**bold**`, `*italic*`, `\n` for a new line,
`{name}` for something the game fills in and `{n|one|many}` for a word
that depends on a number. If the game asks for a key that the file
doesn't have, the build stops and names it.

The group `names` gives the word a name may start with
(`"article": "The "`) and how it's written in the middle of a sentence
(`"article_mid_sentence": "the "`). That way, "The small hall" reads
"Explore the small hall" and a relic reads "Find the golden key". If
you leave it out, names are always written as they are.

---

## Appendix: every name the build knows

*This appendix is written by the build (`python3 build.py --docs`) from the
names in the code, so it always matches the engine. Please don't change it
by hand: your change would be replaced the next time.*

The sections above list most of these already. This appendix puts all of
them in one place. The build checks every content file against them and if
one of them ever changes, the build's error message lists the current ones.

**Conditions** (for `found_when` and `unlocked_by`). Counted: `stars`,
`three_star_stops`, `stops_gilded`, `stops_won`, `hard_wins`,
`trials_finished`, `river_events`, `relics_found`, `suns_forged`,
`best_cascade`, `thick_stones_cracked`, `gold_earned`, `gold_held`,
`lapis_held`, `win_streak`, `journeys`, `seals_stamped`, `omens_braved` and
`chambers_explored`. About the stop just won: `win_moves_to_spare`,
`win_on_difficulty`, `win_at_stop`, `win_without_boons`, `win_on_board`,
`win_two_specials_at_once`, `win_after_failures`, `win_with_omens`,
`win_suns_forged`, `win_best_cascade` and `win_specials_made`. And `relic`,
so one relic can unlock the next.

**Trial goals:** `clear_amulets`, `make_specials`, `cascade`,
`gild_in_one_move`, `clear_in_one_move`, `moves_to_spare`, `make_suns`,
`make_bands`, `crack_thick`, `gild_half_quickly`, `no_boons` and
`combine_specials`.

**Badge powers** (`effect` in badges): `gild_stones`, `gild_around`,
`gild_wide`, `gild_row_and_column`, `row_and_column`, `clear_around`,
`clear_its_kind`, `break_covers`, `extra_moves`, `give_lapis`, `lose_moves`,
`ungild_stones`, `thicken_stones` and `cover_amulets`.

**Hardships** (`effect` in curses and omens): `fewer_moves`,
`fewer_moves_percent`, `thick_stones`, `thick_stones_share`, `thick_edges`,
`fewer_badges`, `more_cursed_badges`, `buried_amulets`, `covered_edges` and
`no_boons`.

**Boon effects:** `extra_moves`, `gild_stones`, `thin_thick_stones`,
`cord_row`, `shatter_one`, `shatter_square`, `make_banded`, `make_sun`,
`make_ringed` and `shuffle`.

**Boons** (in rewards, stall items and events): the ids of the files in
`content/boons/`, or `"random"` for one drawn at random from those with
`"random_reward": true`.

**Cover sounds:** `sand`, `splash`, `crack`, `stone`, `gild`, `blessing`,
`create` and `land`. **Cover rules:** `broken_by` is `beside` or `on`,
`layers` goes from 1 to 9, `matches` and `spreads` are `true` or `false`.

**Amulets:** every picture in `images/amulets/` is an amulet a stop can use
(except `sun`, which is a special).

**Special amulets' pictures** (in `images/specials/`): `band`, `band-glow`,
`band-arrows`, `ring`, `ring-glow`, `star-glow` and `star-points`.

**Relic icons:** any file in `images/icons/relics/` (without its ending), or
a picture `images/relics/<id>.png`.

**Music:** the instruments are `harp`, `lyre`, `oud`, `flute` and `bell`.
The scales are `hijaz`, `double harmonic`, `dorian`, `minor`, `major`,
`mixolydian`, `lydian`, `phrygian`, `major pentatonic` and `minor
pentatonic`, or a list of semitone steps of your own, like `[0, 2, 3, 5, 7,
9, 10]`.

**Sounds** (to replace with a recording in `sounds/`): `bad`, `blessing`,
`bomb`, `coins`, `crack`, `create`, `gems`, `gild`, `land`, `line`, `lose`,
`match`, `moves`, `page`, `refund`, `rollup`, `sand`, `select`, `shuffle`,
`splash`, `stone`, `sun`, `swap`, `ui`, `unroll` and `win`.

**Treasury effects:** `extra_moves`, `badge_chance`, `trial_chance`,
`win_gold` and `win_lapis`.

**Colour changes** (in amulet sets): `hue_shift`, `saturation`,
`brightness`, `contrast`, `sepia` and `greyscale`, applied in the order you
write them (`hue_shift` is in degrees).

**Currencies:** `gold` and `lapis`.

**Kinds of board** (for `win_on_board`): `classic`, `grand`, `ruins` and
`omega`.

**Difficulties** (for `win_on_difficulty`): the four `name`s in
`settings.jsonc` (`difficulty`), which are `Relaxed`, `Normal`, `Hard` and
`Hardest` unless your game names its own.

**Event goals** (`goal.type`): `gild`, `collect` and `score`.

**Floor-plan characters:** `.` for a gap, `0` for already gilded, `1` for
bare stone, `2` for thick stone and each cover's two `letters`.

**The starting looks:** those named in `edition.jsonc` (`starting_looks`),
or otherwise the first file of each kind. Every save begins with them and
relies on them, so keep their ids.
