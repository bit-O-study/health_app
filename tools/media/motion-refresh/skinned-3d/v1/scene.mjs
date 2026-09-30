import * as THREE from './three.module.js';
const model=await(await fetch('./human.json')).json();
const canvas=document.querySelector('canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(900,900);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();scene.background=new THREE.Color('#eceeeb');
const camera=new THREE.PerspectiveCamera(34,1,.1,120);camera.position.set(18,5,34);camera.lookAt(0,.6,0);
scene.add(new THREE.HemisphereLight(0xffffff,0x626f74,2));
const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(-10,20,17);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:60});key.shadow.bias=-.0002;key.shadow.normalBias=.03;scene.add(key);
const fill=new THREE.DirectionalLight(0xaac6da,1.2);fill.position.set(10,8,-12);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0xeceeeb,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-8.48;floor.receiveShadow=true;scene.add(floor);
const geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.Float32BufferAttribute(model.vertices,3));
geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(model.skinIndices,4));
geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(model.skinWeights,4));geometry.setIndex(model.indices);geometry.computeVertexNormals();
const positions=geometry.attributes.position;
// The clothing material follows the same weighted surface; this pilot uses simple fitted shorts.
const skin=new THREE.MeshStandardMaterial({color:0xa5a8a8,roughness:.67,metalness:.02});
// Evaluate the fitted-shorts edge per fragment in rest coordinates, not per triangle.
skin.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 restPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nrestPosition=position;');shader.fragmentShader='varying vec3 restPosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(restPosition.y < 1.1 && restPosition.y > -2.7) diffuseColor.rgb=vec3(0.015,0.22,0.26);');};
const mesh=new THREE.SkinnedMesh(geometry,skin);mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
const bones=model.bones.map(data=>{const b=new THREE.Bone();b.name=data.name;return b;});const byName=Object.fromEntries(bones.map(b=>[b.name,b]));const dataByName=Object.fromEntries(model.bones.map(b=>[b.name,b]));
for(let i=0;i<bones.length;i++){const data=model.bones[i],parent=data.parent?byName[data.parent]:mesh;const parentHead=data.parent?dataByName[data.parent].head:[0,0,0];bones[i].position.fromArray(data.head.map((x,k)=>x-parentHead[k]));parent.add(bones[i]);}
mesh.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(bones);mesh.bind(skeleton);mesh.normalizeSkinWeights();
const breathPosition=new Float32Array(model.vertices);for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);const amount=Math.exp(-(((y-3)/2)**2))*Math.max(0,1-Math.abs(x)/2.4);breathPosition[i*3+2]+=amount*(z>0?.05:-.012);}
geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(breathPosition,3)];mesh.updateMorphTargets();
const lowerBase={};for(const side of ['L','R']){const upper=dataByName['upperarm01.'+side],elbow=dataByName['lowerarm01.'+side],wrist=dataByName['wrist.'+side];const dir=new THREE.Vector3().fromArray(elbow.head).sub(new THREE.Vector3().fromArray(upper.head)).normalize();const from=new THREE.Vector3().fromArray(wrist.head).sub(new THREE.Vector3().fromArray(elbow.head)).normalize();dir.z+=.12;dir.normalize();lowerBase[side]=new THREE.Quaternion().setFromUnitVectors(from,dir);}
const gripRotations={};
const vec=a=>new THREE.Vector3().fromArray(a);
for(const side of ['L','R']){
 const index=vec(dataByName['finger2-1.'+side].head),little=vec(dataByName['finger5-1.'+side].head);
 const across=index.clone().sub(little).normalize();
 const forward=vec(dataByName['finger3-1.'+side].tail).sub(vec(dataByName['finger3-1.'+side].head)).normalize();
 const inward=new THREE.Vector3().crossVectors(across,forward).normalize().multiplyScalar(side==='L'?-1:1);
 const palmDirection=index.clone().add(little).multiplyScalar(.5).sub(vec(dataByName['wrist.'+side].head)).normalize();
 const forearmDirection=vec(dataByName['wrist.'+side].head).sub(vec(dataByName['lowerarm01.'+side].head)).normalize();
 gripRotations['wrist.'+side]=new THREE.Quaternion().setFromUnitVectors(palmDirection,forearmDirection);
 const thumb=dataByName['finger1-1.'+side];
 gripRotations['finger1-1.'+side]=new THREE.Quaternion().setFromUnitVectors(vec(thumb.tail).sub(vec(thumb.head)).normalize(),index.clone().addScaledVector(inward,.23).sub(vec(thumb.head)).normalize());
 for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)gripRotations[`finger${finger}-${joint}.${side}`]=new THREE.Quaternion().setFromAxisAngle(across,THREE.MathUtils.degToRad((side==='L'?-1:1)*[0,65,85,55][joint]));
 const hand=new THREE.Group();const center=index.clone().add(little).multiplyScalar(.5).addScaledVector(forward,.13).addScaledVector(inward,.18);
 hand.position.copy(center.sub(vec(dataByName['wrist.'+side].head)));hand.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),across);byName['wrist.'+side].add(hand);
 const metal=new THREE.MeshStandardMaterial({color:0x7c858a,metalness:.7,roughness:.3});const rubber=new THREE.MeshStandardMaterial({color:0x242a30,roughness:.8});
 const handle=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,1.25,20),metal);hand.add(handle);
 for(const end of [-1,1]){const plate=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.42,8),rubber);plate.position.y=end*.78;plate.castShadow=true;hand.add(plate);}
}
window.renderSkinned=(frame=0)=>{
 const phase=(1-Math.cos(2*Math.PI*frame/480))/2;
 for(const bone of bones)bone.quaternion.identity();
 for(const [name,rotation] of Object.entries(gripRotations))byName[name].quaternion.copy(rotation);
 for(const side of ['L','R']){const sign=side==='L'?1:-1;byName['clavicle.'+side].rotation.z=sign*THREE.MathUtils.degToRad(4*phase);byName['shoulder01.'+side].rotation.z=sign*THREE.MathUtils.degToRad(10*phase);byName['upperarm01.'+side].rotation.z=sign*THREE.MathUtils.degToRad(-35+60*phase);byName['lowerarm01.'+side].quaternion.copy(lowerBase[side]);}
 const breath=(1-Math.cos(2*Math.PI*frame/480))/2;mesh.morphTargetInfluences[0]=breath;byName.spine02.rotation.x=.006*Math.sin(2*Math.PI*frame/480);if(byName.neck01)byName.neck01.rotation.x=-.003*Math.sin(2*Math.PI*frame/480);
 mesh.updateMatrixWorld(true);skeleton.update();renderer.render(scene,camera);return canvas.toDataURL('image/png').split(',')[1];
};
window.inspectSkinned=()=>({bones:bones.length,vertices:positions.count,triangles:model.indices.length/3});
window.renderSkinned(0);window.ready=true;
