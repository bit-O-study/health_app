import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/slow-controls',read=p=>JSON.parse(readFileSync(p)),dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const e of read(base+'/batch.json').entries){
 const dir=base+'/native/'+e.id,p=read(dir+'/poses.json'),g=read(dir+'/geometry.json'),press=e.equipment==='barbell';
 assert.equal(p.length,481);assert.deepEqual(p[0].joints,p[480].joints);let supportDrift=0,maxStep=0;
 for(let i=0;i<p.length;i++){const j=p[i].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const s of ['L','R'])for(const n of ['lowerleg01','foot'])supportDrift=Math.max(supportDrift,dist(j[n+'.'+s],p[0].joints[n+'.'+s]));if(i)for(const key of Object.keys(j))if(key!=='grips')maxStep=Math.max(maxStep,dist(j[key],p[i-1].joints[key]));}
 assert.ok(supportDrift<1e-5);assert.ok(maxStep<(press?.12:.5));
 const bottom=press?180:300,end=press?240:360;
 for(let f=bottom;f<=end;f++)assert.deepEqual(p[f].joints,p[bottom].joints);
 for(let f=420;f<=480;f++)assert.deepEqual(p[f].joints,p[0].joints);
 if(press){
  for(let f=1;f<=180;f++)assert.ok(p[f].joints.barCenter[1]>=p[f-1].joints.barCenter[1]-1e-8);
  for(let f=241;f<=420;f++)assert.ok(p[f].joints.barCenter[1]<=p[f-1].joints.barCenter[1]+1e-8);
  assert.ok(p[180].joints.barCenter[1]-p[0].joints.barCenter[1]>5.8);
  assert.ok(g.every(x=>x.equipmentBodyClearance>.05&&Math.abs(x.bodyFloorGap)<1e-6&&Math.abs(x.heelFloorGap)<1e-6&&x.barGripError<1e-6&&Math.abs(x.gripSpan-7.4)<1e-6));
 }else{
  for(let f=1;f<=300;f++)assert.ok(p[f].joints.head[2]>=p[f-1].joints.head[2]-1e-8);
  assert.ok(p[300].joints.head[2]-p[0].joints.head[2]>6);
  assert.ok(g.every(x=>x.body>=-7.11&&x.knees>=-7.09&&x.knees+7.09<.08&&-5.87-x.ankleMax>0&&-5.87-x.ankleMax<.05));
 }
 const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,supportDrift,maxStep,supportSamples:g.length,timing:e.recipe.criteria};writeFileSync(dir+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(e.id,result);
}
