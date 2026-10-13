const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const box = {};
vm.createContext(box);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "../development/expression.js"), "utf8"),
  box,
);
const E = box.CourseExpression;
for (const [expr, x, y, expected] of [
  ["x^2+y^2", 2, 3, 13],
  ["-x^2", 2, 0, -4],
  ["2^3^2", 0, 0, 512],
  ["2^-2", 0, 0, 0.25],
  ["sin(pi/2)+cos(0)", 0, 0, 2],
  ["pow(x,2)", -2, 0, 4],
  ["max(x,y)-min(x,y)", 2, -3, 5],
  ["1e-3*x", 2, 0, 0.002],
  ["x**2", 2, 0, 4],
  ["x×y−1", 2, 3, 5],
])
  assert.ok(Math.abs(E.compile(expr).evaluate(x, y) - expected) < 1e-10, expr);
for (const expr of [
  "x^2+3*y^2",
  "sin(x)*cos(y)",
  "tanh(x+y)+exp(-x^2-y^2)",
  "log(x+3)+sqrt(y+3)",
  "x^3/(y+4)",
  "(x+3)^y",
  "abs(x)+min(x,y)",
]) {
  const f = E.compile(expr),
    x = 0.37,
    y = -0.29,
    g = f.gradient(x, y),
    h = 1e-5;
  assert.ok(
    Math.abs(g.dx - (f.evaluate(x + h, y) - f.evaluate(x - h, y)) / (2 * h)) <
      2e-6,
    expr + " dx",
  );
  assert.ok(
    Math.abs(g.dy - (f.evaluate(x, y + h) - f.evaluate(x, y - h)) / (2 * h)) <
      2e-6,
    expr + " dy",
  );
}
assert.equal(E.compile("x^2+y^2").gradient(0, 0).dx, 0);
assert.equal(E.compile("abs(x)").gradient(0, 0).differentiable, false);
for (const text of [
  "alert(1)",
  "window.x",
  "x;1",
  "constructor(1)",
  "x[0]",
  "2x",
  "x +",
  "sin(x,y)",
  "",
  "x".repeat(241),
])
  assert.throws(() => E.compile(text), undefined, text);
assert.throws(() => E.compile("y", { variables: ["x"] }));
for (const text of ["1/x", "log(x)", "sqrt(x)"])
  assert.throws(() => E.compile(text).evaluate(text === "sqrt(x)" ? -1 : 0, 0));
assert.throws(() => E.compile("sqrt(x)").gradient(0, 0));
assert.throws(() => E.compile("(-2)^(y^2)").gradient(0, 0));
assert.equal(E.compile("x^(2+1)").gradient(-2, 0).dx, 12);
console.log(
  "PASS safe expression syntax, precedence, values, automatic gradients, bounds and domain errors.",
);
