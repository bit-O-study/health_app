import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
export function checkPoses(id, poses) {
 assert.equal(poses.length,481);
 assert.deepEqual(poses[0].joints,poses.at(-1).joints);
 const j=(n,key)=>poses[n].joints[key],range=a=>[Math.min(...a),Math.max(...a)];
 const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 const angle=(n,side)=>{
  const a=j(n,'upperleg01.'+side),b=j(n,'lowerleg01.'+side),c=j(n,'foot.'+side);
  const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);
  return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;
 };
 const report={
  samples:481,loopError:0,
  footDrift:Math.max(...poses.flatMap((_,n)=>['L','R'].map(s=>dist(j(n,'foot.'+s),j(0,'foot.'+s))))),
  kneeRange:range(poses.flatMap((_,n)=>['L','R'].map(s=>angle(n,s)))),
  gripMisalignment:Math.max(...poses.map((_,n)=>Math.hypot(j(n,'grip.0')[1]-j(n,'grip.1')[1],j(n,'grip.0')[2]-j(n,'grip.1')[2]))),
  plateFloorClearance:range(poses.map((_,n)=>j(n,'contactMetrics')[1]-j(n,'contactMetrics')[0])),
  bodyShaftClearance:Math.min(...poses.map((_,n)=>j(n,'contactMetrics')[2]))
 };
 assert.ok(report.footDrift<1e-6&&report.gripMisalignment<1e-6);
 assert.ok(Math.abs(report.kneeRange[0]-110)<1e-6&&Math.abs(report.kneeRange[1]-175)<1e-6);
 assert.ok(Math.abs(j(0,'contactMetrics')[1]-j(0,'contactMetrics')[0])<1e-6,'Plates start at sole height');
 assert.ok(report.plateFloorClearance[0]>-1e-6&&report.plateFloorClearance[1]>4,'Floor start and full ascent');
 assert.ok(report.bodyShaftClearance>.02,'Shaft must clear sampled leg/body surface');
 assert.ok(poses.every(p=>[0,1].every(i=>Math.abs(p.joints['gripAxis.'+i][0])>.999)));
 const top=id==='pause-deadlift'?288:id==='tempo-deadlift'?192:96;
 const down=id==='pause-deadlift'?312:id==='tempo-deadlift'?240:120;
 const end=id==='tempo-deadlift'?432:456;
 for(let n=1;n<=top;n++)assert.ok(j(n,'grip.0')[1]>=j(n-1,'grip.0')[1]-1e-6,'Ascent monotonic');
 for(let n=down+1;n<=end;n++)assert.ok(j(n,'grip.0')[1]<=j(n-1,'grip.0')[1]+1e-6,'Descent monotonic');
 report.ascentSeconds=top/60;report.descentSeconds=(end-down)/60;
 if(id==='pause-deadlift'){
  report.pauseSeconds=1.6;
  report.pauseDrift=Math.max(...poses.slice(96,193).map(p=>dist(p.joints['grip.0'],j(96,'grip.0'))));
  report.pauseBelowKnee=j(96,'lowerleg01.L')[1]-j(96,'grip.0')[1];
  assert.ok(report.pauseDrift<1e-6&&report.pauseBelowKnee>.5);
 }
 return report;
}
if(process.argv[2]){
 const id=process.argv[2],base='tools/media/imports/deadlift-tempo-three-20261020/native/'+id;
 const report=checkPoses(id,JSON.parse(readFileSync(base+'/poses.json')));
 writeFileSync(base+'/kinematics.json',JSON.stringify(report,null,2)+'\n');
 console.log(id,report);
}
