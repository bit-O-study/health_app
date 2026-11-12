import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPoses,checkGeometry} from './check-poses.mjs';
const load=id=>JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));
for(const id of ['chest-fly','incline-curl','skull-crusher']){
 test(id+' full cycle',()=>checkPoses(id,load(id)));
 test(id+' support and equipment clearance',()=>checkGeometry(JSON.parse(readFileSync(new URL('./native/'+id+'/geometry.json',import.meta.url)))));
 test(id+' rejects foot sliding',()=>{const p=load(id);p[100].joints['foot.L'][0]+=.5;assert.throws(()=>checkPoses(id,p),/Foot sliding/);});
 test(id+' rejects trunk swing',()=>{const p=load(id);p[100].joints.head[0]+=.5;assert.throws(()=>checkPoses(id,p),/Torso swing/);});
}
for(const id of ['incline-curl','skull-crusher'])test(id+' rejects swinging elbow',()=>{const p=load(id);p[100].joints['lowerarm01.L'][0]+=.1;assert.throws(()=>checkPoses(id,p),/Upper arm drifts/);});
