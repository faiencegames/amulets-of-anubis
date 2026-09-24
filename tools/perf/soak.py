# Soak test: plays the real game for a few hundred moves, switching looks and
# opening every screen along the way, and samples memory, DOM nodes, event
# listeners and live Web Audio nodes after forced garbage collection. Numbers
# that keep climbing sample after sample are a leak; numbers that level off
# are caches filling up.
#   python3 tools/perf/hook.py dist/amulets-of-anubis.html /tmp/hooked.html
#   python3 tools/perf/soak.py file:///tmp/hooked.html 400 [cpu-slowdown]
# Needs Python Playwright (pip install playwright; playwright install chromium).
import sys, json, time, os
HERE=os.path.dirname(os.path.abspath(__file__))
from playwright.sync_api import sync_playwright
URL=sys.argv[1]; MOVES=int(sys.argv[2]) if len(sys.argv)>2 else 400
THROTTLE=float(sys.argv[3]) if len(sys.argv)>3 else 1
with sync_playwright() as p:
	b=p.chromium.launch(args=['--js-flags=--expose-gc','--autoplay-policy=no-user-gesture-required'])
	ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
	pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
	pg.add_init_script(path=HERE+'/count-audio-nodes.js')
	pg.goto(URL); pg.wait_for_timeout(1000)
	pg.mouse.click(5,5); pg.keyboard.press('Escape'); pg.wait_for_timeout(1200)   # arms audio, starts music
	cdp=ctx.new_cdp_session(pg); cdp.send('Performance.enable')
	if THROTTLE>1: cdp.send('Emulation.setCPUThrottlingRate',{'rate':THROTTLE})
	pg.evaluate("""()=>{ window.__long=[]; try{ new PerformanceObserver(l=>l.getEntries().forEach(e=>__long.push(e.duration))).observe({type:'longtask',buffered:true}); }catch(e){} }""")
	def metrics():
		pg.evaluate("gc(); gc();"); pg.wait_for_timeout(300); pg.evaluate("gc()")
		m={x['name']:x['value'] for x in cdp.send('Performance.getMetrics')['metrics']}
		a=pg.evaluate("window.__audio?{made:__audio.made,live:__audio.made-__audio.freed}:null")
		return {'heapMB':round(m['JSHeapUsedSize']/1048576,2),'nodes':int(m['Nodes']),'listeners':int(m['JSEventListeners']),'docs':int(m['Documents']),
				'audioLive':a and a['live'],'audioMade':a and a['made'],'sizes':pg.evaluate("__g.sizes()")}
	samples=[('start',metrics())]
	looks=[('skin','glass'),('floor','cedar'),('skin','moonlit'),('floor','granite'),('skin','faience'),('floor','temple')]
	moves=0; levels=0; t0=time.time(); stuck=0
	while moves<MOVES:
		if pg.locator('.overlay.open').count():
			pg.evaluate("__g.closeOverlays()")
		st=pg.evaluate("""()=>{ const c=__g.core; if(!c) return 'none'; if(c.won()||c.movesLeft<=0) return 'end'; return __g.busy?'busy':'ok'; }""")
		if st=='end' or st=='none':
			pg.evaluate(f"__g.startLevel({levels%12})"); levels+=1; pg.wait_for_timeout(200); continue
		if st=='busy':
			pg.wait_for_timeout(60); stuck+=1
			if stuck>150: pg.evaluate("__g.closeOverlays()"); open(HERE+'/soak-progress.txt','a').write('stuck busy at move %d\n'%moves); pg.evaluate(f"__g.startLevel({levels%12})"); levels+=1; stuck=0
			continue
		stuck=0
		pg.evaluate("""async()=>{ const c=__g.core, mv=c.allMoves(); if(!mv.length) return; const [a,b]=mv[Math.floor(Math.random()*mv.length)]; __g.swap(a,b); }"""); pg.wait_for_timeout(30)
		moves+=1
		if moves%40==0:
			i=(moves//40)%len(looks); k,v=looks[i]
			pg.evaluate(f"""()=>{{ const s=__g.save; s[{json.dumps(k+'s')}][{json.dumps(v)}]=1; s[{json.dumps(k)}]={json.dumps(v)}; __g.applyLook(); }}""")
			for fn in ['openMap()','openCustomise()','openStall()','openTreasury()',"openHelp('amulets')","openHelp('boons')"]:
				pg.evaluate("__g."+fn); pg.wait_for_timeout(80); pg.evaluate("__g.closeOverlays()")
			pg.evaluate("__g.save.boons.push('sekhmet','bes','flood'); __g.renderBoons()")
		if moves%100==0:
			samples.append((f'moves {moves} levels {levels}',metrics()))
			open(HERE+'/soak-progress.txt','a').write(json.dumps(samples[-1])+'\n')
	long=pg.evaluate("__long")
	out={'moves':moves,'levels':levels,'seconds':round(time.time()-t0),'throttle':THROTTLE,'errors':errs,
		 'longtasks':{'count':len(long),'max':round(max(long or [0])),'over100':len([x for x in long if x>100])},
		 'lowFx':pg.evaluate("__g.lowFx"),'samples':samples}
	print(json.dumps(out,indent=1)); b.close()
