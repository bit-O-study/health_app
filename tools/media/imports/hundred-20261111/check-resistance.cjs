const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111';
const ids=JSON.parse(fs.readFileSync(base+'/resistance-ids.json')),dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const id of ids){
 const d=base+'/native/'+id,p=JSON.parse(fs.readFileSync(d+'/poses.json')),g=JSON.parse(fs.readFileSync(d+'/geometry.json'));assert.equal(p.length,481);assert.deepEqual(p[0].joints,p.at(-1).joints);
 let supportDrift=0,inactiveDrift=0,gripError=0,cableError=0,maxStep=0,minElbow=180,maxElbow=0;
 for(let i=0;i<p.length;i++){const j=p[i].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(const side of ['L','R']){
  for(const n of ['root','head','foot.'+side,'toe2-1.'+side])supportDrift=Math.max(supportDrift,dist(j[n],p[0].joints[n]));
  const [a,b,c]=['upperarm01','lowerarm01','wrist'].map(n=>j[n+'.'+side]),u=a.map((x,k)=>x-b[k]),v=c.map((x,k)=>x-b[k]);const angle=Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,k)=>s+x*v[k],0)/(Math.hypot(...u)*Math.hypot(...v)))))*180/Math.PI;
  minElbow=Math.min(minElbow,angle);maxElbow=Math.max(maxElbow,angle);assert.ok(angle>=30&&angle<=180.001);
  if(i)maxStep=Math.max(maxStep,dist(c,p[i-1].joints['wrist.'+side]));
 }
 if(id.startsWith('single-arm'))for(const n of ['upperarm01.R','lowerarm01.R','wrist.R'])inactiveDrift=Math.max(inactiveDrift,dist(j[n],p[0].joints[n]));
 j.grips.forEach((a,k)=>gripError=Math.max(gripError,dist(a,j.targets[k])));j.cableTotals.forEach((x,k)=>cableError=Math.max(cableError,Math.abs(x-p[0].joints.cableTotals[k])));
 assert.ok(j.stackHeights.every(x=>x>=-6.10001&&x<11));
 }
 assert.ok(supportDrift<1e-5&&inactiveDrift<1e-5&&gripError<1e-5&&cableError<1e-5&&maxStep<.2);
 assert.ok(g.every(x=>x.floorClearance>=0&&x.clothFloorClearance>0));
 const lengthChange=p[240].joints.lengths[0]-p[0].joints.lengths[0];assert.ok(lengthChange>.3,'Resistance must extend on exertion '+id);
 const r={status:'numeric-checks-passed',poseSamples:481,supportDrift,inactiveDrift,gripError,cableLengthError:cableError,maxStep,loopError:0,elbowDegrees:[minElbow,maxElbow],lengthChange,minFloorClearance:Math.min(...g.map(x=>x.floorClearance))};fs.writeFileSync(d+'/kinematics.json',JSON.stringify(r,null,2)+'\n');console.log(id,r);
}
