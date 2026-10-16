const fs=require('fs');const b='tools/media/imports/all-exercises-20261007/skinned-seated-side-20261008';let s=fs.readFileSync(b+'/studio.mjs','utf8');s=s.replace('  pose(frame); const result = {};',`  pose(frame); const result = {};
  result.seatMinGap=Infinity;result.armSeatGap=Infinity;
  for(const [surface,g] of [[mesh,geometry],[shorts,clothGeometry]])for(let i=0;i<g.attributes.position.count;i++){
    const p=new THREE.Vector3().fromBufferAttribute(g.attributes.position,i);surface.applyBoneTransform(i,p);
    if(Math.abs(p.x)<2.4&&p.z> -3.6&&p.z<2.2&&p.y> -5)result.seatMinGap=Math.min(result.seatMinGap,p.y+3.24);
    if(surface===mesh&&model.vertices[i*3]>2.8&&model.vertices[i*3+1]> -1&&p.y> -3.67&&p.y< -3.23&&p.z> -3.61&&p.z<2.21)result.armSeatGap=Math.min(result.armSeatGap,p.x-2.4);
  }
  if(!Number.isFinite(result.armSeatGap))result.armSeatGap=null;`);fs.writeFileSync(b+'/studio.mjs',s);
