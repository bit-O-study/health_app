import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPoses,checkGeometry} from './check-poses.mjs';
for(const id of ['preacher-curl','rear-delt-fly']){
 const samples=JSON.parse(readFileSync(new URL('./native/'+id+'/geometry.json',import.meta.url)));
 test(id+' sampled geometry',()=>checkGeometry(id,samples));
 test(id+' rejects equipment intersection',()=>{const p=structuredClone(samples);p[3].equipmentBodyClearance=-.1;assert.throws(()=>checkGeometry(id,p),/Dumbbell collision/);});
}
for(const id of ['preacher-curl','rear-delt-fly','straight-arm-pulldown']){
 const poses=JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));
 test(id+' full cycle',()=>checkPoses(id,poses));
 test(id+' rejects foot sliding',()=>{const p=structuredClone(poses);p[120].joints['foot.L'][0]+=.4;assert.throws(()=>checkPoses(id,p));});
 test(id+' rejects trunk distortion',()=>{const p=structuredClone(poses);p[100].joints.head[2]+=1;assert.throws(()=>checkPoses(id,p),/Torso swing/);});
 test(id+' rejects broken loop',()=>{const p=structuredClone(poses);p[480].joints.root[1]+=.1;assert.throws(()=>checkPoses(id,p));});
}
