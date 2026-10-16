import * as THREE from './three.module.js';
export function createMachine(scene){
 const metal=new THREE.MeshStandardMaterial({color:'#586e79',roughness:.55,metalness:.35}),chrome=new THREE.MeshStandardMaterial({color:'#aab9c3',roughness:.3,metalness:.7}),rubber=new THREE.MeshStandardMaterial({color:'#202b34',roughness:.7});
 const groups=[],parts=[],segments=[],plates=[],anchors=[],pivots=[];let initialized=false,info;
 function rod(group,a,b,r=.14,material=metal,fixed=false){const delta=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),24),material);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());m.userData.fixed=fixed;group.add(m);parts.push(m);segments.push({group,a:a.clone(),b:b.clone(),r});return m;}
 function update(grips,elbows,lift){
  if(!initialized){for(let i=0;i<2;i++){
   const sign=i===0?1:-1,pivot=new THREE.Vector3(sign*3.8,elbows[i].y,elbows[i].z),g=new THREE.Group();g.position.copy(pivot);scene.add(g);groups.push(g);pivots.push(pivot);const h=grips[i].clone().sub(pivot),front=new THREE.Vector3(0,h.y,h.z);anchors.push(h.clone());
   rod(g,new THREE.Vector3(),front,.16);rod(g,front,h,.14);rod(g,h.clone().add(new THREE.Vector3(-.62,0,0)),h.clone().add(new THREE.Vector3(.62,0,0)),.12,chrome);
   const weight=front.clone().multiplyScalar(.62);rod(g,weight,weight.clone().add(new THREE.Vector3(sign*1.7,0,0)),.14,chrome);
   const plate=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,.32,48),rubber);plate.rotation.z=Math.PI/2;plate.position.copy(weight).add(new THREE.Vector3(sign*1.05,0,0));g.add(plate);parts.push(plate);plates.push(plate);
   const collar=rod(g,weight.clone().add(new THREE.Vector3(sign*1.28,0,0)),weight.clone().add(new THREE.Vector3(sign*1.42,0,0)),.23,chrome);
   rod(scene,pivot.clone().add(new THREE.Vector3(-.35,0,0)),pivot.clone().add(new THREE.Vector3(.35,0,0)),.3,metal,true);
   const foot=new THREE.Vector3(pivot.x,-7.57,pivot.z);rod(scene,foot,pivot,.22,metal,true);rod(scene,foot.clone().add(new THREE.Vector3(0,0,-2)),foot.clone().add(new THREE.Vector3(0,0,3)),.18,metal,true);
  }initialized=true;}
  groups.forEach(g=>{g.rotation.x=-THREE.MathUtils.degToRad(100*lift);g.updateMatrixWorld(true);});scene.updateMatrixWorld(true);
  info={pivots:pivots.map(p=>p.toArray()),elbows:elbows.map(p=>p.toArray()),handles:groups.map((g,i)=>g.localToWorld(anchors[i].clone()).toArray()),handErrors:groups.map((g,i)=>g.localToWorld(anchors[i].clone()).distanceTo(grips[i])),plateCenters:plates.map(p=>p.getWorldPosition(new THREE.Vector3()).toArray()),rotations:groups.map(g=>g.quaternion.toArray())};return info;
 }
 function clearance(p){let min=Infinity;for(const s of segments){const a=s.group.localToWorld(s.a.clone()),b=s.group.localToWorld(s.b.clone()),d=b.sub(a),t=Math.max(0,Math.min(1,p.clone().sub(a).dot(d)/d.lengthSq()));min=Math.min(min,p.distanceTo(a.addScaledVector(d,t))-s.r);}for(const plate of plates){const v=plate.worldToLocal(p.clone()),r=Math.hypot(v.x,v.z)-1.05,h=Math.abs(v.y)-.16;min=Math.min(min,Math.hypot(Math.max(r,0),Math.max(h,0))+Math.min(Math.max(r,h),0));}return min;}
 return {update,inspect:()=>info,meshes:()=>parts,clearance,setDark:value=>{metal.emissive.set(value?'#202b34':'#000000');rubber.emissive.set(value?'#17232b':'#000000');}};
}
