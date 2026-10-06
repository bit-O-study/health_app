import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const ids=['dumbbell-biceps-curl','hammer-curl-2','dumbbell-front-raise','dumbbell-shrug'];
const load=id=>JSON.parse(readFileSync(`tools/media/motion-refresh/skinned-3d/${id}-poses.json`,'utf8'));
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const subtract=(a,b)=>a.map((x,i)=>x-b[i]);
for(const id of ids)test(id+': fixed segment lengths, stationary feet and closed loop',()=>{
 const poses=load(id),start=poses[0].joints;
 for(const pose of poses)for(const side of ['L','R']){
  for(const [a,b] of [['upperarm01','lowerarm01'],['lowerarm01','wrist']])assert.ok(Math.abs(distance(pose.joints[a+'.'+side],pose.joints[b+'.'+side])-distance(start[a+'.'+side],start[b+'.'+side]))<1e-7);
  assert.ok(distance(pose.joints['foot.'+side],start['foot.'+side])<1e-9);
 }
 assert.deepEqual(poses.at(-1).joints,start);
});
for(const id of ids.slice(0,2))test(id+': upper arms remain still while elbows flex',()=>{
 const poses=load(id),start=poses[0].joints,peak=poses.find(p=>p.frame===210).joints;
 for(const pose of poses)for(const side of ['L','R'])assert.ok(distance(pose.joints['lowerarm01.'+side],start['lowerarm01.'+side])<1e-8);
 assert.ok(peak['wrist.L'][1]-start['wrist.L'][1]>3);
});
test('curl uses horizontal handles while hammer preserves neutral grip',()=>{
 const curl=load(ids[0]),hammer=load(ids[1]);
 for(const pose of curl)for(const axis of pose.joints.handles)assert.ok(Math.abs(axis[0])>.95);
 for(const pose of hammer)for(const axis of pose.joints.handles)assert.ok(Math.abs(axis[0])<.1);
 assert.ok(hammer.find(p=>p.frame===210).joints.handles[0][1]>.9);
});
test('front raise travels forward without lifting weights above shoulders',()=>{
 const p=load(ids[2]).find(p=>p.frame===210).joints;
 assert.ok(p['wrist.L'][2]-p['upperarm01.L'][2]>4.5);
 assert.ok(p['wrist.L'][1]<=p['upperarm01.L'][1]);
});
test('shrug raises the shoulder girdle with unchanged arm directions',()=>{
 const poses=load(ids[3]),start=poses[0].joints,peak=poses.find(p=>p.frame===210).joints;
 assert.ok(peak['upperarm01.L'][1]-start['upperarm01.L'][1]>.35);
 for(const pose of poses)for(const [a,b] of [['upperarm01.L','lowerarm01.L'],['lowerarm01.L','wrist.L']])assert.ok(distance(subtract(pose.joints[a],pose.joints[b]),subtract(start[a],start[b]))<1e-7);
});
