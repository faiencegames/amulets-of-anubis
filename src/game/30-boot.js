/* =============================================================================
 * 30-boot.js  —  starting the game, last of all.
 *
 * Loads the pictures (02-pictures.js), starts the stop the player was at
 * (startLevel(), 05-state.js) and the game loop (frame(), 19-draw.js), then
 * shows the title screen. In try-out mode (#try=<id>) it goes straight to the
 * stop, river event or chamber named.
 *
 * Changes in the save: nothing.
 * ===========================================================================*/

// ---------- boot ----------
// Every picture is loaded first (02-pictures.js), then the game starts.
loadPictures().then(() => {
	const startAt = Math.min(save.current || 0, save.unlocked || 0, LEVELS.length - 1);
	startLevel(startAt);
	dockAmulet();
	requestAnimationFrame(frame);
	if (TRY) {
		document.body.classList.remove('booting');
		document.body.insertAdjacentHTML(
			'beforeend',
			'<div class="try-badge" title="A separate save for testing: your real game is not touched">Try-out mode</div>',
		);
		const ev = EVENTS.find(e => e.id === TRY_ID);
		if (ev) {
			// straight into the river event, no title screen; never before the
			// first stop, as an event sits between two
			setTimeout(() => startEvent(ev, Math.max(1, startAt)), 400);
			return;
		}
		const ch = CHAMBERS.find(c => c.id === TRY_ID);
		if (ch) {
			// straight into the chamber
			setTimeout(() => startChamber(ch, chamberFromCard()), 400);
			return;
		}
		if (TRY_ID) return; // straight onto the stop
	}
	// land on the title screen, over the board that is already loaded for the
	// player's current stop; first-timers get the help just after they continue
	setTimeout(openTitle, 350);
});
