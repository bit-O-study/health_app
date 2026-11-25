import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/stance-leg-presses',read=p=>JSON.parse(readFileSync(p)),dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
for(const e of read(base+'/batch.json').entries){const dir=base+'/native/'+e.id,p=read(dir+'/poses.json'),g=read(dir+'/geometry.json'),span=e.id.startsWith('wide')?4.8:e.id.startsWith('close')?1.6:3.2;let gripError=0,maxStep=0;const knees=[];
 assert.equal(p.length,481);assert.deepEqual(p[0].joints,p[480].joints);
 for(let f=0;f<=480;f++){const j=p[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const key of ['root','head','upperleg01.L','upperleg01.R'])assert.deepEqual(j[key],p[0].joints[key]);assert.ok(Math.abs(j['foot.L'][0]-j['foot.R'][0]-span)<1e-10);for(const s of ['L','R']){gripError=Math.max(gripError,dist(j['grip.'+s],j['target.'+s]));knees.push(angle(j['upperleg01.'+s],j['lowerleg01.'+s],j['foot.'+s]));}if(f)maxStep=Math.max(maxStep,dist(j.plate,p[f-1].joints.plate));}
 assert.ok(gripError<1e-7&&maxStep<.1);assert.ok(Math.abs(Math.min(...knees)-90)<1e-6&&Math.abs(Math.max(...knees)-165)<1e-6);
 for(const x of g){assert.ok(x.crossbarClearance>.4);for(const foot of Object.values(x.feet)){assert.ok(Math.abs(foot.supportGap-.015)<1e-6);assert.ok(foot.tMin>-2.5&&foot.tMax<2.5);assert.ok(foot.xMin>-x.plateHalfWidth&&foot.xMax<x.plateHalfWidth);}assert.ok(x.feet.L.xMin-x.feet.R.xMax>.1);}
 const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,gripError,maxStep,ankleSpan:span,kneeRange:[Math.min(...knees),Math.max(...knees)],supportSamples:g.length};writeFileSync(dir+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(e.id,result);
}
