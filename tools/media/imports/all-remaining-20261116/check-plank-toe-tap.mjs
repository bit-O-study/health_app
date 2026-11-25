import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir='tools/media/imports/all-remaining-20261116/plank-toe-tap/native/plank-toe-tap',read=p=>JSON.parse(readFileSync(dir+'/'+p)),p=read('poses.json'),g=read('geometry.json'),distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
assert.equal(p.length,481);assert.deepEqual(p[0].joints,p.at(-1).joints);let maxFixedError=0,maxStep=0;
for(let i=0;i<p.length;i++){const j=p[i].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const s of ['L','R'])for(const n of ['upperleg01','upperarm01','lowerarm01','wrist'])maxFixedError=Math.max(maxFixedError,distance(j[n+'.'+s],p[0].joints[n+'.'+s]));if(i)for(const n of Object.keys(j))if(n!=='support')maxStep=Math.max(maxStep,distance(j[n],p[i-1].joints[n]));}
assert.ok(maxFixedError<1e-10);assert.ok(maxStep<.06);
for(const x of g){assert.ok(x.support.every(Number.isFinite));assert.ok(x.support[4]>=0);assert.ok(x.support.slice(0,2).every(v=>v>=0&&v<.04));const active=x.frame%480<240?3:2,rest=active===3?2:3,t=x.frame%240;assert.ok(x.support[rest]<.04);if(t>=90&&t<=150)assert.ok(x.support[active]>=0&&x.support[active]<.04);if([30,60,180,210].includes(t))assert.ok(x.support[active]>.1);}
const lateralTravel=['R','L'].map((s,i)=>Math.abs(p[120+240*i].joints['foot.'+s][0]-p[0].joints['foot.'+s][0]));assert.ok(lateralTravel.every(x=>x>2&&x<2.5));
const report={status:'numeric-checks-passed',poseSamples:481,loopError:0,maxFixedError,maxStep,lateralTravel,supportSamples:g.length};writeFileSync(dir+'/kinematics.json',JSON.stringify(report,null,2)+'\n');console.log(report);
