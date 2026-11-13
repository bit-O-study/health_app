const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111';
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
for(const id of ['incline-rear-delt-raise','incline-bench-dumbbell-row','prone-y-raise']){
 const dir=base+'/native/'+id,p=JSON.parse(fs.readFileSync(dir+'/poses.json')),g=JSON.parse(fs.readFileSync(dir+'/geometry.json'));
 assert.equal(p.length,481);assert.deepEqual(p[0].joints,p.at(-1).joints);let supportDrift=0,maxStep=0;
 for(let i=0;i<p.length;i++){const j=p[i].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const n of ['root','head','foot.L','foot.R'])supportDrift=Math.max(supportDrift,distance(j[n],p[0].joints[n]));if(i)for(const side of ['L','R'])maxStep=Math.max(maxStep,distance(j['wrist.'+side],p[i-1].joints['wrist.'+side]));}
 assert.ok(supportDrift<1e-5&&maxStep<.2);assert.equal(g.length,17);
 for(const x of g){assert.ok(x.floorClearance>=0&&x.floorClearance<.03);assert.ok(Math.abs(x.chestGap)<.01);assert.ok(x.equipmentBodyClearance>0&&x.equipmentPadClearance>0);}
 const top=p[240].joints,start=p[0].joints,elbow=angle(top['upperarm01.L'],top['lowerarm01.L'],top['wrist.L']);
 if(id==='incline-bench-dumbbell-row'){assert.ok(elbow<120&&elbow>70);assert.ok(top['lowerarm01.L'][2]<top['upperarm01.L'][2]-2);}
 else {assert.ok(elbow>165);assert.ok(top['wrist.L'][0]>top['upperarm01.L'][0]+(id==='prone-y-raise'?2:3));if(id==='prone-y-raise')assert.ok(top['wrist.L'][1]>top['head'][1]);}
 assert.ok(distance(top['wrist.L'],start['wrist.L'])>1);
 const r={status:'numeric-checks-passed',poseSamples:481,supportDrift,maxStep,topElbowDegrees:elbow,loopError:0};fs.writeFileSync(dir+'/kinematics.json',JSON.stringify(r,null,2)+'\n');console.log(id,r);
}
