import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const records=read('tools/media/motion-guides/verification.json');
const reviews=read('tools/media/motion-guides/reviews.json');
const light=read('public/exercise-guides/ai-v3/manifest.json');
const dark=read('public/exercise-guides/ai-v3/manifest-dark.json');
const specs=read('src/features/workout-timer/motion-specs.json');
const ids=process.argv.slice(2);
if(!ids.length)throw Error('Pass exact exercise IDs');
for(const id of ids){
 const recordsForId=records.filter(row=>row.id===id);
 const reviewsForId=reviews.filter(row=>row.id===id);
 if(recordsForId.length!==1||reviewsForId.length!==1||!light.includes(id)||!dark.includes(id)||!specs[id])throw Error('Registration mismatch: '+id);
 const record=recordsForId[0];
 if(sha(`public/exercise-guides/ai-v3/${id}.mp4`)!==record.videoSha256||sha(`public/exercise-guides/ai-v3/${id}-dark.mp4`)!==record.darkVideoSha256)throw Error('SHA mismatch: '+id);
}
console.log(`${ids.length} registrations, specifications and ${ids.length*2} video hashes passed`);
