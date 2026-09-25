// can a greedy bot finish each puzzle event? (people should do better)
const K=require('./load-core')(['Core','EVENTS','CHAMBERS','setBoardSize','CONTENT']);
K.setBoardSize(8,8);
const SETIDX=(ev,name)=>ev.set?ev.set.indexOf(name):-1;
function play(core,a,b,st){ core.play(a,b,res=>{ st.collected+=res.cleared.filter(o=>o.tile.type===st.target).length; st.brushed=(st.brushed||0)+res.brushed.length; }); }
function done(ev,core,st){ return ev.goal.type==='gild'?core.won(): ev.goal.type==='collect'? st.collected>=ev.goal.n : core.score>=ev.goal.n; }
// river puzzles, then chambers (whose bot also values breaking covers)
// A tomb or temple is also played as a return visit (the 1st and 4th return),
// when cursed badges turn up, as returnBadges() in src/game/11-chambers.js does on Normal.
const R=K.CONTENT.settings.returning;
const runs=[];
for(const ev of [...K.EVENTS.filter(e=>e.kind==='puzzle'), ...K.CHAMBERS]){
	runs.push([ev, 0]);
	if(ev.chamber && ev.torch) runs.push([ev, 1], [ev, 4]);
}
for(const [ev, wins] of runs){
	let w=0, n=+(process.env.GAMES||40);
	const opts = !wins ? {powerChance:.02} : {powerChance:R.badgeChance, badBadges:true, badMult:Math.min(R.most, R.curseMult + R.eachReturn*(wins-1))};
	for(let g=0;g<n;g++){
		const lvl={name:ev.title, map:ev.map, moves:ev.moves, types:ev.types};
		const core=new K.Core(lvl,Object.assign({map:ev.map}, opts)); core.fill();
		const st={collected:0, target:SETIDX(ev, ev.goal.amulet)};
		while(core.movesLeft>0 && !done(ev,core,st)){
			const mv=core.allMoves(); if(!mv.length){ core.shuffle(); continue; }
			let best=null,bv=-1e9;
			for(const [a,b] of mv){ const c=core.clone(); const s2={collected:0,target:st.target}; const r0=c.remaining(), sc0=c.score; play(c,a,b,s2);
				const v = ev.goal.type==='gild' ? (r0-c.remaining()) + (s2.brushed||0)*.6 : ev.goal.type==='collect' ? s2.collected : (c.score-sc0);
				if(v+Math.random()*.1>bv){bv=v+Math.random()*.1;best=[a,b];} }
			play(core,best[0],best[1],st);
		}
		if(done(ev,core,st)) w++;
	}
	console.log((ev.chamber?'chamber ':'')+ev.id.padEnd(12)+(wins?` return ${wins}`:'         '), 'win', Math.round(100*w/n)+'%');
}
