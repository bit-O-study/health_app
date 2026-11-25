const fs=require('node:fs'),assert=require('node:assert/strict');
const root='tools/media/imports/all-remaining-20261116',base=root+'/tempo-holds',old='tools/media/imports/pause-hip-thrust-20261115',rig='tools/media/imports/popular-three-b2-20261103';
fs.mkdirSync(base,{recursive:true});assert.ok(!fs.existsSync(base+'/batch.json'));
const read=p=>fs.readFileSync(p,'utf8'),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
const configs=[{id:'tempo-pull-up',original:'pull-up',equipment:'bodyweight',hold:false},{id:'tempo-leg-press',original:'leg-press',equipment:'machine',hold:false},{id:'isometric-pull-up-hold',original:'pull-up',equipment:'bodyweight',hold:true},{id:'isometric-push-up-hold',original:'tempo-push-up',equipment:'bodyweight',hold:true}];
const master=JSON.parse(read(root+'/batch.json'));
const entries=configs.map(c=>{const e=master.entries.find(e=>e.id===c.id);assert.equal(e.status,'awaiting-motion-implementation');e.status='motion-preview';e.group='tempo-holds';return {...c,status:'awaiting-preview-review',recipe:{family:c.original,sourceUrls:[c.original==='leg-press'?'https://www.nasm.org/resource-center/exercise-library/leg-press':c.original==='pull-up'?'https://www.puregym.com/exercises/back/pull-up/pull-ups/':'https://www.acefitness.org/resources/everyone/exercise-library/41/push-up/'],criteria:c.hold?'Eight-second static hold at the demonstrated position; duration illustrative.':'1-second concentric, 1-second hold, 3-second eccentric, 3-second start hold; illustrative timing.',sourcesCheckedAt:'2026-11-16'}};});
write(base+'/batch.json',{entries});write(root+'/batch.json',master);
for(const c of configs){
 let m,s;
 if(c.original==='tempo-push-up'){m=read('tools/media/imports/tempo-20261115/tempo-push-up-motion.mjs');s=read('tools/media/imports/tempo-20261115/tempo-push-up-studio.mjs').replace('function pose(frame){','function pose(frame){frame=210;');}
 else {m=read(rig+'/motion.mjs');s=read(rig+'/studio.mjs');if(c.hold)s=s.replace('function pose(frame){','function pose(frame){frame=240;');else s=s.replace('lift=(1-Math.cos(t*2*Math.PI))/2','smooth=x=>x*x*x*(x*(x*6-15)+10),lift=t<.125?smooth(t/.125):t<.25?1:t<.625?1-smooth((t-.25)/.375):0');}
 m=m.replaceAll("'"+c.original+"'","'"+c.id+"'");s=s.replaceAll("'"+c.original+"'","'"+c.id+"'");
 fs.writeFileSync(base+'/'+c.id+'-motion.mjs',m);fs.writeFileSync(base+'/'+c.id+'-studio.mjs',s);
}
for(const name of ['render.mjs','verify.mjs','finalize.mjs']){let s=read(old+'/'+name).replaceAll(old,base);if(name==='render.mjs')s=s.replace('contacts:poses[frame].joints.contacts',"...(poses[frame].joints.contacts?{contacts:poses[frame].joints.contacts}:await page.evaluate(f=>window.inspectGeometry(f),frame))");fs.writeFileSync(base+'/'+name,s);}
fs.writeFileSync(base+'/check-original.mjs',read(rig+'/check-poses.mjs').replace('poses[240].joints','poses[90].joints'));
for(const name of ['prepare','publish','check-published']){let s=read(old+'/'+name+'.mjs').replaceAll(old,base).replaceAll('["pause-hip-thrust"]',JSON.stringify(configs.map(c=>c.id))).replace("from '../../manage-motion-guides.mjs'","from '../../../manage-motion-guides.mjs'");if(name==='publish')s=s.replace("id==='plank'?'hold':'continuous'","id.startsWith('isometric-')?'hold':'continuous'");fs.writeFileSync(base+'/'+name+'.mjs',s);}
console.log(configs.map(c=>c.id));
