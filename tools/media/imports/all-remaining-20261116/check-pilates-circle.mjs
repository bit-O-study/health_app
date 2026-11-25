import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/pilates-circle/native/pilates-leg-circle',read=p=>JSON.parse(readFileSync(p)),poses=read(base+'/poses.json'),g=read(base+'/geometry.json');
assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses.at(-1).joints);
let maxStep=0,torsoDrift=0,minKnee=180,maxKnee=0;
for(let i=0;i<poses.length;i++){
 const j=poses[i].joints;assert.ok(Object.values(j).flat().every(Number.isFinite));
 for(const n of ['root','head','spine01','foot.R','wrist.L','wrist.R'])torsoDrift=Math.max(torsoDrift,Math.hypot(...j[n].map((x,k)=>x-poses[0].joints[n][k])));
 for(const side of ['L','R']){const[a,b,c]=['upperleg01','lowerleg01','foot'].map(n=>j[n+'.'+side]),u=a.map((x,k)=>x-b[k]),v=c.map((x,k)=>x-b[k]),cos=u.reduce((s,x,k)=>s+x*v[k],0)/Math.hypot(...u)/Math.hypot(...v);assert.ok(Number.isFinite(cos)&&Math.abs(cos)<=1+1e-12);const angle=Math.acos(Math.max(-1,Math.min(1,cos)))*180/Math.PI;minKnee=Math.min(minKnee,angle);maxKnee=Math.max(maxKnee,angle);assert.ok(angle>179.99);}
 if(i)for(const n of Object.keys(j))maxStep=Math.max(maxStep,Math.hypot(...j[n].map((x,k)=>x-poses[i-1].joints[n][k])));
}
const feet=poses.map(p=>p.joints['foot.L']),xSpan=Math.max(...feet.map(p=>p[0]))-Math.min(...feet.map(p=>p[0])),zSpan=Math.max(...feet.map(p=>p[2]))-Math.min(...feet.map(p=>p[2]));
assert.ok(xSpan>4&&xSpan<4.5);assert.ok(zSpan>4&&zSpan<4.5);assert.ok(torsoDrift<1e-6);assert.ok(maxStep<.1);
for(let i=0;i<=240;i++)for(let k=0;k<3;k++)assert.ok(Math.abs(feet[i][k]-feet[i+240][k])<1e-6);
for(const x of g){assert.ok(x.floorClearance>.009);assert.ok(x.cloth+7.9>.009);assert.ok(x.headSupportGap>.009&&x.headSupportGap<.04);assert.ok(x.palms+7.9>.009&&x.palms+7.9<.06);assert.ok(x.upperBack+7.9>.009&&x.upperBack+7.9<.05);}
const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,kneeDegrees:[minKnee,maxKnee],maxStep,torsoDrift,xSpan,zSpan};
writeFileSync(base+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(result);
