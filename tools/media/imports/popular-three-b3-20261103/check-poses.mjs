import assert from 'node:assert/strict';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
export function checkPoses(id,poses){
 assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses[480].joints);
 let footDrift=0,gripError=0,elbowMin=180,elbowMax=0,kneeMin=180,kneeMax=0,backGap=0,padClearance=Infinity;
 for(const {joints:j}of poses){
  assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));
  for(const side of ['L','R']){
   for(const n of ['foot','toe2-1'])footDrift=Math.max(footDrift,dist(j[n+'.'+side],poses[0].joints[n+'.'+side]));
   const elbow=angle(...['upperarm01','lowerarm01','wrist'].map(n=>j[n+'.'+side])),knee=angle(...['upperleg01','lowerleg01','foot'].map(n=>j[n+'.'+side]));
   elbowMin=Math.min(elbowMin,elbow);elbowMax=Math.max(elbowMax,elbow);kneeMin=Math.min(kneeMin,knee);kneeMax=Math.max(kneeMax,knee);
   if(id==='hip-thrust')gripError=Math.max(gripError,dist(j['grip.'+side],j['target.'+side]));
   if(id==='biceps-curl'){
    assert.ok(dist(j['lowerarm01.'+side],poses[0].joints['lowerarm01.'+side])<1e-8,'Curl elbow moved');
    assert.ok(dist(j['upperarm01.'+side],poses[0].joints['upperarm01.'+side])<1e-8,'Curl shoulder moved');
   }
  }
  if(id!=='hip-thrust')for(const n of ['root','spine01','head'])assert.ok(dist(j[n],poses[0].joints[n])<1e-8,'Torso swing');
  if(id==='barbell-row')for(const g of j.grips)gripError=Math.max(gripError,Math.hypot(g[1]-j.bar[1],g[2]-j.bar[2]));
  if(id==='hip-thrust'){backGap=Math.max(backGap,Math.abs(j.contacts[1]));padClearance=Math.min(padClearance,j.contacts[2]);}
 }
 assert.ok(footDrift<1e-8,'Foot sliding');assert.ok(gripError<1e-8,'Grip lost');
 assert.ok(elbowMin>15&&elbowMax<180.01,'Elbow range');
 const top=poses[240].joints,start=poses[0].joints;
 if(id==='barbell-row'){assert.ok(top.bar[1]-start.bar[1]>2,'Row range');assert.ok(top.bar[2]<start.bar[2]-.8,'Row toward abdomen');assert.ok(elbowMax>150&&elbowMin<100);}
 if(id==='biceps-curl'){assert.ok(elbowMax>160&&elbowMin<85,'Curl range');assert.ok(top.grips[0][1]-start.grips[0][1]>4,'Curl height');}
 if(id==='hip-thrust'){
  assert.ok(backGap<.025,'Back lost bench support');assert.ok(padClearance>0,'Pad intersects body');
  assert.ok(top['upperleg01.L'][1]-start['upperleg01.L'][1]>2,'Hip range');
  const knee=angle(top['upperleg01.L'],top['lowerleg01.L'],top['foot.L']);assert.ok(knee>80&&knee<105,'Top knee angle');
  assert.ok(Math.abs(top['upperleg01.L'][1]-top['lowerleg01.L'][1])<.5,'Top thigh alignment');
  for(let f=210;f<=270;f++)assert.ok(dist(poses[f].joints.bar,top.bar)<1e-8,'One-second top hold');
 }
 return {poseSamples:481,loop:0,footDrift,gripError,elbowDegrees:[elbowMin,elbowMax],kneeDegrees:[kneeMin,kneeMax],...(id==='hip-thrust'?{backGap,padClearance,topHoldSeconds:1}:{})};
}
