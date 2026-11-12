import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkPoses} from './check-poses.mjs';
const base='tools/media/imports/popular-three-b3-20261103/native';
const read=id=>JSON.parse(readFileSync(base+'/'+id+'/poses.json'));
for(const id of ['barbell-row','hip-thrust','biceps-curl']){
 test(id+' valid cycle',()=>checkPoses(id,read(id)));
 test(id+' rejects foot slip',()=>{const p=read(id);p[100].joints['foot.L'][0]+=.2;assert.throws(()=>checkPoses(id,p),/Foot sliding/);});
}
test('hip thrust rejects floating support',()=>{const p=read('hip-thrust');p[100].joints.contacts[1]=.2;assert.throws(()=>checkPoses('hip-thrust',p),/bench support/);});
test('hip thrust rejects pad penetration',()=>{const p=read('hip-thrust');p[100].joints.contacts[2]=-.1;assert.throws(()=>checkPoses('hip-thrust',p),/Pad intersects/);});
test('curl rejects torso swing',()=>{const p=read('biceps-curl');p[100].joints.root[2]+=.2;assert.throws(()=>checkPoses('biceps-curl',p),/Torso swing/);});
