import assert from 'node:assert/strict';
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.min(1,Math.max(-1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
export function checkPoses(id,poses){
 assert.equal(poses.length,481);const first=poses[0].joints,peak=poses[240].joints;assert.deepEqual(first,poses[480].joints,'loop');
 let maxStep=0,gripError=0,minAngle=180,maxAngle=0;
 for(let f=0;f<=480;f++){
  const j=poses[f].joints;assert.equal(poses[f].frame,f);assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));
  for(let i=0;i<2;i++){const side=i===0?'L':'R';gripError=Math.max(gripError,distance(j.grips[i],j.targets[i]));const elbow=angle(j['upperarm01.'+side],j['lowerarm01.'+side],j['wrist.'+side]);minAngle=Math.min(minAngle,elbow);maxAngle=Math.max(maxAngle,elbow);assert.ok(elbow>30&&elbow<177,'elbow range');if(id!=='hip-adduction-machine')for(const n of ['foot','toe2-1'])assert.ok(distance(j[n+'.'+side],first[n+'.'+side])<1e-8,'planted feet');else{assert.ok(distance(j.grips[i],first.grips[i])<1e-8,'fixed machine grips');assert.ok(Math.abs(angle(j['upperleg01.'+side],j['lowerleg01.'+side],j['foot.'+side])-90)<.001,'bent seated knees');}}
  if(f)for(const key of Object.keys(j).filter(k=>k!=='grips'&&k!=='targets'))maxStep=Math.max(maxStep,distance(j[key],poses[f-1].joints[key]));
  for(const n of ['root','head','spine01'])assert.ok(distance(j[n],first[n])<1e-8,'stable torso');
  if(id==='kettlebell-press')assert.ok(distance(j['wrist.R'],first['wrist.R'])<1e-8,'resting arm');
 }
 assert.ok(gripError<1e-8);assert.ok(maxStep<.16,'continuous motion');for(let f=210;f<=270;f++)assert.deepEqual(poses[f].joints,peak,'one second peak hold');
 if(id==='close-grip-lat-pulldown'){assert.ok(first.grips[0][1]-peak.grips[0][1]>5,'pulldown range');assert.ok(maxAngle>155&&minAngle>60&&minAngle<85,'long top and tucked bottom');assert.ok(distance(first.grips[0],first.grips[1])<2,'narrow grip');}
 else if(id==='hip-adduction-machine'){const width=j=>distance(j['lowerleg01.L'],j['lowerleg01.R']);assert.ok(width(first)>7&&width(peak)>2.5&&width(peak)<3.2,'adduction without overlapping knees');}
 else {assert.ok(peak.grips[0][1]-first.grips[0][1]>5.5,'overhead press');assert.ok(angle(peak['upperarm01.L'],peak['lowerarm01.L'],peak['wrist.L'])>160,'extended top');}
 return {poseSamples:481,loop:0,maxStep,gripError,elbowDegrees:[minAngle,maxAngle],peakSeconds:1};
}
