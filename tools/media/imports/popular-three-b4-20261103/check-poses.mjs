import assert from 'node:assert/strict';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
export function checkPoses(id,poses){
 assert.ok(['ohp','seated-cable-row','dips'].includes(id));assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses[480].joints);
 const start=poses[0].joints,top=poses[240].joints;
 let footDrift=0,gripError=0,elbowMin=180,elbowMax=0,clearance=Infinity;
 for(const {joints:j}of poses){
  assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite),'Nonfinite joint');
  for(const side of ['L','R']){
   const elbow=angle(...['upperarm01','lowerarm01','wrist'].map(n=>j[n+'.'+side]));elbowMin=Math.min(elbowMin,elbow);elbowMax=Math.max(elbowMax,elbow);
   if(id!=='dips')for(const n of ['foot','toe2-1'])footDrift=Math.max(footDrift,dist(j[n+'.'+side],start[n+'.'+side]));
   if(id!=='ohp')gripError=Math.max(gripError,dist(j['grip.'+side],j['target.'+side]));
  }
  if(id!=='dips')for(const n of ['root','spine01','head'])assert.ok(dist(j[n],start[n])<1e-8,'Torso swing');
  if(id==='ohp'){
   for(const g of j.grips)gripError=Math.max(gripError,Math.hypot(g[1]-j.bar[1],g[2]-j.bar[2]));
   clearance=Math.min(clearance,j.clearance);
  }
  if(id==='seated-cable-row'){
   assert.ok(Math.abs(j.handle[2]+j.stack[1]-.6)<1e-8,'Cable/stack mismatch');
   assert.ok(Math.abs(j.contacts[1]-start.contacts[1])<1e-8,'Seat contact drift');
  }
  if(id==='dips'){
   assert.ok(j.contacts[0]>-8.875,'Feet touch floor');
   for(const side of ['L','R'])assert.ok(dist(j['grip.'+side],start['grip.'+side])<1e-8,'Hands drift on bars');
   for(const n of ['root','head','foot.L','foot.R'])assert.ok(Math.hypot(j[n][0]-start[n][0],j[n][2]-start[n][2])<1e-8,'Body swings');
  }
 }
 assert.ok(footDrift<1e-8,'Foot sliding');assert.ok(gripError<1e-8,'Grip lost');assert.ok(elbowMin>35&&elbowMax<180,'Elbow range');
 if(id==='ohp'){assert.ok(elbowMax>160,'Overhead extension');assert.ok(top.bar[1]-start.bar[1]>5.8);assert.ok(top.bar[2]<1);assert.ok(clearance>0,'Bar hits central body');}
 if(id==='seated-cable-row'){
  assert.ok(elbowMax>150&&elbowMin<70,'Row range');assert.ok(start.handle[2]-top.handle[2]>3.8);
  for(let f=210;f<=270;f++)assert.ok(dist(poses[f].joints.handle,top.handle)<1e-8,'One-second squeeze');
 }
 if(id==='dips'){assert.ok(elbowMax>155&&elbowMin>80&&elbowMin<105,'Dip depth/extension');assert.ok(start.root[1]-top.root[1]>1.5,'Dip range');}
 return {poseSamples:481,loop:0,footDrift,gripError,elbowDegrees:[elbowMin,elbowMax],...(id==='ohp'?{centralBarClearance:clearance}:{}),...(id==='seated-cable-row'?{topHoldSeconds:1}:{})};
}
