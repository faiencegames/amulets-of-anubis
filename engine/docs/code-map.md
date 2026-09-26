# A map of the code

*This map is written by the build (`python3 build.py --docs`) from the note
at the top of every file, so it always matches the code. To change what it
says about a file, change that file's note.*

Every file of the engine starts with a note: what the file is for, the main
functions in it ("What's here") and what it changes in a player's save. This
page puts all of those notes in one place, in the order the build joins the
files. Part 2 of the manual explains how the parts work together. (A game
that carries the engine in its `engine/` folder may carry fewer of the tools.)

## The build

### `build.py`

Builds a whole game into one file: dist/<file>.html, the file named in the game's edition.jsonc, with the game's other values of its own.

```text
    python build.py          (on Windows you may need:  py build.py)
    python build.py --check  only check the content files; write nothing
    python build.py --watch  build again by itself whenever you save a file
                             (leave it running; press Ctrl+C to stop)
    python build.py --game <folder>   build the game in that folder

This is the engine's build. A game that holds the engine as its engine/
folder has a small build.py of its own that runs this one for it; the game
is the folder that holds edition.jsonc (see game_root() below). Everything
said below about content/, images/ and dist/ is in the game's folder and
about src/, web/ and tools/ in the engine's.

It also writes dist/try-it.html: double-click it to open the game in try-out
mode, with a separate save and everything unlocked, straight at the stop or
river event you changed last. (Your real save is never touched.) And, when
rsvg-convert is installed, dist/art-references/: every picture as a PNG.
To start a new thing from a ready-made file: new.sh (or new.bat) in the game.

It needs only Python 3 and the file it makes needs only a web browser.
Everything is put inside that one file: the code, the stylesheet (web/css/,
joined in file-name order, with the game's own web/css/ files replacing or
joining the engine's), the fonts, the content files in content/ and every
picture in images/ (see images/README.md):

    images/amulets/<name>.svg        an amulet (.svg, .png, .jpg or .webp)
    images/backdrops/<stop>.svg      the scenery behind a stop, by its id (harbour.svg)
    images/boards/<stop>.svg         what shows through the gaps of that stop's board
    images/floors/<set>/             a floor set: bare, thick and gilded squares
    images/specials/, images/badges/ the marks of special amulets and badges
    images/icons/                    every icon (buttons, boons, relics, menu, map)
    images/relics/<relic>.png        a picture for a relic, instead of its icon
    images/favicon.svg               the picture in the browser's tab (or .png)

The content files (stops, relics, river events, trials, shops, looks...) are
checked before anything is written. If one has a mistake, the build stops and
says which file, which line and what to do; the last good game file is left
alone.

For the simulators in tools/:  python build.py --content-json  prints the
checked content, as the game sees it and nothing else. And
python build.py --docs  writes the parts of the engine's docs that follow the
code by themselves and checks the rest (tools/reference.py).
```

## The rules and the start-up (`src/`)

### `src/00-open.js`

The player's save: loading it, bringing an older save up to date and writing it back. The first part of the game: web/shell.html wraps all of src/ except 01-core.js in one function.

```text
What's here:
  save                the player's progress, purse, looks and settings: one
                      object, kept in localStorage under the edition's
                      save_key (edition.jsonc).
                      Read and changed nearly everywhere.
  persist()           writes save back; call it after changing save
  applySaveDefaults() fills in any field an older save lacks. A new save
                      field needs its default here (13-saves.js runs it on
                      an imported save too).
  remapStops()        keeps progress with its stop when stops are added or
                      reordered in content/stops/
  EDITION             edition.jsonc: the keys the save is kept under, the
                      save code's prefix (13-saves.js)
  TRY, TRY_ID         try-out mode (#try in the address), with its own save
  PICTURES            every picture from images/, put here by the build
  applyColours(),     the colour mode and less motion, from the Settings
  applyMotion()       screen or the phone (reduceMotion is read throughout)
  deviceSetting()     a setting kept in this browser rather than the save
                      (WebGL, fewer effects)
  TAU                 a small helper used throughout

Changes in the save: fills in defaults and migrates old fields on load;
colours and motion (the Settings screen, 14-menu.js).
```

### `src/01-core.js`

The rules of the game, with no browser code at all.

```text
Everything here can be run in plain Node, which is how the simulators in
tools/ test the difficulty of every stop. Keep it that way: no document,
window, canvas or sound here. It is loaded on its own, before the rest.

The game's content (stops, amulets, trials, relics, river events, the
stall, the looks) is NOT written here: it lives in content/, which build.py
checks and pours into CONTENT below. This file holds the rules those files
plug into.

What's here:
  CONTENT, T()        everything from content/; T(key) gives the
                      words on screen (content/text.jsonc)
  LEVELS, TRIALS ...  short names for parts of CONTENT, used everywhere
  BOARD_MODES         Classic, Grand, Ruins and Omega and how each builds
                      its floor
  DIFFICULTY          the four difficulties
  helpers             the words every rule is written in: where a square
                      is (rowOf, neighbours, around, rowSquares ...), which
                      squares hold what (bareStones, plainAmulets,
                      edgeOfFloor ...), choosing (pickSome, pickOne) and
                      changing (thicken, coverAmulet, makeSpecial ...)
  COVERS              what an amulet can be held under (content/covers/)
  SPECIAL_POWERS      what the special amulets do
  BADGE_POWERS        what badges do (content/badges/ picks one each)
  HARDSHIPS           what curses and omens do (content/curses/, omens/)
  BOONS               the boons from content/boons/
  conditionMet()      whether a relic is found or a look unlocked
  Core                one game of one stop: the grid, matching, falling,
                      specials, covers, scoring; play() is one whole move
  stopOptions()       everything a stop needs to start; the game and every
                      simulator build their boards through it

Changes in the save: nothing (it never sees the save; the game passes in
what it needs).
```

### `src/02-pictures.js`

Loads every picture before the game starts.

```text
The pictures are files in images/ (see images/README.md); the build embeds
them in PICTURES (00-open.js). Nothing here draws: this only turns them into
images the canvas can paint.

What's here:
  loadPictures()      loads them all; 30-boot.js starts the game when done
  AMULET_PICS[name]   amulets, each a 128 x 128 canvas (images/amulets/)
  SPECIAL[name]       the marks of special amulets (images/specials/)
  BADGE[kind]         badges (images/badges/)
  SET_PICS[set][name] an amulet set's own pictures (images/amulet-sets/)
  COVER_PICS[name]    covers, drawn over an amulet (images/covers/) and
                      coverPicture(tile), the one for a tile's cover and
                      the layers it has left
  FLOOR_PICS[id]      {bare, thick, gilded:[...]} per floor set
                      (images/floors/)
  PIC_SIZE, makeCanvas()  the 128-pixel size and a helper that makes a canvas
                      of it (used by 04-boards.js)

Backdrops, board backings and relic pictures are used straight from
PICTURES by the code that shows them.

Changes in the save: nothing.
```

### `src/03-themes.js`

Each stop's theme, taken from its file in content/stops/.

```text
What's here:
  THEMES              one entry per stop, in the order of LEVELS:
                        floor  base colour of the bare stone
                        set    which amulets are in play
                        audio  {root, scale, inst}: the home note in Hz, the
                               scale as steps and the instrument
                      Used by the sound, the music, the board and How to
                      play.

The scenery behind a stop is a picture, images/backdrops/<stop id>.svg,
shown by setBackdrop() in src/game/05-state.js.

Changes in the save: nothing.
```

### `src/04-boards.js`

What the board is made of: the colours of its frame, the amulet sets (looks) and the floor squares.

```text
What's here:
  BOARDS              one per stop, in the order of LEVELS: the [face,
                      shade, edge] colours of the carved frame. What shows
                      through the gaps of the floor is a picture,
                      images/boards/<stop id>.
  TILE_SPRITES        the amulets in play, drawn in the chosen amulet set
  skinned()           an amulet set's pictures: the same drawings through a
                      canvas filter (content/amulet-sets/)
  FLOOR_SETS          the floor sets (content/floor-sets/, images/floors/)
  buildFloors()       makes FLOOR_STONE, FLOOR_THICK and FLOOR_GOLD, the
                      squares for the stop being played (05-state.js,
                      river events, the Treasury)
  floorTextures()     the same, for a preview, without touching the board

Changes in the save: nothing.
```

## The running game (`src/game/`)

### `src/game/01-caches.js`

The drawing caches that keep the game smooth on a phone.

```text
The floor, its shadows and the amulet pictures don't change between moves,
so they are drawn once into offscreen canvases and copied onto the board
each frame. Anything that changes the floor (core.floor) must set
bgDirty = true, or the old floor stays on screen.

What's here:
  buildBg(), bgLayer  the floor and its shadows, drawn once (19-draw.js)
  bgDirty, bgCells    "draw the whole floor again" and "draw these squares
                      again"
  scaledTiles, tileAt() the amulet pictures, scaled to the square size
  haloImg()           the glow round a chosen amulet
  RIVER_CHANNEL       the colours of the water down an Omega board
                      (content/settings.jsonc, "river_channel")
  lowFx               fewer effects: chosen in Settings, or turned on for a
                      slow phone (fewerEffects(), 19-draw.js)

Changes in the save: nothing.
```

### `src/game/02-board-pen.js`

The board drawn with WebGL, on the graphics chip.

```text
A trial (September 2026): on a phone, drawing the board with the canvas's
own calls cost more than the game's rules. GLPen understands the few
canvas calls the board uses (19-draw.js) and turns them into WebGL: every
picture goes into one big texture (an atlas), so a frame of amulets, glows
and sparks reaches the graphics chip in one or two batches instead of
hundreds of calls. Gradients, rings and text are drawn by a second small
shader. The drawing code itself doesn't change.

It is used wherever WebGL works on the graphics chip, unless the player
turned it off (Menu, Settings, "This device": the device setting "renderer"
= "2d", 00-open.js). Where WebGL is missing, fails to compile its two small programs,
or would run only in software, the board is a plain 2D canvas, as before.
Measured on three phones on 25 September 2026: about a quarter less work
for the page's main thread on the two newer ones.

What's here:
  makeBoardPen(canvas)  the board's pen (02-screen.js): GLPen or 2D
  boardPen              which it is: 'gl', '2d' (turned off) or 'none'
                        (WebGL can't be used here); the Sound screen shows it
  class GLPen           the canvas calls the board uses, in WebGL
  glColour()            a CSS colour as premultiplied numbers

A picture drawn on the board that changes afterwards (the floor layer,
bgLayer) must be marked: picture.glDirty = true (01-caches.js does).

Changes in the save: nothing (the choice is in localStorage, not the save).
```

### `src/game/02-screen.js`

The page and the board's size on it.

```text
What's here:
  $(id)               document.getElementById, used everywhere
  html`...`           HTML laid out over several lines for reading; the
                      line breaks are dropped before it reaches the page
  Tplain(), fillPlain() words from content/ as plain text, for titles and
                      labels (T() in 01-core.js gives them with bold and
                      italics)
  canvas, ctx         the board's canvas and its drawing context
  cs, dpr             the size of a square in pixels and the screen's
                      pixel density
  fit()               sizes the board to the window; runs on every resize

Changes in the save: nothing.
```

### `src/game/03-sound.js`

The sound effects, made at run time with Web Audio (or a game's own recordings, from sounds/, played instead): plucked strings, bells, gongs, flutes, crinkling paper, a rattle.

```text
What's here:
  sfx(name, n)        plays an effect ('match', 'gild', 'unroll', ...);
                      called from everywhere. When the music plays, pitched
                      effects take their notes from its chord.
  getCtx(), audioCtx  the audio engine, made on the player's first tap
  restartAudio()      starts it again, for the "Steadier sound" setting
  soundDelay()        how late this device plays sound, in milliseconds
  bell(), playInst(), note(), theme()
                      the instruments and notes, shared with 04-music.js
  prewarmKS(), prewarmBells()
                      make a stop's notes ahead of time, so a match never
                      waits for them (05-state.js, at the start of a stop)

The effects play about 6 dB above the music; keep it so (the manual,
part 2, "Sound and music").

Changes in the save: nothing (the sound settings are changed in
14-menu.js).
```

### `src/game/04-music.js`

The music: a score made as it plays, in each stop's scale and instrument (THEMES, 03-themes.js).

```text
Layers (a choir pad, a drone, plucks, an arpeggio, a pulse, a lead, bells)
come and go with how the stop is going: calm at first, busier as the moves
run out.

What's here:
  startMusic(), stopMusic()  on and off (the Menu's sound settings)
  musicVolume()       follows the volume setting
  musicStopBegins(), musicFollow(), musicCascade(), musicResolve()
                      how the game talks to the music: a stop starts, the
                      moves run down, a cascade, a win or a loss
  music               the music's state; 03-sound.js reads its chord so
                      effects play in key

Changes in the save: nothing.
```

### `src/game/05-state.js`

The stop being played: its state, starting it and the display around the board.

```text
What's here:
  core                the game of the stop now on the board (a Core,
                      01-core.js)
  busy, selected, trial, armed, particles, popups ...
                      what is going on: an animation running, the chosen
                      amulet, the trial, a boon ready to use, the effects
  startLevel(i)       starts stop i: builds its board with stopOptions(),
                      sets the scenery, the music and the trial. Called
                      from the map, a win, a loss, a new journey, the boot.
  setBoard(), paintBoardFrame(), setBackdrop()
                      the board's size, its frame, the scenery behind it
  rowsForScreen(), omegaSize()
                      how many rows fit (a taller board on a phone)
  updateHUD()         the top bar, the gilding tube and the column beside
                      the board; call it after anything they show changes
  fitNote()           the stop's note beside the board, cut to whole lines
                      with "Read on"
  settle(), delay()   wait for the board to stop moving, or for a time

Changes in the save: current (the stop being played), curse (used up),
omenPick.
```

### `src/game/06-icons.js`

The icons: SVG files in images/icons/<group>/<name>.svg, put into ICONS by the build.

```text
What's here:
  iconSvg(group, name) a whole icon, ready for the page
  iconArt(group, name) an icon's inside only, for code that wraps it in its
                      own <svg>
  --ico-gold, --ico-lapis, --ico-relic  their pictures, as CSS variables for
                      the .g-ico marks (web/css/03-hud.css)
  BOON_ICON[id]       each boon's icon (a boon's file may name another's)
  sharedDefs()        the gradients the icons share, put once in the page.
                      That is why a gradient id must be unique across all
                      the icon files.

In web/shell.html, {{svg:group/name}} puts an icon in the page.

Changes in the save: nothing.
```

### `src/game/07-trials-boons.js`

Trials, curses and boons.

```text
A trial is the extra challenge offered at the start of a stop
(content/trials/); failing one leaves a curse for the next stop
(content/curses/). Boons are one-use powers the player holds
(content/boons/); each boon's file names one of the effects in
BOON_EFFECTS.

What's here:
  offerTrial(), makeTrial()  the trial card at the start of a stop
  trialProgress(), completeTrial(), failTrial()
                      a trial as it goes (21-moves.js, 24-win-lose.js)
  curseFor(), carryCurse(), curseWords()
                      picking a curse, keeping it for the next stop and
                      saying what it does
  renderTrial(), renderBoons(), renderCurse()
                      the trial, boons and curse in the column beside the
                      board
  BOON_EFFECTS        what each kind of boon does. A new kind of boon is a
                      new entry here (the manual, part 2, "A new boon
                      effect").
  useBoon()           uses a boon, on a square if it needs one
                      (22-input.js)

Changes in the save: curse, lapis (trial rewards), trialsDone, boons
(used up).
```

### `src/game/08-relics.js`

Relics: their pictures and what happens when one is found.

```text
Relics are content files (content/relics/), each saying in "found_when"
what finds it; 09-unlocks.js checks that after every stop.

What's here:
  relicIcon(id)       a relic's picture: its own from images/relics/, else
                      the drawing its file names (images/icons/relics/),
                      else a plain gold disc. Undiscovered relics show it
                      dimmed (CSS).
  grantRelic(r)       the relic is found: pays its reward, shows a banner
                      and puts a "new" dot on the Museum

Changes in the save: relics and gold, lapis or boons from a relic's
reward.
```

### `src/game/09-unlocks.js`

What unlocks looks and finds relics and the banners that announce it.

```text
Every look (amulet set, floor, frame, sparkle) and every relic has
conditions in its content file ("need", "found_when"), checked by
conditionMet() in 01-core.js.

What's here:
  checkRelics()       finds whatever relics are now earned, then runs
                      checkLooks() for the looks (called after a win, a
                      loss, a move, a river event)
  conditionText(), lookNeedText(), needProgress()
                      what a locked look asks for, in words and how far
                      along it is (the Customise screen)
  CONDITION_NAMES, CONDITION_TEXT
                      the words for each kind of condition. A new condition
                      needs its words here and in content/text.jsonc.
  announce()          a banner at the top of the screen, one at a time
                      (new relics, looks, seals, stages)

checkLooks() also runs when Customise opens, for anything earned where no
check ran (a restored save).

Changes in the save: skins, floors, frames, sparkles (unlocked looks).
```

### `src/game/10-river-events.js`

River events and the small boards they share with tombs, temples and oases.

```text
Between stops the boat may meet something on the river
(content/river-events/): a choice, or a small puzzle board with a goal.

What's here:
  goNext(from)        sail on from a stop: maybe a river event first, then
                      the next stop (after a win, or leaving a chamber)
  startEvent(ev)      shows an event: its choice, or its puzzle
  eventChoice()       a choice as cards, each saying what it costs and gives
  setupSmallBoard()   the board of a puzzle or a chamber, 8 wide and as tall
                      as its floor plan
                      (11-chambers.js uses it too)
  eventAfterMove()    after each move on a puzzle: goal met, or out of moves
  giveReward(), rewardText(), getLine()
                      paying a reward and saying it in words ("You get:")
  eventState          the event under way, or null

Changes in the save: gold, lapis, boons, life, lastEvent; chambers and
chamberWins for chambers.
```

### `src/game/11-chambers.js`

Tombs, temples and oases: the small, dim boards beside a stop, often with amulets under covers (content/chambers/, content/covers/).

```text
A chamber's doorway opens once its stop is gilded. Tombs and temples wake
when the player goes back in (cursed badges, rising rewards); oases stay
calm. The board itself is set up by setupSmallBoard() in
10-river-events.js.

What's here:
  chamberAt(i)        the chamber beside stop i, if any
  chamberOpen()       whether its doorway is open
  startChamber()      goes in; chamberFromWin() and chamberFromCard() go in
                      from the win scroll or the stop card
  visitReward(), returnBadges()
                      what a visit pays and the badges a return wakes
  leaveChamber()      comes out, to the next stop or back to the one before
  placeKey(), placeIcon()
                      the words and picture for a tomb, temple or oasis
                      (TOMB_WORDS)
  coversNote()        the note on a chamber's card about the covers on its
                      floor (content/covers/, "chamber_note")
  midSentence(), withArticle()
                      a name as it reads inside a sentence ("the Great
                      Hall"), by the article in content/text.jsonc, "names"
                      (also for relics, in 09-unlocks.js)

Changes in the save: nothing directly (10-river-events.js records the
visits and pays the rewards).
```

### `src/game/12-stall.js`

The stall, where boons and moves are bought during a stop and the refunds that the stall and the Treasury share.

```text
What's here:
  openStall()      the stall's scroll (the stall's button in the dock, the
                   Menu); what it sells is content/stall/
  stallPrice()     what an item costs now: it rises each time the same item
                   is bought at this stop (STALL_RISE, content/settings.jsonc)
  logBuy(), undoBuy(), undoButton(), purseLine()
                   refunds: anything bought can be taken back until the
                   scroll closes. 16-treasury.js uses these too and
                   closeOverlays() (23-scrolls.js) empties the list.

Changes in the save: gold, lapis, boons, charges.
```

### `src/game/13-saves.js`

Saving to a code and back and starting a new journey.

```text
What's here:
  openSaves()         the Saves scroll (the Menu, the title screen): copy
                      the save out as a code, paste one in, or reset
                      everything
  saveCode(), readCode()
                      the save as text (the edition's export_prefix,
                      "AMULETS1:" and a code) and back;
                      an imported save goes through applySaveDefaults()
                      (00-open.js)
  openNewJourney()    starts the river again from the first stop. Relics
                      and earned looks stay; everything that buys power is
                      reset.

Changes in the save: all of it (importing, resetting, a new journey).
```

### `src/game/14-menu.js`

The Menu and the settings it opens.

```text
What's here:
  openMenu()          the Menu: eight tiles in two rows (the map, How to
                      play, the Treasury, Customise, the Museum, sound,
                      difficulty and the stall or Learning pace) and the
                      ways out of the game small at the foot
  openSettings()      Settings: sound and music, vibration, colours,
                      motion and effects, this device; five tiles, each
                      opening its part (settingsSound() and the rest)
  openDifficulty()    difficulty, board shape and "fill the screen"; a
                      change restarts the stop
  MENU_ICONS          the Menu's icons (images/icons/menu/)

Changes in the save: the settings: sound, music, musicVol, sfxVol,
harmonise, steadySound, vibrate, vibrateChosen, colours, motion,
difficulty, board, fill.
```

### `src/game/15-title.js`

The title screen.

```text
Its own layer (#ovTitle) over the scenery of the stop the player is at,
with the rest of the game hidden (body.at-title). Shown on every launch
and from the Menu.

What's here:
  openTitle()         the title screen: Continue and the smaller ways in
                      (How to play, sound, saves, a new journey)

Changes in the save: nothing.
```

### `src/game/16-treasury.js`

The Treasury and putting on a look.

```text
What's here:
  openTreasury()      the Treasury: lasting upgrades bought with gold and
                      lapis (content/treasury/); purchases can be taken
                      back until it closes (logBuy(), 12-stall.js)
  levelSquares()      an upgrade's level as gold squares
  applyLook()         puts on an amulet set, floor, frame or sparkle and
                      redraws the board. Always go through this: it also
                      empties the amulet picture cache.
  dockAmulet()        the Amulets button's picture: an amulet in the
                      amulet set in use (applyLook() and 30-boot.js)
  skinPreview(), floorPreview(), cachedPreview()
                      the small pictures of each look, drawn once and kept
                      (the Customise screen uses them)

Changes in the save: upg (upgrades bought), gold or lapis.
```

### `src/game/17-museum.js`

The Museum: the relics found so far and the ones still to find, with what each was and what finds it.

```text
What's here:
  openMuseum()        the Museum scroll (the Menu, the relics beside the
                      board)
  museumSquares()      a bare and a gilded square of the floor in use, as
                      pictures (the Museum and the relic strip beside the
                      board, 05-state.js)

Changes in the save: nothing.
```

### `src/game/18-customise.js`

Customise: where the player dresses the game. One tab each for amulet sets, floors, the frame round the board and the sparkles.

```text
What's here:
  openCustomise()     the Customise scroll (the dock, the Menu); locked
                      looks show what unlocks them (09-unlocks.js), and a
                      look for sale its price: a tap buys it, and it can
                      be taken back until the scroll closes (logBuy(),
                      12-stall.js)
  framePreview(), sparklePreview()
                      the small pictures of frames and sparkles
  warmPreviews()      draws the previews in idle moments, so the screen
                      opens quickly (05-state.js starts it)

Choosing a look calls applyLook() (16-treasury.js).

Changes in the save: skin, floor, frame, sparkle (the looks being worn);
skins, floors, frames, sparkles, gold and lapis when a look is bought.
```

### `src/game/19-draw.js`

The game loop: moving things and drawing the board every frame.

```text
What's here:
  frame()             runs every frame (30-boot.js starts it): update(),
                      then draw(). Frames slow down when nothing moves
                      (idleWanted()), to save the battery.
  update()            moves falling and swapping amulets and the effects
  draw()              paints the board: the cached floor (01-caches.js),
                      the amulets, badges, effects and popups
  drawTile()          one amulet, with the mark of a special (How to play
                      uses it too)
  fewerEffects(),     fewer effects: the Settings choice and the careful
  setEffects(),       automatic that watches cascades on a slow phone
  watchEffects()

Don't make gradients or shadows here per square per frame: cache them
(the manual, part 2, "Performance").

Changes in the save: nothing (fewer effects is kept in this browser).
```

### `src/game/20-effects.js`

Small effects: sparks and vibration.

```text
What's here:
  burst(x, y, n)      a burst of sparks at a square, in the chosen sparkle
                      colour (fewer with reduced motion or on a slow device)
  vibrate(ms)         a short buzz on a phone, if the player turned it on

Changes in the save: nothing.
```

### `src/game/21-moves.js`

Playing a move: the swap, the matches, the cascade that follows and what they earn.

```text
What's here:
  attemptSwap(a, b)   swaps two amulets (22-input.js); if they match, runs
                      cascade(), else swaps them back
  cascade()           clear, score, fall and refill, again and again until
                      the board is still; then checks the trial, the river
                      event, the win and the loss
  showClear()         what one clearing earns: gold, lapis, sparks and
                      sounds (the numbers are EARN, content/settings.jsonc)
  BADGE_SHOWS         how each badge power shows on the board when it fires
                      (the powers are BADGE_POWERS, 01-core.js)

Changes in the save: gold, lapis (and what they count towards: goldEarned,
lapisEarned, goldBits, lapisBits), suns, thickCracked, bestCascade.
```

### `src/game/22-input.js`

The player's hands on the board: tapping, dragging and the keyboard.

```text
What's here:
  cellAt(e)           the square under the finger or the mouse
  the pointer events  tap two amulets, or drag one onto its neighbour,
                      to swap them (attemptSwap(), 21-moves.js); with a
                      boon ready, a tap uses it (useBoon(),
                      07-trials-boons.js)
  the keyboard        arrows move a cursor, Enter or Space picks, Escape
                      lets go

Changes in the save: nothing.
```

### `src/game/23-scrolls.js`

Scrolls: every screen that opens over the board (the overlays in web/shell.html).

```text
What's here:
  showMsg(body, actions, opts)
                      the general scroll: words and buttons for what to
                      do next. Each action is [label, fn, {kind: 'go' |
                      'card' | 'quiet' | 'exit', sub, icon, dark, oasis,
                      short}]: one big "go" button for the usual next step
                      (the manual, part 2, "Scrolls"). opts.noClose hides
                      the ×; opts.onClose says what closing means.
  exitButton()        the full-width way out, with its ×
  openOverlay(id), closeOverlays()
                      open one screen, or close them all. Closing also
                      ends the chance to take back purchases (shopLog).
  anyOverlayOpen()    whether a screen is open over the board
  androidBack()       Back, in the app and the browser (popstate): closes
                      the open scroll; on the board it asks before leaving
  body.no-keys        until a key is pressed (and after a tap), no focus
                      rings

Changes in the save: nothing.
```

### `src/game/24-win-lose.js`

Winning and losing a stop.

```text
What's here:
  levelWon()          the stop is gilded: stars, rewards, seals, the trial,
                      unlocks and the win scroll with the way on (the next
                      stop, a doorway, the map)
  levelLost()         out of moves: the lose scroll; when the floor was
                      nearly gilded, more moves to buy (the stall's "Three
                      more breaths")
  showBoardEnd()      the plaque on a won or lost board, when its scroll
                      was left by the map; from closeOverlays()

Both are called from cascade() (21-moves.js) when the board is still.

Changes in the save: stars, unlocked (the furthest stop), wins, streak,
fails, lastWin, life, met, omens, gold, lapis, goldEarned, lapisEarned,
boons, charges.
```

### `src/game/25-codex.js`

How to play, a book in chapters.

```text
What's here:
  openHelp(chapter)   opens it: on a wide screen the chapters run down the
                      margin, on a narrow one (CODEX_NARROW) it opens on a
                      contents page and turns like pages
  CODEX_GROUPS        the chapters, in two groups (on the board, on the
                      journey), each with a picture in
                      images/icons/codex/. The website reads this list too.
  CODEX_STAGE         the stage a chapter waits for on a first journey
                      (26-stages.js)

The chapters' words are in content/text.jsonc ("codex"); the amulets'
names and meanings come from content/amulets/.

Changes in the save: seenHelp.
```

### `src/game/26-stages.js`

Staging: on a first journey the game's parts arrive one at a time and "new" dots.

```text
What's here:
  STAGES              each part (trials, boons, the stall, badges, curses,
                      chambers, ...): the stop it arrives at is in
                      content/settings.jsonc ("staging"), its banner in
                      content/text.jsonc
  stageOn(name)       whether a part is on yet; check it before showing
                      anything that belongs to one
  meetStages()        banners for anything newly on (at the start of every
                      stop)
  markNew(), clearNew(), isNew()
                      "new" dots on the dock and the Menu, until that
                      screen is opened
  openPace()          Menu → Learning pace: everything on at once, or back
                      to one at a time

Changes in the save: staged, met, fresh.
```

### `src/game/27-seals.js`

Seals: three challenges at each stop (content/stops/, "seals"), each stamped the first time a win meets it and worth lapis.

```text
What's here:
  stampSeals()        after a win, stamps any seals newly met
                      (24-win-lose.js)
  sealsOf(i), sealsLine()
                      a stop's seals and how they show on the win scroll
  mark(), marks(), doorMark(), gildBar(), journeyRiver()
                      seals, omens and a doorway as small pictures (the
                      stop card's tiles)
  SEAL_LAPIS          what a seal is worth

Changes in the save: seals, lapis.
```

### `src/game/28-map.js`

The map of the journey, the stop card and the Amulets scroll.

```text
What's here:
  openMap()           the map: the river with every stop and a list under
                      it with each stop's stars and what else is there
  MAP_SIZE            the map's width and height: its picture's viewBox
                      (images/icons/map/background.svg)
  openStop(i)         the stop card: tiles for its seals, omens and
                      doorway, one open at a time; the big button follows
                      the open tile (onto the stop, or into the doorway)
  showAmulets(), amuletList()
                      the Amulets scroll: the amulets on the board and what
                      each meant

Changes in the save: omenPick (the omens chosen for the next go at a
stop).
```

### `src/game/29-buttons.js`

What the buttons around the board do: the dock (map, hints, restart, the shops, How to play, the Menu) and the note beside the board. Each only opens the screen that another file makes.

```text
What's here:
  the click handlers  $('btnMap').onclick and the rest
  syncInfoOpen()      the note beside the board starts open on a wide
                      screen

Changes in the save: nothing.
```

### `src/game/30-boot.js`

Starting the game, last of all.

```text
Loads the pictures (02-pictures.js), starts the stop the player was at
(startLevel(), 05-state.js) and the game loop (frame(), 19-draw.js), then
shows the title screen. In try-out mode (#try=<id>) it goes straight to the
stop, river event or chamber named.

Changes in the save: nothing.
```

## The stylesheet (`web/css/`)

### `web/css/00-colours.css`

Every colour and texture of the interface, by name and the four colour modes.

```text
 This is the engine's own look: plain paper, grey stone and a little gold,
 with no texture, so a game that brings no look of its own still reads
 well. A game gives itself its own look with a 00-colours.css of its own in
 its web/css/, which takes the place of this file (the manual, part 2, "The
 stylesheet"); it must set every name set here.

 The rest of the stylesheet names these colours (var(--ink), var(--bevel-hi))
 and never writes one out, except for what looks the same in every mode:
 gold and sand (metal is metal), shadows, water, the title screen (always
 by night) and anything drawn on the board. So a mode is one short list
 here. The Settings screen chooses the mode (applyColours(),
 src/00-open.js), as data-colours on <html>: none for the game's own look,
 'dark', 'hcl' (high contrast, light) or 'hcd' (high contrast, dark).
```

### `web/css/01-base.css`

Fonts and the page itself: the fonts' names, the reset, the body background and the scenery layer behind everything. (The page's colours, --page and the rest, are in 00-colours.css.)

### `web/css/02-layout.css`

The app shell: a fixed grid that never scrolls and the carved stone strips.

### `web/css/03-hud.css`

The top bar: title, gauges (moves, gold, lapis, relics, score, stop).

### `web/css/04-board.css`

The stage and the board: layer promotion, the Omega layout, the side tablet, the board frame and canvas and the gilding tube.

### `web/css/05-dock.css`

The buttons along the bottom (map, hint, restart, shops, help, menu).

### `web/css/06-scroll-and-buttons.css`

Paper scrolls, the stats tablet and the stone buttons.

### `web/css/07-side-panel.css`

The side panel beside the board: trial and boon rows, place notes, relic strip.

### `web/css/08-shops-and-looks.css`

Board size picker, toggles, the Treasury and stall rows and the Customise cards.

### `web/css/09-codex-and-sound.css`

How to play (its index, contents and chapters), the tabs of Customise and the sound and music screen.

### `web/css/10-screens.css`

The close button, New journey, the menu, the title screen and difficulty.

### `web/css/11-journey.css`

Seals and omens, Learning pace and "The game grows as you travel".

### `web/css/12-notices.css`

Telling the player about new things: unlock banners, staging (hidden until met), "new" dots and the try-out badge.

### `web/css/13-overlays.css`

Overlays (every scroll screen), help lists, the Basics legend and the map.

### `web/css/20-small-screens.css`

Phones and short windows. Kept last on purpose: these rules override the ones above for narrow and short screens.

## The tools (`tools/`)

### `tools/art-export.py`

Exports the game's pictures for editing in other programs, into dist/art-export/:

```text
    python3 tools/art-export.py

  pdf/       every SVG as a vector PDF (Affinity, Illustrator, Pixelmator,
             Preview): the shapes stay shapes, the gradients gradients.
  pixel/     the small pictures (amulets, specials, badges, icons) as pixel
             art at 32 and 64 pixels: few colours, hard edges, no blur. A
             starting point for a pixel-art look, not a finished one.
  aseprite/  the same pixel art as Aseprite files (.aseprite), one per
             folder, each picture a frame, named by a tag; LibreSprite and
             Pixelorama open them too.
  sheets/    each folder of small pictures as one sprite sheet (PNG, 128 px a
             picture) with a JSON map in Aseprite's own format, which game
             engines (Godot, Unity, Phaser) and TexturePacker read.

The originals stay the SVGs in images/: those are what the game uses and
what Inkscape, Affinity and Illustrator edit best. The larger PNGs are in
dist/art-references/ (tools/art-references.py, run by the build).

Needs rsvg-convert (brew install librsvg) and ImageMagick (brew install
imagemagick). Nothing here is used by the game or the build.
```

### `tools/art-references.py`

Turns every picture in images/ into a PNG in dist/art-references/, in the same folders (amulets/, backdrops/, icons/boons/, floors/<set>/, ...), for showing the game's art to people and tools that can't read SVG.

```text
    python3 tools/art-references.py [the game's folder]

build.py runs it after every build. It needs rsvg-convert (librsvg:
`brew install librsvg`, or `apt install librsvg2-bin`); without it, it says
so and does nothing and the game builds as before. Only pictures changed
since their PNG was made are drawn again, so it is quick after the first time.
The prints (JPEG) are converted with ImageMagick or macOS's sips, whichever
is there.

The size is the longest side, per folder: small things large enough to look
at closely, scenery large enough to see its detail.
```

### `tools/econ-sim.js`

Economy sweep: plays whole journeys with the greedy bot and tracks what a player earns and unlocks, with the game's own formulas. The bot never spends, never replays for stars or seals and never braves omens, so it shows the pace of a straight playthrough. Usage: node tools/econ-sim.js <cols> <rows> <journeys> <difficulty 0-3> node tools/econ-sim.js 8 13 4 1

### `tools/events-sim.js`

Can a greedy bot finish each puzzle event? (people should do better)

### `tools/journey-sim.js`

A first journey, as a new player meets it: the parts of the game arrive at the stops settings.jsonc says (badges, cursed badges...), a lost stop is tried again with the persistence moves and every board is built by stopOptions() in 01-core.js, exactly as the game builds it. It reports, for each stop, how often the first try wins and how many tries it takes, on the board sizes players see: 8 x 8 (a desktop window) and 8 x 13 (a phone).

```text
    node tools/journey-sim.js                 Normal, 40 journeys per board size
    node tools/journey-sim.js 1 80            difficulty (0-3), journeys
    node tools/journey-sim.js 1 40 later      a later journey: everything on

The bot is greedy: it takes the move that gilds most, never plans and never
spends a boon, so a person should do somewhat better. Aim, on Normal, for a
first try that wins about 70-80% of the time early on and 60-70% late.
```

### `tools/load-core.js`

Loads src/01-core.js into Node for the simulators, with the game's content (the files in content/) filled in, exactly as the build does it. Usage:  const K = require('./load-core')(['LEVELS','Core', ...]);

### `tools/reference.py`

The docs that follow the code by themselves. The build runs this with

```text
    python3 build.py --docs

and it does three things:

  1. It rewrites the appendix of docs/content-reference.md ("every name the
     build knows") from the names in the code and the build, so that list is
     never out of date.
  2. It checks the rest of the reference, which is written by hand: every
     setting of every kind of content file has a row in its table, no row
     names a setting that doesn't exist, "yes" and "no" in the Needed column
     agree with what the build really insists on and the tables of boon
     effects, badge powers, hardships and conditions list exactly what the
     code knows.
  3. It writes docs/code-map.md, a map of the code, from the note at the top
     of every file.

It prints what doesn't agree and exits with 1 if anything doesn't, so the
reference can't quietly fall behind. An ordinary build of the example game
runs the checks too (without writing anything) and lists what it finds under
"Things to check".

The docs are the engine's (docs/ beside build.py), not the game's.
```

### `tools/rules-test.js`

The rules' own test: every helper, every kind of cover, every badge power and every hardship in src/01-core.js, each tried on a small board of its own and checked. Run it after changing the rules:

```text
    node tools/rules-test.js                   with the game the build would build
    node tools/rules-test.js --game <folder>   with another game

It needs a game with at least one cover (the example has five). It also
checks that every badge power has a way to show itself in the game
(BADGE_SHOWS in src/game/21-moves.js). Nothing here is random in a way
that matters: where a rule picks at random, the test checks what any pick
must satisfy.
```

### `tools/screenshots/check-looks.mjs`

Checks that every amulet set stays easy to tell apart in every look.

```text
    python3 build.py           # not needed: this reads the content itself
    node check-looks.mjs       # a report and dist/looks-check.png

For every look (content/amulet-sets/) it draws each amulet the way the game
does (skinned() in 04-boards.js: the same canvas filter, glow and tint) and
takes its average colour in Lab, the colour space in which distances match
what the eye sees. Then, for every set of every stop, tomb, temple and oasis,
it measures how far apart each pair of amulets is (ΔE). Two amulets whose
colours come closer than CLOSE can only be told apart by their shape.
The report lists, per look, how many pairs are too close and the worst ones;
looks-check.png shows each look's worst set so they can be judged by eye.
```

### `tools/screenshots/edge.mjs`

Edge cases: plays the built game down the awkward paths a player finds by accident (losing and leaving the scroll another way, winning and coming back, tapping during an animation, turning the phone, a broken save) and reports every dead end: no scroll open and a board that can't be played, or a scroll you can't get out of. Also any page error.

```text
    node tools/screenshots/edge.mjs            every case
    node tools/screenshots/edge.mjs lose win   just those (names below)

It plays a copy of the game (dist/edge/game.html) with a small window onto
the board added (window.__edge), so it can run the moves out or gild the
floor at once. The game itself is never changed. Build first.
```

### `tools/screenshots/pdf.mjs`

Prints an HTML file to a PDF with Chromium, for the manual:

```text
    node tools/screenshots/pdf.mjs dist/website/manual-print.html dist/website/manual.pdf [title] [A4|A5]

A4 (or A5), backgrounds printed, the page number at the foot of every page. The
page's own stylesheet sets the margins (@page). Development
only, like the screenshots: the game never needs it.
```

### `tools/screenshots/smoke.mjs`

A quick play-through of the built game, to catch a page error before a player does. Run it after any change to the code:

```text
    python3 build.py
    node tools/screenshots/smoke.mjs

It starts a new player and a player part-way down the river, on a desktop
and on a phone. On each it makes moves with the keyboard, taps the hint and
opens every screen from the dock and the menu. It prints what it did and
fails (exit code 1) if the page logs a single error. It does not judge how
anything looks: take.mjs and the pictures in docs/images/ do that.

On a Mac the browser uses the real graphics chip (ANGLE on Metal), so the
board is drawn with WebGL as on a phone (src/game/02-board-pen.js); one
more run uses a browser without it, for the plain canvas the game falls
back to.
```

### `tools/sim.js`

Balance harness: plays every stop the way the game does (random shape from the stop's pool), on a given board size, with everything on (as on a second journey) and reports win rates. The board is built by stopOptions() in 01-core.js, the same function the game uses. For a first journey, as a new player meets it, see journey-sim.js.

### `tools/where.mjs`

Where the engine is, where the game it builds is and that game's values from edition.jsonc, for the browser tools. The rule is the one in tools/where.py and build.py: the game is the folder that holds edition.jsonc (TESSERA_GAME if set; else the folder above the engine when it sits inside a game as engine/; else the engine's own folder; else its example/ game).

### `tools/where.py`

Where the engine is and where the game it builds is, for the Python tools (build.py has the same rule written into it).

```text
The game is the folder that holds edition.jsonc:
  - the folder named in TESSERA_GAME, if set;
  - else the folder above the engine, when the engine sits inside a game
    as its engine/ folder;
  - else the engine's own folder, if it holds an edition.jsonc;
  - else the engine's example/ game, when the engine stands alone.
```
