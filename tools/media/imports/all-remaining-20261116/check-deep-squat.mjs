import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir='tools/media/imports/all-remaining-20261116/deep-squat/native/deep-squat-hold',read=p=>JSON.parse(readFileSync(dir+'/'+p)),p=read('poses.json'),g=read('geometry.json');
assert.equal(p.length,481);for(const x of p){assert.deepEqual(x.joints,p[0].joints);assert.ok(Object.values(x.joints).flat(Infinity).every(Number.isFinite));}
const j=p[0].joints,depth=['L','R'].map(s=>j['lowerleg01.'+s][1]-j['upperleg01.'+s][1]);assert.ok(depth.every(x=>x>0));
for(const x of g){assert.equal(x.equipmentVisible,false);assert.ok(x.cloth>x.body);assert.ok(Math.abs(x.soles.L-x.soles.R)<1e-5);for(const s of ['L','R'])assert.ok(x.heels[s]-x.soles[s]<.1);}
const report={status:'numeric-checks-passed',poseSamples:481,holdSeconds:8,loopError:0,hipBelowKnee:depth,supportSamples:g.length,heelGap:g[0].heels.L-g[0].soles.L};writeFileSync(dir+'/kinematics.json',JSON.stringify(report,null,2)+'\n');console.log(report);
