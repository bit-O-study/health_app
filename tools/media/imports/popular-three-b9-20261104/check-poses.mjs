import assert from 'node:assert/strict';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
export function checkPoses(id,poses){
 assert.ok(['concentration-curl','face-pull','cable-upright-row'].includes(id));assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses[480].joints);
 const start=poses[0].joints,top=poses[240].joints;let footDrift=0,maxStep=0,elbowMin=180,elbowMax=0;
 const gripWidth=dist(start.grips[0],start.grips[1]);
 for(let f=0;f<poses.length;f++){
  const j=poses[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite),'Nonfinite pose');
  for(const n of ['root','spine01','head'])assert.ok(dist(j[n],start[n])<1e-8,'Torso swing');
  for(const side of ['L','R']){
   for(const n of ['foot','toe2-1'])footDrift=Math.max(footDrift,dist(j[n+'.'+side],start[n+'.'+side]));
   const names=['upperarm01','lowerarm01','wrist'].map(n=>n+'.'+side),elbow=angle(...names.map(n=>j[n]));
   if(side==='L'){elbowMin=Math.min(elbowMin,elbow);elbowMax=Math.max(elbowMax,elbow);}
   if(f)for(const n of names)maxStep=Math.max(maxStep,dist(j[n],poses[f-1].joints[n]));
  }
  if(id==='concentration-curl'){
   assert.ok(dist(j['lowerarm01.L'],start['lowerarm01.L'])<1e-8,'Supported elbow moves');
   assert.ok(dist(j['wrist.R'],start['wrist.R'])<1e-8,'Support hand moves');
   assert.ok(dist(j['lowerarm01.L'],j['lowerleg01.L'])<1.1,'Elbow leaves inner knee support');
   assert.ok(j.axes[0][0]>.99,'Supinated grip lost');
  }else{
   assert.ok(Math.abs(j.stack[1]-start.stack[1]-(j.cableLength-start.cableLength))<1e-8,'Cable/stack mismatch');
   if(id==='face-pull')for(const length of j.ropeLengths)assert.ok(Math.abs(length-4.5)<1e-8,'Rope stretches');
   else{
    assert.ok(Math.abs(dist(j.grips[0],j.grips[1])-gripWidth)<1e-8,'Bar width changes');
    for(const side of ['L','R'])assert.ok(j['lowerarm01.'+side][1]<j['upperarm01.'+side][1],'Elbow above shoulder');
    assert.ok(j.axes[0][0]<-.99&&j.axes[1][0]>.99,'Pronated grip lost');
   }
  }
 }
 assert.ok(footDrift<1e-8,'Foot sliding');assert.ok(maxStep<.2,'Motion jump');
 if(id==='concentration-curl'){assert.ok(elbowMin<70&&elbowMin>45&&elbowMax>150,'Curl range');assert.ok(top['wrist.L'][1]-start['wrist.L'][1]>3.5,'Curl lift');}
 if(id==='face-pull'){
  assert.ok(start['wrist.L'][2]-top['wrist.L'][2]>3,'Insufficient pull');assert.ok(top['wrist.L'][0]-start['wrist.L'][0]>1.4,'Hands must separate');
  assert.ok(top['wrist.L'][1]>7&&top['wrist.L'][1]<8.5,'Hands must reach face height');assert.ok(top['lowerarm01.L'][0]>top['wrist.L'][0],'Elbows must flare');
 }
 if(id==='cable-upright-row')assert.ok(top.barCenter[1]-start.barCenter[1]>3,'Insufficient bar lift');
 for(let f=210;f<=270;f++)assert.ok(dist(poses[f].joints['wrist.L'],top['wrist.L'])<1e-8,'One-second pause');
 return {poseSamples:481,loop:0,footDrift,maxStep,elbowDegrees:[elbowMin,elbowMax],topHoldSeconds:1};
}
