const fs=require('node:fs');
const p='tools/media/imports/all-remaining-20261116/band-clam/band-clamshell-studio.mjs';
let s=fs.readFileSync(p,'utf8');
const bandCode=`
const bandGeometry=new THREE.BufferGeometry(),bandPoints=new Float32Array(64*2*3),bandIndices=[];
for(let i=0;i<64;i++){const n=(i+1)%64;bandIndices.push(i*2,i*2+1,n*2,i*2+1,n*2+1,n*2);}
bandGeometry.setAttribute('position',new THREE.BufferAttribute(bandPoints,3));bandGeometry.setIndex(bandIndices);
const band=new THREE.Mesh(bandGeometry,new THREE.MeshStandardMaterial({color:'#92bc40',roughness:.85,side:THREE.DoubleSide}));band.frustumCulled=false;scene.add(band);
let bandBaseLength,bandState;
function updateBand(){
 const pos=n=>byName[n].getWorldPosition(new THREE.Vector3()),hips=['L','R'].map(s=>pos('upperleg01.'+s)),knees=['L','R'].map(s=>pos('lowerleg01.'+s)),centers=hips.map((h,i)=>h.clone().lerp(knees[i],.85)),center=centers[0].clone().add(centers[1]).multiplyScalar(.5),axis=knees[0].clone().sub(hips[0]).normalize().add(knees[1].clone().sub(hips[1]).normalize()).normalize(),u=centers[0].clone().sub(centers[1]);u.addScaledVector(axis,-u.dot(axis));const span=u.length();u.normalize();const v=new THREE.Vector3().crossVectors(axis,u).normalize();
 const radial=p=>{const d=p.clone().sub(center),along=d.dot(axis);d.addScaledVector(axis,-along);const x=THREE.MathUtils.clamp(d.dot(u),-span/2,span/2);return {along,distance:d.addScaledVector(u,-x).length()};};
 let radius=0;const samples=[];
 for(let i=0;i<geometry.attributes.position.count;i++){let k=0;for(let a=1;a<4;a++)if(model.skinWeights[i*4+a]>model.skinWeights[i*4+k])k=a;const name=model.bones[model.skinIndices[i*4+k]].name;if(!name.startsWith('upperleg'))continue;const p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i)),d=radial(p);if(Math.abs(d.along)<.4){radius=Math.max(radius,d.distance);samples.push(d.distance);}}
 for(let i=0;i<clothGeometry.attributes.position.count;i++){const p=shorts.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i)),d=radial(p);if(Math.abs(d.along)<.4){radius=Math.max(radius,d.distance);samples.push(d.distance);}}
 radius+=.025;const length=2*span+2*Math.PI*radius;if(!bandBaseLength)bandBaseLength=length;const width=.55*Math.sqrt(bandBaseLength/length);let bottom=Infinity;
 for(let i=0;i<64;i++){const half=i<32?1:-1,a=i<32?-Math.PI/2+i*Math.PI/31:Math.PI/2+(i-32)*Math.PI/31,point=center.clone().addScaledVector(u,half*span/2+radius*Math.cos(a)).addScaledVector(v,radius*Math.sin(a));for(let edge=0;edge<2;edge++){const p=point.clone().addScaledVector(axis,(edge-.5)*width),index=(i*2+edge)*3;bandPoints[index]=p.x;bandPoints[index+1]=p.y;bandPoints[index+2]=p.z;bottom=Math.min(bottom,p.y);}}
 bandGeometry.attributes.position.needsUpdate=true;bandGeometry.computeVertexNormals();bandState={length,stretch:length/bandBaseLength,radius,width,span,skinClearance:radius-Math.max(...samples),floorClearance:bottom+7.9};
}
`;
if(s.includes('function updateBand'))throw Error('Already added');
s=s.replace('const restPositions=',bandCode+'\nconst restPositions=').replace('skeleton.update();}\nwindow.renderSkinned','skeleton.update();updateBand();}\nwindow.renderSkinned').replace('skeleton.update();}\r\nwindow.renderSkinned','skeleton.update();updateBand();}\r\nwindow.renderSkinned');
s=s.replace('return {headHandGap:','return {band:bandState,headHandGap:');
if(!s.includes('skeleton.update();updateBand();}'))throw Error('Missing pose integration');
fs.writeFileSync(p,s);
