// ---------- overlays ----------
const starSvg = on => iconSvg('ui', on ? 'star-on' : 'star-off', 'aria-hidden="true"'); // content/icons/ui/star-on.svg, star-off.svg
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
	document.querySelectorAll('.overlay.title-screen').forEach(o => o.classList.remove('title-screen'));
	idleTimer = 0;
	lastFocus && lastFocus.focus ? lastFocus.focus() : canvas.focus();
}

// opts.noClose: a scroll that needs a choice (victory, defeat) has no close button
// opts.onClose: what closing means, when it isn't simply "back to the board"
function showMsg(html, actions, opts = {}) {
	$('msgBody').innerHTML =
		html +
		'<div class="actions">' +
		actions.map((a, i) => `<button class="btn" data-i="${i}">${a[0]}</button>`).join('') +
		'</div>';
	$('msgBody')
		.querySelectorAll('.actions .btn')
		.forEach(
			b =>
				(b.onclick = () => {
					closeOverlays();
					actions[+b.dataset.i][1]();
				})
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
