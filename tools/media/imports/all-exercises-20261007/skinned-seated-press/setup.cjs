const fs=require('fs'),b='tools/media/imports/all-exercises-20261007/skinned-seated-press';let s=fs.readFileSync(b+'/motion.mjs','utf8');let a=s.indexOf('    const upperDirection='),z=s.indexOf("    aim('upperarm01",a);s=s.slice(0,a)+`    const upperDirection=new THREE.Vector3(sign*.94,-.34,.08).lerp(new THREE.Vector3(sign*.17,.982,.08),lift).normalize();
    const lowerDirection=new THREE.Vector3(-sign*.08,.995,.03).lerp(new THREE.Vector3(-sign*.13,.991,.03),lift).normalize();
    byName['clavicle.'+side].rotation.z=sign*rad(6*lift);
    byName['shoulder01.'+side].rotation.z=sign*rad(20*lift);
`+s.slice(z);s=s.replace('const desiredAcross=new THREE.Vector3(0,0,1);','const desiredAcross=new THREE.Vector3(-sign,0,0);');fs.writeFileSync(b+'/motion.mjs',s);
