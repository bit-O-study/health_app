import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/single-calf-presses',read=p=>JSON.parse(readFileSync(p)),dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const e of read(base+'/batch.json').entries){const dir=base+'/native/'+e.id,p=read(dir+'/poses.json'),g=read(dir+'/geometry.json');let gripError=0,maxStep=0;
 assert.equal(p.length,481);assert.deepEqual(p[0].joints,p[480].joints);
 for(let f=0;f<=480;f++){const j=p[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const key of ['root','head','upperleg01.L','upperleg01.R','lowerleg01.L','lowerleg01.R','foot.L','foot.R','toe2-1.R'])assert.deepEqual(j[key],p[0].joints[key]);for(const s of ['L','R'])gripError=Math.max(gripError,dist(j['grip.'+s],j['target.'+s]));if(f)maxStep=Math.max(maxStep,dist(j.plate,p[f-1].joints.plate));}
 assert.ok(gripError<1e-7&&maxStep<.1);assert.ok(dist(p[0].joints.plate,p[240].joints.plate)>.5);assert.ok(dist(p[0].joints['toe2-1.L'],p[240].joints['toe2-1.L'])>.5);
 assert.ok(g.every(x=>Math.abs(x.forefootGap-.015)<1e-6&&x.heelEdge<-1&&x.contactT>-1&&x.contactT<1&&Math.abs(x.idleSupportGap-.015)<1e-6&&x.rightPlateGap>5&&x.crossbarClearance>.4));
 const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,gripError,maxStep,supportSamples:g.length,idleFootMotion:0,workingFoot:'L',minimumIdlePlateGap:Math.min(...g.map(x=>x.rightPlateGap))};writeFileSync(dir+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(e.id,result);
}
