const fs=require('node:fs'),p='tools/media/imports/hundred-20261111/cat-cow-motion.mjs';
let s=fs.readFileSync(p,'utf8');
s=s.replace('rad(78.9+7.2*(2*a-1))','rad(78.9-12.5*(2*a-1))').replace("[['spine05',-1],['spine04',-1],['spine03',0],['spine02',1],['spine01',1]]","[['spine05',1],['spine04',1],['spine03',1],['spine02',1],['spine01',1]]").replace('rad(6*share*(2*a-1))','rad(5*share*(2*a-1))');
fs.writeFileSync(p,s);
