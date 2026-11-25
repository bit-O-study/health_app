import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/dynamic-hip/native/dynamic-hip-flexor-stretch',read=p=>JSON.parse(readFileSync(p)),poses=read(base+'/poses.json'),g=read(base+'/geometry.json');
assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses.at(-1).joints);
let maxStep=0,supportDrift=0;
for(let i=0;i<poses.length;i++){
 const j=poses[i].joints;assert.ok(Object.values(j).flat().every(Number.isFinite));
 for(const n of ['foot.L','foot.R','lowerleg01.R'])supportDrift=Math.max(supportDrift,Math.hypot(...j[n].map((x,k)=>x-poses[0].joints[n][k])));
 if(i)for(const n of Object.keys(j))maxStep=Math.max(maxStep,Math.hypot(...j[n].map((x,k)=>x-poses[i-1].joints[n][k])));
 assert.ok(Math.abs(j.head[0]-j.root[0])<1e-10);
}
assert.ok(supportDrift<1e-10);assert.ok(maxStep<.03);
const hipTravel=poses[240].joints.root[2]-poses[0].joints.root[2];assert.ok(hipTravel>1&&hipTravel<1.2);
for(const x of g){assert.ok(x.floorClearance>.01&&x.floorClearance<.02);assert.ok(x.footFloorGaps.every(v=>v>.01&&v<.06));assert.ok(x.kneeR+7.9>.01&&x.kneeR+7.9<.06);assert.ok(x.frontThighHandGaps.every(v=>v<.03));assert.ok(x.handHandGap>.1);assert.ok(x.cloth+7.9>0);}
const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,supportDrift,maxStep,hipTravel,frontThighHandGaps:g.map(x=>x.frontThighHandGaps),rearKneeFloorGaps:g.map(x=>x.kneeR+7.9)};
writeFileSync(base+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(result);
