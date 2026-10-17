(function (root) {
  'use strict';
  const EPS = 1e-9;
  const copy = p => p.map(q => ({ ...q }));
  function random(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function preset(name, seed = 42) {
    const p = [ { x: 2, y: 3, vx: 1, vy: 0, r: .55, m: 1 }, { x: 8, y: 3, vx: -1, vy: 0, r: .55, m: 1 } ];
    if (name === 'fast') { p[0].vx = 5; p[1].vx = -5; }
    if (name === 'oblique') { p[0].y = 2.6; p[1].y = 3.3; p[0].vx = 1.5; p[1].vx = -.7; }
    if (name === 'relay') { p[0].x = 1.5; p[0].vx = 2; p[1].x = 4.5; p[1].vx = 0; p.push({ x: 8, y: 3.2, vx: -.3, vy: 0, r: .55, m: 1 }); }
    if (name === 'random') { const rng = random(seed); p[0].y = 2.8 + rng() * .3; p[1].y = 2.8 + rng() * .3; p[0].vx = .7 + rng(); p[1].vx = -.7 - rng(); p[1].m = .6 + rng() * 1.4; }
    return p.map((q, i) => ({ ...q, id: i, version: 0 }));
  }
  function validate(p) {
    if (!Array.isArray(p) || p.length < 2 || p.length > 4) throw Error('使用 2–4 个粒子。');
    p.forEach(q => { if (![q.x, q.y, q.vx, q.vy, q.r, q.m].every(Number.isFinite) || q.r < .1 || q.r > 1 || q.m < .1 || q.m > 10 || Math.abs(q.vx) > 10 || Math.abs(q.vy) > 10 || Math.abs(q.x) > 20 || Math.abs(q.y) > 20) throw Error('位置须在 ±20、速度在 ±10，半径 0.1–1，质量 0.1–10。'); });
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if (Math.hypot(p[j].x - p[i].x, p[j].y - p[i].y) < p[i].r + p[j].r - EPS) throw Error('初始粒子重叠：请增大间距或减小半径。');
  }
  function prediction(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, dvx = b.vx - a.vx, dvy = b.vy - a.vy;
    const A = dvx * dvx + dvy * dvy, B = 2 * (dx * dvx + dy * dvy), R = a.r + b.r, C = dx * dx + dy * dy - R * R, D = B * B - 4 * A * C;
    const data = { dx, dy, dvx, dvy, A, B, C, D, R, dt: Infinity };
    if (A < EPS || B >= -EPS || D < -EPS) return data;
    const dt = (-B - Math.sqrt(Math.max(0, D))) / (2 * A);
    if (dt > EPS) data.dt = dt;
    else if (Math.abs(dt) <= EPS && C >= -1e-7) data.dt = 0;
    return data;
  }
  function impulse(a, b) {
    const r = Math.hypot(b.x - a.x, b.y - a.y);
    if (r < EPS) throw Error('粒子中心重合，无法可靠确定碰撞法向。请缩小时间步或重新开始。');
    const nx = (b.x - a.x) / r, ny = (b.y - a.y) / r, approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    const J = approach < 0 ? -2 * approach / (1 / a.m + 1 / b.m) : 0;
    return { nx, ny, approach, J, before: [a.vx, a.vy, b.vx, b.vy], after: [a.vx - J * nx / a.m, a.vy - J * ny / a.m, b.vx + J * nx / b.m, b.vy + J * ny / b.m] };
  }
  function applyImpulse(a, b, info) { [a.vx, a.vy, b.vx, b.vy] = info.after; a.version++; b.version++; }
  function metrics(p) { return p.reduce((s, q) => ({ K: s.K + q.m * (q.vx ** 2 + q.vy ** 2) / 2, px: s.px + q.m * q.vx, py: s.py + q.m * q.vy }), { K: 0, px: 0, py: 0 }); }
  function move(p, dt) { p.forEach(q => { q.x += q.vx * dt; q.y += q.vy * dt; }); }
  function valid(s, e) { return e.versions.every((v, k) => s.p[e.ids[k]].version === v); }
  function schedule(s, changed) {
    for (let i = 0; i < s.p.length; i++) for (let j = i + 1; j < s.p.length; j++) {
      if (changed && !changed.includes(i) && !changed.includes(j)) continue;
      const d = prediction(s.p[i], s.p[j]);
      if (Number.isFinite(d.dt)) s.queue.push({ uid: ++s.serial, time: s.time + d.dt, ids: [i, j], versions: [s.p[i].version, s.p[j].version], data: d });
    }
    s.queue.sort((a, b) => a.time - b.time || a.uid - b.uid);
  }
  function create(p, dt = .5) {
    validate(p); if (!Number.isFinite(dt) || dt < .01 || dt > 2) throw Error('时间步须为 0.01–2。');
    const event = { p: copy(p), time: 0, queue: [], history: [], serial: 0, collisions: 0, discarded: 0, error: '', last: null };
    schedule(event);
    return { initial: copy(p), event, fixed: { p: copy(p), time: 0, steps: 0, collisions: 0, error: '', last: null }, dt, time: 0, trace: null, stage: 0, samples: [{ time: 0, event: copy(p), fixed: copy(p) }] };
  }
  function nextEvent(s) {
    while (s.queue.length && !valid(s, s.queue[0])) { const e = s.queue.shift(); s.history.unshift({ ...e, status: '失效：参与粒子的速度已改变' }); s.discarded++; }
    s.history.length = Math.min(s.history.length, 24);
    const e = s.queue[0]; if (!e) return null;
    const conflict = s.queue.find(other => other !== e && valid(s, other) && Math.abs(other.time - e.time) < 1e-8 && other.ids.some(i => e.ids.includes(i)));
    if (conflict) { s.error = '检测到共享粒子的同时接触：这个小规模求解器不任意排列多体碰撞。请改变初始位置或速度。'; throw Error(s.error); }
    return e;
  }
  function executeEvent(s, e) {
    move(s.p, Math.max(0, e.time - s.time)); s.time = e.time;
    const [i, j] = e.ids, info = impulse(s.p[i], s.p[j]);
    applyImpulse(s.p[i], s.p[j], info); s.collisions++; s.last = { ...e, info };
    s.queue = s.queue.filter(q => q.uid !== e.uid); s.history.unshift({ ...e, status: '已执行' });
    schedule(s, e.ids); return info;
  }
  function eventTo(s, target) {
    let guard = 0, e;
    while ((e = nextEvent(s)) && e.time <= target + EPS) { executeEvent(s, e); if (++guard > 100) throw Error('同一推进区间内事件过密，已停止。'); }
    move(s.p, Math.max(0, target - s.time)); s.time = target;
  }
  function fixedTo(s, target, dt) {
    let guard = 0;
    while (s.time + dt <= target + EPS) {
      move(s.p, dt); s.time += dt; s.steps++;
      for (let i = 0; i < s.p.length; i++) for (let j = i + 1; j < s.p.length; j++) {
        const a = s.p[i], b = s.p[j], distance = Math.hypot(b.x - a.x, b.y - a.y);
        if (distance <= a.r + b.r + EPS) { const info = impulse(a, b); if (info.J > EPS) { applyImpulse(a, b, info); s.collisions++; s.last = { ids: [i, j], time: s.time, info }; } }
      }
      if (++guard > 2000) throw Error('固定步计算达到单批上限。');
    }
  }
  function fixedSnapshot(s, target) { const p = copy(s.p); move(p, Math.max(0, target - s.time)); return p; }
  function sample(s) { s.samples.push({ time: s.time, event: copy(s.event.p), fixed: fixedSnapshot(s.fixed, s.time) }); if (s.samples.length > 120) s.samples.shift(); }
  function advance(s, target) {
    s.trace = null; s.stage = 0; eventTo(s.event, target); fixedTo(s.fixed, target, s.dt); s.time = target; sample(s); return s;
  }
  function traceStep(s) {
    if (!s.trace || s.stage === 6) {
      const e = nextEvent(s.event); if (!e) return { done: true };
      const old = copy(s.event.p); const travel = e.time - s.event.time;
      const at = copy(old); move(at, travel);
      s.trace = { event: { ...e, data: prediction(old[e.ids[0]], old[e.ids[1]]) }, old, at, info: impulse(at[e.ids[0]], at[e.ids[1]]), from: s.event.time, travel };
      s.stage = 1;
    } else if (s.stage < 6) {
      s.stage++;
      if (s.stage === 4) { move(s.event.p, s.trace.travel); s.event.time = s.trace.event.time; s.time = s.event.time; fixedTo(s.fixed, s.time, s.dt); sample(s); }
      if (s.stage === 6) { executeEvent(s.event, s.trace.event); sample(s); }
    }
    return { done: false, stage: s.stage };
  }
  const api = { EPS, random, preset, validate, prediction, impulse, applyImpulse, metrics, create, nextEvent, valid, eventTo, fixedTo, fixedSnapshot, advance, traceStep, copy };
  root.EventModel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : globalThis));
