import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPoses} from './check-poses.mjs';
for(const id of ['rdl','goblet-squat','front-squat']){
 const poses=JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));
 test(id+' full cycle',()=>checkPoses(id,poses));
 test(id+' rejects foot sliding',()=>{const p=structuredClone(poses);p[120].joints['foot.L'][0]+=.4;assert.throws(()=>checkPoses(id,p));});
 test(id+' rejects trunk distortion',()=>{const p=structuredClone(poses);p[100].joints.head[2]+=1;assert.throws(()=>checkPoses(id,p),/Trunk deformation/);});
 test(id+' rejects broken loop',()=>{const p=structuredClone(poses);p[480].joints.root[1]+=.1;assert.throws(()=>checkPoses(id,p));});
}
