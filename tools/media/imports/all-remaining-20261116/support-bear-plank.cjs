const fs=require('node:fs'),assert=require('node:assert/strict');
const p='tools/media/imports/all-remaining-20261116/bear-plank/bear-plank-motion.mjs';let s=fs.readFileSync(p,'utf8');assert.ok(s.includes('-7.411375'));s=s.replaceAll('-7.411375','-7.556375');fs.writeFileSync(p,s);
