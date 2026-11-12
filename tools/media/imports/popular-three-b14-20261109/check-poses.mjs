import assert from 'node:assert/strict';
const d=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const relative=(p,r)=>p.map((x,i)=>x-r[i]);
export function checkPoses(id,poses){
 assert.ok(['chin-up','wide-grip-pull-up','smith-bench-press'].includes(id));assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses[480].joints);
 const start=poses[0].joints,peak=poses[240].joints,smith=id==='smith-bench-press';let maxStep=0,gripError=0,legDrift=0;
 for(let f=0;f<poses.length;f++){
  const j=poses[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite),'Nonfinite pose');
  for(const n of ['head','spine01'])assert.ok(d(relative(j[n],j.root),relative(start[n],start.root))<1e-8,'Trunk swing');
  for(const side of ['L','R'])for(const n of ['upperleg01','lowerleg01','foot','toe2-1'])legDrift=Math.max(legDrift,d(relative(j[n+'.'+side],j.root),relative(start[n+'.'+side],start.root)));
  for(let i=0;i<2;i++){
   if(smith){assert.ok(Math.abs(j.grips[i][2]-start.grips[i][2])<1e-8,'Bar left vertical rail');assert.ok(d(j.root,start.root)<1e-8,'Bench body moved');}
   else{
    gripError=Math.max(gripError,d(j.grips[i],start.grips[i]),d(j.grips[i],j.targets[i]));
    assert.ok(Math.abs(j.root[0]-start.root[0])+Math.abs(j.root[2]-start.root[2])<1e-8,'Body swinging');
    // Raw index-to-little-finger axis is oblique to the palm basis (~10.6 degrees).
    const expected=(i===0?1:-1)*(id==='chin-up'?1:-1);assert.ok(j.axes[i][0]*expected>.98,'Wrong grip orientation');
   }
  }
  if(f){for(const n of ['root','head','wrist.L','wrist.R','lowerarm01.L','lowerarm01.R'])maxStep=Math.max(maxStep,d(j[n],poses[f-1].joints[n]));for(let i=0;i<2;i++)maxStep=Math.max(maxStep,d(j.grips[i],poses[f-1].joints.grips[i]));}
 }
 assert.ok(legDrift<1e-8,'Leg movement');assert.ok(gripError<1e-8,'Hand slides on bar');assert.ok(maxStep<.15,'Motion discontinuity');
 if(smith)assert.ok(start.grips[0][1]-peak.grips[0][1]>3,'Insufficient press depth');
 else {assert.ok(peak.root[1]-start.root[1]>4,'Insufficient pull height');assert.ok(peak.head[1]>11,'Head not above bar');assert.ok(Math.abs(d(start.grips[0],start.grips[1])-(id==='chin-up'?5:8.4))<1e-8,'Wrong grip width');
  const a=start['upperarm01.L'],b=start['lowerarm01.L'],c=start['wrist.L'],u=d(a,b),l=d(b,c),span=d(a,c),elbow=Math.acos((u*u+l*l-span*span)/(2*u*l))*180/Math.PI;assert.ok(elbow>160&&elbow<175,'Insufficient bottom extension');
 }
 for(let f=210;f<=270;f++)assert.ok(d(poses[f].joints.root,peak.root)+d(poses[f].joints.grips[0],peak.grips[0])<1e-8,'Peak hold missing');
 return {poseSamples:481,loop:0,maxStep,gripError,legDrift,holdSeconds:1};
}
