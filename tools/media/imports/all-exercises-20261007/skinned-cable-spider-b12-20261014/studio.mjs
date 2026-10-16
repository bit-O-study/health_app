import {createCable} from './cable.mjs';

import * as THREE from './three.module.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { applyMotion, exercises } from './motion.mjs';
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
floor.rotation.x = -Math.PI / 2; floor.position.y = -8.175231; floor.receiveShadow = true; scene.add(floor);
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
const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(7.5,4.8), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false})); contactShadow.rotation.x=-Math.PI/2; contactShadow.position.set(0,-8.17,0.5); scene.add(contactShadow);
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute(model.vertices, 3));
geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(model.skinIndices, 4));
geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(model.skinWeights, 4));
geometry.setIndex(model.indices); geometry.computeVertexNormals();
const skin = new THREE.MeshStandardMaterial({ color: '#939fa3', roughness: .49, metalness: .05 });
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
  dumbbell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), across); byName['wrist.' + side].add(dumbbell); dumbbells.push(dumbbell); dumbbell.visible=false;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 1.28, 32), metal); dumbbell.add(handle);
  for (const end of [-1, 1]) {
    const shape = new THREE.Shape();
    for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI * 2; if (k === 0) shape.moveTo(.56 * Math.cos(a), .56 * Math.sin(a)); else shape.lineTo(.56 * Math.cos(a), .56 * Math.sin(a)); }
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .45, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .045, bevelThickness: .045 }), rubber);
    plate.rotation.x = Math.PI / 2; plate.position.y = end * .90 + .225; plate.castShadow = true; dumbbell.add(plate);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .012, 32), inset); cap.position.y = end * 1.19; dumbbell.add(cap);
  }
}

const bar=new THREE.Group();scene.add(bar);let gripX=0;const pathPoints=[];
function makeBar(x){gripX=x;pathPoints.push(new THREE.Vector3(-3.2,0,0),new THREE.Vector3(3.2,0,0));const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,6.4,32),metal);shaft.rotation.z=Math.PI/2;bar.add(shaft);}const cable=createCable(scene);
const pad=new THREE.Mesh(new THREE.BoxGeometry(2.9,7.5,.35),new THREE.MeshStandardMaterial({color:'#263943',roughness:.85}));pad.rotation.x=radians(45);scene.add(pad);const padUp=new THREE.Vector3(0,Math.SQRT1_2,Math.SQRT1_2),padNormal=new THREE.Vector3(0,Math.SQRT1_2,-Math.SQRT1_2);let initialized=false,rootShift=0,padTop=0;
const benchParts=[];function beam(a,b,r=.12){const d=b.clone().sub(a),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),24),metal);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());scene.add(o);benchParts.push({a:a.clone(),b:b.clone(),r});}
function initBench(){let feet=Infinity;for(let i=0;i<model.vertices.length/3;i++){if(model.vertices[i*3+1]>-6)continue;const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);mesh.applyBoneTransform(i,p);feet=Math.min(feet,p.y);}rootShift=-8.175231-feet;byName.root.position.y+=rootShift;mesh.updateMatrixWorld(true);skeleton.update();let mn=Infinity,lo=Infinity,hi=-Infinity;for(let i=0;i<model.vertices.length/3;i++){const ry=model.vertices[i*3+1];if(ry<.4||ry>5.5||Math.abs(model.vertices[i*3])>1.45)continue;const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);mesh.applyBoneTransform(i,p);mn=Math.min(mn,p.dot(padNormal));lo=Math.min(lo,p.dot(padUp));hi=Math.max(hi,p.dot(padUp));}padTop=mn-.012;pad.position.copy(padUp).multiplyScalar((lo+hi)/2-1.2).addScaledVector(padNormal,padTop-.175);pad.updateMatrixWorld(true);for(const t of [-1,1]){const top=pad.position.clone().addScaledVector(padUp,t<0?-2.7:1.2).addScaledVector(padNormal,-.22),bottom=new THREE.Vector3(0,-8.05,top.z);beam(top,bottom,.20);beam(new THREE.Vector3(-2,-8.05,top.z),new THREE.Vector3(2,-8.05,top.z),.125);}const lowA=pad.position.clone().addScaledVector(padUp,-2.7),lowB=pad.position.clone().addScaledVector(padUp,1.2);beam(new THREE.Vector3(0,-8.05,lowA.z),new THREE.Vector3(0,-8.05,lowB.z),.15);beam(pad.position.clone().addScaledVector(padUp,-3.3).addScaledVector(padNormal,-.4),pad.position.clone().addScaledVector(padUp,3.3).addScaledVector(padNormal,-.4),.14);initialized=true;}
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
  const t = ((frame % 480) + 480) % 480 / 480;
  const seconds=t*8;const lift=seconds<.4?0:seconds<3.8?smooth((seconds-.4)/3.4):seconds<4.2?1:seconds<7.6?1-smooth((seconds-4.2)/3.4):0;
  for (let i=0;i<bones.length;i++){bones[i].quaternion.identity();bones[i].position.copy(restPositions[i]);}
  for (const [name, rotation] of Object.entries(restRotations)) byName[name].quaternion.copy(rotation);
  applyMotion(exercise,lift,{byName,dataByName,mesh},frame);
  mesh.morphTargetInfluences[0] = 0;
  mesh.updateMatrixWorld(true); skeleton.update();
  if(!initialized)initBench();else{byName.root.position.y+=rootShift;mesh.updateMatrixWorld(true);skeleton.update();}
  const grips=dumbbells.map(d=>d.getWorldPosition(new THREE.Vector3()));if(!gripX)makeBar(Math.abs(grips[0].x));bar.position.copy(grips[0]).add(grips[1]).multiplyScalar(.5);bar.rotation.x=radians(5+115*lift);cable.update(bar.position);return lift;
}
function setView(view) {
  camera.zoom = 1; let target = new THREE.Vector3(0,-1,3);
  if(view==='pulley'){target.set(0,-6.8,4.1);camera.position.set(6,-5.8,2);camera.zoom=5;} else if(view==='stack'){target.set(0,0,9.2);camera.position.set(8,1,7);camera.zoom=1.7;} else if(view==='support'){target=pad.position.clone().addScaledVector(padUp,1);camera.position.copy(target).add(new THREE.Vector3(9,1,3));camera.zoom=2.6;} else if (view === 'hand') { target = byName['wrist.L'].getWorldPosition(new THREE.Vector3()); camera.position.copy(target).add(new THREE.Vector3(4, 3, 7)); camera.zoom = 5.5; }
  else if (view === 'feet') { target.set(0,-7.3,1.2); camera.position.set(10,-4.7,14); camera.zoom=2.7; }
  else if (view === 'shoulder') { target.set(0, 4.9, .3); camera.position.set(8, 7.5, 24); camera.zoom = 2.1; }
  else if (view === 'back') camera.position.set(-12, 4, -32);
  else if (view === 'side') {camera.position.set(32,4,3);camera.zoom=.85;}
  else {camera.position.set(26,11,28);camera.zoom=.78;}
  camera.lookAt(target); camera.updateProjectionMatrix();
}
window.renderSkinned = (frame = 0, view = 'full', dark = false) => {
  pose(frame); setView(view); cable.setDark(dark); scene.background = new THREE.Color(dark ? '#09090b' : '#fafafa');
  groundMaterial.color.set(dark ? '#000000' : '#263b40'); renderer.render(scene, camera);
  return canvas.toDataURL('image/png').split(',')[1];
};
window.inspectSkinned = () => ({ bones: bones.length, vertices: geometry.attributes.position.count, triangles: model.indices.length / 3, clothesTriangles: clothPositions.length / 9 });
window.inspectPose=frame=>{pose(frame);const result={};for(const name of ['root','upperarm01.L','lowerarm01.L','wrist.L','upperarm01.R','lowerarm01.R','wrist.R','upperleg01.L','lowerleg01.L','foot.L','foot.R'])result[name]=byName[name].getWorldPosition(new THREE.Vector3()).toArray();result.handles=dumbbells.map(d=>({position:d.getWorldPosition(new THREE.Vector3()).toArray(),axis:new THREE.Vector3(0,1,0).applyQuaternion(d.getWorldQuaternion(new THREE.Quaternion())).toArray()}));result.bench={center:pad.position.toArray(),up:padUp.toArray(),normal:padNormal.toArray(),parts:benchParts.map(b=>({a:b.a.toArray(),b:b.b.toArray(),r:b.r}))};result.cable=cable.inspect();result.bar={center:bar.position.toArray(),rotation:bar.quaternion.toArray(),gripX};result.palmNormals=['L','R'].map(side=>{const i=vec(dataByName['finger2-1.'+side].head),l=vec(dataByName['finger5-1.'+side].head),f=vec(dataByName['finger3-1.'+side].tail).sub(vec(dataByName['finger3-1.'+side].head));return new THREE.Vector3().crossVectors(i.sub(l),f).normalize().multiplyScalar(side==='L'?-1:1).applyQuaternion(byName['wrist.'+side].getWorldQuaternion(new THREE.Quaternion())).toArray();});return result;};
window.renderSkinned(0); window.ready=true;

window.inspectGeometry=(frame=0)=>{pose(frame);const inv=bar.quaternion.clone().invert(),c=bar.position,padInv=pad.quaternion.clone().invert();const ci=cable.inspect(),ca=new THREE.Vector3(...ci.start),cb=new THREE.Vector3(...ci.tangent);let cableBody=Infinity,cableCloth=Infinity,bodyMachine=Infinity,clothMachine=Infinity;let bodyBar=Infinity,skinPad=Infinity,clothPad=Infinity,bodyFrame=Infinity,clothEquipment=Infinity,footMinY=Infinity,leftHandMinX=Infinity,rightHandMaxX=-Infinity,chestPad=Infinity;
 const segment=(p,a,b,r)=>{const d=b.clone().sub(a),t=Math.max(0,Math.min(1,p.clone().sub(a).dot(d)/d.lengthSq()));return p.distanceTo(a.clone().addScaledVector(d,t))-r;};const padGap=p=>{const v=p.clone().sub(pad.position).applyQuaternion(padInv),a=[Math.abs(v.x)-1.45,Math.abs(v.y)-3.75,Math.abs(v.z)-.175];return Math.hypot(...a.map(x=>Math.max(x,0)))+Math.min(Math.max(...a),0);};
 const cableGap=p=>Math.min(segment(p,ca,cb,.032),segment(p,new THREE.Vector3(0,-7.15,4.1),new THREE.Vector3(0,-7.15,9.2),.032),p.distanceTo(new THREE.Vector3(0,-6.8,9.2))-.382,segment(p,new THREE.Vector3(0,-6.8,9.55),new THREE.Vector3(0,5.5,9.55),.032),p.distanceTo(new THREE.Vector3(0,5.5,9.2))-.382,segment(p,new THREE.Vector3(0,ci.stack[1],8.85),new THREE.Vector3(0,5.5,8.85),.032));const machineGap=p=>{const a=[Math.abs(p.x)-1.6,Math.abs(p.y+1.235)-6.935,Math.abs(p.z-9.2)-1.35],main=Math.hypot(...a.map(x=>Math.max(x,0)))+Math.min(Math.max(...a),0);const leg=Math.min(...[-.5,.5].map(x=>{const a=[Math.abs(p.x-x)-.11,Math.abs(p.y+7.97)-.2,Math.abs(p.z-6.5)-2.7];return Math.hypot(...a.map(x=>Math.max(x,0)))+Math.min(Math.max(...a),0);}));return Math.min(main,leg);};
 for(let i=0;i<model.vertices.length/3;i++){let hL=0,hR=0,foot=0;for(let j=0;j<4;j++){const n=model.bones[model.skinIndices[i*4+j]].name,w=model.skinWeights[i*4+j];if(/wrist|finger|metacarpal/.test(n)){if(n.endsWith('.L'))hL+=w;else hR+=w;}if(n.startsWith('foot')||n.startsWith('toe'))foot+=w;}const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);mesh.applyBoneTransform(i,p);if(hL>.4)leftHandMinX=Math.min(leftHandMinX,p.x);if(hR>.4)rightHandMaxX=Math.max(rightHandMaxX,p.x);if(foot>.8)footMinY=Math.min(footMinY,p.y);cableBody=Math.min(cableBody,cableGap(p));bodyMachine=Math.min(bodyMachine,machineGap(p));skinPad=Math.min(skinPad,padGap(p));if(model.vertices[i*3+1]>3.5&&model.vertices[i*3+1]<5.3&&Math.abs(model.vertices[i*3])<1&&model.vertices[i*3+2]>0)chestPad=Math.min(chestPad,padGap(p));for(const b of benchParts)bodyFrame=Math.min(bodyFrame,segment(p,b.a,b.b,b.r));p.sub(c).applyQuaternion(inv);if(hL+hR<.05)bodyBar=Math.min(bodyBar,segment(p,pathPoints[0],pathPoints[1],.12));}
 for(let i=0;i<clothGeometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i);shorts.applyBoneTransform(i,p);cableCloth=Math.min(cableCloth,cableGap(p));clothMachine=Math.min(clothMachine,machineGap(p));clothPad=Math.min(clothPad,padGap(p));for(const b of benchParts)clothEquipment=Math.min(clothEquipment,segment(p,b.a,b.b,b.r));p.sub(c).applyQuaternion(inv);clothEquipment=Math.min(clothEquipment,segment(p,pathPoints[0],pathPoints[1],.12));}
 let barPad=Infinity,barFrame=Infinity,barMachine=Infinity;for(let i=0;i<=220;i++){const p=new THREE.Vector3(-3.2+i*6.4/220,0,0).applyQuaternion(bar.quaternion).add(c);barPad=Math.min(barPad,padGap(p)-.12);barMachine=Math.min(barMachine,machineGap(p)-.12);for(const b of benchParts)barFrame=Math.min(barFrame,segment(p,b.a,b.b,b.r)-.12);}let cablePad=Infinity,cableFrame=Infinity;for(let i=0;i<ci.points.length-1;i++){const a=new THREE.Vector3(...ci.points[i]),b=new THREE.Vector3(...ci.points[i+1]);for(let j=0;j<=30;j++){const p=a.clone().lerp(b,j/30);cablePad=Math.min(cablePad,padGap(p)-.032);for(const b of benchParts)cableFrame=Math.min(cableFrame,segment(p,b.a,b.b,b.r)-.032);}}let benchMachine=Infinity;for(const b of benchParts)for(let i=0;i<=100;i++)benchMachine=Math.min(benchMachine,machineGap(b.a.clone().lerp(b.b,i/100))-b.r);return {frame,barMachine,benchMachine,cableBody,cableCloth,bodyMachine,clothMachine,cablePad,cableFrame,barFrame,bodyBar,skinPad,clothPad,bodyFrame,clothEquipment,chestPad,barPad,barFloor:c.y-.12+8.175231,footMinY,handSeparationX:leftHandMinX-rightHandMaxX,benchDegrees:Math.asin(padUp.y)*180/Math.PI};};
