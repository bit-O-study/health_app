import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPoses} from './check-poses.mjs';
for(const id of ['wide-grip-lat-pulldown','captain-s-chair-leg-raise','kettlebell-front-squat']){
 const load=()=>JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));
 test(id+' valid cycle',()=>checkPoses(id,load()));
 test(id+' rejects grip separation',()=>{const p=load();p[100].joints.grips[0][0]+=.1;assert.throws(()=>checkPoses(id,p));});
 test(id+' rejects broken loop',()=>{const p=load();p[480].joints.root[0]+=.1;assert.throws(()=>checkPoses(id,p));});
 test(id+' rejects moving support',()=>{const p=load();p[100].joints[id==='captain-s-chair-leg-raise'?'spine01':'foot.L'][0]+=.1;assert.throws(()=>checkPoses(id,p));});
}
