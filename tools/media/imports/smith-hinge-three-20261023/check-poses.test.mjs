import {readFileSync} from 'node:fs';import {test} from 'node:test';import assert from 'node:assert/strict';import {checkPoses} from './check-poses.mjs';
const ids=['smith-machine-deadlift','smith-machine-romanian-deadlift','smith-machine-stiff-leg-deadlift'];const read=id=>JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));
for(const id of ids)test(id,()=>console.log(checkPoses(id,read(id))));
test('reject sliding feet',()=>{const p=read(ids[0]);p[20].joints['foot.L'][0]+=.2;assert.throws(()=>checkPoses(ids[0],p),/Fixed feet/);});
test('reject bar leaving rails',()=>{const p=read(ids[1]);p[20].joints.barPosition[2]+=.2;assert.throws(()=>checkPoses(ids[1],p),/rail path/);});
test('reject Romanian animation used for stiff leg',()=>assert.throws(()=>checkPoses(ids[2],read(ids[1])),/Distinct hinge/));
