/* eslint-disable @typescript-eslint/no-require-imports -- This standalone check installs a scoped CommonJS TypeScript loader for the actual component. */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const assert = require('assert/strict');
const ts = require('typescript');
const root = process.cwd();
const original = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return original.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, ...args); };
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText, file);
(async()=>{
 const React = require('react');
 const {renderToStaticMarkup} = require('react-dom/server');
 const {MediaEmbed} = require(path.join(root,'src/features/exercises/components/media-embed.tsx'));
 const requirePostcss=Module.createRequire(require.resolve('@tailwindcss/postcss'));
 const css = (await requirePostcss('postcss')([require('@tailwindcss/postcss')()]).process(fs.readFileSync('src/styles/globals.css','utf8'),{from:path.join(root,'src/styles/globals.css')})).css;
 const video='/exercise-guides/ai-v3/chest-dip.mp4';
 const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><section id="normal">'+renderToStaticMarkup(React.createElement(MediaEmbed,{url:video,darkUrl:'/exercise-guides/ai-v3/chest-dip-dark.mp4',kind:'video',autoPlay:true}))+'</section><section id="compact">'+renderToStaticMarkup(React.createElement(MediaEmbed,{url:video,darkUrl:'/exercise-guides/ai-v3/chest-dip-dark.mp4',kind:'video',autoPlay:true,compact:true}))+'</section></body></html>';
 const server=require('http').createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}else if(req.url===video){res.setHeader('Content-Type','video/mp4');res.end(fs.readFileSync(path.join(root,'public',video)));}else{res.statusCode=404;res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const {chromium}=require('@playwright/test');let browser;
 try {
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage(); const measurements=[];
 for(const width of [320,390,768]){
 await page.setViewportSize({width,height:844});await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('video').evaluateAll((videos,source)=>videos.forEach(v=>{v.src=source;}),video);await page.waitForFunction(()=>document.querySelector('#compact video').readyState>=1,{},{timeout:15000});
 const sizes=await page.evaluate(()=>({normal:document.querySelector('#normal video').getBoundingClientRect().height,compact:document.querySelector('#compact video').getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth}));
 assert(sizes.compact<=192.1);assert.equal(sizes.overflow,false);if(width>=390)assert(Math.abs(sizes.compact/sizes.normal-0.5)<0.01);measurements.push({width,...sizes});
 }
 const out='test-results/media-compact-resume';fs.mkdirSync(out,{recursive:true});await page.screenshot({path:out+'/comparison.png',fullPage:true});fs.writeFileSync(out+'/verification.json',JSON.stringify({date:new Date().toISOString(),component:'MediaEmbed actual source SSR, explicit light video source (no hydration), actual Tailwind CSS, Edge',measurements},null,2));console.log(JSON.stringify(measurements));
 } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
