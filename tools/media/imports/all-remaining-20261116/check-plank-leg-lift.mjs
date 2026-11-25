import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir='tools/media/imports/all-remaining-20261116/plank-leg-lift/native/plank-with-leg-lift',read=p=>JSON.parse(readFileSync(dir+'/'+p)),p=read('poses.json'),g=read('geometry.json'),distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
assert.equal(p.length,481);assert.deepEqual(p[0].joints,p.at(-1).joints);let maxStep=0,maxFixedError=0,minKnee=180;
for(let i=0;i<p.length;i++){const j=p[i].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const side of ['L','R']){for(const n of ['upperleg01','upperarm01','lowerarm01','wrist'])maxFixedError=Math.max(maxFixedError,distance(j[n+'.'+side],p[0].joints[n+'.'+side]));const a=j['upperleg01.'+side].map((x,k)=>x-j['lowerleg01.'+side][k]),b=j['foot.'+side].map((x,k)=>x-j['lowerleg01.'+side][k]);minKnee=Math.min(minKnee,Math.acos(Math.max(-1,Math.min(1,a.reduce((s,x,k)=>s+x*b[k],0)/(Math.hypot(...a)*Math.hypot(...b)))))*180/Math.PI);}if(i)for(const n of Object.keys(j))if(n!=='support')maxStep=Math.max(maxStep,distance(j[n],p[i-1].joints[n]));}
assert.ok(maxFixedError<1e-10);assert.ok(maxStep<.05);assert.ok(minKnee>179.99);
for(const x of g){assert.ok(x.support.every(Number.isFinite));assert.ok(x.support[4]>=0);assert.ok(x.support.slice(0,2).every(v=>v>=0&&v<.04));assert.ok(x.support[x.frame%480<240?2:3]<.04);}
const lifts=['R','L'].map((s,i)=>p[120+240*i].joints['foot.'+s][1]-p[0].joints['foot.'+s][1]);assert.ok(lifts.every(x=>x>1.5&&x<2));
const report={status:'numeric-checks-passed',poseSamples:481,loopError:0,maxFixedError,maxStep,minKnee,lifts,supportSamples:g.length};writeFileSync(dir+'/kinematics.json',JSON.stringify(report,null,2)+'\n');console.log(report);
