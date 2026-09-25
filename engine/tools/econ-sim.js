// Economy sweep: plays whole journeys with the greedy bot and tracks what a
// player earns and unlocks, with the game's own formulas. The bot never spends,
// never replays for stars or seals and never braves omens, so it shows the
// pace of a straight playthrough. Usage:
//   node tools/econ-sim.js <cols> <rows> <journeys> <difficulty 0-3>
//   node tools/econ-sim.js 8 13 4 1
const K=require('./load-core')(['LEVELS','Core','DIFFICULTY','setBoardSize','boardMode','pickShape','CONTENT','conditionMet','CONDITION_COUNTERS','EARN','PERSISTENCE','EVENT_CHANCE','RELICS','UPGRADES','STALL','stopOptions']);
const [C,R]=[+(process.argv[2]||8), +(process.argv[3]||13)], JOURNEYS=+(process.argv[4]||2), DIFF=+(process.argv[5]||1);
const D=K.DIFFICULTY[DIFF], mode=K.boardMode('classic'); K.setBoardSize(C,R);
const looks=[...K.CONTENT.skins.map(o=>['set',o]),...K.CONTENT.floorSets.map(o=>['floor',o]),...K.CONTENT.frames.map(o=>['frame',o]),...K.CONTENT.sparkles.map(o=>['sparkle',o])];
const s={stars:[],life:{wins:0,events:0,hardWins:0},relics:{},trialsDone:0,suns:0,bestCascade:0,thickCracked:0,goldEarned:0,gold:0,lapis:0,streak:0,journeys:1,seals:{},omens:{},lastWin:null};
let lapisEarned=0, attempts=0, got=new Set(), log=[];
function checkAll(tag){
	for(let pass=0;pass<3;pass++) K.RELICS.forEach(r=>{ if(!s.relics[r.id] && K.conditionMet(r.when,s)){ s.relics[r.id]=1; if(r.reward){ s.gold+=r.reward.gold||0; s.goldEarned+=r.reward.gold||0; s.lapis+=r.reward.lapis||0; lapisEarned+=r.reward.lapis||0; } log.push(`${tag}: relic ${r.name}`);} });
	looks.forEach(([k,o])=>{ const key=k+':'+o.id; if(!got.has(key) && K.conditionMet(o.need,s)){ got.add(key); if(o.need) log.push(`${tag}: ${k} ${o.name}`);} });
}
function play(core,a,b,st){ core.play(a,b,(res,m)=>{ if(st){ st.gild+=res.gild.length; st.made+=res.made.length; st.suns+=res.made.filter(x=>x.tile.special==='sun').length; st.casc=Math.max(st.casc,m); st.thick+=res.gild.filter(g=>g.now===1&&!g.blessed).length; if(res.fired.length>=2) st.duet=true; res.fired.forEach(f=>{ if(f.kind==='lapis') st.gem+=f.n; }); } }); }
function attempt(i){
	const L=K.LEVELS[i], shape=K.pickShape(i), fails=Math.min(K.PERSISTENCE.maxFails, (s.fails||{})[i]||0);
	// the board as the game builds it (stopOptions in 01-core.js); on the first
	// journey badges and cursed badges arrive at the stops settings.jsonc says
	const staged = part => s.journeys > 1 || i >= K.CONTENT.settings.staging[part];
	const core=new K.Core(L, K.stopOptions({level:L, idx:i, mode, cols:C, rows:R, shape, variant:Math.floor(Math.random()*5), difficulty:DIFF, fails, badgesOn:staged('badges'), cursesOn:staged('curses')}));
	core.fill(); const st={gild:0,made:0,suns:0,casc:0,thick:0,duet:false,gem:0};
	while(core.movesLeft>0 && !core.won()){ const mv=core.allMoves(); if(!mv.length){ core.shuffle(); continue; }
		let best=null,bv=-1e9; for(const [a,b] of mv){ const c=core.clone(); const r0=c.remaining(); play(c,a,b,null); const v=(r0-c.remaining())*10+Math.random(); if(v>bv){bv=v;best=[a,b];} }
		play(core,best[0],best[1],st); }
	attempts++;
	// earnings during play (goldBits/lapisBits carry over; approximate per attempt)
	const g=Math.floor(st.gild/K.EARN.stonesPerGold), l=Math.floor(st.made/K.EARN.specialsPerLapis)+st.gem;
	s.gold+=g; s.goldEarned+=g; s.lapis+=l; lapisEarned+=l; s.suns+=st.suns; s.bestCascade=Math.max(s.bestCascade,st.casc); s.thickCracked+=st.thick;
	// a trial is offered 35% of the time; say the player finishes half of them
	if(Math.random()<.35*.5){ s.trialsDone++; s.lapis+=3; lapisEarned+=3; }
	if(!core.won()){ s.fails=s.fails||{}; s.fails[i]=(s.fails[i]||0)+1; s.streak=0; return false; }
	const ratio=core.movesLeft/core.startMoves, stars=ratio>=.3?3:ratio>=.15?2:1; s.stars[i]=Math.max(s.stars[i]||0,stars);
	const wg=core.movesLeft*K.EARN.spareMoveGold+K.EARN.winGold; s.gold+=wg; s.goldEarned+=wg; s.lapis+=K.EARN.winLapis; lapisEarned+=K.EARN.winLapis;
	s.life.wins++; s.streak++; if(s.fails) s.fails[i]=0;
	s.lastWin={idx:i, stop:L.id, spare:core.movesLeft, noBoon:true, board:'classic', difficulty:DIFF, duet:st.duet, preFails:0, omens:0, suns:st.suns, cascade:st.casc, specials:st.made};
	const sl=s.seals[L.id]||[]; (L.seals||[]).forEach((x,j)=>{ if(!sl[j] && K.conditionMet(x.when,s)){ sl[j]=1; s.lapis+=6; lapisEarned+=6; } }); s.seals[L.id]=sl;
	return true;
}
const t0=Date.now();
for(let j=1;j<=JOURNEYS;j++){
	if(j>1){ s.stars=[]; s.journeys=j; }
	for(let i=0;i<K.LEVELS.length;i++){
		if(i>0 && Math.random()<K.EVENT_CHANCE){ s.life.events++; const r=Math.random(); if(r<.5){ s.gold+=45; s.goldEarned+=45; } else { s.lapis+=5; lapisEarned+=5; } }
		let tries=0; while(!attempt(i) && tries<8) tries++;
		checkAll('journey '+j);
	}
	const lookN=[...got].filter(k=>{ const [kind,id]=k.split(':'); const o=looks.find(([a,b])=>a===kind&&b.id===id)[1]; return o.need; }).length;
	const totalLooks=looks.filter(([,o])=>o.need).length;
	console.log(`== after journey ${j} (${attempts} attempts): gold earned ${s.goldEarned}, lapis earned ${lapisEarned}, stars ${K.CONDITION_COUNTERS.stars(s)}/36, relics ${Object.keys(s.relics).length}/${K.RELICS.length}, earned looks ${lookN}/${totalLooks}, seals ${K.CONDITION_COUNTERS.seals_stamped(s)}/36 | thick ${s.thickCracked} suns ${s.suns} events ${s.life.events} wins ${s.life.wins} trials ${s.trialsDone} 3star ${K.CONDITION_COUNTERS.three_star_stops(s)}`);
}
console.log(log.join('\n'));
const tre=K.UPGRADES.map(u=>`${u.name}: ${u.prices.reduce((a,b)=>a+b,0)} ${u.cur}`); console.log('Treasury full cost:', tre.join(' | '));
console.log('Stall:', K.STALL.map(x=>`${x.name} ${x.price} ${x.cur}`).join(' | '));
console.log('secs', Math.round((Date.now()-t0)/1000));
