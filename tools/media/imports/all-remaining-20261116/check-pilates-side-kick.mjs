import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/pilates-side-kick/native/pilates-side-kick',read=p=>JSON.parse(readFileSync(p)),poses=read(base+'/poses.json'),g=read(base+'/geometry.json');
assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses.at(-1).joints);
let maxStep=0,torsoDrift=0,minKnee=180,maxKnee=0;
for(let i=0;i<poses.length;i++){
 const j=poses[i].joints;assert.ok(Object.values(j).flat().every(Number.isFinite));
 for(const n of ['root','head','spine01','foot.R'])torsoDrift=Math.max(torsoDrift,Math.hypot(...j[n].map((x,k)=>x-poses[0].joints[n][k])));
 for(const side of ['L','R']){const[a,b,c]=['upperleg01','lowerleg01','foot'].map(n=>j[n+'.'+side]),u=a.map((x,k)=>x-b[k]),v=c.map((x,k)=>x-b[k]),cos=u.reduce((s,x,k)=>s+x*v[k],0)/Math.hypot(...u)/Math.hypot(...v);assert.ok(Number.isFinite(cos)&&Math.abs(cos)<=1+1e-12);const angle=Math.acos(Math.max(-1,Math.min(1,cos)))*180/Math.PI;minKnee=Math.min(minKnee,angle);maxKnee=Math.max(maxKnee,angle);assert.ok(angle>179.99);}
 if(i)for(const n of Object.keys(j))maxStep=Math.max(maxStep,Math.hypot(...j[n].map((x,k)=>x-poses[i-1].joints[n][k])));
}
const feet=poses.map(p=>p.joints['foot.L']),zSpan=Math.max(...feet.map(p=>p[2]))-Math.min(...feet.map(p=>p[2])),heightDrift=Math.max(...feet.map(p=>p[1]))-Math.min(...feet.map(p=>p[1]));
assert.ok(zSpan>9&&zSpan<10);assert.ok(heightDrift<.01);assert.ok(torsoDrift<.01);assert.ok(maxStep<.15);
for(const x of g){assert.ok(x.floorClearance>.009);assert.ok(x.cloth+7.9>.009);assert.ok(x.headHandGap<.05);assert.ok(x.hipHandGap<.13);assert.ok(x.lowerFootGap>.009&&x.lowerFootGap<.05);}
const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,kneeDegrees:[minKnee,maxKnee],maxStep,torsoDrift,zSpan,heightDrift,headHandGaps:g.map(x=>x.headHandGap),hipHandGaps:g.map(x=>x.hipHandGap)};
writeFileSync(base+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(result);
