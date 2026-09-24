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
	document.body.classList.remove('at-title');
	idleTimer = 0;
	lastFocus && lastFocus.focus ? lastFocus.focus() : canvas.focus();
}

// opts.noClose: a scroll that needs a choice (victory, defeat) has no close button
// opts.onClose: what closing means, when it isn't simply "back to the board"
// Each action is [label, what it does] and may add a third part saying how it
// looks, so a scroll has one clear way forward and the rest stay quiet:
//	{ kind: 'go', sub, icon }   the usual next step: one big gold button, with a line under it
//	{ kind: 'card', sub, icon } another way to go, as a smaller button with a line under it
//	dark: true (and oasis: true) colours either as the way into a tomb (or an oasis); hidden: true starts it hidden
//	{ kind: 'quiet', icon }     the rest (the map, replaying): small, in a row at the foot
// An action with none of these is an ordinary button, as before.
function actionHtml(a, i) {
	const o = a[2] || {},
		ico = o.icon ? `<span class="act-ico" aria-hidden="true">${o.icon}</span>` : '',
		sub = o.sub ? `<small>${o.sub}</small>` : '';
	if (o.kind === 'go' || o.kind === 'card')
		return `<button class="act-${o.kind}${o.dark ? ' dark' : ''}${o.oasis ? ' oasis' : ''}" data-i="${i}"${o.hidden ? ' hidden' : ''}>${ico}<span class="act-words">${a[0]}${sub}</span><span class="act-arrow" aria-hidden="true">\u203a</span></button>`;
	if (o.kind === 'quiet') return `<button class="act-quiet" data-i="${i}">${ico}${a[0]}</button>`;
	return `<button class="btn" data-i="${i}">${a[0]}</button>`;
}

function showMsg(html, actions, opts = {}) {
	const kind = a => (a[2] || {}).kind;
	const main = actions.map((a, i) => [a, i]).filter(([a]) => kind(a) !== 'quiet'),
		quiet = actions.map((a, i) => [a, i]).filter(([a]) => kind(a) === 'quiet');
	$('msgBody').innerHTML =
		html +
		`<div class="actions${actions.some(kind) ? ' stacked' : ''}">` +
		main.map(([a, i]) => actionHtml(a, i)).join('') +
		'</div>' +
		(quiet.length ? `<div class="actions-quiet">${quiet.map(([a, i]) => actionHtml(a, i)).join('')}</div>` : '');
	$('msgBody')
		.querySelectorAll('.actions [data-i], .actions-quiet [data-i]')
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
