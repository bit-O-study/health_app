import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPoses} from './check-poses.mjs';
const read=id=>JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));
for(const id of ['pull-up','lat-pulldown','leg-press'])test(id+' valid generated poses',()=>checkPoses(id,read(id)));
for(const [id,key,offset] of [['pull-up','grip.L',0],['lat-pulldown','foot.L',1],['lat-pulldown','stack',1],['leg-press','plate',2],['leg-press','root',1]])test(id+' rejects drift in '+key,()=>{const p=read(id);p[110].joints[key][offset]+=.1;assert.throws(()=>checkPoses(id,p));});
test('rejects bar penetration',()=>{const p=read('pull-up');p[100].joints.contacts[3]=-.1;assert.throws(()=>checkPoses('pull-up',p));});
