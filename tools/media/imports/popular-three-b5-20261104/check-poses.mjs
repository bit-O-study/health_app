import assert from 'node:assert/strict';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
export function checkPoses(id,poses){
 assert.ok(['dead-bug','bird-dog','reverse-crunch'].includes(id));assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses[480].joints);
 const start=poses[0].joints;let floorClearance=Infinity,maxStep=0,elbowMin=180,elbowMax=0;
 for(let i=0;i<poses.length;i++){
  const j=poses[i].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite),'Nonfinite joint');
  floorClearance=Math.min(floorClearance,j.contacts[0]-j.contacts[2]);
  for(const n of ['head','spine01'])assert.ok(dist(j[n],start[n])<1e-8,'Upper torso drift');
  if(id!=='reverse-crunch')assert.ok(dist(j.root,start.root)<1e-8,'Pelvis drift');
  for(const side of ['L','R']){
   const e=angle(...['upperarm01','lowerarm01','wrist'].map(n=>j[n+'.'+side]));elbowMin=Math.min(elbowMin,e);elbowMax=Math.max(elbowMax,e);
   if(i)for(const n of ['wrist','foot','lowerleg01'])maxStep=Math.max(maxStep,dist(j[n+'.'+side],poses[i-1].joints[n+'.'+side]));
   if(id==='reverse-crunch'){
    assert.ok(dist(j['wrist.'+side],start['wrist.'+side])<1e-8,'Supporting hands drift');
    const k=angle(...['upperleg01','lowerleg01','foot'].map(n=>j[n+'.'+side]));assert.ok(Math.abs(k-90)<1e-6,'Knee angle changed');
   }
  }
  if(id!=='reverse-crunch'){
   const first=i%480<240,stableArm=first?'R':'L',stableLeg=first?'L':'R';
   assert.ok(dist(j['wrist.'+stableArm],start['wrist.'+stableArm])<1e-8,'Inactive arm drift');
   assert.ok(dist(j['lowerleg01.'+stableLeg],start['lowerleg01.'+stableLeg])<1e-8,'Inactive knee drift');
  }
 }
 assert.ok(floorClearance>-.03,'Body penetrates mat');assert.ok(maxStep<.16,'Discontinuous movement');assert.ok(elbowMin>145&&elbowMax<=180.001,'Elbow range');
 if(id==='reverse-crunch'){
  assert.ok(poses[240].joints.root[1]-start.root[1]>1.3,'No pelvic curl');
  for(let i=210;i<=270;i++)assert.ok(dist(poses[i].joints.root,poses[240].joints.root)<1e-8,'Top pause missing');
 }else for(const [f,arm,leg]of [[120,'L','R'],[360,'R','L']]){
  const j=poses[f].joints;assert.ok(dist(j['wrist.'+arm],start['wrist.'+arm])>5,'Arm reach missing');assert.ok(dist(j['foot.'+leg],start['foot.'+leg])>4,'Leg reach missing');
 }
 return {poseSamples:481,loop:0,floorClearance,maxStep,elbowDegrees:[elbowMin,elbowMax],...(id==='reverse-crunch'?{pelvicRise:poses[240].joints.root[1]-start.root[1],topHoldSeconds:1}:{alternatingSides:2})};
}
