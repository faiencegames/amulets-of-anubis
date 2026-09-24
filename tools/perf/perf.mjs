// Amulets of the Nile — headless perf harness.
// Drives the real built game (dist/amulets-of-anubis.html) through its DOM and
// measures what a headless box can actually tell us reliably:
//   1. menu-open latency   (main-thread cost of showing each overlay)
//   2. level-start cost    (clicking Restart -> startLevel)
//   3. JS heap over many level starts  (does the scaledTiles fix hold?)
//   4. frame times during a short run of real play
// NOTE: desktop-class box (Jetson aarch64), NOT a phone. Absolute frame numbers
// are optimistic vs a real device; relative before/after on the same box is fine.
import { chromium } from 'playwright';

const URL = process.env.URL || 'file:///home/user/aotn/dist/amulets-of-anubis.html';
const SAVE_KEY = 'amulets-nile-v1';
const fresh = () => ({ unlocked:0, stars:[], sound:false, seenHelp:true, current:0, difficulty:1,
	board:'classic', fill:true, fails:{}, skin:'faience', skins:{faience:1}, charges:{}, boons:[],
	trialsDone:0, gold:0, lapis:0, upg:{}, relics:{}, suns:0, bestCascade:0,
	life:{wins:0,events:0,hardWins:0}, floor:'temple', floors:{temple:1}, frame:'temple',
	frames:{temple:1}, sparkle:'gold', sparkles:{gold:1}, vibrate:true, streak:0,
	thickCracked:0, goldEarned:0, lapisEarned:0, journeys:1 });
const pct = (a,p)=>{ const s=[...a].sort((x,y)=>x-y); return +s[Math.min(s.length-1, Math.floor(s.length*p))].toFixed(2); };

const browser = await chromium.launch({ headless:true, args:['--no-sandbox','--disable-gpu','--force-color-profile=srgb'] });
const ctx = await browser.newContext({ viewport:{width:1000,height:700}, deviceScaleFactor:1 });
const page = await ctx.newPage();
const pageErrors=[]; page.on('pageerror', e=>pageErrors.push(String(e)));
await page.addInitScript(({k,save})=>{ try{ localStorage.removeItem(k); localStorage.setItem(k, JSON.stringify(save)); }catch(e){} }, {k:SAVE_KEY, save:fresh()});
await page.goto(URL, { waitUntil:'networkidle' });
await page.waitForSelector('#ovTitle.open', { timeout:15000 });
await page.click('#ovTitle [data-t="continue"]');
await page.waitForFunction(()=>!document.querySelector('.overlay.open'), null, { timeout:5000 }).catch(()=>{});

// CDP for reliable JS heap. GC is best-effort (needs --enable-precise-memory; else still useful).
const cdp = await ctx.newCDPSession(page);
await cdp.send('Runtime.enable');
await cdp.send('Performance.enable').catch(()=>{});
const heapMB = async () => {
	try { const {metrics} = await cdp.send('Performance.getMetrics'); const m=metrics.find(m=>m.name==='JSHeapUsedSize'); if(m) return +(m.value/1048576).toFixed(1); } catch(e){}
	return await page.evaluate(()=>performance.memory ? +(performance.memory.usedJSHeapSize/1048576).toFixed(1) : -1);
};

// ---------- 1. menu-open latency (main-thread show cost) ----------
const DOCK = [['btnMap','Map'],['btnTreasury','Treasury'],['btnCustomise','Customise'],['btnHelp','Help'],['btnStall','Anubis'],['btnMenu','Menu']];
const menuOpenMs = {};
for (const [id,name] of DOCK){
	menuOpenMs[name] = await page.evaluate(async (id)=>{
		const el=document.getElementById(id);
		el.scrollIntoView({block:'center'});
		const t0=performance.now(); el.click();                 // click -> showMsg -> layout+paint
		await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); // first painted frame after
		return +(performance.now()-t0).toFixed(1);
	}, id);
	await page.evaluate(()=>{ document.querySelectorAll('.overlay.open').forEach(o=>o.classList.remove('open')); });
	await page.waitForTimeout(60);
}

// ---------- 2+3. level-start cost + heap over restarts ----------
const startCosts=[]; const heapSeries=[];
const RESTARTS=40;
for (let i=0;i<RESTARTS;i++){
	startCosts.push(await page.evaluate(()=>{ const el=document.getElementById('btnRestart'); const t0=performance.now(); el.click(); return +(performance.now()-t0).toFixed(1); }));
	if (i%5===4){ await page.waitForTimeout(450); heapSeries.push(await heapMB()); } // let async settle() finish, then sample
}
await cdp.send('Runtime.disable');

// ---------- 4. frame times during a short run of play ----------
const frames = await page.evaluate(()=>new Promise(res=>{
	const cv=document.getElementById('board'); const r=cv.getBoundingClientRect();
	const cx=r.left+r.width*0.5, cy=r.top+r.height*0.5;
	let taps=0; const tap=setInterval(()=>{
		cv.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,clientX:cx,clientY:cy,pointerId:1,isPrimary:true,button:0}));
		cv.dispatchEvent(new PointerEvent('pointerup',  {bubbles:true,cancelable:true,clientX:cx,clientY:cy,pointerId:1,isPrimary:true,button:0}));
		if(++taps>14) clearInterval(tap);
	},250);
	let n=0; const d=[]; let last=performance.now();
	function loop(t){ d.push(t-last); last=t; if(++n<200) requestAnimationFrame(loop);
		else { clearInterval(tap); const a=d.slice(1); res({ frames:n, avg:+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2), p95:pct(a,0.95), worst:+Math.max(...a).toFixed(1), dropped_34ms:a.filter(x=>x>34).length }); } }
	requestAnimationFrame(loop);
}));

console.log(JSON.stringify({
	url: URL,
	pageErrors,
	menuOpenMs,
	levelStartMs: { avg:+(startCosts.reduce((a,b)=>a+b,0)/startCosts.length).toFixed(2), p95:pct(startCosts,0.95), max:Math.max(...startCosts) },
	heapMB_over_restarts: heapSeries,
	frames,
}, null, 2));
await browser.close();
