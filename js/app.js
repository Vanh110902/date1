(() => {
'use strict';
const C = window.CONFIG, $ = s => document.querySelector(s), stage = $('#stage'), nxt = $('#nxt'), back = $('#back');
const personalize = text => String(text).replace(/\{name\}/g, C.name || 'bạn');
const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const R = (a, b) => a + Math.random() * (b - a);
const ICON = {
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4z"/><path d="M16 9a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4z"/><path d="m17 9 5 6m0-6-5 6"/></svg>',
  previous: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM15 5h4v14h-4z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5a1 1 0 0 1 1.5-.86l10 6.36a1.18 1.18 0 0 1 0 2L9.5 19.36A1 1 0 0 1 8 18.5z"/></svg>'
};
const petalLayer = $('#petal-layer');
if (petalLayer) for (let i = 0; i < 12; i++) { const p = document.createElement('i'); p.className = 'ambient-petal'; p.style.setProperty('--x', `${R(2, 98)}%`); p.style.setProperty('--dur', `${R(9, 17)}s`); p.style.setProperty('--delay', `${R(-16, 0)}s`); petalLayer.append(p); }

/* ================= ÂM THANH (sfx tổng hợp bằng WebAudio, không cần file) ================= */
const Snd = (() => {
  let ac;
  const A = () => ac || (ac = new (window.AudioContext || window.webkitAudioContext)());
  const tone = (f, t0, d, type = 'sine', v = .12) => {
    const a = A(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .05);
  };
  return {
    chime(f = [660, 880, 1320]) { try { f.forEach((v, i) => tone(v, i * .09, .9)); } catch (e) {} },
    boom() { try { tone(150, 0, .35, 'triangle', .08); } catch (e) {} }
  };
})();

/* ================= HIỆU ỨNG ================= */
const FX = (() => {
  const c = $('#fx'), g = c.getContext('2d', { desynchronized: true }), LITE = rm || innerWidth < 700, dpr = Math.min(devicePixelRatio || 1, LITE ? 1.5 : 2);
  let W, H, P = [], M = [], raf = 0, last = 0, T = 0, fw = 0, nfw = 0, acc = {}, q = 1, fa = 0, fn = 0; // q = chất lượng tự điều chỉnh (0.4–1)
  const cap = rm ? 10 : LITE ? 24 : 60;
  const size = () => { W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 150); }); size();
  const spark = (x, y, vx, vy, h) => P.push({ k: 'd', x, y, vx, vy, h, l: 1.6, m: 1.6 });
  function burst(x, y, heart) {
    start(); const h0 = [330, 345, 285, 45, 200][Math.random() * 5 | 0], n = Math.max(20, Math.round((heart ? (LITE ? 40 : 56) : (LITE ? 30 : 44)) * q));
    for (let i = 0; i < n; i++) {
      let vx, vy;
      if (heart) { const t = i / n * 6.283; vx = 16 * Math.sin(t) ** 3 * 19; vy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 19; }
      else { const a = R(0, 6.283), s = R(60, 300); vx = Math.cos(a) * s; vy = Math.sin(a) * s; }
      spark(x, y, vx, vy, h0 + R(-15, 15));
    }
  }
  function spawn(m) {
    if (P.length > cap + 120) return;
    if (m === 'petals') P.push({ k: 'p', x: R(0, W), y: -24, vx: R(-18, 18), vy: R(32, 68), s: R(7, 11), r: R(0, 6), vr: R(-.35, .35), ph: R(0, 6), h: R(330, 350), a: R(.62, .82) });
    if (m === 'hearts') P.push({ k: 'h', x: R(0, W), y: H + 30, vx: R(-15, 15), vy: -R(50, 120), s: R(10, 20), r: R(-.3, .3), vr: R(-.5, .5), l: 5, a: .8, color: `hsl(${R(325, 355)},75%,72%)` });
  }
  function loop(now) {
    const raw = now - last;
    if (M.length === 1 && M[0] === 'stars' && raw < 30) { raf = requestAnimationFrame(loop); return; } // cảnh sao tĩnh: ~30fps là đủ
    const dt = Math.min(raw / 1000, .05); last = now; T += dt;
    fa += Math.min(raw, 100); if (++fn >= 60) { const avg = fa / fn; q = avg > 26 ? Math.max(.4, q * .7) : (avg < 19 && q < 1 ? Math.min(1, q + .1) : q); fa = fn = 0; } // máy yếu -> tự giảm hạt
    g.clearRect(0, 0, W, H);
    for (const m of M) {
      if (m === 'fireworks') { fw -= dt; if (fw <= 0) { fw = R(.9, 1.5) / q; burst(R(W * .15, W * .85), R(H * .12, H * .5), ++nfw % 3 === 0); Snd.boom(); } }
      else if (m === 'petals' || m === 'hearts') { acc[m] = (acc[m] || 0) + dt * (m === 'petals' ? 6 : 5); while (acc[m] >= 1) { acc[m]--; if (P.length < cap * q) spawn(m); } }
    }
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; let dead = false;
      if (p.k === 'p') {
        p.x += (p.vx + Math.sin(T * 1.2 + p.ph) * 14) * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        if (p.y > H + 40) dead = true;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = p.a;
        for (let j = 0; j < 5; j++) { g.save(); g.rotate(j * 6.283 / 5); g.fillStyle = `hsl(${p.h + j * 2},88%,${j % 2 ? 83 : 78}%)`; g.beginPath(); g.ellipse(0, -p.s * .48, p.s * .33, p.s * .58, 0, 0, 6.283); g.fill(); g.restore(); }
        g.fillStyle = '#ffe28a'; g.beginPath(); g.arc(0, 0, p.s * .2, 0, 6.283); g.fill(); g.restore();
      } else if (p.k === 'h') {
        p.x += p.vx * dt + Math.sin(T * 1.5 + p.x) * 8 * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.l -= dt; dead = p.l <= 0 || p.y < -30;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, p.a * Math.min(1, p.l)); g.fillStyle = p.color; g.beginPath();
        g.moveTo(0, p.s * .42); g.bezierCurveTo(-p.s * 1.2, -p.s * .25, -p.s * .58, -p.s, 0, -p.s * .48); g.bezierCurveTo(p.s * .58, -p.s, p.s * 1.2, -p.s * .25, 0, p.s * .42); g.fill(); g.restore();
      } else if (p.k === 'c') {
        p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.vy += 24 * dt; p.l -= dt; dead = p.l <= 0 || p.y > H + 20;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, p.l / p.m); g.fillStyle = p.color; g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 1.5); g.restore();
      } else if (p.k === 'd') {
        const f = Math.max(0, 1 - 1.4 * dt); p.vx *= f; p.vy = p.vy * f + 40 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        p.l -= dt; dead = p.l <= 0; const a = Math.max(0, p.l / p.m);
        g.globalCompositeOperation = 'lighter';
        if (!LITE && q > .7) { g.fillStyle = `hsla(${p.h},100%,70%,${a * .25})`; g.beginPath(); g.arc(p.x, p.y, 6, 0, 6.3); g.fill(); }
        g.fillStyle = `hsla(${p.h},100%,75%,${a})`; g.beginPath(); g.arc(p.x, p.y, 2.2, 0, 6.3); g.fill();
        g.globalCompositeOperation = 'source-over';
      } else if (p.k === 's') {
        g.globalAlpha = .25 + .75 * Math.abs(Math.sin(T * p.sp + p.ph)); g.fillStyle = '#fff'; g.fillRect(p.x, p.y, p.s * 2, p.s * 2); g.globalAlpha = 1;
      } else if (p.k === 'b') {
        p.an += R(-3, 3) * dt; p.x += Math.cos(p.an) * 45 * dt; p.y += (Math.sin(p.an) * 45 - 8) * dt;
        if (p.x < -30) p.x = W + 30; if (p.x > W + 30) p.x = -30; if (p.y < -30) p.y = H + 30; if (p.y > H + 30) p.y = -30;
        g.save(); g.translate(p.x, p.y); g.rotate(Math.sin(p.an) * .2); g.scale(.55 + .45 * Math.abs(Math.sin(T * 9 + p.ph)), 1); g.fillStyle = '#cdb8ff';
        g.beginPath(); g.ellipse(-p.s * .25, -p.s * .12, p.s * .27, p.s * .18, -.55, 0, 6.283); g.ellipse(p.s * .25, -p.s * .12, p.s * .27, p.s * .18, .55, 0, 6.283); g.ellipse(-p.s * .2, p.s * .13, p.s * .2, p.s * .14, .55, 0, 6.283); g.ellipse(p.s * .2, p.s * .13, p.s * .2, p.s * .14, -.55, 0, 6.283); g.fill(); g.fillStyle = '#725783'; g.fillRect(-1, -p.s * .2, 2, p.s * .45); g.restore();
      } else if (p.k === 'l') {
        p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; dead = p.l <= 0;
        const gr = g.createLinearGradient(p.x, p.y, p.x - p.vx * .15, p.y - p.vy * .15);
        gr.addColorStop(0, `rgba(255,255,255,${p.l})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.strokeStyle = gr; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .15, p.y - p.vy * .15); g.stroke();
      }
      if (dead) P.splice(i, 1);
    }
    raf = (M.length || P.length) ? requestAnimationFrame(loop) : 0;
  }
  function start() { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (M.length || P.length) start(); });
  return {
    burst,
    mode(list) {
      this.clear(); M = list; fw = .4; acc = {};
      if (list.includes('stars')) for (let i = 0; i < (LITE ? 45 : 90); i++) P.push({ k: 's', x: R(0, W), y: R(0, H), s: R(.6, 1.8), sp: R(1, 3), ph: R(0, 6) });
      if (list.includes('butterflies')) for (let i = 0; i < (LITE ? 5 : 8); i++) P.push({ k: 'b', x: R(0, W), y: R(0, H), an: R(0, 6), s: R(22, 34), ph: R(0, 6) });
      start();
    },
    clear() { M = []; P = []; cancelAnimationFrame(raf); raf = 0; g.clearRect(0, 0, W, H); },
    rise(x, y) { P.push({ k: 'h', x, y, vx: R(-20, 20), vy: -R(80, 160), s: R(7, 13), r: R(-.3, .3), vr: R(-.5, .5), l: 2.4, a: .85, color: `hsl(${R(325, 355)},75%,72%)` }); start(); },
    confetti(n = 50) { if (LITE) n = Math.round(n * .6); for (let i = 0; i < n; i++) P.push({ k: 'c', x: R(0, W), y: -R(10, 200), vx: R(-30, 30), vy: R(110, 240), s: R(3, 8), r: R(0, 6), vr: R(-3, 3), l: 4, m: 4, color: `hsl(${R(290, 350)},65%,${R(68, 82)}%)` }); start(); },
    shoot() { P.push({ k: 'l', x: R(W * .3, W), y: R(0, H * .3), vx: -650, vy: 320, l: .9, m: .9 }); start(); }
  };
})();

/* ================= TIỆN ÍCH ================= */
const flash = big => { const d = document.createElement('div'); d.className = 'flash' + (big ? ' big' : ''); document.body.append(d); d.onanimationend = () => d.remove(); };
const img = p => { const i = new Image(); i.loading = 'lazy'; i.decoding = 'async'; i.alt = p.description || p.title || ''; i.onerror = () => { i.onerror = null; i.closest('figure')?.remove(); }; i.src = p.src; return i; };

/* ================= QUẢN LÝ SCENE ================= */
let cur = null, idx = -1, busy = false, seen = 0;
function ctxFor(el, i) {
  const T = [], L = [], D = []; let alive = true;
  const x = {
    el, i, get alive() { return alive; }, q: s => el.querySelector(s),
    later: (f, ms) => { const id = setTimeout(() => alive && f(), ms); T.push(id); return id; },
    every: (f, ms) => { const id = setInterval(() => alive && f(), ms); T.push(id); return id; },
    on: (t, e, f, o) => { t.addEventListener(e, f, o); L.push([t, e, f, o]); },
    defer: f => D.push(f),
    sleep: ms => new Promise(r => x.later(r, ms)),
    async type(n, txt, sp = 42) { n.classList.add('caret'); for (const ch of txt) { if (!alive) return; n.textContent += ch; await x.sleep(ch === '\n' ? 280 : sp); } n.classList.remove('caret'); },
    next(lbl) { nxt.textContent = lbl || 'Tiếp tục'; nxt.hidden = false; nxt.classList.remove('show'); void nxt.offsetWidth; nxt.classList.add('show'); },
    end() { alive = false; T.forEach(t => { clearTimeout(t); clearInterval(t); }); L.forEach(([t, e, f, o]) => t.removeEventListener(e, f, o)); D.forEach(f => f()); }
  };
  return x;
}
function prog() {
  const n = $('#prog');
  if (!n.children.length) S.forEach((_, j) => { const b = document.createElement('button'); b.setAttribute('aria-label', 'Phần ' + (j + 1)); b.onclick = () => go(j); n.append(b); });
  [...n.children].forEach((b, j) => { b.className = j === idx ? 'on' : ''; b.disabled = j > seen; });
}
async function go(i) {
  if (busy || i < 0 || i >= S.length) return; busy = true; nxt.hidden = true;
  if (cur) { cur.el.classList.add('out'); await new Promise(r => setTimeout(r, 650)); cur.x.end(); cur.el.remove(); FX.clear(); }
  const el = document.createElement('section'); el.className = 'scene'; stage.append(el);
  const x = ctxFor(el, i); cur = { el, x }; idx = i; seen = Math.max(seen, i); document.body.dataset.t = 'day';
  try { const r = S[i](x); if (r && r.catch) r.catch(e => { console.error(e); x.next(); }); } catch (e) { console.error(e); x.next(); }
  back.hidden = i === 0; prog(); busy = false;
}
nxt.onclick = async () => { Snd.chime([784]); await go(idx + 1); FX.confetti(32); };
back.onclick = () => { if (idx > 0) go(idx - 1); };

/* ================= 15 SCENE ================= */
const S = [
/* 01 Mở đầu */
x => {
  x.el.innerHTML = '<div class="mid"><h1 class="tw" id="t"></h1><button class="btn" id="b" hidden>Bắt đầu</button></div>';
  const b = x.q('#b'); x.type(x.q('#t'), C.greeting, 55).then(() => { b.hidden = false; b.classList.add('pop'); });
  x.on(b, 'click', () => { Snd.chime(); flash(); setTimeout(() => go(1), 450); });
},
/* 02 Phong thư */
x => {
  x.el.innerHTML = '<div class="mid"><div class="env shake" id="e"><div class="flap"></div><div class="lt"><div class="envelope-note"><p class="tw envelope-greeting" id="lg"></p><p class="tw envelope-message" id="lm"></p></div></div><div class="fr"></div></div><p class="hint">Chạm vào phong bì</p></div>';
  const e = x.q('#e'); let o = 0;
  x.on(e, 'click', async () => { if (o) return; o = 1; e.classList.remove('shake'); e.classList.add('open'); Snd.chime([523, 784]); FX.confetti(40); x.q('.hint').remove(); await x.sleep(1300); const [salutation, ...message] = personalize(C.envelope).split('\n'); await x.type(x.q('#lg'), salutation, 54); await x.sleep(220); await x.type(x.q('#lm'), message.join('\n'), 36); x.next(); });
},
/* 03 Kỷ niệm */
x => {
  const P = C.photos.slice(0, 6);
  x.el.innerHTML = '<div class="mid"><h2 class="ttl">Những khoảnh khắc nhỏ</h2><div class="pw"></div><p class="hint">chạm ảnh để phóng to</p></div><div class="lb"></div>';
  const w = x.q('.pw'), lb = x.q('.lb');
  P.forEach((p, i) => {
    const f = document.createElement('figure'); f.className = 'pol'; f.style.cssText = `--r:${R(-9, 9).toFixed(1)}deg;--d:${i * .4}s;--s:${i % 2 ? -1 : 1}`;
    const c = document.createElement('figcaption'); c.textContent = p.title || `Khoảnh khắc ${i + 1}`; f.append(img(p), c); w.append(f);
    x.on(f, 'click', () => { lb.replaceChildren(f.cloneNode(true)); lb.classList.add('on'); Snd.chime([880]); });
  });
  x.on(lb, 'click', () => lb.classList.remove('on')); x.later(() => x.next(), P.length * 400 + 1200);
},
/* 04 Mưa hoa */
x => {
  FX.mode(['petals']); x.el.innerHTML = '<div class="mid flower-title"><p class="ttl">' + C.flower + '</p></div><div class="rain-photos" aria-hidden="true"></div>';
  const photos = (C.photos || []).slice(0, 6), rain = x.q('.rain-photos');
  photos.forEach((p, i) => {
    const f = document.createElement('figure'); f.className = 'rain-photo';
    f.style.setProperty('--x', `${8 + i * 16}%`); f.style.setProperty('--delay', `${i * .28}s`); f.style.setProperty('--fall-time', '5.4s');
    const photo = img(p); photo.loading = 'eager'; f.append(photo); rain.append(f);
  });
  x.later(() => x.next(), 5000);
},
/* 05 Lời nhắn */
async x => {
  x.el.innerHTML = '<div class="mid"><div class="card"><p class="tw hand" id="c"></p></div></div>';
  await x.type(x.q('#c'), C.card, 50);
  const r = x.q('.card').getBoundingClientRect(); for (let i = 0; i < 14; i++) x.later(() => FX.rise(r.left + R(0, r.width), r.bottom), i * 120);
  Snd.chime(); x.next();
},
/* 06 Album ảnh */
x => {
  const P = C.photos; let i = 0;
  x.el.innerHTML = `<div class="mid"><div class="scrap"><div class="flip"><div class="ff"></div><div class="fb"><span class="fb-label">Lời nhắn</span><p class="fb-text"></p></div></div></div><div class="ctl"><button id="pv" aria-label="Ảnh trước">${ICON.previous}</button><span id="ct"></span><button id="nx" aria-label="Ảnh sau">${ICON.next}</button></div><p class="hint">Chạm vào ảnh để xem lời nhắn phía sau</p></div>`;
  const f = x.q('.flip'), sc = x.q('.scrap');
  const show = () => { f.classList.remove('flipped'); sc.classList.remove('swap'); void sc.offsetWidth; sc.classList.add('swap'); x.q('.ff').replaceChildren(img(P[i])); x.q('.fb-text').textContent = P[i].description || P[i].caption || ''; x.q('#ct').textContent = `${i + 1} / ${P.length}`; };
  x.on(f, 'click', () => f.classList.toggle('flipped'));
  x.on(x.q('#pv'), 'click', () => { i = (i - 1 + P.length) % P.length; show(); });
  x.on(x.q('#nx'), 'click', () => { i = (i + 1) % P.length; show(); });
  show(); x.later(() => x.next(), 2500);
},
/* 07 Bầu trời sao */
x => {
  document.body.dataset.t = 'night'; FX.mode(['stars']);
  const A = [[12, 44], [30, 26], [50, 34], [66, 14], [88, 24]], B = [[20, 52], [42, 48], [60, 54], [80, 46]], pl = a => a.map(p => p.join(',')).join(' ');
  x.el.innerHTML = `<div class="mid"><svg class="const" viewBox="0 0 100 62"><polyline pathLength="1" points="${pl(A)}"/><polyline pathLength="1" points="${pl(B)}"/>${[...A, ...B].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="1.1"/>`).join('')}</svg><p class="ttl glow">${C.stars}</p></div>`;
  x.every(() => FX.shoot(), 2600); x.later(() => FX.shoot(), 800); x.later(() => x.next(), 6000);
},
/* 08 Hộp quà */
x => {
  x.el.innerHTML = '<div class="mid"><div class="gift shake" id="g" role="button" tabindex="0" aria-label="Mở hộp quà"><span class="gift-lid"></span><span class="gift-box"></span><span class="gift-ribbon"></span><span class="gift-bow"></span></div><p class="hint" id="h">Chạm vào hộp quà</p><p class="ttl hid" id="m"></p></div>';
  const g = x.q('#g'); let o = 0;
  x.on(g, 'click', async () => { if (o) return; o = 1; g.classList.remove('shake'); g.classList.add('fast'); Snd.chime([392, 523]); await x.sleep(900);
    g.classList.remove('fast'); g.classList.add('open'); x.q('#h').remove(); flash(); Snd.chime([523, 659, 784, 1046]); FX.burst(innerWidth / 2, innerHeight / 2, true); FX.confetti(40);
    const m = x.q('#m'); m.textContent = C.gift; m.classList.remove('hid'); x.later(() => x.next(), 1500); });
  x.on(g, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); g.click(); } });
},
/* 09 Trò chơi ghép ảnh */
x => {
  const photo = C.photos[C.puzzlePhoto ?? 0];
  x.el.innerHTML = '<div class="mid puzzle-scene"><h2 class="ttl">Ghép lại bức ảnh</h2><p class="hint">Kéo từng mảnh vào vị trí phù hợp</p><div class="puzzle-board" role="group" aria-label="Bảng ghép ảnh"></div><div class="puzzle-tray" aria-label="Các mảnh ảnh"></div><p class="puzzle-status" aria-live="polite">Kéo các mảnh rời vào bảng để hoàn thành bức ảnh.</p></div>';
  const board = x.q('.puzzle-board'), tray = x.q('.puzzle-tray'), status = x.q('.puzzle-status');
  const slots = [], pieces = []; let placed = 0, correct = 0, solved = false, selected = null, dragging = null, preview = null, activePointer = null, hoverSlot = null;
  for (let i = 0; i < 9; i++) { const slot = document.createElement('button'); slot.type = 'button'; slot.className = 'puzzle-slot'; slot.dataset.index = i; slot.setAttribute('aria-label', `Vị trí ${i + 1}`); board.append(slot); slots.push(slot); }
  const addPiece = index => {
    const piece = document.createElement('button'); piece.type = 'button'; piece.className = 'puzzle-piece'; piece.dataset.index = index; piece.setAttribute('aria-label', `Mảnh ghép ${index + 1}`);
    const im = img(photo); im.loading = 'eager'; im.draggable = false; im.style.left = `${-(index % 3) * 100}%`; im.style.top = `${-Math.floor(index / 3) * 100}%`; piece.append(im); pieces.push(piece);
  };
  const updateProgress = () => {
    placed = slots.filter(slot => slot.querySelector('.puzzle-piece')).length;
    correct = slots.filter((slot, i) => Number(slot.querySelector('.puzzle-piece')?.dataset.index) === i).length;
    pieces.forEach(piece => piece.classList.toggle('placed', piece.parentElement.classList.contains('puzzle-slot')));
    solved = correct === 9;
    if (solved) { status.textContent = 'Ghép xong rồi! Bức ảnh đã hoàn chỉnh.'; x.next(); }
    else status.textContent = placed ? `Đã đặt ${placed}/9 mảnh, ${correct} mảnh đúng vị trí.` : 'Kéo các mảnh rời vào bảng để hoàn thành bức ảnh.';
  };
  const placeInSlot = (slot, piece) => {
    if (!slot || !piece || piece.parentElement === slot) return;
    const origin = piece.parentElement, displaced = slot.querySelector('.puzzle-piece');
    if (displaced && displaced !== piece) {
      if (origin?.classList.contains('puzzle-slot')) origin.append(displaced);
      else tray.append(displaced);
    }
    slot.append(piece); piece.classList.remove('selected', 'dragging'); selected = null; updateProgress();
  };
  for (let i = 0; i < 9; i++) addPiece(i);
  pieces.sort(() => Math.random() - .5).forEach(piece => tray.append(piece));
  const cancelDrag = () => { if (dragging) dragging.classList.remove('dragging'); if (preview) preview.remove(); if (hoverSlot) hoverSlot.classList.remove('drop-hover'); dragging = preview = hoverSlot = null; activePointer = null; };
  const movePreview = e => { preview.style.left = `${e.clientX}px`; preview.style.top = `${e.clientY}px`; const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.puzzle-slot'); if (hoverSlot !== target) { hoverSlot?.classList.remove('drop-hover'); hoverSlot = target; hoverSlot?.classList.add('drop-hover'); } };
  x.on(x.el, 'pointerdown', e => {
    const piece = e.target.closest('.puzzle-piece'); if (!piece || e.button > 0) return;
    e.preventDefault(); selected?.classList.remove('selected'); selected = null; activePointer = e.pointerId; dragging = piece; piece.classList.add('dragging');
    const rect = piece.getBoundingClientRect(); preview = piece.cloneNode(true); preview.classList.remove('placed', 'selected', 'dragging'); preview.classList.add('drag-preview'); preview.style.width = `${rect.width}px`; preview.style.height = `${rect.height}px`; document.body.append(preview); movePreview(e);
  });
  x.on(document, 'pointermove', e => { if (dragging && e.pointerId === activePointer) movePreview(e); });
  x.on(document, 'pointerup', e => {
    if (!dragging || e.pointerId !== activePointer) return;
    const atPoint = document.elementFromPoint(e.clientX, e.clientY), target = atPoint?.closest('.puzzle-slot'), trayTarget = atPoint?.closest('.puzzle-tray');
    if (target) placeInSlot(target, dragging);
    else if (trayTarget) { tray.append(dragging); dragging.classList.remove('placed', 'selected'); selected = null; updateProgress(); }
    cancelDrag();
  });
  x.on(document, 'pointercancel', cancelDrag); x.defer(cancelDrag);
  x.on(x.el, 'click', e => {
    const piece = e.target.closest('.puzzle-piece');
    if (piece) { selected?.classList.remove('selected'); selected = piece; selected.classList.add('selected'); status.textContent = `Đã chọn mảnh ${Number(piece.dataset.index) + 1}. Chạm vào một ô để đặt mảnh.`; return; }
    const slot = e.target.closest('.puzzle-slot');
    if (slot && selected) { placeInSlot(slot, selected); return; }
    if (e.target.closest('.puzzle-tray') && selected) { tray.append(selected); selected.classList.remove('selected', 'placed'); selected = null; updateProgress(); }
  });
},
/* 10 Trái tim */
x => {
  FX.mode(['hearts']); x.el.innerHTML = '<div class="mid"><p class="ttl">' + C.hearts + '</p></div>';
  x.on(x.el, 'pointerdown', e => { FX.burst(e.clientX, e.clientY, true); Snd.chime([988, 1318]); }); x.later(() => x.next(), 4000);
},
/* 11 Trình chiếu ảnh */
x => {
  const P = C.photos; let i = -1, play = true;
  x.el.innerHTML = `<div class="mid"><div class="ss"></div><p class="cap"></p><div class="slide-progress" aria-hidden="true"><span class="slide-progress-fill"></span></div><div class="ctl"><button id="pv" aria-label="Ảnh trước">${ICON.previous}</button><button id="pp" aria-label="Tạm dừng">${ICON.pause}</button><button id="nx" aria-label="Ảnh sau">${ICON.next}</button></div></div>`;
  const box = x.q('.ss');
  const progress = x.q('.slide-progress-fill'), duration = 3800;
  const show = d => { i = (i + d + P.length) % P.length; const im = img(P[i]); im.className = 'sl'; box.append(im); x.q('.cap').textContent = P[i].description || P[i].caption || P[i].title || ''; const old = [...box.children].slice(0, -1); x.later(() => old.forEach(o => o.remove()), 1400); progress.classList.remove('running', 'paused'); void progress.offsetWidth; progress.classList.add('running'); if (!play) progress.classList.add('paused'); };
  x.on(progress, 'animationend', () => { if (play) show(1); }); show(1); x.next();
  x.on(x.q('#pv'), 'click', () => show(-1)); x.on(x.q('#nx'), 'click', () => show(1));
  x.on(x.q('#pp'), 'click', e => { play = !play; e.currentTarget.innerHTML = play ? ICON.pause : ICON.play; e.currentTarget.setAttribute('aria-label', play ? 'Tạm dừng' : 'Tiếp tục'); progress.classList.toggle('paused', !play); });
},
/* 12 Vườn hoa */
x => {
  FX.mode(['butterflies']); x.el.innerHTML = '<div class="mid"><p class="ttl">' + C.butterflies + '</p></div><div class="fl"></div>';
  for (let i = 0; i < 5; i++) { const s = document.createElement('button'); s.type = 'button'; s.className = 'flower-touch'; s.setAttribute('aria-label', `Chạm vào bông hoa ${i + 1}`); s.style.setProperty('--flower-hue', `${i * 24}deg`);
    x.on(s, 'click', () => { s.classList.add('glow'); x.later(() => s.classList.remove('glow'), 900); FX.rise(s.getBoundingClientRect().left + 24, s.getBoundingClientRect().top + 16); Snd.chime([784, 1046]); });
    x.q('.fl').append(s); }
  x.later(() => x.next(), 4000);
},
/* 13 Lá thư */
async x => {
  x.el.innerHTML = '<div class="mid"><div class="paper"><div id="lt"></div></div></div>';
  const box = x.q('#lt'), paper = x.q('.paper');
  for (let i = 0; i < C.letter.length; i++) { const p = document.createElement('p'); p.className = i === 0 ? 'letter-salutation' : i === C.letter.length - 1 ? 'letter-signature' : 'letter-paragraph'; box.append(p); await x.type(p, personalize(C.letter[i]), 30); await x.sleep(500); if (paper.scrollHeight > paper.clientHeight) paper.scrollTop = paper.scrollHeight; }
  x.next();
},
/* 14 Pháo hoa */
x => {
  document.body.dataset.t = 'night'; FX.mode(['fireworks']); x.el.innerHTML = '<div class="mid"><p class="ttl glow" id="w"></p></div>';
  const w = x.q('#w'); let i = 0;
  const f = () => { w.classList.remove('fadein'); void w.offsetWidth; w.textContent = C.fireworks[i++ % C.fireworks.length]; w.classList.add('fadein'); };
  f(); x.every(f, 3500); x.later(() => x.next(), 9000);
},
/* 15 Món quà cuối */
x => {
  document.body.dataset.t = 'magic';
  x.el.innerHTML = '<div class="mid final-scene"><div class="gift shake" id="g" role="button" tabindex="0" aria-label="Mở món quà cuối cùng"><span class="gift-lid"></span><span class="gift-box"></span><span class="gift-ribbon"></span><span class="gift-bow"></span><span class="gift-heart" aria-hidden="true">♥</span></div><p class="hint" id="h">Mở món quà cuối cùng</p><p class="ttl hid glow" id="m"></p><div class="final-memories hid" aria-label="Ảnh kỷ niệm"></div><button class="btn hid" id="rp">Xem lại</button></div>';
  const g = x.q('#g'), rp = x.q('#rp'), memories = x.q('.final-memories'); let o = 0;
  (C.photos || []).slice(0, 6).forEach((photo, i) => { const image = img(photo); image.loading = 'eager'; image.className = 'final-photo'; image.style.setProperty('--photo-order', i); memories.append(image); });
  x.on(g, 'click', async () => { if (o) return; o = 1; g.classList.remove('shake'); g.classList.add('fast'); Snd.chime([392, 523]); await x.sleep(550);
    g.classList.remove('fast'); g.classList.add('heart-opening'); Snd.chime([523, 659]); await x.sleep(1350);
    g.remove(); x.q('#h').remove(); const scene = x.q('.final-scene'), m = x.q('#m'); scene.classList.add('revealed'); m.textContent = C.final; m.classList.remove('hid'); memories.classList.remove('hid');
    FX.mode(['petals']); await x.sleep(900); rp.classList.remove('hid'); });
  x.on(g, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); g.click(); } });
  x.on(rp, 'click', () => go(0));
}
];

go(0);
})();
