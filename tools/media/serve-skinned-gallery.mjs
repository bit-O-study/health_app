import {createServer} from 'node:http';
import {createReadStream,statSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve('public/exercise-guides/skinned-pilot');
createServer((req,res)=>{
 const match=/^\/exercise-guides\/skinned-pilot\/([a-z0-9-]+\.(?:html|mp4))$/.exec(new URL(req.url,'http://localhost').pathname);
 if(!match){res.writeHead(404).end();return;}
 const file=resolve(root,match[1]);let size;
 try{size=statSync(file).size;}catch{res.writeHead(404).end();return;}
 const range=req.headers.range,r=range?.match(/^bytes=(\d+)-(\d*)$/);
 const start=r?Number(r[1]):0,end=r?.[2]?Math.min(Number(r[2]),size-1):size-1;
 if((range&&!r)||start>end){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}
 res.writeHead(r?206:200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'video/mp4','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'no-store',...(r?{'Content-Range':`bytes ${start}-${end}/${size}`}:{})});
 if(req.method==='HEAD'){res.end();return;}
 createReadStream(file,{start,end}).pipe(res);
}).listen(3189,'127.0.0.1',()=>console.log('http://127.0.0.1:3189/exercise-guides/skinned-pilot/batch.html'));
