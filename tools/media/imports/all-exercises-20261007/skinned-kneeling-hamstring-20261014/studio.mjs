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
floor.rotation.x = -Math.PI / 2; floor.position.y = -7.751375; floor.receiveShadow = true; scene.add(floor);const mat=new THREE.Mesh(new THREE.BoxGeometry(9,.08,18),new THREE.MeshStandardMaterial({color:0x8daeb5,roughness:1}));mat.position.set(0,-7.791375,1);scene.add(mat);
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
const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(7.5,4.8), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false})); contactShadow.rotation.x=-Math.PI/2; contactShadow.position.set(0,-7.745,2.5); scene.add(contactShadow);
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
const normalGroups=new Map();for(let i=0;i<model.vertices.length/3;i++){const key=model.vertices.slice(i*3,i*3+3).map(x=>x.toFixed(5)).join();if(!normalGroups.has(key))normalGroups.set(key,new THREE.Vector3());normalGroups.get(key).add(new THREE.Vector3().fromBufferAttribute(sourceNormal,i));}
function vertex(i) {
  const p = vec(model.vertices.slice(i * 3, i * 3 + 3));
  const n = normalGroups.get(model.vertices.slice(i*3,i*3+3).map(x=>x.toFixed(5)).join()).clone().normalize();
  const looseness = .10 + .12 * THREE.MathUtils.smoothstep(-p.y, .4, 2.7);
  p.addScaledVector(n, looseness);
  // A loose gusset bridges the anatomical gluteal cleft instead of reproducing skin folds.
  if(Math.abs(p.x)<1.3 && p.y>-1.8 && p.y<1.3 && p.z<.5){const blend=(1-THREE.MathUtils.smoothstep(p.z,0,.5))*(1-THREE.MathUtils.smoothstep(Math.abs(p.x),.65,1.3))*THREE.MathUtils.smoothstep(p.y,-1.8,-.8)*(1-THREE.MathUtils.smoothstep(p.y,.8,1.3));p.z=THREE.MathUtils.lerp(p.z,Math.min(p.z,-1.05),blend);}

  const w = {};
  for (let j = 0; j < 4; j++) w[model.skinIndices[i * 4 + j]] = (w[model.skinIndices[i * 4 + j]] || 0) + model.skinWeights[i * 4 + j];
  const original=vec(model.vertices.slice(i*3,i*3+3));const stability=(1-THREE.MathUtils.smoothstep(Math.abs(original.x),.25,1.3))*THREE.MathUtils.smoothstep(original.y,-.9,-.2)*(1-THREE.MathUtils.smoothstep(original.y,1.0,1.6))*(1-THREE.MathUtils.smoothstep(original.z,0,.5));for(const key of Object.keys(w))w[key]*=1-stability;w[95]=(w[95]||0)+stability;
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
const originalVertex=vertex,garmentCache=new Map(),neighbors=new Map();for(let i=0;i<model.indices.length;i+=3){const tri=model.indices.slice(i,i+3);for(const a of tri){if(!neighbors.has(a))neighbors.set(a,new Set());for(const b of tri)if(a!==b)neighbors.get(a).add(b);}}for(let i=0;i<model.vertices.length/3;i++){const p=vec(model.vertices.slice(i*3,i*3+3));if(Math.abs(p.x)<1.7&&p.y>-2&&p.y<1.7&&p.z<.7)garmentCache.set(i,originalVertex(i));}for(let step=0;step<35;step++){const next=new Map();for(const [i,item]of garmentCache){const p=vec(model.vertices.slice(i*3,i*3+3)),blend=(1-THREE.MathUtils.smoothstep(Math.abs(p.x),.7,1.5))*THREE.MathUtils.smoothstep(p.y,-1.8,-.8)*(1-THREE.MathUtils.smoothstep(p.y,1,1.5))*(1-THREE.MathUtils.smoothstep(p.z,0,.6));if(!blend)continue;const n=new THREE.Vector3();let count=0;for(const j of neighbors.get(i)||[]){n.add((garmentCache.get(j)||originalVertex(j)).p);count++;}if(count)next.set(i,item.p.clone().lerp(n.divideScalar(count),blend*.45));}for(const [i,p]of next)garmentCache.get(i).p.copy(p);}vertex=i=>garmentCache.get(i)||originalVertex(i);
const clothPositions = [], clothNormals = [], clothIndices = [], clothWeights = [];
for (let i = 0; i < model.indices.length; i += 3) {
  const ids = model.indices.slice(i, i + 3);if(ids.some(v=>Math.abs(model.vertices[v*3])>3.2))continue;
  if (ids.every(v => model.vertices[v * 3 + 1] > 2.1) || ids.every(v => model.vertices[v * 3 + 1] < -2.9)) continue;
  const poly = clip(clip(ids.map(vertex), 2.0, true), -2.65, false);
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
clothGeometry.computeVertexNormals();const smoothNormals=new Map(),cp=clothGeometry.attributes.position,cn=clothGeometry.attributes.normal;for(let i=0;i<cp.count;i++){const key=[cp.getX(i),cp.getY(i),cp.getZ(i)].map(x=>x.toFixed(5)).join();if(!smoothNormals.has(key))smoothNormals.set(key,new THREE.Vector3());smoothNormals.get(key).add(new THREE.Vector3().fromBufferAttribute(cn,i));}for(let i=0;i<cp.count;i++){const key=[cp.getX(i),cp.getY(i),cp.getZ(i)].map(x=>x.toFixed(5)).join(),n=smoothNormals.get(key).clone().normalize();cn.setXYZ(i,n.x,n.y,n.z);}
const clothMaterial = new THREE.MeshStandardMaterial({ color: '#087e87', roughness: .95, side: THREE.DoubleSide });
clothMaterial.onBeforeCompile = shader => {
  shader.vertexShader = 'varying vec3 garmentPosition;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ngarmentPosition=position;');
  shader.fragmentShader = 'varying vec3 garmentPosition;\n' + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat band=step(1.74,garmentPosition.y); float hem=1.0-smoothstep(-2.60,-2.50,garmentPosition.y); diffuseColor.rgb*=1.0-0.35*max(band,hem);');
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
  if(exercise.startsWith('single-arm-')&&side==='R'){
    dumbbell.visible=false;
    for(let finger=2;finger<=5;finger++)for(let joint=1;joint<=3;joint++)restRotations[`finger${finger}-${joint}.${side}`]=new THREE.Quaternion().setFromAxisAngle(across,radians(-mirror*[0,15,20,10][joint]));
  }
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
  const lift = t < .40 ? smooth(t / .40) : t < .46 ? 1 : t < .96 ? 1 - smooth((t - .46) / .50) : 0;
  for (let i=0;i<bones.length;i++){bones[i].quaternion.identity();bones[i].position.copy(restPositions[i]);}
  for (const [name, rotation] of Object.entries(restRotations)) if(!name.startsWith("finger"))byName[name].quaternion.copy(rotation);
  applyMotion(exercise,lift,{byName,dataByName,mesh},frame);
  mesh.morphTargetInfluences[0] = .5 - .5 * Math.cos(t * Math.PI * 2);
  mesh.updateMatrixWorld(true); skeleton.update();
  return lift;
}
function setView(view) {
  camera.zoom = 1; let target = new THREE.Vector3(0, .5, 0);
  if(view==='full'||view==='side'||view==='back'){camera.zoom=1.0;target.y=-.8;}
  if(view==='full'){target.set(0,-2.9,1.5);camera.position.set(23,1,28);camera.zoom=1.12;} else if(view==='wide'){target.set(0,-.8,0);camera.position.set(20,7,28);camera.zoom=1;} else if(view==='support'){target=byName['wrist.L'].getWorldPosition(new THREE.Vector3());camera.position.copy(target).add(new THREE.Vector3(4,-4,7));camera.zoom=5.5;} else if (view === 'hand') { target = byName['wrist.R'].getWorldPosition(new THREE.Vector3()); camera.position.copy(target).add(new THREE.Vector3(4, 3, 7)); camera.zoom = 5.5; }
  else if(view==='feet'){target.set(0,-7,6);camera.position.set(9,-3,19);camera.zoom=2.7;} else if(view==='seat'){target.set(0,-3.25,0);camera.position.set(12,-3,20);camera.zoom=2.5;} else if (view === 'shoulder') { target=byName.root.getWorldPosition(new THREE.Vector3());camera.position.copy(target).add(new THREE.Vector3(-8,3,-12));camera.zoom=4; }
  else if (view === 'back') camera.position.set(-12, 4, -32);
  else if (view === 'side') camera.position.set(32, 4, 3);
  else camera.position.set(20,7,28);
  camera.lookAt(target); camera.updateProjectionMatrix();
}
window.renderSkinned = (frame = 0, view = 'full', dark = false) => {
  pose(frame); setView(view); scene.background = new THREE.Color(dark ? '#09090b' : '#fafafa');
  groundMaterial.color.set(dark ? '#000000' : '#263b40'); renderer.render(scene, camera);
  return canvas.toDataURL('image/png').split(',')[1];
};
window.inspectSkinned = () => ({ bones: bones.length, vertices: geometry.attributes.position.count, triangles: model.indices.length / 3, clothesTriangles: clothPositions.length / 9 });
const heelIndices={};for(const side of ['L','R']){let min=Infinity;for(let i=0;i<geometry.attributes.position.count;i++){const x=model.vertices[i*3],y=model.vertices[i*3+1],z=model.vertices[i*3+2];if(z<.35&&y< -7.5&&(side==='L'?x>0:x<0)&&y<min){min=y;heelIndices[side]=i;}}}
const legSamples=[[],[]];for(let i=0;i<model.vertices.length/3;i++)if(model.vertices[i*3+1]<-1.3)legSamples[model.vertices[i*3]>0?0:1].push(i);
window.inspectGrip=frame=>{pose(frame);const points=[];for(let i=0;i<geometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);mesh.applyBoneTransform(i,p);points.push(p.toArray());}return {vertices:points,indices:model.indices,restVertices:model.vertices,skinIndices:model.skinIndices,skinWeights:model.skinWeights,boneNames:model.bones.map(b=>b.name)};};window.inspectPose=frame=>{pose(frame);const result={};result.feetBySide={};for(const side of ['L','R']){let min=Infinity,heel=Infinity,tip=Infinity;for(let i=0;i<geometry.attributes.position.count;i++){const x=model.vertices[i*3],y=model.vertices[i*3+1],z=model.vertices[i*3+2];if(y> -7.5||(side==='L'?x<0:x>0))continue;const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);mesh.applyBoneTransform(i,p);min=Math.min(min,p.y);if(z<.35)heel=Math.min(heel,p.y);if(z>1.8)tip=Math.min(tip,p.y);}result.feetBySide[side]={min,heel,tip};result.feetBySide[side].toeTip=byName['toe1-2.'+side].localToWorld(vec(dataByName['toe1-2.'+side].tail).sub(vec(dataByName['toe1-2.'+side].head))).toArray();}for(const side of ['L','R']){const i=heelIndices[side],p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);mesh.applyBoneTransform(i,p);result.feetBySide[side].heelAnchor=p.toArray();}for(const n of ['root','head','spine01','spine05','upperleg01.L','upperleg01.R','lowerleg01.L','lowerleg01.R','foot.L','foot.R','upperarm01.L','upperarm01.R','lowerarm01.L','lowerarm01.R','wrist.L','wrist.R'])result[n]=byName[n].getWorldPosition(new THREE.Vector3()).toArray();const bins=new Map();for(let side=0;side<2;side++)for(const i of legSamples[side]){const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);mesh.applyBoneTransform(i,p);const key=Math.floor(p.y/.10);if(!bins.has(key))bins.set(key,[[],[]]);bins.get(key)[side].push(p);}for(let i=0;i<clothGeometry.attributes.position.count;i++){const rest=new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i);if(rest.y>=-1.3)continue;const side=rest.x>0?0:1;shorts.applyBoneTransform(i,rest);const key=Math.floor(rest.y/.10);if(!bins.has(key))bins.set(key,[[],[]]);bins.get(key)[side].push(rest);}result.legSectionGap=Infinity;for(const [binKey,[a,b]]of bins){if(a.length<3||b.length<3)continue;let best=-Infinity;for(let n=0;n<36;n++){const x=Math.cos(n*Math.PI/18),z=Math.sin(n*Math.PI/18);let amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;for(const p of a){const t=p.x*x+p.z*z;amin=Math.min(amin,t);amax=Math.max(amax,t);}for(const p of b){const t=p.x*x+p.z*z;bmin=Math.min(bmin,t);bmax=Math.max(bmax,t);}best=Math.max(best,bmin-amax,amin-bmax);}if(best<result.legSectionGap){result.legSectionGap=best;result.legSectionY=binKey*.10;}}const waistBins=new Map(),center=new THREE.Vector3(),rootWorld=byName.root.getWorldPosition(new THREE.Vector3()),invRoot=byName.root.getWorldQuaternion(new THREE.Quaternion()).invert(),unhinge=p=>p.sub(rootWorld).applyQuaternion(invRoot).add(vec(dataByName.root.head));for(let i=0;i<geometry.attributes.position.count;i++){const rest=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);if(rest.y<1.3||rest.y>2.5||Math.abs(rest.x)>3.2)continue;const p=rest.clone();p.z+=(breathPosition[i*3+2]-rest.z)*mesh.morphTargetInfluences[0];mesh.applyBoneTransform(i,p);unhinge(p);const angle=Math.atan2(p.z-center.z,p.x-center.x),key=Math.floor(p.y/.05)+':'+Math.floor((angle+Math.PI)/.05),radius=Math.hypot(p.x-center.x,p.z-center.z);waistBins.set(key,Math.max(waistBins.get(key)||0,radius));}result.waistGarmentRadialGap=Infinity;for(let i=0;i<clothGeometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i);if(p.y<1.74)continue;shorts.applyBoneTransform(i,p);unhinge(p);const angle=Math.atan2(p.z-center.z,p.x-center.x),yb=Math.floor(p.y/.05),ab=Math.floor((angle+Math.PI)/.05),radius=Math.hypot(p.x-center.x,p.z-center.z);let skin=0;for(let dy=-1;dy<=1;dy++)for(let da=-1;da<=1;da++)skin=Math.max(skin,waistBins.get((yb+dy)+':'+(ab+da))||0);if(skin && radius-skin<result.waistGarmentRadialGap){result.waistGarmentRadialGap=radius-skin;result.waistGapPoint=p.toArray();result.waistGapSkinRadius=skin;}}const handMin={L:Infinity,R:Infinity},bodyMax={L:-Infinity,R:-Infinity};for(let i=0;i<geometry.attributes.position.count;i++){let best=-1,name='';for(let j=0;j<4;j++)if(model.skinWeights[i*4+j]>best){best=model.skinWeights[i*4+j];name=model.bones[model.skinIndices[i*4+j]].name;}const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);mesh.applyBoneTransform(i,p);if(/^(finger|wrist|metacarpal)/.test(name)){const side=name.endsWith('.L')?'L':'R';handMin[side]=Math.min(handMin[side],p.x*(side==='L'?1:-1));}else if(!/arm/.test(name)){bodyMax.L=Math.max(bodyMax.L,p.x);bodyMax.R=Math.max(bodyMax.R,-p.x);}}for(let i=0;i<clothGeometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i);shorts.applyBoneTransform(i,p);bodyMax.L=Math.max(bodyMax.L,p.x);bodyMax.R=Math.max(bodyMax.R,-p.x);}result.handBodyPlaneGap={L:handMin.L-bodyMax.L,R:handMin.R-bodyMax.R};result.rootQuaternion=byName.root.getWorldQuaternion(new THREE.Quaternion()).toArray();result.chestQuaternion=byName.spine01.getWorldQuaternion(new THREE.Quaternion()).toArray();return result;};

const oldInspect=window.inspectPose;window.inspectPose=frame=>{const r=oldInspect(frame);r.kneeAngle={};for(const side of ['L','R']){const a=vec(r['upperleg01.'+side]).sub(vec(r['lowerleg01.'+side])),b=vec(r['foot.'+side]).sub(vec(r['lowerleg01.'+side]));r.kneeAngle[side]=THREE.MathUtils.radToDeg(a.angleTo(b));}return r;};const waistTriangles=[],waistVertexSet=new Set();for(let k=0;k<model.indices.length;k+=3){const ids=model.indices.slice(k,k+3);if(ids.some(i=>Math.abs(model.vertices[i*3])>3.2)||ids.every(i=>model.vertices[i*3+1]>2.9)||ids.every(i=>model.vertices[i*3+1]<1.1))continue;waistTriangles.push(ids);ids.forEach(i=>waistVertexSet.add(i));}
const garmentWaist=[];for(let i=0;i<clothGeometry.attributes.position.count;i++)if(clothGeometry.attributes.position.getY(i)>=1.74)garmentWaist.push(i);
const previousInspect=window.inspectPose;window.inspectPose=frame=>{const r=previousInspect(frame),rp=byName.root.getWorldPosition(new THREE.Vector3()),iq=byName.root.getWorldQuaternion(new THREE.Quaternion()).invert(),restRoot=vec(dataByName.root.head),unhinge=p=>p.sub(rp).applyQuaternion(iq).add(restRoot),skinPoints=new Map(),bins=new Map();for(const i of waistVertexSet){const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);p.z+=(breathPosition[i*3+2]-p.z)*mesh.morphTargetInfluences[0];mesh.applyBoneTransform(i,p);skinPoints.set(i,unhinge(p));}for(const ids of waistTriangles){const t=ids.map(i=>skinPoints.get(i));for(let y=Math.floor(Math.min(...t.map(p=>p.y))/.05);y<=Math.floor(Math.max(...t.map(p=>p.y))/.05);y++){if(!bins.has(y))bins.set(y,[]);bins.get(y).push(t);}}
r.waistExactRadialGap=Infinity;let hits=0,misses=0;const seen=new Set();for(const i of garmentWaist){const p=new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i);shorts.applyBoneTransform(i,p);unhinge(p);const key=p.toArray().map(x=>x.toFixed(6)).join(',');if(seen.has(key))continue;seen.add(key);const radius=Math.hypot(p.x,p.z),dx=p.x/radius,dz=p.z/radius;let skinRadius=-Infinity;for(const [a,b,c]of bins.get(Math.floor(p.y/.05))||[]){const e1x=b.x-a.x,e1y=b.y-a.y,e1z=b.z-a.z,e2x=c.x-a.x,e2y=c.y-a.y,e2z=c.z-a.z,hx=-dz*e2y,hy=dz*e2x-dx*e2z,hz=dx*e2y,det=e1x*hx+e1y*hy+e1z*hz;if(Math.abs(det)<1e-10)continue;const inv=1/det,sx=-a.x,sy=p.y-a.y,sz=-a.z,u=inv*(sx*hx+sy*hy+sz*hz);if(u<0||u>1)continue;const qx=sy*e1z-sz*e1y,qy=sz*e1x-sx*e1z,qz=sx*e1y-sy*e1x,v=inv*(dx*qx+dz*qz);if(v<0||u+v>1)continue;const t=inv*(e2x*qx+e2y*qy+e2z*qz);if(t>0)skinRadius=Math.max(skinRadius,t);}if(Number.isFinite(skinRadius)){hits++;if(radius-skinRadius<r.waistExactRadialGap){r.waistExactRadialGap=radius-skinRadius;r.waistExactPoint=p.toArray();}}else misses++;}r.waistExactSamples={hits,misses};return r;};window.renderSkinned(0);window.ready=true;

window.pixelProbe=(x,y)=>{window.renderSkinned(240,'shoulder');const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x/240-1,1-y/240),camera);return ray.intersectObjects([mesh,shorts]).slice(0,6).map(r=>({object:r.object===mesh?'skin':'cloth',distance:r.distance,world:r.point.toArray(),rest:[r.face.a,r.face.b,r.face.c].map(i=>new THREE.Vector3().fromBufferAttribute(r.object.geometry.attributes.position,i).toArray())}));};
const contactSkinIds=new Set(),contactSkinTriangles=[];for(let k=0;k<model.indices.length;k+=3){const ids=model.indices.slice(k,k+3);if(ids.every(i=>Math.abs(model.vertices[i*3])<3.2&&model.vertices[i*3+1]>-3&&model.vertices[i*3+1]<3)){contactSkinTriangles.push(ids);ids.forEach(i=>contactSkinIds.add(i));}}
const beforeContact=window.inspectPose;window.inspectPose=frame=>{const r=beforeContact(frame),root=byName.root.getWorldPosition(new THREE.Vector3()),inv=byName.root.getWorldQuaternion(new THREE.Quaternion()).invert(),un=p=>p.sub(root).applyQuaternion(inv).add(vec(dataByName.root.head)),points=new Map(),bins=new Map();for(const i of contactSkinIds){const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);mesh.applyBoneTransform(i,p);points.set(i,un(p));}for(const ids of contactSkinTriangles){const t=ids.map(i=>points.get(i));for(let x=Math.floor(Math.min(...t.map(p=>p.x))/.2);x<=Math.floor(Math.max(...t.map(p=>p.x))/.2);x++)for(let y=Math.floor(Math.min(...t.map(p=>p.y))/.2);y<=Math.floor(Math.max(...t.map(p=>p.y))/.2);y++){const key=x+':'+y;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(t);}}
let gap=Infinity,hits=0,misses=0;const seen=new Set();for(let i=0;i<clothGeometry.attributes.position.count;i++){const rest=new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i);if(Math.abs(rest.x)>1.3||rest.y<-.9||rest.y>1.3||rest.z>-.3)continue;const key=rest.toArray().map(x=>x.toFixed(5)).join();if(seen.has(key))continue;seen.add(key);shorts.applyBoneTransform(i,rest);un(rest);let back=Infinity,zHits=[];for(const [a,b,c]of bins.get(Math.floor(rest.x/.2)+':'+Math.floor(rest.y/.2))||[]){const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<1e-10)continue;const u=((b.y-c.y)*(rest.x-c.x)+(c.x-b.x)*(rest.y-c.y))/den,v=((c.y-a.y)*(rest.x-c.x)+(a.x-c.x)*(rest.y-c.y))/den;if(u<0||v<0||u+v>1)continue;zHits.push(u*a.z+v*b.z+(1-u-v)*c.z);back=Math.min(back,u*a.z+v*b.z+(1-u-v)*c.z);}if(Number.isFinite(back)){const zs=[...new Set(zHits.map(z=>Number(z.toFixed(7))))].sort((a,b)=>a-b);let inside=false;for(let k=0;k+1<zs.length;k+=2)if(rest.z>zs[k]&&rest.z<zs[k+1])inside=true;const clearance=Math.min(...zs.map(z=>Math.abs(z-rest.z)));gap=Math.min(gap,inside?-clearance:clearance);hits++;}else misses++;}r.gussetBackRay={gap,hits,misses};r.kneeFloor=Infinity;r.skinFloor=Infinity;r.clothFloor=Infinity;for(let i=0;i<geometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i),rest=p.clone();mesh.applyBoneTransform(i,p);if(p.y+7.751375<r.skinFloor){r.skinFloor=p.y+7.751375;r.skinFloorRest=rest.toArray();}if(rest.x>0&&rest.y>-3.6&&rest.y<-2.7)r.kneeFloor=Math.min(r.kneeFloor,p.y+7.751375);}for(let i=0;i<clothGeometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i);shorts.applyBoneTransform(i,p);r.clothFloor=Math.min(r.clothFloor,p.y+7.751375);}return r;};
