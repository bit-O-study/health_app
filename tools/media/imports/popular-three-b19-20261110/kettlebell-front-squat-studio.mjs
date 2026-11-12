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

const rubber=new THREE.MeshStandardMaterial({color:'#263b45',roughness:.8}),metal=new THREE.MeshStandardMaterial({color:'#91a2ac',metalness:.65,roughness:.35});
function box(size,p,material=metal){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...p);scene.add(m);return m;}
function rod(a,b,r=.13,material=metal){const d=vec(b).sub(vec(a)),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),24),material);m.position.copy(vec(a).add(vec(b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());scene.add(m);return m;}
const lat=exercise==='wide-grip-lat-pulldown',chair=exercise==='captain-s-chair-leg-raise';let seat,back,thigh,stack,aligned=false;const moving=[],bells=[],pads=[];
if(lat){seat=box([4.4,.55,4.8],[0,-4,1],rubber);box([.6,3.2,.6],[0,-6.2,0]);box([7,.25,8],[0,-8,1]);thigh=rod([-2.6,0,2],[2.6,0,2],.4,rubber);for(const x of [-2.6,2.6])rod([x,-8,2],[x,-2,2],.16);for(const x of [-2.2,2.2])rod([x,-8,-4],[x,10,-4],.2);rod([-2.2,10,-4],[2.2,10,-4],.2);rod([0,10,-4],[0,10,2.7],.2);stack=box([3,1.2,1],[0,-6,-4],rubber);for(const x of [-1,1])rod([x,-8,-4],[x,9.8,-4],.06);}
if(chair){back=box([4,5,.6],[0,3,-1.5],rubber);for(const x of [-3.1,3.1]){rod([x,-9,-1],[x,4,-1],.23);box([1,.3,8],[x,-9,1],rubber);}rod([-3.1,3,-1],[3.1,3,-1],.2);}
if(!lat&&!chair)for(const sign of [1,-1]){const bell=new THREE.Group();scene.add(bell);const body=new THREE.Mesh(new THREE.SphereGeometry(.8,32,24),rubber);body.position.set(sign*1.05,-1.05,0);bell.add(body);const grip=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,1.4,24),metal);grip.rotation.x=Math.PI/2;bell.add(grip);for(const s of [-1,1]){const a=vec([0,0,s*.6]),b=vec([sign*.8,-.8,s*.6]),d=b.clone().sub(a),m=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,d.length(),24),rubber);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(vec([0,1,0]),d.normalize());bell.add(m);}bells.push(bell);}
function support(){let seatY=Infinity,backZ=Infinity,sole=Infinity,thighY=-Infinity,count=0;const armMin=[Infinity,Infinity];for(let i=0;i<model.vertices.length/3;i++){const original=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,i),p=mesh.applyBoneTransform(i,original.clone());let weight=0;for(let k=0;k<4;k++){const n=model.bones[model.skinIndices[i*4+k]].name,w=model.skinWeights[i*4+k];if(/^(pelvis|upperleg|root)/.test(n))weight+=w;for(const [a,side]of ['L','R'].entries())if(n==='lowerarm01.'+side&&w>.7)armMin[a]=Math.min(armMin[a],p.y);}if(weight>.5&&Math.abs(p.x)<1.8&&p.z>-.9&&p.z<2.6){seatY=Math.min(seatY,p.y);count++;}if(Math.abs(p.x)<1.5&&p.y>1&&p.y<4)backZ=Math.min(backZ,p.z);if(original.y<-7.5)sole=Math.min(sole,p.y);if(weight>.5&&p.z>1.8&&p.z<2.2)thighY=Math.max(thighY,p.y);}return {seatY,backZ,sole,thighY,count,armMin};}
const restPositions=bones.map(b=>b.position.clone());let grips=[],lastGeometry={};const smooth=t=>t*t*t*(t*(t*6-15)+10);
function pose(frame){const t=((frame%480)+480)%480/480,lift=t<.4375?smooth(t/.4375):t<.5625?1:1-smooth((t-.5625)/.4375);for(let i=0;i<bones.length;i++){bones[i].quaternion.identity();bones[i].position.copy(restPositions[i]);}grips=applyMotion(exercise,lift,{byName,dataByName,mesh});mesh.updateMatrixWorld(true);skeleton.update();
 if(!aligned){const s=support();if(seat)seat.position.y=s.seatY-.295;if(thigh)thigh.position.y=s.thighY+.42;if(chair){back.position.z=s.backZ-.32;for(const [i,g]of grips.entries()){const e=byName['lowerarm01.'+g.side].getWorldPosition(new THREE.Vector3()),w=byName['wrist.'+g.side].getWorldPosition(new THREE.Vector3());pads.push(box([1.25,.45,w.z-e.z+.3],[e.x,s.armMin[i]-.245,(e.z+w.z)/2],rubber));rod([e.x,s.armMin[i]-.55,-1],[e.x,s.armMin[i]-.55,g.grip.z],.18);rod([g.grip.x,g.grip.y-.65,g.grip.z],[g.grip.x,g.grip.y+.65,g.grip.z],.12,rubber);rod([g.grip.x,s.armMin[i]-.55,g.grip.z],[g.grip.x,g.grip.y-.65,g.grip.z],.12);}}aligned=true;}
 for(const m of moving){scene.remove(m);m.geometry.dispose();}moving.length=0;
 if(lat){const c=grips[0].grip.clone().add(grips[1].grip).multiplyScalar(.5),top=c.clone().add(vec([0,.35,0]));moving.push(rod([-4.9,c.y,c.z],[4.9,c.y,c.z]));moving.push(rod(c.toArray(),top.toArray(),.1));stack.position.y=-6+4.82*lift;moving.push(rod(top.toArray(),[0,9.6,2.7],.035,rubber),rod([0,9.6,2.7],[0,9.6,-4.7],.035,rubber),rod([0,9.6,-4.7],[0,stack.position.y+.6,-4.7],.035,rubber));lastGeometry.cableLength=9.6-top.y+9.6-stack.position.y-.6;}
 for(const [i,bell]of bells.entries()){bell.position.copy(grips[i].grip);bell.quaternion.copy(byName.root.getWorldQuaternion(new THREE.Quaternion()));}
}
window.renderSkinned=(frame=0,view='full',dark=false)=>{pose(frame);camera.zoom=lat?.76:chair?.80:.85;camera.position.set(view==='side'?32:18,4,view==='side'?0:30);camera.lookAt(0,0,chair?2:1);camera.updateProjectionMatrix();scene.background=dark==='alpha'?null:new THREE.Color(dark?'#09090b':'#fafafa');renderer.setClearAlpha(dark==='alpha'?0:1);renderer.render(scene,camera);return canvas.toDataURL('image/png').split(',')[1];};
window.inspectRunning=frame=>{pose(frame);const j={};for(const side of ['L','R'])for(const n of ['upperleg01','lowerleg01','foot','toe2-1','upperarm01','lowerarm01','wrist'])j[n+'.'+side]=byName[n+'.'+side].getWorldPosition(new THREE.Vector3()).toArray();for(const n of ['root','spine01','head'])j[n]=byName[n].getWorldPosition(new THREE.Vector3()).toArray();j.grips=grips.map(({side,socket})=>byName['wrist.'+side].localToWorld(socket.clone()).toArray());j.targets=grips.map(g=>g.grip.toArray());return j;};
window.inspectGeometry=frame=>{pose(frame);const s=support();return {gripError:Math.max(...grips.map(({side,socket,grip})=>byName['wrist.'+side].localToWorld(socket.clone()).distanceTo(grip))),floorClearance:s.sole-(chair?-9:lat?-8.25:-7.9),seatGap:seat?s.seatY-seat.position.y-.275:0,forearmGaps:pads.map((p,i)=>s.armMin[i]-p.position.y-.225),backGap:chair?s.backZ-back.position.z-.3:0,...lastGeometry};};
window.renderSkinned(0);window.ready=true;
