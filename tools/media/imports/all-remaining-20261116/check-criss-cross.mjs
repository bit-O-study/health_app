import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
for(const id of ['pilates-criss-cross','bicycle-crunch']){
 const base='tools/media/imports/all-remaining-20261116/criss-cross/native/'+id,read=n=>JSON.parse(readFileSync(base+'/'+n,'utf8')),p=read('poses.json'),g=read('geometry.json'),knees=[];
 assert.equal(p.length,481);assert.deepEqual(p[0].joints,p[480].joints);let maxStep=0,pelvisDrift=0;
 for(const [i,f]of p.entries()){
  const j=f.joints;assert.ok(Object.values(j).flat().every(Number.isFinite));
  assert.ok(Math.abs(j['foot.L'][1]-j['foot.R'][1])<1e-8);
  for(const side of ['L','R']){
   const [a,b,c]=['upperleg01','lowerleg01','foot'].map(n=>j[n+'.'+side]),u=a.map((x,k)=>x-b[k]),v=c.map((x,k)=>x-b[k]),cos=u.reduce((s,x,k)=>s+x*v[k],0)/Math.hypot(...u)/Math.hypot(...v);
   assert.ok(Number.isFinite(cos)&&Math.abs(cos)<=1+1e-12);knees.push(Math.acos(Math.max(-1,Math.min(1,cos)))*180/Math.PI);
   for(const k of [0,2])assert.ok(Math.abs(a[k]-p[0].joints['upperleg01.'+side][k])<1e-8);
   pelvisDrift=Math.max(pelvisDrift,Math.abs(a[1]-p[0].joints['upperleg01.'+side][1]));
   assert.ok(Math.abs(j['lowerarm01.'+side][0])>3);
  }
  if(i)for(const n of Object.keys(j))maxStep=Math.max(maxStep,Math.hypot(...j[n].map((x,k)=>x-p[i-1].joints[n][k])));
 }
 assert.ok(Math.min(...knees)>89.9&&Math.min(...knees)<90.1);assert.ok(Math.max(...knees)>179);assert.ok(maxStep<.1&&pelvisDrift<.15);
 for(const [frame,bent,opposite]of [[0,'L','R'],[240,'R','L']]){const j=p[frame].joints;assert.ok(j['lowerleg01.'+bent][2]<j['lowerleg01.'+opposite][2]-3);assert.ok(j['upperarm01.'+opposite][2]>j['upperarm01.'+bent][2]+.5);}
 for(const x of g){assert.ok(x.floorClearance>.01&&x.cloth+7.9>.01);assert.ok(Math.min(x.floorClearance,x.cloth+7.9)<.02);assert.ok(x.lowerBack+7.9<.2);assert.ok(x.head+7.9>2);assert.ok(x.handHeadGaps.every(d=>d<.06));}
 const result={status:'numeric-checks-passed',poseSamples:481,loopError:0,kneeRange:[Math.min(...knees),Math.max(...knees)],maxStep,pelvisDrift,levelFeet:true,oppositeShoulderRotation:true,maximumHandHeadGap:Math.max(...g.flatMap(x=>x.handHeadGaps))};writeFileSync(base+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(id,result);
}
