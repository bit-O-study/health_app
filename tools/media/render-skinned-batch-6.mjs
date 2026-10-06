import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const ids=["barbell-shrug","barbell-front-raise","barbell-upright-row","wide-grip-upright-row"];
const preview=process.argv.includes('--preview'),startedAt=new Date().toISOString();
const results=await Promise.all(ids.map(id=>new Promise(resolve=>{
 const start=Date.now();const child=spawn(process.execPath,['tools/media/render-skinned-exercise-6.mjs',id,...(preview?['--preview']:[])],{windowsHide:true,stdio:'inherit'});
 child.once('error',error=>resolve({id,pid:child.pid,error:error.message}));
 child.once('exit',code=>resolve({id,pid:child.pid,code,elapsedMs:Date.now()-start}));
})));
writeFileSync(`tools/media/motion-refresh/skinned-3d/batch-6${preview?'-preview':''}.json`,JSON.stringify({startedAt,finishedAt:new Date().toISOString(),concurrency:4,results},null,2)+'\n');
console.log(results);if(results.some(r=>r.code!==0))process.exitCode=1;
