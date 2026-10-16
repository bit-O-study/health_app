import {readFileSync,writeFileSync} from 'node:fs';
const dir='tools/media/imports/all-exercises-20261007/band-external-rotation/rig/';let s=readFileSync('tools/media/motion-refresh/skinned-3d/studio-batch.mjs','utf8');
s=s.replace('renderer.setSize(1080, 1080)','renderer.setSize(480, 480)').replace('scene.add(floor);','scene.add(floor);floor.visible=false;').replace('scene.add(contactShadow);','scene.add(contactShadow);contactShadow.visible=false;');
s=s.replace('// Closed eyes are replaced',`// Isolated band equipment, no dumbbells.
+for(const g of dumbbells){g.clear();g.visible=false;}
+const grip=dumbbells[0];grip.visible=true;
+const handle=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.8,16),rubber);grip.add(handle);
+const anchor=new THREE.Vector3(-5.3,3.27,2.1);
+const post=new THREE.Mesh(new THREE.BoxGeometry(.3,11.74,.3),rubber);post.position.set(anchor.x,-2.59,anchor.z);scene.add(post);
+const postFoot=new THREE.Mesh(new THREE.BoxGeometry(1,.18,1),rubber);postFoot.position.set(anchor.x,-8.37,anchor.z);scene.add(postFoot);
+const band=new THREE.Mesh(new THREE.CylinderGeometry(.052,.052,1,12),new THREE.MeshStandardMaterial({color:'#b62632',roughness:.7}));scene.add(band);
+const anchorRing=new THREE.Mesh(new THREE.TorusGeometry(.17,.04,8,24),metal);anchorRing.position.copy(anchor);anchorRing.rotation.y=Math.PI/2;scene.add(anchorRing);
+const gripPoint=new THREE.Object3D();grip.add(gripPoint);
+function updateBand(){const hand=gripPoint.getWorldPosition(new THREE.Vector3()),delta=hand.clone().sub(anchor);band.position.copy(anchor).add(hand).multiplyScalar(.5);band.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());band.scale.set(1,delta.length(),1);}
+// Closed eyes are replaced`.replaceAll('\n+','\n'));
s=s.replace('((frame % 480) + 480) % 480 / 480','((frame % 192) + 192) % 192 / 192').replace('mesh.morphTargetInfluences[0] = .5 - .5 * Math.cos(t * Math.PI * 2);','mesh.morphTargetInfluences[0] = 0;').replace('mesh.updateMatrixWorld(true); skeleton.update();','mesh.updateMatrixWorld(true); skeleton.update();updateBand();');
s=s.replace("else camera.position.set(exercise==='dumbbell-front-raise'?23:15,4.5,32);","else if(view==='front')camera.position.set(0,4.5,32);else camera.position.set(9,7,32);");s=s.replace("'#152027' : '#e7edec'","'#09090b' : '#fafafa'");s=s.replace('result.handles=dumbbells.map(d=>new THREE.Vector3(0,1,0).applyQuaternion(d.getWorldQuaternion(new THREE.Quaternion())).toArray());',`result.anchor=anchor.toArray();result.grip=gripPoint.getWorldPosition(new THREE.Vector3()).toArray();const dir=new THREE.Vector3(0,1,0).applyQuaternion(band.quaternion).multiplyScalar(band.scale.y/2);result.bandStart=band.position.clone().sub(dir).toArray();result.bandEnd=band.position.clone().add(dir).toArray();result.handAxis=new THREE.Vector3(0,1,0).applyQuaternion(grip.getWorldQuaternion(new THREE.Quaternion())).toArray();`);
writeFileSync(dir+'studio.mjs',s);
