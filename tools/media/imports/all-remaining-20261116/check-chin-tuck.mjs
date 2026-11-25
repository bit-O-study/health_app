import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/chin-tuck/native/chin-tuck';
const read=n=>JSON.parse(readFileSync(base+'/'+n,'utf8')),poses=read('poses.json'),geometry=read('geometry.json');
assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses[480].joints);
let maxStep=0;
for(const [i,p]of poses.entries()){
 assert.ok(Object.values(p.joints).flat().every(Number.isFinite));
 for(const name of Object.keys(p.joints).filter(n=>!['head','neck01'].includes(n)))assert.deepEqual(p.joints[name],poses[0].joints[name]);
 assert.ok(Math.abs(p.joints.head[0]-poses[0].joints.head[0])<1e-10);assert.ok(Math.abs(p.joints.head[1]-poses[0].joints.head[1])<1e-10);
 if(i)maxStep=Math.max(maxStep,Math.abs(p.joints.head[2]-poses[i-1].joints.head[2]));
}
const headTravel=poses[0].joints.head[2]-poses[240].joints.head[2];assert.ok(headTravel>.35&&headTravel<.37);assert.ok(maxStep<.005);
for(const g of geometry){assert.ok(Math.abs(g.seatGap-.015)<1e-8);assert.ok(Math.abs(g.footGap-.015)<1e-8);assert.ok(g.headEuler.every(x=>Math.abs(x)<1e-8));}
const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,headTravel,maxStep,levelGaze:true,stationaryTorsoAndLimbs:true,seatGap:geometry[0].seatGap,footGap:geometry[0].footGap};
writeFileSync(base+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(result);
