import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='tools/media/imports/hundred-20261111';
assert.ok(!existsSync(base+'/previous.json'),'Already backed up');
const previous={};mkdirSync(base+'/backup',{recursive:true});
for(const id of ["pause-squat","tempo-squat","pause-front-squat","tempo-front-squat","wide-stance-squat","close-stance-squat","1-5-rep-squat","eccentric-squat","partial-squat","bottom-half-squat","pause-bulgarian-split-squat","tempo-bulgarian-split-squat","pause-goblet-squat","double-kettlebell-press","dumbbell-front-squat"]){
 const files=[...['.json','.jpg','-provenance.json'].map(s=>'tools/media/motion-guides/'+id+s),...['.mp4','-dark.mp4','-alpha.webm'].map(s=>'public/exercise-guides/ai-v3/'+id+s)];
 previous[id]=files.map((file,i)=>{if(!existsSync(file))return {file,sha256:null};const backup=base+'/backup/'+id+'-'+i+file.slice(file.lastIndexOf('.'));copyFileSync(file,backup);return {file,backup,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};});
}
for(const name of ['verification.json','reviews.json','motion-reviews.json'])if(existsSync('tools/media/motion-guides/'+name))copyFileSync('tools/media/motion-guides/'+name,base+'/backup/'+name);
writeFileSync(base+'/previous.json',JSON.stringify(previous,null,2)+'\n');

