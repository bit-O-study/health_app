import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir='tools/media/imports/all-remaining-20261116/rkc-plank/native/rkc-plank',read=p=>JSON.parse(readFileSync(dir+'/'+p)),p=read('poses.json'),g=read('geometry.json');
assert.equal(p.length,481);for(const x of p){assert.deepEqual(x.joints,p[0].joints);assert.ok(Object.values(x.joints).flat(Infinity).every(Number.isFinite));}
for(const x of g){assert.ok(x.support.slice(0,4).every(v=>v>=0&&v<.05));assert.ok(x.support[4]>=0);assert.ok(x.support[5]>0);assert.ok(x.feetGap>.5&&x.feetGap<1);assert.ok(x.elbowUnderShoulder<1e-10);}
const report={status:'numeric-checks-passed',poseSamples:481,holdSeconds:8,loopError:0,support:g[0].support,feetGap:g[0].feetGap,elbowUnderShoulder:g[0].elbowUnderShoulder};writeFileSync(dir+'/kinematics.json',JSON.stringify(report,null,2)+'\n');console.log(report);
