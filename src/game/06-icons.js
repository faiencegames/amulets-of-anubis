// ---------- icons: SVG files in content/icons/<group>/<name>.svg ----------
// The build puts every file in ICONS (comments and the XML line removed).
// iconSvg() gives a whole icon ready for the page; iconArt() its inside only,
// for code that wraps it in its own <svg>. The gradients and patterns in an
// icon's <defs> are moved once into the shared defs (see sharedDefs below):
// that is why their ids must be unique across all the icon files.
const ICONS = /*ICONS*/null;
function iconSvg(group, name, attrs = '') {
	const svg = (ICONS[group] || {})[name];
	if (!svg) return '';
	return attrs ? svg.replace(/^<svg\b/, '<svg ' + attrs) : svg;
}

function iconInner(group, name) {
	return iconSvg(group, name)
		.replace(/^<svg[^>]*>/, '')
		.replace(/<\/svg>\s*$/, '');
}

const DEFS_SEEN = new Set();
function iconArt(group, name) {
	return iconInner(group, name).replace(/<defs>([\s\S]*?)<\/defs>/g, (m, d) => {
		const ids = [...d.matchAll(/<(\w+)[^>]*\bid="([^"]+)"[\s\S]*?<\/\1>/g)];
		ids.forEach(([whole, , id]) => {
			if (!DEFS_SEEN.has(id)) {
				DEFS_SEEN.add(id);
				sharedDefs(whole);
			}
		});
		return '';
	});
}

// Each boon's icon: images/icons/boons/<its icon>.svg, by boon id (a boon's
// file may name another boon's icon). Gradients are shared by id. When the same icon is on the page twice (the
// boon row exists once for wide screens and once for phones, one of them
// hidden), Firefox resolves url(#id) to the first copy, and if that copy sits
// in a hidden block the fill comes out empty. So the gradients live once, in
// a small always-rendered <svg> (sharedDefs, below), and the icons in the page
// refer to it. BOON_ICON_FULL keeps the self-contained versions for images
// made from an icon on its own (the codex).
const SHARED_DEFS = [];
const boonIconArt = {}; // each icon file, with its gradients moved to the shared defs
Object.keys(ICONS.boons || {}).forEach(name => {
	boonIconArt[name] = ICONS.boons[name].replace(/<defs>([\s\S]*?)<\/defs>/, (m, d) => {
		SHARED_DEFS.push(d);
		return '';
	});
});
const BOON_ICON = {};
const BOON_ICON_FULL = {};
Object.values(BOONS).forEach(b => {
	BOON_ICON[b.id] = boonIconArt[b.icon];
	BOON_ICON_FULL[b.id] = ICONS.boons[b.icon];
});

function sharedDefs(extra) {
	let el = document.getElementById('sharedDefs');
	if (!el) {
		document.body.insertAdjacentHTML(
			'afterbegin',
			'<svg id="sharedDefs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs></defs></svg>'
		);
		el = document.getElementById('sharedDefs');
	}
	el.querySelector('defs').insertAdjacentHTML('beforeend', extra);
}

sharedDefs(SHARED_DEFS.join(''));
