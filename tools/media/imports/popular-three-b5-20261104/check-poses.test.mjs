import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkPoses} from './check-poses.mjs';
const read=id=>JSON.parse(readFileSync('tools/media/imports/popular-three-b5-20261104/native/'+id+'/poses.json'));
for(const id of ['dead-bug','bird-dog','reverse-crunch']){
 test(id+' valid cycle',()=>checkPoses(id,read(id)));
 test(id+' rejects mat penetration',()=>{const p=read(id);p[100].joints.contacts[0]=-10;assert.throws(()=>checkPoses(id,p),/Body penetrates/);});
}
test('dead bug rejects trunk motion',()=>{const p=read('dead-bug');p[100].joints.root[0]+=.1;assert.throws(()=>checkPoses('dead-bug',p),/Pelvis drift/);});
test('bird dog rejects support hand slide',()=>{const p=read('bird-dog');p[100].joints['wrist.R'][0]+=.1;assert.throws(()=>checkPoses('bird-dog',p),/Inactive arm/);});
test('reverse crunch rejects moving head',()=>{const p=read('reverse-crunch');p[100].joints.head[1]+=.1;assert.throws(()=>checkPoses('reverse-crunch',p),/Upper torso drift/);});
