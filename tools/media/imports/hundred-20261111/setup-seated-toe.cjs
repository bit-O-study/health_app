const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111',id='seated-toe-raise',b=JSON.parse(fs.readFileSync(base+'/batch.json')),e=b.entries.find(x=>x.id===id);assert.equal(e.status,'awaiting-motion-implementation');
let m=fs.readFileSync(base+'/kettlebell-sumo-squat-motion.mjs','utf8');m=m.slice(0,m.indexOf(' byName.root.position.y'))+`
 byName.root.position.y-=3;const heels=[];
 for(const side of ['L','R']){const sign=side==='L'?1:-1,hip='upperleg01.'+side,knee='lowerleg01.'+side,foot='foot.'+side;
 aim(hip,rest(hip,knee),v([sign*.05,0,1]));aim(knee,rest(knee,foot),v([0,-1,0]));
 const offset=v([0,-.65,-.35]),heel=pos(foot).add(offset),rot=q().setFromAxisAngle(v([1,0,0]),rad(-25*phase));
 ik(hip,knee,foot,heel.clone().sub(offset.clone().applyQuaternion(rot)),v([0,0,1]));mesh.updateMatrixWorld(true);byName[foot].quaternion.copy(byName[foot].parent.getWorldQuaternion(q()).invert().multiply(rot));heels.push(heel);
 const upper='upperarm01.'+side,elbow='lowerarm01.'+side,wrist='wrist.'+side;
 aim(upper,rest(upper,elbow),v([sign*.15,-1,.2]));aim(elbow,rest(elbow,wrist),v([0,-.15,1]));
 const index=v(dataByName['finger2-1.'+side].head),little=v(dataByName['finger5-1.'+side].head),palm=index.clone().add(little).multiplyScalar(.5).sub(v(dataByName[wrist].head)),across=index.clone().sub(little);
 const world=q().setFromRotationMatrix(orientation(v([0,-.15,1]),v([-sign,0,0])).multiply(orientation(palm,across).invert()));mesh.updateMatrixWorld(true);byName[wrist].quaternion.copy(byName[wrist].parent.getWorldQuaternion(q()).invert().multiply(world));
 }return heels;
}
`;m=m.replace("['kettlebell-sumo-squat']",JSON.stringify([id]));
let s=fs.readFileSync(base+'/thruster-studio.mjs','utf8');s=s.slice(0,s.indexOf('const steel='))+`
const steel=new THREE.MeshStandardMaterial({color:'#344b56',roughness:.65}),pad=new THREE.MeshStandardMaterial({color:'#202b34',roughness:.85});
function box(w,h,d,x,y,z,material=steel){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);o.position.set(x,y,z);scene.add(o);return o;}
const seat=box(4.4,.65,3.3,0,-3.1,0,pad),legs=[-1.7,1.7].flatMap(x=>[-1.2,1.2].map(z=>box(.22,4,.22,x,-5.6,z)));
const restPositions=bones.map(b=>b.position.clone());let heelTargets=[];
function pose(frame){for(let i=0;i<bones.length;i++){bones[i].quaternion.identity();bones[i].position.copy(restPositions[i]);}heelTargets=applyMotion(exercise,0,{byName,dataByName,mesh},frame);mesh.updateMatrixWorld(true);skeleton.update();}
window.renderSkinned=(frame=0,view='full',dark=false)=>{pose(frame);camera.zoom=1;camera.position.set(view==='side'?32:17,2,view==='side'?0:30);camera.lookAt(0,-1,2);camera.updateProjectionMatrix();scene.background=dark==='alpha'?null:new THREE.Color(dark?'#09090b':'#fafafa');renderer.setClearAlpha(dark==='alpha'?0:1);renderer.render(scene,camera);return canvas.toDataURL('image/png').split(',')[1];};
window.inspectRunning=frame=>{pose(frame);const j={};for(const side of ['L','R'])for(const n of ['upperleg01','lowerleg01','foot','toe2-1','upperarm01','lowerarm01','wrist'])j[n+'.'+side]=byName[n+'.'+side].getWorldPosition(new THREE.Vector3()).toArray();for(const n of ['root','spine01','head'])j[n]=byName[n].getWorldPosition(new THREE.Vector3()).toArray();j.heels=['L','R'].map(s=>byName['foot.'+s].localToWorld(new THREE.Vector3(0,-.65,-.35)).toArray());j.heelTargets=heelTargets.map(x=>x.toArray());return j;};
function measures(){let floor=Infinity,seatBottom=Infinity;for(let i=0;i<geometry.attributes.position.count;i++){const r=vec(model.vertices.slice(i*3,i*3+3)),p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i));floor=Math.min(floor,p.y);if(Math.abs(r.x)<1.4&&r.y>-.8&&r.y<1.5&&r.z<0)seatBottom=Math.min(seatBottom,p.y);}return {floor,seatBottom};}
let floorY=-7.9;
window.inspectGeometry=frame=>{pose(frame);const m=measures();return {floorClearance:m.floor-floorY,seatGap:m.seatBottom-seat.position.y-.325};};
pose(0);const initial=measures();floorY=initial.floor-.02;seat.position.y=initial.seatBottom-.325-.02;for(const leg of legs){const top=seat.position.y-.325;leg.scale.y=(top-floorY)/4;leg.position.y=(top+floorY)/2;}window.renderSkinned(0);window.ready=true;
`;
fs.writeFileSync(base+'/'+id+'-motion.mjs',m);fs.writeFileSync(base+'/'+id+'-studio.mjs',s);e.status='motion-preview';e.recipe={family:'seated-toe',sourceUrls:['https://www.uhsussex.nhs.uk/resources/chair-exercises/'],criteria:'Seated dorsiflexion with both heel pivots fixed and trunk still.',sourcesCheckedAt:'2026-11-13'};fs.writeFileSync(base+'/batch.json',JSON.stringify(b,null,2)+'\n');
