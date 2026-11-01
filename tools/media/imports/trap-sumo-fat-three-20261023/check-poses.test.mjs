import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkPoses} from './check-poses.mjs';
const ids=['trap-bar-deadlift','kettlebell-sumo-deadlift','fat-grip-deadlift'];
const read=id=>JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));
for(const id of ids)test(id,()=>console.log(checkPoses(id,read(id))));
test('reject sliding feet',()=>{const p=read(ids[0]);p[20].joints['foot.L'][0]+=.2;assert.throws(()=>checkPoses(ids[0],p),/Fixed feet/);});
test('reject equipment penetration',()=>{const p=read(ids[1]);p[20].joints.contactMetrics[2]=-.2;assert.throws(()=>checkPoses(ids[1],p),/clearance/);});

test('reject bent lifting arm',()=>{const p=read(ids[0]);p[20].joints['lowerarm01.R'][2]+=2;assert.throws(()=>checkPoses(ids[0],p),/Long arms/);});
