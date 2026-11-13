const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111';
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(j)=>{const a=j['upperarm01.L'],b=j['lowerarm01.L'],c=j['wrist.L'],u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))*180/Math.PI;};
for(const id of ['squeeze-press','tate-press']){
 const dir=base+'/native/'+id,p=JSON.parse(fs.readFileSync(dir+'/poses.json')),g=JSON.parse(fs.readFileSync(dir+'/geometry.json'));assert.equal(p.length,481);assert.deepEqual(p[0].joints,p.at(-1).joints);let supportDrift=0,maxStep=0,gripSeparationError=0;
 for(let i=0;i<p.length;i++){const j=p[i].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const n of ['root','head','foot.L','foot.R'])supportDrift=Math.max(supportDrift,distance(j[n],p[0].joints[n]));if(i)for(const side of ['L','R'])maxStep=Math.max(maxStep,distance(j['wrist.'+side],p[i-1].joints['wrist.'+side]));if(id==='squeeze-press')gripSeparationError=Math.max(gripSeparationError,Math.abs(distance(...j.grips)-1.154));}
 assert.ok(supportDrift<1e-5&&maxStep<.2&&gripSeparationError<1e-5);assert.equal(g.length,17);for(const x of g){assert.ok(x.floorClearance>=0&&x.floorClearance<.03);assert.ok(Math.abs(x.backGap)<.03&&x.headSupportError<1e-5);for(const key of ['equipmentPairClearance','equipmentBodyClearance','equipmentPadClearance','equipmentHeadPadClearance','equipmentBenchClearance'])assert.ok(x[key]>=0,id+' '+key);}
 const bottomElbowDegrees=angle(p[0].joints),topElbowDegrees=angle(p[240].joints);assert.ok(topElbowDegrees>165&&bottomElbowDegrees<80&&bottomElbowDegrees>30);
 if(id==='tate-press'){const j=p[0].joints;assert.ok(j['lowerarm01.L'][0]>j['wrist.L'][0]+1.5);}
 const r={status:'numeric-checks-passed',poseSamples:481,supportDrift,maxStep,gripSeparationError,bottomElbowDegrees,topElbowDegrees,loopError:0};fs.writeFileSync(dir+'/kinematics.json',JSON.stringify(r,null,2)+'\n');console.log(id,r);
}
