import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPoses} from './check-poses.mjs';
for(const id of ['incline-press','upright-row','wrist-curl']){
 const read=()=>JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));
 test(id+' valid cycle',()=>checkPoses(id,read()));
 test(id+' rejects sliding foot',()=>{const p=read();p[120].joints['foot.L'][0]+=.1;assert.throws(()=>checkPoses(id,p),/Foot sliding/);});
 test(id+' rejects broken loop',()=>{const p=read();p[480].joints.head[0]+=.1;assert.throws(()=>checkPoses(id,p));});
 test(id+' rejects detached grip',()=>{const p=read();p[120].joints.grips[0][1]+=.1;assert.throws(()=>checkPoses(id,p),/Bar\/grip alignment/);});
}
