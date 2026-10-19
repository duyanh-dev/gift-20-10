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
    { title: 'Dear empe,', text: 'Kaka đầu tiên thì anh chúc cho iu của anh 20/10 thật xinh đẹp nhó, mặc dù lúc nào em cũng xinh đẹp nhất với anh, anh chúc iu lúc nào cũng xinh đẹp nhất, vui vẻ nhất, hạnh phúc nhất nhen,' },
    { text: 'Chúc mừng 20/10 của em và chúc mừng anni 2 năm 3 tháng của chúng mình nhó. Babi chịu thiệt nhiều rùi, anh thương bé lắm, chúng mình cùng cố gắng nhen.' },
    { text: 'Kaka 2 năm 3 tháng đi với nhau rồi nhỉ, vui có buồn có, nhưng mà chún mìn vẫn có nheo iu nhỉ. Đây này kaka mãi đến giờ mới code cho người iu nhỉ, anh tệ ha cục vàng, cơ mà anh thương babi lắm,' },
    { text: 'anh thấy em thích nhiều thứ mà anh chưa mua cho babi được, thui thì bé cố gắng thời gian này nhó, anh sẽ mang tiền về cho chún mình, tin anh kaka.' },
    { text: 'Anh tặng babi trước thùng quà tình iu tự tay anh làm ra nhó, anh sẽ tặng cho babi nhìu hơn nữaa. Anh thương babi lắmm, anh iu emm. Chúc mừng anni chúng ta và chúc cho em 20/10 thật đặc biệt nhó.' },
    { text: 'I’m trying my best. I’m trying my best to be okay. I’m trying my best, but every day it’s so hard. But through it all, I’m lucky to have you.', sign: 'Iu của em, Duy Anh' }
  ],
  /* mật mã mặt đáy (ngày + tháng kỷ niệm) */
  code: '2007',
  /* 3 ảnh instax: điền đường dẫn ảnh vào src (để trống = ảnh mẫu) */
  photos: [
    { src:'./images/anni_1.jpg', caption:'photobooth đầu tiên' },
    { src:'./images/anni_2.jpg', caption:'luv uuuu' },
    { src:'./images/anni_3.jpg', caption:'my favv keke:)' }
  ],
    /* nhạc nền mp3: phát sau khi hộp đã bung ra (trước đó vẫn là âm thanh tổng hợp) */
  music: {
    enabled: true,                
    src: './music/Trying My Best.mp3',     
    startAt: 0,                  
    volume: 0.7,                 
    synthAfterOpen: true           
  },
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
    let ctx=null, master=null, noise=null, wet=null, muted=false, fxOff=false;
  const init = () => {
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext; if(!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = (muted || fxOff) ? 0 : .6; master.connect(ctx.destination);
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
        /* bật/tắt toàn bộ âm thanh tổng hợp */
    setMuted(m){ muted = m; if(master) master.gain.value = (m || fxOff) ? 0 : .6; },
    /* tắt riêng hiệu ứng tổng hợp (dùng khi chỉ muốn nghe mp3) */
    setFxOff(f){ fxOff = f; if(master) master.gain.value = (muted || f) ? 0 : .6; },
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
   NHẠC NỀN MP3 — phát sau khi hộp bung ra
   startAt (phút) lấy từ CONFIG.music, hết bài thì quay lại đúng mốc đó
   ════════════════════════════════════════════════ */
const Music = (() => {
  const cfg = CONFIG.music || {};
  let a = null, muted = false, started = false;
  const fade = { v:0 };
  const vol = () => muted ? 0 : (cfg.volume ?? .6);
  /* tua tới phút bắt đầu */
  const seek = () => { try { a.currentTime = Math.max(0, (cfg.startAt || 0) * 60); } catch(e){} };
  return {
    /* bắt đầu phát (gọi trong lúc người dùng đang chạm để trình duyệt cho phép) */
    start(){
      if(started || !cfg.enabled || !cfg.src) return; started = true;
      a = new Audio(cfg.src); a.preload = 'auto'; a.volume = 0;
      a.addEventListener('loadedmetadata', seek, { once:true });
      a.addEventListener('ended', () => { seek(); a.play().catch(() => {}); });   /* lặp lại từ mốc startAt */
      a.play().catch(() => {});
      gsap.to(fade, { v:1, duration:2.5, onUpdate:() => { a.volume = clamp(0,1, vol()*fade.v); } });
    },
    /* bật/tắt tiếng cùng nút loa */
    setMuted(m){ muted = m; if(a) a.volume = clamp(0,1, vol()*fade.v); }
  };
})();

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
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1c1218);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
scene.environmentIntensity = 1.0;

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
  document.documentElement.style.setProperty('--lw', Math.min(w*.88,500)+'px');
  document.documentElement.style.setProperty('--lh', Math.min(h*.7,620)+'px');
}
addEventListener('resize', resize); resize();

/* ── materials (hồng pastel) ─────────────────── */
const M = {
  body : new THREE.MeshStandardMaterial({ color:0xf6bdd0, roughness:.42, metalness:.12 }),
  inner: new THREE.MeshStandardMaterial({ color:0xfbd9e4, roughness:.6, metalness:.05 }),
  metal: new THREE.MeshStandardMaterial({ color:0xeec3cc, roughness:.25, metalness:.9 }),
  rib  : new THREE.MeshStandardMaterial({ color:0xc9728f, roughness:.4, metalness:.5 }),
  dark : new THREE.MeshStandardMaterial({ color:0x6b3347, roughness:.6, metalness:.2 }),
  coral: new THREE.MeshBasicMaterial({ color:0xe5334f }),
  paper: new THREE.MeshBasicMaterial({ color:0xf4f2ee, side:THREE.DoubleSide }),
  bar  : new THREE.MeshBasicMaterial({ color:0xc4c6cc }),
};
const GEO = {
  slab : new RoundedBoxGeometry(1.94,1.94,.14,3,.045),
  flat : new RoundedBoxGeometry(1.94,.14,1.94,3,.045),
  screw: new THREE.CylinderGeometry(.032,.032,.025,16),
  slot : new THREE.BoxGeometry(.05,.004,.011),
  riv  : new THREE.CylinderGeometry(.018,.018,.012,10),
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
  const mat = new THREE.MeshStandardMaterial({ color:0x2b2c31, roughness:.45, metalness:.3, emissive:0x28f0a0, emissiveIntensity:0 });
  const g = geo || (ledGeo[r] = ledGeo[r] || GEO.led(r));
  const m = new THREE.Mesh(g, mat); m.rotation.x = Math.PI/2; m.userData.on = false; return m;
}
function ledSet(l, on, pop=true){
  if(l.userData.on === on) return; l.userData.on = on;
  const m = l.material;
  gsap.to(m, { emissiveIntensity: on ? 2.6 : 0, duration:.22 });
  gsap.to(m.color, { r: on?.16:.17, g: on?.94:.18, b: on?.63:.19, duration:.22 });
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
const sides = [], SCREWS = [];
function makeSide(k, openDeg){
  const root  = new THREE.Group(); root.rotation.y = k*Math.PI/2;
  const slide = new THREE.Group();
  const hinge = new THREE.Group(); hinge.position.set(0,-.97,1);
  const panel = new THREE.Group(); panel.position.set(0,.97,0);
  const slab  = new THREE.Mesh(GEO.slab, M.body);
  const lining = new THREE.Mesh(new THREE.PlaneGeometry(1.68,1.68), M.inner); lining.rotation.y = Math.PI; lining.position.z = -.0715;
  const face  = new THREE.Group(); face.position.z = .07;
  /* lớp nền, khung viền kim loại nổi và đinh tán cho cảm giác cứng cáp */
  {
    const l1 = new THREE.Mesh(new RoundedBoxGeometry(1.8,1.8,.012,2,.03), M.rib); l1.position.z = .006; face.add(l1);
    const l2 = new THREE.Mesh(new RoundedBoxGeometry(1.7,1.7,.012,2,.025), M.inner); l2.position.z = .011; face.add(l2);
    [[0,.9,1.8,.07],[0,-.9,1.8,.07],[.9,0,.07,1.8],[-.9,0,.07,1.8]].forEach(([x,y,w,h]) => {
      const r = new THREE.Mesh(new RoundedBoxGeometry(w,h,.04,2,.015), M.metal); r.position.set(x,y,.02); face.add(r);
    });
    for(let i=-3;i<=3;i++) [[i*.28,.9],[i*.28,-.9],[.9,i*.28],[-.9,i*.28]].forEach(([x,y]) => {
      const rv = new THREE.Mesh(GEO.riv, M.rib); rv.rotation.x = Math.PI/2; rv.position.set(x,y,.042); face.add(rv);
    });
  }
  root.add(slide); slide.add(hinge); hinge.add(panel); panel.add(slab, lining, face);
  [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(([a,b]) => {
    const s = new THREE.Mesh(GEO.screw, M.metal); s.rotation.x = Math.PI/2; s.position.set(a*.82,b*.82,.02); face.add(s);
    const sl = new THREE.Mesh(GEO.slot, M.dark); sl.position.y = .0135; s.add(sl); SCREWS.push(s);
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
  /* thêm lớp đế + vòng đệm quanh đĩa */
  {
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(.47,.49,.04,64), M.rib); pl.position.y = .06; lid.add(pl);
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(.49,.016,10,96), M.metal); r2.rotation.x = Math.PI/2; r2.position.y = .082; lid.add(r2);
  }

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
  /* cụm bánh răng ăn khớp trên nắp (2 hàng × 5 bánh) */
  function gearGeo(N, rp, depth, holeR){
    const ro = rp + .012, ri = rp - .02, step = Math.PI*2/N, sh = new THREE.Shape();
    for(let i=0;i<N;i++){
      const a = i*step;
      [[ri,-.30],[ro,-.16],[ro,.16],[ri,.30]].forEach(([r,f],j) => {
        const x = Math.cos(a+f*step)*r, y = Math.sin(a+f*step)*r;
        (i === 0 && j === 0) ? sh.moveTo(x,y) : sh.lineTo(x,y);
      });
    }
    sh.closePath();
    const hole = new THREE.Path(); hole.absarc(0,0,holeR || rp*.28,0,Math.PI*2,true); sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled:true, bevelThickness:.002, bevelSize:.002, bevelSegments:1, curveSegments:14 });
    g.rotateX(-Math.PI/2); return g;
  }
  lidParts.gears = [];
  const GX = [-.4,-.2,0,.2,.4], GR = [.12,.08,.12,.08,.12], GP = [0,Math.PI/10,Math.PI/15,0,0];
  [.64,-.64].forEach(zz => GX.forEach((xx,i) => {
    const N = Math.round(GR[i]/.008);
    const m = new THREE.Mesh(gearGeo(N, GR[i], .028), i%2 ? M.rib : M.metal); m.position.set(xx,.071,zz); m.rotation.y = GP[i]; lid.add(m);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(GR[i]*.16,GR[i]*.16,.05,16), M.dark); pin.position.set(xx,.085,zz); lid.add(pin);
    lidParts.gears.push({ m, dir: i%2 ? -1 : 1, ratio: 15/N, phi: GP[i] });
  }));
  /* bánh răng vành lớn quanh đĩa — ăn khớp với cụm bánh răng, quay ngược chiều */
  {
    const rg = new THREE.Mesh(gearGeo(72, .58, .03, .5), M.rib); rg.position.set(0,.071,0); lid.add(rg);
    lidParts.gears.push({ m:rg, dir:-1, ratio:.3, phi:0 });
  }
  /* 2 cột đèn LED chạy dọc hai bên nắp */
  lidParts.leds = [];
  [-.7,.7].forEach((xx,c) => { for(let i=0;i<9;i++){
    const l = makeLED(.026); l.rotation.x = 0; l.position.set(xx,.077, c ? .5-i*.125 : -.5+i*.125); lid.add(l); lidParts.leds.push(l);
  } });
  /* 4 càng kẹp ở góc nắp — xoay bật ra trước khi nâng */
  lidParts.clamps = [[1,1],[-1,1],[1,-1],[-1,-1]].map(([a,b]) => {
    const g = new THREE.Group(); g.position.set(a*.84,.078,b*.84); lid.add(g);
    const arm = new THREE.Mesh(new RoundedBoxGeometry(.22,.05,.1,2,.015), M.metal); arm.position.set(-a*.09,.025,0); g.add(arm);
    const pv = new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.07,20), M.rib); pv.position.y = .035; g.add(pv);
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.01,12), M.dark); bolt.position.y = .074; g.add(bolt);
    return { g, a, b, x:g.position.x, z:g.position.z };
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
function setGears(th){ lidParts.gears.forEach(g => { g.m.rotation.y = g.phi + g.dir*g.ratio*th; }); }
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
  const bez2 = new THREE.Mesh(new THREE.TorusGeometry(.75,.03,10,96), M.rib); bez2.position.z = .028; f.add(bez2);
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
  [.17,-.17].forEach(y => { const r = new THREE.Mesh(new THREE.BoxGeometry(1.66,.025,.03), M.metal); r.position.set(0,y,.035); f.add(r); });
  const segs = [];
  for(let i=0;i<10;i++){
    const m = new THREE.MeshStandardMaterial({ color:0x2b2c31, roughness:.45, metalness:.3, emissive:0x28f0a0, emissiveIntensity:0 });
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
const LIT  = { w:new THREE.Color(0xff1f3a), g:new THREE.Color(0x7dffb8), r:new THREE.Color(0xff4d5e), o:new THREE.Color(0x00d43a) };
const OFFC = new THREE.Color(.07,.07,.08);
const SEGMASK = {
  '0':'abcdef','1':'bc','2':'abdeg','3':'abcdg','4':'bcfg','5':'acdfg','6':'acdefg','7':'abc','8':'abcdefg','9':'abcdfg',
  '-':'g',' ':'', 'O':'abcdef','P':'abefg','E':'adefg','n':'ceg','r':'eg'
};
const KEYDEFS = ['1','2','3','4','5','6','7','8','9','C','0','OK'];

const kf = new THREE.Group(); kf.position.y = -1.07; kf.rotation.x = Math.PI/2; baseSlide.add(kf);
const kLight = new THREE.PointLight(0xfff0e0, 0, 6, 1.5); kLight.position.set(0,.15,.95); kf.add(kLight);
{
  const plateMat = new THREE.MeshStandardMaterial({ color:0xd98aa6, roughness:.45, metalness:.5 });
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
  const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(1.36,.36), new THREE.MeshBasicMaterial({ color:0x050507 }));
  glassPane.position.set(0,.64,.1205); kf.add(glassPane);

  function segGeo(len, th, depth){
    const s = new THREE.Shape(), h = th/2;
    s.moveTo(-len/2,0); s.lineTo(-len/2+h,h); s.lineTo(len/2-h,h); s.lineTo(len/2,0); s.lineTo(len/2-h,-h); s.lineTo(-len/2+h,-h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled:true, bevelThickness:.004, bevelSize:.004, bevelSegments:1, curveSegments:1 });
    g.translate(0,0,-depth/2); return g;
  }
  const gH = segGeo(.15,.042,.03), gV = segGeo(.14,.042,.03);
  const w = .19, h = .29;
  const SPOS = { a:[0,h/2,0], b:[w/2,h/4,1], c:[w/2,-h/4,1], d:[0,-h/2,0], e:[-w/2,-h/4,1], f:[-w/2,h/4,1], g:[0,0,0] };
  [-.45,-.15,.15,.45].forEach(cx => {
    const g = new THREE.Group(); g.position.set(cx,.64,.128); kf.add(g);
    const segs = {};
    Object.keys(SPOS).forEach(k => {
      const [x,y,vert] = SPOS[k];
      const mat = new THREE.MeshStandardMaterial({ color:0x121214, roughness:.4, metalness:.3, emissive:0xfff0d8, emissiveIntensity:0, toneMapped:false });
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
      x.strokeStyle = '#2fa36b'; x.lineWidth = 11; x.beginPath(); x.moveTo(42,62); x.lineTo(70,88); x.lineTo(120,32); x.stroke();
    } else if(lab === 'C'){
      x.strokeStyle = '#d6455f'; x.lineWidth = 10;
      x.beginPath(); x.moveTo(30,60); x.lineTo(56,34); x.lineTo(124,34); x.lineTo(124,86); x.lineTo(56,86); x.closePath(); x.stroke();
      x.beginPath(); x.moveTo(74,50); x.lineTo(102,70); x.moveTo(102,50); x.lineTo(74,70); x.stroke();
    } else {
      x.fillStyle = '#7a2742'; x.font = '500 80px "Be Vietnam Pro", -apple-system, system-ui, sans-serif';
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
    const mat = new THREE.MeshStandardMaterial({ color:0xfbd9e4, roughness:.35, metalness:.25, emissive:0xffffff, emissiveIntensity:0 });
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
    gsap.to(m, { emissiveIntensity: on ? level*.3 : 0, duration:.18, overwrite:true });
    gsap.to(m.color, { r:c.r, g:c.g, b:c.b, duration:.18, overwrite:true });
  });
}
function showWord(word, tone='w', level=3){ for(let i=0;i<4;i++) paintDigit(i, word[i] || ' ', tone, level); }
function refreshDisplay(pop){
  for(let i=0;i<4;i++){
    const ch = KEY.buf[i];
    if(ch) paintDigit(i, ch, 'w', 3.4); else paintDigit(i, '-', 'w', .5);
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

/* ── lá thư (nằm trong phong bì, ẩn tới khi mở phong bì) ── */
const LW = 1.5, LH = 1.06;
const letter = new THREE.Group(); letter.position.set(0,-.32,0); cube.add(letter); letter.visible = false;
const paper = new THREE.Mesh(new THREE.PlaneGeometry(LW,LH), M.paper); letter.add(paper);
{
  [[.0,.3,.9],[.0,.12,.78],[.0,-.06,.84],[.0,-.24,.5]].forEach(([x,y,w]) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w*LW*.72,.04), M.bar); b.position.set(-LW*.72*(1-w)/2*.5 - .02, y*1.0, .002); letter.add(b);
  });
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(LW,LH)), new THREE.LineBasicMaterial({ color:0xffffff })); edge.raycast = () => {}; letter.add(edge);
  const h = hitMesh(new THREE.PlaneGeometry(LW*1.25,LH*1.25), 'letter'); h.position.z = .02; letter.add(h);
}

/* ── ảnh instax + phong bì trên mặt đáy hộp ───── */
const LT = { e:0, o:0 }, ENV = { x:0, y:1.0, z:.28, s:1.15, rx:Math.PI/2 - .45 }, LS = { x:0, y:.5, z:.2 };
const items = new THREE.Group(); items.position.y = -.925; items.visible = false; cube.add(items);
const photoCv = [];
function photoCanvas(i){
  const c = document.createElement('canvas'); c.width = 432; c.height = 688;
  const x = c.getContext('2d'), ph = CONFIG.photos[i] || {}, ix = 28, iy = 30, iw = 376, ih = 500;
  const draw = img => {
    x.fillStyle = '#fffaf6'; x.fillRect(0,0,432,688);
    if(img){
      const r = Math.max(iw/img.width, ih/img.height), w = img.width*r, h = img.height*r;
      x.save(); x.beginPath(); x.rect(ix,iy,iw,ih); x.clip(); x.drawImage(img, ix+(iw-w)/2, iy+(ih-h)/2, w, h); x.restore();
    } else {
      const g = x.createLinearGradient(0,iy,iw,iy+ih);
      g.addColorStop(0,['#ffd1dc','#fde2b8','#cfe3ff'][i%3]); g.addColorStop(1,['#f7a8c0','#f9c7a0','#e0c8ff'][i%3]);
      x.fillStyle = g; x.fillRect(ix,iy,iw,ih);
      x.fillStyle = 'rgba(255,255,255,.88)'; x.beginPath(); x.moveTo(216,370);
      x.bezierCurveTo(130,310,140,210,216,262); x.bezierCurveTo(292,210,302,310,216,370); x.fill();
    }
    x.fillStyle = '#8a4a5e'; x.font = '36px "Patrick Hand", cursive'; x.textAlign = 'center'; x.fillText(ph.caption || '', 216, 612);
  };
  draw(null);
  if(ph.src){ const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { draw(im); if(c.tex) c.tex.needsUpdate = true; }; im.src = ph.src; }
  return c;
}
/* ════════════════════════════════════════════════
   VƯỜN CÂY — mầm non → tưới nước → lá + ảnh → hoa + phong bì
   ════════════════════════════════════════════════ */
const SRGB = THREE.SRGBColorSpace;
const GR = { w:0, stage:0, on:false, busy:false, done:false, sf:.2, sT:.2, can:0, wig:0, emit:0, snd:0, tipHid:false };
const WTH = [.25,.5,.75,1];                       /* mốc nước để mọc lá 1, 2, 3 và hoa */
const POUR_RATE = .11;                            /* tốc độ tưới: tăng = lớn nhanh hơn */
const bbY = () => { const a = cube.rotation.y; return -(a - Math.PI*2*Math.round(a/(Math.PI*2))); };
const garden = new THREE.Group(); garden.scale.setScalar(1.2); items.add(garden);
const plant  = new THREE.Group(); plant.position.set(0,.26,0); garden.add(plant);
const _ta = new THREE.Vector3(), _sp = new THREE.Vector3(), _st = new THREE.Vector3(), _sn = new THREE.Vector3(), _sb = new THREE.Vector3(), _sc = new THREE.Color();

function radialTex(stops, size=128){
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const g = x.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  stops.forEach(([o,col]) => g.addColorStop(o,col)); x.fillStyle = g; x.fillRect(0,0,size,size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = SRGB; return t;
}
/* texture lá: gradient + mảng sáng tối + gân (kèm bump để gân nổi nhẹ) */
function makeLeafTex(){
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
  const bc = document.createElement('canvas'); bc.width = 256; bc.height = 512; const b = bc.getContext('2d');
  let g = x.createLinearGradient(0,0,0,512); g.addColorStop(0,'#b4dc84'); g.addColorStop(.45,'#68a653'); g.addColorStop(1,'#2f6c37');
  x.fillStyle = g; x.fillRect(0,0,256,512);
  for(let i=0;i<160;i++){
    const px = Math.random()*256, py = Math.random()*512, r = 10 + Math.random()*34, rg = x.createRadialGradient(px,py,0,px,py,r);
    rg.addColorStop(0, Math.random() > .5 ? 'rgba(220,255,160,.09)' : 'rgba(10,70,30,.09)'); rg.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle = rg; x.fillRect(px-r,py-r,r*2,r*2);
  }
  b.fillStyle = '#6a6a6a'; b.fillRect(0,0,256,512);
  x.lineCap = b.lineCap = 'round';
  for(let k=0;k<9;k++){
    const y0 = 470 - k*48, lw = 3.2 - k*.18;
    [-1,1].forEach(s => {
      x.strokeStyle = 'rgba(214,240,150,.5)'; x.lineWidth = lw; b.strokeStyle = '#d4d4d4'; b.lineWidth = lw;
      [x,b].forEach(q => { q.beginPath(); q.moveTo(128,y0); q.quadraticCurveTo(128+s*50,y0-18,128+s*104,y0-72); q.stroke(); });
    });
  }
  x.strokeStyle = 'rgba(230,248,170,.75)'; x.lineWidth = 8; b.strokeStyle = '#fff'; b.lineWidth = 8;
  [x,b].forEach(q => { q.beginPath(); q.moveTo(128,512); q.lineTo(128,6); q.stroke(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = SRGB; t.anisotropy = 4;
  const tb = new THREE.CanvasTexture(bc); tb.anisotropy = 4;
  return { t, tb };
}
/* texture cánh hoa: gốc vàng kem → đầu hồng, có sọc thớ cánh */
function makePetalTex(){
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d');
  const g = x.createLinearGradient(0,256,0,0);
  g.addColorStop(0,'#fff1cf'); g.addColorStop(.28,'#ffd9de'); g.addColorStop(.7,'#ffb3c8'); g.addColorStop(1,'#ff8fb0');
  x.fillStyle = g; x.fillRect(0,0,128,256); x.lineWidth = 1.4;
  for(let i=0;i<26;i++){
    const px = 4 + i*4.7 + Math.random()*2;
    x.strokeStyle = i%3 ? 'rgba(255,255,255,.16)' : 'rgba(214,80,125,.10)';
    x.beginPath(); x.moveTo(64+(px-64)*.35,256); x.quadraticCurveTo(px,150,64+(px-64)*1.05,18+Math.random()*30); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = SRGB; t.anisotropy = 4; return t;
}
const LEAFTX = makeLeafTex(), PETALTX = makePetalTex();
const leafMat  = tint => new THREE.MeshStandardMaterial({ map:LEAFTX.t, bumpMap:LEAFTX.tb, bumpScale:2.2, color:tint, roughness:.64, metalness:0, side:THREE.DoubleSide, emissive:0x244f18, emissiveIntensity:.16 });
const petalMat = tint => new THREE.MeshPhysicalMaterial({ map:PETALTX, color:tint, roughness:.62, metalness:0, side:THREE.DoubleSide, sheen:1, sheenRoughness:.55, sheenColor:new THREE.Color(0xffd3e2), emissive:0xff8fb0, emissiveIntensity:.06 });
const GM = {
  clay : new THREE.MeshStandardMaterial({ color:0xf4e2d6, roughness:.85, metalness:0, side:THREE.DoubleSide }),
  band : new THREE.MeshStandardMaterial({ color:0xeaa4b6, roughness:.8 }),
  soil : new THREE.MeshStandardMaterial({ color:0x6a4a35, roughness:1, metalness:0 }),
  peb  : new THREE.MeshStandardMaterial({ color:0xd9c9c0, roughness:.9 }),
  stalk: new THREE.MeshStandardMaterial({ color:0x8dbb6e, roughness:.75 }),
  twine: new THREE.MeshStandardMaterial({ color:0xf1e0cf, roughness:.9 }),
  tape : new THREE.MeshBasicMaterial({ color:0xf6bfd0, transparent:true, opacity:.88, toneMapped:false, depthWrite:false }),
  can  : new THREE.MeshStandardMaterial({ color:0xa7d8c4, roughness:.42, metalness:.35 }),
  canD : new THREE.MeshStandardMaterial({ color:0x78b39d, roughness:.45, metalness:.4 }),
  canP : new THREE.MeshStandardMaterial({ color:0xf3a2bb, roughness:.4, metalness:.35 }),
  eye  : new THREE.MeshBasicMaterial({ color:0x3a2530 }),
  blush: new THREE.MeshBasicMaterial({ color:0xff9db8, transparent:true, opacity:.7, side:THREE.DoubleSide }),
  disc : new THREE.MeshStandardMaterial({ color:0xf0b240, roughness:.8 }),
  seed : new THREE.MeshStandardMaterial({ color:0xffffff, roughness:.8 }),
  calyx: new THREE.MeshStandardMaterial({ color:0x79ab5c, roughness:.75 }),
  cot  : leafMat(0xeaffd2)
};

/* geometry lá / cánh: lưới cong, gập dọc gân giữa, đầu rủ xuống */
const leafShape  = v => Math.pow(Math.sin(Math.PI*Math.pow(v,.72)),.85)*(1-.22*v);
const roundShape = v => Math.pow(Math.sin(Math.PI*Math.pow(v,.8)),.6);
const petalShape = v => Math.pow(Math.sin(Math.PI*Math.pow(v,.75)),.55)*(1-.1*v);
function bladeGeo(L, Wm, fold, droop, nu, nv, shape){
  const pos = [], uv = [], idx = [];
  for(let j=0;j<=nv;j++){
    const v = j/nv, w = Wm*shape(v);
    for(let i=0;i<=nu;i++){
      const u = i/nu*2-1;
      pos.push(u*w, v*L, -Math.abs(u)*w*fold + v*v*L*droop + Math.sin(v*8+u*2.2)*.005*Math.abs(u));
      uv.push((u+1)/2, v);
    }
  }
  for(let j=0;j<nv;j++) for(let i=0;i<nu;i++){ const a = j*(nu+1)+i, b = a+1, c = a+nu+1, d = c+1; idx.push(a,c,b, b,c,d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

/* ── chậu + đất + sỏi + bóng ─────────────────── */
{
  const prof = [[0,0],[.22,0],[.275,.03],[.31,.12],[.345,.22],[.36,.235],[.36,.265],[.335,.27],[.325,.25],[.30,.225]].map(([x,y]) => new THREE.Vector2(x,y));
  garden.add(new THREE.Mesh(new THREE.LatheGeometry(prof,56), GM.clay));
  const band = new THREE.Mesh(new THREE.TorusGeometry(.331,.014,10,56), GM.band); band.rotation.x = Math.PI/2; band.position.y = .17; garden.add(band);
  const soil = new THREE.Mesh(new THREE.SphereGeometry(.315,40,20), GM.soil); soil.scale.y = .2; soil.position.y = .225; garden.add(soil);
  for(let i=0;i<6;i++){
    const a = i/6*Math.PI*2 + .4, r = .17 + (i%2)*.06;
    const p = new THREE.Mesh(new THREE.SphereGeometry(.02 + (i%3)*.005,8,6), GM.peb); p.scale.y = .6; p.position.set(Math.cos(a)*r,.275,Math.sin(a)*r); garden.add(p);
  }
}
const shTex = radialTex([[0,'rgba(50,15,35,.55)'],[1,'rgba(50,15,35,0)']]);
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.25), new THREE.MeshBasicMaterial({ map:shTex, transparent:true, depthWrite:false }));
blob.rotation.x = -Math.PI/2; blob.position.y = .004; garden.add(blob);
const canBlob = new THREE.Mesh(new THREE.PlaneGeometry(.7,.7), new THREE.MeshBasicMaterial({ map:shTex, transparent:true, depthWrite:false }));
canBlob.rotation.x = -Math.PI/2; canBlob.position.set(.74,.005,.52); garden.add(canBlob);

/* ── thân cây: ống tự dựng, tính lại khi lớn lên ─ */
const STEM_N = 60, STEM_R = 10;
const stemCurve = new THREE.CatmullRomCurve3([ new THREE.Vector3(0,0,0), new THREE.Vector3(.04,.4,.02), new THREE.Vector3(-.05,.85,-.01), new THREE.Vector3(.02,1.3,.06), new THREE.Vector3(.05,1.75,.2) ]);
const SV = (STEM_N+1)*(STEM_R+1);
const stemPos = new Float32Array(SV*3), stemNor = new Float32Array(SV*3), stemCol = new Float32Array(SV*3), stemIdx = [];
for(let i=0;i<STEM_N;i++) for(let j=0;j<STEM_R;j++){ const a = i*(STEM_R+1)+j, b = a+1, c = a+STEM_R+1, d = c+1; stemIdx.push(a,b,c, b,d,c); }
const stemGeo = new THREE.BufferGeometry();
stemGeo.setAttribute('position', new THREE.BufferAttribute(stemPos,3).setUsage(THREE.DynamicDrawUsage));
stemGeo.setAttribute('normal',   new THREE.BufferAttribute(stemNor,3).setUsage(THREE.DynamicDrawUsage));
stemGeo.setAttribute('color',    new THREE.BufferAttribute(stemCol,3).setUsage(THREE.DynamicDrawUsage));
stemGeo.setIndex(stemIdx);
const stemMesh = new THREE.Mesh(stemGeo, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.75, metalness:0, side:THREE.DoubleSide }));
stemMesh.frustumCulled = false; plant.add(stemMesh);
const cA = new THREE.Color(0x7aa356), cB = new THREE.Color(0xb3da86);

/* búp non ở đỉnh thân (2 lá bé khép) */
const bud = new THREE.Group(); plant.add(bud);
[0,Math.PI].forEach(a => {
  const g = new THREE.Group(); g.rotation.y = a; bud.add(g);
  const t = new THREE.Group(); t.rotation.x = .38; g.add(t);
  t.add(new THREE.Mesh(bladeGeo(.1,.04,.3,.1,4,8,roundShape), GM.cot));
});
{ const core = new THREE.Mesh(new THREE.SphereGeometry(.026,12,10), GM.cot); core.scale.y = 1.6; core.position.y = .02; bud.add(core); }

function updateStem(f){
  f = Math.max(.004, f);
  for(let i=0;i<=STEM_N;i++){
    const k = i/STEM_N, t = f*k;
    stemCurve.getPointAt(t, _sp); stemCurve.getTangentAt(t, _st);
    _sn.set(_st.y, -_st.x, 0); if(_sn.lengthSq() < 1e-6) _sn.set(1,0,0); _sn.normalize();
    _sb.crossVectors(_st, _sn).normalize();
    let r = .05 - .027*t; const e = Math.max(0,(k-.88)/.12); r *= Math.sqrt(1 - e*e*.92);
    _sc.copy(cA).lerp(cB, Math.min(1, t*1.25));
    for(let j=0;j<=STEM_R;j++){
      const a = j/STEM_R*Math.PI*2, ca = Math.cos(a), sa = Math.sin(a), q = (i*(STEM_R+1)+j)*3;
      const nx = _sn.x*ca + _sb.x*sa, ny = _sn.y*ca + _sb.y*sa, nz = _sn.z*ca + _sb.z*sa;
      stemPos[q] = _sp.x + nx*r; stemPos[q+1] = _sp.y + ny*r; stemPos[q+2] = _sp.z + nz*r;
      stemNor[q] = nx; stemNor[q+1] = ny; stemNor[q+2] = nz;
      stemCol[q] = _sc.r; stemCol[q+1] = _sc.g; stemCol[q+2] = _sc.b;
    }
  }
  stemGeo.attributes.position.needsUpdate = true; stemGeo.attributes.normal.needsUpdate = true; stemGeo.attributes.color.needsUpdate = true;
  stemCurve.getPointAt(f, _sp); bud.position.copy(_sp);
}
updateStem(GR.sf);

/* 2 lá mầm ở gốc */
const cot = new THREE.Group(); cot.position.copy(stemCurve.getPointAt(.1)); cot.scale.setScalar(.001); plant.add(cot);
[0,Math.PI].forEach(a => {
  const g = new THREE.Group(); g.rotation.y = a + .5; cot.add(g);
  const t = new THREE.Group(); t.rotation.x = 1.05; g.add(t);
  const m = new THREE.Mesh(bladeGeo(.2,.085,.2,.12,6,10,roundShape), GM.cot); m.position.y = .02; t.add(m);
});

/* ── 3 chiếc lá + 3 tấm ảnh treo ở đầu lá ─────── */
const STALK = .11, BL = .56, BW = .2, BD = .3;
const LEAF_DEF = [ { t:.34, yaw:-1.25, al:1.0, tint:0xffffff }, { t:.56, yaw:1.9, al:.95, tint:0xf4ffe6 }, { t:.78, yaw:-1.9, al:.9, tint:0xeaffd8 } ];
const LEAVES = LEAF_DEF.map(d => {
  const g = new THREE.Group(); g.position.copy(stemCurve.getPointAt(d.t)); g.rotation.y = d.yaw; g.visible = false; plant.add(g);
  const tilt = new THREE.Group(); g.add(tilt);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(.008,.014,STALK,8), GM.stalk); stalk.position.y = STALK/2; tilt.add(stalk);
  const blade = new THREE.Group(); blade.position.y = STALK - .005; tilt.add(blade);
  blade.add(new THREE.Mesh(bladeGeo(BL,BW,.38,BD,8,18,leafShape), leafMat(d.tint)));
  /* vị trí đầu lá khi đã bung hết (để treo ảnh) */
  const ly = STALK + BL - .005, lz = BL*BD, y2 = ly*Math.cos(d.al) - lz*Math.sin(d.al), z2 = ly*Math.sin(d.al) + lz*Math.cos(d.al);
  const tip = new THREE.Vector3(z2*Math.sin(d.yaw), y2, z2*Math.cos(d.yaw)).add(g.position);
  return { g, tilt, blade, u:0, d, tip };
});
function applyLeaf(L){
  const u = L.u;
  L.g.scale.setScalar(Math.max(.001, Math.min(1, u*1.6)));
  L.tilt.rotation.x = lerp(.06, L.d.al, u);
  L.blade.scale.x = .25 + .75*Math.min(1.08,u);
}
const PS = .9;
const PHOTOS = [0,1,2].map(i => {
  const c = photoCanvas(i), tex = new THREE.CanvasTexture(c); tex.colorSpace = SRGB; tex.anisotropy = 4; c.tex = tex; photoCv.push(c);
  const tp = LEAVES[i].tip;
  const g = new THREE.Group(); g.rotation.order = 'YXZ'; g.position.set(tp.x, tp.y-.02, tp.z+.04); g.visible = false; plant.add(g);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,.13,6), GM.twine); str.position.y = -.065; g.add(str);
  const pic = new THREE.Group(); pic.position.y = -.13 - .271*PS; pic.scale.setScalar(PS); g.add(pic);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(.355,.56), new THREE.MeshBasicMaterial({ color:0x2a0f1c, transparent:true, opacity:.22, depthWrite:false })); back.position.set(.008,-.008,-.004); pic.add(back);
  pic.add(new THREE.Mesh(new THREE.PlaneGeometry(.34,.542), new THREE.MeshBasicMaterial({ map:tex, toneMapped:false })));
  const tape = new THREE.Mesh(new THREE.PlaneGeometry(.13,.05), GM.tape); tape.position.set(0,.265,.004); tape.rotation.z = .12 - i*.1; pic.add(tape);
  const h = hitMesh(new THREE.PlaneGeometry(.4,.62), 'photo', i); h.position.z = .02; pic.add(h);
  return { g, pic };
});

/* ── hoa: nhiều lớp cánh, nhuỵ có hạt, đài hoa ── */
const FL = { g:new THREE.Group(), root:new THREE.Group(), center:new THREE.Group(), petals:[], bloom:0 };
FL.g.rotation.order = 'YXZ'; FL.g.position.copy(stemCurve.getPointAt(1)); FL.g.visible = false; plant.add(FL.g); FL.g.add(FL.root, FL.center);
[ { n:10, L:.36, W:.13,  open:1.42, close:.10, delay:0,   off:0,  y:0,    tint:0xffffff },
  { n:8,  L:.30, W:.115, open:1.15, close:.08, delay:.12, off:.5, y:.008, tint:0xffeef3 },
  { n:6,  L:.22, W:.09,  open:.88,  close:.06, delay:.24, off:.1, y:.016, tint:0xffe2ec } ].forEach(ly => {
  const geo = bladeGeo(ly.L, ly.W, .5, .18, 8, 14, petalShape), mat = petalMat(ly.tint);
  for(let i=0;i<ly.n;i++){
    const g = new THREE.Group(); g.rotation.y = (i + ly.off)/ly.n*Math.PI*2; g.position.y = ly.y; FL.root.add(g);
    const t = new THREE.Group(); g.add(t); t.add(new THREE.Mesh(geo, mat));
    FL.petals.push({ t, open:ly.open + (Math.random()-.5)*.14, close:ly.close, delay:ly.delay, vr:(Math.random()-.5)*2 });
  }
});
{
  const disc = new THREE.Mesh(new THREE.SphereGeometry(.1,28,18), GM.disc); disc.scale.y = .5; disc.position.y = .02; FL.center.add(disc);
  const N = 48, seeds = new THREE.InstancedMesh(new THREE.SphereGeometry(.013,8,6), GM.seed, N), dm = new THREE.Object3D(), sc = new THREE.Color();
  for(let i=0;i<N;i++){
    const r = .085*Math.sqrt((i+.5)/N), th = i*2.39996323;
    dm.position.set(Math.cos(th)*r, .02 + Math.sqrt(Math.max(0,1-(r/.1)*(r/.1)))*.05 + .003, Math.sin(th)*r); dm.updateMatrix();
    seeds.setMatrixAt(i, dm.matrix); sc.setHSL(.09 + Math.random()*.03, .75, .38 + Math.random()*.14); seeds.setColorAt(i, sc);
  }
  FL.center.add(seeds);
  const cal = new THREE.Mesh(new THREE.SphereGeometry(.075,16,12), GM.calyx); cal.scale.y = .6; cal.position.y = -.03; FL.g.add(cal);
}
function applyBloom(b){
  FL.petals.forEach(p => {
    const k = clamp(0,1,(b - p.delay)/(1 - p.delay)), e = 1 - Math.pow(1-k,2.2);
    p.t.rotation.x = lerp(p.close, p.open, e) + Math.sin(e*Math.PI)*.12*p.vr;
  });
  FL.root.rotation.y = lerp(-.9, 0, 1 - Math.pow(1-b,3));
  FL.center.scale.setScalar(.6 + .4*b);
}
applyBloom(0);

/* ── dây + nút thắt để treo phong bì ────────── */
const tie  = new THREE.Mesh(new THREE.TorusGeometry(.04,.011,8,20), GM.canP); tie.rotation.x = Math.PI/2; tie.position.copy(stemCurve.getPointAt(.9)); tie.visible = false; plant.add(tie);
const cord = new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,1,6), GM.twine); cord.visible = false; plant.add(cord);
function layoutCord(){
  const a = stemCurve.getPointAt(.9), b = new THREE.Vector3(ENV.x, ENV.y + .2, ENV.z), d = b.clone().sub(a), len = d.length();
  cord.position.copy(a).addScaledVector(d,.5); cord.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize()); cord.scale.set(1,len,1); return len;
}
const setCord = v => { tie.visible = cord.visible = !!v; };

/* ── bình nước dễ thương ─────────────────────── */
const can = new THREE.Group(); garden.add(can);
const canTip = new THREE.Object3D(); canTip.position.set(-.395,.152,0); can.add(canTip);
const CAN_REST = new THREE.Vector3(.72,.15,.52), CAN_POUR = new THREE.Vector3(.55,.8,.08);
can.position.copy(CAN_REST); can.scale.setScalar(1.15);
{
  can.add(new THREE.Mesh(new THREE.CylinderGeometry(.14,.16,.22,32), GM.can));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.14,.013,10,36), GM.canD); rim.rotation.x = Math.PI/2; rim.position.y = .11; can.add(rim);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(.125,.125,.01,32), GM.canD); lid.position.y = .1; can.add(lid);
  const foot = new THREE.Mesh(new THREE.TorusGeometry(.16,.012,10,36), GM.canD); foot.rotation.x = Math.PI/2; foot.position.y = -.11; can.add(foot);
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(.03,.046,.26,16), GM.can); sp.position.set(-.235,.03,0); sp.rotation.z = .9; can.add(sp);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(.062,.04,.05,20), GM.canP); rose.position.set(-.353,.123,0); rose.rotation.z = .9; can.add(rose);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.005,20), GM.canD); face.position.set(-.374,.14,0); face.rotation.z = .9; can.add(face);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(.115,.017,10,28,Math.PI), GM.canP); hd.rotation.z = -Math.PI/2; hd.position.set(.12,0,0); can.add(hd);
  [-1,1].forEach(s => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.014,10,8), GM.eye); e.scale.z = .5; e.position.set(s*.045,.035,.143); can.add(e);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(.026,16), GM.blush); bl.position.set(s*.085,-.01,.123); bl.rotation.y = s*.6; can.add(bl);
  });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.016,.003,6,12,Math.PI), GM.eye); mouth.rotation.z = Math.PI; mouth.position.set(0,.0,.146); can.add(mouth);
  can.add(hitMesh(new THREE.SphereGeometry(.42,10,8), 'water'));
}
const waterHit = hitMesh(new THREE.CylinderGeometry(.42,.42,2.1,14), 'water'); waterHit.position.set(0,1.05,0); garden.add(waterHit);

/* ── hạt nước ────────────────────────────────── */
const DN = 160, dPos = new Float32Array(DN*3).fill(-50), dVel = new Float32Array(DN*3), dLife = new Float32Array(DN), dKind = new Uint8Array(DN);
const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos,3));
const drops = new THREE.Points(dGeo, new THREE.PointsMaterial({ map:radialTex([[0,'rgba(255,255,255,1)'],[.5,'rgba(220,240,255,.9)'],[1,'rgba(200,230,255,0)']],64), size:.07, sizeAttenuation:true, color:0xc8ecff, transparent:true, opacity:.9, depthWrite:false }));
drops.frustumCulled = false; garden.add(drops);
let dI = 0;
function spawnDrop(x,y,z,vx,vy,vz,kind){
  const k = dI++ % DN;
  dPos[k*3] = x; dPos[k*3+1] = y; dPos[k*3+2] = z; dVel[k*3] = vx; dVel[k*3+1] = vy; dVel[k*3+2] = vz;
  dLife[k] = kind ? .3 : 1.4; dKind[k] = kind;
}

/* tất cả vật trang trí không cản tia chọn (chỉ các hit-mesh mới nhận chạm) */
garden.traverse(o => { if(!o.userData.hit) o.raycast = () => {}; });

/* ════════════════════════════════════════════════
   LOGIC TƯỚI CÂY
   ════════════════════════════════════════════════ */
const flowerWorld = () => FL.g.localToWorld(new THREE.Vector3(0,.12,0));
function introSprout(){
  gsap.fromTo(cot.scale, { x:.001,y:.001,z:.001 }, { x:1,y:1,z:1, duration:1.1, delay:.45, ease:'elastic.out(1,.5)' });
  GR.sf = GR.sT = .02; updateStem(GR.sf);
  gsap.to(GR, { sT:.2, duration:1.2, ease:'power2.out', onComplete:() => {
    GR.on = true;
    hintEl.innerHTML = 'Chạm giữ <b>bình nước</b> để tưới cây'; gsap.to(hintEl, { autoAlpha:1, duration:.8 });
  } });
  Snd.note(PENT[1], .1, 1.8); Snd.click(1800,.25,3,.06); haptic(8);
  burst(plant.localToWorld(new THREE.Vector3(0,.15,0)), 26, 1, .6);
}
function growStage(k){
  GR.busy = true; GR.stage = k+1; clearTimeout(hintTimer); hideGhost();
  haptic([14,40,24]); Snd.click(900,.3,2,.1);
  chord([[0,2,4],[1,3,5],[2,4,5],[0,2,4,5]][k]);
  if(k < 3) growLeaf(k); else growFlower();
}
function growLeaf(k){
  const L = LEAVES[k];
  gsap.timeline({ onComplete:() => { GR.busy = false; armHint(3400); } })
    .call(() => { L.g.visible = true; applyLeaf(L); Snd.whoosh(.8,.1); Snd.note(PENT[k+1], .12, 1.8); haptic(10); }, null, .4)
    .to(L, { u:1, duration:1.5, ease:'back.out(1.6)', onUpdate:() => applyLeaf(L) }, .4)
    .call(() => { burst(L.blade.localToWorld(new THREE.Vector3(0,BL*.6,0)), 26, 1.1, .5); }, null, 1.1)
    .call(() => revealPhoto(k), null, 1.45)
    .to({}, { duration:.9 }, 1.45);
}
function revealPhoto(k){
  const p = PHOTOS[k]; p.g.visible = true; p.g.scale.setScalar(.01);
  gsap.to(p.g.scale, { x:1, y:1, z:1, duration:1.1, ease:'elastic.out(1,.5)' });
  Snd.click(1500,.3,3,.06); Snd.note(PENT[(k*2+2)%6], .13, 1.8); haptic([10,30,10]);
  burst(p.pic.localToWorld(new THREE.Vector3(0,0,0)), 30, 1.2, .3);
}
function growFlower(){
  waterHit.visible = false;
  gsap.timeline({ onComplete:() => { GR.done = true; GR.busy = false; ENVHANG = true; armHint(1800); } })
    .call(() => {
      Snd.whoosh(1.2,.14); haptic([10,30,10,30,20]); bud.visible = false;
      gsap.to(can.scale, { x:.001, y:.001, z:.001, duration:.7, ease:'power2.in', onComplete:() => { can.visible = false; canBlob.visible = false; } });
      FL.g.visible = true; FL.g.scale.setScalar(.01); applyBloom(0);
    }, null, .5)
    .to(FL.g.scale, { x:1, y:1, z:1, duration:.9, ease:'back.out(1.8)' }, .5)
    .call(() => { Snd.note(PENT[2], .1, 2); }, null, 1.3)
    .to(FL, { bloom:1, duration:2.6, ease:'power2.inOut', onUpdate:() => applyBloom(FL.bloom) }, 1.3)
    .call(() => { chord([0,2,4,5]); Snd.note(PENT[0]*.5, .16, 3); burst(flowerWorld(), 90, 2.4, 1.0); haptic([20,40,30]); }, null, 2.9)
    /* phong bì rơi xuống, treo dưới hoa */
    .call(() => { env.visible = true; env.scale.setScalar(.01); env.rotation.set(ENV.rx,0,0); Snd.whoosh(.8,.12); Snd.note(PENT[3], .12, 1.8); }, null, 3.4)
    .fromTo(env.scale, { x:.01,y:.01,z:.01 }, { x:ENV.s, y:ENV.s, z:ENV.s, duration:.8, ease:'back.out(2)', immediateRender:false }, 3.4)
    .fromTo(env.position, { x:ENV.x, y:ENV.y+.9, z:ENV.z }, { x:ENV.x, y:ENV.y, z:ENV.z, duration:1.3, ease:'elastic.out(1,.45)', immediateRender:false }, 3.4)
    .call(() => {
      const len = layoutCord(); cord.visible = tie.visible = true; gsap.fromTo(cord.scale, { y:.001 }, { y:len, duration:.5, ease:'power2.out' });
      Snd.click(1200,.3,3,.07); haptic(10); burst(env.getWorldPosition(new THREE.Vector3()), 30, 1.1, .4);
    }, null, 4.3)
    .to({}, { duration:.8 }, 4.3);
}

function updateGarden(dt, time){
  const pouring = S.mode === 'items' && GR.on && P && P.kind === 'water' && !GR.busy && !GR.done;
  GR.can += ((pouring ? 1 : 0) - GR.can) * (1 - Math.exp(-dt*(pouring ? 4.2 : 3)));
  const c = GR.can, e = smooth(c), tl = smooth((c-.3)/.7);
  can.position.set(
    lerp(CAN_REST.x, CAN_POUR.x, e),
    lerp(CAN_REST.y, CAN_POUR.y, e) + Math.sin(Math.PI*Math.min(1,c))*.12 + Math.sin(time*2)*.008*(1-c),
    lerp(CAN_REST.z, CAN_POUR.z, e));
  can.rotation.z = .72*tl + (pouring && c > .8 ? Math.sin(time*28)*.012 : 0);
  canBlob.material.opacity = 1 - c;

  if(pouring && c > .8){
    if(!GR.tipHid){ GR.tipHid = true; gsap.to(hintEl, { autoAlpha:0, duration:.4 }); }
    GR.w = Math.min(WTH[GR.stage], GR.w + dt*POUR_RATE);
    GR.emit += dt*80;
    can.updateMatrixWorld(true); canTip.getWorldPosition(_ta); garden.worldToLocal(_ta);
    while(GR.emit >= 1){ GR.emit -= 1; spawnDrop(_ta.x + (Math.random()-.5)*.025, _ta.y, _ta.z + (Math.random()-.5)*.025, -.32 - Math.random()*.12, -.15, (Math.random()-.5)*.06, 0); }
    GR.snd -= dt; if(GR.snd <= 0){ GR.snd = .07 + Math.random()*.05; Snd.click(2600 + Math.random()*2200, .05, 2.5, .035); }
    GR.wig = Math.min(1, GR.wig + dt*3);
    if(GR.w >= WTH[GR.stage] - 1e-6) growStage(GR.stage);
  } else GR.wig = Math.max(0, GR.wig - dt*2.5);

  /* thân lớn dần theo lượng nước */
  if(GR.on) GR.sT = .2 + .8*GR.w;
  const d = GR.sT - GR.sf;
  if(Math.abs(d) > .0004){ GR.sf += d*(1 - Math.exp(-dt*5)); updateStem(GR.sf); }
  else if(d !== 0){ GR.sf = GR.sT; updateStem(GR.sf); }

  /* đất sẫm dần khi ướt */
  const wet = smooth(GR.w);
  GM.soil.color.setRGB(lerp(.42,.19,wet), lerp(.29,.12,wet), lerp(.21,.085,wet)); GM.soil.roughness = lerp(1,.6,wet);

  /* đung đưa nhẹ, rung vui khi nhận nước */
  plant.rotation.z = Math.sin(time*.9)*.012 + Math.sin(time*27)*.007*GR.wig;
  plant.rotation.x = Math.sin(time*.7+1)*.008;
  LEAVES.forEach((L,i) => { if(L.g.visible) L.tilt.rotation.z = Math.sin(time*1.1 + i*1.7)*.02; });

  /* ảnh, hoa, phong bì luôn quay mặt về phía người xem */
  const bb = bbY();
  PHOTOS.forEach((p,i) => { if(p.g.visible){ p.g.rotation.y = bb; p.g.rotation.x = -.3; p.g.rotation.z = Math.sin(time*1.4 + i*1.9)*.06; } });
  if(FL.g.visible){ FL.g.rotation.y = bb; FL.g.rotation.x = .8 + Math.sin(time*1.1)*.03; }
  if(ENVHANG){ env.rotation.y = bb; eg.rotation.z = Math.sin(time*1.3)*.05; }

  /* hạt nước rơi + bắn */
  for(let k=0;k<DN;k++){
    if(dLife[k] <= 0) continue;
    dLife[k] -= dt; dVel[k*3+1] -= 5*dt;
    dPos[k*3] += dVel[k*3]*dt; dPos[k*3+1] += dVel[k*3+1]*dt; dPos[k*3+2] += dVel[k*3+2]*dt;
    if(dPos[k*3+1] < .29 && dVel[k*3+1] < 0){
      if(dKind[k] === 0 && Math.hypot(dPos[k*3], dPos[k*3+2]) < .34){
        dKind[k] = 1; dPos[k*3+1] = .29; dVel[k*3+1] = .5 + Math.random()*.5; dVel[k*3] = (Math.random()-.5)*.6; dVel[k*3+2] = (Math.random()-.5)*.6; dLife[k] = .28;
      } else dLife[k] = 0;
    }
    if(dLife[k] <= 0){ dPos[k*3+1] = -50; }
  }
  dGeo.attributes.position.needsUpdate = true;
}

/* ── phong bì: thân vẽ bằng canvas (lớp lót hoa + túi trước + viền thư hàng không + tem), nắp tam giác có đường chỉ, dấu sáp đỏ hình tim ── */
const env = new THREE.Group(); env.rotation.order = 'YXZ'; env.position.set(ENV.x,ENV.y,ENV.z); env.rotation.set(ENV.rx,0,0); env.scale.setScalar(ENV.s); env.visible = false; plant.add(env);
const eg = new THREE.Group(); eg.rotation.x = -Math.PI/2; env.add(eg);
const flapHinge = new THREE.Group(); flapHinge.position.set(0,.17,.002); eg.add(flapHinge);
{
  const CW = 1000, CH = 680;
  const bc = document.createElement('canvas'); bc.width = CW; bc.height = CH; const x = bc.getContext('2d');
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace; bt.anisotropy = 4;
  /* hoạ tiết sọc chéo hồng–xanh cho viền */
  const pc = document.createElement('canvas'); pc.width = pc.height = 40; const px = pc.getContext('2d');
  px.fillStyle = '#fffafb'; px.fillRect(0,0,40,40);
  const band = (off, col) => { px.fillStyle = col; [0,-40].forEach(s => { px.beginPath(); px.moveTo(off+s,0); px.lineTo(off+s+14,0); px.lineTo(off+s+54,40); px.lineTo(off+s+40,40); px.closePath(); px.fill(); }); };
  band(0,'#f0678b'); band(20,'#79aef2');
  const drawEnv = () => {
    x.clearRect(0,0,CW,CH);
    /* lớp lót bên trong (thấy khi mở nắp) */
    let g = x.createLinearGradient(0,0,0,CH); g.addColorStop(0,'#f2a2bc'); g.addColorStop(1,'#f7bfd0');
    x.fillStyle = g; x.fillRect(0,0,CW,CH);
    x.fillStyle = 'rgba(255,255,255,.34)';
    for(let r=0;r<9;r++) for(let c=0;c<16;c++){ x.beginPath(); x.arc(c*64 + (r%2?32:0), r*46+20, 6, 0, 7); x.fill(); }
    g = x.createLinearGradient(0,0,0,330); g.addColorStop(0,'rgba(110,20,60,.34)'); g.addColorStop(1,'rgba(110,20,60,0)');
    x.fillStyle = g; x.fillRect(0,0,CW,330);
    /* túi phía trước (có bóng đổ lên lớp lót) */
    x.save(); x.shadowColor = 'rgba(110,25,60,.42)'; x.shadowBlur = 26; x.shadowOffsetY = -8;
    g = x.createLinearGradient(0,0,0,CH); g.addColorStop(0,'#ffeef3'); g.addColorStop(1,'#ffd3e0');
    x.fillStyle = g; x.beginPath(); x.moveTo(0,0); x.lineTo(500,340); x.lineTo(1000,0); x.lineTo(1000,CH); x.lineTo(0,CH); x.closePath(); x.fill(); x.restore();
    /* đường gấp */
    x.lineCap = 'round'; x.lineJoin = 'round';
    [['rgba(200,90,130,.38)',3,0],['rgba(255,255,255,.85)',2.5,3]].forEach(([col,lw,o]) => {
      x.strokeStyle = col; x.lineWidth = lw;
      x.beginPath(); x.moveTo(0,CH-o); x.lineTo(500,340+o); x.lineTo(1000,CH-o); x.stroke();
      x.beginPath(); x.moveTo(0,0+o); x.lineTo(500,340+o); x.lineTo(1000,0+o); x.stroke();
    });
    /* tem + chữ viết tay */
    x.save(); x.translate(808,470); x.rotate(.06);
    x.fillStyle = '#fffdfb'; x.shadowColor = 'rgba(120,40,70,.3)'; x.shadowBlur = 10; x.shadowOffsetY = 3; x.fillRect(0,0,132,156); x.shadowColor = 'transparent';
    x.setLineDash([7,6]); x.strokeStyle = '#e48aa7'; x.lineWidth = 3; x.strokeRect(8,8,116,140); x.setLineDash([]);
    x.fillStyle = '#e5334f'; x.beginPath(); x.moveTo(66,112); x.bezierCurveTo(24,84,34,40,66,62); x.bezierCurveTo(98,40,108,84,66,112); x.fill(); x.restore();
    x.fillStyle = '#b5476a'; x.font = '70px "Patrick Hand", cursive'; x.textAlign = 'left'; x.fillText('Gửi em', 86, 600);
    x.fillStyle = 'rgba(181,71,106,.28)'; x.fillRect(86,628,300,3);
    /* viền thư hàng không */
    x.strokeStyle = x.createPattern(pc,'repeat'); x.lineWidth = 26; x.strokeRect(13,13,CW-26,CH-26);
    x.strokeStyle = 'rgba(150,50,90,.25)'; x.lineWidth = 2; x.strokeRect(1,1,CW-2,CH-2);
    bt.needsUpdate = true;
  };
  drawEnv(); if(document.fonts) document.fonts.ready.then(drawEnv);
  /* bóng dưới phong bì */
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(.58,.42), new THREE.MeshBasicMaterial({ color:0x4a1c30, transparent:true, opacity:.24, depthWrite:false }));
  sh.position.set(.014,-.018,-.003); sh.raycast = () => {}; eg.add(sh);
  const eb = new THREE.Mesh(new THREE.PlaneGeometry(.5,.34), new THREE.MeshBasicMaterial({ map:bt, toneMapped:false })); eb.raycast = () => {}; eg.add(eb);

  /* nắp tam giác */
  const fc = document.createElement('canvas'); fc.width = 1000; fc.height = 340; const fx = fc.getContext('2d');
  let fg = fx.createLinearGradient(0,0,0,340); fg.addColorStop(0,'#ffc9da'); fg.addColorStop(1,'#f08fb0');
  fx.fillStyle = fg; fx.fillRect(0,0,1000,340);
  fx.fillStyle = 'rgba(255,255,255,.18)'; fx.beginPath(); fx.moveTo(0,0); fx.lineTo(1000,0); fx.lineTo(500,170); fx.closePath(); fx.fill();
  fx.setLineDash([16,11]); fx.strokeStyle = 'rgba(255,255,255,.8)'; fx.lineWidth = 4; fx.lineCap = 'round';
  fx.beginPath(); fx.moveTo(70,34); fx.lineTo(930,34); fx.lineTo(500,284); fx.closePath(); fx.stroke();
  fx.setLineDash([]); fx.strokeStyle = 'rgba(160,50,95,.35)'; fx.lineWidth = 3; fx.beginPath(); fx.moveTo(0,0); fx.lineTo(500,340); fx.lineTo(1000,0); fx.stroke();
  const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace; ft.anisotropy = 4;
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.Float32BufferAttribute([-.25,0,0,.25,0,0,0,-.17,0],3));
  fgeo.setAttribute('uv', new THREE.Float32BufferAttribute([0,1,1,1,.5,0],2));
  const flap = new THREE.Mesh(fgeo, new THREE.MeshBasicMaterial({ map:ft, side:THREE.DoubleSide, toneMapped:false })); flap.raycast = () => {}; flapHinge.add(flap);

  /* dấu sáp hình tim */
  const sc = document.createElement('canvas'); sc.width = sc.height = 192; const sx = sc.getContext('2d');
  sx.translate(96,96); sx.beginPath();
  for(let i=0;i<=64;i++){ const a = i/64*Math.PI*2, r = 80 + Math.sin(a*7)*3 + Math.sin(a*3+1)*2.5; i ? sx.lineTo(Math.cos(a)*r, Math.sin(a)*r) : sx.moveTo(Math.cos(a)*r, Math.sin(a)*r); }
  sx.closePath(); let sg = sx.createRadialGradient(-26,-30,8,0,0,90); sg.addColorStop(0,'#ff6b83'); sg.addColorStop(.55,'#d8243f'); sg.addColorStop(1,'#8e1228');
  sx.shadowColor = 'rgba(60,0,15,.45)'; sx.shadowBlur = 14; sx.shadowOffsetY = 5; sx.fillStyle = sg; sx.fill(); sx.shadowColor = 'transparent';
  sx.strokeStyle = 'rgba(255,170,185,.55)'; sx.lineWidth = 3; sx.beginPath(); sx.arc(0,0,60,0,7); sx.stroke();
  sx.beginPath(); sx.moveTo(0,36); sx.bezierCurveTo(-46,6,-34,-34,0,-12); sx.bezierCurveTo(34,-34,46,6,0,36);
  sx.fillStyle = '#b01a33'; sx.fill(); sx.lineWidth = 3; sx.strokeStyle = 'rgba(255,190,200,.7)'; sx.stroke();
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
  const seal = new THREE.Mesh(new THREE.PlaneGeometry(.085,.085), new THREE.MeshBasicMaterial({ map:st, transparent:true, toneMapped:false, depthWrite:false }));
  seal.position.set(0,-.14,.002); seal.raycast = () => {}; flap.add(seal);
  const eh = hitMesh(new THREE.PlaneGeometry(.56,.4), 'env'); eh.position.z = .02; eg.add(eh);
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
/* ── trái tim bay lên + quầng sáng hồng toả ra từ hộp (hiện khi hộp đã mở) ── */
let hb = 0;
const HN = 44, hPos = new Float32Array(HN*3), hX = new Float32Array(HN), hV = new Float32Array(HN), hP = new Float32Array(HN);
for(let i=0;i<HN;i++){ hX[i] = (Math.random()*2-1)*2.4; hV[i] = .18 + Math.random()*.3; hP[i] = Math.random()*6.28; hPos[i*3] = hX[i]; hPos[i*3+1] = -1.8 + Math.random()*5.2; hPos[i*3+2] = (Math.random()*2-1)*1.4; }
const heartTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32,28,2,32,32,30); g.addColorStop(0,'#ffd6e0'); g.addColorStop(1,'#ff5c86');
  x.fillStyle = g; x.beginPath(); x.moveTo(32,56); x.bezierCurveTo(2,34,10,6,32,22); x.bezierCurveTo(54,6,62,34,32,56); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const hGeo = new THREE.BufferGeometry(); hGeo.setAttribute('position', new THREE.BufferAttribute(hPos,3));
const hMat = new THREE.PointsMaterial({ map:heartTex, size:.17, sizeAttenuation:true, transparent:true, opacity:0, depthWrite:false });
const hearts = new THREE.Points(hGeo, hMat); hearts.frustumCulled = false; hearts.raycast = () => {}; hearts.visible = false; scene.add(hearts);
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.35,'rgba(255,170,200,.45)'); g.addColorStop(1,'rgba(255,120,170,0)');
  x.fillStyle = g; x.fillRect(0,0,128,128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const gMat = new THREE.SpriteMaterial({ map:glowTex, color:0xffb8d0, transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending });
const glowS = new THREE.Sprite(gMat); glowS.scale.set(3.4,3.4,1); glowS.position.set(0,.4,0); glowS.visible = false; glowS.raycast = () => {}; cube.add(glowS);
function updateHearts(dt, time){
  const a = smooth(S.rise);
  hMat.opacity = a*(.55 + .35*Math.min(1,hb)); hearts.visible = a > .01;
  gMat.opacity = a*(.3 + .1*Math.sin(time*1.8) + .35*Math.min(1,hb)); glowS.visible = a > .01;
  hb *= Math.exp(-dt*.7);
  if(a < .01) return;
  const sp = 1 + hb*5;
  for(let i=0;i<HN;i++){
    hPos[i*3+1] += hV[i]*dt*sp;
    if(hPos[i*3+1] > 3.4){ hPos[i*3+1] = -1.8; hX[i] = (Math.random()*2-1)*2.4; }
    hPos[i*3] = hX[i] + Math.sin(time*.8 + hP[i])*.18;
  }
  hGeo.attributes.position.needsUpdate = true;
}

const S = { mode:'wait', stage:0, u:0, uT:0, rise:0, shk:0, lidM:0, lidB:0, zoom:0, zi:0 };
const rot = { yaw:0, pitch:.12, tYaw:0, tPitch:.12, vYaw:0, vPitch:0, drag:false, idle:0 };
const par = { x:0, y:0, tx:0, ty:0 };
const tilt = { x:0, y:0 };
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
let ENVDONE = false, CLOSING = false, ENVHANG = false;
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
  lidHinge.rotation.x = -THREE.MathUtils.degToRad(112) * (1-Math.pow(1-lid,2)) - S.lidB;
  sides.forEach((s,k) => {
    const a = clamp(0,1,(u-.26-k*.035)/.55); s.a = a;
    s.hinge.rotation.x = s.open * (1-Math.pow(1-a,3));
  });
  glow.intensity = Math.max(u*u*20, S.lidM*S.lidM*7);
}

/* ── camera ──────────────────────────────────── */
function updateCamera(){
  const e = smooth(S.u), r = S.rise;
  const dist = lerp(D0, D1, e) * (1 - .1*r - .07*S.zoom - .36*S.zi);
    const pitch = lerp(.1, .66, e) - .12*r;
  const ty = lerp(0, .5, e) + .1*r - .12*S.zi;
  camera.position.set(par.x*.32, ty + Math.sin(pitch)*dist - par.y*.2, Math.cos(pitch)*dist);
  camera.lookAt(par.x*.08, ty, 0);
}

/* ════════════════════════════════════════════════
   CHỌN VẬT THỂ BẰNG TIA
   ════════════════════════════════════════════════ */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const inLetter = o => { while(o){ if(o === letter) return true; o = o.parent; } return false; };
function pick(x, y){
  ndc.set(x/W()*2-1, -(y/H())*2+1); ray.setFromCamera(ndc, camera);
  /* bỏ qua vật đang ẩn (thư chưa ra, ảnh chưa hiện...) */
  const hits = ray.intersectObject(cube, true).filter(h => { let o = h.object; while(o){ if(!o.visible) return false; o = o.parent; } return true; });
  for(const h of hits){
    /* thư đã tắt và đang nổi: không che ảnh / phong bì phía sau */
    if(S.mode === 'items' && inLetter(h.object)) continue;
    if(h.object.userData.hit) return { kind:h.object.userData.hit, idx:h.object.userData.idx, obj:h.object };
    if(h.object.material && h.object.material.visible !== false) return null;
  }
  return null;
}

/* ════════════════════════════════════════════════
   GỢI Ý BẰNG BÓNG TAY (không chữ)
   ════════════════════════════════════════════════ */
const ghost = $('#ghost'), swipe = $('#swipe'); let ghostTl = null, hintTimer = 0;
/* hiện gợi ý vuốt (huỷ tween cũ để không chồng nhau) */
const showSwipe = () => { gsap.killTweensOf(swipe); gsap.to(swipe, { autoAlpha:1, duration:.7, delay:.3 }); };
/* ẩn gợi ý vuốt và huỷ mọi tween đang chờ hiện lại */
const hideSwipe = () => { gsap.killTweensOf(swipe); gsap.to(swipe, { autoAlpha:0, duration:.25 }); };
function hideGhost(){ if(ghostTl){ ghostTl.kill(); ghostTl = null; } gsap.killTweensOf(ghost); gsap.to(ghost,{ opacity:0, scale:1, duration:.2 }); }
function armHint(ms=4500){ clearTimeout(hintTimer); hintTimer = setTimeout(playHint, ms); }
function playHint(){
  hideGhost();
  if(!['play','unfold','letter','items'].includes(S.mode) || P) return;
    if(S.mode === 'items' && (ENVDONE || GR.busy)) return;
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
    } else if(S.mode === 'items'){
    const c = toScreen(GR.done ? env : can);
    if(!GR.done){
      tl.call(() => at(c.x,c.y))
        .to(ghost,{ opacity:1, duration:.25 })
        .to(ghost,{ scale:.8, duration:.2 })
        .to(ghost,{ scale:.8, duration:1.8 })
        .to(ghost,{ opacity:0, scale:1, duration:.3 });
    } else {
      tl.call(() => at(c.x,c.y))
        .to(ghost,{ opacity:1, duration:.25 })
        .to(ghost,{ scale:.72, duration:.14, ease:'power2.out' })
        .to(ghost,{ scale:1, duration:.3, ease:'back.out(3)' })
        .to(ghost,{ opacity:0, duration:.3 }, '+=.2');
    }
  } else if(S.mode === 'unfold'){
    const c = toScreen(cube);
    tl.call(() => at(c.x,c.y+50))
      .to(ghost,{ opacity:1, scale:.85, duration:.3 })
      .to(ghost,{ y:c.y-Math.min(190,H()*.26), duration:1.2, ease:'power2.inOut' })
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
    paintDigit(i, '-', 'w', .5); Snd.click(2600 + i*220, .16, 6, .03);
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

/* ĐÚNG: số xanh, sóng sáng lan trên phím, bảng hiện OPEn (xanh lá đậm, nổi khối), bulông vặn ra, lật lên đỉnh, mở nắp cơ khí */
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
  /* bảng đổi sang OPEn: xanh lá đậm, chữ nổi hẳn lên khỏi mặt kính */
  gsap.delayedCall(.9, () => {
    showWord('OPEn', 'o', 8); barTone('o', 3);
    kLight.color.setHex(0x9dffbd);
    KEY.digits.forEach((D,i) => {
      gsap.fromTo(D.g.position, { z:.2 }, { z:.178, duration:.5, delay:i*.06, ease:'back.out(2.5)' });
      gsap.to(D.g.scale, { x:1.14, y:1.14, z:2.6, duration:.6, delay:i*.06, ease:'back.out(2)' });
    });
    const gp = new THREE.Vector3(0,.64,.25); kf.localToWorld(gp); burst(gp, 40, 1.2, .2);
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
   MỞ NẮP CƠ KHÍ — từ đỉnh hộp (nhiều bước, các bộ phận kéo nhau)
   1  tháo 16 ốc vít ở 4 mặt bên
   2  đèn LED chạy dọc nắp, đĩa trung tâm trồi lên và vặn,
      bánh răng vành lớn + 2 hàng bánh răng ăn khớp quay theo đĩa
   3  đĩa tiếp tục vặn → bánh răng kéo 4 chốt khoá thụt ra lần lượt
   4  4 càng kẹp góc bật ra, đĩa hạ xuống khớp
   5  hơi nén xì, 4 trụ telescopic nâng nắp xoắn ốc (bánh răng vẫn quay)
   6  bản lề bật mở, nắp nảy lò xo, ánh sáng trào ra
   ════════════════════════════════════════════════ */
function mechOpen(){
  S.mode = 'mech'; hideGhost(); clearTimeout(hintTimer);
  const L = lidParts, o = .9, gearT = { v:0 }, drive = () => setGears(gearT.v);
  const tl = gsap.timeline({ onComplete: () => { rot.idle = -.4; S.mode = 'unfold'; showSwipe(); armHint(1200); } });

  /* 1 — tháo 16 ốc vít ở 4 mặt bên (vặn ra, nhô lên) */
  tl.call(() => { Snd.ratchet(18, .95, 3100); haptic([6,20,6,20,6,20,6]); }, null, 0);
  SCREWS.forEach((s,i) => {
    const d = (i%4)*.05 + ((i/4)|0)*.05;
    tl.to(s.rotation, { y:(i%2?-1:1)*Math.PI*5, duration:.7, ease:'power2.inOut' }, d)
      .to(s.position, { z:.036, duration:.7, ease:'power2.out' }, d);
  });

  /* 2 — LED chạy, đĩa trồi lên và vặn, bánh răng quay theo */
  L.leds.forEach((l,i) => tl.call(() => { ledSet(l, true); if(i%3 === 0) Snd.click(2300+i*40, .14, 6, .03); }, null, o-.1 + i*.07));
  tl.call(() => { Snd.ratchet(20, 1.2, 2300); haptic([8,30,8,30,8,30]); }, null, o)
    .to(S, { zoom:.55, duration:1.6, ease:'power2.inOut' }, o)
    .to(L.disc.position, { y:.17, duration:.55, ease:'power2.out' }, o)
    .to(L.disc.rotation, { y:-Math.PI*2, duration:1.2, ease:'power2.inOut' }, o+.3)
    .to(gearT, { v:Math.PI*2.4, duration:1.5, ease:'power2.inOut', onUpdate:drive }, o+.2)
    .fromTo(L.dot.scale, { x:1, z:1 }, { x:1.9, z:1.9, duration:.3, yoyo:true, repeat:1, ease:'power2.out', immediateRender:false }, o+1.1);

  /* 3 — đĩa vặn tiếp, bánh răng kéo 4 chốt khoá thụt ra */
  const p2 = o+1.7;
  tl.call(() => { Snd.ratchet(16, 1.4, 2000); haptic([8,30,8,30,8,30]); }, null, p2)
    .to(L.disc.rotation, { y:-Math.PI*4, duration:1.4, ease:'none' }, p2)
    .to(gearT, { v:Math.PI*4.8, duration:1.4, ease:'none', onUpdate:() => {
      drive();
      const q = clamp(0,1,(gearT.v-Math.PI*2.4)/(Math.PI*2.4));
      L.latches.forEach((l,i) => {
        const qi = clamp(0,1,q*1.6 - i*.2);
        l.s.position.z = l.dir*.15*smooth(qi);
        if(qi > .5 && !l.f){ l.f = 1; Snd.click(1500+i*180,.4,3,.06); haptic(12); }
      });
    } }, p2);

  /* 4 — càng kẹp ở góc bật ra, đĩa hạ xuống */
  const ct = p2+1.5;
  tl.call(() => { Snd.thump(.4); haptic([14,30,14]); }, null, ct)
    .to(L.disc.position, { y:.08, duration:.4, ease:'power2.in' }, ct);
  L.clamps.forEach((c,i) => {
    tl.call(() => Snd.click(1100+i*160,.4,3,.08), null, ct+i*.1)
      .to(c.g.rotation, { y:(c.a*c.b>0 ? -1 : 1)*Math.PI/2, duration:.45, ease:'power2.inOut' }, ct+i*.1)
      .to(c.g.position, { x:c.x*1.12, z:c.z*1.12, duration:.45, ease:'power2.inOut' }, ct+i*.1);
  });

  /* 5 — hơi nén xì ra, trụ telescopic nâng nắp xoắn ốc, bánh răng vẫn quay, camera đẩy gần */
  const lt = ct+.8;
  tl.call(() => {
      Snd.servo(1.55, .12); haptic([10,20,10,20,10,20,40]);
      posts.forEach(p => { const w = new THREE.Vector3(); p.g.getWorldPosition(w); burst(w, 14, .7, .6); });
    }, null, lt)
    .to(S, { zoom:1, duration:1.55, ease:'power2.inOut' }, lt)
    .to(lift, { v:.55, duration:1.55, ease:'power2.inOut', onUpdate:() => { setLift(lift.v); setGears(Math.PI*4.8 + lift.v*10); L.disc.rotation.y = -Math.PI*4 - lift.v*7; } }, lt)
    .to(lidSlide.rotation, { y:-Math.PI*2, duration:1.55, ease:'power2.inOut' }, lt)
    .call(() => { lidSlide.rotation.y = 0; Snd.thump(.5); Snd.click(1200,.4,2,.1); haptic(18); }, null, lt+1.58);

  /* 6 — bản lề bật mở, nắp nảy lò xo, trụ co lại, ánh sáng trào ra */
  const ot = lt+1.65;
  tl.call(() => { Snd.whoosh(1.1,.2); Snd.servo(1.0,.07); }, null, ot)
    .to(S, { lidM:1, duration:1.25, ease:'power3.inOut' }, ot)
    .to(lift, { v:0, duration:1.25, ease:'power2.in', onUpdate:() => setLift(lift.v) }, ot)
    .to(S, { zoom:0, duration:1.4, ease:'power2.inOut' }, ot)
    .call(() => {
      chord([0,2,4,5]); Snd.note(PENT[0]*.5, .16, 3); haptic([20,40,30]);
      const p = new THREE.Vector3(0,1.0,0); cube.localToWorld(p); burst(p, 90, 2.6, 1.4);
    }, null, ot+.4)
    .call(() => { Snd.thump(.55); Snd.click(900,.4,2,.1); haptic([30,40,20]); }, null, ot+1.25)
    .fromTo(S, { lidB:.16 }, { lidB:0, duration:1.1, ease:'elastic.out(1,.3)', immediateRender:false }, ot+1.25)
    .fromTo(S, { shk:.05 }, { shk:0, duration:.7, ease:'elastic.out(1,.25)', immediateRender:false }, ot+1.25)
    .call(() => { setLift(0); }, null, ot+1.3);
}

/* ════════════════════════════════════════════════
   BƯỚC 6 — kéo hộp bung ra (ảnh + phong bì hiện trên đáy hộp)
   ════════════════════════════════════════════════ */
function finishUnfold(){
    Music.start();                                              /* hộp đã mở → vào nhạc mp3 */
  if(CONFIG.music && CONFIG.music.enabled && !CONFIG.music.synthAfterOpen) Snd.setFxOff(true);
  S.mode = 'rise'; hideGhost(); hideSwipe(); clearTimeout(hintTimer);
  Snd.whoosh(1.4,.26); haptic([20,40,30]);
  gsap.to(S, { u:1, duration:1, ease:'power3.out' });
  gsap.delayedCall(.9, () => {
    chord([0,2,4,5]); Snd.note(PENT[0]*.5, .16, 3);
    const p = new THREE.Vector3(0,.2,0); cube.localToWorld(p); burst(p, 90, 2.6, 1.2); haptic(30);
  });
  gsap.to(S, { rise:1, duration:2.4, delay:.7, ease:'expo.out' });
  gsap.to(S, { zi:1, duration:2, delay:1.4, ease:'power2.inOut' });
    gsap.delayedCall(1.3, introSprout);
  gsap.delayedCall(2.8, () => { S.mode = 'items'; markPip(5); armHint(2600); });
}

/* ════════════════════════════════════════════════
   BƯỚC 6b — xem ảnh instax, mở phong bì
   ════════════════════════════════════════════════ */
const pv = $('#pv'), pvc = $('#pvc');
function showPhoto(i){
  S.mode = 'photo'; hideGhost(); clearTimeout(hintTimer);
  const x = pvc.getContext('2d'); x.clearRect(0,0,432,688); x.drawImage(photoCv[i],0,0);
  Snd.note(PENT[(i*2+1)%5], .12, 1.6); Snd.click(1500,.3,3,.06); haptic(10);
  gsap.fromTo(pvc, { scale:.5, rotation:-8, y:60 }, { scale:1, rotation:-2, y:0, duration:.7, ease:'back.out(1.6)' });
  gsap.to(pv, { autoAlpha:1, duration:.35 });
}
pv.addEventListener('click', () => {
  if(S.mode !== 'photo') return; haptic(6); Snd.click(900,.25,2,.07);
  gsap.to(pvc, { scale:.6, y:40, duration:.3, ease:'power2.in' });
  gsap.to(pv, { autoAlpha:0, duration:.3, onComplete:() => { S.mode = 'items'; armHint(3000); } });
});
/* phong bì bay lên, mở nắp, thư ló ra rồi trượt hẳn lên khỏi phong bì, phong bì chìm xuống */
function openEnvelope(){
  if(S.mode !== 'items' || CLOSING) return; S.mode = 'envopen'; ENVDONE = true; ENVHANG = false; setCord(false); eg.rotation.z = 0; hideGhost(); clearTimeout(hintTimer);
  haptic([10,30,14]); Snd.whoosh(.9,.18); Snd.click(1300,.35,3,.07); Snd.note(PENT[2], .12, 1.8);
  cube.attach(env);
  const wp = new THREE.Vector3();
  gsap.timeline({ onComplete:() => { S.mode = 'letter'; armHint(2200); } })
    .to(env.position, { x:0, y:.45, z:.4, duration:1.1, ease:'power3.inOut' }, 0)
    .to(env.rotation, { x:Math.PI/2-.54, y:0, duration:1.1, ease:'power3.inOut' }, 0)
    .to(env.scale, { x:1.7, y:1.7, z:1.7, duration:1.1, ease:'power3.inOut' }, 0)
    .call(() => { Snd.click(1000,.4,2,.1); haptic(10); const w = new THREE.Vector3(); env.getWorldPosition(w); burst(w, 14, .8, .3); }, null, 1.2)
    .to(flapHinge.rotation, { x:-Math.PI, duration:.9, ease:'back.out(1.3)' }, 1.3)
    .call(() => { Snd.whoosh(.7,.12); Snd.note(PENT[3], .1, 1.6); letter.visible = true; }, null, 2.0)
    /* 1) thư trồi nhẹ lên khỏi miệng phong bì, hơi lắc */
    .to(LT, { o:1, duration:1.0, ease:'back.out(1.3)' }, 2.05)
    .call(() => { haptic([8,24,8]); letter.getWorldPosition(wp); burst(wp, 18, .9, .7); }, null, 2.7)
    /* 2) khựng lại một nhịp rồi bay vọt lên, phóng to, quay thẳng về phía người xem */
    .call(() => { Snd.whoosh(1.1,.2); Snd.note(PENT[4], .1, 2); Snd.note(PENT[5], .08, 2.2, .1); haptic([12,30,18]); }, null, 3.35)
    .to(LT, { e:1, duration:1.7, ease:'power3.inOut' }, 3.4)
    .call(() => { letter.getWorldPosition(wp); burst(wp, 40, 1.6, .8); }, null, 4.3)
    /* 3) phong bì trượt xuống và nhỏ dần */
    .to(env.position, { y:-.2, duration:.9, ease:'power2.in' }, 3.6)
    .to(env.scale, { x:.01, y:.01, z:.01, duration:.9, ease:'power2.in' }, 3.6);
}

/* ════════════════════════════════════════════════
   BƯỚC 7 — kéo thư lên → thư biến thành kính (có nút tắt để quay lại xem ảnh)
   ════════════════════════════════════════════════ */
const letterEl = $('#letter'), pagesWrap = $('#pages'), xl = $('#xl'), rl = $('#rl');
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

/* tự co cỡ chữ để mỗi trang luôn nằm gọn trong khung (iPhone màn nhỏ, chữ dài) */
function fitPage(el){
  el.style.removeProperty('--fs');
  const p = el.querySelector('p'); let fs = parseFloat(getComputedStyle(p).fontSize);
  const used = () => { const a = el.firstElementChild, b = el.lastElementChild; return b.offsetTop + b.offsetHeight - a.offsetTop; };
  let n = 0;
  while(used() > el.clientHeight && fs > 15 && n++ < 14){ fs *= .94; el.style.setProperty('--fs', fs.toFixed(2) + 'px'); }
}
const fitAll = () => pagesEl.forEach(fitPage);
addEventListener('resize', fitAll);
if(document.fonts){ document.fonts.ready.then(fitAll); document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', fitAll); }
fitAll();

function letterRect(){
  const xs = [], ys = [];
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b]) => { _v.set(a*LW/2, b*LH/2, 0); letter.localToWorld(_v); _v.project(camera); xs.push((_v.x*.5+.5)*W()); ys.push((-_v.y*.5+.5)*H()); });
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w:Math.max(...xs)-x, h:Math.max(...ys)-y };
}
function openLetter(again){
  if(again ? S.mode !== 'items' : S.mode !== 'letter') return; S.mode = 'opening'; hideGhost(); clearTimeout(hintTimer);
  letterEl.style.pointerEvents = '';
  haptic([12,30,18]); Snd.whoosh(.9,.2); Snd.note(PENT[3], .12, 2); Snd.note(PENT[5], .1, 2.2, .1);
  if(!again) markPip(6);
  gsap.to(rl, { autoAlpha:0, duration:.25 });
  const r = letterRect(), fw = Math.min(W()*.88,500), fh = Math.min(H()*.7,620), fx = (W()-fw)/2, fy = (H()-fh)/2;
  gsap.set(letterEl, { autoAlpha:1, margin:0, left:r.x, top:r.y, width:r.w, height:r.h, '--pa':.95, '--rad':'6px', transformPerspective:1100, rotationX:0, rotationY:0 });
  letter.visible = false;
  gsap.timeline({ onComplete:() => { gsap.set(letterEl, { clearProps:'left,top,width,height,margin' }); S.mode = 'reading'; } })
    .to(dock, { autoAlpha:0, duration:.3 }, 0)
    .to(letterEl, { left:fx, top:fy, width:fw, height:fh, duration:1.25, ease:'expo.inOut' }, 0)
    .to(letterEl, { '--pa':.09, '--rad':'30px', duration:1, ease:'power2.inOut' }, .2)
    .call(() => { if(!again){ dock.classList.remove('pips'); buildDots(CONFIG.pages.length); if(cur === 0) cur = -1; showPage(0,1); } }, null, .95)
    .to(dock, { autoAlpha:1, duration:.7 }, 1.1);
}

/* tắt thư: thu về thành tờ giấy nổi trên hộp, để còn xem ảnh; có nút "Xem lại thư" để mở lại */
function closeLetter(){
  if(S.mode !== 'reading' || busy) return; S.mode = 'closing'; hideGhost();
  P = null; rot.drag = false; letterEl.style.pointerEvents = 'none';
  haptic(8); Snd.click(1000,.3,2,.08); Snd.note(PENT[1], .08, 1.4);
  const r = letterRect(), fw = Math.min(W()*.88,500), fh = Math.min(H()*.7,620), fx = (W()-fw)/2, fy = (H()-fh)/2;
  gsap.set(letterEl, { margin:0, left:fx, top:fy, width:fw, height:fh, rotationX:0, rotationY:0 });
    gsap.timeline({ onComplete:() => { S.mode = 'items'; CLOSING = false; ENVDONE = false; ENVHANG = true; setCord(true); armHint(2500); } })
    .to(dock, { autoAlpha:0, duration:.25 }, 0)
    .to(letterEl, { left:r.x, top:r.y, width:r.w, height:r.h, duration:.9, ease:'expo.inOut' }, 0)
    .to(letterEl, { '--pa':.95, '--rad':'6px', duration:.7, ease:'power2.inOut' }, .1)
    /* thư hiện lại ở chỗ vừa bay ra, phong bì nổi lên đón */
    .call(() => {
      letter.visible = true;
      env.position.set(0,-.2,.4); env.rotation.set(Math.PI/2-.54,0,0); env.scale.setScalar(.01); flapHinge.rotation.x = -Math.PI;
    }, null, .85)
    .to(letterEl, { autoAlpha:0, duration:.15 }, .85)
    .call(() => { gsap.set(letterEl, { clearProps:'left,top,width,height,margin' }); }, null, 1.1)
    /* thư đã tắt: cho phép bấm ảnh ngay, không cần chờ thư về phong bì */
    .call(() => { S.mode = 'items'; CLOSING = true; P = null; rot.drag = false; }, null, 1.15)
    .to(env.position, { y:.45, duration:.7, ease:'power2.out' }, .9)
    .to(env.scale, { x:1.7, y:1.7, z:1.7, duration:.7, ease:'power2.out' }, .9)
    .call(() => { Snd.whoosh(.9,.14); Snd.note(PENT[2], .1, 1.6); }, null, 1.0)
    /* thư bay ngược về, chui vào phong bì */
    .to(LT, { e:0, duration:1.3, ease:'power3.inOut' }, 1.0)
    .to(LT, { o:0, duration:.6, ease:'power2.in' }, 2.35)
    .call(() => { Snd.click(1000,.3,2,.08); haptic(8); }, null, 2.9)
    .call(() => { letter.visible = false; }, null, 2.95)
    /* nắp đóng lại, phong bì về chỗ cũ trên đáy hộp */
    .to(flapHinge.rotation, { x:0, duration:.7, ease:'power2.inOut' }, 2.95)
        .call(() => { plant.attach(env); Snd.whoosh(.7,.1); }, null, 3.65)
    .to(env.position, { x:ENV.x, y:ENV.y, z:ENV.z, duration:.9, ease:'power3.inOut' }, 3.65)
    .to(env.rotation, { x:ENV.rx, y:bbY(), z:0, duration:.9, ease:'power3.inOut' }, 3.65)
    .to(env.scale, { x:ENV.s, y:ENV.s, z:ENV.s, duration:.9, ease:'power3.inOut' }, 3.65);
}
['pointerdown','pointerup'].forEach(t => xl.addEventListener(t, e => e.stopPropagation()));
xl.addEventListener('click', closeLetter);
rl.addEventListener('click', () => openLetter(true));

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
  hb = 1; chord([0,2,4,5]); haptic([10,50,10,50,24]);
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
  if(e.key === 'Escape'){ closeLetter(); return; }
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
  if(P && performance.now() - P.t0 > 1500) P = null;
  if(P) return; e.preventDefault(); Snd.init(); askMotion(); hideGhost(); clearTimeout(hintTimer);
  const hit = (S.mode === 'play' || S.mode === 'letter' || S.mode === 'items' || S.mode === 'transition' || S.mode === 'code') ? pick(e.clientX, e.clientY) : null;
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
  } else if(S.mode === 'unfold'){ P.kind = 'pull'; hideSwipe(); }
  else if(S.mode === 'items'){
    if(hit && hit.kind === 'photo'){ P.kind = 'none'; showPhoto(hit.idx); }
      else if(hit && hit.kind === 'env' && GR.done){ P.kind = 'none'; openEnvelope(); }
    else if(hit && hit.kind === 'water' && !GR.done){ P.kind = 'water'; haptic(6); }
    else { P.kind = 'rot'; startRot(e); }
  }
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
            gsap.delayedCall(1, () => { if(S.mode === 'unfold') showSwipe(); });   /* chỉ hiện lại nếu hộp chưa mở */
      if(tap){ Snd.click(800,.25,2,.08); haptic(8); gsap.fromTo(S,{ u:.0 },{ u:.12, duration:.22, yoyo:true, repeat:1, ease:'power2.out', overwrite:true }); }
    }
  } else if(k === 'lift'){ if(tap) { P = null; openLetter(); return; } }
  P = null;
  if(['play','unfold','letter','items'].includes(S.mode)) armHint();
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
/* tắt double-tap (zoom / chọn chữ / kích hoạt hai lần) */
let lastTE = 0;
document.addEventListener('touchend', e => { const n = Date.now(); if(n - lastTE < 350) e.preventDefault(); lastTE = n; }, { passive:false });
document.addEventListener('dblclick', e => e.preventDefault());
addEventListener('touchend', () => Snd.init(), { passive:true });
addEventListener('click', () => Snd.init());

const snd = $('#snd');
/* nút loa: tắt/bật cả âm tổng hợp lẫn mp3 */
snd.addEventListener('click', () => {
  Snd.init(); Snd.setMuted(!Snd.muted); Music.setMuted(Snd.muted);
  snd.classList.toggle('muted', Snd.muted);
});

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
    } else if(S.mode === 'letter' || S.mode === 'items' || S.mode === 'envopen' || S.mode === 'photo' || S.mode === 'rise' || S.mode === 'opening' || S.mode === 'reading' || S.mode === 'closing'){
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
    L.segs.forEach((s,i) => { const on = (i+.5)/10 <= L.t + .001; if(s.userData.on !== on){ s.userData.on = on; gsap.to(s.material,{ emissiveIntensity:on?2.6:0, duration:.2 }); gsap.to(s.material.color,{ r:on?.16:.17, g:on?.94:.18, b:on?.63:.19, duration:.2 }); } });
    const tk = Math.floor(L.t*10); if(tk !== L.ticks){ L.ticks = tk; Snd.click(2000+tk*80,.2,5,.035); haptic(4); }
    if(L.t >= .985){ L.done = true; L.held = false; L.t = 1; L.target = 1; gsap.to(L.knob.position,{ x:.64, duration:.15 }); L.segs.forEach(s => { s.userData.on = true; s.material.emissiveIntensity = 2.6; s.material.color.setRGB(.16,.94,.63); }); stageDone(1); }
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
  /* mỗi mặt bên: tiếng nhả chốt khi bắt đầu mở, tiếng cạch nặng khi mở hết */
  sides.forEach((s,k) => {
    if(s.a > .03 && !s.un){ s.un = true; Snd.click(1250+k*140,.38,3,.08); haptic(8); }
    if(s.a >= .985 && !s.full){ s.full = true; Snd.thump(.28); Snd.click(700,.3,2,.1); gsap.fromTo(S,{ shk:.03 },{ shk:0, duration:.4, ease:'elastic.out(1,.3)' }); }
    if(s.a < .02){ s.un = false; s.full = false; }
  });

  /* thư: ló ra khỏi phong bì (LT.o), bay lên (LT.e) rồi nổi lên như cũ */
  const rs = S.rise;
    letter.position.y = lerp(LS.y + LT.o*.4, lerp(-.32, 1.25, rs) + + Math.sin(time*1.6)*.025*rs + (P && P.kind === 'lift' ? (P.lift||0)*.25 : 0), LT.e);
  letter.position.x = lerp(LS.x, 0, LT.e);
  letter.position.z = lerp(LS.z, lerp(0, .15, rs), LT.e);
  letter.rotation.x = -(lerp(.1,.66,smooth(S.u)) - .12*rs)*rs;
  letter.position.z = lerp(LS.z, lerp(0, .85, rs), LT.e);
  const ls = 1 + Math.sin(time*2.2)*.012*rs; letter.scale.setScalar(ls*lerp(1,1.22,rs)*lerp(lerp(.3,.52,LT.o),1,LT.e));

  /* ảnh + phong bì hiện dần khi hộp bung ra */
  { const iu = smooth((S.u-.5)/.5); items.visible = iu > .01; items.scale.setScalar(Math.max(.001, iu)); }

  /* DOM nghiêng theo con trỏ */
  if(S.mode === 'reading' && !letterEl.dataset.fx) gsap.set(letterEl, { rotationY:par.x*5, rotationX:-par.y*4 });

  updateGarden(dt, time); updateHearts(dt, time); updateCamera(); updateSparks(dt);
    renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* debug (chỉ khi mở với ?debug) */
if(location.search.includes('debug')) window.__love = { S, MECH, KEY, camera, cube, toScreen, pick, letter, rot, THREE, getP:()=>P, par, enterCode, mechOpen, codeOK, codeBad };
