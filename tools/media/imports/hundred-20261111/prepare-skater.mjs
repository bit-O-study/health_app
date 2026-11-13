import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='tools/media/imports/hundred-20261111';
assert.ok(!existsSync(base+'/previous-skater.json'),'Already backed up');
const previous={};mkdirSync(base+'/backup-skater',{recursive:true});
for(const id of ["skater-jump"]){
 const files=[...['.json','.jpg','-provenance.json'].map(s=>'tools/media/motion-guides/'+id+s),...['.mp4','-dark.mp4','-alpha.webm'].map(s=>'public/exercise-guides/ai-v3/'+id+s)];
 previous[id]=files.map((file,i)=>{if(!existsSync(file))return {file,sha256:null};const backup=base+'/backup-skater/'+id+'-'+i+file.slice(file.lastIndexOf('.'));copyFileSync(file,backup);return {file,backup,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};});
}
for(const name of ['verification.json','reviews.json','motion-reviews.json'])if(existsSync('tools/media/motion-guides/'+name))copyFileSync('tools/media/motion-guides/'+name,base+'/backup-skater/'+name);
writeFileSync(base+'/previous-skater.json',JSON.stringify(previous,null,2)+'\n');

