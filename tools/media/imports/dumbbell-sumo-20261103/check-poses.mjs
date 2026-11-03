import assert from 'node:assert/strict';
export function checkPoses(id, poses) {
 assert.equal(id,'dumbbell-sumo-deadlift');assert.equal(poses.length,481);
 assert.deepEqual(poses[0].joints,poses.at(-1).joints);
 const dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
 const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/(Math.hypot(...u)*Math.hypot(...v)))))*180/Math.PI;};
 const first=poses[0].joints;
 const report={samples:481,loopError:0,footDrift:Math.max(...poses.flatMap(p=>['L','R'].map(s=>dist(p.joints['foot.'+s],first['foot.'+s])))),minimumBodyEquipmentGap:Math.min(...poses.map(p=>p.joints.bodyEquipmentGap[0])),minimumFloorGap:Math.min(...poses.map(p=>p.joints.dumbbellMetrics[1]-p.joints.contactMetrics[0])),gripTravel:poses[192].joints['grip.0'][1]-first['grip.0'][1],bottomKneeDegrees:angle(first['upperleg01.L'],first['lowerleg01.L'],first['foot.L'])};
 assert.ok(report.footDrift<1e-6);assert.ok(report.minimumBodyEquipmentGap>.02,'Equipment must clear lower body');assert.ok(report.minimumFloorGap>0);assert.ok(report.gripTravel>3);
 assert.ok(Math.abs(report.bottomKneeDegrees-90)<1e-6);
 for(const {joints:j} of poses){
  assert.ok(Object.values(j).flat().every(Number.isFinite));assert.equal(j.dumbbellMetrics[0],2);
  assert.ok(Math.abs(j.rootRotation[1])+Math.abs(j.rootRotation[2])<1e-9);
  assert.ok(Math.abs(j['foot.L'][0]-j['foot.R'][0]-6)<1e-6);
  for(const side of ['L','R'])assert.ok(Math.abs(j['toe2-1.'+side][0])>Math.abs(j['foot.'+side][0]),'Toes turned outward');
  for(const i of [0,1])assert.ok(Math.abs(j['gripAxis.'+i][0])+Math.abs(j['gripAxis.'+i][1])<1e-6&&j['gripAxis.'+i][2]>.999);
 }
 for(let n=1;n<=192;n++)assert.ok(poses[n].joints['grip.0'][1]>=poses[n-1].joints['grip.0'][1]-1e-6);
 for(let n=241;n<=432;n++)assert.ok(poses[n].joints['grip.0'][1]<=poses[n-1].joints['grip.0'][1]+1e-6);
 return report;
}
