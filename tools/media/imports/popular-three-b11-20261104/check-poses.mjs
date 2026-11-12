import assert from 'node:assert/strict';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
export function checkPoses(id,poses){
 assert.ok(['rdl','goblet-squat','front-squat'].includes(id));assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses[480].joints);
 const start=poses[0].joints,bottom=poses[240].joints;let footDrift=0,maxStep=0,kneeMin=180,kneeMax=0;
 for(let f=0;f<poses.length;f++){
  const j=poses[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite),'Nonfinite pose');
  assert.ok(Math.abs(dist(j.root,j.head)-dist(start.root,start.head))<1e-8,'Trunk deformation');
  for(const side of ['L','R']){
   for(const n of ['foot','toe2-1'])footDrift=Math.max(footDrift,dist(j[n+'.'+side],start[n+'.'+side]));
   const knee=angle(...['upperleg01','lowerleg01','foot'].map(n=>j[n+'.'+side]));kneeMin=Math.min(kneeMin,knee);kneeMax=Math.max(kneeMax,knee);
   if(id==='rdl'){
    assert.ok(Math.abs(knee-155)<1e-6,'RDL knee angle changes');
    assert.ok(angle(...['upperarm01','lowerarm01','wrist'].map(n=>j[n+'.'+side]))>170,'Bent RDL elbow');
   }else{
    assert.ok(Math.abs(dist(j['wrist.'+side],j.spine01)-dist(start['wrist.'+side],start.spine01))<1e-8,'Rack/cup drifts');
    if(id==='front-squat')assert.ok(j['lowerarm01.'+side][2]>j['upperarm01.'+side][2]+2,'Front rack elbows drop');
   }
  }
  if(f)for(const n of ['root','head','wrist.L','wrist.R','lowerleg01.L','lowerleg01.R'])maxStep=Math.max(maxStep,dist(j[n],poses[f-1].joints[n]));
 }
 assert.ok(footDrift<1e-8,'Foot sliding');assert.ok(maxStep<.2,'Motion jump');
 if(id==='rdl'){
  assert.ok(start.root[2]-bottom.root[2]>3,'Insufficient hip hinge');
  assert.ok(start.grips[0][1]-bottom.grips[0][1]>3,'Insufficient bar descent');
  assert.ok(bottom.grips[0][1]<bottom['lowerleg01.L'][1],'Bar does not reach below knees');
 }else{
  assert.ok(start.root[1]-bottom.root[1]>5,'Insufficient squat depth');
  assert.ok(bottom['upperleg01.L'][1]<bottom['lowerleg01.L'][1]+.2,'Thigh does not reach parallel');
  assert.ok(kneeMin>45&&kneeMin<90&&kneeMax>160,'Squat knee range');
 }
 for(let f=210;f<=270;f++)assert.ok(dist(poses[f].joints.root,bottom.root)<1e-8,'One-second bottom pause');
 return {poseSamples:481,loop:0,footDrift,maxStep,kneeDegrees:[kneeMin,kneeMax],bottomHoldSeconds:1};
}
