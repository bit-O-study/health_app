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
floor.rotation.x = -Math.PI / 2; floor.position.y = -7.751375; floor.receiveShadow = true; scene.add(floor);const mat=new THREE.Mesh(new THREE.BoxGeometry(8,.08,22),new THREE.MeshStandardMaterial({color:0xc9d6d3,roughness:1}));mat.position.set(0,-7.791375,0);scene.add(mat);
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
function vertex(i) {
  const p = vec(model.vertices.slice(i * 3, i * 3 + 3));
  const n = new THREE.Vector3().fromBufferAttribute(sourceNormal, i);
  const looseness = p.y>0 ? .10 : .025 + .015 * THREE.MathUtils.smoothstep(-p.y, .4, 2.7);
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
  mesh.morphTargetInfluences[0] = 0;
  mesh.updateMatrixWorld(true); skeleton.update();
  return lift;
}
function setView(view) {
  camera.zoom = 1; let target = new THREE.Vector3(0, .5, 0);
  if(view==='full'||view==='side'||view==='back'){camera.zoom=1.0;target.y=-5.5;}
  if(view==='full'){target.set(0,-5.5,0);camera.position.set(20,3,22);camera.zoom=1.05;} else if(view==='wide'){target.set(0,-.8,0);camera.position.set(20,7,28);camera.zoom=1;} else if(view==='support'){target=byName['wrist.L'].getWorldPosition(new THREE.Vector3());camera.position.copy(target).add(new THREE.Vector3(4,-4,7));camera.zoom=5.5;} else if (view === 'hand') { target = byName['wrist.R'].getWorldPosition(new THREE.Vector3()); camera.position.copy(target).add(new THREE.Vector3(-5, 2, -5)); camera.zoom = 5.5; }
  else if(view==='feet'){target.set(0,-7,-8.5);camera.position.set(-16,-5,-10);camera.zoom=3.5;} else if(view==='seat'){target.set(0,-7,0);camera.position.set(-18,-6,1);camera.zoom=3;} else if (view === 'shoulder') { target.set(0,-5.8,1);camera.position.set(10,4,-4);camera.zoom=3; }
  else if (view === 'back') camera.position.set(-12, 4, -32);
  else if (view === 'side') camera.position.set(-32,-3,0);
  else camera.position.set(20,7,28);
  camera.lookAt(target); camera.updateProjectionMatrix();
}
window.renderSkinned = (frame = 0, view = 'full', dark = false) => {
  pose(frame); setView(view); scene.background = new THREE.Color(dark ? '#09090b' : '#fafafa');
  groundMaterial.color.set(dark ? '#000000' : '#263b40'); renderer.render(scene, camera);
  return canvas.toDataURL('image/png').split(',')[1];
};
window.inspectSkinned = () => ({ bones: bones.length, vertices: geometry.attributes.position.count, triangles: model.indices.length / 3, clothesTriangles: clothPositions.length / 9 });
window.inspectPose=frame=>{pose(frame);const r={};for(const n of ['root','head','spine01','spine05','upperleg01.L','lowerleg01.L','foot.L','upperarm01.L','lowerarm01.L','wrist.L','upperarm01.R','lowerarm01.R','wrist.R'])r[n]=byName[n].getWorldPosition(new THREE.Vector3()).toArray();r.floorRegions={};for(let i=0;i<geometry.attributes.position.count;i++){let k=0;for(let j=1;j<4;j++)if(model.skinWeights[i*4+j]>model.skinWeights[i*4+k])k=j;const name=model.bones[model.skinIndices[i*4+k]].name,key=name.replace(/\.[LR]$/,'').replace(/0[12]$/,'');const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);mesh.applyBoneTransform(i,p);r.floorRegions[key]=Math.min(r.floorRegions[key]??Infinity,p.y+7.751375);}r.clothFloor=Infinity;r.pelvisClothFloor=Infinity;for(let i=0;i<clothGeometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i);const restY=p.y;shorts.applyBoneTransform(i,p);if(restY>-.4&&restY<1.3)r.pelvisClothFloor=Math.min(r.pelvisClothFloor,p.y+7.751375);r.clothFloor=Math.min(r.clothFloor,p.y+7.751375);}return r;};
const sphinxInspect=window.inspectPose;window.inspectPose=frame=>{const r=sphinxInspect(frame),skin=i=>{const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);mesh.applyBoneTransform(i,p);return p;};r.surfaceFloor={L:{hand:Infinity,forearm:Infinity,toes:Infinity},R:{hand:Infinity,forearm:Infinity,toes:Infinity}};r.handContacts={L:{palm:Infinity,tips:Array(5).fill(Infinity)},R:{palm:Infinity,tips:Array(5).fill(Infinity)}};r.allSkinFloor=Infinity;const limbs=[],body=[],handX={L:Infinity,R:Infinity};for(let i=0;i<geometry.attributes.position.count;i++){let k=0;for(let j=1;j<4;j++)if(model.skinWeights[i*4+j]>model.skinWeights[i*4+k])k=j;const name=model.bones[model.skinIndices[i*4+k]].name,p=skin(i),side=name.endsWith('.L')?'L':'R';r.allSkinFloor=Math.min(r.allSkinFloor,p.y+7.751375);if(name.startsWith('metacarpal'))r.handContacts[side].palm=Math.min(r.handContacts[side].palm,p.y+7.751375);const tip=/^finger([1-5])-3/.exec(name);if(tip)r.handContacts[side].tips[Number(tip[1])-1]=Math.min(r.handContacts[side].tips[Number(tip[1])-1],p.y+7.751375);if(/^(finger|wrist|metacarpal)/.test(name)){r.surfaceFloor[side].hand=Math.min(r.surfaceFloor[side].hand,p.y+7.751375);handX[side]=Math.min(handX[side],p.x*(side==='L'?1:-1));}if(/^lowerarm/.test(name))r.surfaceFloor[side].forearm=Math.min(r.surfaceFloor[side].forearm,p.y+7.751375);if(/^toe/.test(name))r.surfaceFloor[side].toes=Math.min(r.surfaceFloor[side].toes,p.y+7.751375);let distalArm=false;if(/^upperarm/.test(name)){const a=vec(dataByName['upperarm01.'+side].head),d=vec(dataByName['lowerarm01.'+side].head).sub(a),rp=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);distalArm=rp.sub(a).dot(d)/d.lengthSq()>.6;}if(/^(finger|wrist|metacarpal|lowerarm)/.test(name)||distalArm)limbs.push(p);else if(!/arm|shoulder|clavicle/.test(name)&&!(/^(lowerleg|foot|toe)/.test(name)&&side==='R'))body.push(p);}r.handSeparation=handX.L+handX.R;r.forearmBodyGap=Infinity;const axes=Array.from({length:36},(_,i)=>[Math.cos(i*Math.PI/18),Math.sin(i*Math.PI/18)]),bins=new Map();for(const p of body){const k=Math.floor(p.y/.12),v=bins.get(k)||Array(36).fill(-Infinity);for(let n=0;n<36;n++)v[n]=Math.max(v[n],p.x*axes[n][0]+p.z*axes[n][1]);bins.set(k,v);}for(const p of limbs){const k=Math.floor(p.y/.12);let best=-Infinity;for(let n=0;n<36;n++){let m=-Infinity;for(let d=-1;d<=1;d++)m=Math.max(m,bins.get(k+d)?.[n]??-Infinity);if(Number.isFinite(m))best=Math.max(best,p.x*axes[n][0]+p.z*axes[n][1]-m);}if(Number.isFinite(best))r.forearmBodyGap=Math.min(r.forearmBodyGap,best);}r.palmNormalLeft=new THREE.Vector3().crossVectors(skin(33711).sub(skin(10508)),skin(49949).sub(skin(10508))).normalize().toArray();r.elbowShoulderForward=r['lowerarm01.L'][2]-r['upperarm01.L'][2];r.forearmVector=vec(r['wrist.L']).sub(vec(r['lowerarm01.L'])).toArray();r.elbowAngle=THREE.MathUtils.radToDeg(vec(r['upperarm01.L']).sub(vec(r['lowerarm01.L'])).angleTo(vec(r['wrist.L']).sub(vec(r['lowerarm01.L']))));r.wristBend=THREE.MathUtils.radToDeg(vec(r.forearmVector).angleTo(new THREE.Vector3(0,0,1)));r.workingKneeFloor=Infinity;r.workingThighFloor=Infinity;r.headSupportFloor=Infinity;r.headSupportPoint=null;for(let i=0;i<geometry.attributes.position.count;i++){const rx=model.vertices[i*3],ry=model.vertices[i*3+1],p=skin(i);if(rx<0&&ry>-3.55&&ry<-2.65)r.workingKneeFloor=Math.min(r.workingKneeFloor,p.y+7.751375);if(rx<0&&ry>-2&&ry<.5)r.workingThighFloor=Math.min(r.workingThighFloor,p.y+7.751375);if(ry>6.8&&p.y+7.751375<r.headSupportFloor){r.headSupportFloor=p.y+7.751375;r.headSupportPoint=p.toArray();}}r.gripTargetError=window.gripTargetError;r.footDorsumGap={L:Infinity,R:Infinity};for(let i=0;i<geometry.attributes.position.count;i++){let k=0;for(let j=1;j<4;j++)if(model.skinWeights[i*4+j]>model.skinWeights[i*4+k])k=j;const n=model.bones[model.skinIndices[i*4+k]].name;if(!n.startsWith('foot'))continue;const side=n.endsWith('.L')?'L':'R';r.footDorsumGap[side]=Math.min(r.footDorsumGap[side],skin(i).y+7.751375);}r.rootQuaternion=byName.root.getWorldQuaternion(new THREE.Quaternion()).toArray();r.chestQuaternion=byName.spine01.getWorldQuaternion(new THREE.Quaternion()).toArray();return r;};
const waistTriangles=[],waistVertexSet=new Set();for(let k=0;k<model.indices.length;k+=3){const ids=model.indices.slice(k,k+3);if(ids.some(i=>Math.abs(model.vertices[i*3])>3.2)||ids.every(i=>model.vertices[i*3+1]>2.9)||ids.every(i=>model.vertices[i*3+1]<1.1))continue;waistTriangles.push(ids);ids.forEach(i=>waistVertexSet.add(i));}
const garmentWaist=[];for(let i=0;i<clothGeometry.attributes.position.count;i++)if(clothGeometry.attributes.position.getY(i)>=1.74)garmentWaist.push(i);
const previousInspect=window.inspectPose;window.inspectPose=frame=>{const r=previousInspect(frame),rp=byName.root.getWorldPosition(new THREE.Vector3()),iq=byName.root.getWorldQuaternion(new THREE.Quaternion()).invert(),restRoot=vec(dataByName.root.head),unhinge=p=>p.sub(rp).applyQuaternion(iq).add(restRoot),skinPoints=new Map(),bins=new Map();for(const i of waistVertexSet){const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);p.z+=(breathPosition[i*3+2]-p.z)*mesh.morphTargetInfluences[0];mesh.applyBoneTransform(i,p);skinPoints.set(i,unhinge(p));}for(const ids of waistTriangles){const t=ids.map(i=>skinPoints.get(i));for(let y=Math.floor(Math.min(...t.map(p=>p.y))/.05);y<=Math.floor(Math.max(...t.map(p=>p.y))/.05);y++){if(!bins.has(y))bins.set(y,[]);bins.get(y).push(t);}}
r.waistExactRadialGap=Infinity;let hits=0,misses=0;const seen=new Set();for(const i of garmentWaist){const p=new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i);shorts.applyBoneTransform(i,p);unhinge(p);const key=p.toArray().map(x=>x.toFixed(6)).join(',');if(seen.has(key))continue;seen.add(key);const radius=Math.hypot(p.x,p.z),dx=p.x/radius,dz=p.z/radius;let skinRadius=-Infinity;for(const [a,b,c]of bins.get(Math.floor(p.y/.05))||[]){const e1x=b.x-a.x,e1y=b.y-a.y,e1z=b.z-a.z,e2x=c.x-a.x,e2y=c.y-a.y,e2z=c.z-a.z,hx=-dz*e2y,hy=dz*e2x-dx*e2z,hz=dx*e2y,det=e1x*hx+e1y*hy+e1z*hz;if(Math.abs(det)<1e-10)continue;const inv=1/det,sx=-a.x,sy=p.y-a.y,sz=-a.z,u=inv*(sx*hx+sy*hy+sz*hz);if(u<0||u>1)continue;const qx=sy*e1z-sz*e1y,qy=sz*e1x-sx*e1z,qz=sx*e1y-sy*e1x,v=inv*(dx*qx+dz*qz);if(v<0||u+v>1)continue;const t=inv*(e2x*qx+e2y*qy+e2z*qz);if(t>0)skinRadius=Math.max(skinRadius,t);}if(Number.isFinite(skinRadius)){hits++;if(radius-skinRadius<r.waistExactRadialGap){r.waistExactRadialGap=radius-skinRadius;r.waistExactPoint=p.toArray();}}else misses++;}r.waistExactSamples={hits,misses};return r;};const dominant=model.vertices.filter((_,i)=>i%3===0).map((_,i)=>{let n='',w=-1;for(let j=0;j<4;j++)if(model.skinWeights[i*4+j]>w){w=model.skinWeights[i*4+j];n=model.bones[model.skinIndices[i*4+j]].name;}return n;});
function rayGrid(points,tris,axis){const a=(axis+1)%3,b=(axis+2)%3,map=new Map(),size=.22;for(const t of tris){const ps=t.map(i=>points[i]);for(let u=Math.floor(Math.min(...ps.map(p=>p[a]))/size);u<=Math.floor(Math.max(...ps.map(p=>p[a]))/size);u++)for(let v=Math.floor(Math.min(...ps.map(p=>p[b]))/size);v<=Math.floor(Math.max(...ps.map(p=>p[b]))/size);v++){const k=u+':'+v;if(!map.has(k))map.set(k,[]);map.get(k).push(ps);}}return p=>{const hits=[];for(const [x,y,z] of map.get(Math.floor(p[a]/size)+':'+Math.floor(p[b]/size))||[]){const d=(y[a]-x[a])*(z[b]-x[b])-(z[a]-x[a])*(y[b]-x[b]);if(Math.abs(d)<1e-12)continue;const u=((p[a]-x[a])*(z[b]-x[b])-(z[a]-x[a])*(p[b]-x[b]))/d,v=((y[a]-x[a])*(p[b]-x[b])-(p[a]-x[a])*(y[b]-x[b]))/d;if(u>=0&&v>=0&&u+v<=1)hits.push(x[axis]+u*(y[axis]-x[axis])+v*(z[axis]-x[axis]));}return hits;};}

const handIds=[],footIds=[],handTris=[],footTris=[],bodyTris=[];for(let i=0;i<dominant.length;i++){if(/^(finger|wrist|metacarpal)/.test(dominant[i])&&dominant[i].endsWith('.R'))handIds.push(i);if(model.vertices[i*3]<0&&model.vertices[i*3+1]<-6.8)footIds.push(i);}const hs=new Set(handIds),fs0=new Set(footIds);for(let i=0;i<model.indices.length;i+=3){const t=model.indices.slice(i,i+3);if(t.every(j=>hs.has(j)))handTris.push(t);if(t.every(j=>fs0.has(j)))footTris.push(t);if(t.every(j=>!/(arm|finger|wrist|metacarpal)/.test(dominant[j])&&model.vertices[j*3+1]>-1.3))bodyTris.push(t);}
window.inspectContacts=frame=>{pose(frame);const ps=[],cs=[];for(let i=0;i<geometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i);mesh.applyBoneTransform(i,p);ps.push(p.toArray());}for(let i=0;i<clothGeometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i);shorts.applyBoneTransform(i,p);cs.push(p.toArray());}const ct=[];for(let i=0;i<cs.length;i+=3)ct.push([i,i+1,i+2]);const hr=rayGrid(ps,handTris,0),fr=rayGrid(ps,footTris,0),br=rayGrid(ps,bodyTris,1),cr=rayGrid(cs,ct,1);let handInsideFoot=0,footInsideHand=0,handFootGap=Infinity,handBodyGap=Infinity,footBodyGap=Infinity,handClothGap=Infinity,footClothGap=Infinity;const inside=(p,hits)=>{const u=[...new Set(hits.map(x=>x.toFixed(7)))].map(Number).sort((a,b)=>a-b);for(let k=0;k+1<u.length;k+=2)if(p[0]>u[k]+1e-5&&p[0]<u[k+1]-1e-5)return true;return false;};for(const i of handIds){const p=ps[i],hits=fr(p);if(inside(p,hits))handInsideFoot++;if(hits.length)handFootGap=Math.min(handFootGap,...hits.map(x=>Math.abs(x-p[0])));const b=br(p),c=cr(p);if(b.length)handBodyGap=Math.min(handBodyGap,p[1]-Math.max(...b));if(c.length)handClothGap=Math.min(handClothGap,p[1]-Math.max(...c));}for(const i of footIds){const p=ps[i];if(inside(p,hr(p)))footInsideHand++;const b=br(p),c=cr(p);if(b.length)footBodyGap=Math.min(footBodyGap,p[1]-Math.max(...b));if(c.length)footClothGap=Math.min(footClothGap,p[1]-Math.max(...c));}return {handInsideFoot,footInsideHand,handFootGap,handBodyGap,footBodyGap,handClothGap,footClothGap};};window.renderSkinned(0);window.ready=true;