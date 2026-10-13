(function (root) {
  "use strict";
  const F = root.OptimizationFunctions;
  const defaults = {
    fn: "ripple",
    expression: F.presets.ripple.source,
    algorithm: "anneal",
    sigma: 0.55,
    temp: 1.2,
    cooling: 0.99,
    x: 2.3,
    y: 1.8,
    min: -3,
    max: 3,
    seed: 42,
    limit: 500,
  };
  const algorithms = {
    uniform: {
      name: "全域随机搜索",
      action: "在整个搜索域独立均匀抽点；更低才替换当前最好。",
      use: "适合先看采样覆盖，不需要坡度。局部步幅与温度不参与。",
      limit: "维度或区域增大时，抽到很小低谷的机会少；预算耗尽也不证明最优。",
    },
    greedy: {
      name: "局部随机爬山",
      action: "在当前点附近提议；只有不更差的候选才移动。",
      use: "步幅 σ 决定邻域的边长，每个方向均匀取 [−σ,σ]。",
      limit: "无法穿过更高的山脊，可能困在局部低点。",
    },
    anneal: {
      name: "模拟退火（Simulated annealing）",
      action: "不更差必接受；更差候选按 exp(−Δf/T) 接受。",
      use: "较高温度更容易越过山脊；每次提议后温度乘冷却比例 c。",
      limit: "温度过快降低可能困住；接受较差点是探索，历史最好仍保留。",
    },
  };
  function draw(rng) {
    rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
    return { rng, value: (rng + 0.5) / 4294967296 };
  }
  function initial(c) {
    const fn = F.validate(c),
      p = [c.x, c.y],
      value = fn.evaluate(...p);
    return {
      fn,
      p,
      value,
      best: { p: p.slice(), value },
      step: 0,
      accepted: 0,
      rng: c.seed >>> 0,
      status: "尚未运行",
      reason: "",
      history: [{ p: p.slice(), value, best: value, step: 0 }],
      trials: [],
      phase: 0,
      pending: null,
      last: null,
    };
  }
  function terminal(s) {
    return !!s.terminal;
  }
  function propose(s, c) {
    const a = draw(s.rng),
      b = draw(a.rng),
      u = draw(b.rng),
      r = [a.value, b.value],
      d =
        c.algorithm === "uniform"
          ? r.map((v) => c.min + (c.max - c.min) * v)
          : r.map((v) => c.sigma * (2 * v - 1)),
      p = c.algorithm === "uniform" ? d.slice() : s.p.map((v, i) => v + d[i]),
      outside = !F.inDomain(p, c),
      value = outside ? NaN : F.evaluate(s.fn, p),
      delta = value - s.value,
      invalid =
        !outside && (!Number.isFinite(value) || !Number.isFinite(delta)),
      temperature = c.temp * c.cooling ** s.step,
      probability =
        outside || invalid
          ? 0
          : delta <= 0
            ? 1
            : c.algorithm === "anneal" && temperature > 0
              ? Math.exp(-delta / temperature)
              : 0;
    return {
      r,
      u: u.value,
      nextRng: u.rng,
      p,
      d: c.algorithm === "uniform" ? p.map((v, i) => v - s.p[i]) : d,
      from: s.p.slice(),
      fromValue: s.value,
      value,
      delta,
      temperature,
      probability,
      outside,
      invalid,
      accept: !outside && !invalid && u.value < probability,
      reason: outside
        ? "候选在搜索域外，p=0；不夹到边界。"
        : invalid
          ? "候选函数值或高低差没有有限值，p=0；保留当前点。请缩放函数或修改定义域。"
          : "",
    };
  }
  function commit(s, c, q) {
    s.rng = q.nextRng;
    s.step++;
    if (q.accept) {
      s.p = q.p.slice();
      s.value = q.value;
      s.accepted++;
      if (s.value < s.best.value) s.best = { p: s.p.slice(), value: s.value };
    }
    s.trials.push({ ...q, step: s.step });
    s.history.push({
      p: s.p.slice(),
      value: s.value,
      best: s.best.value,
      step: s.step,
    });
    s.last = q;
    s.pending = null;
    s.phase = 3;
    s.terminal = s.step >= c.limit;
    s.status = s.terminal ? "已达提议上限" : "已暂停";
    s.reason = s.terminal
      ? "已达到 " + c.limit + " 次随机提议；没有最优保证。"
      : q.reason;
    return s;
  }
  function advance(s, c) {
    if (terminal(s)) return s;
    if (s.phase === 0 || s.phase === 3) {
      s.pending = propose(s, c);
      s.phase = 1;
      s.status = "已暂停";
    } else if (s.phase === 1) {
      s.phase = 2;
      s.status = "已暂停";
    } else commit(s, c, s.pending);
    return s;
  }
  root.MonteCarloModel = {
    defaults,
    algorithms,
    initial,
    propose,
    commit,
    advance,
    terminal,
    functions: F.presets,
  };
})(typeof window !== "undefined" ? window : globalThis);
