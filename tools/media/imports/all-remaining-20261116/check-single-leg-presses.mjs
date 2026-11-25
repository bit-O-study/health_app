import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/single-leg-presses',read=p=>JSON.parse(readFileSync(p)),dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
for(const e of read(base+'/batch.json').entries){const dir=base+'/native/'+e.id,p=read(dir+'/poses.json'),g=read(dir+'/geometry.json');let gripError=0,maxStep=0;const knees=[];
 assert.equal(p.length,481);assert.deepEqual(p[0].joints,p[480].joints);
 for(let f=0;f<=480;f++){const j=p[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const key of ['root','head','upperleg01.L','upperleg01.R','lowerleg01.R','foot.R','toe2-1.R'])assert.deepEqual(j[key],p[0].joints[key]);for(const s of ['L','R'])gripError=Math.max(gripError,dist(j['grip.'+s],j['target.'+s]));if(f)maxStep=Math.max(maxStep,dist(j.plate,p[f-1].joints.plate));knees.push(angle(j['upperleg01.L'],j['lowerleg01.L'],j['foot.L']));}
 assert.ok(gripError<1e-7&&maxStep<.1);assert.ok(Math.abs(Math.min(...knees)-95)<1e-6&&Math.abs(Math.max(...knees)-165)<1e-6);
 assert.ok(g.every(x=>Math.abs(x.forefootGap-.015)<1e-6&&x.toeMin>-2.5&&x.toeMax<2.5&&Math.abs(x.idleSupportGap-.015)<1e-6&&x.rightPlateGap>3.5&&x.crossbarClearance>.4));
 const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,gripError,maxStep,supportSamples:g.length,idleFootMotion:0,kneeRange:[Math.min(...knees),Math.max(...knees)],minimumIdlePlateGap:Math.min(...g.map(x=>x.rightPlateGap))};writeFileSync(dir+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(e.id,result);
}
