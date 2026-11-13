const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111';
const batch=JSON.parse(fs.readFileSync(base+'/batch.json'));
for(const id of ['incline-rear-delt-raise','incline-bench-dumbbell-row','prone-y-raise']){
 const entry=batch.entries.find(e=>e.id===id);assert.equal(entry.status,'awaiting-motion-implementation');
 let m=fs.readFileSync(base+'/full-can-raise-motion.mjs','utf8'),s=fs.readFileSync(base+'/full-can-raise-studio.mjs','utf8');
 m=m.replace('export const exercises = ["full-can-raise"];','export const exercises = '+JSON.stringify([id])+';');
 m=m.replace('byName.root.position.y += .28;', 'byName.root.rotation.x=rad(45);byName.root.position.y-=.5;');
 m=m.replace("const upper=dataByName",`aim('upperleg01.'+side,rest('upperleg01','lowerleg01'),new THREE.Vector3(sign*.08,-.85,-.52));
    aim('lowerleg01.'+side,rest('lowerleg01','foot'),new THREE.Vector3(0,-.98,-.2));
    byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    const upper=dataByName`);
 const start=m.indexOf('    const theta='),end=m.indexOf("    aim('upperarm01.",start);
 const top=id==='prone-y-raise'?'sign*.6,.566,.566':id==='incline-bench-dumbbell-row'?'sign*.22,-.25,-.94':'sign*.995,.05,-.05';
 const lower=id==='incline-bench-dumbbell-row'?'new THREE.Vector3(sign*.15,-.98,.1)':'upperDirection.clone().add(new THREE.Vector3(0,0,.12)).normalize()';
 m=m.slice(0,start)+`    const upperDirection=new THREE.Vector3(sign*.15,-.98,.05).lerp(new THREE.Vector3(${top}),lift).normalize();
    const lowerDirection=${lower};
`+m.slice(end);
 m=m.replace('const desiredAcross=new THREE.Vector3(0,1,0);','const desiredAcross=new THREE.Vector3(0,.707,.707);');
 s=s.replace('camera.zoom = .96;', 'camera.zoom = .86;').replace('camera.zoom = .98;', 'camera.zoom = .86;');
 const geoStart=s.indexOf('window.inspectGeometry=');assert.ok(geoStart>0);s=s.slice(0,geoStart)+`
pose(0);
const padNormal=new THREE.Vector3(0,Math.SQRT1_2,-Math.SQRT1_2),padUp=new THREE.Vector3(0,Math.SQRT1_2,Math.SQRT1_2);
const chestIndices=[];for(let i=0;i<geometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);if(Math.abs(p.x)<1.3&&p.y>1&&p.y<5.4&&p.z>.1)chestIndices.push(i);}
const points=chestIndices.map(i=>mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i)));
const padPlane=Math.min(...points.map(p=>p.dot(padNormal))),padLow=Math.min(...points.map(p=>p.dot(padUp)))-1.2,padHigh=Math.max(...points.map(p=>p.dot(padUp)))+.15;
const mat=new THREE.MeshStandardMaterial({color:'#364c55',roughness:.8}),pad=new THREE.Mesh(new THREE.BoxGeometry(2.7,padHigh-padLow,.4),mat);
pad.rotation.x=Math.PI/4;pad.position.copy(padUp.clone().multiplyScalar((padLow+padHigh)/2).addScaledVector(padNormal,padPlane-.2));scene.add(pad);
for(const t of [padLow+.4,padHigh-.4]){const p=padUp.clone().multiplyScalar(t).addScaledVector(padNormal,padPlane-.4),h=p.y+7.9;const leg=new THREE.Mesh(new THREE.BoxGeometry(.24,h,.24),mat);leg.position.set(0,-7.9+h/2,p.z);scene.add(leg);const foot=new THREE.Mesh(new THREE.BoxGeometry(4,.2,.5),mat);foot.position.set(0,-7.8,p.z);scene.add(foot);}
window.inspectGeometry=frame=>{pose(frame);let floorClearance=Infinity,clothFloorClearance=Infinity,chestGap=Infinity,equipmentBodyClearance=Infinity,equipmentPadClearance=Infinity;
 const inv=dumbbells.map(d=>d.matrixWorld.clone().invert());
 const sdf=p=>{let d=Infinity;for(const e of [-1,1]){const x=Math.hypot(p.x,p.z)-.61,y=Math.abs(p.y-e*.9)-.3;d=Math.min(d,Math.hypot(Math.max(x,0),Math.max(y,0))+Math.min(Math.max(x,y),0));}return d;};
 for(let i=0;i<geometry.attributes.position.count;i++){const p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i));floorClearance=Math.min(floorClearance,p.y+7.9);if(Math.abs(model.vertices[3*i])<1.7)for(const q of inv)equipmentBodyClearance=Math.min(equipmentBodyClearance,sdf(p.clone().applyMatrix4(q)));}
 for(let i=0;i<clothGeometry.attributes.position.count;i++)clothFloorClearance=Math.min(clothFloorClearance,shorts.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i)).y+7.9);
 for(const i of chestIndices)chestGap=Math.min(chestGap,mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i)).dot(padNormal)-padPlane);
 for(let x=-1.35;x<=1.351;x+=.27)for(let t=padLow;t<=padHigh;t+=.2)for(const n of [padPlane,padPlane-.4])for(const q of inv){const p=padUp.clone().multiplyScalar(t).addScaledVector(padNormal,n);p.x=x;equipmentPadClearance=Math.min(equipmentPadClearance,sdf(p.applyMatrix4(q)));}
 return {floorClearance,clothFloorClearance,chestGap,equipmentBodyClearance,equipmentPadClearance,padPlane,padLow,padHigh};};window.renderSkinned(0);window.ready=true;
`;
 fs.writeFileSync(base+'/'+id+'-motion.mjs',m);fs.writeFileSync(base+'/'+id+'-studio.mjs',s);
 entry.status='motion-preview';entry.recipe={family:'chest-supported-pull',sourceUrls:[id==='incline-rear-delt-raise'?'https://www.acefitness.org/resources/everyone/exercise-library/34/incline-reverse-fly/':id==='prone-y-raise'?'https://www.rehabhero.ca/exercise/incline-bench-y-raise':'https://contentcdn.eacefitness.com/certifiednews/images/article/pdfs/ACEShoulderStudy.pdf'],criteria:'Chest supported on 45-degree incline bench, fixed feet and trunk; '+id+' arm path with bilateral dumbbells.',sourcesCheckedAt:'2026-11-13'};
}
fs.writeFileSync(base+'/batch.json',JSON.stringify(batch,null,2)+'\n');
