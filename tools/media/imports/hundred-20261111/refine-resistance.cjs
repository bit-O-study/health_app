const fs=require('node:fs'),base='tools/media/imports/hundred-20261111';
for(const id of JSON.parse(fs.readFileSync(base+'/resistance-ids.json'))){
 const path=base+'/'+id+'-studio.mjs';let s=fs.readFileSync(path,'utf8');
 if(s.includes('const stacks=[]'))continue;
 s=s.replace("if(config.single)anchors.splice(1);", "if(config.family==='press')anchors.forEach(a=>a.x*=2);if(config.single)anchors.splice(1);");
 s=s.replace("const restPositions=bones.map",`const stacks=[],tops=[],initialLengths=[];
function box(w,h,d,position){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),steel);m.position.copy(position);scene.add(m);return m;}
if(config.equipment==='cable')for(const a of anchors){
 const top=a.clone().setY(13.5).add(new THREE.Vector3(0,0,a.z<0?-1.2:1.2));tops.push(top);
 rod(top.clone().setY(-7.8),top,.13);box(2,.3,2,top.clone().setY(-7.75));
 const stack=new THREE.Group();for(let n=0;n<6;n++){const plate=new THREE.Mesh(new THREE.BoxGeometry(1.3,.22,.8),steel);plate.position.y=n*.26;stack.add(plate);}stack.position.copy(top).setY(-6.1);scene.add(stack);stacks.push(stack);
 for(const point of [a,top]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.18,24),steel);wheel.rotation.z=Math.PI/2;wheel.position.copy(point);scene.add(wheel);}
 rod(a,top,.035,rubber);
}
const restPositions=bones.map`);
 s=s.replace("lengths.push(end.distanceTo(anchors[i]));",`const length=end.distanceTo(anchors[i]);lengths.push(length);if(config.equipment==='cable'){initialLengths[i]??=length;stacks[i].position.y=-6.1+length-initialLengths[i];const connection=stacks[i].position.clone().add(new THREE.Vector3(0,1.5,0));rods.push(rod(tops[i],connection,.035,rubber));}`);
 s=s.replace("camera.zoom=config.anchor[1]>10?.7:.8", "camera.zoom=config.equipment==='cable'?.65:config.anchor[1]>10?.7:.8");
 s=s.replace("camera.lookAt(0,config.anchor[1]>10?2:.3,config.anchor[2]/3)","camera.lookAt(config.family==='lateral'?-1.5:0,config.equipment==='cable'||config.anchor[1]>10?2:.3,config.anchor[2]/3)");
 s=s.replace("j.lengths=lengths;return j", "j.lengths=lengths;j.cableTotals=stacks.map((s,i)=>lengths[i]+tops[i].y-s.position.y-1.5);j.stackHeights=stacks.map(s=>s.position.y);return j");
 fs.writeFileSync(path,s);
}
