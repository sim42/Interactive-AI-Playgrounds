(function (root) {
  "use strict";
  const F = root.OptimizationFunctions;
  const defaults = {
    fn: "bowl",
    expression: F.presets.bowl.source,
    algorithm: "gd",
    rate: 0.15,
    beta: 0.8,
    x: 2.3,
    y: 1.8,
    min: -3,
    max: 3,
    limit: 500,
  };
  const algorithms = {
    gd: {
      name: "普通梯度下降（GD）",
      action: "将每个方向的坡度乘学习率，再取反方向。",
      use: "适合先理解“坡度 → 位移”。陡方向和缓方向共享一个学习率。",
      limit: "步长大时可能越过谷底；平坦处移动慢。",
    },
    momentum: {
      name: "动量（Momentum）",
      action: "先保留上一步方向的一部分，再加入本次坡度。",
      use: "方向一致时累计速度；来回变号时部分抵消。β 是记忆保留比例。",
      limit: "可能因惯性越过低点。并非每步都降低函数值。",
    },
    rmsprop: {
      name: "RMSProp",
      action: "累计每个分量的坡度平方，用它缩放这次坡度。",
      use: "陡方向累积平方较大，步幅会被相对缩小。固定衰减 0.9。",
      limit: "会改变两个方向的相对步幅；初期也可能大步移动。",
    },
    adam: {
      name: "Adam",
      action: "同时记住坡度平均与平方平均，修正初始化偏差后更新。",
      use: "一阶记忆稳定方向，二阶记忆缩放分量；β₁=0.9，β₂=0.999。",
      limit: "初始记忆为 0 需校正；自适应步幅不保证全局最优或单调下降。",
    },
  };
  function initial(c) {
    const fn = F.validate(c),
      p = [c.x, c.y],
      value = fn.evaluate(...p);
    return {
      fn,
      p,
      value,
      step: 0,
      m: [0, 0],
      v: [0, 0],
      velocity: [0, 0],
      history: [{ p: p.slice(), value, step: 0 }],
      phase: 0,
      pending: null,
      last: null,
      status: "尚未运行",
      reason: "",
    };
  }
  function terminal(s) {
    return !!s.terminal;
  }
  function propose(s, c) {
    let g;
    try {
      g = F.gradient(s.fn, s.p);
    } catch (e) {
      return {
        invalid: true,
        reason: "当前位置的导数无法计算：" + e.message,
        p: s.p.slice(),
        value: s.value,
      };
    }
    if (!g || !g.every(Number.isFinite))
      return {
        invalid: true,
        reason:
          "当前位置的坡度不有限或不可导。请调整起点/函数；abs 在零点等尖角没有唯一梯度。",
        p: s.p.slice(),
        value: s.value,
      };
    const norm = Math.hypot(...g);
    if (!Number.isFinite(norm))
      return {
        invalid: true,
        reason: "坡度范数超出有限数值范围；请缩放目标函数。",
        p: s.p.slice(),
        value: s.value,
      };
    if (norm < 1e-5)
      return { stationary: true, g, norm, p: s.p.slice(), value: s.value };
    const t = s.step + 1,
      m = s.m.slice(),
      v = s.v.slice(),
      velocity = s.velocity.slice(),
      d = [],
      details = [];
    for (let i = 0; i < 2; i++) {
      const info = {
        g: g[i],
        oldM: m[i],
        oldV: v[i],
        oldVelocity: velocity[i],
      };
      if (c.algorithm === "gd") {
        info.effective = g[i];
        d[i] = -c.rate * g[i];
      } else if (c.algorithm === "momentum") {
        velocity[i] = c.beta * velocity[i] + g[i];
        info.memory = velocity[i];
        info.effective = velocity[i];
        d[i] = -c.rate * velocity[i];
      } else if (c.algorithm === "rmsprop") {
        v[i] = 0.9 * v[i] + 0.1 * g[i] ** 2;
        info.square = g[i] ** 2;
        info.memory = v[i];
        info.denominator = Math.sqrt(v[i]) + 1e-8;
        info.effective = g[i] / info.denominator;
        d[i] = -c.rate * info.effective;
      } else {
        m[i] = 0.9 * m[i] + 0.1 * g[i];
        v[i] = 0.999 * v[i] + 0.001 * g[i] ** 2;
        info.newM = m[i];
        info.newV = v[i];
        info.correctedM = m[i] / (1 - 0.9 ** t);
        info.correctedV = v[i] / (1 - 0.999 ** t);
        info.denominator = Math.sqrt(info.correctedV) + 1e-8;
        info.effective = info.correctedM / info.denominator;
        d[i] = -c.rate * info.effective;
      }
      details.push(info);
    }
    if (!m.concat(v, velocity, d).every(Number.isFinite))
      return {
        invalid: true,
        reason:
          "优化器平方或记忆数值溢出；本次更新不提交。请缩放目标函数或更换算法。",
        p: s.p.slice(),
        value: s.value,
      };
    const p = s.p.map((v, i) => v + d[i]),
      outside = !F.inDomain(p, c),
      value = outside ? NaN : F.evaluate(s.fn, p);
    return {
      g,
      norm,
      d,
      p,
      value,
      m,
      v,
      velocity,
      details,
      from: s.p.slice(),
      fromValue: s.value,
      outside,
      invalid: !outside && !Number.isFinite(value),
      reason: outside
        ? "候选超出设置的显示/搜索域，本次更新不提交。请减小学习率或扩大域。"
        : !Number.isFinite(value)
          ? "候选位置的函数没有有限值，本次更新不提交。请修改函数、起点或学习率。"
          : "",
    };
  }
  function commit(s, c, q) {
    if (q.stationary || q.invalid || q.outside) {
      s.last = q;
      s.pending = null;
      s.phase = 3;
      s.terminal = true;
      s.status = q.stationary
        ? "已到局部驻点"
        : q.outside
          ? "域外停止"
          : "无法计算";
      s.reason = q.stationary
        ? "坡度范数小于 10⁻⁵；这只说明局部平坦，不能证明全局最优。"
        : q.reason;
      return s;
    }
    s.p = q.p.slice();
    s.value = q.value;
    s.m = q.m;
    s.v = q.v;
    s.velocity = q.velocity;
    s.step++;
    s.history.push({ p: s.p.slice(), value: s.value, step: s.step });
    s.last = q;
    s.pending = null;
    s.phase = 3;
    s.status = s.step >= c.limit ? "已达更新上限" : "已暂停";
    s.terminal = s.step >= c.limit;
    s.reason = s.terminal
      ? "已达到 " + c.limit + " 次更新。可重新开始或增加上限。"
      : "";
    return s;
  }
  function advance(s, c) {
    if (terminal(s)) return s;
    if (s.phase === 0 || s.phase === 3) {
      s.pending = propose(s, c);
      s.phase = 1;
      s.status = "已暂停";
    } else if (s.phase === 1) s.phase = 2;
    else commit(s, c, s.pending);
    return s;
  }
  root.OptimizationModel = {
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
