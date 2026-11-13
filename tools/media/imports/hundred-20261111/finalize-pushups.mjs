import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='tools/media/imports/hundred-20261111',read=p=>JSON.parse(readFileSync(p,'utf8'));
const batch=read(base+'/batch.json'),review=read(base+'/pushups-preview-review.json');
for(const [id,r] of Object.entries(review)){
 const e=batch.entries.find(e=>e.id===id);assert.equal(e.status,'preview-approved');
 for(const a of r.artifacts)assert.equal(createHash('sha256').update(readFileSync(a.file)).digest('hex'),a.sha256,'Preview evidence changed');
 const v=read(base+'/native/'+id+'/verification.json');assert.ok(v.playback.every(p=>p.playing&&p.seeking&&p.loop));
 e.status='awaiting-final-review';
}
writeFileSync(base+'/batch.json',JSON.stringify(batch,null,2)+'\n');
await import('./finalize.mjs');
