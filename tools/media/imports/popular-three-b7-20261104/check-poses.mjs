import assert from 'node:assert/strict';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
export function checkPoses(id,poses){
 assert.ok(['shrug','reverse-curl','cable-curl'].includes(id));assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses[480].joints);
 const start=poses[0].joints,top=poses[240].joints;let footDrift=0,maxStep=0,elbowMin=180,elbowMax=0,gripError=0;
 for(let f=0;f<poses.length;f++){
  const j=poses[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));
  for(const n of ['root','spine01','head'])assert.ok(dist(j[n],start[n])<1e-8,'Torso swing');
  for(const [i,side] of ['L','R'].entries()){
   for(const n of ['foot','toe2-1'])footDrift=Math.max(footDrift,dist(j[n+'.'+side],start[n+'.'+side]));
   const names=['upperarm01','lowerarm01','wrist'].map(n=>n+'.'+side),elbow=angle(...names.map(n=>j[n]));elbowMin=Math.min(elbowMin,elbow);elbowMax=Math.max(elbowMax,elbow);
   if(f)for(const n of names)maxStep=Math.max(maxStep,dist(j[n],poses[f-1].joints[n]));
   if(id==='shrug'){
    for(const n of names)assert.ok(Math.hypot(j[n][0]-start[n][0],j[n][2]-start[n][2])<1e-8,'Shoulder rolling');
   }else{
    assert.ok(dist(j['lowerarm01.'+side],start['lowerarm01.'+side])<1e-8,'Elbow travels');
    const expected=(i===0?1:-1)*(id==='reverse-curl'?-1:1);
    assert.ok(Math.abs(j.axes[i][0]-expected)<1e-8,'Wrong grip orientation');
   }
  }
  if(id==='cable-curl'){
   for(const g of j.grips)gripError=Math.max(gripError,Math.hypot(g[1]-j.barCenter[1],g[2]-j.barCenter[2]));
   assert.ok(Math.abs(j.stack[1]-start.stack[1]-(j.cableLength-start.cableLength))<1e-8,'Cable/stack mismatch');
  }
 }
 assert.ok(footDrift<1e-8,'Foot sliding');assert.ok(maxStep<.1,'Motion jump');assert.ok(gripError<1e-8,'Bar grip lost');
 if(id==='shrug'){assert.ok(elbowMax-elbowMin<1e-8&&elbowMin>165,'Shrug elbow bending');assert.ok(Math.abs(top['upperarm01.L'][1]-start['upperarm01.L'][1]-.65)<1e-8,'Shrug elevation');}
 else assert.ok(elbowMin>60&&elbowMin<85&&elbowMax>160,'Curl range');
 for(let f=210;f<=270;f++)assert.ok(dist(poses[f].joints['wrist.L'],top['wrist.L'])<1e-8,'One-second pause');
 return {poseSamples:481,loop:0,footDrift,maxStep,elbowDegrees:[elbowMin,elbowMax],barGripError:gripError,topHoldSeconds:1,...(id==='shrug'?{shoulderElevation:.65}:{})};
}
