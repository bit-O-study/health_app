const fs=require('node:fs'),base='tools/media/imports/hundred-20261111';
for(const id of ['single-arm-cable-front-raise','single-arm-cable-lateral-raise']){
 const path=base+'/'+id+'-studio.mjs';let s=fs.readFileSync(path,'utf8');
 s=s.replace('"anchor":[0,-7.7,0]','"anchor":[0,-7.7,3]').replace('"anchor":[-5,-7.7,0]','"anchor":[-5,-7.7,3]');
 s=s.replace("if(config.family==='lateral')anchors[0].x=-5;","if(config.family==='lateral')anchors[0].x=-5;if(config.family==='front')anchors[0].x=4;");fs.writeFileSync(path,s);
}
