// Balance harness: plays every stop the way the game does (random shape from the
// stop's pool), on a given board size, with everything on (as on a second
// journey) and reports win rates. The board is built by stopOptions() in
// 01-core.js, the same function the game uses. For a first journey, as a new
// player meets it, see journey-sim.js.
const K=require('./load-core')(['LEVELS','Core','DIFFICULTY','setBoardSize','boardMode','pickShape','stopOptions']);
const [,, diff='1', modeId='classic', cols='8', rows='8', games='16'] = process.argv;
const D=K.DIFFICULTY[+diff], mode=K.boardMode(modeId);
K.setBoardSize(+cols, +rows);
const play=(core,a,b)=>core.play(a,b);   // one move, as the game plays it (Core.play)
function game(i){
	const L=K.LEVELS[i], shape= modeId==='ruins' ? {map:null,ease:1} : K.pickShape(i);
	const core=new K.Core(L, K.stopOptions({level:L, idx:i, mode, cols:+cols, rows:+rows, shape, variant:Math.floor(Math.random()*5), difficulty:+diff}));
	core.fill();
	while(core.movesLeft>0 && !core.won()){
		const mv=core.allMoves(); if(!mv.length){ core.shuffle(); continue; }
		let best=null,bv=-1e9;
		for(const [a,b] of mv){ const c=core.clone(); const before=c.remaining(); play(c,a,b); const v=(before-c.remaining())*10+Math.random(); if(v>bv){bv=v;best=[a,b];} }
		play(core,best[0],best[1]);
	}
	return core.won();
}
const out=[]; let tot=0;
K.LEVELS.forEach((L,i)=>{ let w=0; for(let g=0;g<+games;g++) if(game(i)) w++; out.push(Math.round(100*w/+games)); tot+=w; });
console.log(`${modeId} ${cols}x${rows} d${diff}:`, out.join(' '), '| avg', Math.round(100*tot/(+games*K.LEVELS.length))+'%');
