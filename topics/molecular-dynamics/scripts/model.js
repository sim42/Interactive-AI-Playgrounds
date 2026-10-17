(function (root) {
  'use strict';
  function random(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function normal(rng) { return Math.sqrt(-2 * Math.log(Math.max(1e-12, rng()))) * Math.cos(2 * Math.PI * rng()); }
  function rawPair(r, epsilon = 1, sigma = 1) { const a = (sigma / r) ** 6; return { U: 4 * epsilon * (a * a - a), F: 24 * epsilon * (2 * a * a - a) / r, repulsion: 48 * epsilon * a * a / r, attraction: -24 * epsilon * a / r }; }
  function pair(r, config = {}) {
    const epsilon = config.epsilon ?? 1, sigma = config.sigma ?? 1, rc = config.rc ?? 2.5 * sigma;
    if (!(r > 0) || !Number.isFinite(r)) throw Error('粒子中心重合，势与力无法计算。');
    if (config.shifted === false) return rawPair(r, epsilon, sigma);
    if (r >= rc) return { U: 0, F: 0, repulsion: 0, attraction: 0, correction: 0 };
    const q = rawPair(r, epsilon, sigma), c = rawPair(rc, epsilon, sigma);
    return { U: q.U - c.U + (r - rc) * c.F, F: q.F - c.F, repulsion: q.repulsion, attraction: q.attraction, correction: -c.F };
  }
  function minimumImage(d, L) { return d - L * Math.round(d / L); }
  function forces(p, config) {
    const f = p.map(() => ({ x: 0, y: 0 })), pairs = []; let U = 0;
    const L = config.L;
    if (config.periodic && !(config.rc < L / 2)) throw Error('截断半径须小于盒长的一半。');
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
      const dx = config.periodic ? minimumImage(p[j].x - p[i].x, L) : p[j].x - p[i].x;
      const dy = config.periodic ? minimumImage(p[j].y - p[i].y, L) : p[j].y - p[i].y;
      const r = Math.hypot(dx, dy);
      if (r < .65 * config.sigma) throw Error('粒子严重接近（r < 0.65σ）：当前时间步已无法可靠解析强排斥，请缩小 Δt 后重新开始。');
      const q = pair(r, config); if (r >= config.rc && config.shifted !== false) continue;
      const fx = -q.F * dx / r, fy = -q.F * dy / r;
      f[i].x += fx; f[i].y += fy; f[j].x -= fx; f[j].y -= fy; U += q.U;
      pairs.push({ i, j, dx, dy, r, fx, fy, U: q.U });
    }
    if (![U, ...f.flatMap(v => [v.x, v.y])].every(Number.isFinite)) throw Error('势能或力出现数值溢出。请恢复合理参数。');
    return { f, U, pairs };
  }
  function kinetic(p) { return p.reduce((k, q) => k + q.m * (q.vx ** 2 + q.vy ** 2) / 2, 0); }
  function momentum(p) { return p.reduce((v, q) => ({ x: v.x + q.m * q.vx, y: v.y + q.m * q.vy }), { x: 0, y: 0 }); }
  function copy(p) { return p.map(q => ({ ...q })); }
  function create(options = {}) {
    const c = { N: 36, density: .35, temperature: .6, dt: .004, seed: 2026, epsilon: 1, sigma: 1, rc: 2.5, periodic: true, shifted: true, ...options };
    if (![c.N, c.density, c.temperature, c.dt, c.seed, c.epsilon, c.sigma, c.rc].every(Number.isFinite) || !Number.isInteger(c.seed) || c.seed<0 || c.seed>4294967295 || ![16, 25, 36, 49, 64].includes(c.N) || c.density < .1 || c.density > .7 || c.temperature < 0 || c.temperature > 3 || c.dt < .0005 || c.dt > .08 || c.epsilon < .5 || c.epsilon > 2 || c.sigma !== 1) throw Error('请检查粒子数、密度 0.1–0.7、温度 0–3、Δt 0.0005–0.08 与 ε 0.5–2。');
    c.L = Math.sqrt(c.N / c.density); if (!(c.rc < c.L / 2)) throw Error('盒子过小：截断半径必须小于盒长的一半，请降低密度或增多粒子。');
    const rng = random(c.seed), side = Math.sqrt(c.N), p = [];
    for (let i = 0; i < c.N; i++) p.push({ id: i, m: 1, x: ((i % side) + .5) * c.L / side + (rng() - .5) * .05, y: (Math.floor(i / side) + .5) * c.L / side + (rng() - .5) * .05, vx: normal(rng), vy: normal(rng) });
    const vcm = momentum(p); p.forEach(q => { q.vx -= vcm.x / c.N; q.vy -= vcm.y / c.N; });
    const scale = Math.sqrt((c.N - 1) * c.temperature / kinetic(p)); p.forEach(q => { q.vx *= scale; q.vy *= scale; });
    return fromParticles(p, c);
  }
  function fromParticles(p, config = {}) {
    const c = { dt: .004, epsilon: 1, sigma: 1, rc: 2.5, periodic: false, shifted: true, L: 12, ...config };
    const calc = forces(p, c), K = kinetic(p), E = K + calc.U;
    return { p: copy(p), config: c, ...calc, K, E, initialEnergy: E, energyScale: Math.max(Math.abs(E), K + Math.abs(calc.U), 1), externalWork: 0, time: 0, steps: 0, stage: 0, trace: null, error: '', history: [{ time: 0, K, U: calc.U, E, balance: 0 }] };
  }
  function begin(s) {
    const dt = s.config.dt, next = copy(s.p);
    next.forEach((q, i) => { q.x += q.vx * dt + s.f[i].x / q.m * dt * dt / 2; q.y += q.vy * dt + s.f[i].y / q.m * dt * dt / 2; if (s.config.periodic) { q.x = (q.x % s.config.L + s.config.L) % s.config.L; q.y = (q.y % s.config.L + s.config.L) % s.config.L; } });
    return { old: copy(s.p), oldForce: s.f.map(f => ({ ...f })), next, nextCalc: null, dt };
  }
  function finish(s, tr) {
    const candidate = copy(tr.next);
    candidate.forEach((q, i) => { q.vx += (tr.oldForce[i].x + tr.nextCalc.f[i].x) * tr.dt / (2 * q.m); q.vy += (tr.oldForce[i].y + tr.nextCalc.f[i].y) * tr.dt / (2 * q.m); });
    const K = kinetic(candidate), E = K + tr.nextCalc.U;
    if (![K, E, ...candidate.flatMap(q => [q.x, q.y, q.vx, q.vy])].every(Number.isFinite) || K > 1e8) throw Error('积分发散，已停止并保留上一个有效完整状态。请减小 Δt。');
    const drift = Math.abs(E - s.initialEnergy - s.externalWork) / s.energyScale;
    if (drift > .5) throw Error('候选步能量偏差为 '+(100*drift).toFixed(2)+'%，超过初始能量尺度的50%。未提交此步，保留最后完整状态；请减小 Δt 重新开始。');
    tr.next = candidate;
    s.p = candidate; s.f = tr.nextCalc.f; s.pairs = tr.nextCalc.pairs; s.U = tr.nextCalc.U; s.K = K; s.E = E; s.steps++; s.time += tr.dt;
    s.history.push({ time: s.time, K, U: s.U, E, balance: E - s.initialEnergy - s.externalWork }); if (s.history.length > 1600) s.history.splice(1, 1);
  }
  function step(s) {
    const tr = begin(s); s.trace = tr; s.stage = 2; tr.nextCalc = forces(tr.next, s.config); s.stage = 3; finish(s, tr); s.stage = 4; return s;
  }
  function traceStep(s) {
    if (!s.trace || s.stage >= 4) { s.trace = begin(s); s.stage = 1; }
    else if (s.stage === 1) s.stage = 2;
    else if (s.stage === 2) { s.trace.nextCalc = forces(s.trace.next, s.config); s.stage = 3; }
    else { finish(s, s.trace); s.stage = 4; }
    return s;
  }
  function cool(s, factor = .7) {
    if (!Number.isFinite(factor) || factor < 0 || factor > 1) throw Error('冷却速度比例须为 0–1。');
    const before = s.K; s.p.forEach(q => { q.vx *= factor; q.vy *= factor; }); s.K = kinetic(s.p); const work = s.K - before;
    s.externalWork += work; s.E = s.K + s.U; s.stage = 0; s.trace = null;
    s.history.push({ time: s.time, K: s.K, U: s.U, E: s.E, balance: s.E - s.initialEnergy - s.externalWork });
    return { before, after: s.K, work };
  }
  function stats(s) { return { K: s.K, U: s.U, E: s.E, T: 2 * s.K / (2 * s.p.length - 2), drift: (s.E - s.initialEnergy - s.externalWork) / s.energyScale, momentum: momentum(s.p) }; }
  const api = { random, normal, rawPair, pair, minimumImage, forces, kinetic, momentum, copy, create, fromParticles, begin, finish, step, traceStep, cool, stats };
  root.MDModel = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : globalThis));
