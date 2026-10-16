const fs=require('fs'),p=__dirname+'/motion.mjs';let s=fs.readFileSync(p,'utf8').replace("side==='L'?.62:.623","side==='L'?.19:.243");fs.writeFileSync(p,s);
