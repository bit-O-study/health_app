const fs=require('node:fs');
const base='tools/media/imports/hundred-20261111',batch=JSON.parse(fs.readFileSync(base+'/batch.json')),entry=batch.entries.find(e=>e.id==='farmer-s-carry');
if(entry.status!=='awaiting-motion-implementation')throw Error('Already started');
let m=fs.readFileSync(base+'/kettlebell-swing-motion.mjs','utf8').replaceAll('kettlebell-swing','farmer-s-carry');
m=m.replace('const phase=(1-Math.cos(2*Math.PI*(((frame%480)+480)%480)/480))/2,hinge=1-phase;','const t=(((frame%480)+480)%480)/480;');
const a=m.indexOf(' byName.root.position.z-='),b=m.indexOf(' const grips=[];');
m=m.slice(0,a)+` byName.root.position.y-=.45-.06*Math.cos(4*Math.PI*t);
 const direction=v([0,-1,0]);
`+m.slice(b);
const c=m.indexOf("  ik('upperleg01.'"),d=m.indexOf('  const index=',c);
m=m.slice(0,c)+`  const p=(t+(side==='R'?.5:0))%1,s=Math.max(0,(p-.6)/.4),ease=s*s*s*(s*(s*6-15)+10);
  const z=2.4-8*p+8*ease,y=-7.15+(p>.6?.9*Math.sin(Math.PI*s)**2:0);
  ik('upperleg01.'+side,'lowerleg01.'+side,'foot.'+side,v([sign*1.25,y,z]),v([0,0,1]));
  mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert());
`+m.slice(d);
m=m.replace('orientation(direction,v([-sign,0,0]))','orientation(direction,v([0,0,-sign]))').replace('sign*.65,shoulder.y,shoulder.z','sign*3.5,shoulder.y,shoulder.z+.15');
fs.writeFileSync(base+'/farmer-s-carry-motion.mjs',m);
let studio=fs.readFileSync(base+'/kettlebell-swing-studio.mjs','utf8');studio=studio.slice(0,studio.indexOf('const bell='));
studio+=`
const metal=new THREE.MeshStandardMaterial({color:'#344b56',roughness:.38,metalness:.65}),chrome=new THREE.MeshStandardMaterial({color:'#aebfc5',roughness:.28,metalness:.8}),weights=[];
for(let i=0;i<2;i++){const group=new THREE.Group();scene.add(group);const handle=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,2.6,20),chrome);handle.rotation.x=Math.PI/2;group.add(handle);for(const z of [-1.15,1.15]){const plate=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.5,12),metal);plate.rotation.x=Math.PI/2;plate.position.z=z;group.add(plate);}weights.push(group);}
const restPositions=bones.map(b=>b.position.clone());let grips=[];
function pose(frame){for(let i=0;i<bones.length;i++){bones[i].quaternion.identity();bones[i].position.copy(restPositions[i]);}grips=applyMotion(exercise,0,{byName,dataByName,mesh},frame);mesh.updateMatrixWorld(true);skeleton.update();for(let i=0;i<2;i++){weights[i].position.copy(grips[i].grip);weights[i].updateMatrixWorld(true);}}
window.renderSkinned=(frame=0,view='full',dark=false)=>{pose(frame);camera.zoom=.88;camera.position.set(view==='side'?32:14,3,view==='side'?0:30);camera.lookAt(0,.2,0);camera.updateProjectionMatrix();scene.background=dark==='alpha'?null:new THREE.Color(dark?'#09090b':'#fafafa');renderer.setClearAlpha(dark==='alpha'?0:1);renderer.render(scene,camera);return canvas.toDataURL('image/png').split(',')[1];};
window.inspectRunning=frame=>{pose(frame);const j={};for(const side of ['L','R'])for(const n of ['upperleg01','lowerleg01','foot','toe2-1','upperarm01','lowerarm01','wrist'])j[n+'.'+side]=byName[n+'.'+side].getWorldPosition(new THREE.Vector3()).toArray();for(const n of ['root','spine01','head'])j[n]=byName[n].getWorldPosition(new THREE.Vector3()).toArray();j.grips=grips.map(({side,socket})=>byName['wrist.'+side].localToWorld(socket.clone()).toArray());j.targets=grips.map(g=>g.grip.toArray());return j;};
window.inspectGeometry=frame=>{pose(frame);let floor=Infinity,plateBodyGap=Infinity,plateClothGap=Infinity;const centers=weights.flatMap(w=>[-1.15,1.15].map(z=>w.localToWorld(new THREE.Vector3(0,0,z))));function gap(p){return Math.min(...centers.map(c=>{const axial=Math.max(0,Math.abs(p.z-c.z)-.25),radial=Math.max(0,Math.hypot(p.x-c.x,p.y-c.y)-.72);return Math.hypot(axial,radial);}));}for(let i=0;i<geometry.attributes.position.count;i++){const p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i));floor=Math.min(floor,p.y);plateBodyGap=Math.min(plateBodyGap,gap(p));}for(let i=0;i<clothGeometry.attributes.position.count;i++){const p=shorts.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i));plateClothGap=Math.min(plateClothGap,gap(p));}return {floorClearance:floor+7.9,plateBodyGap,plateClothGap,gripError:Math.max(...grips.map(({side,socket,grip})=>byName['wrist.'+side].localToWorld(socket.clone()).distanceTo(grip)))};};
window.renderSkinned(0);window.ready=true;
`;
fs.writeFileSync(base+'/farmer-s-carry-studio.mjs',studio);entry.status='motion-preview';entry.recipe={family:'loaded-carry',sourceUrls:['https://www.tbs.marines.mil/Portals/230/Force%20Fitness%20Exercise%20Guidebook.pdf'],criteria:'Two dumbbells at sides, upright trunk, alternating short steps. Camera-relative loop represents constant forward travel of eight model units per cycle; stance feet fixed in reconstructed world coordinates.',sourcesCheckedAt:'2026-11-12'};fs.writeFileSync(base+'/batch.json',JSON.stringify(batch,null,2)+'\n');
