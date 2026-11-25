const metal=new THREE.MeshStandardMaterial({color:'#91a2ac',metalness:.65,roughness:.35}),rubber=new THREE.MeshStandardMaterial({color:'#263b45',roughness:.8}),padMaterial=new THREE.MeshStandardMaterial({color:'#204952',roughness:.9});
function box(size,p,material=metal){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...p);scene.add(m);return m;}
function rod(a,b,r=.13,material=metal){const d=vec(b).sub(vec(a)),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),24),material);m.position.copy(vec(a).add(vec(b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());scene.add(m);return m;}
const bar=rod([-5,11,1.2],[5,11,1.2]);
for(const sign of [-1,1]){rod([sign*5,-9,1.2],[sign*5,11,1.2],.22);box([1,.35,13],[sign*5,-9,-4],rubber);rod([sign*5,11,1.2],[sign*2.6,11,-9],.2);rod([sign*2.6,-9,-9],[sign*2.6,11,-9],.18);}
rod([-2.6,11,-9],[2.6,11,-9],.2);
const kneePad=box([4.8,.5,2],[0,0,-.8],padMaterial),carriage=box([5.8,.5,.6],[0,0,-9],rubber),arms=[-2.6,2.6].map(x=>rod([x,0,-9],[x,0,-.8],.16));
const padCrossbar=rod([-2.6,0,-.8],[2.6,0,-.8],.16);
const stack=box([2.5,1.5,1],[0,0,-10.5],rubber);for(const x of [-.8,.8])rod([x,-8.8,-10.5],[x,10.5,-10.5],.06);
for(const z of [-9,-10.5]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.2,24),rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(0,10.7,z);scene.add(wheel);}
box([3,.25,2],[0,-8,-.8],rubber);
const restPositions=bones.map(b=>b.position.clone());let grips=[],cables=[];
const kneeSamples=[];for(let i=0;i<model.vertices.length/3;i++){let w=0;for(let a=0;a<4;a++)if(/^lowerleg01/.test(model.bones[model.skinIndices[i*4+a]].name))w+=model.skinWeights[i*4+a];if(w>.5)kneeSamples.push(i);}
function kneeBottom(){const knee=byName['lowerleg01.L'].getWorldPosition(new THREE.Vector3());let low=Infinity;for(const i of kneeSamples){const p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i));if(p.z>knee.z-.7)low=Math.min(low,p.y);}return low;}
function pose(frame){const t=((frame%480)+480)%480/480,smooth=x=>x*x*x*(x*(x*6-15)+10),lift=t<.4375?smooth(t/.4375):t<.5625?1:1-smooth((t-.5625)/.4375);
 for(let i=0;i<bones.length;i++){bones[i].quaternion.identity();bones[i].position.copy(restPositions[i]);}
 grips=applyMotion(exercise,lift,{byName,dataByName,mesh});mesh.updateMatrixWorld(true);skeleton.update();
 kneePad.position.y=kneeBottom()-.25;carriage.position.y=kneePad.position.y;padCrossbar.position.y=kneePad.position.y-.3;for(const arm of arms)arm.position.y=kneePad.position.y-.3;stack.position.y=-1-4.65*lift;
 for(const m of cables){scene.remove(m);m.geometry.dispose();}cables=[rod([0,carriage.position.y+.25,-9],[0,10.95,-9],.035,rubber),rod([0,10.95,-9],[0,10.95,-10.5],.035,rubber),rod([0,10.95,-10.5],[0,stack.position.y+.75,-10.5],.035,rubber)];
}
window.renderSkinned=(frame=0,view='full',dark=false)=>{pose(frame);camera.zoom=.79;camera.position.set(view==='side'?32:24,4,view==='side'?0:30);camera.lookAt(0,1,-2.5);camera.updateProjectionMatrix();scene.background=dark==='alpha'?null:new THREE.Color(dark?'#09090b':'#fafafa');renderer.setClearAlpha(dark==='alpha'?0:1);renderer.render(scene,camera);return canvas.toDataURL('image/png').split(',')[1];};
window.inspectRunning=frame=>{pose(frame);const j={};for(const s of ['L','R'])for(const n of ['upperleg01','lowerleg01','foot','upperarm01','lowerarm01','wrist'])j[n+'.'+s]=byName[n+'.'+s].getWorldPosition(new THREE.Vector3()).toArray();for(const n of ['root','spine01','head'])j[n]=byName[n].getWorldPosition(new THREE.Vector3()).toArray();for(const {side,socket,grip}of grips){j['grip.'+side]=byName['wrist.'+side].localToWorld(socket.clone()).toArray();j['target.'+side]=grip.toArray();}j.kneePad=kneePad.position.toArray();j.stack=stack.position.toArray();return j;};
window.inspectGeometry=frame=>{pose(frame);let body=Infinity,barClearance=Infinity,shinBack=Infinity;for(let i=0;i<model.vertices.length/3;i++){const p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i));body=Math.min(body,p.y);let arm=0;for(let k=0;k<4;k++)if(/arm|wrist|finger|hand/.test(model.bones[model.skinIndices[i*4+k]].name))arm+=model.skinWeights[i*4+k];if(Math.abs(p.x)<2.5&&arm<.1)barClearance=Math.min(barClearance,Math.hypot(p.y-11,p.z-1.2)-.13);if(model.vertices[i*3+1]<-4)shinBack=Math.min(shinBack,p.z);}return {kneeGap:kneeBottom()-kneePad.position.y-.25,bodyFloorGap:body+8.825,barClearance,shinRearClearance:shinBack+8.7};};
window.renderSkinned(0);window.ready=true;
