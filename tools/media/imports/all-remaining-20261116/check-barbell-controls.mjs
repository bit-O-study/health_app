import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/barbell-controls',read=p=>JSON.parse(readFileSync(p));
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const e of read(base+'/batch.json').entries){
 const dir=base+'/native/'+e.id,poses=read(dir+'/poses.json'),geometry=read(dir+'/geometry.json'),first=poses[0].joints;
 assert.equal(poses.length,481);assert.deepEqual(first,poses[480].joints);
 let gripError=0,footDrift=0;
 for(const {joints:j} of poses){assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));if(e.hold)assert.deepEqual(j,first);for(const s of ['L','R'])footDrift=Math.max(footDrift,distance(j['foot.'+s],first['foot.'+s]));
  if(e.original==='low-bar-squat'){for(let i=0;i<2;i++)gripError=Math.max(gripError,distance(j.grips[i],j.targets[i]));assert.ok(Math.abs(j['upperleg01.L'][1]-j['lowerleg01.L'][1])<1.5);}
  else {gripError=Math.max(gripError,j.barGripPlaneError,Math.abs(j.gripSpan-6.2));assert.ok(j.equipmentNonChestClearance>.02&&j.chestClearance>-.01&&j.headClearance>.1);assert.ok(j.backContactError<.05&&j.headSupportError<1e-6);assert.ok(j.equipmentBenchClearance>0&&j.equipmentBackPadClearance>0);assert.ok(j.wristDeviation.every(a=>a<35));}
 }
 assert.ok(gripError<1e-6&&footDrift<1e-6);
 if(e.original==='low-bar-squat')for(const g of geometry)assert.ok(g.floorClearance>=-.001&&g.gripError<1e-6);
 else assert.ok(Math.abs(Math.min(...poses.map(p=>p.joints.chestClearance)))<.01);
 if(!e.hold){for(let f=1;f<=180;f++)assert.ok(poses[f].joints.barCenter[1]<=poses[f-1].joints.barCenter[1]+1e-8);for(let f=180;f<=240;f++)assert.deepEqual(poses[f].joints,poses[180].joints);for(let f=241;f<=300;f++)assert.ok(poses[f].joints.barCenter[1]>=poses[f-1].joints.barCenter[1]-1e-8);for(let f=300;f<=480;f++)assert.deepEqual(poses[f].joints,first);assert.ok(first.barCenter[1]-poses[180].joints.barCenter[1]>4);}
 const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,gripError,footDrift,timing:e.hold?'8-second static hold':'3-second lowering, 1-second bottom, 1-second press, 3-second top'};writeFileSync(dir+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(e.id,result);
}
