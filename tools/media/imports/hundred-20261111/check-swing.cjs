const fs=require('node:fs'),assert=require('node:assert/strict');
const dir='tools/media/imports/hundred-20261111/native/kettlebell-swing',read=f=>JSON.parse(fs.readFileSync(dir+'/'+f));
const p=read('poses.json'),g=read('geometry.json'),distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
assert.equal(p.length,481);assert.deepEqual(p[0].joints,p.at(-1).joints);
let gripError=0,footDrift=0,maxStep=0,minElbow=180,maxElbow=0,minKnee=180,maxKnee=0;
for(let i=0;i<p.length;i++){const j=p[i].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const [n,s]of ['L','R'].entries()){gripError=Math.max(gripError,distance(j.grips[n],j.targets[n]));for(const bone of ['foot','toe2-1'])footDrift=Math.max(footDrift,distance(j[bone+'.'+s],p[0].joints[bone+'.'+s]));const e=angle(j['upperarm01.'+s],j['lowerarm01.'+s],j['wrist.'+s]),k=angle(j['upperleg01.'+s],j['lowerleg01.'+s],j['foot.'+s]);minElbow=Math.min(minElbow,e);maxElbow=Math.max(maxElbow,e);minKnee=Math.min(minKnee,k);maxKnee=Math.max(maxKnee,k);}if(i)for(const k of ['root','head','bell','wrist.L','wrist.R'])maxStep=Math.max(maxStep,distance(j[k],p[i-1].joints[k]));}
assert.ok(gripError<1e-5&&footDrift<1e-5&&maxStep<.2);assert.ok(minElbow>155&&maxElbow<179);assert.ok(minKnee>145&&maxKnee>170);
assert.ok(p[0].joints.bell[2]<0);assert.ok(Math.abs(p[240].joints.bell[1]-p[240].joints['upperarm01.L'][1])<.2);
assert.ok(g.every(x=>x.floorClearance>=0&&x.bellFloorClearance>0&&x.bodyBell>0&&x.clothBell>0&&x.gripError<1e-5));
const report={status:'numeric-checks-passed',poseSamples:481,loopError:0,gripError,footDrift,maxStep,elbowDegrees:[minElbow,maxElbow],kneeDegrees:[minKnee,maxKnee],minimumBellBodyGap:Math.min(...g.map(x=>x.bodyBell)),minimumBellClothGap:Math.min(...g.map(x=>x.clothBell))};fs.writeFileSync(dir+'/kinematics.json',JSON.stringify(report,null,2)+'\n');console.log(report);
