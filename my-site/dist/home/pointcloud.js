import { phone } from '../assets/device-mode.js';
import { palette, refreshPalette } from '../vi/palette.js';
import { text, onLanguageChange } from '../assets/language.js';
import * as THREE from './vendor/three.module.js';

const canvas = document.querySelector('#cloud');
const status = document.querySelector('#status');
const stage = document.querySelector('#stage');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const ROTATION_SPEED = .12;
const INFLUENCE_SCALE = .6;
const DISPLACEMENT_SCALE = .5;
const RESTORE_RATE = 4.5;
const MOTION_IDLE_MS = 80;
let lastPointerMove = -Infinity, previousClient = null, pointerInside = false;
const pointer = { x: 0, y: 0, active: false };
const stats = { ready: false, loadingProgress: 0, introProgress: 1, frames: 0, fps: 0, displacedPoints: 0, maxOffset: 0, errors: [] };
let introAnimation = null;
let scatterSettled = true;
let renderer, scene, camera, cloud, offsetAttribute, positions, offsets, seeds, movingPoints;
let movingCount = 0, recoveryNeedsScan = false;
let width = 1, height = 1, count = 0, yaw = -.38, yawPhase = 0, pitch = .035, lastTime = 0, sampleTime = 0, sampleFrames = 0;
let radius = 115 * INFLUENCE_SCALE, contextLost = false, animationFrame = 0;
const modelView = new THREE.Matrix4();
let homeVisible = true, presentationVisible = true;
const frameListeners = new Set();
const homeSection = document.querySelector('.homepage');
function syncCanvasLoop() {
  const active = (introAnimation || (homeVisible && presentationVisible)) && !document.hidden && !contextLost;
  if (!active) { cancelAnimationFrame(animationFrame); animationFrame = 0; leave(); }
  else if (stats.ready && !animationFrame) { lastTime = performance.now(); animationFrame = requestAnimationFrame(animate); }
}
new IntersectionObserver(([entry]) => { homeVisible = entry.isIntersecting && entry.intersectionRatio > .01; syncCanvasLoop(); }, {threshold:.01}).observe(homeSection);

// The journey can show this canvas through its zoom even when home is inert.
// Interaction availability and presentation visibility have separate lifetimes.
export function setPointcloudVisible(visible) {
  if (presentationVisible === visible) return;
  presentationVisible = visible;
  syncCanvasLoop();
}

export function onPointcloudFrame(listener) {
  frameListeners.add(listener);
  return () => frameListeners.delete(listener);
}

// Local, read-only diagnostics expose the actual offset buffer used by the shader.
window.__pointcloud = { getState: () => ({ ...stats, errors: [...stats.errors],
  homeVisible, presentationVisible, animationFrame, contextLost, scatterSettled, yaw, pitch, camera: camera?.position.toArray(), pointer: { ...pointer },
  points: count, totalPoints: positions?.length / 3, rotationSpeed: ROTATION_SPEED,
  reducedMotion: reducedMotion.matches, radiusPx: radius, influenceScale: INFLUENCE_SCALE, motionIdleMs: MOTION_IDLE_MS,
  restoreDelayMs: 0, restoreRate: RESTORE_RATE,
  millisecondsSinceMove: Number.isFinite(lastPointerMove) ? performance.now() - lastPointerMove : null,
}) };
window.addEventListener('error', event => stats.errors.push(event.message));
window.addEventListener('unhandledrejection', event => stats.errors.push(String(event.reason)));

// Only genuine pointer movement adds force. A stationary pointer lets the
// points return instead of continuously pushing them away.
function trackPointer(event) {
  if (event.pointerType === 'touch') return;
  if (document.documentElement.dataset.intro) { leave(); return; }
  if (document.querySelector('.homepage')?.inert) { leave(); return; }
  const rect = canvas.getBoundingClientRect();
  const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  if (!inside) { leave(); return; }
  if (previousClient && Math.hypot(event.clientX - previousClient.x, event.clientY - previousClient.y) < .25) return;
  previousClient = { x: event.clientX, y: event.clientY };
  lastPointerMove = performance.now();
  pointerInside = true;
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.active = true;
}
window.addEventListener('pointermove', trackPointer, { passive: true });
function leave() { pointer.active = false; pointerInside = false; previousClient = null; }
window.addEventListener('pointerout', event => { if (!event.relatedTarget) leave(); });
window.addEventListener('pointercancel', leave);
window.addEventListener('blur', leave);
document.addEventListener('visibilitychange', syncCanvasLoop);
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault(); contextLost = true; stats.ready = false;
  cancelAnimationFrame(animationFrame);
  status.textContent = text('The graphics context was interrupted. Please refresh the page.', 'انقطع سياق الرسوميات. يرجى تحديث الصفحة.'); status.hidden = false;
});
canvas.addEventListener('webglcontextrestored', () => queueMicrotask(() => {
  // Let Three's restoration listener finish, then resume the existing scene;
  // reloading here used to replay the complete entrance on a GPU interruption.
  contextLost = false;
  if (!renderer || !cloud) return;
  resize();
  renderer.render(scene, camera);
  stats.ready = true;
  status.hidden = true;
  lastTime = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(animate);
}));

const vertexShader = `
  attribute vec3 scanNormal;
  attribute vec3 scatterOffset;
  attribute float reflectance;
  attribute float material;
  attribute vec2 introOrigin;
  uniform float uDpr, uSize, uIntro;
  varying float vTone, vDepth, vScatter, vIntro, vMaterial;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * scanNormal);
    float front = max(dot(n, normalize(-mv.xyz)), 0.0);
    float side = max(dot(n, normalize(vec3(-.4,.6,1.))), 0.0);
    vTone = reflectance * (.34 + .54 * pow(front,.7) + .24 * side);
    vTone *= mix(.5,1.,smoothstep(-.1,.38,n.z));
    vMaterial = material;
    // Persistent per-particle displacement in view space, after the uninterrupted rotation.
    mv.xyz += scatterOffset;
    vIntro = 1. - smoothstep(.04,.68,uIntro);
    if (uIntro < 1.) {
      float seed = fract(sin(dot(position,vec3(12.9898,78.233,37.719))) * 43758.5453);
      float second = fract(seed * 17.71);
      float p = clamp((uIntro - seed*.10) / (1. - seed*.10),0.,1.);
      float travel = smoothstep(.16,1.,p);
      float depth = -mv.z;
      vec3 origin = vec3(introOrigin.x*depth/projectionMatrix[0][0],introOrigin.y*depth/projectionMatrix[1][1],mv.z);
      float envelope = sin(p * 3.14159265) * pow(1. - p,.65);
      float spread = depth / projectionMatrix[1][1] * (.08 + second*.48);
      vec3 drift = vec3(cos(seed*6.28318),sin(seed*6.28318)*.65+.35,second-.5) * spread;
      mv.xyz = mix(origin,mv.xyz,travel) + drift*envelope;
    }
    vScatter = min(1., length(scatterOffset) * 1.4);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = mix(uDpr * uSize * (5.8 / -mv.z),uDpr*1.65,vIntro);
  }
`;
const fragmentShader = `
  uniform vec3 uDial, uBrass, uNeedle, uSouth, uInk, uIntroColor;
  varying float vTone, vDepth, vScatter, vIntro, vMaterial;
  void main() {
    float d = length(gl_PointCoord - .5);
    if (d > .5) discard;
    float a = 1. - smoothstep(.27,.5,d);
    float fog = smoothstep(4.,9.,vDepth);
    float tone = clamp((vTone + vScatter*.07) * (1.-fog*.2),.06,.97);
    vec3 base;
    if (vMaterial < .5) base = uDial;
    else if (vMaterial < 1.5) base = uBrass;
    else if (vMaterial < 2.5) base = uNeedle;
    else if (vMaterial < 3.5) base = uSouth;
    else base = uInk;
    vec3 color = base * (.62 + tone * .92);
    // Brass catches the light; the dial stays matte.
    if (vMaterial >= .5 && vMaterial < 1.5) color += base * pow(tone, 2.2) * .22;
    color = mix(color, uInk, vScatter * .10);
    color = mix(color, uIntroColor, vIntro);
    gl_FragColor = vec4(color, a * mix(.88,1.,vIntro));
  }
`;

function resize() {
  width = stage.clientWidth; height = stage.clientHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio, phone.matches ? 1.5 : 2));
  renderer.setSize(width, height, false);
  const nextCount = Math.min(positions.length / 3, phone.matches ? 125000 : 225000);
  if (count !== nextCount) {
    count = nextCount; cloud.geometry.setDrawRange(0, count);
    offsets.fill(0); movingCount = 0; recoveryNeedsScan = false;
    offsetAttribute.clearUpdateRanges(); offsetAttribute.addUpdateRange(0, count * 3);
    offsetAttribute.needsUpdate = true; scatterSettled = true;
  }
  camera.aspect = width / height;
  // Full-viewport canvas, with the compass composed left of the typography.
  // The reference places a roughly square instrument at x=27%, y=52.5%.
  const mobile = phone.matches;
  const rtl = document.documentElement.dir === 'rtl';
  const modelHeight = mobile ? Math.min(height*.56,width*.97) : Math.min(height*.645,width*.475);
  const visibleHeight = height * 2.5 / modelHeight;
  camera.position.set(0, .16, visibleHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
  camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const pixelsPerUnit = height / visibleHeight;
  const centerX = width * (mobile ? .47 : (rtl ? .727 : .273));
  const centerY = height * (mobile ? .53 : .525);
  cloud.position.set((centerX-width*.5)/pixelsPerUnit,-(centerY-height*.5)/pixelsPerUnit,0);
  cloud.material.uniforms.uDpr.value = renderer.getPixelRatio();
  cloud.material.uniforms.uSize.value = phone.matches ? 1.1 : 1.28;
  radius = Math.min(135, Math.max(65, Math.min(width, height) * .15)) * INFLUENCE_SCALE;
}

function scatter(dt) {
  // Touch never adds pointer forces. At rest the zero offset buffer already
  // lives on the GPU, so avoid scanning/uploading 125k–225k points each frame.
  if (!pointer.active && scatterSettled) { stats.phase = 'idle'; return; }
  scatterSettled = false;
  modelView.multiplyMatrices(camera.matrixWorldInverse, cloud.matrixWorld);
  const m = modelView.elements;
  const scale = camera.projectionMatrix.elements[5] * height * .5;
  const radius2 = radius * radius;
  const approach = 1 - Math.exp(-dt * 10);
  const restore = 1 - Math.exp(-dt * RESTORE_RATE);
  let displaced = 0, maxSquared = 0;
  if (pointer.active) {
    // Keep the original full projection/force pass while input moves. Build
    // the recovery list once after it stops, not on this latency-sensitive path.
    recoveryNeedsScan = true;
    for (let i = 0, j = 0; i < count; i++, j += 3) {
      let tx = 0, ty = 0, tz = 0;
      const x = positions[j], y = positions[j+1], z = positions[j+2];
      const vx = m[0]*x+m[4]*y+m[8]*z+m[12];
      const vy = m[1]*x+m[5]*y+m[9]*z+m[13];
      const depth = -(m[2]*x+m[6]*y+m[10]*z+m[14]);
      const pixelsPerUnit = scale / depth;
      const dx = vx*pixelsPerUnit+width*.5-pointer.x;
      const dy = vy*pixelsPerUnit-height*.5+pointer.y;
      const d2 = dx*dx+dy*dy;
      if (d2 < radius2 && depth > 0) {
        const d = Math.sqrt(d2), f = 1-d/radius;
        const force = f*f*(3-2*f);
        const s = seeds[i];
        const amplitude = radius * (DISPLACEMENT_SCALE / INFLUENCE_SCALE) / pixelsPerUnit * force * (1.05+s*.5);
        const inv = 1/Math.max(d,1);
        // Radial push with stable grain avoids a perfectly rigid ring at the cursor.
        tx = (dx*inv+(s-.5)*.9)*amplitude;
        ty = (dy*inv+(seeds[(i+97)%count]-.5)*.9)*amplitude;
        tz = (s-.5)*amplitude*.8;
      }
      if (!(tx || ty || tz || offsets[j] || offsets[j+1] || offsets[j+2])) continue;
      const ease = tx || ty || tz ? approach : restore;
      offsets[j] += (tx-offsets[j])*ease;
      offsets[j+1] += (ty-offsets[j+1])*ease;
      offsets[j+2] += (tz-offsets[j+2])*ease;
      const squared = offsets[j]**2+offsets[j+1]**2+offsets[j+2]**2;
      if (squared > .0001) displaced++;
      maxSquared = Math.max(maxSquared,squared);
    }
  } else {
    if (recoveryNeedsScan) {
      movingCount = 0;
      for (let i = 0, j = 0; i < count; i++, j += 3) {
        if (offsets[j] || offsets[j+1] || offsets[j+2]) movingPoints[movingCount++] = i;
      }
      recoveryNeedsScan = false;
    }
    // Zero offsets stay exactly zero without input. Preserve the original
    // float32 integration, statistics and global settling threshold for every
    // point that moved; do not truncate individual small displacements early.
    for (let visit = 0; visit < movingCount; visit++) {
      const j = movingPoints[visit] * 3;
      offsets[j] += (0-offsets[j])*restore;
      offsets[j+1] += (0-offsets[j+1])*restore;
      offsets[j+2] += (0-offsets[j+2])*restore;
      const squared = offsets[j]**2+offsets[j+1]**2+offsets[j+2]**2;
      if (squared > .0001) displaced++;
      maxSquared = Math.max(maxSquared,squared);
    }
  }
  if (!pointer.active && maxSquared < .00000001) {
    offsets.fill(0); movingCount = 0; scatterSettled = true; displaced = 0; maxSquared = 0;
  }
  // Draw range does not limit Three's attribute upload. Send only visible
  // offsets; resize above also resets/uploads every newly visible point.
  offsetAttribute.addUpdateRange(0, count * 3);
  offsetAttribute.needsUpdate = true;
  stats.displacedPoints = displaced; stats.maxOffset = Math.sqrt(maxSquared);
  stats.phase = pointer.active ? 'moving' : !displaced ? 'idle' : 'returning';
}

function animate(now) {
  animationFrame = 0;
  if (contextLost || (!introAnimation && (!homeVisible || !presentationVisible)) || document.hidden) return;
  animationFrame = requestAnimationFrame(animate);
  const rawDt = (now-lastTime)/1000;
  const dt = Math.min(rawDt,.05); lastTime = now;
  pointer.active = pointerInside && now - lastPointerMove < MOTION_IDLE_MS;
  if (homeSection.inert) leave();
  if (document.documentElement.dataset.intro === 'loading' || document.documentElement.dataset.intro === 'error') return;
  if (introAnimation) {
    // Use elapsed time for the entrance, even when a browser throttles frames.
    // The capped physics step below still keeps pointer restoration stable.
    introAnimation.elapsed += Math.max(0, rawDt) * 1000;
    stats.introProgress = Math.min(1, introAnimation.elapsed / introAnimation.duration);
    cloud.material.uniforms.uIntro.value = stats.introProgress;
    if (stats.introProgress >= .68 && !introAnimation.textStarted) {
      introAnimation.textStarted = true; introAnimation.onText();
    }
    if (stats.introProgress === 1) { const done = introAnimation.resolve; introAnimation = null; done(); }
  }
  // A slow bearing swing keeps the dial readable instead of spinning the
  // instrument past an unhelpful edge-on frame.
  yawPhase += dt*ROTATION_SPEED*(reducedMotion.matches ? .2 : 1);
  yaw = -.38 + Math.sin(yawPhase) * .38;
  pitch = .035 + Math.sin(yawPhase * .7) * .018;
  cloud.rotation.set(pitch,yaw,0); cloud.updateMatrixWorld();
  scatter(dt); renderer.render(scene,camera);
  // Copy the valid WebGL frame before its drawing buffer is cleared. Consumers
  // share this animation clock instead of rendering another point-cloud frame.
  for (const listener of frameListeners) listener(canvas);
  stats.frames++; sampleFrames++; sampleTime += rawDt;
  if (sampleTime >= 1) { stats.fps = Math.round(sampleFrames/sampleTime); sampleFrames = 0; sampleTime = 0; }
  if (stats.frames%15 === 0) {
    Object.assign(canvas.dataset, { ready: String(stats.ready), rotation: yaw.toFixed(6),
      points: String(count), frames: String(stats.frames), fps: String(stats.fps),
      displacedPoints: String(stats.displacedPoints), maxOffset: stats.maxOffset.toFixed(6),
      hover: String(pointer.active), moving: String(pointer.active), pitch: String(cloud.rotation.x), camera: camera.position.toArray().join(',') });
  }
}

const colorValue = (key, fallback) => new THREE.Color(palette[key] || fallback);
function syncTheme() {
  refreshPalette();
  if (!renderer) return;
  renderer.setClearColor(palette['hero-bg'] || '#070707', 1);
  if (!cloud) return;
  const u = cloud.material.uniforms;
  u.uDial.value.set(palette['compass-dial'] || '#2a2720');
  u.uBrass.value.set(palette['compass-brass'] || '#c9a45c');
  u.uNeedle.value.set(palette['compass-needle'] || '#c0492f');
  u.uSouth.value.set(palette['compass-south'] || '#f4f1e8');
  u.uInk.value.set(palette['compass-ink'] || '#f4f1e8');
  u.uIntroColor.value.set(palette['hero-ink'] || '#f4f1e8');
  if (scene && camera) renderer.render(scene, camera);
}
addEventListener('themechange', syncTheme);
// Arabic mirrors the hero; recompose the instrument around the new text side.
onLanguageChange(() => { if (renderer && cloud) resize(); });

async function init() {
  try {
    renderer = new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
    renderer.setClearColor(palette['hero-bg'] || '#070707',1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(31,1,.1,40);
    const signal = AbortSignal.timeout(20000);
    const [mr,br] = await Promise.all([
      fetch(new URL('./assets/compass.json', import.meta.url), { signal }),
      fetch(new URL('./assets/compass.points.bin', import.meta.url), { signal }),
    ]);
    if (!mr.ok || !br.ok) throw new Error('Compass asset read failed');
    const meta = await mr.json();
    const stride = meta.stride || 20;
    stats.loadingProgress = .08;
    const expected = meta.points * stride;
    const chunks = []; let received = 0;
    if (br.body) {
      const reader = br.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); received += value.byteLength;
        stats.loadingProgress = .08 + .7 * Math.min(1,received / expected);
      }
    } else { const value = new Uint8Array(await br.arrayBuffer()); chunks.push(value); received = value.byteLength; }
    const bytes = new Uint8Array(received); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
    const binary = bytes.buffer;
    if (binary.byteLength !== meta.points*stride) throw new Error('Compass point cloud is incomplete');
    // Retain the full desktop budget for immediate phone/desktop changes, but
    // do not decode or upload the source tail that no display mode can draw.
    const availablePoints = Math.min(meta.points,225000);
    count = Math.min(availablePoints,phone.matches ? 125000 : 225000);
    const data = new DataView(binary);
    const normals = new Int8Array(availablePoints*3);
    const tones = new Uint8Array(availablePoints);
    const materials = new Uint8Array(availablePoints);
    positions = new Float32Array(availablePoints*3); offsets = new Float32Array(availablePoints*3); seeds = new Float32Array(availablePoints);
    movingPoints = new Uint32Array(availablePoints);
    for (let i=0;i<availablePoints;i++) {
      for (let k=0;k<3;k++) { positions[i*3+k]=data.getFloat32(i*stride+k*4,true); normals[i*3+k]=data.getInt8(i*stride+12+k); }
      tones[i]=data.getUint8(i*stride+15);
      materials[i]=data.getUint8(i*stride+16);
      if (i<seeds.length) seeds[i]=((Math.imul(i+1,2654435761)>>>0)%65536)/65536;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    geometry.setAttribute('scanNormal',new THREE.BufferAttribute(normals,3,true));
    geometry.setAttribute('reflectance',new THREE.BufferAttribute(tones,1,true));
    geometry.setAttribute('material',new THREE.BufferAttribute(materials,1,false));
    geometry.setAttribute('introOrigin',new THREE.BufferAttribute(new Float32Array(availablePoints*2),2));
    offsetAttribute = new THREE.BufferAttribute(offsets,3).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('scatterOffset',offsetAttribute); geometry.setDrawRange(0,count);
    const material = new THREE.ShaderMaterial({vertexShader,fragmentShader,
      uniforms:{
        uDpr:{value:1},uSize:{value:1.28},uIntro:{value:1},
        uDial:{value:colorValue('compass-dial','#2a2720')},
        uBrass:{value:colorValue('compass-brass','#c9a45c')},
        uNeedle:{value:colorValue('compass-needle','#c0492f')},
        uSouth:{value:colorValue('compass-south','#f4f1e8')},
        uInk:{value:colorValue('compass-ink','#f4f1e8')},
        uIntroColor:{value:colorValue('hero-ink','#f4f1e8')},
      },transparent:true,depthTest:true,depthWrite:true});
    cloud = new THREE.Points(geometry,material); cloud.frustumCulled=false; scene.add(cloud);
    let resizeFrame=0; new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(resize);}).observe(stage); resize();
    stats.loadingProgress=.9;
    cloud.rotation.set(pitch,yaw,0); cloud.updateMatrixWorld();
    renderer.compile(scene,camera); renderer.render(scene,camera);
    // Resolve only after decoding, shader compilation and an actual first draw.
    if (renderer.info.programs.some(program => program.diagnostics?.runnable === false)) throw new Error('Compass graphics initialization failed');
    stats.frames=1; stats.ready=true; stats.loadingProgress=1; status.hidden=true;
    lastTime=performance.now(); animationFrame=requestAnimationFrame(animate);
  } catch (error) {
    console.error(error); stats.errors.push(String(error)); status.hidden=false;
    status.textContent=text('The compass could not be loaded. Please refresh to try again.', 'تعذر تحميل البوصلة. يرجى التحديث للمحاولة مرة أخرى.');
    throw error;
  }
}
export const pointcloudReady = init();
// The controller imports this promise; attach a handler immediately as well.
pointcloudReady.catch(() => {});

// Copy a rendered frame while the WebGL drawing buffer is valid. The zoom keeps
// this viewport-sized image, so reversing never needs a new point-cloud load.
export function capturePointcloud(context, targetWidth, targetHeight) {
  if (!stats.ready || contextLost) return false;
  renderer.render(scene, camera);
  context.drawImage(canvas, 0, 0, targetWidth, targetHeight);
  return true;
}

export function revealFromNumber(number, onText) {
  if (reducedMotion.matches) { onText(); return Promise.resolve(); }
  const box = number.getBoundingClientRect();
  const style = getComputedStyle(number);
  const surface = document.createElement('canvas');
  surface.width = Math.ceil(box.width + 8); surface.height = Math.ceil(box.height + 8);
  const ctx = surface.getContext('2d', { willReadFrequently: true });
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.letterSpacing = style.letterSpacing;
  ctx.fillStyle = palette['hero-ink'] || '#f4f1e8';
  const metrics = ctx.measureText(number.textContent);
  const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize)*.9;
  const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize)*.2;
  ctx.fillText(number.textContent, 0, (box.height - ascent - descent)/2 + ascent);
  const pixels = ctx.getImageData(0,0,surface.width,surface.height).data;
  const samples = [];
  for (let y=0;y<surface.height;y++) for (let x=0;x<surface.width;x++) {
    if (pixels[(y*surface.width+x)*4+3] > 160) samples.push([x,y]);
  }
  if (!samples.length) { onText(); return Promise.resolve(); }
  const attribute = cloud.geometry.getAttribute('introOrigin');
  for (let i=0;i<count;i++) {
    const sample = samples[(Math.imul(i+1,2654435761)>>>0)%samples.length];
    attribute.array[i*2] = (box.left + sample[0]) / width * 2 - 1;
    attribute.array[i*2+1] = 1 - (box.top + sample[1]) / height * 2;
  }
  attribute.needsUpdate = true;
  cloud.material.uniforms.uIntro.value = 0; stats.introProgress=0;
  renderer.render(scene,camera);
  lastTime=performance.now();
  return new Promise(resolve => { introAnimation={elapsed:0,duration:1750,onText,resolve,textStarted:false}; syncCanvasLoop(); });
}
