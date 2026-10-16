import {readFileSync,writeFileSync} from 'node:fs';const d='tools/media/imports/all-exercises-20261007/band-external-rotation/rig/';writeFileSync(d+'exercise-motion-v2.mjs',readFileSync(d+'exercise-motion.mjs'));let s=readFileSync(d+'studio-v1.mjs','utf8');const block=`
skin.onBeforeCompile=shader=>{
 const common=\`
 vec4 rigMul(vec4 a,vec4 b){return vec4(a.w*b.xyz+b.w*a.xyz+cross(a.xyz,b.xyz),a.w*b.w-dot(a.xyz,b.xyz));}
 vec4 rigQ(mat4 m){mat3 r=mat3(m);float t=r[0][0]+r[1][1]+r[2][2];vec4 q;if(t>0.){float s=sqrt(t+1.)*2.;q=vec4((r[1][2]-r[2][1])/s,(r[2][0]-r[0][2])/s,(r[0][1]-r[1][0])/s,.25*s);}else if(r[0][0]>r[1][1]&&r[0][0]>r[2][2]){float s=sqrt(1.+r[0][0]-r[1][1]-r[2][2])*2.;q=vec4(.25*s,(r[1][0]+r[0][1])/s,(r[2][0]+r[0][2])/s,(r[1][2]-r[2][1])/s);}else if(r[1][1]>r[2][2]){float s=sqrt(1.+r[1][1]-r[0][0]-r[2][2])*2.;q=vec4((r[1][0]+r[0][1])/s,.25*s,(r[2][1]+r[1][2])/s,(r[2][0]-r[0][2])/s);}else{float s=sqrt(1.+r[2][2]-r[0][0]-r[1][1])*2.;q=vec4((r[2][0]+r[0][2])/s,(r[2][1]+r[1][2])/s,.25*s,(r[0][1]-r[1][0])/s);}return normalize(q);}
 vec3 rigRotate(vec4 q,vec3 v){return v+2.*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
 void rigBlend(mat4 a,mat4 b,mat4 c,mat4 d,vec4 w,out vec4 q,out vec4 dual){vec4 qa=rigQ(a),qb=rigQ(b),qc=rigQ(c),qd=rigQ(d);qb*=dot(qa,qb)<0.?-1.:1.;qc*=dot(qa,qc)<0.?-1.:1.;qd*=dot(qa,qd)<0.?-1.:1.;q=qa*w.x+qb*w.y+qc*w.z+qd*w.w;dual=.5*(rigMul(vec4(a[3].xyz,0.),qa)*w.x+rigMul(vec4(b[3].xyz,0.),qb)*w.y+rigMul(vec4(c[3].xyz,0.),qc)*w.z+rigMul(vec4(d[3].xyz,0.),qd)*w.w);float n=length(q);q/=n;dual/=n;dual-=q*dot(q,dual);}
 \`;
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>'+common).replace('#include <skinnormal_vertex>',\`vec4 rigReal,rigDual;rigBlend(boneMatX,boneMatY,boneMatZ,boneMatW,skinWeight,rigReal,rigDual);objectNormal=rigRotate(rigReal,objectNormal);\`).replace('#include <skinning_vertex>',\`vec3 rigPos=(bindMatrix*vec4(transformed,1.)).xyz;vec3 rigTranslate=2.*rigMul(rigDual,vec4(-rigReal.xyz,rigReal.w)).xyz;transformed=(bindMatrixInverse*vec4(rigRotate(rigReal,rigPos)+rigTranslate,1.)).xyz;\`);
};
`;
s=s.replace('const mesh = new THREE.SkinnedMesh(geometry, skin);',block+'const mesh = new THREE.SkinnedMesh(geometry, skin);');writeFileSync(d+'studio.mjs',s);
