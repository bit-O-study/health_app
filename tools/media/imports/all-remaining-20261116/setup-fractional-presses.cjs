const fs=require('node:fs'),assert=require('node:assert/strict');
const root='tools/media/imports/all-remaining-20261116',base=root+'/fractional-presses',read=p=>fs.readFileSync(p,'utf8'),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
assert.ok(!fs.existsSync(base+'/batch.json'));fs.mkdirSync(base,{recursive:true});
const master=JSON.parse(read(root+'/batch.json')),entries=[];
for(const id of ['1-25-rep-bench-press','1-5-rep-shoulder-press']){
 const bench=id==='1-25-rep-bench-press',old=root+(bench?'/barbell-controls':'/slow-controls'),original=bench?'eccentric-bench-press':'tempo-overhead-press',e=master.entries.find(e=>e.id===id);
 assert.equal(e.status,'awaiting-motion-implementation');assert.deepEqual(e.equipment,['barbell']);e.status='motion-preview';e.group='fractional-presses';
 let motion=read(old+'/'+original+'-motion.mjs').replaceAll(original,id),studio=read(old+'/'+original+'-studio.mjs').replaceAll(original,id);
 const oldTiming=bench?'const lift = t < .375 ? 1-smooth(t/.375) : t < .5 ? 0 : t < .625 ? smooth((t-.5)/.125) : 1;':'const lift = t < .375 ? smooth(t/.375) : t < .5 ? 1 : t < .875 ? 1-smooth((t-.5)/.375) : 0;';assert.ok(studio.includes(oldTiming));
 studio=studio.replace(oldTiming,bench?'const lift = t < .25 ? 1-smooth(t/.25) : t < .375 ? .25*smooth((t-.25)/.125) : t < .5 ? .25*(1-smooth((t-.375)/.125)) : t < .875 ? smooth((t-.5)/.375) : 1;':'const lift = t < .1875 ? .5*smooth(t/.1875) : t < .375 ? .5*(1-smooth((t-.1875)/.1875)) : t < .6875 ? smooth((t-.375)/.3125) : 1-smooth((t-.6875)/.3125);');
 fs.writeFileSync(base+'/'+id+'-motion.mjs',motion);fs.writeFileSync(base+'/'+id+'-studio.mjs',studio);
 entries.push({id,original:bench?'bench-press':'barbell-overhead-press',equipment:'barbell',hold:false,status:'awaiting-preview-review',recipe:{family:id,sourceUrls:[bench?'https://www.strengthlog.com/bench-press/':'https://www.strengthlog.com/overhead-press/'],sourcesCheckedAt:'2026-11-16',criteria:bench?'Quarter-extra repetition: lower to chest, press one quarter, lower again, press fully; feet and bench support fixed. Fractional timing is illustrative.':'Half-extra standing strict press: half press, lower to shoulders, full press, lower to shoulders. No leg drive; fractional timing is illustrative.'}});
}
const old=root+'/pulldown-variants';
for(const name of ['render','verify','finalize','prepare','publish','check-published'])fs.writeFileSync(base+'/'+name+'.mjs',read(old+'/'+name+'.mjs').replaceAll(old,base).replaceAll('["v-bar-lat-pulldown","partial-pulldown"]','["1-25-rep-bench-press","1-5-rep-shoulder-press"]'));
fs.writeFileSync(root+'/review-fractional-presses.cjs',read(root+'/review-barbell-controls.cjs').replaceAll(root+'/barbell-controls',base).replace('Timing is illustrative. Holds show the maintained position only; entry and exit are not animated.','Fractional repetition timing is illustrative. Unracking and reracking are omitted.'));
write(base+'/batch.json',{entries});write(root+'/batch.json',master);
