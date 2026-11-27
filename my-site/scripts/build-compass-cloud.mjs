// Build a deterministic point cloud for the brass compass hero.
// Binary layout (20 bytes / point):
//   float32 x,y,z | int8 nx,ny,nz | uint8 tone | uint8 material | uint8 pad[3]
// Materials: 0 dial, 1 brass, 2 needle north, 3 needle south, 5 ink.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'dist', 'home', 'assets');
mkdirSync(outDir, { recursive: true });

let state = 0x9e3779b9;
function rand() {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return (state >>> 0) / 4294967296;
}
function range(a, b) { return a + (b - a) * rand(); }

const P = { x: [], y: [], z: [], nx: [], ny: [], nz: [], t: [], m: [] };
function add(x, y, z, nx, ny, nz, tone, material) {
  P.x.push(x); P.y.push(y); P.z.push(z);
  P.nx.push(nx); P.ny.push(ny); P.nz.push(nz);
  P.t.push(tone); P.m.push(material);
}
function tone(a, b) { return range(a, b); }

function addDisc(radius, z, normalZ, count, t0, t1, material, inner = 0) {
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(inner * inner + rand() * (radius * radius - inner * inner));
    const a = rand() * Math.PI * 2;
    add(Math.cos(a) * r, Math.sin(a) * r, z, 0, 0, normalZ, tone(t0, t1), material);
  }
}
function addRing(radius, width, z, normalZ, count, t0, t1, material) {
  addDisc(radius + width / 2, z, normalZ, count, t0, t1, material, Math.max(0, radius - width / 2));
}
function addTorus(R, r, count, t0, t1, material) {
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const b = rand() * Math.PI * 2;
    const rr = r * range(.9, 1.1);
    const n = [Math.cos(b) * Math.cos(a), Math.cos(b) * Math.sin(a), Math.sin(b)];
    add((R + rr * Math.cos(b)) * Math.cos(a), (R + rr * Math.cos(b)) * Math.sin(a), rr * Math.sin(b), ...n, tone(t0, t1), material);
  }
}
function addCylinderSide(radius, z0, z1, count, t0, t1, material) {
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    add(Math.cos(a) * radius, Math.sin(a) * radius, range(z0, z1), Math.cos(a), Math.sin(a), 0, tone(t0, t1), material);
  }
}
function addCylinder(radius, z0, z1, count, t0, t1, material, top = true, bottom = true) {
  addCylinderSide(radius, z0, z1, Math.round(count * .58), t0, t1, material);
  if (top) addDisc(radius, z1, 1, Math.round(count * .23), t0, t1, material);
  if (bottom) addDisc(radius, z0, -1, Math.round(count * .19), t0, t1, material);
}

// Sample a rotated box. Local x is radial, y tangential, z normal.
function addBox(cx, cy, cz, lx, ly, lz, angle, count, t0, t1, material) {
  const faces = [
    { area: ly * lz, axis: 0, sign: 1, u: ly, v: lz },
    { area: ly * lz, axis: 0, sign: -1, u: ly, v: lz },
    { area: lx * lz, axis: 1, sign: 1, u: lx, v: lz },
    { area: lx * lz, axis: 1, sign: -1, u: lx, v: lz },
    { area: lx * ly, axis: 2, sign: 1, u: lx, v: ly },
    { area: lx * ly, axis: 2, sign: -1, u: lx, v: ly },
  ];
  const total = faces.reduce((sum, face) => sum + face.area, 0);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  for (let i = 0; i < count; i++) {
    let pick = rand() * total, face = faces[0];
    for (const f of faces) { pick -= f.area; if (pick <= 0) { face = f; break; } }
    const u = range(-.5, .5) * face.u;
    const v = range(-.5, .5) * face.v;
    let px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 0;
    if (face.axis === 0) { px = face.sign * lx / 2; py = u; pz = v; nx = face.sign; }
    else if (face.axis === 1) { px = u; py = face.sign * ly / 2; pz = v; ny = face.sign; }
    else { px = u; py = v; pz = face.sign * lz / 2; nz = face.sign; }
    add(cx + px * cos - py * sin, cy + px * sin + py * cos, cz + pz, nx * cos - ny * sin, nx * sin + ny * cos, nz, tone(t0, t1), material);
  }
}

function signedArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}
function ensureCCW(points) { return signedArea(points) < 0 ? [...points].reverse() : points; }

function addPolygonFace(points, z, normalZ, count, t0, t1, material) {
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const tris = [];
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = [cx, cy], b = points[i], c = points[(i + 1) % points.length];
    const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
    tris.push({ a, b, c, area });
    total += area;
  }
  for (let i = 0; i < count; i++) {
    let pick = rand() * total, tri = tris[0];
    for (const t of tris) { pick -= t.area; if (pick <= 0) { tri = t; break; } }
    let u = rand(), v = rand();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const x = tri.a[0] + u * (tri.b[0] - tri.a[0]) + v * (tri.c[0] - tri.a[0]);
    const y = tri.a[1] + u * (tri.b[1] - tri.a[1]) + v * (tri.c[1] - tri.a[1]);
    add(x, y, z, 0, 0, normalZ, tone(t0, t1), material);
  }
}
function addPolygonSides(points, zFront, zBack, count, t0, t1, material) {
  const edges = [];
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    const area = length * Math.abs(zFront - zBack);
    edges.push({ a, b, dx, dy, length, area });
    total += area;
  }
  for (let i = 0; i < count; i++) {
    let pick = rand() * total, edge = edges[0];
    for (const e of edges) { pick -= e.area; if (pick <= 0) { edge = e; break; } }
    const u = rand();
    const z = range(zBack, zFront);
    const nx = edge.dy / edge.length;
    const ny = -edge.dx / edge.length;
    add(edge.a[0] + edge.dx * u, edge.a[1] + edge.dy * u, z, nx, ny, 0, tone(t0, t1), material);
  }
}
function addOutline(points, z, width, count, t0, t1, material) {
  const edges = [];
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    edges.push({ a, dx, dy, length, area: length * width });
    total += length * width;
  }
  for (let i = 0; i < count; i++) {
    let pick = rand() * total, edge = edges[0];
    for (const e of edges) { pick -= e.area; if (pick <= 0) { edge = e; break; } }
    const u = rand();
    const d = rand() * width;
    const nx = -edge.dy / edge.length;
    const ny = edge.dx / edge.length;
    add(edge.a[0] + edge.dx * u + nx * d, edge.a[1] + edge.dy * u + ny * d, z, 0, 0, 1, tone(t0, t1), material);
  }
}
function addPolygon(points, zFront, zBack, opts) {
  const p = ensureCCW(points);
  addPolygonFace(p, zFront, 1, opts.frontCount, opts.frontTone[0], opts.frontTone[1], opts.frontMaterial);
  if (opts.backCount) addPolygonFace(p, zBack, -1, opts.backCount, opts.backTone[0], opts.backTone[1], opts.backMaterial);
  addPolygonSides(p, zFront, zBack, opts.sideCount, opts.sideTone[0], opts.sideTone[1], opts.sideMaterial);
  if (opts.outlineCount) addOutline(p, zFront, opts.outlineWidth, opts.outlineCount, opts.outlineTone[0], opts.outlineTone[1], opts.outlineMaterial);
}

/* -------------------------------------------------------------------------- */
/* Dial, bezel and rim                                                        */
/* -------------------------------------------------------------------------- */
addDisc(.93, .035, 1, 45000, .30, .58, 0);
addDisc(.93, -.040, -1, 16000, .34, .62, 1);
addCylinderSide(.93, -.04, .035, 8000, .55, .85, 1);
addTorus(1.005, .058, 42000, .72, 1, 1);
addRing(.965, .035, .040, 1, 7000, .62, .92, 1);
addRing(.925, .012, .042, 1, 3500, .7, .95, 1);

/* -------------------------------------------------------------------------- */
/* Ticks and degree rings                                                     */
/* -------------------------------------------------------------------------- */
for (let k = 0; k < 72; k++) {
  const a = k * Math.PI / 36;
  const cardinal = k % 18 === 0;
  const intercardinal = k % 9 === 0;
  const length = cardinal ? .17 : intercardinal ? .115 : .075;
  const width = cardinal ? .030 : intercardinal ? .020 : .011;
  const r = cardinal ? .835 : .845;
  const material = k === 0 ? 2 : 1;
  addBox(Math.cos(a) * r, Math.sin(a) * r, .047, length, width, .007, a, cardinal ? 1500 : intercardinal ? 700 : 220, cardinal ? .92 : .72, 1, material);
}
addRing(.305, .004, .045, 1, 3200, .55, .78, 1);
addRing(.515, .004, .045, 1, 3600, .55, .78, 1);
addRing(.705, .004, .045, 1, 4200, .55, .78, 1);

/* -------------------------------------------------------------------------- */
/* Compass rose                                                               */
/* -------------------------------------------------------------------------- */
const rose = [];
for (let k = 0; k < 8; k++) {
  const tipAngle = Math.PI / 2 + k * Math.PI / 4;
  const tipRadius = k % 2 === 0 ? .72 : .56;
  rose.push([Math.cos(tipAngle) * tipRadius, Math.sin(tipAngle) * tipRadius]);
  const innerAngle = tipAngle + Math.PI / 8;
  rose.push([Math.cos(innerAngle) * .185, Math.sin(innerAngle) * .185]);
}
addPolygon(rose, .055, .043, {
  frontCount: 25000, frontTone: [.32, .52], frontMaterial: 5,
  backCount: 3000, backTone: [.30, .48], backMaterial: 5,
  sideCount: 5000, sideTone: [.70, .95], sideMaterial: 1,
  outlineCount: 8000, outlineWidth: .012, outlineTone: [.78, 1], outlineMaterial: 1,
});
addRing(.195, .008, .057, 1, 4200, .72, .96, 1);

/* -------------------------------------------------------------------------- */
/* Needle and center cap                                                      */
/* -------------------------------------------------------------------------- */
const northNeedle = [[0, .025], [-.072, .175], [0, .68], [.072, .175]];
const southNeedle = [[0, -.025], [.062, -.165], [0, -.60], [-.062, -.165]];
addPolygon(northNeedle, .086, .052, {
  frontCount: 9000, frontTone: [.78, 1], frontMaterial: 2,
  backCount: 1200, backTone: [.35, .55], backMaterial: 5,
  sideCount: 2200, sideTone: [.7, .95], sideMaterial: 1,
  outlineCount: 1800, outlineWidth: .006, outlineTone: [.85, 1], outlineMaterial: 1,
});
addPolygon(southNeedle, .086, .052, {
  frontCount: 7000, frontTone: [.65, .92], frontMaterial: 3,
  backCount: 1000, backTone: [.32, .5], backMaterial: 5,
  sideCount: 1800, sideTone: [.65, .9], sideMaterial: 1,
  outlineCount: 1400, outlineWidth: .006, outlineTone: [.8, .98], outlineMaterial: 1,
});
addCylinder(.078, .085, .118, 5200, .78, 1, 1);
addDisc(.032, .119, 1, 900, .55, .8, 5);

/* -------------------------------------------------------------------------- */
/* Cardinal diamonds and pocket-compass lug                                   */
/* -------------------------------------------------------------------------- */
function diamond(cx, cy, r, count, material, t0, t1) {
  addPolygon([[cx, cy + r], [cx + r * .55, cy], [cx, cy - r], [cx - r * .55, cy]], .062, .05, {
    frontCount: count, frontTone: [t0, t1], frontMaterial: material,
    backCount: 0, sideCount: Math.round(count * .25), sideTone: [.7, .95], sideMaterial: 1,
  });
}
diamond(0, .815, .042, 900, 2, .85, 1);
diamond(.815, 0, .028, 450, 1, .75, 1);
diamond(0, -.815, .028, 450, 1, .75, 1);
diamond(-.815, 0, .028, 450, 1, .75, 1);

addBox(0, 1.075, 0, .10, .105, .075, 0, 3200, .72, .98, 1);
addTorus(.058, .017, 2400, .75, 1, 1);
// Move the loop above the lug.
for (let i = P.x.length - 2400; i < P.x.length; i++) P.y[i] += 1.16;

/* -------------------------------------------------------------------------- */
/* Shuffle and write                                                          */
/* -------------------------------------------------------------------------- */
const N = P.x.length;
const order = new Uint32Array(N);
for (let i = 0; i < N; i++) order[i] = i;
for (let i = N - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
}
const stride = 20;
const buffer = Buffer.alloc(N * stride);
for (let i = 0; i < N; i++) {
  const s = order[i], o = i * stride;
  buffer.writeFloatLE(P.x[s], o);
  buffer.writeFloatLE(P.y[s], o + 4);
  buffer.writeFloatLE(P.z[s], o + 8);
  buffer.writeInt8(Math.max(-127, Math.min(127, Math.round(P.nx[s] * 127))), o + 12);
  buffer.writeInt8(Math.max(-127, Math.min(127, Math.round(P.ny[s] * 127))), o + 13);
  buffer.writeInt8(Math.max(-127, Math.min(127, Math.round(P.nz[s] * 127))), o + 14);
  buffer.writeUInt8(Math.max(0, Math.min(255, Math.round(P.t[s] * 255))), o + 15);
  buffer.writeUInt8(P.m[s], o + 16);
}
writeFileSync(join(outDir, 'compass.points.bin'), buffer);
writeFileSync(join(outDir, 'compass.json'), JSON.stringify({
  version: 1,
  points: N,
  stride,
  format: 'compass-brass',
  generated: new Date().toISOString(),
}, null, 2) + '\n');
console.log(`compass: ${N.toLocaleString()} points, ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
