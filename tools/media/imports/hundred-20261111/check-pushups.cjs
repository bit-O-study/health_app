const fs=require('node:fs'),assert=require('node:assert/strict');
const base='tools/media/imports/hundred-20261111';
const ids=['decline-push-up','close-grip-push-up','wide-push-up'];
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const angle=(a,b,c)=>{const u=a.map((v,i)=>v-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
for(const id of ids){
 const out=base+'/native/'+id,poses=JSON.parse(fs.readFileSync(out+'/poses.json')),geometry=JSON.parse(fs.readFileSync(out+'/geometry.json'));
 const elbows=[],knees=[];let maxStep=0,gripError=0,footDrift=0;
 assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses[480].joints);
 for(let f=0;f<poses.length;f++){
  const j=poses[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));
  for(const s of ['L','R']){elbows.push(angle(...['upperarm01','lowerarm01','wrist'].map(n=>j[n+'.'+s])));knees.push(angle(...['upperleg01','lowerleg01','foot'].map(n=>j[n+'.'+s])));footDrift=Math.max(footDrift,distance(j['foot.'+s],poses[0].joints['foot.'+s]));}
  for(const k of Object.keys(j).filter(k=>!['grips','targets'].includes(k)))if(f)maxStep=Math.max(maxStep,distance(j[k],poses[f-1].joints[k]));
  for(let i=0;i<j.targets.length;i++)gripError=Math.max(gripError,distance(j.grips[i],j.targets[i]));
 }
 const report={id,poseSamples:481,loop:0,maxStep,gripError,footDrift,elbowDegrees:[Math.min(...elbows),Math.max(...elbows)],kneeDegrees:[Math.min(...knees),Math.max(...knees)],geometrySamples:geometry.length,handSupportGap:geometry.map(g=>g.handSupportGap),toeSupportGap:geometry.map(g=>g.toeSupportGap)};
 console.log(JSON.stringify(report));
 assert.ok(maxStep<.12,'continuous movement');assert.ok(gripError<1e-8,'fixed palms');assert.ok(footDrift<.01,'fixed foot support');assert.ok(Math.min(...knees)>179.9,'straight knees');assert.ok(Math.min(...elbows)>65&&Math.min(...elbows)<100,'lowered elbows');assert.ok(Math.max(...elbows)>170&&Math.max(...elbows)<179.99,'extended elbows');
 for(const g of geometry){assert.ok(g.floorClearance>-.00001,'body above floor');assert.ok(g.cloth>-7.9,'garment above floor');assert.ok(Math.abs(g.toeSupportGap)<.01,'toe support');assert.ok(g.handSupportGap>=0&&g.handSupportGap<.04,'palm support');}
 fs.writeFileSync(out+'/kinematics.json',JSON.stringify({...report,status:'numeric-checks-passed',limits:'Sampled support and joint checks, not full mesh collision validation.'},null,2));
}
