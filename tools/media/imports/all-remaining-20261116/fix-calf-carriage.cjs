const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/all-remaining-20261116/calf-presses';
for(const id of ['calf-press-machine','pause-calf-raise']){const file=base+'/'+id+'-studio.mjs';let s=fs.readFileSync(file,'utf8');assert.ok(s.includes('2.1*Math.SQRT1_2'));
 s=s.replaceAll('2.1*Math.SQRT1_2','1.7*Math.SQRT1_2');
 s=s.replace('sled.push({sign,arm,sleeve,weight});','const connector=rod([0,0,0],[0,1.7*Math.SQRT1_2,-1.7*Math.SQRT1_2],.16);sled.push({sign,arm,sleeve,weight,connector});');
 s=s.replace('for(const {sign,arm,sleeve,weight}of sled){','for(const {sign,arm,sleeve,weight,connector}of sled){const offset=new THREE.Vector3(0,-1.7*Math.SQRT1_2,1.7*Math.SQRT1_2);connector.position.copy(plate.position).addScaledVector(offset,.5).add(new THREE.Vector3(sign*2.3,0,0));');
 s=s.replaceAll('arm.position.copy(plate.position).add(','arm.position.copy(plate.position).add(offset).add(').replaceAll('sleeve.position.copy(plate.position).add(','sleeve.position.copy(plate.position).add(offset).add(').replaceAll('weight.position.copy(plate.position).add(','weight.position.copy(plate.position).add(offset).add(');
 s=s.replace('let forefoot=-Infinity,heelEdge','let contactT=0,forefoot=-Infinity,heelEdge').replace('forefoot=Math.max(forefoot,p.dot(rail));','if(p.dot(rail)>forefoot){forefoot=p.dot(rail);contactT=t;}').replace('return {forefootGap:','return {contactT,forefootGap:');
 fs.writeFileSync(file,s);
}
