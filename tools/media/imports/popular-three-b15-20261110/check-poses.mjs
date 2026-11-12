import assert from 'node:assert/strict';
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.min(1,Math.max(-1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
export function checkPoses(id,poses){
 assert.equal(poses.length,481);const first=poses[0].joints,peak=poses[240].joints;assert.deepEqual(first,poses[480].joints,'loop');
 let maxStep=0,footDrift=0,minAngle=180,maxAngle=0;
 for(let f=0;f<=480;f++){
  const j=poses[f].joints;assert.equal(poses[f].frame,f);assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));
  for(const side of ['L','R']){
   for(const n of ['foot','toe2-1'])footDrift=Math.max(footDrift,distance(j[n+'.'+side],first[n+'.'+side]));
   const elbow=angle(j['upperarm01.'+side],j['lowerarm01.'+side],j['wrist.'+side]);minAngle=Math.min(minAngle,elbow);maxAngle=Math.max(maxAngle,elbow);
   if(id==='cable-fly')assert.ok(Math.abs(elbow-160)<.001,'fixed slight elbow bend');
  }
  if(f)for(const key of Object.keys(j).filter(k=>k!=='grips'&&k!=='axes'))maxStep=Math.max(maxStep,distance(j[key],poses[f-1].joints[key]));
  if(id!=='bulgarian-split-squat')for(const n of ['root','head','spine01'])assert.ok(distance(j[n],first[n])<1e-8,'stable torso');
  if(id==='one-arm-dumbbell-row')assert.ok(distance(j['wrist.R'],first['wrist.R'])<1e-8,'fixed support hand');
 }
 assert.ok(footDrift<1e-8,'planted feet');assert.ok(maxStep<.15,'continuous motion');
 for(let f=210;f<=270;f++)assert.deepEqual(poses[f].joints,peak,'one second peak hold');
 if(id==='bulgarian-split-squat'){
  assert.ok(first.root[1]-peak.root[1]>2.9,'squat depth');assert.ok(Math.abs(peak['upperleg01.L'][1]-peak['lowerleg01.L'][1])<1.1,'front thigh near parallel');
  assert.ok(first['foot.R'][1]-first['foot.L'][1]>3,'elevated rear foot');
 }else if(id==='one-arm-dumbbell-row'){
  assert.ok(angle(first['upperarm01.L'],first['lowerarm01.L'],first['wrist.L'])>155,'bottom arm extends');
  assert.ok(peak.grips[0][1]-first.grips[0][1]>2.3,'row lift');assert.ok(first.grips[0][2]-peak.grips[0][2]>2,'pull toward hip');
 }else{
  assert.ok(distance(first.grips[0],first.grips[1])>12,'open arms');const gap=distance(peak.grips[0],peak.grips[1]);assert.ok(gap>.7&&gap<1.6,'close hands without overlap');
 }
 return {poseSamples:481,loop:0,footDrift,maxStep,elbowDegrees:[minAngle,maxAngle],peakSeconds:1};
}
