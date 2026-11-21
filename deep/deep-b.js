/* Option B, "Live toon sea": a real three.js scene behind the whole page. Toon-shaded island, rocks and cloud banks (one
   sun upper left; every solid face is either its lit paint or that paint x #9c8c86, one hard step), a sea with the white
   wave-line net, far islands in the haze. The camera sails forward and swings past the island as the page scrolls.
   The page's panels are rafts afloat on that sea (deep.css, .dp-raft): they bob, and their hard shadows fall on the water. */
import * as THREE from './vendor/three.module.min.js';

const DK = window.DK, d = document, b = d.body;
DK.mark('.topbar > .wrap, .hero-text, .hero-film, .card.lead, .more-g, .method li, .band, .facts', 'dp-slab dp-raft');
DK.mark('.hero-mail a, .btn, .badge, .film-script summary, .vid-sound, .method .pills span', 'dp-chip');
DK.castText('.leads-head h2, .section-head h2');
/* the headline and its words ride one raft together */
{
  const one = d.querySelector('.hero-one'), film = d.querySelector('.hero-film');
  if (one && film && !d.querySelector('.hero-text')) {
    const raft = DK.el('div', 'hero-text dp-slab dp-raft');
    [...one.children].filter(e => e !== film).forEach(e => raft.appendChild(e));
    one.insertBefore(raft, film);
  }
}
/* rafts bob out of step with each other */
DK.all('.dp-raft').forEach((e, i) => e.style.setProperty('--ph', (-(i * 1.37) % 4).toFixed(2) + 's'));

THREE.ColorManagement.enabled = false;
const SH = [156 / 255, 140 / 255, 134 / 255];
const col = h => new THREE.Vector3(...[0, 2, 4].map(i => parseInt(h.slice(1 + i, 3 + i), 16) / 255));
const SUN = new THREE.Vector3(-0.55, 0.72, 0.42).normalize();          // toward the sun: upper left, a little toward us

const cv = DK.el('canvas', 'dw-gl', '', b, true); cv.setAttribute('aria-hidden', 'true');
const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
R.outputColorSpace = THREE.LinearSRGBColorSpace;   // the shaders write display values as they are
R.setPixelRatio(Math.min(2, devicePixelRatio || 1));
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, 0.5, 4000);

/* a toon paint: lit, or lit x #9c8c86 (or a given shade) past one hard edge */
function toon(lit, shade, edge = 0.0) {
  return new THREE.ShaderMaterial({
    uniforms: { cL: { value: col(lit) }, cS: { value: shade ? col(shade) : col(lit).multiply(new THREE.Vector3(...SH)) }, uL: { value: SUN }, uE: { value: edge } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 cL, cS, uL; uniform float uE; varying vec3 vN; void main(){ gl_FragColor = vec4(dot(normalize(vN), uL) > uE ? cL : cS, 1.); }',
  });
}
const flat = c => new THREE.MeshBasicMaterial({ color: new THREE.Color(...col(c).toArray()) });
const rnd = DK.rng(11);
function rough(geo, amt, keepTop) {      // jitter the vertices, then split faces so each facet takes one flat normal
  const p = geo.attributes.position, key = new Map();
  for (let i = 0; i < p.count; i++) {
    const k = [p.getX(i), p.getY(i), p.getZ(i)].map(v => v.toFixed(3)).join();
    if (!key.has(k)) key.set(k, [(rnd() - .5) * amt, (rnd() - .5) * amt * .5, (rnd() - .5) * amt]);
    const j = key.get(k); p.setXYZ(i, p.getX(i) + j[0], p.getY(i) + (keepTop && p.getY(i) > 0 ? 0 : j[1]), p.getZ(i) + j[2]);
  }
  const g = geo.toNonIndexed(); g.computeVertexNormals(); return g;
}

/* ---- sky: flat #5078ff, the haze only in the last few degrees over the horizon ---- */
scene.add(new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }',
  fragmentShader: 'varying vec3 vP; void main(){ float e = degrees(asin(normalize(vP).y)); vec3 c = mix(vec3(.639,.824,1.), vec3(.314,.471,1.), smoothstep(0., 7., e)); gl_FragColor = vec4(c, 1.); }',
})));

/* ---- sea: base #0963e0, the white wave-line net and its darker ghost, the far sea in the sky's blue ---- */
const seaU = { uT: { value: 0 }, uCam: { value: new THREE.Vector3() } };
const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.ShaderMaterial({
  uniforms: seaU, extensions: { derivatives: true },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform float uT; uniform vec3 uCam; varying vec3 vW;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
vec2 net(vec2 q){
  q += (vec2(vn(q * .45 + uT * .05), vn(q * .45 + 7.3 - uT * .04)) - .5) * .9;
  vec2 i = floor(q), f = fract(q); float d1 = 9., d2 = 9., d3 = 9.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){
    vec2 g = vec2(float(x), float(y)), o = .5 + .36 * (vec2(h21(i + g), h21(i + g + 17.7)) * 2. - 1.); float d = length(g + o - f);
    if (d < d1){ d3 = d2; d2 = d1; d1 = d; } else if (d < d2){ d3 = d2; d2 = d; } else if (d < d3) d3 = d;
  }
  return vec2(d2 - d1 - log(1. + exp(-9. * (d3 - d2))) / 9., d3 - d1);
}
void main(){
  float dc = length(vW - uCam);
  vec3 c = vec3(.035, .388, .878);
  vec2 q = vW.xz / 7.;
  float fw = fwidth(q.x) + fwidth(q.y);
  vec2 a = net(q), g = net(q + vec2(.53, .41));
  float fade = exp(-dc / 260.);
  float w = .05 + .05 * vn(q * .7);
  float ln = (1. - smoothstep(w - fw * .6, w + fw * .6, a.x)) * smoothstep(.03, .08, a.y);
  c = mix(c, vec3(.031, .349, .788), (1. - smoothstep(.05, .3, g.x)) * fade * .7);
  c = mix(c, vec3(1.), ln * min(1., fade * 1.6) * smoothstep(0., .5, .5 - fw * 2.));
  c = mix(c, vec3(.267, .455, .98), smoothstep(380., 900., dc));
  c = mix(c, vec3(.314, .471, 1.), smoothstep(900., 1700., dc));
  gl_FragColor = vec4(c, 1.);
}`,
}));
sea.rotation.x = -Math.PI / 2; scene.add(sea);

/* ---- the island: rock facets, a grass cap with its lip, palms; foam ring at the water ---- */
function island(x, z, r, h, seed, palms) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const rock = new THREE.Mesh(rough(new THREE.CylinderGeometry(r * .82, r, h, 11, 3), r * .14, true), toon('#5d6178', '#3e404e', .05));
  rock.position.y = h / 2 - .4; g.add(rock);
  const cap = new THREE.Mesh(rough(new THREE.SphereGeometry(r * .9, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.6), r * .06), toon('#6a8a31', '#405a1a', .12));
  cap.scale.y = .45; cap.position.y = h - .6; g.add(cap);
  const foam = new THREE.Mesh(new THREE.RingGeometry(r * .98, r * 1.22, 40), flat('#ffffff')); foam.rotation.x = -Math.PI / 2; foam.position.y = .05; g.add(foam);
  for (let i = 0; i < palms; i++) {
    const p = new THREE.Group(), a = i * 2.1 + seed, pr = r * .35 * (i ? 1 : .2); p.position.set(Math.cos(a) * pr, h - .2, Math.sin(a) * pr);
    let y = 0, bx = 0; for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.32, .4, 1.5, 6), toon('#76714c')); bx += .12 * k; s.position.set(bx, y + .75, 0); s.rotation.z = -.08 * k; p.add(s); y += 1.4; }
    for (let k = 0; k < 7; k++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(.9, 5.2, 4), toon('#4a792b', '#125028')); const ang = k / 7 * Math.PI * 2;
      f.scale.set(1, 1, .22); f.position.set(bx + Math.cos(ang) * 2.2, y - .3, Math.sin(ang) * 2.2); f.rotation.set(Math.sin(ang) * 1.9, -ang, -Math.cos(ang) * 1.9 + 0); p.add(f);
    }
    g.add(p);
  }
  scene.add(g); return g;
}
island(26, -95, 16, 9, 1, 2);
island(-62, -230, 22, 14, 2, 3);
island(70, -420, 18, 8, 3, 1);
/* rocks in the water near the course, for the eye to measure the travel by */
[[-14, -20, 2.2], [12, 6, 1.6], [-22, -120, 3], [24, -170, 2.4], [-8, -300, 2.6]].forEach(([x, z, s]) => {
  const m = new THREE.Mesh(rough(new THREE.DodecahedronGeometry(s, 0), s * .3), toon('#5d6178', '#3e404e', .05)); m.position.set(x, s * .25, z); scene.add(m);
  const f = new THREE.Mesh(new THREE.RingGeometry(s * .9, s * 1.25, 20), flat('#ffffff')); f.rotation.x = -Math.PI / 2; f.position.set(x, .05, z); scene.add(f);
});
/* a buoy: a red ball with a white band, each lit / shade */
{ const by = new THREE.Group(); by.position.set(-12, 0, -10);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.9, 18, 12), toon('#ec5640')); ball.position.y = .45; by.add(ball);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.93, .93, .32, 18), toon('#ffffff')); band.position.y = .5; by.add(band);
  scene.add(by); window.__buoy = by; }
/* far islands: flat shapes in the haze colour on the horizon */
for (let i = 0; i < 9; i++) {
  const a = -1.9 + i * .42 + rnd() * .2, R0 = 1300 + rnd() * 300, m = new THREE.Mesh(new THREE.ConeGeometry(40 + rnd() * 70, 18 + rnd() * 40, 5), flat(i % 2 ? '#5c6892' : '#616c8c'));
  m.scale.z = .3; m.position.set(Math.sin(a) * R0, 4, -Math.cos(a) * R0); scene.add(m);
}
/* cloud banks: lumps of white with a grey-teal shade side, one hard step */
function cloud(x, y, z, s, n, seed) {
  const g = new THREE.Group(), r = DK.rng(seed); g.position.set(x, y, z);
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n, rr = s * (.35 + .45 * Math.sin(Math.PI * t) * (.6 + .4 * r()));
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rr, 3), toon('#eeeff0', '#a9c1cf', .18));
    m.position.set((t - .5) * s * 3.2, rr * .3 * r(), (r() - .5) * s * .6); m.scale.y = .8; g.add(m);
  }
  scene.add(g); return g;
}
const clouds = [cloud(-260, 70, -700, 40, 7, 5), cloud(150, 95, -900, 55, 8, 6), cloud(520, 60, -820, 38, 6, 7), cloud(-650, 85, -950, 50, 7, 8), cloud(40, 40, -520, 22, 5, 9)];

/* ---- the camera rides the scroll: forward along the course, swinging round the first island ---- */
let want = 0, t0 = performance.now();
function frame(now) {
  const H = Math.max(1, d.documentElement.scrollHeight - innerHeight), p = Math.min(1, scrollY / H);
  want = p;
  const z = 40 - p * 300, x = Math.sin(p * Math.PI * 1.1) * 14 - 2, y = 7.5 - p * 2.5;
  cam.position.set(x, y, z);
  cam.lookAt(x * .4 + 4, 3.2 + p * 1.5, z - 100);
  seaU.uT.value = DK.still ? 0 : (now - t0) / 1000; seaU.uCam.value.copy(cam.position);
  if (window.__buoy) window.__buoy.position.y = DK.still ? 0 : Math.sin((now - t0) / 700) * .12;
  clouds.forEach((c, i) => { c.position.x += DK.still ? 0 : .02 * (i % 2 ? 1 : -1); });
  R.render(scene, cam);
}
function size() { R.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize', size); size();
let raf = 0; const loop = now => { frame(now); raf = DK.still || d.hidden ? 0 : requestAnimationFrame(loop); };
raf = requestAnimationFrame(loop);
addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
d.addEventListener('visibilitychange', () => { if (!d.hidden && !raf) raf = requestAnimationFrame(loop); });
