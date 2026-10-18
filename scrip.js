import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ════════════════════════════════════════════════
   NỘI DUNG THƯ — chỉ cần sửa chỗ này
   Mỗi phần tử = 1 trang. title / sign là tuỳ chọn.
   Mỗi trang khoảng 40–60 từ cho vừa khung.
   ════════════════════════════════════════════════ */
const CONFIG = {
  pages: [
    { title: 'Gửi em,', text: 'Đây là nơi anh sẽ viết những điều muốn nói với em. Nội dung thật sẽ được thay vào sau.' },
    { text: 'Mỗi trang là một đoạn. Em chạm vào thư, bấm mũi tên hoặc vuốt sang để đọc tiếp.' },
    { text: 'Anh có thể thêm hoặc bớt bao nhiêu trang tuỳ ý, chỉ cần sửa danh sách này.' },
    { text: 'Chúc em ngày 20/10 thật nhiều niềm vui.', sign: 'Anh' }
  ],
  /* mật mã mặt đáy (ngày + tháng kỷ niệm) */
  code: '1716'
};

/* ── helpers ─────────────────────────────────── */
const $ = s => document.querySelector(s);
const W = () => innerWidth, H = () => innerHeight;
const clamp = (a,b,v) => Math.min(b, Math.max(a, v));
const lerp = (a,b,t) => a + (b-a)*t;
const smooth = x => { x = clamp(0,1,x); return x*x*(3-2*x); };
const isTouch = matchMedia('(pointer:coarse)').matches;
const haptic = p => { try { navigator.vibrate && navigator.vibrate(p); } catch(e){} };
const PENT = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
const BOT = -Math.PI/2;   /* góc nghiêng để lật mặt đáy hướng về người xem */

/* ════════════════════════════════════════════════
   ÂM THANH — tổng hợp bằng WebAudio, không cần file
   ════════════════════════════════════════════════ */
const Snd = (() => {
  let ctx=null, master=null, noise=null, wet=null, muted=false;
  const init = () => {
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : .6; master.connect(ctx.destination);
      const dl = ctx.createDelay(1); dl.delayTime.value = .27;
      const fb = ctx.createGain(); fb.gain.value = .32; const wg = ctx.createGain(); wg.gain.value = .26;
      wet = ctx.createGain(); wet.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wg); wg.connect(master);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0); for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    }
    if(ctx.state === 'suspended') ctx.resume();
  };
  const out = (node, send=0) => {
    node.connect(master);
    if(send && wet){ const s = ctx.createGain(); s.gain.value = send; node.connect(s); s.connect(wet); }
  };
  return {
    init,
    get muted(){ return muted; },
    setMuted(m){ muted = m; if(master) master.gain.value = m ? 0 : .6; },
    click(f=2400, g=.2, q=5, dur=.045){
      if(!ctx) return; const t = ctx.currentTime;
      const s = ctx.createBufferSource(); s.buffer = noise;
      const b = ctx.createBiquadFilter(); b.type='bandpass'; b.frequency.value=f; b.Q.value=q;
      const v = ctx.createGain(); v.gain.setValueAtTime(g,t); v.gain.exponentialRampToValueAtTime(.0001,t+dur);
      s.connect(b); b.connect(v); out(v); s.start(t, Math.random()*.3); s.stop(t+dur+.02);
    },
    note(f, g=.17, dur=1.5, delay=0){
      if(!ctx) return; const t = ctx.currentTime + delay;
      const o = ctx.createOscillator(), o2 = ctx.createOscillator();
      o.type='sine'; o.frequency.value=f; o2.type='sine'; o2.frequency.value=f*2.76;
      const v = ctx.createGain(), v2 = ctx.createGain();
      v.gain.setValueAtTime(0,t); v.gain.linearRampToValueAtTime(g,t+.006); v.gain.exponentialRampToValueAtTime(.0001,t+dur);
      v2.gain.setValueAtTime(0,t); v2.gain.linearRampToValueAtTime(g*.2,t+.004); v2.gain.exponentialRampToValueAtTime(.0001,t+dur*.3);
      o.connect(v); o2.connect(v2); out(v,.7); out(v2,.3);
      o.start(t); o2.start(t); o.stop(t+dur+.05); o2.stop(t+dur*.3+.05);
    },
    thump(g=.6){
      if(!ctx) return; const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type='sine';
      o.frequency.setValueAtTime(130,t); o.frequency.exponentialRampToValueAtTime(42,t+.16);
      const v = ctx.createGain(); v.gain.setValueAtTime(0,t); v.gain.linearRampToValueAtTime(g,t+.012); v.gain.exponentialRampToValueAtTime(.0001,t+.26);
      o.connect(v); out(v); o.start(t); o.stop(t+.3);
    },
    whoosh(dur=1.1, g=.22){
      if(!ctx) return; const t = ctx.currentTime;
      const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
      const b = ctx.createBiquadFilter(); b.type='bandpass'; b.Q.value=.9;
      b.frequency.setValueAtTime(250,t); b.frequency.exponentialRampToValueAtTime(3200,t+dur*.7); b.frequency.exponentialRampToValueAtTime(600,t+dur);
      const v = ctx.createGain(); v.gain.setValueAtTime(0,t); v.gain.linearRampToValueAtTime(g,t+dur*.45); v.gain.linearRampToValueAtTime(0,t+dur);
      s.connect(b); b.connect(v); out(v,.4); s.start(t); s.stop(t+dur+.05);
    },
    /* còi báo sai: hai tiếng trầm */
    buzz(){
      if(!ctx) return; const t = ctx.currentTime;
      [0,.2].forEach((dl,i) => {
        const o = ctx.createOscillator(); o.type='sawtooth'; o.frequency.value = i ? 92 : 116;
        const f = ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value = 520;
        const v = ctx.createGain(); v.gain.setValueAtTime(0,t+dl); v.gain.linearRampToValueAtTime(.26,t+dl+.012);
        v.gain.setValueAtTime(.26,t+dl+.13); v.gain.exponentialRampToValueAtTime(.0001,t+dl+.18);
        o.connect(f); f.connect(v); out(v); o.start(t+dl); o.stop(t+dl+.2);
      });
    },
    /* động cơ servo nâng nắp */
    servo(dur=1.4, g=.1){
      if(!ctx) return; const t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type='sawtooth';
      o.frequency.setValueAtTime(90,t); o.frequency.exponentialRampToValueAtTime(420,t+dur*.8); o.frequency.exponentialRampToValueAtTime(300,t+dur);
      const f = ctx.createBiquadFilter(); f.type='bandpass'; f.Q.value=3;
      f.frequency.setValueAtTime(300,t); f.frequency.exponentialRampToValueAtTime(1600,t+dur);
      const v = ctx.createGain(); v.gain.setValueAtTime(0,t); v.gain.linearRampToValueAtTime(g,t+dur*.2); v.gain.linearRampToValueAtTime(g,t+dur*.8); v.gain.linearRampToValueAtTime(0,t+dur);
      o.connect(f); f.connect(v); out(v,.2); o.start(t); o.stop(t+dur+.05);
    },
    /* bánh cóc: nhiều tiếng tách liên tiếp */
    ratchet(n=10, dur=1, f=2400){
      for(let i=0;i<n;i++) gsap.delayedCall(dur*i/n, () => this.click(f + i*30, .2, 6, .03));
    }
  };
})();
const chord = (idx, base=0) => idx.forEach((k,i) => Snd.note(PENT[k]*(base?base:1), .13, 2.2, i*.09));

/* ════════════════════════════════════════════════
   THREE — renderer, scene
   ════════════════════════════════════════════════ */
const canvas = $('#gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' });
} catch(err) {
  document.body.insertAdjacentHTML('beforeend','<p style="position:fixed;inset:0;display:grid;place-items:center;padding:24px;text-align:center;color:#fff;font:16px system-ui">Trình duyệt này chưa hỗ trợ WebGL.</p>');
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b0d);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
scene.environmentIntensity = .8;

const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(3,5,4); scene.add(key);
const world = new THREE.Group(); scene.add(world);
const cube  = new THREE.Group(); world.add(cube); cube.visible = false;
const glow  = new THREE.PointLight(0xffe6c8, 0, 10, 1.4); glow.position.set(0,.2,0); cube.add(glow);

let D0 = 6, D1 = 12;
function resize(){
  const w=W(), h=H();
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w/h; camera.updateProjectionMatrix();
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov/2)), a = camera.aspect;
  const fit = (ew,eh) => Math.max(eh/2/t, ew/2/t/a);
  D0 = fit(3.3, 3.7); D1 = fit(5.8, 7.4);
}
addEventListener('resize', resize); resize();

/* ── materials ───────────────────────────────── */
const M = {
  body : new THREE.MeshStandardMaterial({ color:0x1f2024, roughness:.36, metalness:.6 }),
  inner: new THREE.MeshStandardMaterial({ color:0x34353b, roughness:.55, metalness:.25 }),
  metal: new THREE.MeshStandardMaterial({ color:0xe6e8ec, roughness:.2, metalness:1 }),
  rib  : new THREE.MeshStandardMaterial({ color:0x3b3d44, roughness:.38, metalness:.9 }),
  dark : new THREE.MeshStandardMaterial({ color:0x0c0c0e, roughness:.75, metalness:.2 }),
  coral: new THREE.MeshBasicMaterial({ color:0xff5d73 }),
  paper: new THREE.MeshBasicMaterial({ color:0xf4f2ee, side:THREE.DoubleSide }),
  bar  : new THREE.MeshBasicMaterial({ color:0xc4c6cc }),
};
const GEO = {
  slab : new RoundedBoxGeometry(1.94,1.94,.14,3,.045),
  flat : new RoundedBoxGeometry(1.94,.14,1.94,3,.045),
  screw: new THREE.CylinderGeometry(.032,.032,.025,16),
  led  : (r) => new THREE.CylinderGeometry(r,r,.03,20),
};
const HITMAT = new THREE.MeshBasicMaterial({ visible:false });
const pickables = [];
function hitMesh(geo, kind, idx=0){
  const m = new THREE.Mesh(geo, HITMAT); m.userData.hit = kind; m.userData.idx = idx; pickables.push(m); return m;
}

/* LED: mỗi đèn một vật liệu riêng để sáng độc lập */
const ledGeo = {};
function makeLED(r=.034, geo){
  const mat = new THREE.MeshStandardMaterial({ color:0x2b2c31, roughness:.45, metalness:.3, emissive:0xfff0d8, emissiveIntensity:0 });
  const g = geo || (ledGeo[r] = ledGeo[r] || GEO.led(r));
  const m = new THREE.Mesh(g, mat); m.rotation.x = Math.PI/2; m.userData.on = false; return m;
}
function ledSet(l, on, pop=true){
  if(l.userData.on === on) return; l.userData.on = on;
  const m = l.material;
  gsap.to(m, { emissiveIntensity: on ? 2.6 : 0, duration:.22 });
  gsap.to(m.color, { r: on?1:.17, g: on?1:.18, b: on?1:.19, duration:.22 });
  if(on && pop && l.geometry.type === 'CylinderGeometry') gsap.fromTo(l.scale, { x:2, z:2 }, { x:1, z:1, duration:.55, ease:'back.out(3)' });
}
function ledRing(parent, count, radius, z, r){
  const arr = [];
  for(let i=0;i<count;i++){
    const th = Math.PI/2 - i/count*Math.PI*2;
    const l = makeLED(r); l.position.set(Math.cos(th)*radius, Math.sin(th)*radius, z); parent.add(l); arr.push(l);
  }
  return arr;
}

/* ── hộp: 4 mặt bên (có cơ chế), nắp, đáy ─────── */
const sides = [];
function makeSide(k, openDeg){
  const root  = new THREE.Group(); root.rotation.y = k*Math.PI/2;
  const slide = new THREE.Group();
  const hinge = new THREE.Group(); hinge.position.set(0,-.97,1);
  const panel = new THREE.Group(); panel.position.set(0,.97,0);
  const slab  = new THREE.Mesh(GEO.slab, M.body);
  const lining = new THREE.Mesh(new THREE.PlaneGeometry(1.68,1.68), M.inner); lining.rotation.y = Math.PI; lining.position.z = -.0715;
  const face  = new THREE.Group(); face.position.z = .07;
  root.add(slide); slide.add(hinge); hinge.add(panel); panel.add(slab, lining, face);
  [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(([a,b]) => {
    const s = new THREE.Mesh(GEO.screw, M.metal); s.rotation.x = Math.PI/2; s.position.set(a*.82,b*.82,.012); face.add(s);
  });
  cube.add(root);
  const o = { root, slide, hinge, panel, face, open: THREE.MathUtils.degToRad(openDeg) };
  sides.push(o); return o;
}
makeSide(0, 86); makeSide(1, 83); makeSide(2, 88); makeSide(3, 85);

const baseSlide = new THREE.Group(); cube.add(baseSlide);
{
  const g = new THREE.Group(); g.position.y = -1; baseSlide.add(g);
  g.add(new THREE.Mesh(GEO.flat, M.body));
  const top = new THREE.Mesh(new THREE.PlaneGeometry(1.68,1.68), M.inner); top.rotation.x = -Math.PI/2; top.position.y = .0715; g.add(top);
}
const lidSlide = new THREE.Group(); cube.add(lidSlide);
const lidHinge = new THREE.Group(); lidHinge.position.set(0,1,-.97); lidSlide.add(lidHinge);
const lidParts = {};
{
  const lid = new THREE.Group(); lid.position.set(0,0,.97); lidHinge.add(lid);
  lid.add(new THREE.Mesh(GEO.flat, M.body));
  const under = new THREE.Mesh(new THREE.PlaneGeometry(1.68,1.68), M.inner); under.rotation.x = Math.PI/2; under.position.y = -.0715; lid.add(under);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.02,64), M.metal); disc.position.y = .08; lid.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.46,.012,10,96), M.metal); ring.rotation.x = Math.PI/2; ring.position.y = .072; lid.add(ring);
  const dot = new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.02,24), M.coral); dot.position.y = .095; lid.add(dot);

  /* chi tiết cơ khí trên đĩa: vạch chia + mũi tên chỉ hướng (để thấy khi vặn) */
  for(let i=0;i<12;i++){
    const a = i/12*Math.PI*2;
    const t = new THREE.Mesh(new THREE.BoxGeometry(.018,.004,.06), M.dark);
    t.position.set(Math.sin(a)*.3, .0105, Math.cos(a)*.3); t.rotation.y = a; disc.add(t);
  }
  const mk = new THREE.Mesh(new THREE.BoxGeometry(.04,.005,.13), M.coral); mk.position.set(0,.011,-.19); disc.add(mk);

  /* 4 chốt khoá ở mép nắp */
  lidParts.latches = [[0,.86,0,1],[0,-.86,0,-1],[.86,0,Math.PI/2,1],[-.86,0,Math.PI/2,-1]].map(([x,z,r,dir]) => {
    const g = new THREE.Group(); g.position.set(x,.072,z); g.rotation.y = r; lid.add(g);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(.5,.01,.17), M.dark); slot.position.y = .004; g.add(slot);
    const s = new THREE.Group(); s.position.y = .01; g.add(s);
    const body = new THREE.Mesh(new RoundedBoxGeometry(.38,.05,.11,2,.015), M.metal); body.position.y = .025; s.add(body);
    const groove = new THREE.Mesh(new THREE.BoxGeometry(.26,.006,.012), M.dark); groove.position.y = .052; s.add(groove);
    return { s, dir };
  });
  lidParts.lid = lid; lidParts.disc = disc; lidParts.ring = ring; lidParts.dot = dot;
}

/* 4 trụ nâng telescopic ở góc — ẩn cho tới khi nắp được nâng */
const posts = [[.88,.88],[-.88,.88],[.88,-.88],[-.88,-.88]].map(([x,z]) => {
  const g = new THREE.Group(); g.position.set(x,.9,z); g.visible = false; cube.add(g);
  const gA = new THREE.CylinderGeometry(.05,.05,1,20); gA.translate(0,.5,0);
  const gB = new THREE.CylinderGeometry(.03,.03,1,20); gB.translate(0,.5,0);
  const A = new THREE.Mesh(gA, M.rib), B = new THREE.Mesh(gB, M.metal);
  const sl = new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.08,20), M.metal); sl.position.y = .04;
  g.add(A,B,sl); return { g, A, B };
});
const lift = { v:0 };
function setLift(v){
  lift.v = v; lidSlide.position.y = v;
  posts.forEach(p => { p.g.visible = v > .01; p.A.scale.y = Math.max(.001, .08 + v*.55); p.B.scale.y = Math.max(.001, .1 + v*1.02); });
}

/* ── MẶT 1: vòng xoay ────────────────────────── */
const MECH = {};
{
  const f = sides[0].face;
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.68,.68,.03,72), M.dark); cup.rotation.x = Math.PI/2; cup.position.z = .01; f.add(cup);
  const bez = new THREE.Mesh(new THREE.TorusGeometry(.68,.02,12,96), M.metal); bez.position.z = .03; f.add(bez);
  const spin = new THREE.Group(); spin.position.z = .09; f.add(spin);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.14,72), M.metal); wheel.rotation.x = Math.PI/2; spin.add(wheel);
  const ribs = new THREE.InstancedMesh(new THREE.BoxGeometry(.07,.028,.14), M.rib, 48);
  const d = new THREE.Object3D();
  for(let i=0;i<48;i++){ const a = i/48*Math.PI*2; d.position.set(Math.cos(a)*.505, Math.sin(a)*.505, 0); d.rotation.set(0,0,a); d.updateMatrix(); ribs.setMatrixAt(i, d.matrix); }
  spin.add(ribs);
  const groove = new THREE.Mesh(new THREE.TorusGeometry(.3,.007,8,72), M.dark); groove.position.z = .072; spin.add(groove);
  const mk = new THREE.Mesh(new THREE.SphereGeometry(.042,20,14), M.coral); mk.scale.z = .5; mk.position.set(0,.4,.072); spin.add(mk);
  const tick = new THREE.Mesh(new THREE.BoxGeometry(.012,.14,.004), M.dark); tick.position.set(0,.27,.072); spin.add(tick);
  const h = hitMesh(new THREE.CylinderGeometry(.74,.74,.2,24), 'dial'); h.rotation.x = Math.PI/2; h.position.z = .09; f.add(h);
  MECH.dial = { spin, leds: ledRing(f,12,.82,.02,.034), cur:0, vel:0, total:0, ticks:0, lit:0, done:false, prev:0, cx:0, cy:0, last:0 };
}

/* ── MẶT 2: thanh trượt ──────────────────────── */
{
  const f = sides[1].face;
  const groove = new THREE.Mesh(new RoundedBoxGeometry(1.66,.24,.05,2,.02), M.dark); groove.position.z = .02; f.add(groove);
  const segs = [];
  for(let i=0;i<10;i++){
    const m = new THREE.MeshStandardMaterial({ color:0x2b2c31, roughness:.45, metalness:.3, emissive:0xfff0d8, emissiveIntensity:0 });
    const s = new THREE.Mesh(new THREE.BoxGeometry(.1,.05,.02), m); s.position.set(-.64 + i*(1.28/9), 0, .05); s.userData.on = false; f.add(s); segs.push(s);
  }
  const knob = new THREE.Group(); knob.position.set(-.64,0,.045); f.add(knob);
  const kb = new THREE.Mesh(new RoundedBoxGeometry(.36,.36,.2,3,.06), M.metal); kb.position.z = .1; knob.add(kb);
  [-.07,0,.07].forEach(x => { const r = new THREE.Mesh(new THREE.BoxGeometry(.016,.22,.004), M.dark); r.position.set(x,0,.202); knob.add(r); });
  const h = hitMesh(new THREE.BoxGeometry(.6,.6,.4), 'slider'); h.position.z = .12; knob.add(h);
  const goal = new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.02,24), M.coral); goal.rotation.x = Math.PI/2; goal.position.set(.78,0,.052); f.add(goal);
  for(let i=0;i<5;i++){ [.52,-.52].forEach(y => { const v = new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.02,16), M.dark); v.rotation.x = Math.PI/2; v.position.set(-.5+i*.25, y, .01); f.add(v); }); }
  const A = new THREE.Object3D(); A.position.set(-.64,0,.1); f.add(A);
  const B = new THREE.Object3D(); B.position.set(.64,0,.1); f.add(B);
  MECH.slider = { knob, segs, A, B, t:0, target:0, off:0, lit:0, ticks:0, done:false };
}

/* ── MẶT 3: 5 chốt ──────────────────────────── */
{
  const f = sides[2].face;
  const P = [[-.48,.48],[.48,.48],[0,0],[-.48,-.48],[.48,-.48]];
  MECH.pegs = P.map(([x,y],i) => {
    const g = new THREE.Group(); g.position.set(x,y,0); f.add(g);
    const well = new THREE.Mesh(new THREE.CylinderGeometry(.26,.26,.03,40), M.dark); well.rotation.x = Math.PI/2; well.position.z = .012; g.add(well);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(.27,.022,10,56), M.metal); collar.position.z = .03; g.add(collar);
    const led = makeLED(.2, new THREE.TorusGeometry(.215,.013,8,56)); led.rotation.x = 0; led.position.z = .034; g.add(led);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.1,24), M.dark); stem.rotation.x = Math.PI/2; stem.position.z = .06; g.add(stem);
    const shaft = new THREE.Group(); shaft.position.z = .15; g.add(shaft);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.16,40), M.rib); body.rotation.x = Math.PI/2; shaft.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.04,40), M.metal); cap.rotation.x = Math.PI/2; cap.position.z = .1; shaft.add(cap);
    const h = hitMesh(new THREE.CylinderGeometry(.3,.3,.7,16), 'peg', i); h.rotation.x = Math.PI/2; h.position.set(0,0,.1); g.add(h);
    return { g, shaft, led, down:false, zUp:.15, zDown:.03 };
  });
  MECH.pegCount = 0;
}

/* ── MẶT 4: quả cầu nhịp tim ─────────────────── */
{
  const f = sides[3].face;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.06,64), M.dark); base.rotation.x = Math.PI/2; base.position.z = .03; f.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.58,.045,16,80), M.metal); ring.position.z = .06; f.add(ring);
  const group = new THREE.Group(); group.position.z = .34; f.add(group);
  const glassMat = new THREE.MeshPhysicalMaterial({ color:0xffffff, metalness:0, roughness:.04, transmission:1, thickness:.6, ior:1.5, clearcoat:1, clearcoatRoughness:.05, envMapIntensity:1.2 });
  const glass = new THREE.Mesh(new THREE.SphereGeometry(.44,56,40), glassMat); group.add(glass);
  const coreMat = new THREE.MeshBasicMaterial({ color:0x4a2229 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(.2,32,24), coreMat); group.add(core);
  const h = hitMesh(new THREE.SphereGeometry(.64,16,12), 'orb'); group.add(h);
  MECH.orb = { group, glass, core, coreMat, leds: ledRing(f,24,.8,.02,.026), charge:0, hold:false, beatT:.9, kick:0, done:false, lit:0 };
}

/* ════════════════════════════════════════════════
   MẶT ĐÁY — bảng điện tử 3D nổi khối + bàn phím 3D
   Mặt này quay xuống dưới; khi hộp lật −90° quanh trục X,
   hệ toạ độ cục bộ của kf trùng với hệ toạ độ màn hình.
   ════════════════════════════════════════════════ */
const KEY = { code:CONFIG.code, buf:'', locked:false, done:false, tok:0, keys:[], digits:[], bar:null, bolts:[] };
const LIT  = { w:new THREE.Color(0xfff0d8), g:new THREE.Color(0x7dffb8), r:new THREE.Color(0xff4d5e) };
const OFFC = new THREE.Color(.14,.145,.16);
const SEGMASK = {
  '0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg',
  '-':'g',' ':'', 'O':'abcdef','P':'abefg','E':'adefg','n':'ceg','r':'eg'
};
const KEYDEFS = ['1','2','3','4','5','6','7','8','9','C','0','OK'];

const kf = new THREE.Group(); kf.position.y = -1.07; kf.rotation.x = Math.PI/2; baseSlide.add(kf);
const kLight = new THREE.PointLight(0xfff0e0, 0, 6, 1.5); kLight.position.set(0,.15,.95); kf.add(kLight);
{
  const plateMat = new THREE.MeshStandardMaterial({ color:0x2a2b30, roughness:.48, metalness:.75 });
  const plate = new THREE.Mesh(new RoundedBoxGeometry(1.8,1.8,.03,2,.04), plateMat); plate.position.z = .015; kf.add(plate);

  /* 4 bulông ở góc — sẽ vặn ra khi mở khoá */
  [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(([a,b]) => {
    const g = new THREE.Group(); g.position.set(a*.82,b*.85,.03); kf.add(g);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.03,24), M.metal); head.rotation.x = Math.PI/2; head.position.z = .015; g.add(head);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(.075,.012,.008), M.dark); slot.position.z = .031; g.add(slot);
    KEY.bolts.push(g);
  });

  /* bảng điện tử: viền kim loại nổi + kính tối + 4 chữ số 7 đoạn đùn khối */
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(1.5,.5,.09,3,.05), M.metal); bezel.position.set(0,.64,.075); kf.add(bezel);
  const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(1.36,.36), new THREE.MeshStandardMaterial({ color:0x050607, roughness:.12, metalness:.4 }));
  glassPane.position.set(0,.64,.1205); kf.add(glassPane);

  function segGeo(len, th, depth){
    const s = new THREE.Shape(), h = th/2;
    s.moveTo(-len/2,0); s.lineTo(-len/2+h,h); s.lineTo(len/2-h,h); s.lineTo(len/2,0); s.lineTo(len/2-h,-h); s.lineTo(-len/2+h,-h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled:true, bevelThickness:.004, bevelSize:.004, bevelSegments:1, curveSegments:1 });
    g.translate(0,0,-depth/2); return g;
  }
  const gH = segGeo(.118,.028,.03), gV = segGeo(.112,.028,.03);
  const w = .15, h = .26;
  const SPOS = { a:[0,h/2,0], b:[w/2,h/4,1], c:[w/2,-h/4,1], d:[0,-h/2,0], e:[-w/2,-h/4,1], f:[-w/2,h/4,1], g:[0,0,0] };
  [-.45,-.15,.15,.45].forEach(cx => {
    const g = new THREE.Group(); g.position.set(cx,.64,.128); kf.add(g);
    const segs = {};
    Object.keys(SPOS).forEach(k => {
      const [x,y,vert] = SPOS[k];
      const mat = new THREE.MeshStandardMaterial({ color:0x232429, roughness:.4, metalness:.3, emissive:0xfff0d8, emissiveIntensity:0 });
      const m = new THREE.Mesh(vert ? gV : gH, mat); m.position.set(x,y,0); if(vert) m.rotation.z = Math.PI/2; g.add(m); segs[k] = m;
    });
    KEY.digits.push({ g, segs });
  });

  /* thanh trạng thái dưới bảng */
  const barMat = new THREE.MeshStandardMaterial({ color:0xfff0d8, roughness:.4, metalness:.2, emissive:0xfff0d8, emissiveIntensity:.35 });
  const bar = new THREE.Mesh(new RoundedBoxGeometry(1.1,.016,.014,2,.006), barMat); bar.position.set(0,.355,.037); kf.add(bar); KEY.bar = bar;

  /* nhãn phím vẽ bằng canvas */
  function labelTex(lab){
    const c = document.createElement('canvas'); c.width = 160; c.height = 120; const x = c.getContext('2d');
    x.lineCap = 'round'; x.lineJoin = 'round';
    if(lab === 'OK'){
      x.strokeStyle = '#9dffc6'; x.lineWidth = 11; x.beginPath(); x.moveTo(42,62); x.lineTo(70,88); x.lineTo(120,32); x.stroke();
    } else if(lab === 'C'){
      x.strokeStyle = '#ff8a9a'; x.lineWidth = 10;
      x.beginPath(); x.moveTo(30,60); x.lineTo(56,34); x.lineTo(124,34); x.lineTo(124,86); x.lineTo(56,86); x.closePath(); x.stroke();
      x.beginPath(); x.moveTo(74,50); x.lineTo(102,70); x.moveTo(102,50); x.lineTo(74,70); x.stroke();
    } else {
      x.fillStyle = '#ffffff'; x.font = '500 80px "Be Vietnam Pro", -apple-system, system-ui, sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(lab,80,64);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }

  /* 12 phím 3D: giếng tối + nắp phím nổi khối, nhấn lún xuống */
  const wellGeo = new RoundedBoxGeometry(.46,.29,.024,2,.02);
  const capGeo  = new RoundedBoxGeometry(.4,.24,.07,3,.03);
  const lblGeo  = new THREE.PlaneGeometry(.26,.195);
  KEYDEFS.forEach((lab,i) => {
    const col = i%3, row = (i/3)|0;
    const g = new THREE.Group(); g.position.set((col-1)*.5, .2-row*.3, .03); kf.add(g);
    const well = new THREE.Mesh(wellGeo, M.dark); well.position.z = .012; g.add(well);
    const mat = new THREE.MeshStandardMaterial({ color:0x2e2f36, roughness:.3, metalness:.75, emissive:0xffffff, emissiveIntensity:0 });
    const cap = new THREE.Group(); cap.position.z = .05; g.add(cap);
    const body = new THREE.Mesh(capGeo, mat); cap.add(body);
    const lm = new THREE.Mesh(lblGeo, new THREE.MeshBasicMaterial({ map:labelTex(lab), transparent:true, toneMapped:false, depthWrite:false }));
    lm.position.z = .0365; cap.add(lm);
    const hm = hitMesh(new THREE.BoxGeometry(.48,.29,.3), 'key', i); hm.position.z = .14; g.add(hm);
    KEY.keys.push({ g, cap, mat, lab });
  });
}

/* tô sáng một chữ số / chữ cái trên bảng 7 đoạn */
function paintDigit(i, ch, tone='w', level=2.6){
  const D = KEY.digits[i], mask = SEGMASK[ch] || '';
  Object.keys(D.segs).forEach(k => {
    const m = D.segs[k].material, on = mask.includes(k), c = on ? LIT[tone] : OFFC;
    m.emissive.copy(LIT[tone]);
    gsap.to(m, { emissiveIntensity: on ? level : 0, duration:.18, overwrite:true });
    gsap.to(m.color, { r:c.r, g:c.g, b:c.b, duration:.18, overwrite:true });
  });
}
function showWord(word, tone='w', level=3){ for(let i=0;i<4;i++) paintDigit(i, word[i] || ' ', tone, level); }
function refreshDisplay(pop){
  for(let i=0;i<4;i++){
    const ch = KEY.buf[i];
    if(ch) paintDigit(i, ch, 'w', 2.6); else paintDigit(i, '-', 'w', .55);
  }
  if(pop && KEY.buf.length){
    const D = KEY.digits[KEY.buf.length-1];
    gsap.fromTo(D.g.position, { z:.21 }, { z:.128, duration:.4, ease:'back.out(2.5)' });
    gsap.fromTo(D.g.scale, { x:1.22, y:1.22 }, { x:1, y:1, duration:.4, ease:'back.out(3)' });
  }
}
function barTone(t, lvl=1.6){
  const m = KEY.bar.material; m.emissive.copy(LIT[t]);
  gsap.to(m, { emissiveIntensity:lvl, duration:.25 });
  gsap.to(m.color, { r:LIT[t].r, g:LIT[t].g, b:LIT[t].b, duration:.25 });
}
function keyFx(i, hex=0xffffff, lvl=.5){
  const k = KEY.keys[i];
  gsap.killTweensOf(k.cap.position);
  gsap.timeline().to(k.cap.position, { z:.028, duration:.07, ease:'power2.out' }).to(k.cap.position, { z:.05, duration:.3, ease:'back.out(3)' });
  k.mat.emissive.setHex(hex);
  gsap.fromTo(k.mat, { emissiveIntensity:lvl }, { emissiveIntensity:0, duration:.5, overwrite:true });
}

/* ── lá thư (nằm trong hộp) ──────────────────── */
const LW = 1.5, LH = 1.06;
const letter = new THREE.Group(); letter.position.set(0,-.32,0); cube.add(letter);
const paper = new THREE.Mesh(new THREE.PlaneGeometry(LW,LH), M.paper); letter.add(paper);
{
  [[.0,.3,.9],[.0,.12,.78],[.0,-.06,.84],[.0,-.24,.5]].forEach(([x,y,w]) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w*LW*.72,.04), M.bar); b.position.set(-LW*.72*(1-w)/2*.5 - .02, y*1.0, .002); letter.add(b);
  });
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(LW,LH)), new THREE.LineBasicMaterial({ color:0xffffff })); edge.raycast = () => {}; letter.add(edge);
  const h = hitMesh(new THREE.PlaneGeometry(LW*1.25,LH*1.25), 'letter'); h.position.z = .02; letter.add(h);
}

/* ── chấm khởi đầu ───────────────────────────── */
const dot = new THREE.Mesh(new THREE.SphereGeometry(.07,32,24), new THREE.MeshBasicMaterial({ color:0xffffff })); scene.add(dot);
const dotRingMat = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.5, depthWrite:false });
const dotRing = new THREE.Mesh(new THREE.TorusGeometry(.12,.003,8,96), dotRingMat); scene.add(dotRing);

/* ── tia sáng nhỏ ────────────────────────────── */
const SPN = 320;
const spPos = new Float32Array(SPN*3), spVel = new Float32Array(SPN*3), spLife = new Float32Array(SPN), spCol = new Float32Array(SPN*3);
const spGeo = new THREE.BufferGeometry();
spGeo.setAttribute('position', new THREE.BufferAttribute(spPos,3));
spGeo.setAttribute('color', new THREE.BufferAttribute(spCol,3));
const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ size:.045, sizeAttenuation:true, vertexColors:true, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
sparks.frustumCulled = false; sparks.raycast = () => {}; scene.add(sparks);
let spI = 0;
function burst(p, n=40, speed=2, up=.4){
  for(let i=0;i<n;i++){
    const k = spI++ % SPN, th = Math.random()*Math.PI*2, ph = Math.acos(2*Math.random()-1), sp = speed*(.35+Math.random()*.65);
    spPos[k*3] = p.x; spPos[k*3+1] = p.y; spPos[k*3+2] = p.z;
    spVel[k*3] = Math.sin(ph)*Math.cos(th)*sp; spVel[k*3+1] = Math.cos(ph)*sp + up; spVel[k*3+2] = Math.sin(ph)*Math.sin(th)*sp;
    spLife[k] = .7 + Math.random()*.9;
  }
}
function updateSparks(dt){
  for(let k=0;k<SPN;k++){
    if(spLife[k] > 0){
      spLife[k] -= dt;
      spPos[k*3] += spVel[k*3]*dt; spPos[k*3+1] += spVel[k*3+1]*dt; spPos[k*3+2] += spVel[k*3+2]*dt;
      const dmp = 1 - 1.7*dt; spVel[k*3] *= dmp; spVel[k*3+1] = spVel[k*3+1]*dmp - .6*dt; spVel[k*3+2] *= dmp;
      const c = Math.max(0, Math.min(1, spLife[k]/.9));
      spCol[k*3] = c; spCol[k*3+1] = c*.95; spCol[k*3+2] = c*.86;
    } else { spCol[k*3] = spCol[k*3+1] = spCol[k*3+2] = 0; }
  }
  spGeo.attributes.position.needsUpdate = true; spGeo.attributes.color.needsUpdate = true;
}

/* ════════════════════════════════════════════════
   TRẠNG THÁI
   ════════════════════════════════════════════════ */
const S = { mode:'wait', stage:0, u:0, uT:0, rise:0, shk:0, lidM:0 };
const rot = { yaw:0, pitch:.12, tYaw:0, tPitch:.12, vYaw:0, vPitch:0, drag:false, idle:0 };
const par = { x:0, y:0, tx:0, ty:0 };
const tilt = { x:0, y:0 };
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

const toScreen = obj => { obj.getWorldPosition(_v); _v.project(camera); return { x:(_v.x*.5+.5)*W(), y:(-_v.y*.5+.5)*H() }; };
function pxPerUnit(obj){
  obj.getWorldPosition(_v); const a = _v.clone().project(camera);
  _w.setFromMatrixColumn(camera.matrixWorld, 0); const b = _v.clone().add(_w).project(camera);
  return Math.hypot((b.x-a.x)*.5*W(), (b.y-a.y)*.5*H());
}
const baseYaw = (stage, ref) => { const b = -stage*Math.PI/2; return b + Math.PI*2*Math.round((ref-b)/(Math.PI*2)); };

/* ── mở hộp: áp dụng u (0→1) vào bản lề ───────── */
function applyOpen(u){
  /* nắp mở bởi u (kéo bung) hoặc bởi chuỗi cơ khí S.lidM — lấy giá trị lớn hơn */
  const lid = Math.max(clamp(0,1,u/.45), S.lidM);
  lidHinge.rotation.x = -THREE.MathUtils.degToRad(112) * (1-Math.pow(1-lid,2));
  sides.forEach((s,k) => {
    const a = clamp(0,1,(u-.26-k*.035)/.55);
    s.hinge.rotation.x = s.open * (1-Math.pow(1-a,3));
  });
  glow.intensity = Math.max(u*u*20, S.lidM*S.lidM*7);
}

/* ── camera ──────────────────────────────────── */
function updateCamera(){
  const e = smooth(S.u), r = S.rise;
  const dist = lerp(D0, D1, e) * (1 - .1*r);
  const pitch = lerp(.1, .66, e) - .12*r;
  const ty = lerp(0, .5, e) + .1*r;
  camera.position.set(par.x*.32, ty + Math.sin(pitch)*dist - par.y*.2, Math.cos(pitch)*dist);
  camera.lookAt(par.x*.08, ty, 0);
}

/* ════════════════════════════════════════════════
   CHỌN VẬT THỂ BẰNG TIA
   ════════════════════════════════════════════════ */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(x, y){
  ndc.set(x/W()*2-1, -(y/H())*2+1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObject(cube, true);
  for(const h of hits){
    if(h.object.userData.hit) return { kind:h.object.userData.hit, idx:h.object.userData.idx, obj:h.object };
    if(h.object.material && h.object.material.visible !== false) return null;
  }
  return null;
}

/* ════════════════════════════════════════════════
   GỢI Ý BẰNG BÓNG TAY (không chữ)
   ════════════════════════════════════════════════ */
const ghost = $('#ghost'); let ghostTl = null, hintTimer = 0;
function hideGhost(){ if(ghostTl){ ghostTl.kill(); ghostTl = null; } gsap.killTweensOf(ghost); gsap.to(ghost,{ opacity:0, scale:1, duration:.2 }); }
function armHint(ms=4500){ clearTimeout(hintTimer); hintTimer = setTimeout(playHint, ms); }
function playHint(){
  hideGhost();
  if(!['play','unfold','letter'].includes(S.mode) || P) return;
  const tl = gsap.timeline({ repeat:-1, repeatDelay:.8 }); ghostTl = tl;
  const at = (x,y) => gsap.set(ghost,{ x, y });
  gsap.set(ghost,{ opacity:0, scale:1 });
  if(S.mode === 'play'){
    if(S.stage === 0){
      const c = toScreen(MECH.dial.spin), r = pxPerUnit(MECH.dial.spin)*.38, pr = { a:0 };
      const upd = () => at(c.x + r*Math.sin(pr.a), c.y - r*Math.cos(pr.a));
      tl.call(() => { pr.a = 0; upd(); })
        .to(ghost,{ opacity:1, scale:.85, duration:.3 })
        .to(pr,{ a:Math.PI*1.75, duration:1.9, ease:'power1.inOut', onUpdate:upd })
        .to(ghost,{ opacity:0, scale:1, duration:.3 });
    } else if(S.stage === 1){
      const a = toScreen(MECH.slider.A), b = toScreen(MECH.slider.B);
      tl.call(() => at(a.x,a.y))
        .to(ghost,{ opacity:1, scale:.85, duration:.3 })
        .to(ghost,{ x:b.x, y:b.y, duration:1.5, ease:'power2.inOut' })
        .to(ghost,{ opacity:0, scale:1, duration:.3 });
    } else if(S.stage === 2){
      const p = MECH.pegs.find(q => !q.down) || MECH.pegs[0], c = toScreen(p.g);
      tl.call(() => at(c.x,c.y))
        .to(ghost,{ opacity:1, duration:.25 })
        .to(ghost,{ scale:.72, duration:.14, ease:'power2.out' })
        .to(ghost,{ scale:1, duration:.3, ease:'back.out(3)' })
        .to(ghost,{ opacity:0, duration:.3 }, '+=.2');
    } else if(S.stage === 3){
      const c = toScreen(MECH.orb.group);
      tl.call(() => at(c.x,c.y))
        .to(ghost,{ opacity:1, duration:.25 })
        .to(ghost,{ scale:.8, duration:.2 })
        .to(ghost,{ scale:.8, duration:1.6 })
        .to(ghost,{ opacity:0, scale:1, duration:.3 });
    }
  } else if(S.mode === 'unfold'){
    const c = toScreen(cube);
    tl.call(() => at(c.x,c.y+30))
      .to(ghost,{ opacity:1, scale:.85, duration:.3 })
      .to(ghost,{ y:c.y-Math.min(160,H()*.22), duration:1.3, ease:'power2.inOut' })
      .to(ghost,{ opacity:0, scale:1, duration:.3 });
  } else if(S.mode === 'letter'){
    const c = toScreen(letter);
    tl.call(() => at(c.x,c.y+30))
      .to(ghost,{ opacity:1, scale:.85, duration:.3 })
      .to(ghost,{ y:c.y-90, duration:1.1, ease:'power2.inOut' })
      .to(ghost,{ opacity:0, scale:1, duration:.3 });
  }
}

/* ── chỉ báo tiến độ (dock) ──────────────────── */
const dock = $('#dock'), dotsEl = $('#dots'), prevB = $('#prev'), nextB = $('#next'), redoB = $('#redo');
let pips = [];
function buildDots(n){ dotsEl.innerHTML = ''; pips = Array.from({length:n}, () => dotsEl.appendChild(document.createElement('i'))); }
const markPip = i => pips[i] && pips[i].classList.add('on');
buildDots(7);

/* ════════════════════════════════════════════════
   BƯỚC 0 — chạm vào chấm
   ════════════════════════════════════════════════ */
function startIntro(){
  S.mode = 'intro'; Snd.init(); haptic(10);
  gsap.to(dot.scale, { x:0, y:0, z:0, duration:.45, ease:'power3.in' });
  gsap.to(dotRingMat, { opacity:0, duration:.3 });
  burst(new THREE.Vector3(0,0,0), 60, 2.4, 0);
  Snd.whoosh(1.2, .18); Snd.note(PENT[2], .12, 1.8);
  cube.visible = true; rot.yaw = 2.6; rot.tYaw = 0;
  gsap.to(snd, { autoAlpha:1, duration:.6, delay:1 });
  const t0 = .2, gap = .12;
  sides.forEach((s,k) => {
    s.slide.position.z = 7; s.slide.rotation.z = (k%2 ? 1 : -1)*.9;
    gsap.to(s.slide.position, { z:0, duration:1.2, delay:t0+k*gap, ease:'expo.out' });
    gsap.to(s.slide.rotation, { z:0, duration:1.2, delay:t0+k*gap, ease:'expo.out' });
    gsap.delayedCall(t0+k*gap+.3, () => { Snd.click(1800+k*150, .3, 3, .07); Snd.note(PENT[k], .09, 1.2); });
  });
  lidSlide.position.y = 7; baseSlide.position.y = -7;
  gsap.to(lidSlide.position, { y:0, duration:1.2, delay:t0+4*gap, ease:'expo.out' });
  gsap.to(baseSlide.position, { y:0, duration:1.2, delay:t0+5*gap, ease:'expo.out' });
  gsap.delayedCall(t0+4*gap+.32, () => { Snd.click(1400,.35,3,.08); });
  gsap.delayedCall(t0+5*gap+.32, () => { Snd.click(1000,.4,2,.1); Snd.note(PENT[5], .1, 2); haptic(16); gsap.fromTo(cube.scale,{ x:1.05,y:1.05,z:1.05 },{ x:1,y:1,z:1,duration:.8,ease:'elastic.out(1,.4)' }); });
  gsap.to(dock, { autoAlpha:1, duration:.8, delay:1.6 });
  gsap.delayedCall(1.9, () => { S.mode = 'play'; S.stage = 0; armHint(); });
}

/* ════════════════════════════════════════════════
   CÁC CƠ CHẾ
   ════════════════════════════════════════════════ */
function stageDone(i){
  S.mode = 'transition'; hideGhost(); clearTimeout(hintTimer);
  haptic([20,40,30]); markPip(i);
  const p = new THREE.Vector3(); sides[i].face.getWorldPosition(p); p.multiplyScalar(1.02);
  burst(p, 46, 1.8, .2);
  chord([[0,2,4],[1,3,5],[2,4,5],[0,2,3,5]][i]);
  Snd.click(900,.4,2,.12);
  if(i < 3){
    gsap.delayedCall(1.0, () => {
      rot.vYaw = rot.vPitch = 0;
      gsap.to(rot, { tYaw: baseYaw(i+1, rot.tYaw), tPitch:.12, duration:1.15, ease:'power3.inOut' });
      rot.idle = -1.4; Snd.whoosh(.8,.12);
      gsap.delayedCall(1.2, () => { S.stage = i+1; S.mode = 'play'; armHint(); });
    });
  } else {
    /* giải xong 4 mặt ngang → lật hộp xuống mặt đáy (nhập mật mã) */
    gsap.delayedCall(1.0, () => {
      rot.vYaw = rot.vPitch = 0; S.mode = 'turn';
      gsap.to(rot, { tYaw: baseYaw(4, rot.tYaw), tPitch:BOT, duration:1.5, ease:'power3.inOut' });
      rot.idle = -1.4; Snd.whoosh(1.1,.16);
      gsap.delayedCall(1.6, enterCode);
    });
  }
}
function locked(){
  haptic(14); Snd.click(650,.28,2,.09);
  gsap.fromTo(S, { shk:.07 }, { shk:0, duration:.6, ease:'elastic.out(1,.22)' });
}

/* 1 — vòng xoay */
const dialSet = () => {
  const D = MECH.dial, n = Math.min(12, Math.floor(clamp(0,1,D.total/(Math.PI*2*1.1))*12 + .001));
  D.leds.forEach((l,i) => ledSet(l, i < n));
  if(D.total >= Math.PI*2*1.1 && !D.done){ D.done = true; D.vel = 0; gsap.to(D.spin.position,{ z:.15, duration:.18, yoyo:true, repeat:1, ease:'power2.out' }); stageDone(0); }
};
const dialAdvance = d => {
  const D = MECH.dial; D.cur += d; D.total += Math.abs(d); D.spin.rotation.z = -D.cur;
  const t = Math.floor(D.cur/(Math.PI/6));
  if(t !== D.ticks){ D.ticks = t; Snd.click(2700,.22,6,.03); haptic(4); }
  dialSet();
};
/* 2 — thanh trượt */
const sliderT = (x,y) => {
  const L = MECH.slider, a = toScreen(L.A), b = toScreen(L.B), dx = b.x-a.x, dy = b.y-a.y;
  return ((x-a.x)*dx + (y-a.y)*dy) / (dx*dx + dy*dy);
};
/* 3 — chốt */
function pressPeg(i){
  const p = MECH.pegs[i]; if(p.down) return; p.down = true;
  gsap.to(p.shaft.position, { z:p.zDown, duration:.16, ease:'power2.out' });
  ledSet(p.led, true, false);
  MECH.pegCount++;
  Snd.click(1500,.38,3,.06); Snd.note(PENT[Math.min(MECH.pegCount-1,5)], .17, 1.7); haptic(14);
  const w = new THREE.Vector3(); p.g.getWorldPosition(w); burst(w, 10, 1.1, .1);
  if(MECH.pegCount === 5) gsap.delayedCall(.5, () => stageDone(2));
}
/* 4 — nhịp tim */
function beat(){
  const o = MECH.orb; o.kick = 1;
  Snd.thump(.55); gsap.delayedCall(.15, () => Snd.thump(.34)); haptic([20,70,14]);
}

/* ════════════════════════════════════════════════
   BƯỚC 5 — MẶT ĐÁY: nhập mật mã
   ════════════════════════════════════════════════ */
const hintEl = $('#hint');
function enterCode(){
  S.mode = 'code'; S.stage = 4; rot.idle = 0;
  KEY.buf = ''; KEY.locked = false; KEY.done = false; KEY.tok++;
  gsap.to(kLight, { intensity:7, duration:.9 });
  barTone('w', .5);
  /* bảng điện tử bật nguồn: từng ô sáng dần */
  for(let i=0;i<4;i++) gsap.delayedCall(.2 + i*.16, () => {
    paintDigit(i, '-', 'w', .55); Snd.click(2600 + i*220, .16, 6, .03);
    gsap.fromTo(KEY.digits[i].g.position, { z:.2 }, { z:.128, duration:.45, ease:'back.out(2.5)' });
  });
  Snd.note(PENT[2], .1, 1.6); Snd.click(1300,.3,3,.08); haptic(10);
  gsap.to(hintEl, { autoAlpha:1, duration:.8, delay:.5 });
}
function pressKeyIdx(i){
  if(S.mode !== 'code' || KEY.locked) return;
  const lab = KEYDEFS[i];
  if(lab === 'C'){
    keyFx(i, 0xff6a7d, .55); KEY.tok++; KEY.buf = '';
    Snd.click(1100,.3,3,.07); haptic(8); refreshDisplay(false); return;
  }
  if(lab === 'OK'){ keyFx(i, 0x9dffc6, .6); Snd.click(1700,.3,3,.07); submit(); return; }
  keyFx(i);
  if(KEY.buf.length >= 4){ locked(); return; }
  KEY.buf += lab; KEY.tok++;
  Snd.click(2200,.3,4,.05); Snd.note(PENT[(KEY.buf.length-1)%5], .12, 1.2); haptic(8);
  refreshDisplay(true);
  if(KEY.buf.length === 4){
    const tk = KEY.tok;
    gsap.delayedCall(.5, () => { if(tk === KEY.tok) submit(); });
  }
}
function submit(){
  if(S.mode !== 'code' || KEY.locked) return;
  if(KEY.buf.length < 4){ locked(); return; }
  KEY.locked = true;
  if(KEY.buf === KEY.code) codeOK(); else codeBad();
}

/* ĐÚNG: số xanh, sóng sáng lan trên phím, bảng hiện OPEn, bulông vặn ra, lật lên đỉnh, mở nắp cơ khí */
function codeOK(){
  KEY.done = true; markPip(4); hideGhost(); clearTimeout(hintTimer);
  haptic([20,40,30,40,70]);
  showWord(KEY.buf, 'g', 3.4); barTone('g', 2.4);
  chord([0,2,4,5]); Snd.thump(.5); Snd.click(900,.4,2,.12);
  KEY.keys.forEach((k,i) => {
    const d = ((i%3) + ((i/3)|0))*.07;
    k.mat.emissive.setHex(0x3dff9a);
    gsap.fromTo(k.mat, { emissiveIntensity:.8 }, { emissiveIntensity:0, duration:.9, delay:d, overwrite:true });
    gsap.timeline({ delay:d }).to(k.cap.position, { z:.11, duration:.18, ease:'power2.out' }).to(k.cap.position, { z:.05, duration:.5, ease:'bounce.out' });
  });
  const wp = new THREE.Vector3(0,.64,.2); kf.localToWorld(wp); burst(wp, 60, 1.8, .2);
  /* bảng đổi sang OPEn */
  gsap.delayedCall(.9, () => {
    showWord('OPEn', 'g', 3.4);
    KEY.digits.forEach((D,i) => gsap.fromTo(D.g.position, { z:.2 }, { z:.128, duration:.5, delay:i*.06, ease:'back.out(2.5)' }));
    Snd.note(PENT[5]*2, .1, 1.8);
  });
  /* 4 bulông vặn ra, nổi lên */
  gsap.delayedCall(1.1, () => {
    Snd.ratchet(8, .8, 1900); haptic([10,30,10,30,10]);
    KEY.bolts.forEach((b,i) => {
      gsap.to(b.rotation, { z:Math.PI*3*(i%2?-1:1), duration:.9, delay:i*.05, ease:'power2.inOut' });
      gsap.to(b.position, { z:.075, duration:.9, delay:i*.05, ease:'power2.inOut' });
    });
  });
  gsap.delayedCall(2.3, () => {
    S.mode = 'turn'; rot.vYaw = rot.vPitch = 0;
    gsap.to(hintEl, { autoAlpha:0, duration:.4 });
    gsap.to(kLight, { intensity:0, duration:1.2 });
    gsap.to(rot, { tYaw: baseYaw(4, rot.tYaw), tPitch:.5, duration:1.7, ease:'power3.inOut' });
    rot.idle = -3; Snd.whoosh(1.2,.18);
    gsap.delayedCall(1.9, mechOpen);
  });
}

/* SAI: số đỏ nhấp nháy, còi, hộp rung, phím đỏ, hiện Err rồi xoá */
function codeBad(){
  haptic([60,40,60,40,90]);
  Snd.buzz(); barTone('r', 2.6);
  const sh = gsap.timeline(); [.1,-.1,.08,-.08,.05,-.05,0].forEach(v => sh.to(S, { shk:v, duration:.06, ease:'power1.inOut' }));
  KEY.keys.forEach(k => { k.mat.emissive.setHex(0xff2a45); gsap.fromTo(k.mat, { emissiveIntensity:.7 }, { emissiveIntensity:0, duration:.8, overwrite:true }); });
  const word = KEY.buf, tl = gsap.timeline();
  for(let n=0;n<3;n++){
    tl.call(() => showWord(word,'r',3.4), null, n*.3).call(() => showWord('    ','r'), null, n*.3 + .15);
  }
  tl.call(() => { showWord('Err ','r',3.4); haptic(30); gsap.fromTo(hintEl, { scale:1.07 }, { scale:1, duration:.6, ease:'elastic.out(1,.4)' }); }, null, 1.0)
    .call(() => { KEY.buf = ''; KEY.tok++; barTone('w', .5); refreshDisplay(false); KEY.locked = false; }, null, 2.1);
}

/* ════════════════════════════════════════════════
   MỞ NẮP CƠ KHÍ — từ đỉnh hộp
   vặn đĩa (bánh cóc) → chốt khoá thụt → trụ telescopic
   nâng nắp, nắp vặn xoắn ốc → bản lề bật mở → ánh sáng
   ════════════════════════════════════════════════ */
function mechOpen(){
  S.mode = 'mech'; hideGhost(); clearTimeout(hintTimer);
  const L = lidParts;
  const tl = gsap.timeline({ onComplete: () => { rot.idle = -.4; S.mode = 'unfold'; armHint(2400); } });

  /* 1 — vặn đĩa trung tâm, kèm tiếng bánh cóc */
  tl.call(() => { Snd.ratchet(16, 1.05, 2300); haptic([8,30,8,30,8,30]); }, null, 0)
    .to(L.disc.rotation, { y:-Math.PI*2, duration:1.1, ease:'power2.inOut' }, 0)
    .fromTo(L.dot.scale, { x:1, z:1 }, { x:1.9, z:1.9, duration:.3, yoyo:true, repeat:1, ease:'power2.out' }, .9);

  /* 2 — 4 chốt khoá thụt ra ngoài, lần lượt */
  L.latches.forEach((l,i) => {
    const t = 1.25 + i*.1;
    tl.to(l.s.position, { z:l.dir*.15, duration:.28, ease:'power3.out' }, t)
      .call(() => { Snd.click(1500 + i*180, .4, 3, .06); haptic(12); }, null, t);
  });

  /* 3 — trụ nâng vươn lên, nắp vặn xoắn ốc bay lên */
  tl.call(() => { Snd.servo(1.55, .12); haptic([10,20,10,20,10,20,40]); }, null, 2.0)
    .to(lift, { v:.55, duration:1.55, ease:'power2.inOut', onUpdate:() => setLift(lift.v) }, 2.0)
    .to(lidSlide.rotation, { y:-Math.PI*2, duration:1.55, ease:'power2.inOut' }, 2.0)
    .call(() => { lidSlide.rotation.y = 0; Snd.thump(.5); Snd.click(1200,.4,2,.1); haptic(18); }, null, 3.58);

  /* 4 — bản lề bật mở, nắp hạ xuống, trụ co lại, ánh sáng trào ra */
  tl.call(() => { Snd.whoosh(1.1,.2); Snd.servo(1.0,.07); }, null, 3.65)
    .to(S, { lidM:1, duration:1.25, ease:'power3.inOut' }, 3.65)
    .to(lift, { v:0, duration:1.25, ease:'power2.in', onUpdate:() => setLift(lift.v) }, 3.65)
    .call(() => {
      chord([0,2,4,5]); Snd.note(PENT[0]*.5, .16, 3); haptic([20,40,30]);
      const p = new THREE.Vector3(0,1.0,0); cube.localToWorld(p); burst(p, 90, 2.6, 1.4);
    }, null, 4.05)
    .call(() => { setLift(0); }, null, 4.95);
}

/* ════════════════════════════════════════════════
   BƯỚC 6 — kéo hộp bung ra
   ════════════════════════════════════════════════ */
function finishUnfold(){
  S.mode = 'rise'; hideGhost(); clearTimeout(hintTimer);
  Snd.whoosh(1.4,.26); haptic([20,40,30]);
  gsap.to(S, { u:1, duration:1, ease:'power3.out' });
  gsap.delayedCall(.9, () => {
    chord([0,2,4,5]); Snd.note(PENT[0]*.5, .16, 3);
    const p = new THREE.Vector3(0,.2,0); cube.localToWorld(p); burst(p, 90, 2.6, 1.2); haptic(30);
  });
  gsap.to(S, { rise:1, duration:2.4, delay:.7, ease:'expo.out' });
  gsap.delayedCall(2.8, () => { S.mode = 'letter'; markPip(5); armHint(2600); });
}

/* ════════════════════════════════════════════════
   BƯỚC 7 — kéo thư lên → thư biến thành kính
   ════════════════════════════════════════════════ */
const letterEl = $('#letter'), pagesWrap = $('#pages');
const pagesEl = CONFIG.pages.map(p => {
  const el = document.createElement('div'); el.className = 'pg'; const parts = [];
  if(p.title){ const h = document.createElement('h2'); h.textContent = p.title; parts.push(h); }
  const t = document.createElement('p'); t.textContent = p.text; parts.push(t);
  if(p.sign){ const s = document.createElement('div'); s.className = 'sign'; s.textContent = p.sign; parts.push(s); }
  parts.forEach(n => {
    const words = n.textContent.split(/\s+/).filter(Boolean); n.textContent = '';
    words.forEach((w,i) => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w + (i < words.length-1 ? ' ' : ''); n.appendChild(s); });
    el.appendChild(n);
  });
  pagesWrap.appendChild(el); return el;
});
let cur = -1, busy = false, finaleDone = false;

function letterRect(){
  const xs = [], ys = [];
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b]) => { _v.set(a*LW/2, b*LH/2, 0); letter.localToWorld(_v); _v.project(camera); xs.push((_v.x*.5+.5)*W()); ys.push((-_v.y*.5+.5)*H()); });
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w:Math.max(...xs)-x, h:Math.max(...ys)-y };
}
function openLetter(){
  if(S.mode !== 'letter') return; S.mode = 'opening'; hideGhost(); clearTimeout(hintTimer);
  haptic([12,30,18]); Snd.whoosh(.9,.2); Snd.note(PENT[3], .12, 2); Snd.note(PENT[5], .1, 2.2, .1);
  markPip(6);
  const r = letterRect(), fw = Math.min(W()*.88,500), fh = Math.min(H()*.72,620), fx = (W()-fw)/2, fy = (H()-fh)/2;
  gsap.set(letterEl, { autoAlpha:1, margin:0, left:r.x, top:r.y, width:r.w, height:r.h, '--pa':.95, '--rad':'6px', transformPerspective:1100 });
  letter.visible = false;
  gsap.timeline({ onComplete:() => { gsap.set(letterEl, { clearProps:'left,top,width,height,margin' }); S.mode = 'reading'; } })
    .to(dock, { autoAlpha:0, duration:.3 }, 0)
    .to(letterEl, { left:fx, top:fy, width:fw, height:fh, duration:1.25, ease:'expo.inOut' }, 0)
    .to(letterEl, { '--pa':.09, '--rad':'30px', duration:1, ease:'power2.inOut' }, .2)
    .call(() => { dock.classList.remove('pips'); buildDots(CONFIG.pages.length); showPage(0,1); }, null, .95)
    .to(dock, { autoAlpha:1, duration:.7 }, 1.1);
}

function showPage(n, dir=1){
  if(busy || n === cur) return; busy = true;
  const prev = pagesEl[cur], next = pagesEl[n];
  const tl = gsap.timeline({ onComplete:() => { busy = false; } });
  if(prev) tl.to(prev, { opacity:0, x:-28*dir, filter:'blur(8px)', duration:.4, ease:'power2.in' }).set(prev, { visibility:'hidden' });
  tl.set(next, { visibility:'visible', opacity:1, x:0, filter:'none' });
  tl.fromTo(next.querySelectorAll('.w'), { opacity:0, y:10, filter:'blur(8px)' },
    { opacity:1, y:0, filter:'blur(0px)', duration:.9, ease:'power3.out', stagger:.045, clearProps:'filter,transform' }, '<');
  cur = n;
  pips.forEach((d,k) => d.classList.toggle('on', k === cur));
  prevB.disabled = cur <= 0; nextB.disabled = cur >= pagesEl.length-1;
  haptic(6); Snd.note(PENT[(n*2)%5], .06, 1.3);
  if(cur === pagesEl.length-1 && !finaleDone){ finaleDone = true; gsap.delayedCall(.5, finaleFx); }
}
function finaleFx(){
  chord([0,2,4,5]); haptic([10,50,10,50,24]);
  const p = new THREE.Vector3(0,.8,0); cube.localToWorld(p); burst(p, 120, 3.2, 1.4);
}
const next = () => { if(S.mode !== 'reading' || busy || cur < 0 || cur >= pagesEl.length-1) return; showPage(cur+1, 1); };
const prev = () => { if(S.mode !== 'reading' || busy || cur <= 0) return; showPage(cur-1, -1); };
nextB.addEventListener('click', next); prevB.addEventListener('click', prev);
redoB.addEventListener('click', () => {
  Snd.note(PENT[0], .1, 1.5); gsap.to($('#veil'), { opacity:1, duration:.7, onComplete:() => location.reload() });
});
addEventListener('keydown', e => {
  if(S.mode === 'code' && /^[0-9]$/.test(e.key)){ pressKeyIdx(KEYDEFS.indexOf(e.key)); return; }
  if(S.mode === 'code' && e.key === 'Backspace'){ pressKeyIdx(KEYDEFS.indexOf('C')); return; }
  if(S.mode === 'code' && e.key === 'Enter'){ e.preventDefault(); submit(); return; }
  if(e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); next(); }
  if(e.key === 'ArrowLeft') prev();
});
let wheelLock = 0;
addEventListener('wheel', e => {
  const m = Math.abs(e.deltaY)+Math.abs(e.deltaX);
  if(S.mode !== 'reading' || performance.now() < wheelLock || m < 20) return;
  wheelLock = performance.now()+800; (e.deltaY+e.deltaX) > 0 ? next() : prev();
}, { passive:true });
let sw = null;
letterEl.addEventListener('pointerdown', e => { sw = { x:e.clientX, y:e.clientY }; });
letterEl.addEventListener('pointerup', e => {
  if(!sw) return; const dx = e.clientX-sw.x, dy = e.clientY-sw.y; sw = null;
  if(S.mode !== 'reading') return;
  if(Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? next() : prev();
  else if(Math.hypot(dx,dy) < 10) next();
});
letterEl.addEventListener('pointercancel', () => { sw = null; });

/* ════════════════════════════════════════════════
   CON TRỎ / CHẠM
   ════════════════════════════════════════════════ */
let P = null;
const WANT = ['dial','slider','peg','orb'];
function startRot(e){ rot.drag = true; rot.vYaw = rot.vPitch = 0; P.lx = e.clientX; P.ly = e.clientY; P.lt = performance.now(); }
function moveRot(e){
  const now = performance.now(), dx = e.clientX-P.lx, dy = e.clientY-P.ly, dtt = Math.max(.008,(now-P.lt)/1000), k = .0085;
  rot.tYaw += dx*k;
  if(S.mode === 'play' || S.mode === 'transition') rot.tPitch = clamp(-.6,.9,rot.tPitch + dy*k*.8);
  rot.vYaw = clamp(-9,9, rot.vYaw*.4 + (dx*k/dtt)*.6);
  P.lx = e.clientX; P.ly = e.clientY; P.lt = now;
}
function endRot(){ rot.drag = false; rot.idle = 0; }

canvas.addEventListener('pointerdown', e => {
  if(P) return; e.preventDefault(); Snd.init(); askMotion(); hideGhost(); clearTimeout(hintTimer);
  const hit = (S.mode === 'play' || S.mode === 'letter' || S.mode === 'transition' || S.mode === 'code') ? pick(e.clientX, e.clientY) : null;
  P = { id:e.pointerId, x0:e.clientX, y0:e.clientY, t0:performance.now(), kind:'none', hit };
  try { canvas.setPointerCapture(e.pointerId); } catch(_){}
  if(S.mode === 'wait'){ startIntro(); return; }
  if(S.mode === 'play'){
    const want = WANT[S.stage];
    if(hit && hit.kind === want){
      P.kind = want;
      if(want === 'dial'){ const D = MECH.dial, c = toScreen(D.spin); D.cx = c.x; D.cy = c.y; D.prev = Math.atan2(e.clientY-c.y, e.clientX-c.x); D.vel = 0; D.last = performance.now(); D.held = true; haptic(6); }
      else if(want === 'slider'){ const L = MECH.slider; L.off = sliderT(e.clientX, e.clientY) - L.t; L.held = true; haptic(6); }
      else if(want === 'peg'){ pressPeg(hit.idx); }
      else if(want === 'orb'){ MECH.orb.hold = true; haptic(8); }
    } else {
      if(hit && WANT.includes(hit.kind)) locked();
      P.kind = 'rot'; startRot(e);
    }
  } else if(S.mode === 'code'){
    if(hit && hit.kind === 'key'){ P.kind = 'key'; pressKeyIdx(hit.idx); }
    else { P.kind = 'rot'; startRot(e); }
  } else if(S.mode === 'unfold'){ P.kind = 'pull'; }
  else if(S.mode === 'letter'){ if(hit && hit.kind === 'letter') P.kind = 'lift'; else { P.kind = 'rot'; startRot(e); } }
  else if(S.mode === 'transition' || S.mode === 'rise' || S.mode === 'reading'){ P.kind = 'rot'; startRot(e); }
});
canvas.addEventListener('pointermove', e => {
  if(!P || e.pointerId !== P.id) return;
  if(P.kind === 'dial'){
    const D = MECH.dial, a = Math.atan2(e.clientY-D.cy, e.clientX-D.cx);
    if(Math.hypot(e.clientX-D.cx, e.clientY-D.cy) > 22){
      let d = a - D.prev; if(d > Math.PI) d -= Math.PI*2; if(d < -Math.PI) d += Math.PI*2;
      const now = performance.now(), dtt = Math.max(.008,(now-D.last)/1000); D.last = now;
      D.vel = D.vel*.5 + (d/dtt)*.5; dialAdvance(d);
    }
    D.prev = a;
  } else if(P.kind === 'slider'){
    const L = MECH.slider; L.target = clamp(0,1, sliderT(e.clientX,e.clientY) - L.off);
  } else if(P.kind === 'peg'){
    const h = pick(e.clientX, e.clientY); if(h && h.kind === 'peg') pressPeg(h.idx);
  } else if(P.kind === 'pull'){
    const d = Math.hypot(e.clientX-P.x0, e.clientY-P.y0); S.uT = clamp(0,1,d/(Math.min(W(),H())*.42));
  } else if(P.kind === 'lift'){
    const dy = e.clientY-P.y0; P.lift = clamp(0,1,-dy/120); if(dy < -55){ P.kind = 'none'; P = null; openLetter(); return; }
  } else if(P.kind === 'rot'){ moveRot(e); }
});
const release = e => {
  Snd.init();
  if(!P || (e && e.pointerId !== P.id)) return;
  const k = P.kind, tap = Math.hypot((e?e.clientX:P.x0)-P.x0, (e?e.clientY:P.y0)-P.y0) < 8 && performance.now()-P.t0 < 400;
  if(k === 'rot') endRot();
  else if(k === 'dial') MECH.dial.held = false;
  else if(k === 'slider') MECH.slider.held = false;
  else if(k === 'orb') MECH.orb.hold = false;
  else if(k === 'pull'){
    if(S.uT > .55) finishUnfold();
    else {
      gsap.to(S, { u:0, uT:0, duration:1, ease:'elastic.out(1,.55)' });
      if(tap){ Snd.click(800,.25,2,.08); haptic(8); gsap.fromTo(S,{ u:.0 },{ u:.12, duration:.22, yoyo:true, repeat:1, ease:'power2.out', overwrite:true }); }
    }
  } else if(k === 'lift'){ if(tap) { P = null; openLetter(); return; } }
  P = null;
  if(['play','unfold','letter'].includes(S.mode)) armHint();
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('contextmenu', e => e.preventDefault());

addEventListener('pointermove', e => {
  if(e.pointerType === 'mouse'){ par.tx = (e.clientX/W()-.5)*2; par.ty = (e.clientY/H()-.5)*2; }
});
let motionBound = false;
function bindMotion(){
  if(motionBound) return; motionBound = true;
  addEventListener('deviceorientation', e => {
    if(e.gamma == null) return;
    par.tx = clamp(-1,1,e.gamma/24); par.ty = clamp(-1,1,(e.beta-50)/24);
  });
}
function askMotion(){
  if(!isTouch || motionBound) return;
  const D = window.DeviceOrientationEvent;
  if(D && typeof D.requestPermission === 'function') D.requestPermission().then(r => { if(r === 'granted') bindMotion(); }).catch(() => {});
  else bindMotion();
}
document.addEventListener('gesturestart', e => e.preventDefault());
addEventListener('touchend', () => Snd.init(), { passive:true });
addEventListener('click', () => Snd.init());

const snd = $('#snd');
snd.addEventListener('click', () => { Snd.init(); Snd.setMuted(!Snd.muted); snd.classList.toggle('muted', Snd.muted); });

/* ════════════════════════════════════════════════
   VÒNG LẶP
   ════════════════════════════════════════════════ */
let last = performance.now();
function frame(){
  const now = performance.now(), dt = Math.min(.05, (now-last)/1000), time = now/1000; last = now;

  par.x += (par.tx-par.x)*(1-Math.exp(-dt*4)); par.y += (par.ty-par.y)*(1-Math.exp(-dt*4));
  document.documentElement.style.setProperty('--lx', (-1-par.x*1.5).toFixed(2));
  document.documentElement.style.setProperty('--ly', (-1-par.y*1.5).toFixed(2));

  /* chấm khởi đầu */
  if(S.mode === 'wait'){
    const s = 1 + Math.sin(time*2.2)*.12; dot.scale.setScalar(s);
    const q = (time*.55) % 1; dotRing.scale.setScalar(1 + q*3.2); dotRingMat.opacity = (1-q)*.5;
    dot.position.set(par.x*.15, -par.y*.1, 0); dotRing.position.copy(dot.position);
  } else { dotRing.visible = S.mode === 'intro'; }

  /* xoay hộp */
  if(!rot.drag){
    rot.idle += dt;
    rot.tYaw += rot.vYaw*dt; rot.tPitch += rot.vPitch*dt; rot.vYaw *= Math.exp(-dt*3); rot.vPitch *= Math.exp(-dt*3);
    if(S.mode === 'play' || S.mode === 'transition' || S.mode === 'unfold' || S.mode === 'code'){
      if(rot.idle > .9){
        const stg = (S.mode === 'unfold' || S.mode === 'code') ? 4 : S.stage, by = baseYaw(stg, rot.tYaw),
              bp = S.mode === 'unfold' ? 0 : S.mode === 'code' ? BOT : .12, k = 1-Math.exp(-dt*3.2);
        rot.tYaw += (by-rot.tYaw)*k; rot.tPitch += (bp-rot.tPitch)*k;
      }
    } else if(S.mode === 'letter' || S.mode === 'rise' || S.mode === 'opening' || S.mode === 'reading'){
      rot.tPitch += (0-rot.tPitch)*(1-Math.exp(-dt*3));
    }
  }
  const kk = 1-Math.exp(-dt*12);
  rot.yaw += (rot.tYaw-rot.yaw)*kk; rot.pitch += (rot.tPitch-rot.pitch)*kk;
  cube.rotation.set(rot.pitch + par.y*.05, rot.yaw + par.x*.1, 0, 'XYZ');
  cube.position.x = S.shk;
  cube.position.y = S.u < .01 ? Math.sin(time*.9)*.025 : 0;

  /* dial: quán tính */
  const D = MECH.dial;
  if(S.mode === 'play' && S.stage === 0 && !D.done && !D.held && Math.abs(D.vel) > .08){
    const d = D.vel*dt; D.vel *= Math.exp(-dt*2.4); dialAdvance(d);
  }
  /* slider */
  const L = MECH.slider;
  if(S.mode === 'play' && S.stage === 1 && !L.done){
    L.t += (L.target-L.t)*(1-Math.exp(-dt*22));
    L.knob.position.x = lerp(-.64,.64,L.t);
    const n = Math.floor(L.t*10 + .0001);
    L.segs.forEach((s,i) => { const on = (i+.5)/10 <= L.t + .001; if(s.userData.on !== on){ s.userData.on = on; gsap.to(s.material,{ emissiveIntensity:on?2.6:0, duration:.2 }); gsap.to(s.material.color,{ r:on?1:.17, g:on?1:.18, b:on?1:.19, duration:.2 }); } });
    const tk = Math.floor(L.t*10); if(tk !== L.ticks){ L.ticks = tk; Snd.click(2000+tk*80,.2,5,.035); haptic(4); }
    if(L.t >= .985){ L.done = true; L.held = false; L.t = 1; L.target = 1; gsap.to(L.knob.position,{ x:.64, duration:.15 }); L.segs.forEach(s => { s.userData.on = true; s.material.emissiveIntensity = 2.6; s.material.color.setRGB(1,1,1); }); stageDone(1); }
  }
  /* orb */
  const O = MECH.orb;
  if(S.mode === 'play' && S.stage === 3 && !O.done){
    if(O.hold) O.charge = Math.min(1, O.charge + dt/3.2); else O.charge = Math.max(0, O.charge - dt*1.4);
    if(O.charge > .02){ O.beatT += dt*(1 + O.charge*1.3); if(O.beatT >= 1){ O.beatT = 0; beat(); } } else O.beatT = .9;
    const n = Math.floor(O.charge*24); O.leds.forEach((l,i) => ledSet(l, i < n, false));
    if(O.charge >= 1){ O.done = true; O.hold = false; O.kick = 1.6; Snd.thump(.8); haptic([30,50,60]); const w = new THREE.Vector3(); O.group.getWorldPosition(w); burst(w, 70, 2.2, .3); stageDone(3); }
  }
  O.kick *= Math.exp(-dt*8);
  const sleep = (O.charge < .02 && !O.done) ? .25 + .1*Math.sin(time*1.5) : 0;
  const ch = Math.max(O.charge, O.done ? 1 : 0);
  O.group.scale.setScalar(1 + ch*.08 + O.kick*.1);
  O.core.scale.setScalar(.8 + ch*.45 + O.kick*.25);
  O.coreMat.color.setRGB(lerp(.29,1,Math.min(1,ch+sleep)), lerp(.13,.36,Math.min(1,ch+sleep)), lerp(.16,.45,Math.min(1,ch+sleep)));

  /* mở hộp */
  if(P && P.kind === 'pull'){
    const prevU = S.u; S.u += (S.uT-S.u)*(1-Math.exp(-dt*14));
    if(Math.floor(S.u*10) !== Math.floor(prevU*10)){ Snd.click(1100+S.u*900,.18,4,.04); haptic(5); }
  }
  applyOpen(S.u);

  /* thư */
  const rs = S.rise;
  letter.position.y = lerp(-.32, 1.0, rs) + Math.sin(time*1.6)*.025*rs + (P && P.kind === 'lift' ? (P.lift||0)*.25 : 0);
  letter.position.z = lerp(0, .15, rs);
  letter.rotation.x = -(lerp(.1,.66,smooth(S.u)) - .12*rs)*rs;
  const ls = 1 + Math.sin(time*2.2)*.012*rs; letter.scale.setScalar(ls*lerp(1,1.22,rs));

  /* DOM nghiêng theo con trỏ */
  if(S.mode === 'reading' && !letterEl.dataset.fx) gsap.set(letterEl, { rotationY:par.x*5, rotationX:-par.y*4 });

  updateCamera(); updateSparks(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* debug (chỉ khi mở với ?debug) */
if(location.search.includes('debug')) window.__love = { S, MECH, KEY, camera, cube, toScreen, pick, letter, rot, THREE, getP:()=>P, par, enterCode, mechOpen, codeOK, codeBad };
