const fs=require('node:fs'),assert=require('node:assert/strict');
const dir='tools/media/imports/hundred-20261111/native/jump-squat';
const poses=JSON.parse(fs.readFileSync(dir+'/poses.json')),geometry=JSON.parse(fs.readFileSync(dir+'/geometry.json'));
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const knee=(j,s)=>{const a=j['upperleg01.'+s],b=j['lowerleg01.'+s],c=j['foot.'+s],u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((n,x,i)=>n+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses.at(-1).joints);
let maxStep=0,maxFootHeightDifference=0,maxGroundToeDrift=0;
for(let i=0;i<poses.length;i++){
 const {frame,joints:j}=poses[i];assert.ok(Object.values(j).flat().every(Number.isFinite));
 maxFootHeightDifference=Math.max(maxFootHeightDifference,Math.abs(j['foot.L'][1]-j['foot.R'][1]));
 for(const s of ['L','R'])if(frame<=201||frame>=288)maxGroundToeDrift=Math.max(maxGroundToeDrift,distance(j['toe2-1.'+s],poses[0].joints['toe2-1.'+s]));
 if(i)for(const key of Object.keys(j))maxStep=Math.max(maxStep,distance(j[key],poses[i-1].joints[key]));
}
const landingKnee=knee(poses[288].joints,'L'),dipKnee=knee(poses[134].joints,'L'),apexHeight=poses[245].joints['toe2-1.L'][1]-poses[0].joints['toe2-1.L'][1];
assert.ok(maxStep<.3,'Discontinuous joint movement');assert.ok(maxFootHeightDifference<1e-6);assert.ok(maxGroundToeDrift<1e-5,'Ground support drift');
assert.ok(dipKnee<100&&dipKnee>60);assert.ok(landingKnee<160&&landingKnee>110,'Landing must flex knees before contact');assert.ok(apexHeight>1.4);
assert.ok(geometry.every(g=>g.floorClearance>=0&&g.cloth>-7.9));
const report={status:'numeric-checks-passed',samples:481,loopError:0,maxStep,maxFootHeightDifference,maxGroundToeDrift,landingKnee,dipKnee,apexHeight,minFloorClearance:Math.min(...geometry.map(g=>g.floorClearance))};
fs.writeFileSync(dir+'/kinematics.json',JSON.stringify(report,null,2)+'\n');console.log(report);
