const fs=require('node:fs'),assert=require('node:assert/strict');
const root='tools/media/imports/all-remaining-20261116',base=root+'/leg-press-variants',old=root+'/tempo-holds',read=p=>fs.readFileSync(p,'utf8'),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
assert.ok(!fs.existsSync(base+'/batch.json'));fs.mkdirSync(base,{recursive:true});
const master=JSON.parse(read(root+'/batch.json')),ids=['1-5-rep-leg-press','partial-leg-press'],entries=[];
for(const id of ids){
 const partial=id==='partial-leg-press',e=master.entries.find(e=>e.id===id);assert.equal(e.status,'awaiting-motion-implementation');assert.deepEqual(e.equipment,['machine']);e.status='motion-preview';e.group='leg-press-variants';
 let motion=read(old+'/tempo-leg-press-motion.mjs').replaceAll('tempo-leg-press',id),studio=read(old+'/tempo-leg-press-studio.mjs').replaceAll('tempo-leg-press',id);
 const oldTiming='lift=t<.125?smooth(t/.125):t<.25?1:t<.625?1-smooth((t-.25)/.375):0';assert.ok(studio.includes(oldTiming));
 const timing=partial?'lift=.5+.5*(t<.4375?smooth(t/.4375):t<.5625?1:1-smooth((t-.5625)/.4375))':'lift=t<.25?1-smooth(t/.25):t<.4375?.5*smooth((t-.25)/.1875):t<.625?.5*(1-smooth((t-.4375)/.1875)):t<.9375?smooth((t-.625)/.3125):1';
 studio=studio.replace(oldTiming,timing);
 fs.writeFileSync(base+'/'+id+'-motion.mjs',motion);fs.writeFileSync(base+'/'+id+'-studio.mjs',studio);
 entries.push({id,original:'leg-press',equipment:'machine',hold:false,status:'awaiting-preview-review',recipe:{family:id,sourceUrls:['https://www.nasm.org/resource-center/exercise-library/leg-press'],sourcesCheckedAt:'2026-11-16',criteria:partial?'Upper-half leg press, knee included angle 130 to 165 degrees; maintain seat, back and footplate contact. Illustrative partial range, not full-depth repetition.':'One-and-a-half repetition: lower fully, press halfway, lower again, press to top. Knee included angle 165, 95, 130, 95, 165 degrees; supported back and feet.'}});
}
for(const name of ['render','verify','finalize','prepare','publish','check-published'])fs.writeFileSync(base+'/'+name+'.mjs',read(old+'/'+name+'.mjs').replaceAll(old,base).replaceAll(JSON.stringify(['tempo-pull-up','tempo-leg-press','isometric-pull-up-hold','isometric-push-up-hold']),JSON.stringify(ids)));
fs.writeFileSync(root+'/review-leg-press-variants.cjs',read(root+'/review-barbell-controls.cjs').replaceAll(root+'/barbell-controls',base).replace('Both feet retain their planted support positions.','Both feet retain contact with the moving sled plate.').replace('Timing is illustrative. Holds show the maintained position only; entry and exit are not animated.','Range and timing are illustrative; entry and exit are not animated.'));
write(base+'/batch.json',{entries});write(root+'/batch.json',master);
