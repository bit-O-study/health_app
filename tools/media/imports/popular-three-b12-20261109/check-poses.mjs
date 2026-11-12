import assert from 'node:assert/strict';
export function checkGeometry(id,samples){
 assert.ok(['preacher-curl','rear-delt-fly'].includes(id));assert.equal(samples.length,17);
 for(const s of samples){
  assert.ok(Object.values(s).every(Number.isFinite),'Nonfinite geometry');
  assert.ok(Math.abs(s.soleMinY+7.751375)<1e-5,'Foot contact lost');
  assert.ok(s.equipmentBodyClearance>.1&&s.equipmentBenchClearance>.1,'Dumbbell collision');
  if(id==='preacher-curl')assert.ok(s.bodyPad>0&&s.supportL>=0&&s.supportL<.03&&s.supportR>=0&&s.supportR<.03&&s.equipmentPad>.1,'Preacher support lost');
  else assert.ok(s.equipmentFloorClearance>.1,'Dumbbell hits floor');
 }
 return {samples:17,minimumBodyClearance:Math.min(...samples.map(s=>s.equipmentBodyClearance)),minimumBenchClearance:Math.min(...samples.map(s=>s.equipmentBenchClearance)),scope:'Sampled simplified surfaces, not full mesh collision certification'};
}
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
export function checkPoses(id,poses){
 assert.ok(['preacher-curl','rear-delt-fly','straight-arm-pulldown'].includes(id));assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses[480].joints);
 const start=poses[0].joints,top=poses[240].joints;let footDrift=0,maxStep=0,minElbow=180,maxElbow=0;
 for(let f=0;f<poses.length;f++){
  const j=poses[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite),'Nonfinite pose');
  for(const n of ['root','spine01','head'])assert.ok(dist(j[n],start[n])<1e-8,'Torso swing');
  for(const side of ['L','R']){
   for(const n of ['foot','toe2-1'])footDrift=Math.max(footDrift,dist(j[n+'.'+side],start[n+'.'+side]));
   const elbow=angle(...['upperarm01','lowerarm01','wrist'].map(n=>j[n+'.'+side]));minElbow=Math.min(minElbow,elbow);maxElbow=Math.max(maxElbow,elbow);
   assert.ok(dist(j['upperarm01.'+side],start['upperarm01.'+side])<1e-8,'Shoulder shrug');
   if(id==='preacher-curl')assert.ok(dist(j['lowerarm01.'+side],start['lowerarm01.'+side])<1e-8,'Supported elbow moves');
   else assert.ok(Math.abs(elbow-(id==='rear-delt-fly'?165:170))<1e-6,'Elbow angle changes');
  }
  if(id==='straight-arm-pulldown'){
   assert.ok(Math.abs(dist(...j.grips)-dist(...start.grips))<1e-8,'Bar stretches');
   assert.ok(Math.abs(j.stack[1]-start.stack[1]-(j.cableLength-start.cableLength))<1e-8,'Cable/stack mismatch');
   assert.ok(j.axes[0][0]<-.99&&j.axes[1][0]>.99,'Pronated bar grip lost');
  }
  if(f)for(const n of ['wrist.L','wrist.R','lowerarm01.L','lowerarm01.R'])maxStep=Math.max(maxStep,dist(j[n],poses[f-1].joints[n]));
 }
 assert.ok(footDrift<1e-8,'Foot sliding');assert.ok(maxStep<.2,'Motion jump');
 if(id==='preacher-curl'){assert.ok(minElbow>55&&minElbow<80&&maxElbow>160,'Curl range');assert.ok(top['wrist.L'][1]-start['wrist.L'][1]>3,'Insufficient curl');}
 if(id==='rear-delt-fly'){assert.ok(top['wrist.L'][0]-start['wrist.L'][0]>3,'Insufficient fly spread');assert.ok(top['wrist.L'][1]<=top['upperarm01.L'][1],'Fly above shoulders');}
 if(id==='straight-arm-pulldown'){assert.ok(start.barCenter[1]-top.barCenter[1]>6,'Insufficient pulldown');assert.ok(top.barCenter[1]<top.root[1]+.5,'Bar does not reach thighs');}
 for(let f=210;f<=270;f++)assert.ok(dist(poses[f].joints['wrist.L'],top['wrist.L'])<1e-8,'One-second top pause');
 return {poseSamples:481,loop:0,footDrift,maxStep,elbowDegrees:[minElbow,maxElbow],topHoldSeconds:1};
}
