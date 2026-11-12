import assert from 'node:assert/strict';
const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
export function checkPoses(poses){
 assert.equal(poses.length,481);assert.deepEqual(poses[0].joints,poses[480].joints);
 let maxStep=0,supportY=0,supportSpeedError=0,symmetry=0;
 for(let f=0;f<481;f++){
  const j=poses[f].joints;assert.ok(Object.values(j).flat().every(Number.isFinite));
  if(f>=48)for(const n of Object.keys(j))assert.ok(dist(j[n],poses[f-48].joints[n])<1e-8,'Stride changed');
  for(const side of ['L','R']){
   const t=((f/48+(side==='R'?.5:0))%1+1)%1,foot=j['foot.'+side];
   if(t<=.34){supportY=Math.max(supportY,Math.abs(foot[1]+7.12));if(f&&t>1/48){const prev=poses[f-1].joints['foot.'+side];supportSpeedError=Math.max(supportSpeedError,Math.abs(foot[2]-prev[2]+9/48));}}
   if(f<457){const other=poses[f+24].joints['foot.'+(side==='L'?'R':'L')];symmetry=Math.max(symmetry,Math.abs(foot[0]+other[0]),Math.abs(foot[1]-other[1]),Math.abs(foot[2]-other[2]));}
  }
  if(f)for(const n of Object.keys(j))maxStep=Math.max(maxStep,dist(j[n],poses[f-1].joints[n]));
 }
 assert.ok(supportY<1e-8,'Support bounces');assert.ok(supportSpeedError<1e-8,'Support speed changes');assert.ok(symmetry<1e-8,'Asymmetric stride');assert.ok(maxStep<1,'Joint jumps');
 assert.ok(poses[0].joints['lowerarm01.L'][2]<poses[0].joints['upperarm01.L'][2],'Arm fails to oppose landing leg');
 const recovery=poses[30].joints['foot.L'][1];assert.ok(recovery>-4,'Insufficient heel recovery');
 return {poseSamples:481,strideFrames:48,stridesPer8Seconds:10,stepsPerMinute:150,loop:0,maxStep,supportY,supportSpeedError,symmetry};
}
