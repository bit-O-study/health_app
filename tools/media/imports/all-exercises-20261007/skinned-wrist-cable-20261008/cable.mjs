import * as THREE from './three.module.js';
export function createCable(parent){
 const offset=new THREE.Vector3(0,.423856,4),scene=new THREE.Group();scene.position.copy(offset);parent.add(scene);
 const r=.35,low=new THREE.Vector3(0,-6.8,5.5),upper=new THREE.Vector3(0,1.5,6.2),metal=new THREE.MeshStandardMaterial({color:'#64757e',roughness:.5,metalness:.45}),dark=new THREE.MeshStandardMaterial({color:'#25343b',roughness:.7}),wire=new THREE.MeshStandardMaterial({color:'#73838c',roughness:.45,metalness:.35});
 const box=(x,y,z,w,h,d,m=metal)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);scene.add(o);return o;};
 box(0,-7.97,6.4,3.2,.4,3.1);for(const x of [-1.15,1.15])box(x,-3,6.6,.26,9.6,.3);box(0,1.5,6.9,2.6,.3,.4);box(0,-6.8,6.9,2.6,.3,.4);box(.35,1.5,6.5,.18,.18,1.2);box(.35,-6.8,6.2,.18,.18,1.8);for(const x of [-.65,.65])box(x,-3.1,6.55,.06,8.4,.06,metal);box(0,-6.65,6.55,1.8,1.6,.85,dark);
 const stack=new THREE.Group();scene.add(stack);for(let i=0;i<5;i++){const o=new THREE.Mesh(new THREE.BoxGeometry(1.8,.22,.85),dark);o.position.set(0,-.11-i*.24,0);stack.add(o);}stack.position.set(0,-4.5,6.55);
 for(const c of [low,upper]){const w=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.18,48),dark);w.rotation.z=Math.PI/2;w.position.copy(c);scene.add(w);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.24,24),metal);hub.rotation.z=Math.PI/2;hub.position.copy(c);scene.add(hub);}
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.18,.045,12,32),metal);ring.rotation.y=Math.PI/2;scene.add(ring);
 const segments=Array.from({length:40},()=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(.032,.032,1,12),wire);scene.add(o);return o;});let baseline,info;
 function update(worldCenter){const center=worldCenter.clone().sub(offset);ring.position.copy(center);const p=center.clone().addScaledVector(low.clone().sub(center).normalize(),.18),dy=p.y-low.y,dz=p.z-low.z,d2=dy*dy+dz*dz,k=r*Math.sqrt(d2-r*r)/d2;const choices=[1,-1].map(sign=>new THREE.Vector3(0,low.y+r*r/d2*dy+sign*k*(-dz),low.z+r*r/d2*dz+sign*k*dy));const t=choices.sort((a,b)=>a.y-b.y)[0],angle=Math.atan2(t.y-low.y,t.z-low.z);const variable=p.distanceTo(t)+r*(-angle);if(baseline===undefined)baseline=variable;stack.position.y=-4.5+variable-baseline;
 const points=[p,t];for(let i=1;i<=12;i++){const a=angle*(1-i/12);points.push(new THREE.Vector3(0,low.y+r*Math.sin(a),low.z+r*Math.cos(a)));}points.push(new THREE.Vector3(0,upper.y,upper.z-r));for(let i=1;i<=16;i++){const a=Math.PI*(1-i/16);points.push(new THREE.Vector3(0,upper.y+r*Math.sin(a),upper.z+r*Math.cos(a)));}points.push(stack.position.clone());
 segments.forEach((o,i)=>{o.visible=i<points.length-1;if(!o.visible)return;const a=points[i],b=points[i+1],v=b.clone().sub(a);o.position.copy(a).add(b).multiplyScalar(.5);o.scale.y=v.length();o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());});
 info={start:p.toArray(),tangent:t.toArray(),low:low.toArray(),upper:upper.toArray(),radius:r,stack:stack.position.toArray(),stackRise:variable-baseline,totalLength:variable+(upper.y-low.y)+Math.PI*r+upper.y-stack.position.y,tangentDot:t.clone().sub(low).normalize().dot(p.clone().sub(t).normalize()),points:points.map(p=>p.toArray())};return info;
 }return {update,inspect:()=>({...info,...Object.fromEntries(["start","tangent","low","upper","stack"].map(k=>[k,new THREE.Vector3(...info[k]).add(offset).toArray()])),points:info.points.map(p=>new THREE.Vector3(...p).add(offset).toArray())}),setDark:value=>{metal.emissive.set(value?"#28343b":"#000000");dark.emissive.set(value?"#17232b":"#000000");wire.emissive.set(value?"#36434b":"#000000");}};
}



