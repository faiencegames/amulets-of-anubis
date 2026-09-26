// The manual's pages: light or dark, and the search over every page
// (window.SEARCH, written by tools/docs/build.py). Nothing is fetched.
(() => {
	const root = document.documentElement;
	const KEY = 'docs-theme';
	let theme = null;
	try {
		theme = localStorage.getItem(KEY);
	} catch (e) {}
	if (theme) root.dataset.theme = theme;
	const button = document.getElementById('theme');
	if (button)
		button.addEventListener('click', () => {
			const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
			root.dataset.theme = dark ? 'light' : 'dark';
			try {
				localStorage.setItem(KEY, root.dataset.theme);
			} catch (e) {}
		});

	// on a phone the list of pages starts folded, so the page itself comes first
	const pages = document.querySelector('.pages details');
	if (pages && matchMedia('(max-width: 860px)').matches) pages.open = false;

	const search = document.getElementById('search');
	const results = document.getElementById('results');
	if (!search || !results || !window.SEARCH) return;
	const escape = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
	search.addEventListener('input', () => {
		const words = search.value.trim().toLowerCase().split(/\s+/).filter(w => w.length > 1);
		if (!words.length) {
			results.hidden = true;
			results.innerHTML = '';
			return;
		}
		const found = window.SEARCH.map(s => {
			const title = s.t.toLowerCase(), text = s.x.toLowerCase();
			let score = 0;
			for (const w of words) {
				if (title.includes(w)) score += 5;
				else if (text.includes(w)) score += 1;
				else return null;
			}
			return { s, score };
		})
			.filter(Boolean)
			.sort((a, b) => b.score - a.score)
			.slice(0, 12);
		results.innerHTML = found.length
			? found
					.map(({ s }) => {
						const at = s.x.toLowerCase().indexOf(words[0]);
						const bit = s.x.slice(Math.max(0, at - 60), at + 120);
						return `<a href="${s.p}"><b>${escape(s.t)}</b> <span>${escape(s.n)}</span><p>${escape(bit)}</p></a>`;
					})
					.join('')
			: '<p class="none">Nothing found.</p>';
		results.hidden = false;
	});
	document.addEventListener('keydown', e => {
		if (e.key === 'Escape') {
			search.value = '';
			results.hidden = true;
		}
		if (e.key === '/' && document.activeElement !== search) {
			e.preventDefault();
			search.focus();
		}
	});
})();
