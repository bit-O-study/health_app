import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
export const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(Math.min(1,Math.max(-1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))))*180/Math.PI;};
export function checkPoses(id,poses){
 assert.equal(poses.length,481);const first=poses[0].joints,peak=poses[240].joints,lat=id==='wide-grip-lat-pulldown',chair=id==='captain-s-chair-leg-raise';assert.deepEqual(first,poses[480].joints,'loop');
 let maxStep=0,gripError=0,minAngle=180,maxAngle=0;
 for(let f=0;f<=480;f++){const j=poses[f].joints;assert.equal(poses[f].frame,f);assert.ok(Object.values(j).flat(Infinity).every(Number.isFinite));for(let i=0;i<2;i++){const side=i===0?'L':'R';gripError=Math.max(gripError,distance(j.grips[i],j.targets[i]));const elbow=angle(j['upperarm01.'+side],j['lowerarm01.'+side],j['wrist.'+side]);minAngle=Math.min(minAngle,elbow);maxAngle=Math.max(maxAngle,elbow);assert.ok(elbow>25&&elbow<179,'elbow range');if(!chair)for(const n of ['foot','toe2-1'])assert.ok(distance(j[n+'.'+side],first[n+'.'+side])<1e-8,'planted feet');else {assert.ok(distance(j.grips[i],first.grips[i])<1e-8,'fixed chair handles');const knee=angle(j['upperleg01.'+side],j['lowerleg01.'+side],j['foot.'+side]);assert.ok(knee>170&&knee<174,'soft knee bend');}}
 if(f)for(const key of Object.keys(j).filter(k=>k!=='grips'&&k!=='targets'))maxStep=Math.max(maxStep,distance(j[key],poses[f-1].joints[key]));if(lat||chair)for(const n of ['root','head','spine01'])assert.ok(distance(j[n],first[n])<1e-8,'stable torso');
 }
 assert.ok(gripError<1e-8);assert.ok(maxStep<.18,'continuous motion');for(let f=210;f<=270;f++)assert.deepEqual(poses[f].joints,peak,'one second hold');
 if(lat){assert.ok(first.grips[0][1]-peak.grips[0][1]>4.7,'pulldown range');assert.ok(maxAngle>155,'long top');assert.ok(distance(first.grips[0],first.grips[1])>8,'wide grip');}
 else if(chair){assert.ok(peak['foot.L'][2]-first['foot.L'][2]>8,'leg raise range');assert.ok(Math.abs(peak['upperleg01.L'][1]-peak['lowerleg01.L'][1])<.3,'horizontal thighs');}
 else{assert.ok(first.root[1]-peak.root[1]>5,'squat depth');assert.ok(Math.abs(peak['upperleg01.L'][1]-peak['lowerleg01.L'][1])<1.5,'thighs near parallel');for(const j of poses.map(p=>p.joints))for(let i=0;i<2;i++)assert.ok(Math.abs(distance(j.grips[i],j.spine01)-distance(first.grips[i],first.spine01))<1e-8,'stable rack');}
 return {poseSamples:481,loop:0,maxStep,gripError,elbowDegrees:[minAngle,maxAngle],peakSeconds:1};
}
if(process.argv.includes('--metrics'))for(const id of ['wide-grip-lat-pulldown','captain-s-chair-leg-raise','kettlebell-front-squat']){const p=JSON.parse(readFileSync(new URL('./native/'+id+'/poses.json',import.meta.url)));console.log(id,[0,240].map(f=>({elbow:angle(p[f].joints['upperarm01.L'],p[f].joints['lowerarm01.L'],p[f].joints['wrist.L']),knee:angle(p[f].joints['upperleg01.L'],p[f].joints['lowerleg01.L'],p[f].joints['foot.L'])})));}
