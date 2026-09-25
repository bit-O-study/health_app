import {createServer} from 'node:http';
import {createReadStream,readFileSync,statSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const root=resolve(dir,'../../../..');
const allowed=new Set(JSON.parse(readFileSync(join(root,'public/exercise-guides/ai-v3/manifest-dark.json'),'utf8')));
const server=createServer((req,res)=>{
const url=new URL(req.url,'http://127.0.0.1');
if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(readFileSync(join(dir,'cutout-gallery.html'),'utf8').replaceAll('../../../../public/exercise-guides/ai-v3/','/media/').replaceAll('low-bar-reference/public/exercise-guides/ai-v3/','/candidate/').replaceAll('wrist-curl-16/public/exercise-guides/ai-v3/','/wrist-candidate/'));return;}
const m=/^\/(media|candidate|wrist-candidate)\/([a-z0-9-]+)\.mp4$/.exec(url.pathname);
if(!m){res.writeHead(404);res.end();return;}
const id=m[2].replace(/-dark$/,'');
if(m[1]==='media'?!allowed.has(id):id!==(m[1]==='candidate'?'low-bar-squat':'behind-the-back-wrist-curl')){res.writeHead(404);res.end();return;}
const path=m[1]==='media'?join(root,'public/exercise-guides/ai-v3',m[2]+'.mp4'):join(dir,m[1]==='candidate'?'low-bar-individual/public/exercise-guides/ai-v3':'wrist-curl-16/public/exercise-guides/ai-v3',m[2]+'.mp4');
const size=statSync(path).size;
const range=req.headers.range;
let start=0,end=size-1;
if(range){const r=/^bytes=(\d+)-(\d*)$/.exec(range);if(!r){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return;}start=Number(r[1]);end=r[2]?Math.min(Number(r[2]),size-1):size-1;if(start>end){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return;}}
res.writeHead(range?206:200,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':end-start+1,...(range?{'Content-Range':'bytes '+start+'-'+end+'/'+size}:{})});
if(req.method==='HEAD'){res.end();return;}createReadStream(path,{start,end}).pipe(res);
});
server.listen(3188,'127.0.0.1',()=>console.log('http://127.0.0.1:3188'));
