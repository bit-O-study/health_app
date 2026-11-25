import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/pulldown-variants',read=p=>JSON.parse(readFileSync(p)),dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const e of read(base+'/batch.json').entries){const dir=base+'/native/'+e.id,p=read(dir+'/poses.json'),g=read(dir+'/geometry.json');assert.equal(p.length,481);assert.deepEqual(p[0].joints,p[480].joints);let gripError=0,maxStep=0;
 for(let f=0;f<=480;f++){const j=p[f].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const key of ['root','spine01','head','foot.L','foot.R','lowerleg01.L','lowerleg01.R'])assert.deepEqual(j[key],p[0].joints[key]);for(let s=0;s<2;s++){gripError=Math.max(gripError,dist(j.grips[s],j.targets[s]));assert.ok((e.grip==='pronated'?j.handAxes[s][0]*(s===0?-1:1):j.handAxes[s][2]*(s===0?1:-1))>.98);assert.ok(Math.abs(j.grips[s][0]-(s===0?1:-1)*e.halfWidth)<1e-6);}if(f)for(const key of ['wrist.L','wrist.R','lowerarm01.L','lowerarm01.R'])maxStep=Math.max(maxStep,dist(j[key],p[f-1].joints[key]));}
 assert.ok(gripError<1e-6&&maxStep<.1);assert.ok(Math.abs(p[0].joints.grips[0][1]-p[210].joints.grips[0][1]-e.stroke)<1e-6);for(let f=210;f<=270;f++)assert.deepEqual(p[f].joints,p[210].joints);
 assert.ok(g.every(x=>Math.abs(x.seatContactGap)<1e-6&&Math.abs(x.footGap)<1e-6&&Math.abs(x.thighGap-.02)<1e-6&&Math.abs(x.cableLength-g[0].cableLength)<1e-6));
 const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,gripError,maxStep,handleSpan:2*e.halfWidth,supportSamples:g.length,cableLength:g[0].cableLength};writeFileSync(dir+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(e.id,result);
}
