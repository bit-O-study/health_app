const fs=require('node:fs'),assert=require('node:assert/strict');
const root='tools/media/imports/all-remaining-20261116',base=root+'/pulldown-variants',read=p=>fs.readFileSync(p,'utf8'),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
assert.ok(!fs.existsSync(base+'/batch.json'));fs.mkdirSync(base,{recursive:true});
const master=JSON.parse(read(root+'/batch.json')),entries=[];
for(const id of ['v-bar-lat-pulldown','partial-pulldown']){
 const partial=id==='partial-pulldown',old=root+(partial?'/superwide-pull':'/neutral-pulldowns'),original=partial?'super-wide-grip-pulldown':'close-neutral-grip-lat-pulldown';
 const e=master.entries.find(e=>e.id===id);assert.equal(e.status,'awaiting-motion-implementation');assert.deepEqual(e.equipment,['cable']);e.status='motion-preview';e.group='pulldown-variants';
 let motion=read(old+'/'+original+'-motion.mjs').replaceAll(original,id),studio=read(old+'/'+original+'-studio.mjs').replaceAll(original,id);
 if(partial){motion=motion.replace('sign*4.8,6.5-4.3*lift','sign*3.6,6.5-2.15*lift');studio=studio.replaceAll('4.3*lift','2.15*lift').replace('[-5.4,c.y,c.z],[5.4,c.y,c.z]','[-4.2,c.y,c.z],[4.2,c.y,c.z]');}
 studio=studio.replace('const radians = THREE.MathUtils.degToRad;','').replace(',initialLength;',';');
 fs.writeFileSync(base+'/'+id+'-motion.mjs',motion);fs.writeFileSync(base+'/'+id+'-studio.mjs',studio);
 entries.push({id,original,equipment:'cable',hold:false,halfWidth:partial?3.6:.85,stroke:partial?2.15:5.1,grip:partial?'pronated':'neutral',status:'awaiting-preview-review',recipe:{family:id,sourceUrls:[partial?'https://www.puregym.com/exercises/back/lat-exercises/wide-grip-lat-pulldown/':'https://www.puregym.com/exercises/back/lat-exercises/close-grip-lat-pulldown/'],criteria:partial?'Illustrative upper-half pulldown: overhand grip, from overhead only halfway toward chest; 3.5 seconds pull, 1 second pause, 3.5 seconds return. Partial range is an explicit demonstration choice, not a claim that the reference prescribes it.':'Narrow neutral V handle pulldown, fixed seated torso, thighs and feet supported; 3.5 seconds pull, 1 second pause, 3.5 seconds return.',sourcesCheckedAt:'2026-11-16'}});
}
const old=root+'/superwide-pull';
for(const name of ['render','verify','finalize','prepare','publish','check-published'])fs.writeFileSync(base+'/'+name+'.mjs',read(old+'/'+name+'.mjs').replaceAll(old,base).replaceAll('["super-wide-grip-pulldown"]','["v-bar-lat-pulldown","partial-pulldown"]'));
let check=read(root+'/check-superwide-pull.mjs').replaceAll(old,base).replace('j.handAxes[s][0]*(s===0?-1:1)>.98',"(e.grip==='pronated'?j.handAxes[s][0]*(s===0?-1:1):j.handAxes[s][2]*(s===0?1:-1))>.98").replace(']-4.3)',']-e.stroke)');
fs.writeFileSync(root+'/check-pulldown-variants.mjs',check);
fs.writeFileSync(root+'/review-pulldown-variants.cjs',read(root+'/review-superwide-pull.cjs').replaceAll(old,base).replace("'Extra-wide pronated grip remains on the long straight bar.'","e.grip==='pronated'?'Overhand grip stays on the straight bar during upper-half travel.':'Narrow neutral grip stays on the V handle.'"));
write(base+'/batch.json',{entries});write(root+'/batch.json',master);
