import fs from 'node:fs';
import crypto from 'node:crypto';
const dir = 'tools/media/motion-refresh/skinned-3d/';
const vertices = [], groups = {};
let group = '';
for (const line of fs.readFileSync(dir + 'base.obj', 'utf8').split('\n')) {
  const p = line.trim().split(/\s+/);
  if (p[0] === 'v') vertices.push(p.slice(1, 4).map(Number));
  if (p[0] === 'g') { group = p[1]; groups[group] = []; }
  if (p[0] === 'f' && groups[group]) groups[group].push(p.slice(1).map(x => Number(x.split('/')[0]) - 1));
}
const targets = { 'male.target': 1, 'muscle.target': 1, 'pectoral.target': .7, 'dorsi.target': .45, 'vshape.target': .2, 'upperarm-l.target': .55, 'upperarm-r.target': .55, 'shoulder-l.target': .6, 'shoulder-r.target': .6 };
for (const [file, strength] of Object.entries(targets)) {
  for (const line of fs.readFileSync(dir + file, 'utf8').split('\n')) {
    const p = line.trim().split(/\s+/).map(Number);
    if (p.length === 4 && Number.isInteger(p[0])) for (let k = 0; k < 3; k++) vertices[p[0]][k] += strength * p[k + 1];
  }
}
const rig = JSON.parse(fs.readFileSync(dir + 'default.mhskel'));
const weights = JSON.parse(fs.readFileSync(dir + 'default_weights.mhw')).weights;
const names = Object.keys(rig.bones);
const joint = name => rig.joints[name].reduce((v, i) => v.map((x, k) => x + vertices[i][k] / rig.joints[name].length), [0, 0, 0]);
const bones = names.map(name => ({ name, parent: rig.bones[name].parent, head: joint(rig.bones[name].head), tail: joint(rig.bones[name].tail) }));
const perVertex = vertices.map(() => ({}));
for (const [name, entries] of Object.entries(weights)) for (const [v, w] of entries) if (perVertex[v]) perVertex[v][names.indexOf(name)] = w;
const used = [...new Set(groups.body.flat())], remap = new Map(used.map((v, i) => [v, i]));
let points = used.map(v => ({ p: vertices[v], w: perVertex[v] }));
let faces = groups.body.map(f => f.map(i => remap.get(i)));
const average = values => {
  const p = [0, 0, 0], w = {};
  for (const v of values) {
    for (let k = 0; k < 3; k++) p[k] += v.p[k] / values.length;
    for (const [bone, weight] of Object.entries(v.w)) w[bone] = (w[bone] || 0) + weight / values.length;
  }
  return { p, w };
};
// One Catmull-Clark pass on the connected quad surface. Skin weights follow
// the same fixed topology; there is no frame-dependent remeshing.
const facePoints = faces.map(f => average(f.map(i => points[i])));
const edges = new Map(), adjacency = points.map(() => ({ faces: [], edges: [] }));
faces.forEach((f, fi) => f.forEach((a, j) => {
  adjacency[a].faces.push(fi);
  const b = f[(j + 1) % f.length], key = [Math.min(a, b), Math.max(a, b)].join(':');
  if (!edges.has(key)) { edges.set(key, { a, b, faces: [] }); adjacency[a].edges.push(key); adjacency[b].edges.push(key); }
  edges.get(key).faces.push(fi);
}));
const next = points.map((point, i) => {
  const { faces: fs, edges: es } = adjacency[i];
  const boundary = es.map(k => edges.get(k)).filter(e => e.faces.length === 1);
  if (boundary.length) {
    const neighbours = boundary.map(e => points[e.a === i ? e.b : e.a]);
    return { p: point.p.map((x, k) => .75 * x + .25 * average(neighbours).p[k]), w: point.w };
  }
  const f = average(fs.map(i => facePoints[i]));
  const r = average(es.map(k => { const e = edges.get(k); return average([points[e.a], points[e.b]]); }));
  const n = es.length;
  return { p: point.p.map((x, k) => (f.p[k] + 2 * r.p[k] + (n - 3) * x) / n), w: point.w };
});
for (const e of edges.values()) { e.index = next.length; next.push(average([points[e.a], points[e.b], ...e.faces.map(i => facePoints[i])])); }
const faceStart = next.length; next.push(...facePoints);
faces = faces.flatMap((f, fi) => f.map((v, j) => {
  const prev = f[(j + f.length - 1) % f.length], after = f[(j + 1) % f.length];
  return [v, edges.get([Math.min(v, after), Math.max(v, after)].join(':')).index, faceStart + fi, edges.get([Math.min(v, prev), Math.max(v, prev)].join(':')).index];
}));
points = next;
const skinIndices = [], skinWeights = [];
for (const point of points) {
  const top = Object.entries(point.w).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = top.reduce((s, w) => s + w[1], 0);
  if (!sum) throw new Error('Unweighted body vertex');
  while (top.length < 4) top.push([0, 0]);
  skinIndices.push(...top.map(w => Number(w[0]))); skinWeights.push(...top.map(w => w[1] / sum));
}
const indices = faces.flatMap(f => [f[0], f[1], f[2], f[0], f[2], f[3]]);
const model = { vertices: points.flatMap(v => v.p), indices, skinIndices, skinWeights, bones };
if (!model.vertices.every(Number.isFinite)) throw new Error('Nonfinite subdivision output');
fs.writeFileSync(dir + 'human.json', JSON.stringify(model));
fs.writeFileSync(dir + 'provenance.json', JSON.stringify({ repository: 'https://github.com/makehumancommunity/makehuman', commit: 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482', license: 'CC0-1.0 graphical assets', targets, subdivision: 'Catmull-Clark one pass', files: ['base.obj', 'default.mhskel', 'default_weights.mhw', ...Object.keys(targets)].map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(dir + file)).digest('hex') })), derived: 'human.json', status: 'experimental-not-published' }, null, 2));
console.log({ vertices: points.length, triangles: indices.length / 3, bones: bones.length });
