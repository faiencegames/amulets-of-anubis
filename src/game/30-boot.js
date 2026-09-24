// ---------- boot ----------
// Every picture is loaded first (02-pictures.js), then the game starts.
loadPictures().then(() => {
	const startAt = Math.min(save.current || 0, save.unlocked || 0, LEVELS.length - 1);
	startLevel(startAt);
	requestAnimationFrame(frame);
	if (TRY) {
		document.body.insertAdjacentHTML(
			'beforeend',
			'<div class="try-badge" title="A separate save for testing: your real game is not touched">Try-out mode</div>'
		);
		const ev = EVENTS.find(e => e.id === TRY_ID);
		if (ev) {
			setTimeout(() => startEvent(ev, Math.max(1, startAt)), 400);
			return;
		}
		const ch = CHAMBERS.find(c => c.id === TRY_ID);
		if (ch) {
			setTimeout(() => startChamber(ch, chamberFromCard()), 400);
			return;
		} // straight into the chamber   // never before the first stop: an event sits between two   // straight into the river event, no title screen
		if (TRY_ID) return; // straight onto the stop
	}
	// land on the title screen, over the board that is already loaded for the
	// player's current stop; first-timers get the help just after they continue
	setTimeout(openTitle, 350);
});
})();
