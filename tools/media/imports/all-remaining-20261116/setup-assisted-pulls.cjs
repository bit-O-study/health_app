const fs=require('node:fs'),assert=require('node:assert/strict');
const root='tools/media/imports/all-remaining-20261116',base=root+'/assisted-pulls',old=root+'/slow-controls',read=p=>fs.readFileSync(p,'utf8'),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
assert.ok(!fs.existsSync(base+'/batch.json'));fs.mkdirSync(base,{recursive:true});
const ids=['assisted-pull-up','assisted-pull-up-2'],master=JSON.parse(read(root+'/batch.json')),entries=[];
for(const id of ids){const e=master.entries.find(e=>e.id===id);assert.equal(e.status,'awaiting-motion-implementation');assert.deepEqual(e.equipment,['machine']);e.status='motion-preview';e.group='assisted-pulls';entries.push({id,original:'assisted-pull-up',equipment:'machine',hold:false,status:'awaiting-preview-review',recipe:{family:'assisted-pull-up',sourceUrls:['https://www.strengthlog.com/assisted-pull-up/'],criteria:'Pronated pull-up with both knees continuously supported by a rising counterweighted pad; 3.5 seconds up, 1 second top, 3.5 seconds down.',sourcesCheckedAt:'2026-11-16'}});
 let motion=read(root+'/tempo-holds/tempo-pull-up-motion.mjs').replaceAll('tempo-pull-up',id);
 motion=motion.replace("if(id==='lat-pulldown'){\n   aim(hip",`if(id==='${id}'){aim(hip,rest(hip,knee),v([0,-1,0]));aim(knee,rest(knee,foot),v([0,0,-1]));mesh.updateMatrixWorld(true);byName[foot].quaternion.copy(byName[foot].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(v([1,0,0]),Math.PI)));}\n  if(id==='lat-pulldown'){\n   aim(hip`);
 const studio=read(root+'/tempo-holds/tempo-pull-up-studio.mjs').split('const rubber=new THREE.MeshStandardMaterial')[0]+read(root+'/assisted-studio-tail.mjs');
 fs.writeFileSync(base+'/'+id+'-motion.mjs',motion);fs.writeFileSync(base+'/'+id+'-studio.mjs',studio);
}
for(const name of ['render','verify','finalize','prepare','publish','check-published'])fs.writeFileSync(base+'/'+name+'.mjs',read(old+'/'+name+'.mjs').replaceAll(old,base).replaceAll(JSON.stringify(['tempo-overhead-press','eccentric-nordic-curl']),JSON.stringify(ids)));
write(base+'/batch.json',{entries});write(root+'/batch.json',master);
