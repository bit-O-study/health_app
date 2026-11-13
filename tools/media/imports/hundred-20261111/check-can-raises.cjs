const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111';
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
for(const id of ['full-can-raise','empty-can-raise']){
 const dir=base+'/native/'+id,p=JSON.parse(fs.readFileSync(dir+'/poses.json')),g=JSON.parse(fs.readFileSync(dir+'/geometry.json'));
 assert.equal(p.length,481);assert.deepEqual(p[0].joints,p.at(-1).joints);
 let supportDrift=0,maxStep=0,planeError=0;
 for(let i=0;i<p.length;i++){
  const j=p[i].joints;assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));
  for(const n of ['root','head','foot.L','foot.R','toe2-1.L','toe2-1.R'])supportDrift=Math.max(supportDrift,distance(j[n],p[0].joints[n]));
  for(const side of ['L','R']){const shoulder=j['upperarm01.'+side],elbow=j['lowerarm01.'+side],wrist=j['wrist.'+side];planeError=Math.max(planeError,Math.abs(Math.atan2(elbow[2]-shoulder[2],Math.abs(elbow[0]-shoulder[0]))*180/Math.PI-30));if(i)maxStep=Math.max(maxStep,distance(wrist,p[i-1].joints['wrist.'+side]));}
 }
 assert.ok(supportDrift<1e-5&&planeError<1e-5&&maxStep<.2);
 assert.ok(g.length===17&&g.every(x=>x.floorClearance>=0&&x.clothFloorClearance>0));
 const top=p[240].joints,axisY=top.axes.map(x=>x[1]);assert.ok(axisY.every(y=>id==='full-can-raise'?y>.9:y<-.9));
 for(const side of ['L','R'])assert.ok(top['wrist.'+side][1]<top['upperarm01.'+side][1]&&top['wrist.'+side][1]>p[0].joints['wrist.'+side][1]+3);
 const result={status:'numeric-checks-passed',poseSamples:481,supportDrift,maxStep,planeError,thumbSideAxisY:axisY,loopError:0};fs.writeFileSync(dir+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(id,result);
}
