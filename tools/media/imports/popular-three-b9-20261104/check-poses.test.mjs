import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPoses} from './check-poses.mjs';
const load=id=>JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));
for(const id of ['concentration-curl','face-pull','cable-upright-row']){
 test(id+' full cycle',()=>checkPoses(id,load(id)));
 test(id+' rejects foot sliding',()=>{const poses=load(id);poses[100].joints['foot.L'][0]+=.5;assert.throws(()=>checkPoses(id,poses),/Foot sliding/);});
 test(id+' rejects trunk swing',()=>{const poses=load(id);poses[100].joints.head[0]+=.5;assert.throws(()=>checkPoses(id,poses),/Torso swing/);});
}
test('concentration curl rejects unsupported elbow',()=>{const p=load('concentration-curl');p[100].joints['lowerarm01.L'][0]+=.1;assert.throws(()=>checkPoses('concentration-curl',p),/Supported elbow moves/);});
test('face pull rejects stretching rope',()=>{const p=load('face-pull');p[100].joints.ropeLengths[0]+=.1;assert.throws(()=>checkPoses('face-pull',p),/Rope stretches/);});
test('cable row rejects disconnected stack',()=>{const p=load('cable-upright-row');p[100].joints.stack[1]+=.1;assert.throws(()=>checkPoses('cable-upright-row',p),/Cable\/stack mismatch/);});
