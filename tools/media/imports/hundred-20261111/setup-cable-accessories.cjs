const fs=require('node:fs'),assert=require('node:assert/strict'),base='tools/media/imports/hundred-20261111',batch=JSON.parse(fs.readFileSync(base+'/batch.json'));
const configs={
 'cable-external-rotation':{family:'external',anchor:[-7,3.5,3],equipment:'cable',single:true},
 'band-external-rotation':{family:'external',anchor:[-7,3.5,3],equipment:'band',single:true},
 'high-cable-fly':{family:'highfly',anchor:[0,10,-3],equipment:'cable'},
 'standing-cable-reverse-fly':{family:'reversefly',anchor:[0,6,10],equipment:'cable'},
 'cable-y-raise':{family:'yraise',anchor:[0,-7.7,3],equipment:'cable'},
 'cable-shrug':{family:'shrug',anchor:[0,-7.7,3],equipment:'cable'}
};
for(const [id,c]of Object.entries(configs)){
 const e=batch.entries.find(x=>x.id===id);assert.equal(e.status,'awaiting-motion-implementation');let m=fs.readFileSync(base+'/standing-band-row-motion.mjs','utf8'),s=fs.readFileSync(base+'/standing-cable-chest-press-studio.mjs','utf8');
 m=m.replace(/export const exercises=.*?;/,'export const exercises='+JSON.stringify([id])+';').replace(/const config=\{.*?\},v=/,'const config='+JSON.stringify(c)+',v=');
 m=m.replace("else if(config.family==='row'",`else if(config.family==='external'){a=v([sign*.08,-1,0]);b=v([sign*Math.sin(rad(65*l)),0,Math.cos(rad(65*l))]);}
 else if(config.family==='highfly'){a=v([sign*(1-1.32*l),-.3-.1*l,.15+.85*l]);b=a.clone().applyAxisAngle(v([0,1,0]),rad(sign*10));}
 else if(config.family==='reversefly'){a=v([sign*(.05+.95*l),-.1,1-.9*l]);b=a.clone().applyAxisAngle(v([0,1,0]),rad(-sign*10));}
 else if(config.family==='yraise'){const angle=rad(25+115*l);a=v([sign*Math.sin(angle)*.707,-Math.cos(angle),Math.sin(angle)*.707]);b=a.clone().applyAxisAngle(v([1,0,0]),rad(-8));}
 else if(config.family==='shrug'){byName['clavicle.'+side].position.y+=.65*l;a=v([sign*.1,-1,.1]);b=v([sign*.1,-1,.15]);}
 else if(config.family==='row'`);
 m=m.replace("config.family==='row'||config.family==='face'?", "['row','face','external','highfly','reversefly'].includes(config.family)?");
 s=s.replace(/const config=\{.*?\},anchor=/,'const config='+JSON.stringify(c)+',anchor=');
 s=s.replace("if(config.family==='lateral')anchors[0].x=-5;", "if(config.family==='external')anchors[0].x=-7;if(config.family==='highfly')anchors.forEach((a,i)=>a.x=i===0?8:-8);if(config.family==='reversefly')anchors.reverse();if(config.family==='yraise'||config.family==='shrug')anchors.forEach(a=>a.x*=1.8);");
 s=s.replace("camera.zoom=config.equipment==='cable'?.65:config.anchor[1]>10?.7:.8", "camera.zoom=config.family==='highfly'?.58:config.equipment==='cable'?.65:.75");
 fs.writeFileSync(base+'/'+id+'-motion.mjs',m);fs.writeFileSync(base+'/'+id+'-studio.mjs',s);e.status='motion-preview';e.recipe={family:c.family,sourceUrls:[c.family==='external'?'https://www.merckmanuals.com/professional/multimedia/video/standing-resisted-shoulder-external-rotation':'https://www.puregym.com/blog/a-beginner-s-guide-to-cable-machines/?pp=1'],criteria:'Standing '+c.family+' with '+c.equipment+'; fixed feet, controlled movement and aligned handles.',sourcesCheckedAt:'2026-11-12'};
}
fs.writeFileSync(base+'/batch.json',JSON.stringify(batch,null,2)+'\n');fs.writeFileSync(base+'/cable-accessories-ids.json',JSON.stringify(Object.keys(configs),null,2)+'\n');
