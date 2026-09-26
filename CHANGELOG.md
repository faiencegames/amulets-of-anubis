# Changelog

What changed in each version of Amulets of Anubis, newest first. The GitHub
Release for each version shows its part of this file.

## 0.9.6 (26 September 2026)

### Better

- **Naqada pots** are painted in each amulet's own colour instead of five
  earth colours, so amulets that looked alike (the cat and the blue crown)
  are easy to tell apart.

### Behind the scenes

- The Android app's small bit of Java is shrunk with R8, as F-Droid's
  reviewers asked.

## 0.9.5 (26 September 2026)

### New

- **Four new amulet sets** with every amulet drawn anew: engraved plates,
  Naqada pots, Djoser's tiles and cloisonné. Naqada pots is yours from the
  start and the others are earned with stars, river events and stops won.

### Fixed

- **A stuck board** that had to be filled anew could lose its sand and
  water: the covered amulets came back uncovered. Now they keep their
  covers.

### Better

- **Undo** in the shops is sandstone like every other button, with an arrow.
- **The words**: the stop notes, tombs, river events and a few buttons read
  more smoothly, with a handful of sentences written anew.
- **The manual** is written anew for beginners, step by step, with every
  bit of code explained. Its second part and the content reference now come
  with the engine and the build checks them against it, so they can't fall
  out of date. The website's manual shows code inside numbered steps
  properly.

### Behind the scenes

- The engine can now sell looks in Customise and play recorded sounds and
  music instead of the ones it makes up. The game doesn't use either yet.
- The Android app is built so that F-Droid can check that its copy is
  exactly the one on GitHub.
- The build's messages are plainer when a content file has a mistake.

## 0.9.4 (25 September 2026)

### Fixed

- **Beginning a new journey** from the Menu left the first stop empty until
  the game was opened again. The new journey now starts at once.

### Behind the scenes

- The game's rules and code now live in a folder of their own, apart from
  its words, pictures and colours, so they can be kept and tested on their
  own. Nothing plays or looks different: the same moves give the same
  results as before, and the screens match the old ones.

## 0.9.3 (25 September 2026)

### New

- **Settings**, in place of the Sound tile in the Menu, in five parts: sound
  and music, vibration, colours, motion and effects, and this device.
- **Four colour modes**: the game's own, dark, high contrast light and high
  contrast dark, or following the phone. Every button, bar and scroll
  follows; the amulets, floors and scenery keep their colours.
- **Motion**: as the phone asks, less, or full. **Effects**: automatic, full
  or fewer. Automatic only ever turns them down on an older phone that keeps
  struggling.
- **The board is drawn with the graphics chip** (WebGL), with the plain canvas
  as a fallback. A quarter less work for the page on most phones.
- **Six new relics**, 46 in all. The museum is a floor to gild, a square for
  each relic, and the relics beside the board stand on a strip of it.
- **Pictures instead of counts**: wax seals, Apep for omens braved, a sealed
  door for places explored, gold squares for relics, stars on the title
  screen.
- **A new Nile map**, and Egyptian icons for the Menu and the buttons.
- **Stop notes, river events and tombs told anew**, as a traveller's journal.
- **The difficulty screen shows each board**, as a small picture of its real
  floor plan.
- **A plaque on a finished board**, with the stars earned and the one way on.
- **The phone's plaque fills with sand** as the floor is gilded, a grain for
  each stone.
- A new curse, Drifting sand. The title screen quotes Herodotus.

### Better

- **Phones run edge to edge**, round the notch and into the rounded corners.
  The boons sit above the buttons.
- **Small phones** (360 × 780) fit the Menu, the difficulty screen and
  Settings without scrolling, and every button is a finger wide.
- **Smoother**: a still board redraws 30 times a second instead of 90, and a
  whole screen's layer is gone. Measured on three phones.
- Clearer trial cards; the curse badges are solid shapes; a tomb's or
  oasis's board is as tall as its floor plan.
- Back on Android and in a browser asks before leaving the game.

### Fixed

- A win could be paid twice by leaving through the map and coming back.
- A finished board could be left with no way on.
- The low-moves warning glowed as dark boxes round its words.
- Small things found by playing every screen in every mode.

## 0.9.2 (24 September 2026)

### New

- **A title screen**: the stop's scenery behind the name, one big Continue,
  and sound in the corner.
- **How to play is a book**: chapters with pictures down the margin, or on a
  phone a contents page and pages to turn.
- **The manual**, in two parts: making things, for everyone, and the engine,
  for programmers. On the website too, with search, and as a PDF.

### Better

- **Scrolls with one way forward**: one big button for the usual next step, a
  torchlit one into a tomb, a blue one into an oasis, and the rest small.
- A stop's card shows its seals, omens and doorway as tiles, one open at a
  time.
- The Menu is eight tiles, each with a word of how things stand.
- The gilding tube fills with sand.
- The note beside the board shows whole lines, with "Read on".

### Fixed

- The board no longer flashes up before the title screen.
- The rods of a long scroll no longer get squeezed thin.

## 0.9.1 (24 September 2026)

- **Apps to download** for Windows, macOS (Apple silicon and Intel), Linux
  (x64 and arm64) and Android, alongside the single HTML file. They are
  called Amulets of Anubis and show their version.

## 0.9.0 (24 September 2026)

- **The first public release.** All twelve stops down the Nile, with their
  tombs, temples and oases, playable from start to finish. Version 1.0 will
  follow once the game has been played through on real phones and by a few
  more people.
