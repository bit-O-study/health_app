const fs=require('fs'),assert=require('node:assert/strict');
const base='tools/media/imports/hundred-20261111',distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const id of ['double-kettlebell-press','dumbbell-front-squat']){
 const out=base+'/native/'+id,p=JSON.parse(fs.readFileSync(out+'/poses.json','utf8')),g=JSON.parse(fs.readFileSync(out+'/geometry.json','utf8'));
 assert.equal(p.length,481);assert.deepEqual(p[0].joints,p[480].joints);let maxStep=0,gripError=0;
 for(let f=0;f<p.length;f++){
  const j=p[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));
  for(const side of ['L','R'])assert.ok(distance(j['foot.'+side],p[0].joints['foot.'+side])<1e-8);
  for(let i=0;i<2;i++)gripError=Math.max(gripError,distance(j.grips[i],j.targets[i]));
  if(f)for(const key of ['root','head','wrist.L','wrist.R','lowerleg01.L','lowerleg01.R'])maxStep=Math.max(maxStep,distance(j[key],p[f-1].joints[key]));
  if(id==='double-kettlebell-press')assert.deepEqual(j.root,p[0].joints.root);
 }
 assert.ok(gripError<1e-8);assert.ok(maxStep<.22);assert.equal(g.length,17);assert.ok(g.every(x=>x.floorClearance>0));
 const range=Math.max(...p.map(x=>x.joints.root[1]))-Math.min(...p.map(x=>x.joints.root[1]));
 if(id==='double-kettlebell-press')for(const side of ['L','R'])assert.ok(p[240].joints['wrist.'+side][1]-p[0].joints['wrist.'+side][1]>5);
 else assert.ok(Math.abs(range-5.15)<1e-8);
 fs.writeFileSync(out+'/kinematics.json',JSON.stringify({id,poseSamples:481,loop:0,gripError,maxStep,rootVerticalRange:range,geometrySamples:17,status:'numeric-checks-passed'},null,2));
 const b=JSON.parse(fs.readFileSync(base+'/batch.json','utf8')),e=b.entries.find(e=>e.id===id);e.numericChecks='passed';e.status='preview-approved';delete e.error;fs.writeFileSync(base+'/batch.json',JSON.stringify(b,null,2));console.log(id+': passed');
}
