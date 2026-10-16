const fs=require('fs'),p=__dirname+'/studio.mjs';let s=fs.readFileSync(p,'utf8').replace('camera.position.set(30,4,10)','camera.position.set(30,4,3)');fs.writeFileSync(p,s);
