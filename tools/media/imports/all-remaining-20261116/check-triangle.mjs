import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
const base='tools/media/imports/all-remaining-20261116/triangle/native/triangle-pose',read=p=>JSON.parse(readFileSync(p)),poses=read(base+'/poses.json'),g=read(base+'/geometry.json');assert.equal(poses.length,481);const angles={};
for(const f of poses){assert.deepEqual(f.joints,poses[0].joints);assert.ok(Object.values(f.joints).flat().every(Number.isFinite));for(const side of ['L','R']){const[a,b,c]=['upperleg01','lowerleg01','foot'].map(n=>f.joints[n+'.'+side]),u=a.map((x,k)=>x-b[k]),v=c.map((x,k)=>x-b[k]),cos=u.reduce((s,x,k)=>s+x*v[k],0)/Math.hypot(...u)/Math.hypot(...v);assert.ok(Number.isFinite(cos)&&Math.abs(cos)<=1+1e-12);angles[side]=Math.acos(Math.max(-1,Math.min(1,cos)))*180/Math.PI;assert.ok(angles[side]>179);}
 const j=f.joints;assert.ok(j['foot.L'][2]-j['foot.R'][2]>13);assert.ok(j['wrist.R'][1]>j.head[1]+5);assert.ok(j['wrist.L'][1]<j['lowerleg01.L'][1]);assert.ok(j.head[2]>j.root[2]+5);
}
for(const x of g){assert.ok(x.floorClearance>.01&&x.floorClearance<.02);assert.ok(x.footFloorGaps.every(v=>v>.01&&v<.02));assert.ok(x.handShinGap<.03);assert.ok(x.cloth+7.9>0);}

const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,staticHold:true,kneeDegrees:angles,supportGaps:{body:g[0].floorClearance,feet:g[0].footFloorGaps,handShin:g[0].handShinGap}};writeFileSync(base+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(result);
