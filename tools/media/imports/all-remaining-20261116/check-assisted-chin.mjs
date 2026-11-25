import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/assisted-chin',read=p=>JSON.parse(readFileSync(p)),dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const e of read(base+'/batch.json').entries){
 const dir=base+'/native/'+e.id,p=read(dir+'/poses.json'),g=read(dir+'/geometry.json');assert.equal(p.length,481);assert.deepEqual(p[0].joints,p[480].joints);let gripError=0,supportDrift=0,maxStep=0;
 for(let i=0;i<p.length;i++){const j=p[i].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const s of ['L','R']){gripError=Math.max(gripError,dist(j['grip.'+s],j['target.'+s]));supportDrift=Math.max(supportDrift,Math.abs((j['lowerleg01.'+s][1]-j.kneePad[1])-(p[0].joints['lowerleg01.'+s][1]-p[0].joints.kneePad[1])));for(const n of ['lowerleg01','foot']){assert.ok(Math.abs(j[n+'.'+s][0]-p[0].joints[n+'.'+s][0])<1e-6);assert.ok(Math.abs(j[n+'.'+s][2]-p[0].joints[n+'.'+s][2])<1e-6);}}for(let a=0;a<2;a++)assert.ok(j.handAxes[a][0]*(a===0?1:-1)>.98);if(i)for(const key of Object.keys(j).filter(k=>k!=='handAxes'))maxStep=Math.max(maxStep,dist(j[key],p[i-1].joints[key]));}
 assert.ok(gripError<1e-6&&supportDrift<1e-6&&maxStep<.1);
 for(let f=210;f<=270;f++)assert.deepEqual(p[f].joints,p[210].joints);
 assert.ok(Math.abs(p[210].joints.root[1]-p[0].joints.root[1]-5.05)<1e-6);
 assert.ok(Math.abs(p[210].joints.stack[1]-p[0].joints.stack[1]+5.05)<1e-6);
 assert.ok(g.every(x=>Math.abs(x.kneeGap)<1e-6&&x.bodyFloorGap>0&&x.barClearance>.05&&x.shinRearClearance>1));
 const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,gripError,supportDrift,maxStep,supportSamples:g.length,padTravel:5.05,counterweightTravel:-5.05};writeFileSync(dir+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(e.id,result);
}
