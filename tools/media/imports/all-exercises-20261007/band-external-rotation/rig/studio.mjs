import * as THREE from './three.module.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { applyMotion, exercises } from './exercise-motion.mjs';
const exercise = new URLSearchParams(location.search).get('exercise');
if(!exercises.includes(exercise))throw new Error('Select a supported exercise');

const model = await (await fetch('./human.json')).json();
const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(480, 480); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
const scene = new THREE.Scene();
const environment = new THREE.PMREMGenerator(renderer);
scene.environment = environment.fromScene(new RoomEnvironment(), .06).texture;
scene.environmentIntensity = .22;
const camera = new THREE.OrthographicCamera(-10.9, 10.9, 10.9, -10.9, .1, 100);
const groundMaterial = new THREE.ShadowMaterial({ color: '#263b40', opacity: .16 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), groundMaterial);
floor.rotation.x = -Math.PI / 2; floor.position.y = -8.46; floor.receiveShadow = true; scene.add(floor);floor.visible=false;
scene.add(new THREE.HemisphereLight('#ffffff', '#788b91', .85));
const key = new THREE.DirectionalLight('#fff6ea', 2.6); key.position.set(-8, 18, 12);
key.castShadow = false; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 4; key.shadow.blurSamples = 12;
Object.assign(key.shadow.camera, { left: -13, right: 13, top: 14, bottom: -12, near: 1, far: 60 });
key.shadow.bias = -.00015; key.shadow.normalBias = .02; scene.add(key);
const fill = new THREE.DirectionalLight('#d4eaff', .55); fill.position.set(10, 8, 16); scene.add(fill);
const rim = new THREE.DirectionalLight('#d4fff5', 1.4); rim.position.set(-4, 10, -12); scene.add(rim);
const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 256;
const shadowContext = shadowCanvas.getContext('2d');
const gradient = shadowContext.createRadialGradient(128,128,12,128,128,128); gradient.addColorStop(0,'rgba(27,47,53,0.23)'); gradient.addColorStop(1,'rgba(27,47,53,0)'); shadowContext.fillStyle=gradient; shadowContext.fillRect(0,0,256,256);
const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(7.5,4.8), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false})); contactShadow.rotation.x=-Math.PI/2; contactShadow.position.set(0,-8.44,.65); scene.add(contactShadow);contactShadow.visible=false;
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(model.vertices, 3));
geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(model.skinIndices, 4));
geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(model.skinWeights, 4));
geometry.setIndex(model.indices); geometry.computeVertexNormals();
const skin = new THREE.MeshStandardMaterial({ color: '#939fa3', roughness: .49, metalness: .05 });

skin.onBeforeCompile=shader=>{
 const common=`
 vec4 rigMul(vec4 a,vec4 b){return vec4(a.w*b.xyz+b.w*a.xyz+cross(a.xyz,b.xyz),a.w*b.w-dot(a.xyz,b.xyz));}
 vec4 rigQ(mat4 m){mat3 r=mat3(m);float t=r[0][0]+r[1][1]+r[2][2];vec4 q;if(t>0.){float s=sqrt(t+1.)*2.;q=vec4((r[1][2]-r[2][1])/s,(r[2][0]-r[0][2])/s,(r[0][1]-r[1][0])/s,.25*s);}else if(r[0][0]>r[1][1]&&r[0][0]>r[2][2]){float s=sqrt(1.+r[0][0]-r[1][1]-r[2][2])*2.;q=vec4(.25*s,(r[1][0]+r[0][1])/s,(r[2][0]+r[0][2])/s,(r[1][2]-r[2][1])/s);}else if(r[1][1]>r[2][2]){float s=sqrt(1.+r[1][1]-r[0][0]-r[2][2])*2.;q=vec4((r[1][0]+r[0][1])/s,.25*s,(r[2][1]+r[1][2])/s,(r[2][0]-r[0][2])/s);}else{float s=sqrt(1.+r[2][2]-r[0][0]-r[1][1])*2.;q=vec4((r[2][0]+r[0][2])/s,(r[2][1]+r[1][2])/s,.25*s,(r[0][1]-r[1][0])/s);}return normalize(q);}
 vec3 rigRotate(vec4 q,vec3 v){return v+2.*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
 void rigBlend(mat4 a,mat4 b,mat4 c,mat4 d,vec4 w,out vec4 q,out vec4 dual){vec4 qa=rigQ(a),qb=rigQ(b),qc=rigQ(c),qd=rigQ(d);qb*=dot(qa,qb)<0.?-1.:1.;qc*=dot(qa,qc)<0.?-1.:1.;qd*=dot(qa,qd)<0.?-1.:1.;q=qa*w.x+qb*w.y+qc*w.z+qd*w.w;dual=.5*(rigMul(vec4(a[3].xyz,0.),qa)*w.x+rigMul(vec4(b[3].xyz,0.),qb)*w.y+rigMul(vec4(c[3].xyz,0.),qc)*w.z+rigMul(vec4(d[3].xyz,0.),qd)*w.w);float n=length(q);q/=n;dual/=n;dual-=q*dot(q,dual);}
 `;
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>'+common).replace('#include <skinnormal_vertex>',`vec4 rigReal,rigDual;rigBlend(boneMatX,boneMatY,boneMatZ,boneMatW,skinWeight,rigReal,rigDual);objectNormal=rigRotate(rigReal,objectNormal);`).replace('#include <skinning_vertex>',`vec3 rigPos=(bindMatrix*vec4(transformed,1.)).xyz;vec3 rigTranslate=2.*rigMul(rigDual,vec4(-rigReal.xyz,rigReal.w)).xyz;transformed=(bindMatrixInverse*vec4(rigRotate(rigReal,rigPos)+rigTranslate,1.)).xyz;`);
};
const mesh = new THREE.SkinnedMesh(geometry, skin); mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
const dataByName = Object.fromEntries(model.bones.map(b => [b.name, b]));
const bones = model.bones.map(data => { const b = new THREE.Bone(); b.name = data.name; return b; });
const byName = Object.fromEntries(bones.map(b => [b.name, b]));
const vec = a => new THREE.Vector3().fromArray(a);
const radians = THREE.MathUtils.degToRad;
for (let i = 0; i < bones.length; i++) {
  const data = model.bones[i], parent = data.parent ? byName[data.parent] : mesh;
  const parentHead = data.parent ? dataByName[data.parent].head : [0, 0, 0];
  bones[i].position.fromArray(data.head.map((x, k) => x - parentHead[k])); parent.add(bones[i]);
}
mesh.updateMatrixWorld(true); const skeleton = new THREE.Skeleton(bones); mesh.bind(skeleton); mesh.normalizeSkinWeights();

// A separate offset, clipped garment surface replaces the body-painted shorts.
// Clipping interpolates position, normal and bone weights at the exact hem.
const sourceNormal = geometry.attributes.normal;
function vertex(i) {
  const p = vec(model.vertices.slice(i * 3, i * 3 + 3));
  const n = new THREE.Vector3().fromBufferAttribute(sourceNormal, i);
  const looseness = .10 + .12 * THREE.MathUtils.smoothstep(-p.y, .4, 2.7);
  p.addScaledVector(n, looseness);
  const w = {};
  for (let j = 0; j < 4; j++) w[model.skinIndices[i * 4 + j]] = (w[model.skinIndices[i * 4 + j]] || 0) + model.skinWeights[i * 4 + j];
  return { p, n, w };
}
function interpolate(a, b, t) {
  const w = {};
  for (const [k, v] of Object.entries(a.w)) w[k] = v * (1 - t);
  for (const [k, v] of Object.entries(b.w)) w[k] = (w[k] || 0) + v * t;
  return { p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t).normalize(), w };
}
function clip(poly, y, below) {
  const result = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const insideA = below ? a.p.y <= y : a.p.y >= y, insideB = below ? b.p.y <= y : b.p.y >= y;
    if (insideA) result.push(a);
    if (insideA !== insideB) result.push(interpolate(a, b, (y - a.p.y) / (b.p.y - a.p.y)));
  }
  return result;
}
const clothPositions = [], clothNormals = [], clothIndices = [], clothWeights = [];
for (let i = 0; i < model.indices.length; i += 3) {
  const ids = model.indices.slice(i, i + 3);
  if (ids.every(v => model.vertices[v * 3 + 1] > 1.2) || ids.every(v => model.vertices[v * 3 + 1] < -2.9)) continue;
  const poly = clip(clip(ids.map(vertex), 1.14, true), -2.65, false);
  for (let j = 1; j + 1 < poly.length; j++) for (const v of [poly[0], poly[j], poly[j + 1]]) {
    clothPositions.push(...v.p); clothNormals.push(...v.n);
    const top = Object.entries(v.w).sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((s, w) => s + w[1], 0);
    while (top.length < 4) top.push([0, 0]);
    clothIndices.push(...top.map(w => Number(w[0]))); clothWeights.push(...top.map(w => w[1] / sum));
  }
}
const clothGeometry = new THREE.BufferGeometry();
clothGeometry.setAttribute('position', new THREE.Float32BufferAttribute(clothPositions, 3));
clothGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(clothNormals, 3));
clothGeometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(clothIndices, 4));
clothGeometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(clothWeights, 4));
const clothMaterial = new THREE.MeshStandardMaterial({ color: '#087e87', roughness: .95, side: THREE.DoubleSide });
clothMaterial.onBeforeCompile = shader => {
  shader.vertexShader = 'varying vec3 garmentPosition;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ngarmentPosition=position;');
  shader.fragmentShader = 'varying vec3 garmentPosition;\n' + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat band=step(0.88,garmentPosition.y); float hem=1.0-smoothstep(-2.60,-2.50,garmentPosition.y); diffuseColor.rgb*=1.0-0.35*max(band,hem);');
};
const shorts = new THREE.SkinnedMesh(clothGeometry, clothMaterial); shorts.bind(skeleton, mesh.bindMatrix); shorts.frustumCulled = false; shorts.castShadow = true; shorts.receiveShadow = true; scene.add(shorts);

const restRotations = {}, lowerBase = {}, dumbbells = [];
const rubber = new THREE.MeshStandardMaterial({ color: '#202b34', roughness: .65 });
const metal = new THREE.MeshStandardMaterial({ color: '#aab9c3', roughness: .28, metalness: .8 });
const inset = new THREE.MeshStandardMaterial({ color: '#3a505a', roughness: .55, metalness: .2 });
for (const side of ['L', 'R']) {
  const mirror = side === 'L' ? 1 : -1;
  const elbow = dataByName['lowerarm01.' + side], upper = dataByName['upperarm01.' + side], wrist = dataByName['wrist.' + side];
  const upperDirection = vec(elbow.head).sub(vec(upper.head)).normalize();
  const forearmDirection = vec(wrist.head).sub(vec(elbow.head)).normalize();
  // Keep a small, fixed elbow bend instead of a locked straight arm.
  const bentDirection = upperDirection.clone(); bentDirection.z += .25; bentDirection.normalize();
  lowerBase[side] = new THREE.Quaternion().setFromUnitVectors(forearmDirection, bentDirection);
  const index = vec(dataByName['finger2-1.' + side].head), little = vec(dataByName['finger5-1.' + side].head);
  const across = index.clone().sub(little).normalize();
  const forward = vec(dataByName['finger3-1.' + side].tail).sub(vec(dataByName['finger3-1.' + side].head)).normalize();
  const inward = new THREE.Vector3().crossVectors(across, forward).normalize().multiplyScalar(-mirror);
  const palm = index.clone().add(little).multiplyScalar(.5);
  restRotations['wrist.' + side] = new THREE.Quaternion().setFromUnitVectors(palm.clone().sub(vec(wrist.head)).normalize(), forearmDirection);
  for (let finger = 2; finger <= 5; finger++) for (let joint = 1; joint <= 3; joint++) restRotations[`finger${finger}-${joint}.${side}`] = new THREE.Quaternion().setFromAxisAngle(across, radians(-mirror * [0, 65, 80, 50][joint]));
  const thumb = dataByName['finger1-1.' + side];
  restRotations['finger1-1.' + side] = new THREE.Quaternion().setFromUnitVectors(vec(thumb.tail).sub(vec(thumb.head)).normalize(), index.clone().addScaledVector(inward, .24).sub(vec(thumb.head)).normalize());
  const dumbbell = new THREE.Group();
  dumbbell.position.copy(palm.addScaledVector(forward, .13).addScaledVector(inward, .18).sub(vec(wrist.head)));
  dumbbell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), across); byName['wrist.' + side].add(dumbbell); dumbbells.push(dumbbell);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 1.28, 32), metal); dumbbell.add(handle);
  for (const end of [-1, 1]) {
    const shape = new THREE.Shape();
    for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI * 2; if (k === 0) shape.moveTo(.56 * Math.cos(a), .56 * Math.sin(a)); else shape.lineTo(.56 * Math.cos(a), .56 * Math.sin(a)); }
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .45, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .045, bevelThickness: .045 }), rubber);
    plate.rotation.x = Math.PI / 2; plate.position.y = end * .90 + .225; plate.castShadow = true; dumbbell.add(plate);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .012, 32), inset); cap.position.y = end * 1.19; dumbbell.add(cap);
  }
}

// Isolated band equipment, no dumbbells.
for(const g of dumbbells){g.clear();g.visible=false;}
const grip=dumbbells[0];grip.visible=true;
const handle=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.8,16),rubber);grip.add(handle);
const anchor=new THREE.Vector3(-5.3,3.27,2.1);
const post=new THREE.Mesh(new THREE.BoxGeometry(.3,11.74,.3),rubber);post.position.set(anchor.x,-2.59,anchor.z);scene.add(post);
const postFoot=new THREE.Mesh(new THREE.BoxGeometry(1,.18,1),rubber);postFoot.position.set(anchor.x,-8.37,anchor.z);scene.add(postFoot);
const band=new THREE.Mesh(new THREE.CylinderGeometry(.052,.052,1,12),new THREE.MeshStandardMaterial({color:'#b62632',roughness:.7}));scene.add(band);
const anchorRing=new THREE.Mesh(new THREE.TorusGeometry(.17,.04,8,24),metal);anchorRing.position.copy(anchor);anchorRing.rotation.y=Math.PI/2;scene.add(anchorRing);
const gripPoint=new THREE.Object3D();grip.add(gripPoint);
function updateBand(){const hand=gripPoint.getWorldPosition(new THREE.Vector3()),delta=hand.clone().sub(anchor);band.position.copy(anchor).add(hand).multiplyScalar(.5);band.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());band.scale.set(1,delta.length(),1);}
// Closed eyes are replaced by inset neutral eyeballs rather than dark holes.
for (const side of ['L', 'R']) {
  const eyeball = new THREE.Mesh(new THREE.SphereGeometry(.155, 32, 24), new THREE.MeshStandardMaterial({ color: '#a5b1b3', roughness: .6 }));
  eyeball.position.set(0, -.005, -.025); byName['eye.' + side].add(eyeball);
  const iris = new THREE.Mesh(new THREE.SphereGeometry(.049,24,16), new THREE.MeshStandardMaterial({color:'#4c6066',roughness:.6})); iris.scale.z=.18; iris.position.set(0,-.005,.128); byName['eye.'+side].add(iris);
}
const breathPosition = new Float32Array(model.vertices);
for (let i = 0; i < geometry.attributes.position.count; i++) {
  const [x, y, z] = model.vertices.slice(i * 3, i * 3 + 3);
  const amount = Math.exp(-(((y - 3.7) / 1.8) ** 2)) * Math.max(0, 1 - Math.abs(x) / 2.3);
  breathPosition[i * 3 + 2] += amount * (z > 0 ? .028 : -.008);
}
geometry.morphAttributes.position = [new THREE.Float32BufferAttribute(breathPosition, 3)]; mesh.updateMorphTargets();
const smooth = t => t * t * t * (t * (t * 6 - 15) + 10);
const restPositions=bones.map(b=>b.position.clone());
function pose(frame) {
  const t = ((frame % 192) + 192) % 192 / 192;
  const lift = t < .40 ? smooth(t / .40) : t < .46 ? 1 : t < .96 ? 1 - smooth((t - .46) / .50) : 0;
  for (let i=0;i<bones.length;i++){bones[i].quaternion.identity();bones[i].position.copy(restPositions[i]);}
  for (const [name, rotation] of Object.entries(restRotations)) byName[name].quaternion.copy(rotation);
  applyMotion(exercise,lift,{byName,dataByName,mesh});
  mesh.morphTargetInfluences[0] = 0;
  mesh.updateMatrixWorld(true); skeleton.update();updateBand();
  return lift;
}
function setView(view) {
  camera.zoom = 1; let target = new THREE.Vector3(0, .5, 0);
  if (view === 'hand') { target = byName['wrist.L'].getWorldPosition(new THREE.Vector3()); camera.position.copy(target).add(new THREE.Vector3(4, 3, 7)); camera.zoom = 5.5; }
  else if (view === 'shoulder') { target.set(0, 4.9, .3); camera.position.set(8, 7.5, 24); camera.zoom = 2.1; }
  else if (view === 'back') camera.position.set(-12, 4, -32);
  else if (view === 'side') camera.position.set(32, 4, 3);
  else if(view==='front')camera.position.set(0,4.5,32);else camera.position.set(9,7,32);
  camera.lookAt(target); camera.updateProjectionMatrix();
}
window.renderSkinned = (frame = 0, view = 'full', dark = false) => {
  pose(frame); setView(view); scene.background = new THREE.Color(dark ? '#09090b' : '#fafafa');
  groundMaterial.color.set(dark ? '#000000' : '#263b40'); renderer.render(scene, camera);
  return canvas.toDataURL('image/png').split(',')[1];
};
window.inspectSkinned = () => ({ bones: bones.length, vertices: geometry.attributes.position.count, triangles: model.indices.length / 3, clothesTriangles: clothPositions.length / 9 });
window.inspectPose = frame => {
  pose(frame); const result = {};
  for (const name of ['upperarm01.L', 'lowerarm01.L', 'wrist.L', 'upperarm01.R', 'lowerarm01.R', 'wrist.R', 'foot.L', 'foot.R']) result[name] = byName[name].getWorldPosition(new THREE.Vector3()).toArray();
  result.anchor=anchor.toArray();result.grip=gripPoint.getWorldPosition(new THREE.Vector3()).toArray();const dir=new THREE.Vector3(0,1,0).applyQuaternion(band.quaternion).multiplyScalar(band.scale.y/2);result.bandStart=band.position.clone().sub(dir).toArray();result.bandEnd=band.position.clone().add(dir).toArray();result.handAxis=new THREE.Vector3(0,1,0).applyQuaternion(grip.getWorldQuaternion(new THREE.Quaternion())).toArray();
  return result;
};
window.renderSkinned(0); window.ready = true;
