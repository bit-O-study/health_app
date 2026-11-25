const fs=require('node:fs'),assert=require('node:assert/strict');
const root='tools/media/imports/all-remaining-20261116',base=root+'/plank-leg-lift',old=root+'/rkc-plank',id='plank-with-leg-lift',read=p=>fs.readFileSync(p,'utf8'),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
assert.ok(!fs.existsSync(base+'/batch.json'));fs.mkdirSync(base,{recursive:true});const master=JSON.parse(read(root+'/batch.json')),entry=master.entries.find(e=>e.id===id);assert.equal(entry.status,'awaiting-motion-implementation');entry.status='motion-preview';entry.group='plank-leg-lift';
let motion=read('tools/media/imports/popular-three-20261103/plank-motion.mjs').replaceAll("'plank'",JSON.stringify(id)).replace('mesh})','mesh},frame)');
const anchor='setPose(calibratedAngle);byName.root.position.y+=-7.751375+.02-minimum(forearmIndices);mesh.updateMatrixWorld(true);';assert.ok(motion.includes(anchor));
motion=motion.replace(anchor,anchor+`
 const phase=((frame%480)+480)%480,t=(phase%240)/240,smooth=x=>x*x*x*(x*(x*6-15)+10),amount=t<.375?smooth(t/.375):t<.625?1:1-smooth((t-.625)/.375),side=phase<240?'R':'L';
 const direction=new THREE.Vector3(0,-Math.cos(rad(calibratedAngle+12*amount)),-Math.sin(rad(calibratedAngle+12*amount)));
 aim('upperleg01.'+side,rest('upperleg01','lowerleg01',side),direction);aim('lowerleg01.'+side,rest('lowerleg01','foot',side),direction);
 mesh.updateMatrixWorld(true);byName['foot.'+side].quaternion.copy(byName['foot.'+side].parent.getWorldQuaternion(q()).invert().multiply(q().setFromAxisAngle(new THREE.Vector3(1,0,0),rad(60))));
`);
let studio=read('tools/media/imports/popular-three-20261103/plank-studio.mjs').replaceAll("'plank'",JSON.stringify(id)).replace('preserveDrawingBuffer: true','preserveDrawingBuffer: true, alpha: true');
studio+='\nwindow.inspectGeometry=frame=>{const j=window.inspectRunning(frame);return {support:j.support};};\n';
fs.writeFileSync(base+'/'+id+'-motion.mjs',motion);fs.writeFileSync(base+'/'+id+'-studio.mjs',studio);
for(const name of ['render','verify','finalize','prepare','publish','check-published'])fs.writeFileSync(base+'/'+name+'.mjs',read(old+'/'+name+'.mjs').replaceAll(old,base).replaceAll('rkc-plank',id));
fs.writeFileSync(root+'/review-plank-leg-lift.cjs',read(root+'/review-rkc-plank.cjs').replaceAll(old,base).replace('Both hands clenched in fists; forearms supported on virtual floor.','Both forearms remain on virtual floor; hands open.').replace('Toes retain floor contact with feet close together.','Supporting toes retain floor contact while the opposite straight leg lifts; sides alternate.'));
write(base+'/batch.json',{entries:[{id,original:id,equipment:'bodyweight',hold:false,status:'awaiting-preview-review',recipe:{family:id,sourceUrls:['https://ca.physitrack.com/home-exercise-video/forearm-plank-with-straight-leg-lift'],sourcesCheckedAt:'2026-11-16',criteria:'Forearm plank with alternating straight-leg lifts: each side 1.5 seconds up, 1 second hold, 1.5 seconds down; limited 12-degree hip lift toward trunk level without pelvis or torso motion.'}}]});write(root+'/batch.json',master);
