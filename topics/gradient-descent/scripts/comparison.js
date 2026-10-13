(function (root) {
  "use strict";
  const names = {
    algorithm: "算法",
    rate: "学习率 α",
    beta: "动量比例 β",
    sigma: "邻域半步幅 σ",
    temp: "初温 T₀",
    cooling: "冷却比例 c",
    limit: "次数上限",
  };
  function sameConditions(a, b, mc) {
    return [
      "expression",
      "min",
      "max",
      "x",
      "y",
      ...(mc ? ["seed"] : []),
    ].every((k) => a[k] === b[k]);
  }
  function snapshot(state, config) {
    return {
      config: { ...config },
      history: state.history.map((h) => ({ ...h, p: h.p.slice() })),
      p: state.p.slice(),
      value: state.value,
      best: state.best
        ? { p: state.best.p.slice(), value: state.best.value }
        : null,
      step: state.step,
      status: state.status,
      terminal: !!state.terminal,
      reason: state.reason,
    };
  }
  function differences(a, b, algorithms) {
    return Object.keys(names)
      .filter((k) => k in a && a[k] !== b[k])
      .map((k) => ({
        key: k,
        label: names[k],
        before: k === "algorithm" ? algorithms[a[k]].name : a[k],
        after: k === "algorithm" ? algorithms[b[k]].name : b[k],
      }));
  }
  root.OptimizationComparison = { sameConditions, snapshot, differences };
})(typeof window !== "undefined" ? window : globalThis);
