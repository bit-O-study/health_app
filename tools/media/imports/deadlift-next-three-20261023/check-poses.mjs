import assert from 'node:assert/strict';
export function checkPoses(id, poses) {
  assert.equal(poses.length, 481);
  assert.deepEqual(poses[0].joints, poses.at(-1).joints);
  const first=poses[0].joints,dist=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
  const report={samples:481,loopError:0,footDrift:Math.max(...poses.flatMap(p=>['L','R'].map(s=>dist(p.joints['foot.'+s],first['foot.'+s])))),travel:poses[192].joints['grip.0'][1]-first['grip.0'][1]};
  assert.ok(report.footDrift<1e-6);
  for(const {joints:j} of poses){
    assert.ok(Object.values(j).flat().every(Number.isFinite));
    assert.ok(Math.abs(j.rootRotation[1])+Math.abs(j.rootRotation[2])<1e-9,'No torso twist or lateral bend');
  }
  for(let n=1;n<=192;n++)assert.ok(poses[n].joints['grip.0'][1]>=poses[n-1].joints['grip.0'][1]-1e-6);
  for(let n=241;n<=432;n++)assert.ok(poses[n].joints['grip.0'][1]<=poses[n-1].joints['grip.0'][1]+1e-6);
  if(id==='partial-deadlift'){
    report.supportGap=Math.min(...poses.map(p=>p.joints.supportMetrics[1]));
    report.barAboveKnee=first.barPosition[1]-first['lowerleg01.L'][1];
    report.bodyShaftClearance=Math.min(...poses.map(p=>p.joints.contactMetrics[2]));
    assert.ok(Math.abs(first.supportMetrics[1])<1e-6&&report.supportGap>-1e-6);
    assert.ok(report.barAboveKnee>1&&report.travel>1&&report.travel<3);
    assert.ok(report.bodyShaftClearance>.02);
  }else{
    const count=id==='dumbbell-deadlift'?2:1;
    assert.ok(poses.every(p=>p.joints.dumbbellMetrics[0]===count));
    report.dumbbellCount=count;
    assert.ok(poses.every(p=>Array.from({length:count},(_,i)=>p.joints['gripAxis.'+i]).every(axis=>Math.abs(axis[0])+Math.abs(axis[1])<1e-6&&axis[2]>.999)), 'Neutral handles stay aligned fore-aft throughout');
    report.sampledLowerBodyEquipmentGap=Math.min(...poses.map(p=>p.joints.bodyEquipmentGap[0]));
    assert.ok(report.sampledLowerBodyEquipmentGap>.02);
    report.floorGap=Math.min(...poses.map(p=>p.joints.dumbbellMetrics[1]-p.joints.contactMetrics[0]));
    assert.ok(report.floorGap>-1e-6);
    if(count===2)assert.ok(report.floorGap<.01&&report.travel>6);
    else {
      report.gripBelowKnee=first['lowerleg01.L'][1]-first['grip.0'][1];
      assert.ok(report.gripBelowKnee>1&&report.gripBelowKnee<3&&report.floorGap>1);
    }
  }
  return report;
}
