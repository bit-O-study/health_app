import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const base='tools/media/imports/hundred-20261111';
const model=JSON.parse(readFileSync('tools/media/imports/all-exercises-20261007/skinned-quadruped-hip-extension-20261014/human.json'));
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(model.vertices,3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(model.skinIndices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(model.skinWeights,4));
const mesh=new THREE.SkinnedMesh(geometry),bones=model.bones.map(d=>{const b=new THREE.Bone();b.name=d.name;return b;}),byName=Object.fromEntries(bones.map(b=>[b.name,b])),dataByName=Object.fromEntries(model.bones.map(d=>[d.name,d]));
for(let i=0;i<bones.length;i++){const d=model.bones[i],parent=d.parent?byName[d.parent]:mesh,head=d.parent?dataByName[d.parent].head:[0,0,0];bones[i].position.fromArray(d.head.map((x,k)=>x-head[k]));parent.add(bones[i]);}
mesh.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(bones));mesh.normalizeSkinWeights();const rest=bones.map(b=>b.position.clone());
for(const id of ['decline-push-up','close-grip-push-up','wide-push-up']){
 let source=readFileSync(base+'/'+id+'-motion.mjs','utf8').replace("'./three.module.js'",JSON.stringify(pathToFileURL(process.cwd()+'/node_modules/three/build/three.module.js').href));
 if(process.argv[2])source=source.replace('const angle=rad(','const angle=rad('+Number(process.argv[2])+'+');
 const {applyMotion}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const results=[];
 for(const lift of [0,.5,1]){for(let i=0;i<bones.length;i++){bones[i].position.copy(rest[i]);bones[i].quaternion.identity();}try{applyMotion(id,lift,{mesh,byName,dataByName});mesh.updateMatrixWorld(true);mesh.skeleton.update();const a=byName['upperarm01.L'].getWorldPosition(new THREE.Vector3()),b=byName['lowerarm01.L'].getWorldPosition(new THREE.Vector3()),c=byName['wrist.L'].getWorldPosition(new THREE.Vector3());let min=Infinity;for(let i=0;i<geometry.attributes.position.count;i++)min=Math.min(min,mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i)).y);results.push({lift,elbow:a.clone().sub(b).angleTo(c.clone().sub(b))*180/Math.PI,shoulder:a.toArray(),floorClearance:min+7.9});}catch(e){results.push({lift,error:e.message});}}
 console.log(id,JSON.stringify(results));
}
