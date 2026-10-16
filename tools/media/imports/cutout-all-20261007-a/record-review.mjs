import {readFileSync,writeFileSync} from 'node:fs';
const [id,rawVariant='',status='hold',notes='']=process.argv.slice(2); const variant=rawVariant==='-'?'':rawVariant;
const base='tools/media/imports/cutout-all-20261007-a';
const verification=JSON.parse(readFileSync(`${base}/local/${id}${variant}/tools/media/motion-guides/verification.json`,'utf8'))[0];
writeFileSync(`${base}/${id}${variant}-review.json`,JSON.stringify({...verification,date:new Date().toISOString(),status,published:false,notes,scope:'Original source and light/dark rendered JPG contact sheets. Not production or physical device.'},null,2));
