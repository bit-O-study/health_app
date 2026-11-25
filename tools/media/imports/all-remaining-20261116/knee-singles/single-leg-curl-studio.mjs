import * as THREE from './three.module.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { applyMotion, exercises } from './motion.mjs';

const exercise = new URLSearchParams(location.search).get('exercise');
if(!exercises.includes(exercise))throw new Error('Select a supported exercise');

const model = await (await fetch('./human.json')).json();
const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
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
floor.rotation.x = -Math.PI / 2; floor.position.y = -7.751375; floor.receiveShadow = true; scene.add(floor);const mat=new THREE.Mesh(new THREE.BoxGeometry(9,.08,18),new THREE.MeshStandardMaterial({color:0x8daeb5,roughness:1}));mat.position.set(0,-7.791375,1);mat.visible=false; floor.visible=false;
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
const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(7.5,4.8), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false})); contactShadow.rotation.x=-Math.PI/2; contactShadow.position.set(0,-7.745,2.5); contactShadow.visible=false;
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

const rubber=new THREE.MeshStandardMaterial({color:'#263b45',roughness:.8}),metal=new THREE.MeshStandardMaterial({color:'#91a2ac',metalness:.65,roughness:.35}),pad=new THREE.MeshStandardMaterial({color:'#204952',roughness:.9});
function box(size,p,material=metal){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...p);scene.add(m);return m;}
function rod(a,b,r=.13,material=metal){const d=vec(b).sub(vec(a)),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),24),material);m.position.copy(vec(a).add(vec(b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());scene.add(m);return m;}
const curl=exercise.includes('curl'),seat=box([4.4,.5,4.1],[0,-3.6,1],pad),back=box([4.4,6,.5],[0,0,-1.4],pad);
for(const s of [-1,1]){box([.4,4.5,.4],[s*1.8,-5.8,.1]);box([.65,.3,11],[s*3.3,-8,2]);rod([s*2.8,-1.7,-.2],[s*2.8,-1.7,1.2],.13,rubber);rod([s*2.8,-3.3,.5],[s*2.8,-1.7,.5]);}
const thighPad=curl?rod([-2.1,0,2.1],[2.1,0,2.1],.4,pad):null;
const roller=rod([-.7,0,0],[.7,0,0],.4,pad),rollerAxle=rod([0,0,0],[1,0,0],.1),lever=rod([0,0,0],[0,1,0],.18),stack=box([1.3,1.4,2],[5.6,-6.7,0],rubber);
box([.3,9,.3],[4.9,-3.5,0]);box([.3,9,.3],[6.3,-3.5,0]);box([2,.3,3],[5.6,-8,0]);const cam=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,.2,32),rubber);cam.rotation.z=Math.PI/2;scene.add(cam);let cable;
const restPositions=bones.map(b=>b.position.clone());let grips=[],theta=0,rollerGap=0,kneeCenter=new THREE.Vector3();
const smooth=t=>t*t*t*(t*(t*6-15)+10);
function pose(frame){const t=((frame%480)+480)%480/480,lift=t<.4375?smooth(t/.4375):t<.5625?1:1-smooth((t-.5625)/.4375);
 for(let i=0;i<bones.length;i++){bones[i].quaternion.identity();bones[i].position.copy(restPositions[i]);}({grips,theta}=applyMotion(exercise,lift,{byName,dataByName,mesh}));mesh.updateMatrixWorld(true);skeleton.update();
 const knee=byName['lowerleg01.L'].getWorldPosition(new THREE.Vector3()),ankle=byName['foot.L'].getWorldPosition(new THREE.Vector3()),axis=ankle.clone().sub(knee).normalize(),normal=new THREE.Vector3(0,Math.sin(theta),Math.cos(theta)).multiplyScalar(curl?-1:1),center=knee.clone().lerp(ankle,.82);center.x=knee.x;kneeCenter=knee.clone();kneeCenter.x=3.3;
 let surface=-Infinity;for(let i=0;i<model.vertices.length/3;i++){const w=model.skinIndices.slice(i*4,i*4+4).reduce((sum,k,j)=>sum+(/lowerleg/.test(model.bones[k].name)?model.skinWeights[i*4+j]:0),0);if(w<.5||model.vertices[i*3]<0)continue;const p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i));if(Math.abs(p.clone().sub(center).dot(axis))<.25)surface=Math.max(surface,p.dot(normal));}
 if(!Number.isFinite(surface))throw Error('Missing shin surface');roller.position.copy(center).addScaledVector(normal,surface-center.dot(normal)+.41);rollerGap=roller.position.dot(normal)-.4-surface;
 rollerAxle.position.copy(roller.position);rollerAxle.position.x=(roller.position.x-.8+3.3)/2;rollerAxle.scale.y=3.3-(roller.position.x-.8);const end=roller.position.clone();end.x=3.3;const d=end.clone().sub(kneeCenter);lever.position.copy(end).add(kneeCenter).multiplyScalar(.5);lever.scale.y=d.length();lever.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());cam.position.copy(kneeCenter);cam.rotation.x=theta;stack.position.y=-6.7+1.8*lift;
 if(cable){scene.remove(cable);cable.geometry.dispose();}cable=rod([3.3,kneeCenter.y,kneeCenter.z],[5.6,stack.position.y+.7,0],.035,rubber);
}
function supports(){let seatMin=Infinity,backMin=Infinity,thighMax=-Infinity,soleMin=Infinity;for(let i=0;i<model.vertices.length/3;i++){const p=mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i)),[x,y,z]=model.vertices.slice(i*3,i*3+3);if(Math.abs(x)<1.6&&y>-.8&&y<.7&&z<0)seatMin=Math.min(seatMin,p.y);if(Math.abs(x)<1.4&&y>2&&y<5.5&&z<0)backMin=Math.min(backMin,p.z);if(y<-7.5)soleMin=Math.min(soleMin,p.y);}for(let i=0;i<clothGeometry.attributes.position.count;i++){const p=shorts.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(clothGeometry.attributes.position,i));if(Math.abs(p.x)<2&&p.z>-.3&&p.z<2.8)seatMin=Math.min(seatMin,p.y);if(Math.abs(p.z-2.1)<.3)thighMax=Math.max(thighMax,p.y);}return {seatMin,backMin,thighMax,soleMin};}
pose(0);const initial=supports();seat.position.y=initial.seatMin-.25;back.position.z=initial.backMin-.25;if(thighPad)thighPad.position.y=initial.thighMax+.41;
rod([3.3,-7.85,kneeCenter.z],kneeCenter.toArray(),.2);if(thighPad){rod([-2.6,thighPad.position.y,2.1],[2.6,thighPad.position.y,2.1],.12);for(const s of [-1,1])rod([s*2.6,seat.position.y,2.1],[s*2.6,thighPad.position.y,2.1],.15);}
const restingFoot=byName['foot.R'].getWorldPosition(new THREE.Vector3());let restSole=Infinity;for(let i=0;i<model.vertices.length/3;i++)if(model.vertices[i*3]<0&&model.vertices[i*3+1]<-7.5)restSole=Math.min(restSole,mesh.applyBoneTransform(i,new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i)).y);box([1.6,.2,2.5],[restingFoot.x,restSole-.1,restingFoot.z+.5],rubber);rod([restingFoot.x,-7.85,restingFoot.z+.5],[restingFoot.x,restSole-.2,restingFoot.z+.5],.15);
window.renderSkinned=(frame=0,view='full',dark=false)=>{pose(frame);camera.zoom=.92;camera.position.set(view==='side'?32:24,7,view==='side'?0:30);camera.lookAt(1,-1,2);camera.updateProjectionMatrix();scene.background=dark==='alpha'?null:new THREE.Color(dark?'#09090b':'#fafafa');renderer.setClearAlpha(dark==='alpha'?0:1);renderer.render(scene,camera);return canvas.toDataURL('image/png').split(',')[1];};
window.inspectRunning=frame=>{pose(frame);const j={};for(const side of ['L','R'])for(const n of ['upperleg01','lowerleg01','foot','upperarm01','lowerarm01','wrist'])j[n+'.'+side]=byName[n+'.'+side].getWorldPosition(new THREE.Vector3()).toArray();for(const n of ['root','spine01','head'])j[n]=byName[n].getWorldPosition(new THREE.Vector3()).toArray();j.grips=grips.map(({side,socket})=>byName['wrist.'+side].localToWorld(socket.clone()).toArray());j.targets=grips.map(g=>g.grip.toArray());j.roller=roller.position.toArray();j.theta=theta;return j;};
window.inspectGeometry=frame=>{pose(frame);const s=supports();return {...s,seatGap:s.seatMin-seat.position.y-.25,backGap:s.backMin-back.position.z-.25,thighGap:thighPad?thighPad.position.y-.4-s.thighMax:0,rollerGap,kneeAxisGap:Math.abs(kneeCenter.y-byName['lowerleg01.L'].getWorldPosition(new THREE.Vector3()).y),stackY:stack.position.y};};
window.renderSkinned(0);window.ready=true;
