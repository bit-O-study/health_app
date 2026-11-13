import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='tools/media/imports/hundred-20261111';
assert.ok(!existsSync(base+'/previous-scapular-pull.json'),'Already backed up');
const previous={};mkdirSync(base+'/backup-scapular-pull',{recursive:true});
for(const id of ["scapular-pull-up"]){
 const files=[...['.json','.jpg','-provenance.json'].map(s=>'tools/media/motion-guides/'+id+s),...['.mp4','-dark.mp4','-alpha.webm'].map(s=>'public/exercise-guides/ai-v3/'+id+s)];
 previous[id]=files.map((file,i)=>{if(!existsSync(file))return {file,sha256:null};const backup=base+'/backup-scapular-pull/'+id+'-'+i+file.slice(file.lastIndexOf('.'));copyFileSync(file,backup);return {file,backup,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};});
}
for(const name of ['verification.json','reviews.json','motion-reviews.json'])if(existsSync('tools/media/motion-guides/'+name))copyFileSync('tools/media/motion-guides/'+name,base+'/backup-scapular-pull/'+name);
writeFileSync(base+'/previous-scapular-pull.json',JSON.stringify(previous,null,2)+'\n');

