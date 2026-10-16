const fs=require('fs'), b='tools/media/imports/all-exercises-20261007/skinned-seated-lateral';
let s=fs.readFileSync(b+'/motion.mjs','utf8');const a=s.indexOf('    let angle='),z=s.indexOf("    aim('upperarm01",a);s=s.slice(0,a)+`    const upperDirection=new THREE.Vector3(sign*.21,-.985,0).normalize().applyAxisAngle(new THREE.Vector3(0,0,1),sign*rad(78*lift));
    const lowerDirection=upperDirection.clone().add(new THREE.Vector3(0,0,.14)).normalize();
    byName['clavicle.'+side].rotation.z=sign*rad(5*lift);
    byName['shoulder01.'+side].rotation.z=sign*rad(14*lift);
`+s.slice(z);s=s.replace(/    \/\/ Curl[^\n]*\n/,'').replace(/const desiredAcross=.*?;/,'const desiredAcross=new THREE.Vector3(0,0,1);');fs.writeFileSync(b+'/motion.mjs',s);
