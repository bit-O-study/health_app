import assert from 'node:assert/strict';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
export function checkGeometry(samples){
 assert.equal(samples.length,17);let minimumClearance=Infinity,maximumBackGap=0;
 for(const {metrics:m} of samples){
  assert.ok(Math.abs(m.soleMinY+7.751375)<1e-5,'Feet leave floor');
  assert.ok(m.backContactError<.03,'Back leaves pad');maximumBackGap=Math.max(maximumBackGap,m.backContactError);
  if('headSupportError' in m)assert.ok(m.headSupportError<1e-8,'Head leaves support');
  for(const key of ['equipmentBodyClearance','equipmentBenchClearance','equipmentBackPadClearance','equipmentHeadPadClearance','headClearance','dumbbellPairClearance'])if(key in m){assert.ok(m[key]>.1,'Equipment contact: '+key);minimumClearance=Math.min(minimumClearance,m[key]);}
 }
 return {geometrySamples:17,minimumSampledClearance:minimumClearance,maximumBackGap};
}
export function checkPoses(id,poses){
 assert.ok(['chest-fly','incline-curl','skull-crusher'].includes(id));assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses[480].joints);
 const start=poses[0].joints,top=poses[240].joints;let footDrift=0,maxStep=0,elbowMin=180,elbowMax=0,pairDistance=Infinity;
 for(let f=0;f<poses.length;f++){
  const j=poses[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));
  for(const n of ['root','spine01','head'])assert.ok(dist(j[n],start[n])<1e-8,'Torso swing');
  pairDistance=Math.min(pairDistance,dist(j.grips[0],j.grips[1]));
  for(const side of ['L','R']){
   for(const n of ['foot','toe2-1'])footDrift=Math.max(footDrift,dist(j[n+'.'+side],start[n+'.'+side]));
   const names=['upperarm01','lowerarm01','wrist'].map(n=>n+'.'+side),elbow=angle(...names.map(n=>j[n]));elbowMin=Math.min(elbowMin,elbow);elbowMax=Math.max(elbowMax,elbow);
   if(f)for(const n of names)maxStep=Math.max(maxStep,dist(j[n],poses[f-1].joints[n]));
   if(id!=='chest-fly')assert.ok(dist(j['lowerarm01.'+side],start['lowerarm01.'+side])<1e-8,'Upper arm drifts');
   if(id==='incline-curl')assert.ok(j.axes[side==='L'?0:1][0]*(side==='L'?1:-1)>.9,'Supinated grip lost');
  }
 }
 assert.ok(footDrift<1e-8,'Foot sliding');assert.ok(maxStep<.2,'Motion jump');assert.ok(pairDistance>2.7,'Dumbbells overlap');
 if(id==='chest-fly'){
  assert.ok(elbowMin>155&&elbowMax<165&&elbowMax-elbowMin<1e-6,'Fly elbow angle changes');
  assert.ok(dist(start.grips[0],start.grips[1])-dist(top.grips[0],top.grips[1])>7,'Fly range');
 }
 if(id==='incline-curl')assert.ok(elbowMin>50&&elbowMin<85&&elbowMax>165,'Curl range');
 if(id==='skull-crusher')assert.ok(elbowMin>75&&elbowMin<100&&elbowMax>165,'Extension range');
 assert.ok(top['wrist.L'][1]-start['wrist.L'][1]>2.5,'Motion range');
 for(let f=210;f<=270;f++)assert.ok(dist(poses[f].joints['wrist.L'],top['wrist.L'])<1e-8,'One-second pause');
 return {poseSamples:481,loop:0,footDrift,maxStep,elbowDegrees:[elbowMin,elbowMax],minimumGripSeparation:pairDistance,topHoldSeconds:1};
}
