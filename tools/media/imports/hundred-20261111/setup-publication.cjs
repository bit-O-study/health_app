const fs=require('fs'),assert=require('node:assert/strict');
const base='tools/media/imports/hundred-20261111',old='tools/media/imports/popular-three-b20-20261110';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
assert.ok(!fs.existsSync(base+'/previous.json'),'Already prepared publication');
const entries=read(base+'/batch.json').entries.filter(e=>e.status==='candidate-reviewed');
assert.equal(entries.length,15);
const ids=entries.map(e=>e.id),source={};
for(const e of entries){
 assert.equal(e.equipment.length,1);
 const original=e.recipe.family==='barbell-squat'?'low-bar-squat':e.id==='double-kettlebell-press'?'kettlebell-press':e.id==='dumbbell-front-squat'?'kettlebell-front-squat':e.recipe.family;
 const parent=read(e.recipe.sourceBatch+'/source.json')[original];assert.ok(parent,e.id);
 source[e.id]={equipment:e.equipment[0],url:parent.url,criteria:e.recipe.criteria,referenceScope:'Related base exercise; variation timing and equipment are described by the local recipe.'};
}
source.limits='Procedural animation and sampled checks, not full mesh collision or biomechanical certification. Local only; production and device pending.';
fs.writeFileSync(base+'/source.json',JSON.stringify(source,null,2));
fs.writeFileSync(base+'/publication-ids.json',JSON.stringify(ids,null,2));
fs.writeFileSync(base+'/visual-review.json',JSON.stringify({...read(base+'/visual-review-squats.json'),...read(base+'/visual-review-rack.json')},null,2));
for(const name of ['prepare.mjs','publish.mjs','check-published.mjs']){
 let text=fs.readFileSync(old+'/'+name,'utf8').replaceAll(old,base).replaceAll('["low-bar-squat","cable-glute-kickback","band-good-morning"]',JSON.stringify(ids));
 if(name==='prepare.mjs')text=text.replace("['verification.json','motion-reviews.json']","['verification.json','reviews.json','motion-reviews.json']");
 if(name==='publish.mjs')text=text.replace("assert.equal(reviewed[id].status,'passed-isolated-candidate');",`assert.equal(reviewed[id].status,'passed-isolated-candidate');
 for(const x of reviewed[id].artifacts)assert.equal(sha(x.file),x.sha256,'Reviewed artifact changed');
 for(const x of reviewed[id].outputs)assert.equal(sha(x.file),x.sha256,'Reviewed video changed');`);
 fs.writeFileSync(base+'/'+name,text);
}
const test=`import {describe,expect,it,vi} from "vitest";
import {readFileSync} from "node:fs";
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:()=>{throw new Error("Expected built-in media");}}));
import {getExerciseMedia} from "@/features/exercises/exercise-media";
const entries=${JSON.stringify(entries.map(e=>({id:e.id,equipment:e.equipment[0]})))};
describe("hundred batch first fifteen reviewed mappings",()=>{
 it.each(entries)("serves the reviewed cycle for $id",async ({id,equipment})=>{
  expect(await getExerciseMedia(id,equipment)).toMatchObject({kind:"video",equipmentIds:[equipment],url:expect.stringContaining(\`/ai-v3/\${id}.mp4\`),darkUrl:expect.stringContaining(\`\${id}-dark.mp4\`)});
  expect(await getExerciseMedia(id,"machine")).toBeNull();
  const provenance=JSON.parse(readFileSync(\`tools/media/motion-guides/\${id}-provenance.json\`,"utf8"));
  expect(provenance.kinematics).toMatchObject({poseSamples:481,loop:0});
  expect(provenance.inputs.some((x:{path:string})=>x.path.includes("hundred-20261111"))).toBe(true);
 });
});`;
fs.writeFileSync('tests/be/logic/hundred-first-fifteen-videos.test.ts',test.replaceAll('\\`','`').replaceAll('\\$','$'));
console.log({prepared:ids.length});
