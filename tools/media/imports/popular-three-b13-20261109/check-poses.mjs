import assert from 'node:assert/strict';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
export function checkPoses(id,poses){
 assert.ok(['incline-press','upright-row','wrist-curl'].includes(id));assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses[480].joints);
 const start=poses[0].joints,top=poses[240].joints;let footDrift=0,maxStep=0,spanDrift=0;
 for(let f=0;f<poses.length;f++){
  const j=poses[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite),'Nonfinite pose');
  for(const n of ['root','head','spine01'])assert.ok(dist(j[n],start[n])<1e-8,'Trunk movement');
  for(const side of ['L','R']){
   for(const n of ['foot','toe2-1'])footDrift=Math.max(footDrift,dist(j[n+'.'+side],start[n+'.'+side]));
   if(id==='wrist-curl')for(const n of ['upperarm01','lowerarm01','wrist'])assert.ok(dist(j[n+'.'+side],start[n+'.'+side])<1e-8,'Forearm moved');
   if(id==='upright-row')assert.ok(j['lowerarm01.'+side][1]<j['upperarm01.'+side][1],'Elbows above shoulder');
  }
  spanDrift=Math.max(spanDrift,Math.abs(dist(j.grips[0],j.grips[1])-dist(start.grips[0],start.grips[1])));
  assert.ok(Math.abs(j.grips[0][1]-j.grips[1][1])<1e-8&&Math.abs(j.grips[0][2]-j.grips[1][2])<1e-8,'Bar/grip alignment');
  if(f)for(const n of ['root','head','wrist.L','wrist.R','lowerarm01.L','lowerarm01.R'])maxStep=Math.max(maxStep,dist(j[n],poses[f-1].joints[n]));
 }
 assert.ok(footDrift<1e-8,'Foot sliding');assert.ok(maxStep<.15,'Motion jump');assert.ok(spanDrift<1e-8,'Rigid bar grip span changes');
 const rise=top.grips[0][1]-start.grips[0][1];assert.ok(rise>(id==='wrist-curl'?.4:id==='incline-press'?3:2),'Insufficient movement');
 for(let f=210;f<=270;f++)assert.ok(dist(poses[f].joints.grips[0],top.grips[0])<1e-8,'Peak pause missing');
 return {poseSamples:481,loop:0,footDrift,maxStep,spanDrift,gripRise:rise,peakHoldSeconds:1};
}
