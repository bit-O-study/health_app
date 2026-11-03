import assert from 'node:assert/strict';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
function angle(a,b,c){const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;}
export function checkPoses(id,poses){
 assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses.at(-1).joints);
 const first=poses[0].joints,last=poses[240].joints;let gripError=0;const knees=[],elbows=[];
 for(const {joints:j}of poses){
  assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));
  for(const side of ['L','R']){
   gripError=Math.max(gripError,dist(j['grip.'+side],j['target.'+side]));
   knees.push(angle(j['upperleg01.'+side],j['lowerleg01.'+side],j['foot.'+side]));
   elbows.push(angle(j['upperarm01.'+side],j['lowerarm01.'+side],j['wrist.'+side]));
   if(id==='lat-pulldown')assert.ok(dist(j['foot.'+side],first['foot.'+side])<1e-8,'Foot drift');
  }
  if(id!=='pull-up')assert.ok(dist(j.root,first.root)<1e-8,'Hip drift');
  if(id==='pull-up'){assert.ok(dist(j.bar,first.bar)<1e-8);assert.equal(j.root[2],first.root[2]);}
  if(id!=='leg-press')assert.ok(j.contacts[3]>0,'Bar intersects central body');
  if(id==='lat-pulldown')assert.ok(Math.abs(j.bar[1]+j.stack[1]-first.bar[1]-first.stack[1])<1e-8,'Cable travel');
  if(id==='leg-press')assert.ok(Math.abs(j.plate[1]-first.plate[1]-(j.plate[2]-first.plate[2]))<1e-7,'Sled rail');
 }
 assert.ok(gripError<1e-7,'Grip detached');
 if(id==='pull-up'){assert.ok(last.head[1]>11.7,'Chin height');assert.ok(elbows[0]>160,'Incomplete extension');}
 if(id==='lat-pulldown'){assert.ok(elbows[0]>160,'Incomplete overhead extension');assert.ok(first.bar[1]-last.bar[1]>4.8);}
 if(id==='leg-press'){assert.ok(Math.abs(Math.min(...knees)-95)<1e-6);assert.ok(Math.abs(Math.max(...knees)-165)<1e-6);}
 return {poseSamples:481,loopError:0,gripError,kneeDegrees:[Math.min(...knees),Math.max(...knees)],elbowDegrees:[Math.min(...elbows),Math.max(...elbows)]};
}
