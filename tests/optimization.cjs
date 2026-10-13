const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
function load(topic) {
  const s = {};
  s.globalThis = s;
  vm.createContext(s);
  for (const name of ["expression", "functions", "model", "comparison"])
    vm.runInContext(
      fs.readFileSync(
        path.join(__dirname, "../topics", topic, "scripts", name + ".js"),
        "utf8",
      ),
      s,
    );
  return s;
}
const g = load("gradient-descent"),
  m = load("monte-carlo-optimization"),
  G = g.OptimizationModel,
  C = m.MonteCarloModel;
for (const p of [
  [0, 0],
  [0.3, -0.7],
  [-1.2, 1.4],
  [2.3, 1.8],
])
  for (const preset of Object.values(g.OptimizationFunctions.presets)) {
    const f = g.CourseExpression.compile(preset.source),
      grad = f.gradient(...p);
    for (let i = 0; i < 2; i++) {
      const a = p.slice(),
        b = p.slice();
      a[i] += 1e-5;
      b[i] -= 1e-5;
      const d = (f.evaluate(...a) - f.evaluate(...b)) / 2e-5;
      assert.ok(Math.abs([grad.dx, grad.dy][i] - d) < 1e-5, preset.name);
    }
  }
for (const algorithm of Object.keys(G.algorithms)) {
  const c = { ...G.defaults, algorithm, min: -10, max: 10 };
  const s = G.initial(c);
  const before = JSON.stringify({ ...s, fn: null }),
    q = G.propose(s, c);
  assert.equal(
    JSON.stringify({ ...s, fn: null }),
    before,
    "propose does not mutate memory or position",
  );
  const expected =
    algorithm === "gd"
      ? -0.15 * 1.15
      : algorithm === "momentum"
        ? -0.15 * 1.15
        : algorithm === "rmsprop"
          ? (-0.15 * 1.15) / (Math.sqrt(0.1 * 1.15 ** 2) + 1e-8)
          : (-0.15 * 1.15) / (1.15 + 1e-8);
  assert.ok(
    Math.abs(q.d[0] - expected) < 1e-10,
    algorithm + " first displacement",
  );
  G.advance(s, c);
  assert.equal(s.step, 0);
  G.advance(s, c);
  assert.equal(s.step, 0);
  G.advance(s, c);
  assert.equal(s.step, 1);
  assert.deepEqual(s.p, q.p);
  for (let i = 0; i < 500 && !G.terminal(s); i++)
    G.commit(s, c, G.propose(s, c));
  assert.ok(s.value < 0.01, algorithm + " converges on bowl");
}
let c = { ...G.defaults, rate: 1.2 },
  s = G.initial(c);
for (let i = 0; i < 60 && !G.terminal(s); i++) G.commit(s, c, G.propose(s, c));
assert.equal(s.status, "域外停止");
assert.ok(s.p.every((v) => v >= -3 && v <= 3));
assert.ok(s.last.outside);
c = { ...G.defaults, expression: "x^2-y^2", x: 0, y: 0 };
s = G.initial(c);
for (let i = 0; i < 3; i++) G.advance(s, c);
assert.equal(s.status, "已到局部驻点");
assert.equal(s.step, 0);
c = { ...G.defaults, expression: "abs(x)+y^2", x: 0, y: 1 };
s = G.initial(c);
for (let i = 0; i < 3; i++) G.advance(s, c);
assert.equal(s.status, "无法计算");
assert.equal(s.step, 0);
assert.ok(s.reason.includes("不可导"));
c = { ...G.defaults, expression: "(x-1)^2+(y+1)^2-10", limit: 1 };
s = G.initial(c);
for (let i = 0; i < 5; i++) G.advance(s, c);
assert.equal(s.step, 1);
assert.ok(s.value < 0);
assert.equal(s.status, "已达更新上限");
assert.throws(
  () => G.initial({ ...G.defaults, expression: "log(x)" }),
  /没有有限值/,
);
assert.throws(() => G.initial({ ...G.defaults, min: 2, max: 1 }), /下界/);
assert.throws(() => G.initial({ ...G.defaults, x: 4 }), /起点/);
for (const algorithm of Object.keys(C.algorithms)) {
  c = { ...C.defaults, algorithm };
  const a = C.initial(c),
    b = C.initial(c);
  for (let i = 0; i < 500; i++) {
    const old = JSON.stringify({ ...a, fn: null }),
      qa = C.propose(a, c),
      qb = C.propose(b, c);
    assert.equal(
      JSON.stringify({ ...a, fn: null }),
      old,
      "random proposal does not advance persistent state",
    );
    assert.equal(
      JSON.stringify(qa),
      JSON.stringify(qb),
      "fixed seed reproducible",
    );
    assert.ok(qa.probability >= 0 && qa.probability <= 1);
    if (qa.outside || qa.invalid) assert.equal(qa.accept, false);
    if (algorithm !== "uniform")
      for (let k = 0; k < 2; k++) {
        assert.equal(qa.d[k], c.sigma * (2 * qa.r[k] - 1));
        assert.ok(Math.abs(qa.d[k]) <= c.sigma);
      }
    C.commit(a, c, qa);
    C.commit(b, c, qb);
    assert.ok(a.best.value <= a.value);
    assert.ok(a.p.every((v) => v >= c.min && v <= c.max));
  }
  assert.equal(a.status, "已达提议上限");
  assert.ok(a.best.value <= C.initial(c).value);
}
c = { ...C.defaults, temp: 0 };
s = C.initial(c);
for (let i = 0; i < 150; i++) {
  const q = C.propose(s, c),
    value = s.value;
  if (q.delta > 0) assert.equal(q.probability, 0);
  C.commit(s, c, q);
  assert.ok(s.value <= value);
}
c = { ...C.defaults, expression: "-5", limit: 1 };
s = C.initial(c);
for (let i = 0; i < 4; i++) C.advance(s, c);
assert.equal(s.step, 1);
assert.equal(s.value, -5);
assert.equal(s.best.value, -5);
console.log(
  "PASS optimization: custom functions, automatic derivatives vs finite differences, optimizer arithmetic/memory, candidate phases, domain and nondifferentiability stops, negative functions, seed reproducibility, probability rules and best-value invariant",
);

// Large finite derivatives can overflow the second-moment accumulator.
const hugeConfig = {
  ...G.defaults,
  expression: "1e-100*tanh(1e308*x)+y^2",
  min: -0.1,
  max: 0.1,
  x: 0,
  y: 0,
  algorithm: "rmsprop",
};
const hugeState = G.initial(hugeConfig);
for (let i = 0; i < 3; i++) G.advance(hugeState, hugeConfig);
assert.equal(hugeState.status, "无法计算");
assert.equal(hugeState.step, 0);
assert.ok(hugeState.reason.includes("溢出"));
assert.ok(hugeState.v.every(Number.isFinite));
assert.throws(
  () => C.initial({ ...C.defaults, expression: "1e308*tanh(x)" }),
  /跨度/,
);
console.log(
  "PASS numerical overflow: optimizer memory is never committed; unsafe function range rejected.",
);

const compare = g.OptimizationComparison;
c = { ...G.defaults };
s = G.initial(c);
for (let i = 0; i < 20; i++) G.commit(s, c, G.propose(s, c));
const frozen = compare.snapshot(s, c),
  serialized = JSON.stringify(frozen);
G.commit(s, c, G.propose(s, c));
assert.equal(
  JSON.stringify(frozen),
  serialized,
  "frozen reference does not share mutable trajectory",
);
assert.equal(compare.sameConditions(c, { ...c, rate: 0.015 }, false), true);
assert.equal(compare.sameConditions(c, { ...c, x: 0 }, false), false);
assert.equal(
  compare.sameConditions(C.defaults, { ...C.defaults, seed: 43 }, true),
  false,
);
assert.equal(
  compare.differences(c, { ...c, rate: 0.015 }, G.algorithms).length,
  1,
);
assert.equal(
  compare.differences(c, { ...c, rate: 0.015, algorithm: "adam" }, G.algorithms)
    .length,
  2,
);
console.log(
  "PASS frozen comparison: immutable copied history, compatible common conditions, random-seed constraints and configuration difference counts.",
);
