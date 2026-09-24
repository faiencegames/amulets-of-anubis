import { chromium } from 'playwright';
const URL = 'file:///home/user/aotn/dist/amulets-of-anubis.html';
const SAVE_KEY = 'amulets-nile-v1';
const save = { unlocked:6, stars:[1,2,1,3,2,0,0,0,0,0,0,0], sound:false, seenHelp:true, current:5,
	difficulty:1, board:'classic', fill:true, fails:{}, skin:'faience', skins:{faience:1}, charges:{},
	boons:[], trialsDone:6, gold:120, lapis:9, upg:{}, relics:{first:1, cascade:1, trials:1, stars:1},
	suns:2, bestCascade:6, life:{wins:6, events:2, hardWins:1}, floor:'temple', floors:{temple:1},
	frame:'temple', frames:{temple:1}, sparkle:'gold', sparkles:{gold:1}, vibrate:false, streak:1,
	thickCracked:4, goldEarned:120, lapisEarned:9, journeys:1 };
const browser = await chromium.launch({ headless:true, args:['--no-sandbox','--disable-gpu'] });
const ctx = await browser.newContext({ viewport:{width:430,height:900}, deviceScaleFactor:2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0,200)));
page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text().slice(0,200)); });
await page.addInitScript(({k,save}) => { try { localStorage.removeItem(k); localStorage.setItem(k, JSON.stringify(save)); } catch(e){} }, {k: SAVE_KEY, save});
await page.goto(URL, { waitUntil: 'load' });
await page.waitForSelector('#ovTitle.open', { timeout: 15000 });
await page.click('#ovTitle [data-t="continue"]');
await page.waitForFunction(() => !document.querySelector('.overlay.open'), null, { timeout: 6000 }).catch(() => {});
const report = {};
await page.click('#btnCustomise');
await page.waitForSelector('#msgBody .skin', { timeout: 5000 });
report.customise = await page.evaluate(() => {
	const skins = Array.from(document.querySelectorAll('#msgBody .skin'));
	const locked = skins.filter(b => b.classList.contains('locked'));
	const sample = locked.slice(0, 4).map(b => {
		const f = b.querySelector('.lock-fill');
		const n = b.querySelector('.lock-num');
		const s = b.querySelector('strong');
		return { name: s ? s.textContent : null, bar: f ? f.style.width : null, num: n ? n.textContent : null };
	});
	return { totalSkins: skins.length, locked: locked.length, lockedWithBar: locked.filter(b => b.querySelector('.lock-fill')).length, sample };
});
await page.click('[data-a="close"]');
await page.waitForFunction(() => !document.querySelector('.overlay.open'), null, { timeout: 5000 }).catch(() => {});
await page.click('#btnHelp');
await page.waitForSelector('#msgBody .codex-book', { timeout: 5000 });
await page.click('#msgBody .codex-link[data-t="basics"]');
await page.waitForSelector('#msgBody .basics-legend', { timeout: 5000 });
report.basics = await page.evaluate(() => {
	const legend = Array.from(document.querySelectorAll('#msgBody .basics-legend .legend-row'));
	const body = document.querySelector('#msgBody .codex-body');
	return {
		legendRows: legend.length,
		legendTitles: legend.map(r => { const s = r.querySelector('strong'); return s ? s.textContent : null; }),
		goldIcons: body ? body.querySelectorAll('.g-ico.gold').length : 0,
		lapisIcons: body ? body.querySelectorAll('.g-ico.lapis').length : 0,
		hasCustomise: body ? body.textContent.includes('Customise') : false
	};
});
await page.click('#msgBody .codex-link[data-t="events"]');
await page.waitForSelector('#msgBody .codex-body .plain', { timeout: 5000 });
report.events = await page.evaluate(() => {
	const body = document.querySelector('#msgBody .codex-body');
	return { goldIcons: body ? body.querySelectorAll('.g-ico.gold').length : 0, lapisIcons: body ? body.querySelectorAll('.g-ico.lapis').length : 0 };
});
console.log('REPORT ' + JSON.stringify(report, null, 2));
console.log('PAGE_ERRORS ' + (errors.length ? JSON.stringify(errors, null, 2) : 'none'));
await browser.close();
process.exit(errors.length ? 1 : 0);
