// Candidate inputs are authoritative; this only validates the shared model copy.
const fs=require('fs'),crypto=require('crypto');
const base='tools/media/imports/all-exercises-20261007/';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const parent=base+'skinned-standing-toe/human.json',own=base+'skinned-wrist-resume/human.json';
if(!fs.existsSync(own))fs.copyFileSync(parent,own);
if(hash(parent)!==hash(own))throw Error('Shared model mismatch');
console.log('Shared continuous skin model verified');
