const fs=require('node:fs'),assert=require('node:assert/strict');
const root='tools/media/imports/all-remaining-20261116',base=root+'/neutral-pulldowns',old=root+'/assisted-pulls',source='tools/media/imports/popular-three-b18-20261110',read=p=>fs.readFileSync(p,'utf8'),write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n');
assert.ok(!fs.existsSync(base+'/batch.json'));fs.mkdirSync(base,{recursive:true});const master=JSON.parse(read(root+'/batch.json')),ids=['neutral-grip-lat-pulldown','close-neutral-grip-lat-pulldown'],entries=[];
for(const id of ids){const e=master.entries.find(e=>e.id===id);assert.equal(e.status,'awaiting-motion-implementation');assert.deepEqual(e.equipment,['cable']);e.status='motion-preview';e.group='neutral-pulldowns';const narrow=id.startsWith('close'),half=narrow?.85:2.4;entries.push({id,original:'close-grip-lat-pulldown',equipment:'cable',hold:false,halfWidth:half,status:'awaiting-preview-review',recipe:{family:id,sourceUrls:['https://www.strengthlog.com/close-grip-lat-pulldown/'],criteria:(narrow?'Narrow parallel grip':'Shoulder-width parallel grip')+'; seated cable pulldown with thigh restraint and fixed feet; 3.5 seconds pull, 1 second pause, 3.5 seconds controlled return.',sourcesCheckedAt:'2026-11-16'}});
 let motion=read(source+'/close-grip-lat-pulldown-motion.mjs').replaceAll('close-grip-lat-pulldown',id).replace('sign*.85,7.3','sign*'+half+',7.3');
 let studio=read(source+'/close-grip-lat-pulldown-studio.mjs').replaceAll('close-grip-lat-pulldown',id).replaceAll('-4.7','-4');
 studio=studio.replace('if(thigh)thigh.position.y=s.thighY+.42;','if(thigh){thigh.position.y=s.thighY+.42;for(const x of [-2.6,2.6])rod([x,-2,2],[x,thigh.position.y,2],.16);}');
 studio=studio.replace('window.renderSkinned(0);window.ready=true;',`window.renderSkinned(0);
let clothSeat=Infinity;for(let i=0;i<clothGeometry.attributes.position.count;i++){const p=shorts.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i));if(Math.abs(p.x)<1.8&&p.z>-.9&&p.z<2.6)clothSeat=Math.min(clothSeat,p.y);}
seat.position.y=Math.min(support().seatY,clothSeat)-.275;
rod([0,-7.875,0],[0,seat.position.y-.275,0],.3);
const footSupport=box([6,.15,4],[0,support().sole-.075,5],rubber);
for(const x of [-2,2])rod([x,-7.875,5],[x,footSupport.position.y-.075,5],.12);
const inspectBase=window.inspectRunning;window.inspectRunning=frame=>{const j=inspectBase(frame);j.handAxes=['L','R'].map(s=>vec(dataByName['finger2-1.'+s].head).sub(vec(dataByName['finger5-1.'+s].head)).normalize().applyQuaternion(byName['wrist.'+s].getWorldQuaternion(new THREE.Quaternion())).toArray());return j;};
const inspectSupports=window.inspectGeometry;window.inspectGeometry=frame=>{const g=inspectSupports(frame),s=support();return {...g,seatContactGap:Math.min(s.seatY,clothSeat)-seat.position.y-.275,footGap:s.sole-footSupport.position.y-.075,thighGap:thigh.position.y-.4-s.thighY};};
window.renderSkinned(0);window.ready=true;`);
 fs.writeFileSync(base+'/'+id+'-motion.mjs',motion);fs.writeFileSync(base+'/'+id+'-studio.mjs',studio);
}
for(const name of ['render','verify','finalize','prepare','publish','check-published'])fs.writeFileSync(base+'/'+name+'.mjs',read(old+'/'+name+'.mjs').replaceAll(old,base).replaceAll(JSON.stringify(['assisted-pull-up','assisted-pull-up-2']),JSON.stringify(ids)));
write(base+'/batch.json',{entries});write(root+'/batch.json',master);
fs.writeFileSync(root+'/review-neutral-pulldowns.cjs',read(root+'/review-assisted-pulls.cjs').replaceAll(old,base).replace('Generic assisted pull-up apparatus with simplified cable transmission. Entry and exit are omitted; not a specific manufacturer model.','Generic cable pulldown with simplified pulley transmission, not a specific manufacturer model.').replace('Both knees remain on the moving pad; feet stay clear of the rear apparatus.','Both feet remain on the platform and thighs under the fixed restraint.').replace('Both hands retain apparatus grip.','Palms face each other around the parallel handles.'));
