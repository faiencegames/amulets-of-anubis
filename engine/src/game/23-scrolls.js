/* =============================================================================
 * 23-scrolls.js  —  scrolls: every screen that opens over the board (the
 * overlays in web/shell.html).
 *
 * What's here:
 *   showMsg(body, actions, opts)
 *                       the general scroll: words, and buttons for what to
 *                       do next. Each action is [label, fn, {kind: 'go' |
 *                       'card' | 'quiet' | 'exit', sub, icon, dark, oasis,
 *                       short}]: one big "go" button for the usual next step
 *                       (the manual, part 2, "Scrolls"). opts.noClose hides
 *                       the ×; opts.onClose says what closing means.
 *   exitButton()        the full-width way out, with its ×
 *   openOverlay(id), closeOverlays()
 *                       open one screen, or close them all. Closing also
 *                       ends the chance to take back purchases (shopLog).
 *   anyOverlayOpen()    whether a screen is open over the board
 *   androidBack()       Back, in the app and the browser (popstate): closes
 *                       the open scroll; on the board it asks before leaving
 *   body.no-keys        until a key is pressed (and after a tap), no focus
 *                       rings
 *
 * Changes in the save: nothing.
 * ===========================================================================*/

// ---------- overlays ----------
const starSvg = on => iconSvg('ui', on ? 'star-on' : 'star-off', 'aria-hidden="true"'); // images/icons/ui/star-on.svg, star-off.svg
function anyOverlayOpen() {
	return document.querySelector('.overlay.open');
}

let lastFocus = null;
let msgOnClose = null; // what the close button does for the scroll now showing (default: just close)
let lastRollup = 0;
function openOverlay(id) {
	if (!$(id).classList.contains('open') && !document.querySelector('.overlay.open'))
		sfx(performance.now() - lastRollup < 200 ? 'page' : 'unroll');
	const sc = $(id).querySelector('.scroll');
	if (sc) sc.classList.remove('wide');
	$(id).dataset.noclose = '';
	msgOnClose = null;
	musicDuck(true);
	lastFocus = document.activeElement;
	$(id).classList.add('open');
	const b = $(id).querySelector('button, [tabindex="0"]');
	if (b) setTimeout(() => b.focus(), 30);
}

function closeOverlays() {
	if (document.querySelector('.overlay.open')) {
		lastRollup = performance.now();
		setTimeout(() => {
			if (!document.querySelector('.overlay.open')) sfx('rollup');
		}, 60);
	}
	shopLog = [];
	musicDuck(false);
	document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
	document.body.classList.remove('at-title');
	idleTimer = 0;
	lastFocus && lastFocus.focus ? lastFocus.focus() : canvas.focus();
	setTimeout(showBoardEnd, 0); // after whatever the button does next
}

// opts.noClose: a scroll that needs a choice (victory, defeat) has no close button
// opts.onClose: what closing means, when it isn't simply "back to the board"
// Each action is [label, what it does] and may add a third part saying how it
// looks, so a scroll has one clear way forward and the rest stay quiet:
//	{ kind: 'go', sub, icon }   the usual next step: one big gold button, with a line under it
//	{ kind: 'card', sub, icon } another way to go, as a smaller button with a line under it;
//	                            either may have short words (short) for a phone, where
//	                            what it names is already said beside it
//	dark: true (and oasis: true) colours either as the way into a tomb (or an oasis); hidden: true starts it hidden
//	{ kind: 'quiet', icon }     the rest (the map, replaying): small, in a row at the foot;
//	                            a single one beside a lone big button shares its line,
//	                            with its short words (short) on a phone
//	{ kind: 'exit' }            a way out that changes nothing ("No trial today",
//	                            "Back to the board"): full width at the foot, after an ×
// An action with none of these is an ordinary button, as before.
function actionHtml(a, i) {
	const o = a[2] || {},
		ico = o.icon ? `<span class="act-ico" aria-hidden="true">${o.icon}</span>` : '',
		sub = o.sub ? `<small>${o.sub}</small>` : '',
		words = o.short
			? `<span class="act-long">${a[0]}</span><span class="act-short">${o.short}</span>`
			: a[0];
	if (o.kind === 'go' || o.kind === 'card')
		return html`
			<button class="act-${o.kind}${o.dark ? ' dark' : ''}${o.oasis ? ' oasis' : ''}" data-i="${i}"${o.hidden ? ' hidden' : ''}>
				${ico}
				<span class="act-words">${words}${sub}</span>
				<span class="act-arrow" aria-hidden="true">\u203a</span>
			</button>`;
	if (o.kind === 'exit') return exitButton(a[0], `data-i="${i}"`);
	if (o.kind === 'quiet') {
		return `<button class="act-quiet" data-i="${i}">${ico}${words}</button>`;
	}
	return `<button class="btn" data-i="${i}">${a[0]}</button>`;
}

// the way out of a scroll, also used outside showMsg (the map's)
function exitButton(words, attrs) {
	return `<button class="act-exit" ${attrs}><span class="act-x" aria-hidden="true">\u00d7</span>${words}</button>`;
}

function showMsg(body, actions, opts = {}) {
	const kind = a => (a[2] || {}).kind;
	let main = actions.map((a, i) => [a, i]).filter(([a]) => kind(a) !== 'quiet' && kind(a) !== 'exit'),
		quiet = actions.map((a, i) => [a, i]).filter(([a]) => kind(a) === 'quiet'),
		exits = actions.map((a, i) => [a, i]).filter(([a]) => kind(a) === 'exit');
	// one big button and one way back: side by side, as one line
	const paired =
		main.length === 1 && kind(main[0][0]) === 'go' && !main[0][0][2].hidden && quiet.length === 1;
	if (paired) [main, quiet] = [main.concat(quiet), []];
	$('msgBody').innerHTML =
		body +
		(main.length
			? `<div class="actions${paired ? ' paired' : actions.some(kind) ? ' stacked' : ''}">` +
				main.map(([a, i]) => actionHtml(a, i)).join('') +
				'</div>'
			: '') +
		(quiet.length
			? `<div class="actions-quiet">${quiet.map(([a, i]) => actionHtml(a, i)).join('')}</div>`
			: '') +
		exits.map(([a, i]) => actionHtml(a, i)).join('');
	$('msgBody')
		.querySelectorAll('.actions [data-i], .actions-quiet [data-i], #msgBody > .act-exit')
		.forEach(
			b =>
				(b.onclick = () => {
					closeOverlays();
					actions[+b.dataset.i][1]();
				}),
		);
	openOverlay('ovMsg');
	$('ovMsg').dataset.noclose = opts.noClose ? '1' : '';
	msgOnClose = opts.onClose || null;
}

function closeByButton() {
	const cb = msgOnClose;
	msgOnClose = null;
	closeOverlays();
	if (cb) cb();
}

document.querySelectorAll('.close-x').forEach(b => (b.onclick = closeByButton));
// Back: Android's Back button and back swipe, in the app
// (platforms/android/MainActivity.java) and in a browser. It closes the
// scroll that is open, as Escape does; a scroll that needs a choice (a win,
// a loss) stays. On the board or the title the first Back only asks
// ("Leaving?"): a swipe from the edge of a board that runs edge to edge is
// easily made by accident. A second Back soon after leaves.
let leaveAsked = -1e9;
window.androidBack = () => {
	const open = document.querySelector('.overlay.open');
	if (open && open.id !== 'ovTitle') {
		if (!($('ovMsg').classList.contains('open') && $('ovMsg').dataset.noclose === '1')) closeByButton();
		return 'closed';
	}
	if (performance.now() - leaveAsked < 3000) return 'none';
	leaveAsked = performance.now();
	announce(Tplain('back.title'), Tplain('back.again'));
	return 'closed';
};
// In a browser, Back leaves the page, so the game keeps one entry of its
// own in the history, added at the first tap or key (browsers skip entries
// added before the player has touched the page), and answers Back itself.
let backGuard = false;
function armBackGuard() {
	if (backGuard || window.AndroidVibrate) return; // the app has its own Back
	history.pushState({ back: 1 }, '');
	backGuard = true;
}
['pointerdown', 'keydown'].forEach(k => document.addEventListener(k, armBackGuard, true));
window.addEventListener('popstate', () => {
	if (!backGuard) return;
	backGuard = false;
	if (androidBack() === 'none') history.back();
	else armBackGuard();
});
// The ring that shows where the keyboard is (lapis) shows once a key is used:
// a scroll gives its first button the focus, and on a phone, or before any
// key is pressed, a browser may ring it though nobody asked.
document.addEventListener('keydown', () => document.body.classList.remove('no-keys'), true);
document.addEventListener('pointerdown', () => document.body.classList.add('no-keys'), true);
document.addEventListener('keydown', e => {
	if (
		e.key === 'Escape' &&
		anyOverlayOpen() &&
		!($('ovMsg').classList.contains('open') && $('ovMsg').dataset.noclose === '1')
	)
		closeByButton();
});

$('ovMap').addEventListener('click', e => {
	if (e.target.id === 'ovMap') closeOverlays();
});
