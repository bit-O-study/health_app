import assert from 'node:assert/strict';
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.min(1,Math.max(-1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
export function checkPoses(id,poses){
 assert.equal(poses.length,481);const first=poses[0].joints,peak=poses[240].joints;assert.deepEqual(first,poses[480].joints,'loop');
 let maxStep=0,gripError=0,minAngle=180,maxAngle=0;
 for(let f=0;f<=480;f++){
  const j=poses[f].joints;assert.equal(poses[f].frame,f);assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));
  for(let i=0;i<2;i++){const side=i===0?'L':'R';gripError=Math.max(gripError,distance(j.grips[i],j.targets[i]));
   const elbow=angle(j['upperarm01.'+side],j['lowerarm01.'+side],j['wrist.'+side]);minAngle=Math.min(minAngle,elbow);maxAngle=Math.max(maxAngle,elbow);assert.ok(elbow>80&&elbow<177,'elbow range');
   if(id!=='reverse-grip-pushdown')assert.ok(distance(j.grips[i],first.grips[i])<1e-8,'fixed support grips');
   else for(const n of ['upperarm01','lowerarm01','foot','toe2-1'])assert.ok(distance(j[n+'.'+side],first[n+'.'+side])<1e-8,'stable elbow and foot');
  }
  if(f)for(const key of Object.keys(j).filter(k=>k!=='grips'&&k!=='targets'))maxStep=Math.max(maxStep,distance(j[key],poses[f-1].joints[key]));
  if(id!=='chest-dip')for(const n of ['root','head','spine01'])assert.ok(distance(j[n],first[n])<1e-8,'stable torso');
 }
 assert.ok(gripError<1e-8);assert.ok(maxStep<.16,'continuous motion');
 for(let f=210;f<=270;f++)assert.deepEqual(poses[f].joints,peak,'one second peak hold');
 if(id==='chest-dip'){assert.ok(maxAngle>150,'extended top');assert.ok(minAngle>=85&&minAngle<100,'controlled bottom depth');assert.ok(first.root[1]-peak.root[1]>1.4,'body lowers');}
 else if(id==='hanging-knee-raise'){assert.ok(peak['lowerleg01.L'][1]>peak['upperleg01.L'][1]+1,'knees above hips');assert.ok(angle(peak['upperleg01.L'],peak['lowerleg01.L'],peak['foot.L'])>80&&angle(peak['upperleg01.L'],peak['lowerleg01.L'],peak['foot.L'])<100,'bent knees');assert.ok(minAngle>165,'long hanging arms');}
 else {assert.ok(first.grips[0][1]-peak.grips[0][1]>3,'press downward');assert.ok(minAngle>90&&minAngle<110&&maxAngle>165,'extension range');}
 return {poseSamples:481,loop:0,maxStep,gripError,elbowDegrees:[minAngle,maxAngle],peakSeconds:1};
}
