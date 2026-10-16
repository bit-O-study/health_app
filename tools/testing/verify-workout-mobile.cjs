/* eslint-disable @typescript-eslint/no-require-imports -- Standalone actual-component layout audit. */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = process.cwd();
const resolve = Module._resolveFilename;
const load = Module._load;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, ...args); };
Module._load = function(name, ...args) {
  if (name === 'server-only') return {};
  if (name === 'next/navigation') return {useRouter:()=>({}), usePathname:()=>'/routine'};
  // No account, network writes, camera or native APIs are used by this SSR layout audit.
  if (/actions$|supabase\/(server|client)$/.test(name)) return new Proxy({}, {get:()=>async()=>({ok:true})});
  return load.call(this, name, ...args);
};
for (const ext of ['.ts','.tsx']) require.extensions[ext] = (mod,file) => mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);

async function main() {
 const React = require('react');
 const {renderToString} = require('react-dom/server');
 const {GuidedOverlay} = require(path.join(root,'src/features/workout-timer/guided-workout.tsx'));
 const {ConditioningEditor} = require(path.join(root,'src/features/routine/components/conditioning-editor.tsx'));
 const {ALL_EXERCISES} = require(path.join(root,'src/features/routine/exercise-catalog.ts'));
 const EXERCISES = Object.fromEntries(ALL_EXERCISES.map(e=>[e.id,e]));
 const {conditioningOptions} = require(path.join(root,'src/features/routine/conditioning-catalog.ts'));
 const postcss = Module.createRequire(require.resolve('@tailwindcss/postcss'))('postcss');
 const css = (await postcss([require('@tailwindcss/postcss')()]).process(fs.readFileSync('src/styles/globals.css','utf8'),{from:path.join(root,'src/styles/globals.css')})).css;
 const entries = Object.values(EXERCISES);
 const out = path.join(root,'test-results/workout-mobile');fs.mkdirSync(out,{recursive:true});
 const noop=()=>{};
 const server=require('node:http').createServer((req,res)=>{
  try {
   const url=new URL(req.url,'http://localhost');let content;
   if(url.pathname==='/style.css'){res.setHeader('Content-Type','text/css');return res.end(css);}
   if(url.pathname==='/conditioning') {
    content=React.createElement(ConditioningEditor,{kind:'warmup',focus:'lower',lockWeightReps:url.searchParams.get('lock')==='1',initial:conditioningOptions('warmup').map((item,i)=>({id:String(i),itemId:item.id,kind:'warmup',position:i,focus:'lower',durationMin:5,speed:5,incline:0,sets:3,reps:10}))});
   } else {
    const ex=EXERCISES[url.searchParams.get('id')] || entries[0];
    const item={kind:'main',rowId:ex.id,exerciseId:ex.id,name:ex.name,target:ex.target,focus:'lower',equipment:ex.equipments[0].equipment,method:[],subtitle:'3세트 · 10회',sets:3,reps:10,weightKg:20,memo:null,advice:null,media:null,supersetGroup:null};
    content=React.createElement(GuidedOverlay,{items:[item],onClose:noop,onAllComplete:noop,elapsedLabel:'00:30',onPauseResume:noop,showGuide:false,postureEnabled:true,lockWeightReps:url.searchParams.get('lock')==='1'});
   }
   res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><main>'+renderToString(content)+'</main>');
  } catch(e){res.statusCode=500;res.end(e.stack);}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const {chromium}=require('@playwright/test');let browser;
 try {
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();const failures=[];let count=0;
  const selected=process.argv.includes('--all') ? entries : entries.filter(e=>/^(squat|barbell-back-squat|goblet-squat|push-up)$/.test(e.id));
  for(const width of [320,360,390,430]) {
   await page.setViewportSize({width,height:780});
   for(const ex of selected) {
    const response=await page.goto(`http://127.0.0.1:${server.address().port}/?id=${ex.id}`);
    if(response.status()!==200)throw Error(await page.locator('body').innerText());
    const issues=await page.evaluate(()=>{
     const title=document.querySelector('h2');const result=[];
     if(!title||title.clientWidth<80||title.scrollWidth>title.clientWidth+1)result.push('exercise title clipped');
     for(const button of document.querySelectorAll('button')){const b=button.getBoundingClientRect();if(b.width&& (b.left< -1||b.right>innerWidth+1))result.push('button outside viewport: '+button.textContent.trim());}
     for(const slider of document.querySelectorAll('[role=slider]')){const tile=slider.parentElement;const t=tile.getBoundingClientRect();for(const btn of tile.querySelectorAll('button')){const b=btn.getBoundingClientRect();if(b.left<t.left-1||b.right>t.right+1)result.push('step button outside tile');}}
     return [...new Set(result)];
    });count++;
    if(issues.length)failures.push({width,id:ex.id,issues});
    if(/^(squat|goblet-squat)$/.test(ex.id)&&width===360)await page.screenshot({path:path.join(out,ex.id+'.png')});
   }
   for(const lock of [0,1]){
    await page.goto(`http://127.0.0.1:${server.address().port}/conditioning?lock=${lock}`);
    const misaligned=await page.locator('button[aria-label="삭제"]').evaluateAll(buttons=>buttons.filter(b=>{const row=b.parentElement.getBoundingClientRect(),r=b.getBoundingClientRect();return row.right-r.right>14||r.top-row.top>14;}).length);
    count++;if(misaligned)failures.push({width,conditioning:true,lock,misaligned});
    if(width===360&&!lock)await page.screenshot({path:path.join(out,'warmup.png'),fullPage:true});
   }
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({at:new Date().toISOString(),scope:'Actual components SSR and Tailwind, Edge mobile viewport; no hydration/device verification',catalog:entries.length,checked:count,failures},null,2));
  console.log(JSON.stringify({catalog:entries.length,checked:count,failures:failures.slice(0,12),failureCount:failures.length}));if(failures.length)process.exitCode=1;
 } finally {await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
