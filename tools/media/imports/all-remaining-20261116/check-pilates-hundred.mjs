import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/pilates-hundred/native/pilates-hundred',read=p=>JSON.parse(readFileSync(p)),poses=read(base+'/poses.json'),g=read(base+'/geometry.json');
assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses.at(-1).joints);
let maxStep=0,torsoDrift=0,minKnee=180,maxKnee=0;
for(let i=0;i<poses.length;i++){
 const j=poses[i].joints;assert.ok(Object.values(j).flat().every(Number.isFinite));
 for(const n of ['root','head','spine01','foot.L','foot.R'])torsoDrift=Math.max(torsoDrift,Math.hypot(...j[n].map((x,k)=>x-poses[0].joints[n][k])));
 for(const side of ['L','R']){const[a,b,c]=['upperleg01','lowerleg01','foot'].map(n=>j[n+'.'+side]),u=a.map((x,k)=>x-b[k]),v=c.map((x,k)=>x-b[k]),cos=u.reduce((s,x,k)=>s+x*v[k],0)/Math.hypot(...u)/Math.hypot(...v);assert.ok(Number.isFinite(cos)&&Math.abs(cos)<=1+1e-12);const angle=Math.acos(Math.max(-1,Math.min(1,cos)))*180/Math.PI;minKnee=Math.min(minKnee,angle);maxKnee=Math.max(maxKnee,angle);assert.ok(angle>179.99);}
 if(i)for(const n of Object.keys(j))maxStep=Math.max(maxStep,Math.hypot(...j[n].map((x,k)=>x-poses[i-1].joints[n][k])));
}
const heights=poses.map(p=>p.joints['wrist.L'][1]),armTravel=Math.max(...heights)-Math.min(...heights);let peaks=0;
for(let i=1;i<480;i++)if(heights[i]>heights[i-1]&&heights[i]>heights[i+1])peaks++;
assert.equal(peaks,10);assert.ok(armTravel>.4&&armTravel<.7);assert.ok(torsoDrift<1e-6);assert.ok(maxStep<.1);
for(const x of g){assert.ok(x.floorClearance>.009);assert.ok(x.cloth+7.9>.009);assert.ok(x.lowerBack+7.9>.009&&x.lowerBack+7.9<.15);assert.ok(x.head+7.9>2);assert.ok(x.supportFootGap>6);assert.ok(x.handThighGaps.every(d=>d>.05));}
const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,kneeDegrees:[minKnee,maxKnee],maxStep,torsoDrift,armTravel,peaks};
writeFileSync(base+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(result);
