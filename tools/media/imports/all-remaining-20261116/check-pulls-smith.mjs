import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {checkPoses as originalCheck} from '../popular-three-b14-20261109/check-poses.mjs';
import {checkPoses as cableCheck} from '../popular-three-b2-20261103/check-poses.mjs';
const base='tools/media/imports/all-remaining-20261116/pulls-smith',read=p=>JSON.parse(readFileSync(p));
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i])),rel=(p,r)=>p.map((x,i)=>x-r[i]);
for(const e of read(base+'/batch.json').entries){
 const dir=base+'/native/'+e.id,poses=read(dir+'/poses.json'),geometry=read(dir+'/geometry.json');let report;
 if(e.original==='lat-pulldown')report=cableCheck(e.original,poses);
 else if(e.original==='smith-bench-press'){report=originalCheck(e.original,poses);for(const g of geometry){assert.ok(g.barGripPlaneError<1e-6&&Math.abs(g.gripSpan-6.6)<1e-6);assert.ok(g.headSupportError<1e-6&&g.backContactError<.05);assert.ok(g.shaftTriangleGap>.2&&g.headTriangleGap>1);assert.ok(g.equipmentFrameGap>0&&g.equipmentBenchClearance>0&&g.equipmentBackPadClearance>0);}}
 else {
  assert.equal(poses.length,481);const first=poses[0].joints,peak=poses[60].joints;assert.deepEqual(first,poses[480].joints);let gripError=0,legDrift=0,maxStep=0;
  for(let f=0;f<=480;f++){const j=poses[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(let i=0;i<2;i++){gripError=Math.max(gripError,dist(j.grips[i],first.grips[i]),dist(j.grips[i],j.targets[i]));assert.ok(j.axes[i][0]*(i===0?1:-1)>.98);}for(const s of ['L','R'])for(const n of ['upperleg01','lowerleg01','foot','toe2-1'])legDrift=Math.max(legDrift,dist(rel(j[n+'.'+s],j.root),rel(first[n+'.'+s],first.root)));for(const n of ['head','spine01'])assert.ok(dist(rel(j[n],j.root),rel(first[n],first.root))<1e-8);assert.ok(Math.abs(j.root[0]-first.root[0])+Math.abs(j.root[2]-first.root[2])<1e-8);if(f)for(const n of ['root','head','lowerarm01.L','lowerarm01.R'])maxStep=Math.max(maxStep,dist(j[n],poses[f-1].joints[n]));}
  assert.ok(gripError<1e-8&&legDrift<1e-8&&maxStep<.25);assert.ok(peak.root[1]-first.root[1]>4&&peak.head[1]>11);assert.ok(Math.abs(dist(first.grips[0],first.grips[1])-5)<1e-8);
  for(let f=60;f<=120;f++)assert.deepEqual(poses[f].joints,peak);for(let f=121;f<=420;f++)assert.ok(poses[f].joints.root[1]<=poses[f-1].joints.root[1]+1e-8);for(let f=420;f<=480;f++)assert.deepEqual(poses[f].joints,first);for(const g of geometry)assert.ok(g.barBodyGap>0);assert.ok(geometry[2].jawY>11);
  report={poseSamples:481,loopError:0,gripError,legDrift,maxStep,loweringSeconds:5};
 }
 writeFileSync(dir+'/kinematics.json',JSON.stringify({status:'numeric-checks-passed',...report},null,2)+'\n');console.log(e.id,report);
}
