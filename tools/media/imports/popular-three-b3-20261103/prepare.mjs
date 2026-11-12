import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='tools/media/imports/popular-three-b3-20261103';
assert.ok(!existsSync(base+'/previous.json'),'Already backed up');
const previous={};mkdirSync(base+'/backup',{recursive:true});
for(const id of ["barbell-row","hip-thrust","biceps-curl"]){
 const files=[...['.json','.jpg','-provenance.json'].map(s=>'tools/media/motion-guides/'+id+s),...['.mp4','-dark.mp4','-alpha.webm'].map(s=>'public/exercise-guides/ai-v3/'+id+s)];
 previous[id]=files.map((file,i)=>{if(!existsSync(file))return {file,sha256:null};const backup=base+'/backup/'+id+'-'+i+file.slice(file.lastIndexOf('.'));copyFileSync(file,backup);return {file,backup,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};});
}
for(const name of ['verification.json','motion-reviews.json'])if(existsSync('tools/media/motion-guides/'+name))copyFileSync('tools/media/motion-guides/'+name,base+'/backup/'+name);
writeFileSync(base+'/previous.json',JSON.stringify(previous,null,2)+'\n');

