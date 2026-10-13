(function (root) {
  "use strict";
  const ink = "#24211e",
    blue = "#2457c5",
    amber = "#b45309",
    teal = "#0f766e",
    purple = "#7e22ce";
  const fmt = (n) =>
    Number.isFinite(n)
      ? Math.abs(n) >= 1e5 || (n !== 0 && Math.abs(n) < 1e-4)
        ? n.toExponential(3)
        : Number(n.toFixed(4)).toString()
      : "无有限值";
  const cache = new WeakMap();
  function data(fn, c) {
    let d = cache.get(fn);
    const key = c.min + "," + c.max;
    if (d && d.key === key) return d;
    const n = 72,
      values = [],
      span = c.max - c.min;
    let lo = Infinity,
      hi = -Infinity;
    for (let i = 0; i <= n; i++) {
      values[i] = [];
      for (let j = 0; j <= n; j++) {
        let v;
        try {
          v = fn.evaluate(c.min + (span * i) / n, c.min + (span * j) / n);
        } catch (e) {
          v = NaN;
        }
        values[i][j] = v;
        if (Number.isFinite(v)) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
    }
    d = { key, n, values, min: lo, max: hi, constant: hi - lo < 1e-12, span };
    cache.set(fn, d);
    return d;
  }
  function knownData(fn, c, s, reference) {
    const d = data(fn, c);
    let min = d.min,
      max = d.max;
    const vals = s.history
      .concat(reference ? reference.history : [])
      .map((v) => v.value);
    if (s.pending) vals.push(s.pending.value);
    for (const v of vals)
      if (Number.isFinite(v)) {
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    return { ...d, min, max, constant: max - min < 1e-12 };
  }
  function setup(el) {
    const r = el.getBoundingClientRect(),
      w = Math.max(180, r.width),
      h = r.height,
      ratio = Math.min(devicePixelRatio || 1, 2);
    el.width = Math.round(w * ratio);
    el.height = Math.round(h * ratio);
    const ctx = el.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = "14px system-ui";
    ctx.lineJoin = "round";
    return { ctx, w, h };
  }
  function line(ctx, points, color, width = 2, dash = []) {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function dot(ctx, p, color, r = 5) {
    ctx.beginPath();
    ctx.arc(...p, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fffefa";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  function pointLabel(ctx, p, text, color, bounds, side = 1) {
    const width = ctx.measureText(text).width + 12;
    const x = Math.max(bounds.left, Math.min(bounds.right - width, side < 0 ? p[0] - width - 10 : p[0] + 10)),
      y = Math.max(bounds.top + 18, Math.min(bounds.bottom, p[1] - 8));
    ctx.fillStyle = "rgba(255,254,250,.94)";
    ctx.fillRect(x, y - 17, width, 22);
    ctx.fillStyle = color;
    ctx.fillText(text, x + 6, y);
  }
  function cross(ctx, p, color) {
    line(
      ctx,
      [
        [p[0] - 5, p[1] - 5],
        [p[0] + 5, p[1] + 5],
      ],
      color,
    );
    line(
      ctx,
      [
        [p[0] - 5, p[1] + 5],
        [p[0] + 5, p[1] - 5],
      ],
      color,
    );
  }
  function diamond(ctx, p, color) {
    line(
      ctx,
      [
        [p[0], p[1] - 7],
        [p[0] + 7, p[1]],
        [p[0], p[1] + 7],
        [p[0] - 7, p[1]],
        [p[0], p[1] - 7],
      ],
      color,
      2.5,
    );
  }
  function arrow(ctx, a, b, color, label) {
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 2) return;
    line(ctx, [a, b], color, 2);
    const t = Math.atan2(b[1] - a[1], b[0] - a[0]);
    line(
      ctx,
      [
        [b[0] - 7 * Math.cos(t - 0.55), b[1] - 7 * Math.sin(t - 0.55)],
        b,
        [b[0] - 7 * Math.cos(t + 0.55), b[1] - 7 * Math.sin(t + 0.55)],
      ],
      color,
      2,
    );
    if (label) {
      ctx.fillStyle = color;
      const bounds = ctx.labelBounds;
      const tx = bounds
          ? Math.max(
              bounds.minX,
              Math.min(bounds.maxX - ctx.measureText(label).width, b[0] + 4),
            )
          : b[0] + 4,
        ty = bounds
          ? Math.max(bounds.minY, Math.min(bounds.maxY, b[1] - 5))
          : b[1] - 5;
      ctx.fillText(label, tx, ty);
    }
  }
  function color(v, d) {
    if (!Number.isFinite(v)) return "#e2ded5";
    if (d.constant) return "#dad1e1";
    let a, b, t;
    if (d.min < 0 && d.max > 0) {
      const m = Math.max(Math.abs(d.min), Math.abs(d.max));
      a = v < 0 ? [54, 113, 119] : [104, 82, 136];
      b = [252, 249, 241];
      t = Math.min(1, Math.abs(v) / m);
      return `rgb(${b.map((q, i) => Math.round(q + (a[i] - q) * t)).join(",")})`;
    }
    t = (v - d.min) / (d.max - d.min);
    a = [249, 247, 240];
    b = [102, 93, 128];
    return `rgb(${a.map((q, i) => Math.round(q + (b[i] - q) * t)).join(",")})`;
  }
  function inside(p, c) {
    return p && p.every((v) => Number.isFinite(v) && v >= c.min && v <= c.max);
  }
  function surface(el, s, c, angle, reference) {
    const { ctx, w, h } = setup(el),
      d = knownData(s.fn, c, s, reference),
      a = (angle * Math.PI) / 180;
    // Fit the sampled surface and axes into the companion chart. The x/y
    // projection has one common horizontal scale; f stays linear vertically.
    const unit = (p, z) => {
      const x = (2 * (p[0] - c.min)) / d.span - 1,
        y = (2 * (p[1] - c.min)) / d.span - 1;
      return [
        x * Math.cos(a) - y * Math.sin(a),
        0.28 * (x * Math.sin(a) + y * Math.cos(a)) -
          0.8 * (d.constant ? 0.3 : (z - d.min) / (d.max - d.min)),
      ];
    };
    const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    function include(p, z) {
      const u = unit(p, z);
      bounds.left = Math.min(bounds.left, u[0]);
      bounds.right = Math.max(bounds.right, u[0]);
      bounds.top = Math.min(bounds.top, u[1]);
      bounds.bottom = Math.max(bounds.bottom, u[1]);
    }
    for (let i = 0; i <= d.n; i += 3)
      for (let j = 0; j <= d.n; j += 3)
        if (Number.isFinite(d.values[i][j]))
          include([c.min + d.span * i / d.n, c.min + d.span * j / d.n], d.values[i][j]);
    include([c.min, c.min], d.min);
    include([c.max, c.min], d.min);
    include([c.min, c.max], d.min);
    include([c.min, c.min], d.max);
    const sx = (w - 84) / Math.max(1e-9, bounds.right - bounds.left),
      sy = (h - 54) / Math.max(1e-9, bounds.bottom - bounds.top);
    const project = (p, z) => {
      const u = unit(p, z);
      return [42 + (u[0] - bounds.left) * sx, 29 + (u[1] - bounds.top) * sy];
    };
    const tiles = [];
    for (let i = 0; i < d.n; i += 3)
      for (let j = 0; j < d.n; j += 3) {
        const ij = [
            [i, j],
            [i + 3, j],
            [i + 3, j + 3],
            [i, j + 3],
          ],
          p = ij.map(([r, t]) => [
            c.min + (d.span * r) / d.n,
            c.min + (d.span * t) / d.n,
          ]),
          z = ij.map(([r, t]) => d.values[r][t]);
        if (!z.every(Number.isFinite)) continue;
        tiles.push({
          p: p.map((v, k) => project(v, z[k])),
          z: z.reduce((a, b) => a + b) / 4,
          depth: p.reduce(
            (v, q) => v + q[0] * Math.sin(a) + q[1] * Math.cos(a),
            0,
          ),
        });
      }
    tiles.sort((a, b) => a.depth - b.depth);
    tiles.forEach((t) => {
      ctx.beginPath();
      t.p.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
      ctx.closePath();
      ctx.fillStyle = color(t.z, d);
      ctx.fill();
      ctx.strokeStyle = "rgba(63,55,45,.14)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });
    if (reference) {
      const pts = reference.history
        .filter((v) => inside(v.p, c))
        .map((v) => project(v.p, v.value));
      line(ctx, pts, "#fffefa", 4.5, [6, 4]);
      line(ctx, pts, blue, 2.5, [6, 4]);
      dot(ctx, project(reference.p, reference.value), blue, 4);
      if (reference.best)
        diamond(ctx, project(reference.best.p, reference.best.value), blue);
    }
    for (let i = 1; i < s.history.length; i++) {
      const a = s.history[i - 1],
        b = s.history[i];
      if (inside(a.p, c) && inside(b.p, c)) {
        const points = [project(a.p, a.value), project(b.p, b.value)];
        line(ctx, points, "#fffefa", 5);
        line(ctx, points, amber, 2.5);
      }
    }
    if (inside(s.p, c)) dot(ctx, project(s.p, s.value), amber, 6);
    if (s.best) diamond(ctx, project(s.best.p, s.best.value), teal);
    const q = s.pending;
    if (q && inside(q.p, c) && Number.isFinite(q.value)) {
      line(ctx, [project(s.p, s.value), project(q.p, q.value)], ink, 2, [5, 4]);
      cross(ctx, project(q.p, q.value), ink);
    }
    if (q && q.g && s.phase <= 2) {
      const len = (d.span * 0.17) / Math.max(1e-15, Math.hypot(...q.g)),
        end = [s.p[0] - q.g[0] * len, s.p[1] - q.g[1] * len],
        endpoint = (p) =>
          project(
            p,
            s.value + q.g[0] * (p[0] - s.p[0]) + q.g[1] * (p[1] - s.p[1]),
          );
      const start = project(s.p, s.value);
      arrow(ctx, start, endpoint([end[0], s.p[1]]), blue, "−gₓ");
      arrow(ctx, start, endpoint([s.p[0], end[1]]), purple, "−gᵧ");
    }
    const origin = project([c.min, c.min], d.min),
      ex = project([c.max, c.min], d.min),
      ey = project([c.min, c.max], d.min),
      ez = project([c.min, c.min], d.max);
    [
      [ex, "x"],
      [ey, "y"],
      [ez, "f"],
    ].forEach(([p, t]) => {
      line(ctx, [origin, p], ink, 1);
      ctx.fillStyle = ink;
      ctx.fillText(
        t,
        Math.max(8, Math.min(w - 45, p[0] + 6)),
        Math.max(14, Math.min(h - 13, p[1] + 5)),
      );
    });
    ctx.fillStyle = "#696258";
    ctx.fillText("高度：原始 f（线性比例）", 12, 17);
    ctx.fillText("f 范围 " + fmt(d.min) + " … " + fmt(d.max), 12, h - 4);
    if (d.min < 0 && d.max > 0) {
      const z = project([c.min, c.min], 0);
      ctx.fillStyle = ink;
      ctx.fillText("0", z[0] - 14, z[1] + 4);
    }
    const labelBounds = { left: 8, right: w - 8, top: 24, bottom: h - 26 };
    if (reference) pointLabel(ctx, project(reference.p, reference.value), "A", blue, labelBounds, -1);
    if (inside(s.p, c)) pointLabel(ctx, project(s.p, s.value), "B", amber, labelBounds);
    return d;
  }
  function plane(el, s, c, reference, showField) {
    const { ctx, w, h } = setup(el),
      d = knownData(s.fn, c, s, reference),
      size = Math.min(w - 62, h - 48),
      box = { x: (w - size) / 2 + 10, y: 10, size };
    const xs = d3
        .scaleLinear()
        .domain([c.min, c.max])
        .range([box.x, box.x + size]),
      ys = d3
        .scaleLinear()
        .domain([c.min, c.max])
        .range([box.y + size, box.y]),
      p = (q) => [xs(q[0]), ys(q[1])];
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, size, size);
    ctx.clip();
    ctx.fillStyle = color(d.min, d);
    ctx.fillRect(box.x, box.y, size, size);
    if (!d.constant) {
      const base = data(s.fn, c),
        thresholds = d3
          .range(1, 18)
          .map((i) => base.min + ((base.max - base.min) * i) / 18);
      if (!base.contourCache) {
        const flat = [];
        for (let y = base.n; y >= 0; y--)
          for (let x = 0; x <= base.n; x++) flat.push(base.values[x][y]);
        base.contourCache = d3
          .contours()
          .size([base.n + 1, base.n + 1])
          .thresholds(thresholds)(flat);
      }
      ctx.save();
      const factor = size / base.n;
      ctx.translate(box.x - factor / 2, box.y - factor / 2);
      ctx.scale(factor, factor);
      const path = d3.geoPath(null, ctx);
      base.contourCache.forEach((shape) => {
        ctx.beginPath();
        path(shape);
        ctx.fillStyle = color(shape.value, d);
        ctx.fill();
        ctx.strokeStyle = "rgba(75,64,84,.28)";
        ctx.lineWidth = 0.7 / factor;
        ctx.stroke();
      });
      ctx.restore();
    }
    const ticks = xs.ticks(5);
    ticks.forEach((t) => {
      line(
        ctx,
        [
          [xs(t), box.y],
          [xs(t), box.y + size],
        ],
        "rgba(255,255,255,.6)",
        0.65,
      );
      line(
        ctx,
        [
          [box.x, ys(t)],
          [box.x + size, ys(t)],
        ],
        "rgba(255,255,255,.6)",
        0.65,
      );
    });
    ctx.labelBounds = {
      minX: box.x + 2,
      maxX: box.x + size - 2,
      minY: box.y + 13,
      maxY: box.y + size - 2,
    };
    if (showField && !s.best) {
      const count = 9;
      for (let i = 1; i < count; i++)
        for (let j = 1; j < count; j++) {
          const at = [
            c.min + (d.span * i) / count,
            c.min + (d.span * j) / count,
          ];
          let g;
          try {
            g = OptimizationFunctions.gradient(s.fn, at);
          } catch (e) {
            continue;
          }
          const norm = Math.hypot(...g);
          if (!Number.isFinite(norm) || norm < 1e-9) continue;
          const len = (d.span * 0.04) / norm;
          arrow(
            ctx,
            p(at),
            p(at.map((v, k) => v - g[k] * len)),
            "rgba(51,43,37,.52)",
          );
        }
    }
    if (s.best && c.algorithm !== "uniform") {
      const a = p([s.p[0] - c.sigma, s.p[1] - c.sigma]),
        b = p([s.p[0] + c.sigma, s.p[1] + c.sigma]);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(180,83,9,.65)";
      ctx.strokeRect(a[0], b[1], b[0] - a[0], a[1] - b[1]);
      ctx.setLineDash([]);
    }
    if (reference) {
      line(
        ctx,
        reference.history.map((v) => p(v.p)),
        "#fffefa",
        5,
        [7, 5],
      );
      line(
        ctx,
        reference.history.map((v) => p(v.p)),
        blue,
        3,
        [7, 5],
      );
      dot(ctx, p(reference.p), blue, 5);
      if (reference.best) diamond(ctx, p(reference.best.p), blue);
    }
    if (s.trials)
      s.trials.slice(-80).forEach((q) => {
        if (inside(q.p, c) && !q.accept) {
          ctx.globalAlpha = 0.45;
          cross(ctx, p(q.p), "#918779");
          ctx.globalAlpha = 1;
        }
      });
    line(
      ctx,
      s.history.map((v) => p(v.p)),
      "#fffefa",
      5,
    );
    line(
      ctx,
      s.history.map((v) => p(v.p)),
      amber,
      3,
    );
    dot(ctx, p(s.history[0].p), ink, 4);
    dot(ctx, p(s.p), amber, 6);
    if (s.best) diamond(ctx, p(s.best.p), teal);
    const q = s.pending;
    if (q && q.p && inside(q.p, c)) {
      line(ctx, [p(s.p), p(q.p)], ink, 2, [4, 4]);
      cross(ctx, p(q.p), ink);
    }
    if (q && q.g && s.phase <= 2) {
      const norm = Math.hypot(...q.g);
      if (Number.isFinite(norm) && norm > 1e-12) {
        const gain = (d.span * 0.16) / norm,
          end = s.p.map((v, i) => v - q.g[i] * gain);
        arrow(ctx, p(s.p), p([end[0], s.p[1]]), blue, "−gₓ");
        arrow(ctx, p(s.p), p([s.p[0], end[1]]), purple, "−gᵧ");
        arrow(ctx, p(s.p), p(end), ink, "−g");
      }
    }
    if (!(q && q.g && s.phase <= 2)) {
      const labels = { left: box.x + 4, right: box.x + size - 4, top: box.y + 2, bottom: box.y + size - 4 };
      if (reference) pointLabel(ctx, p(reference.p), "A", blue, labels, -1);
      pointLabel(ctx, p(s.p), "B", amber, labels);
    }
    ctx.restore();
    ctx.labelBounds = null;
    ctx.strokeStyle = "#918779";
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x, box.y, size, size);
    ctx.fillStyle = ink;
    ticks.forEach((t) => {
      ctx.fillText(
        fmt(t),
        xs(t) - ctx.measureText(fmt(t)).width / 2,
        box.y + size + 21,
      );
      ctx.fillText(
        fmt(t),
        box.x - ctx.measureText(fmt(t)).width - 9,
        ys(t) + 4,
      );
    });
    ctx.fillText("参数 x（无量纲）", box.x + size / 2 - 53, h - 2);
    ctx.save();
    ctx.translate(15, box.y + size / 2 + 53);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("参数 y（无量纲）", 0, 0);
    ctx.restore();
    return box;
  }
  function history(el, s, mc, reference) {
    const { ctx, w, h } = setup(el),
      left = 64,
      top = 17,
      right = 14,
      bottom = 32,
      pw = w - left - right,
      ph = h - top - bottom;
    const all = s.history.concat(reference ? reference.history : []),
      raw = all
        .flatMap((v) => (mc ? [v.value, v.best] : [v.value]))
        .filter(Number.isFinite);
    const mag = Math.max(1, ...raw.map(Math.abs)),
      normalized = raw.map((v) => v / mag);
    let lo = Math.min(...normalized),
      hi = Math.max(...normalized);
    if (hi - lo < 1e-10) {
      lo -= 0.1;
      hi += 0.1;
    }
    const ys = d3
        .scaleLinear()
        .domain([lo, hi])
        .range([top + ph, top]),
      xs = d3
        .scaleLinear()
        .domain([0, Math.max(10, s.step, reference ? reference.step : 0)])
        .range([left, w - right]);
    const ticks = ys.ticks(h < 200 ? 3 : 5);
    ticks.forEach((t) => {
      const y = ys(t);
      line(
        ctx,
        [
          [left, y],
          [w - right, y],
        ],
        "#e5dfd3",
        1,
      );
      const value = t * mag;
      ctx.fillStyle = ink;
      const txt = Number.isFinite(value) ? fmt(value) : "超出浮点范围";
      ctx.fillText(txt, 2, y + 4);
    });
    line(
      ctx,
      [
        [left, top],
        [left, top + ph],
        [w - right, top + ph],
      ],
      "#918779",
      1,
    );
    const path = d3
      .line()
      .x((v) => xs(v.step))
      .y((v) => ys(v.value / mag))
      .defined((v) => Number.isFinite(v.value))
      .context(ctx);
    if (reference) {
      ctx.beginPath();
      path(reference.history);
      ctx.strokeStyle = blue;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (reference && mc) {
      const bestA = d3
        .line()
        .x((v) => xs(v.step))
        .y((v) => ys(v.best / mag))
        .context(ctx);
      ctx.beginPath();
      bestA(reference.history);
      ctx.strokeStyle = blue;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    path(s.history);
    ctx.strokeStyle = amber;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    const last = s.history[s.history.length - 1];
    dot(ctx, [xs(last.step), ys(last.value / mag)], amber, 3);
    if (mc) {
      const best = d3
        .line()
        .x((v) => xs(v.step))
        .y((v) => ys(v.best / mag))
        .context(ctx);
      ctx.beginPath();
      best(s.history);
      ctx.strokeStyle = teal;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = ink;
    xs.ticks(4).forEach((t) => ctx.fillText(String(t), xs(t) - 7, h - 12));
    ctx.fillText(mc ? "提议次数" : "更新次数", w / 2 - 28, h - 1);
    ctx.fillStyle = "#696258";
    ctx.fillText("f · A/B 共用线性坐标", left + 4, 12);
  }
  root.OptimizationView = { fmt, surface, plane, history, color };
})(window);
