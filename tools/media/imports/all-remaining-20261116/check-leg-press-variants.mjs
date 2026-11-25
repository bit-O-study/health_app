import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/leg-press-variants',read=p=>JSON.parse(readFileSync(p)),dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
for(const e of read(base+'/batch.json').entries){const dir=base+'/native/'+e.id,p=read(dir+'/poses.json'),first=p[0].joints,partial=e.id==='partial-leg-press',knees=[];let gripError=0,maxStep=0;
 assert.equal(p.length,481);assert.deepEqual(first,p[480].joints);
 for(let f=0;f<=480;f++){const j=p[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));assert.deepEqual(j.root,first.root);assert.deepEqual(j.head,first.head);for(const s of ['L','R']){gripError=Math.max(gripError,dist(j['grip.'+s],j['target.'+s]));knees.push(angle(j['upperleg01.'+s],j['lowerleg01.'+s],j['foot.'+s]));}assert.ok(Math.abs(j.plate[1]-first.plate[1]-(j.plate[2]-first.plate[2]))<1e-7);if(f)maxStep=Math.max(maxStep,dist(j.plate,p[f-1].joints.plate));}
 assert.ok(gripError<1e-7&&maxStep<.1);assert.ok(Math.abs(Math.min(...knees)-(partial?130:95))<1e-6);assert.ok(Math.abs(Math.max(...knees)-165)<1e-6);
 const targets=partial?[[0,130],[210,165],[270,165],[480,130]]:[[0,165],[120,95],[210,130],[300,95],[450,165],[480,165]];
 for(const [f,a] of targets)assert.ok(Math.abs(knees[f*2]-a)<1e-6);
 const report={status:'numeric-checks-passed',poseSamples:481,loopError:0,gripError,maxStep,kneeDegrees:[Math.min(...knees),Math.max(...knees)],timingTargets:targets};writeFileSync(dir+'/kinematics.json',JSON.stringify(report,null,2)+'\n');console.log(e.id,report);
}
