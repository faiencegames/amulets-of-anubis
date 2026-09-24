# Makes a copy of the built game with a window.__g handle on its internals,
# for tools/perf/soak.py. Never ship the copy.
import sys
src=sys.argv[1]; dst=sys.argv[2]
s=open(src).read()
hook=("window.__g={get save(){return save},get core(){return core},get busy(){return busy},get levelIdx(){return levelIdx},"
 "swap:(a,b)=>attemptSwap(a,b),startLevel:i=>startLevel(i),applyLook:()=>applyLook(),closeOverlays:()=>closeOverlays(),"
 "openMap:()=>openMap(),openCustomise:()=>openCustomise(),openStall:()=>openStall(),openTreasury:()=>openTreasury(),openHelp:t=>openHelp(t),"
 "useBoon:(i,k)=>useBoon(i,k),renderBoons:()=>renderBoons(),looks:()=>checkLooks(),"
 "sizes:()=>({particles:particles.length,popups:popups.length,beams:beams.length,rings:rings.length,orbs:orbs.length,flashes:flashes.size,dying:dying.length,scaled:scaledTiles.size,skin:skinCache.size,ks:ksCache.size,bgCells:bgCells.size,announceQ:announceQ.length,pad:music.pad?music.pad.length:0}),"
 "get lowFx(){return lowFx}};")
s=s.replace("function grantRelic(id){",hook+"function grantRelic(id){",1)
open(dst,'w').write(s)
