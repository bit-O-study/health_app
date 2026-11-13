const fs=require('node:fs'),base='tools/media/imports/hundred-20261111';
const configs={
 'standing-band-row':{family:'row',anchor:[0,4,10],equipment:'band'},
 'band-chest-press':{family:'press',anchor:[0,4,-8],equipment:'band'},
 'band-shoulder-press':{family:'overhead',anchor:[0,-7.8,.4],equipment:'band'},
 'band-pulldown':{family:'pulldown',anchor:[0,13,4],equipment:'band'},
 'band-face-pull':{family:'face',anchor:[0,7.5,10],equipment:'band'},
 'standing-cable-chest-press':{family:'press',anchor:[0,4,-8],equipment:'cable'},
 'single-arm-lat-pulldown':{family:'pulldown',anchor:[0,13,4],equipment:'cable',single:true},
 'single-arm-straight-arm-pulldown':{family:'straight',anchor:[0,12,8],equipment:'cable',single:true},
 'single-arm-cable-front-raise':{family:'front',anchor:[0,-7.7,0],equipment:'cable',single:true},
 'single-arm-cable-lateral-raise':{family:'lateral',anchor:[-5,-7.7,0],equipment:'cable',single:true}
};
const batch=JSON.parse(fs.readFileSync(base+'/batch.json'));let template=fs.readFileSync(base+'/kettlebell-swing-motion.mjs','utf8');
const helper=template.slice(template.indexOf('function orientation'),template.indexOf('export function applyMotion'));
const gripCode=template.slice(template.indexOf('  const index='),template.indexOf('  const world='));
const fingers=template.slice(template.indexOf('  for(let f=2'),template.indexOf('  grips.push'));
for(const [id,c]of Object.entries(configs)){
 const entry=batch.entries.find(e=>e.id===id);if(entry.status!=='awaiting-motion-implementation')throw Error('Already started '+id);
 const motion=`import * as THREE from './three.module.js';
export const exercises=[${JSON.stringify(id)}];
const config=${JSON.stringify(c)},v=a=>new THREE.Vector3(...a),q=()=>new THREE.Quaternion(),rad=THREE.MathUtils.degToRad;
${helper}
export function applyMotion(id,lift,{byName,dataByName,mesh},frame){
 const t=((frame%480)+480)%480/480,l=(1-Math.cos(2*Math.PI*t))/2;
 const rest=(a,b)=>v(dataByName[b].head).sub(v(dataByName[a].head));
 const pos=n=>{mesh.updateMatrixWorld(true);return byName[n].getWorldPosition(v([0,0,0]));};
 const aim=(name,r,d)=>{mesh.updateMatrixWorld(true);byName[name].quaternion.copy(byName[name].parent.getWorldQuaternion(q()).invert().multiply(q().setFromUnitVectors(r.clone().normalize(),d.clone().normalize())));};
 byName.root.position.y+=.32;const grips=[];
 for(const side of ['L','R']){const sign=side==='L'?1:-1,upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side,active=!config.single||side==='L';let a,b;
 if(!active){a=v([sign*.2,-1,0]);b=v([sign*.15,-1,.1]);}
 else if(config.family==='row'||config.family==='press'){const f=config.family==='press'?1-l:l;a=v([sign*(.08+.35*f),-.85*f,1-1.35*f]);b=v([0,.05,1]);}
 else if(config.family==='overhead'||config.family==='pulldown'){const f=config.family==='overhead'?l:1-l,angle=rad(65+105*f);a=v([sign*Math.sin(angle),-Math.cos(angle),.15]);b=v([sign*.05,1,.12]);}
 else if(config.family==='face'){a=v([sign*(.15+.85*l),-.1,1-.9*l]);b=v([-sign*.1,.15+.85*l,1-.9*l]);}
 else {const f=config.family==='straight'?1-l:l,angle=rad(8+(config.family==='straight'?132:82)*f);a=config.family==='lateral'?v([sign*Math.sin(angle),-Math.cos(angle),.1]):v([sign*.08,-Math.cos(angle),Math.sin(angle)]);b=a.clone().applyAxisAngle(v([1,0,0]),rad(-8));}
 aim(upper,rest(upper,elbow),a);aim(elbow,rest(elbow,wrist),b);
 ${gripCode}
 const direction=b.clone().normalize(),handleAxis=config.family==='row'||config.family==='face'?v([0,1,0]):v([-sign,0,0]);
 const world=q().setFromRotationMatrix(orientation(direction,handleAxis).multiply(orientation(palm,across).invert()));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
 ${fingers}
 if(active)grips.push({side,socket,grip:pos(wrist).add(socket.clone().applyQuaternion(world)),handleAxis});
 }return grips;
}
`;
 fs.writeFileSync(base+'/'+id+'-motion.mjs',motion);
 let studio=fs.readFileSync(base+'/kettlebell-swing-studio.mjs','utf8');studio=studio.slice(0,studio.indexOf('const bell='));
 studio+=`
const config=${JSON.stringify(c)},anchor=new THREE.Vector3(...config.anchor),rubber=new THREE.MeshStandardMaterial({color:config.equipment==='band'?'#dd8641':'#71868d',roughness:.7}),steel=new THREE.MeshStandardMaterial({color:'#344b56',roughness:.5,metalness:.5});
const rods=[];function rod(a,b,r,material=steel){const d=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),16),material);m.position.copy(a.clone().add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());scene.add(m);return m;}
const anchors=[new THREE.Vector3(2.2,anchor.y,anchor.z),new THREE.Vector3(-2.2,anchor.y,anchor.z)];if(config.single)anchors.splice(1);if(config.family==='lateral')anchors[0].x=-5;
for(const a of anchors){rod(a.clone().setY(-7.9),a.clone().setY(Math.max(a.y+.6,-7.4)),.12);rod(a.clone().setY(-7.85).add(new THREE.Vector3(-1,0,0)),a.clone().setY(-7.85).add(new THREE.Vector3(1,0,0)),.18);}
const restPositions=bones.map(b=>b.position.clone());let grips=[],lengths=[];
function pose(frame){for(let i=0;i<bones.length;i++){bones[i].quaternion.identity();bones[i].position.copy(restPositions[i]);}grips=applyMotion(exercise,0,{byName,dataByName,mesh},frame);mesh.updateMatrixWorld(true);skeleton.update();for(const r of rods){scene.remove(r);r.geometry.dispose();}rods.length=0;lengths=[];for(const [i,g]of grips.entries()){const axis=g.handleAxis.clone().normalize(),a=g.grip.clone().addScaledVector(axis,-.55),b=g.grip.clone().addScaledVector(axis,.55);rods.push(rod(a,b,.12));const end=g.grip.clone().addScaledVector(new THREE.Vector3().subVectors(anchors[i],g.grip).normalize(),.2);rods.push(rod(end,anchors[i],config.equipment==='band'?.07:.035,rubber));lengths.push(end.distanceTo(anchors[i]));}}
window.renderSkinned=(frame=0,view='full',dark=false)=>{pose(frame);camera.zoom=config.anchor[1]>10?.7:.8;camera.position.set(view==='side'?36:23,5,view==='side'?0:30);camera.lookAt(0,config.anchor[1]>10?2:.3,config.anchor[2]/3);camera.updateProjectionMatrix();scene.background=dark==='alpha'?null:new THREE.Color(dark?'#09090b':'#fafafa');renderer.setClearAlpha(dark==='alpha'?0:1);renderer.render(scene,camera);return canvas.toDataURL('image/png').split(',')[1];};
window.inspectRunning=frame=>{pose(frame);const j={};for(const side of ['L','R'])for(const n of ['upperleg01','lowerleg01','foot','toe2-1','upperarm01','lowerarm01','wrist'])j[n+'.'+side]=byName[n+'.'+side].getWorldPosition(new THREE.Vector3()).toArray();for(const n of ['root','spine01','head'])j[n]=byName[n].getWorldPosition(new THREE.Vector3()).toArray();j.grips=grips.map(({side,socket})=>byName['wrist.'+side].localToWorld(socket.clone()).toArray());j.targets=grips.map(g=>g.grip.toArray());j.lengths=lengths;return j;};
window.inspectGeometry=frame=>{pose(frame);let floor=Infinity,cloth=Infinity;for(let i=0;i<geometry.attributes.position.count;i++)floor=Math.min(floor,mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i)).y);for(let i=0;i<clothGeometry.attributes.position.count;i++)cloth=Math.min(cloth,shorts.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i)).y);return {floorClearance:floor+7.9,clothFloorClearance:cloth+7.9,gripError:Math.max(...grips.map(({side,socket,grip})=>byName['wrist.'+side].localToWorld(socket.clone()).distanceTo(grip)))};};
window.renderSkinned(0);window.ready=true;
`;
 fs.writeFileSync(base+'/'+id+'-studio.mjs',studio);entry.status='motion-preview';entry.recipe={family:c.family,sourceUrls:['https://www.acefitness.org/continuing-education/certified/july-2025/8897/the-ace-workout-builder-for-resistance-band-workouts/'],criteria:'Standing '+c.family+' with '+c.equipment+' and '+(c.single?'one working arm':'both arms')+'; fixed feet, gripped handles and visible anchors.',sourcesCheckedAt:'2026-11-12'};
}
fs.writeFileSync(base+'/batch.json',JSON.stringify(batch,null,2)+'\n');fs.writeFileSync(base+'/resistance-ids.json',JSON.stringify(Object.keys(configs),null,2)+'\n');
