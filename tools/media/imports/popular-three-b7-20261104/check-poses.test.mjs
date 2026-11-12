import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkPoses} from './check-poses.mjs';
for(const id of ['shrug','reverse-curl','cable-curl']){
 const read=()=>JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));
 test(id+' full cycle',()=>checkPoses(id,read()));
 test(id+' rejects foot sliding',()=>{const p=read();p[100].joints['foot.L'][0]+=.2;assert.throws(()=>checkPoses(id,p),/Foot sliding/);});
 test(id+' rejects trunk swing',()=>{const p=read();p[120].joints.spine01[2]+=.3;assert.throws(()=>checkPoses(id,p),/Torso swing/);});
 if(id!=='shrug')test(id+' rejects reversed grip',()=>{const p=read();p[100].joints.axes[0][0]*=-1;assert.throws(()=>checkPoses(id,p),/Wrong grip/);});
}
