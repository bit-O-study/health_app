import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const get=p=>JSON.parse(execFileSync('git',['show',':'+p],{encoding:'utf8'}));
const base='public/exercise-guides/ai-v3/';
const light=get(base+'manifest.json'), dark=get(base+'manifest-dark.json'), reviews=get('tools/media/motion-guides/reviews.json');
const paths=[...new Set([...light.map(id=>'tools/media/motion-guides/'+id+'.jpg'),...light.map(id=>base+id+'.mp4'),...dark.map(id=>base+id+'-dark.mp4')])];
const blobs=execFileSync('git',['cat-file','--batch'],{input:paths.map(p=>':'+p+'\n').join(''),maxBuffer:128*1024*1024});
let offset=0; const hashes=new Map();
for(const path of paths){const end=blobs.indexOf(10,offset);const header=blobs.subarray(offset,end).toString();if(!/ blob \d+$/.test(header))throw Error(path+': '+header);const size=Number(header.split(' ').at(-1));offset=end+1;hashes.set(path,createHash('sha256').update(blobs.subarray(offset,offset+size)).digest('hex'));offset+=size+1;}
for(const id of light){const r=reviews.find(r=>r.id===id&&r.status==='passed');if(!r||r.sourceSha256!==hashes.get('tools/media/motion-guides/'+id+'.jpg')||r.videoSha256!==hashes.get(base+id+'.mp4'))throw Error('Light review mismatch: '+id);}
for(const id of dark){const r=reviews.find(r=>r.id===id&&r.status==='passed');if(!light.includes(id)||r?.darkVideoSha256!==hashes.get(base+id+'-dark.mp4'))throw Error('Dark review mismatch: '+id);}
console.log(JSON.stringify({stagedLight:light.length,stagedDark:dark.length,hashes:'all matched'}));