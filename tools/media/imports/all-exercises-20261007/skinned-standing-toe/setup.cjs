const fs=require('fs');const b='tools/media/imports/all-exercises-20261007/skinned-standing-toe',old='tools/media/imports/all-exercises-20261007/skinned-single-calf';fs.mkdirSync(b,{recursive:true});fs.copyFileSync(old+'/human.json',b+'/human.json');
for(const file of ['studio.mjs','motion.mjs','render.mjs','verify-playback.mjs']){
 let s=fs.readFileSync(old+'/'+file,'utf8').replaceAll('skinned-single-calf','skinned-standing-toe').replaceAll('single-leg-calf-raise','standing-toe-raise');
 if(file==='motion.mjs'){
 s=s.replace('export function applySupport({byName,dataByName,mesh}){',`export function applySupport(state){for(const side of ['L','R']){const sign=side==='L'?1:-1;const {mesh}=state;const remap=o=>new Proxy(o,{get:(obj,k)=>obj[typeof k==='string'?k.replace(/\\.R$/,'.'+side):k]});const byName=remap(state.byName),dataByName=remap(state.dataByName);`);
 s=s.replace('\n}\nexport const exercises','\n}}\nexport const exercises').replace('new THREE.Vector3(-4.7,2.5,1)','new THREE.Vector3(sign*2.2,2.5,3)').replace('pole=new THREE.Vector3(-1,0,-.3)','pole=new THREE.Vector3(sign,0,-.3)').replace('orientation(new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0))','orientation(new THREE.Vector3(0,0,1),new THREE.Vector3(-sign,0,0))');
 s=s.replace('rad(-15+45*lift)','rad(-25*lift)').replace("pivot=v(dataByName['toe2-1.L'].head)","pivot=new THREE.Vector3(1.921375,-8.164806,-.0299375)");
 s=s.replace("for(const side of ['L']){","for(const side of ['L','R']){").replace("for(let toe=1;toe<=5;toe++)byName['toe'+toe+'-1.'+side].rotation.x=-a;",'');
 s=s.replace("byName['upperleg01.R'].rotation.z=rad(25);byName['lowerleg01.R'].rotation.x=rad(70);",'');
 }
 if(file==='studio.mjs'){
 s=s.replace(/const step=new THREE.Mesh[\s\S]*?const restRotations =/,`const chairMaterial=new THREE.MeshStandardMaterial({color:'#536d75',roughness:.85});function box(w,h,d,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),chairMaterial);o.position.set(x,y,z);scene.add(o);}box(5.5,.15,1.4,0,2.06155,3.65);box(5.5,1.6,.18,0,1.2,3.65);box(5.5,.3,3.7,0,-3.4,5.5);for(const x of [-2.55,2.55]){box(.2,10.31,.2,x,-3.02,3.65);box(.2,4.62,.2,x,-5.865,7.2);} const restRotations =`);
 s=s.replace('dumbbell.visible=side==="L";','dumbbell.visible=false;').replace('if(!name.endsWith(".R")||!name.startsWith("finger"))','if(!name.startsWith("finger"))');
 s=s.replace('-9.375','-8.175').replace('contactShadow.position.set(0,-9.37,2.5)','contactShadow.position.set(0,-8.17,2.5)');
 s=s.replace('if(model.vertices[i*3+1]>-7.8||model.vertices[i*3]<0)continue;','if(model.vertices[i*3+1]>-7.8||model.vertices[i*3+2]>.3)continue;').replace('if(p.z>=1.45&&p.z<=4.45&&Math.abs(p.x)<=3.5)supportMin','if(Math.abs(p.x)<=3.5)supportMin');
 s=s.replace("else camera.position.set(exercise==='alternating-dumbbell-front-raise'?23:15,4.5,32);","else camera.position.set(25,4.5,-24);");
 s=s.replace('p.x>=-5.1&&p.x<=-4.3&&p.z>=1&&p.z<=2.2','Math.abs(p.x)<=2.75&&p.z>=2.95&&p.z<=4.35');
 }
 fs.writeFileSync(b+'/'+file,s);
}
