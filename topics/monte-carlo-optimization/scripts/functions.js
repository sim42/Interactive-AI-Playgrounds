(function (root) {
  "use strict";
  const presets = {
    bowl: {
      name: "碗形：方向容易预测",
      source: "0.25*x^2+y^2",
      hint: "两个方向都向谷底下降。只改学习率，观察步幅和振荡。",
    },
    valley: {
      name: "狭长谷：一边陡，一边缓",
      source: "0.05*x^2+3*y^2",
      hint: "y 方向很陡，x 方向很缓。相同步长会兼顾不了两个方向。",
    },
    rosen: {
      name: "弯谷：方向不断转弯",
      source: "0.02*(100*(y-x^2)^2+(1-x)^2)",
      hint: "低谷是弯的。局部下降方向随位置改变，固定方向无法一直沿谷前进。",
    },
    ripple: {
      name: "波纹：多个局部低点",
      source: "0.3*(x^2+y^2)+2*sin(1.5*x)^2+2*sin(1.5*y)^2",
      hint: "不止一个谷底。落入一个低点并不保证它是全域最低点。",
    },
    saddle: {
      name: "鞍形：一个方向降，一个方向升",
      source: "x^2-y^2",
      hint: "原点的坡度为零，却不是谷底。零梯度不等于最小值。",
    },
  };
  function compiled(c) {
    return root.CourseExpression.compile(c.expression, {
      variables: ["x", "y"],
    });
  }
  function inDomain(p, c) {
    return p.every((v) => Number.isFinite(v) && v >= c.min && v <= c.max);
  }
  function evaluate(fn, p) {
    try {
      const v = fn.evaluate(...p);
      return Number.isFinite(v) ? v : NaN;
    } catch (e) {
      return NaN;
    }
  }
  function gradient(fn, p) {
    const r = fn.gradient(...p);
    if (r.differentiable === false)
      throw Error((r.warnings || []).join("；") || "该点不可导，没有唯一梯度");
    if (Array.isArray(r)) return r;
    return r.gradient || r.derivatives || [r.dx, r.dy];
  }
  function validate(c) {
    if (
      !Number.isFinite(c.min) ||
      !Number.isFinite(c.max) ||
      c.min >= c.max ||
      c.max - c.min < 0.01
    )
      throw Error("显示/搜索域的下界必须小于上界，跨度至少 0.01。");
    if (!inDomain([c.x, c.y], c))
      throw Error("起点必须位于设置的显示/搜索域内。");
    const fn = compiled(c);
    let minimum = Infinity,
      maximum = -Infinity;
    for (let i = 0; i <= 16; i++)
      for (let j = 0; j <= 16; j++) {
        const p = [
          c.min + ((c.max - c.min) * i) / 16,
          c.min + ((c.max - c.min) * j) / 16,
        ];
        const value = evaluate(fn, p);
        if (!Number.isFinite(value))
          throw Error(
            "函数在域内采样点 (" +
              p.map((v) => v.toFixed(3)).join(", ") +
              ") 没有有限值。请改函数或缩小/移动定义域。",
          );
        minimum = Math.min(minimum, value);
        maximum = Math.max(maximum, value);
      }
    if (!Number.isFinite(maximum - minimum))
      throw Error("函数值跨度超出有限数值范围；请缩放函数后再应用。");
    if (!Number.isFinite(evaluate(fn, [c.x, c.y])))
      throw Error("起点处函数值无效。");
    return fn;
  }
  root.OptimizationFunctions = {
    presets,
    compiled,
    inDomain,
    evaluate,
    gradient,
    validate,
  };
})(typeof window !== "undefined" ? window : globalThis);
