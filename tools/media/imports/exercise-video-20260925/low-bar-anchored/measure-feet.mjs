import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root=resolve(process.argv[2]??'tools/media/imports/exercise-video-20260925/low-bar-anchored');
const source=join(root,'tools/media/motion-guides/low-bar-squat.jpg');
const sha=createHash('sha256').update(readFileSync(source)).digest('hex').slice(0,12);
const cache=join(root,'tools/media/motion-guides/low-bar-squat/cut',sha);
const rows=[];
for(let n=1;n<=16;n++){
const {data,info}=await sharp(join(cache,n+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const feet=[];
for(const [a,b] of [[.2,.5],[.5,.8]]){
let bottom=-1;
for(let y=Math.floor(info.height*.7);y<info.height;y++){
let count=0;
for(let x=Math.floor(info.width*a);x<Math.floor(info.width*b);x++)if(data[(y*info.width+x)*info.channels+3]>200)count++;
if(count>=5)bottom=y;
}
feet.push(bottom);
}
rows.push({panel:n,leftBottom:feet[0],rightBottom:feet[1],height:info.height});
}
const span=key=>Math.max(...rows.map(x=>x[key]))-Math.min(...rows.map(x=>x[key]));
const result={scope:'Alpha silhouette bottom in lower left/right shoe regions; does not prove anatomical accuracy',rows,leftSpanPx:span('leftBottom'),rightSpanPx:span('rightBottom')};
writeFileSync(join(root,'foot-anchors.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
