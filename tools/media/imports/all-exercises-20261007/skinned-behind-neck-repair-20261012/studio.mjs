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
const camera = new THREE.OrthographicCamera(-12.5, 12.5, 12.5, -12.5, .1, 100);
const groundMaterial = new THREE.ShadowMaterial({ color: '#263b40', opacity: .16 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), groundMaterial);
floor.rotation.x = -Math.PI / 2; floor.position.y = -7.751375; floor.receiveShadow = true; scene.add(floor);
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
const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(7.5,4.8), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false})); contactShadow.rotation.x=-Math.PI/2; contactShadow.position.set(0,-7.751,3); scene.add(contactShadow);
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
  dumbbell.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), across); byName['wrist.' + side].add(dumbbell); dumbbells.push(dumbbell);
}

const barbell=new THREE.Group();scene.add(barbell);const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,15.5,32),metal);shaft.rotation.z=Math.PI/2;barbell.add(shaft);for(const x of [-6.1,6.1]){const plate=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,.4,48),rubber);plate.rotation.z=Math.PI/2;plate.position.x=x;barbell.add(plate);const collar=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.3,32),metal);collar.rotation.z=Math.PI/2;collar.position.x=x+Math.sign(x)*.4;barbell.add(collar);}
function updateBar(){barbell.position.copy(dumbbells[0].getWorldPosition(new THREE.Vector3())).add(dumbbells[1].getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);barbell.updateMatrixWorld(true);}
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
  const lift = t < .05 ? 0 : t < .475 ? smooth((t-.05)/.425) : t < .525 ? 1 : t < .95 ? 1-smooth((t-.525)/.425) : 0;
  for (let i=0;i<bones.length;i++){bones[i].quaternion.identity();bones[i].position.copy(restPositions[i]);}
  for (const [name, rotation] of Object.entries(restRotations)) byName[name].quaternion.copy(rotation);
  applyMotion(exercise,lift,{byName,dataByName,mesh});
  mesh.morphTargetInfluences[0] = 0;
  mesh.updateMatrixWorld(true); skeleton.update();
  updateBar();return lift;
}
function setView(view) {
  camera.zoom = 1; let target = new THREE.Vector3(0,2,0);
  if (view === 'hand') { target = byName['wrist.L'].getWorldPosition(new THREE.Vector3()); camera.position.copy(target).add(new THREE.Vector3(4, 3, 7)); camera.zoom = 5.5; }
  else if(view==='feet'){target.set(0,-7.6,0);camera.position.set(12,3,18);camera.zoom=3;}
  else if (view === 'shoulder') { target.set(0, 4.9, .3); camera.position.set(8, 7.5, 24); camera.zoom = 2.1; }
  else if (view === 'back') camera.position.set(-12, 4, -32);
  else if (view === 'side') camera.position.set(32, 4, 3);
  else camera.position.set(-15,4.5,-32);
  camera.lookAt(target); camera.updateProjectionMatrix();
}
window.renderSkinned = (frame = 0, view = 'full', dark = false) => {
  pose(frame); setView(view); scene.background = new THREE.Color(dark ? '#09090b' : '#fafafa');
  groundMaterial.color.set(dark ? '#000000' : '#263b40'); renderer.render(scene, camera);
  return canvas.toDataURL('image/png').split(',')[1];
};
window.inspectSkinned = () => ({ bones: bones.length, vertices: geometry.attributes.position.count, triangles: model.indices.length / 3, clothesTriangles: clothPositions.length / 9 });
const bodyCandidates=[];for(let i=0;i<model.vertices.length/3;i++){let hand=false;for(let j=0;j<4;j++)if(model.skinWeights[i*4+j]>.15&&/wrist|finger|metacarpal/.test(model.bones[model.skinIndices[i*4+j]].name))hand=true;if(!hand)bodyCandidates.push(i);}
window.inspectPose = frame => {
  pose(frame); const result = {};
  for (const name of ['upperarm01.L', 'lowerarm01.L', 'wrist.L', 'upperarm01.R', 'lowerarm01.R', 'wrist.R', 'foot.L', 'foot.R','root','spine01','upperleg01.L','lowerleg01.L','upperleg01.R','lowerleg01.R']) result[name] = byName[name].getWorldPosition(new THREE.Vector3()).toArray();
  result.soleMinY=Math.min(...Array.from({length:geometry.attributes.position.count},(_,i)=>model.vertices[i*3+1]<-7.8?mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i)).y:999));let equipmentNonTrapClearance=Infinity,trapClearance=Infinity,equipmentBodyClearance=Infinity,equipmentBenchClearance=Infinity;const inverses=[barbell.matrixWorld.clone().invert()];
 const sdf=p=>{const cylinder=(x,half,r)=>{const a=Math.abs(p.x-x)-half,b=Math.hypot(p.y,p.z)-r;return Math.hypot(Math.max(a,0),Math.max(b,0))+Math.min(Math.max(a,b),0);};return Math.min(cylinder(0,7.75,.12),cylinder(-6.1,.2,1.15),cylinder(6.1,.2,1.15),cylinder(-6.5,.15,.23),cylinder(6.5,.15,.23));};
 for(const i of bodyCandidates){const v=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i));for(const inv of inverses){const gap=sdf(v.clone().applyMatrix4(inv)),r=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);if(Math.abs(r.x)<2&&r.y>4.5&&r.y<6.5&&r.z<.5)trapClearance=Math.min(trapClearance,gap);else equipmentNonTrapClearance=Math.min(equipmentNonTrapClearance,gap);if(gap<equipmentBodyClearance){equipmentBodyClearance=gap;result.closestBody=v.toArray();}}}
 result.equipmentNonTrapClearance=equipmentNonTrapClearance;result.trapClearance=trapClearance;result.equipmentBodyClearance=equipmentBodyClearance;result.equipmentBenchClearance=equipmentBenchClearance;result.clothSeatMin=Infinity;for(let i=0;i<clothGeometry.attributes.position.count;i++){const v=new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i);if(Math.abs(v.x)>1.85||v.z>0)continue;shorts.applyBoneTransform(i,v);if(v.z<.7&&v.z>-3.4)result.clothSeatMin=Math.min(result.clothSeatMin,v.y);}result.seatSamples=[];for(let i=0;i<model.vertices.length/3;i++){const x=model.vertices[i*3],y=model.vertices[i*3+1],z=model.vertices[i*3+2];if(Math.abs(x)<1.9&&y>-.9&&y<.2&&z<-.1)result.seatSamples.push(mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i)).toArray());}result.dumbbellCenters=dumbbells.map(d=>d.getWorldPosition(new THREE.Vector3()).toArray());result.gripSocketLocal=dumbbells.map(d=>d.position.toArray());result.handles=dumbbells.map(d=>new THREE.Vector3(0,1,0).applyQuaternion(d.getWorldQuaternion(new THREE.Quaternion())).toArray());
  const supports=support();result.floorY=floor.position.y;result.pelvisFloorGap=supports.clothAll-floor.position.y;result.bodyFloorGap=supports.bodyAll-floor.position.y;result.heelFloorGap=supports.heel-floor.position.y;result.wristDeviation=[];for(const side of ['L','R']){const palm=vec(dataByName['finger2-1.'+side].head).add(vec(dataByName['finger5-1.'+side].head)).multiplyScalar(.5).sub(vec(dataByName['wrist.'+side].head)).normalize().applyQuaternion(byName['wrist.'+side].getWorldQuaternion(new THREE.Quaternion()));const lower=byName['wrist.'+side].getWorldPosition(new THREE.Vector3()).sub(byName['lowerarm01.'+side].getWorldPosition(new THREE.Vector3())).normalize();result.wristDeviation.push(THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(palm.dot(lower),-1,1))));}result.fittedBottom=globalThis.barBottom;result.barCenter=barbell.position.toArray();result.gripSpan=dumbbells[0].getWorldPosition(new THREE.Vector3()).distanceTo(dumbbells[1].getWorldPosition(new THREE.Vector3()));result.barGripError=Math.max(...dumbbells.map((d,i)=>d.getWorldPosition(new THREE.Vector3()).distanceTo(barbell.position.clone().add(new THREE.Vector3(i===0?4.2:-4.2,0,0)))));return result;
};
pose(0);for(let n=0;n<15;n++){let top=-Infinity;for(const i of bodyCandidates){const r=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i),p=mesh.applyBoneTransform(i,r);if(Math.abs(p.x)<3&&p.y>4.5&&p.y<6.5&&Math.abs(p.z+.8)<.12)top=Math.max(top,p.y+Math.sqrt(.0144-(p.z+.8)**2));}globalThis.barBottom=top;pose(0);}pose(0);function support(){let hip=Infinity,heel=Infinity,cloth=Infinity,bodyAll=Infinity,clothAll=Infinity,lowestBody=null,lowestCloth=null;for(let i=0;i<geometry.attributes.position.count;i++){const rest=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i),p=mesh.applyBoneTransform(i,rest.clone());if(p.y<bodyAll){bodyAll=p.y;lowestBody={i,rest:rest.toArray(),posed:p.toArray()};}if(rest.y<-7.8)heel=Math.min(heel,p.y);if(rest.y>-.9&&rest.y<.2&&rest.z<-.1)hip=Math.min(hip,p.y);}for(let i=0;i<clothGeometry.attributes.position.count;i++){const rest=new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i);const posedCloth=shorts.applyBoneTransform(i,rest.clone());if(posedCloth.y<clothAll){clothAll=posedCloth.y;lowestCloth={i,rest:rest.toArray(),posed:posedCloth.toArray()};}if(rest.y>-.9&&rest.y<.2&&rest.z<-.1)cloth=Math.min(cloth,shorts.applyBoneTransform(i,rest.clone()).y);}return {hip,heel,cloth,bodyAll,clothAll,lowestBody,lowestCloth};}window.support=support;floor.position.y=support().heel;contactShadow.position.y=floor.position.y+.001;contactShadow.position.z=0;for(const side of ['L','R']){const foot=byName['foot.'+side].getWorldPosition(new THREE.Vector3()),o=new THREE.Mesh(new THREE.PlaneGeometry(1.8,2),contactShadow.material);o.rotation.x=-Math.PI/2;o.position.set(foot.x,floor.position.y+.002,foot.z);scene.add(o);}window.renderSkinned(0); window.ready = true;
