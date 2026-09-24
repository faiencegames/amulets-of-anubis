// count Web Audio nodes created and how many are later garbage-collected
(()=>{ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
	const st=window.__audio={made:0,freed:0,byType:{}};
	const reg=new FinalizationRegistry(t=>{ st.freed++; st.byType[t]=(st.byType[t]||0)-1; });
	for(const m of Object.getOwnPropertyNames(AC.prototype).concat(Object.getOwnPropertyNames(Object.getPrototypeOf(AC.prototype)))){
		if(!/^create(?!Buffer$|PeriodicWave$)/.test(m)) continue;
		const proto = AC.prototype[m] ? AC.prototype : Object.getPrototypeOf(AC.prototype);
		const orig=proto[m]; if(typeof orig!=='function') continue;
		proto[m]=function(...a){ const n=orig.apply(this,a); st.made++; const t=m.slice(6); st.byType[t]=(st.byType[t]||0)+1; reg.register(n,t); return n; };
	}
})();
