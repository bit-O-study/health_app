const fs = require('node:fs'), assert = require('node:assert/strict');
const base = 'tools/media/imports/hundred-20261111';
const ids = ['donkey-kick', 'fire-hydrant', 'cat-cow'];
const distance = (a,b) => Math.hypot(...a.map((x,i)=>x-b[i]));
const angle = (a,b,c) => { const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]); return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI; };
for (const id of ids) {
  const dir=base+'/native/'+id, poses=JSON.parse(fs.readFileSync(dir+'/poses.json')), geometry=JSON.parse(fs.readFileSync(dir+'/geometry.json'));
  assert.equal(poses.length,481); assert.deepEqual(poses[0].joints,poses.at(-1).joints); assert.equal(geometry.length,17);
  let supportDrift=0,maxStep=0,minKnee=180,maxKnee=0;
  const fixed=['wrist.L','wrist.R','lowerleg01.L',...(id==='cat-cow'?['lowerleg01.R']:['root','head'])];
  for(let i=0;i<poses.length;i++) {
    const j=poses[i].joints; assert.ok(Object.values(j).flat().every(Number.isFinite));
    for(const key of fixed) supportDrift=Math.max(supportDrift,distance(j[key],poses[0].joints[key]));
    for(const key of Object.keys(j)) if(i)maxStep=Math.max(maxStep,distance(j[key],poses[i-1].joints[key]));
    const knee=angle(j['upperleg01.R'],j['lowerleg01.R'],j['foot.R']);minKnee=Math.min(minKnee,knee);maxKnee=Math.max(maxKnee,knee);
  }
  assert.ok(supportDrift<1e-5, id+' support drift '+supportDrift); assert.ok(maxStep<.2); assert.ok(minKnee>65&&maxKnee<110);
  assert.ok(geometry.every(g=>g.floorClearance>=0&&Math.abs(g.palms-g.kneeL)<.1));
  const start=poses[0].joints,top=poses[240].joints;
  if(id==='donkey-kick') {assert.ok(top['lowerleg01.R'][2]<start['lowerleg01.R'][2]-3);assert.ok(top['foot.R'][1]>top['lowerleg01.R'][1]+3);}
  if(id==='fire-hydrant') assert.ok(top['lowerleg01.R'][0]<start['lowerleg01.R'][0]-3);
  if(id==='cat-cow') assert.ok(distance(top.spine01,start.spine01)>.1);
  const result={status:'numeric-checks-passed',poseSamples:481,geometrySamples:17,supportDrift,maxStep,loopError:0,kneeDegrees:[minKnee,maxKnee],limits:'Virtual floor; sampled skin support, no full mesh collision certification.'};
  fs.writeFileSync(dir+'/kinematics.json',JSON.stringify(result,null,2)+'\n');console.log(id,result);
}
