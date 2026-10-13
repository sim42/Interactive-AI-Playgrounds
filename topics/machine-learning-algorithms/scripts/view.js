(function (root) {
  "use strict";
  const L = root.MachineLearningLab;
  const colors = ["#2457c5", "#b45309", "#0f766e", "#7e22ce", "#a21caf"];
  const titles = {
    svm: "线性 SVM：直线怎样移动？",
    knn: "k 近邻：距离怎样变成预测？",
    kmeans: "k-means：中心怎样找到分组？",
  };
  const questions = {
    svm: "预测：分类正确的训练点是否一定不再影响 SVM？在单步运算图中找一个有符号间隔大于 0、小于 1 的例子。",
    knn: "预测：k 从 1 变为 15，当前查询点的分类是否一定更可靠？保持种子与查询坐标不变，再看投票和验证准确率。",
    kmeans:
      "预测：把簇数从 2 改成 5，平方距离总和会不会更小？更小的总和是否意味着发现了更正确的类别？",
  };
  const answers = {
    svm: "SVM 同时要求分类正确和具有足够的有符号间隔。0 ≤ y f(x) < 1 时虽然符号正确，hinge 损失仍为正；该点的数据次梯度继续推动参数。λ 项另外惩罚权重大小。有限轮数中的间隔不足点不能直接当作精确最优解的支持向量集合。",
    knn: "增加 k 会让更多邻居参与投票，也可能纳入另一类的较远点。局部噪声与两类形状共同影响结果，所以 k 大不保证更好。默认种子下的一个结果只是这个合成例子的证据；验证集若用于选 k，就不能再当作独立测试。",
    kmeans:
      "更多中心能降低拟合当前点的平方距离总和，但这个目标没有真实类别标签。簇编号可因初始化而置换，更多簇也可能把一团拆开。需结合任务、尺度与其他证据判断，不只追求更小的数。",
  };
  const formula = {
    svm: [
      ["模型与目标", "f(x) = w₁x₁ + w₂x₂ + b；预测由 f 的正负决定。"],
      ["训练目标", "J = λ/2 · (w₁² + w₂²) + 平均 max(0, 1 − y f(x))"],
      [
        "一个样本的动作",
        "若 y f(x) < 1：g(w) = λw − yx，g(b) = −y；否则 g(w) = λw，g(b) = 0。",
      ],
      ["更新", "w ← w − ηg(w)，b ← b − ηg(b)。间隔恰好为 1 时选数据次梯度 0。"],
    ],
    knn: [
      ["距离", "d = √((x₁ − q₁)² + (x₂ − q₂)²)"],
      ["预测", "取最近 k 个训练点，每点一票，多数标签作为预测。"],
      [
        "边界",
        "距离以这两个合成标准化特征计算。真实测量单位不同时，尺度选择会影响邻居。",
      ],
    ],
    kmeans: [
      ["分配", "每个点分给最近中心：cᵢ = argminⱼ ‖xᵢ − μⱼ‖²"],
      ["更新", "μⱼ ← 分给簇 j 的所有点的坐标平均值。"],
      ["目标", "平方距离总和 = Σᵢ ‖xᵢ − μcᵢ‖²。这里不是分类损失或预测准确率。"],
      [
        "停止",
        "最大中心位移 < 0.00001，或已完成 12 轮。空簇保留原中心并提示。",
      ],
    ],
  };
  function text(id, value) {
    document.getElementById(id).textContent = value;
  }
  function sizeCanvas(canvas) {
    const r = canvas.getBoundingClientRect(),
      d = Math.min(root.devicePixelRatio || 1, 2);
    const w = Math.max(10, r.width),
      h = Math.max(10, r.height);
    if (
      canvas.width !== Math.round(w * d) ||
      canvas.height !== Math.round(h * d)
    ) {
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }
  function plotGeometry(canvas) {
    const z = sizeCanvas(canvas);
    const scale = 1;
    const margin = {
      left: (z.w < 440 ? 49 : 62) * scale,
      right: 16,
      top: 15,
      bottom: 49 * scale,
    };
    const pw = z.w - margin.left - margin.right,
      ph = z.h - margin.top - margin.bottom;
    const X = (x) => margin.left + ((x + 2.5) / 5) * pw,
      Y = (y) => margin.top + ((2.5 - y) / 5) * ph;
    return { ...z, margin, pw, ph, X, Y, scale };
  }
  let knnCache = null;
  function drawBackground(z, s) {
    const { ctx, X, Y, pw, ph } = z,
      mode = s.config.algorithm;
    ctx.fillStyle = "#fff";
    ctx.fillRect(X(-2.5), Y(2.5), pw, ph);
    if (
      mode === "kmeans" ||
      (mode === "svm" && !s.updates) ||
      (mode === "knn" && !s.done)
    )
      return;
    const n = 38,
      key = s.config.dataset + ":" + s.config.seed + ":" + s.config.k;
    if (mode === "knn" && (!knnCache || knnCache.key !== key)) {
      knnCache = { key, values: [] };
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++)
          knnCache.values.push(
            L.predictKnn(
              s.data.train,
              { x: -2.5 + ((i + 0.5) * 5) / n, y: 2.5 - ((j + 0.5) * 5) / n },
              s.config.k,
            ),
          );
    }
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const label =
          mode === "svm"
            ? L.predictSvm(s.w, s.b, {
                x: -2.5 + ((i + 0.5) * 5) / n,
                y: 2.5 - ((j + 0.5) * 5) / n,
              })
            : knnCache.values[j * n + i];
        ctx.fillStyle = label > 0 ? "#eaf0ff" : "#fff1e3";
        ctx.fillRect(
          X(-2.5) + (i * pw) / n,
          Y(2.5) + (j * ph) / n,
          pw / n + 0.5,
          ph / n + 0.5,
        );
      }
  }
  function drawAxes(z) {
    const { ctx, X, Y, pw, ph, w, h, scale } = z;
    ctx.font = 14 * scale + "px system-ui";
    ctx.textBaseline = "middle";
    for (let t = -2; t <= 2; t++) {
      ctx.strokeStyle = "#dfe5ee";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(t), Y(2.5));
      ctx.lineTo(X(t), Y(-2.5));
      ctx.moveTo(X(-2.5), Y(t));
      ctx.lineTo(X(2.5), Y(t));
      ctx.stroke();
      ctx.fillStyle = "#526079";
      ctx.textAlign = "center";
      ctx.fillText(String(t), X(t), Y(-2.5) + 16);
      ctx.textAlign = "right";
      ctx.fillText(String(t), X(-2.5) - 9, Y(t));
    }
    ctx.strokeStyle = "#7d8da5";
    ctx.strokeRect(X(-2.5), Y(2.5), pw, ph);
    ctx.fillStyle = "#526079";
    ctx.textAlign = "center";
    ctx.font = 14 * scale + "px system-ui";
    ctx.fillText("特征 x₁（标准化，无量纲）", X(0), h - 9);
    ctx.save();
    ctx.translate(15 * scale, Y(0));
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("特征 x₂（标准化，无量纲）", 0, 0);
    ctx.restore();
  }
  function drawImplicit(z, w, b, level, style, dashed) {
    const { ctx, X, Y } = z;
    const pts = [];
    for (const x of [-2.5, 2.5])
      if (Math.abs(w[1]) > 1e-12) {
        const y = (level - b - w[0] * x) / w[1];
        if (y >= -2.5 && y <= 2.5) pts.push({ x, y });
      }
    for (const y of [-2.5, 2.5])
      if (Math.abs(w[0]) > 1e-12) {
        const x = (level - b - w[1] * y) / w[0];
        if (x >= -2.5 && x <= 2.5) pts.push({ x, y });
      }
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.setLineDash(dashed ? [6, 5] : []);
    ctx.lineWidth = (level === 0 ? 2.3 : 1.2) * z.scale;
    ctx.strokeStyle = style;
    ctx.moveTo(X(pts[0].x), Y(pts[0].y));
    ctx.lineTo(X(pts[1].x), Y(pts[1].y));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function drawPoint(z, p, highlight, mode, cluster) {
    const { ctx, X, Y, scale } = z;
    const px = X(p.x),
      py = Y(p.y);
    let color =
      mode === "kmeans"
        ? cluster < 0
          ? "#7d8da5"
          : colors[cluster]
        : p.label > 0
          ? colors[0]
          : colors[1];
    if (highlight) {
      ctx.beginPath();
      ctx.arc(px, py, 11 * scale, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.lineWidth = 2.5 * scale;
      ctx.strokeStyle = "#182230";
      ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2 * scale;
    if (mode === "kmeans" || p.split === "train") {
      ctx.beginPath();
      if (
        (mode !== "kmeans" && p.label < 0) ||
        (mode === "kmeans" && cluster === 1)
      )
        ctx.rect(px - 4 * scale, py - 4 * scale, 8 * scale, 8 * scale);
      else if (mode === "kmeans" && cluster === 2) {
        ctx.moveTo(px, py - 5.5 * scale);
        ctx.lineTo(px + 5 * scale, py + 4 * scale);
        ctx.lineTo(px - 5 * scale, py + 4 * scale);
        ctx.closePath();
      } else if (mode === "kmeans" && cluster === 3) {
        ctx.moveTo(px, py - 6 * scale);
        ctx.lineTo(px + 5 * scale, py);
        ctx.lineTo(px, py + 6 * scale);
        ctx.lineTo(px - 5 * scale, py);
        ctx.closePath();
      } else if (mode === "kmeans" && cluster === 4) {
        ctx.rect(px - 5 * scale, py - 1.8 * scale, 10 * scale, 3.6 * scale);
        ctx.rect(px - 1.8 * scale, py - 5 * scale, 3.6 * scale, 10 * scale);
      } else ctx.arc(px, py, 4.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(px - 4.5 * scale, py - 4.5 * scale);
      ctx.lineTo(px + 4.5 * scale, py + 4.5 * scale);
      ctx.moveTo(px - 4.5 * scale, py + 4.5 * scale);
      ctx.lineTo(px + 4.5 * scale, py - 4.5 * scale);
      ctx.stroke();
      ctx.font = 10 * scale + "px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(p.label > 0 ? "A" : "B", px + 6, py - 4);
    }
    if (highlight) {
      ctx.font = "bold " + 12 * scale + "px system-ui";
      ctx.fillStyle = "#182230";
      ctx.textAlign = "left";
      ctx.fillText("#" + p.id, Math.min(px + 14, z.w - 45), py - 12);
    }
  }
  function drawPlot(s) {
    if (L.drawInteractivePlot) { L.drawInteractivePlot(s); return; }
    const canvas = document.getElementById("plot"),
      z = plotGeometry(canvas),
      { ctx, X, Y, scale } = z;
    drawBackground(z, s);
    drawAxes(z);
    ctx.save();
    ctx.beginPath();
    ctx.rect(X(-2.5), Y(2.5), z.pw, z.ph);
    ctx.clip();
    const mode = s.config.algorithm;
    if (mode === "svm") {
      if (s.stage === "update" && s.before)
        drawImplicit(z, s.before.w, s.before.b, 0, "#7d8da5", true);
      drawImplicit(z, s.w, s.b, -1, "#526079", true);
      drawImplicit(z, s.w, s.b, 1, "#526079", true);
      drawImplicit(z, s.w, s.b, 0, "#182230", false);
    }
    if (mode === "knn") {
      const q = s.query;
      if (s.current >= 0) {
        const p = s.data.train[s.current];
        ctx.beginPath();
        ctx.strokeStyle = "#182230";
        ctx.lineWidth = 2;
        ctx.moveTo(X(q.x), Y(q.y));
        ctx.lineTo(X(p.x), Y(p.y));
        ctx.stroke();
      }
      s.neighbors.forEach((n, i) => {
        const p = s.data.train[n.index];
        ctx.strokeStyle =
          i < s.votePosition ? colors[p.label > 0 ? 0 : 1] : "#7d8da5";
        ctx.lineWidth = i < s.votePosition ? 2 : 1;
        ctx.setLineDash(i < s.votePosition ? [] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(X(q.x), Y(q.y));
        ctx.lineTo(X(p.x), Y(p.y));
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }
    if (mode === "kmeans") {
      if (s.current >= 0) {
        const p = s.points[s.current];
        s.centers.forEach((c, j) => {
          ctx.lineWidth = s.assignments[s.current] === j ? 2.5 : 1;
          ctx.strokeStyle = colors[j];
          ctx.setLineDash(s.assignments[s.current] === j ? [] : [4, 5]);
          ctx.beginPath();
          ctx.moveTo(X(p.x), Y(p.y));
          ctx.lineTo(X(c.x), Y(c.y));
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }
      if (s.previousCenters && s.stage === "centers")
        s.centers.forEach((c, j) => {
          const old = s.previousCenters[j];
          ctx.beginPath();
          ctx.strokeStyle = colors[j];
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.moveTo(X(old.x), Y(old.y));
          ctx.lineTo(X(c.x), Y(c.y));
          ctx.stroke();
          ctx.setLineDash([]);
        });
    }
    const points =
      mode === "kmeans" ? s.points : s.data.train.concat(s.data.validation);
    points.forEach((p, i) =>
      drawPoint(
        z,
        p,
        i === s.current,
        mode,
        mode === "kmeans" ? s.assignments[i] : null,
      ),
    );
    if (mode === "knn") {
      ctx.beginPath();
      const x = X(s.query.x),
        y = Y(s.query.y);
      ctx.moveTo(x, y - 9);
      ctx.lineTo(x + 9, y);
      ctx.lineTo(x, y + 9);
      ctx.lineTo(x - 9, y);
      ctx.closePath();
      ctx.fillStyle =
        s.prediction === null ? "#fff" : colors[s.prediction > 0 ? 0 : 1];
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#182230";
      ctx.stroke();
      ctx.font = "bold 12px system-ui";
      ctx.fillStyle = "#182230";
      ctx.textAlign = "left";
      ctx.fillText("查询", Math.min(x + 13, z.w - 50), y + 14);
    }
    if (mode === "kmeans")
      s.centers.forEach((c, j) => {
        const x = X(c.x),
          y = Y(c.y);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x, y, 10 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors[j];
        ctx.lineWidth = 2.5 * scale;
        ctx.stroke();
        ctx.font = "bold " + 12 * scale + "px system-ui";
        ctx.fillStyle = colors[j];
        ctx.textAlign = "center";
        ctx.fillText(String(j + 1), x, y);
        ctx.textAlign = "left";
        ctx.fillText("C" + (j + 1), Math.min(x + 13, z.w - 50), y - 10);
      });
    ctx.restore();
  }
  function drawHistory(s) {
    const c = document.getElementById("history-plot");
    if (!c.getBoundingClientRect().width) return;
    const { ctx, w, h } = sizeCanvas(c);
    const a = s.history;
    if (!a.length) {
      ctx.fillStyle = "#526079";
      ctx.font = "14px system-ui";
      ctx.fillText(
        s.config.algorithm === "knn"
          ? "kNN 不更新模型参数，没有训练目标曲线。"
          : "完整更新完成后显示目标记录。",
        16,
        35,
      );
      return;
    }
    const min = Math.min(...a.map((v) => v.y)),
      max = Math.max(...a.map((v) => v.y));
    const low = 0,
      high = Math.max(0.1, max * 1.12),
      last = Math.max(1, a[a.length - 1].x);
    const X = (x) => 64 + ((w - 90) * x) / last,
      Y = (y) => h - 34 - ((h - 55) * (y - low)) / (high - low);
    ctx.font = "13px system-ui";
    ctx.fillStyle = "#526079";
    ctx.textAlign = "right";
    for (let i = 0; i <= 3; i++) {
      const v = (i * high) / 3;
      ctx.strokeStyle = "#d7dee9";
      ctx.beginPath();
      ctx.moveTo(64, Y(v));
      ctx.lineTo(w - 26, Y(v));
      ctx.stroke();
      ctx.fillText(L.fmt(v, 2), 56, Y(v) + 4);
    }
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = 2;
    ctx.beginPath();
    a.forEach((p, i) =>
      i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)),
    );
    ctx.stroke();
    ctx.fillStyle = "#526079";
    ctx.textAlign = "center";
    ctx.fillText(
      s.config.algorithm === "svm"
        ? "参数更新次数（当前 0–" + last + "）"
        : "完成轮次（当前 0–" + last + "）",
      w / 2,
      h - 8,
    );
    ctx.textAlign = "left";
    ctx.fillText("目标数值", 8, 13);
    ctx.fillText("纵轴从 0 起；上限随数据调整", 70, 14);
  }
  function render(s) {
    const m = L.metrics(s),
      mode = s.config.algorithm;
    for (const id of ["svm-fields", "knn-fields", "kmeans-fields"])
      document.getElementById(id).hidden = id !== mode + "-fields";
    document.getElementById("lambda-field").hidden = mode !== "svm";
    document.getElementById("query-fields").hidden = mode !== "knn";
    text("plot-title", titles[mode]);
    text(
      "nature",
      mode === "svm"
        ? "浏览器中实际训练的微型线性模型 · 只用 24 个训练点"
        : mode === "knn"
          ? "实际欧氏距离计算与投票 · 查询点不参与训练"
          : "实际 Lloyd 聚类计算 · 36 个点，不读取标签",
    );
    text(
      "algorithm-help",
      {
        svm: "线性支持向量机（SVM）用一条直线分类，同时要求样本离边界足够远。每四步用一个训练点更新参数。",
        knn: "k 近邻（kNN）用最近的训练样本投票。它没有权重学习；本页逐步演示一次查询的距离、排序和投票。",
        kmeans:
          "k-means 聚类先找最近中心，再求每簇坐标平均。它不使用类别标签，每轮包括分配与中心更新。",
      }[mode],
    );
    text("seed-label", s.config.seed);
    text(
      "status",
      {
        ready: "尚未运行",
        running: "运行中",
        paused: "已暂停",
        done: "已结束",
        error: "无法完成",
      }[s.status],
    );
    document.getElementById("status").className = "status " + s.status;
    text(
      "primary-label",
      mode === "svm"
        ? "训练目标（损失 + 正则）"
        : mode === "knn"
          ? "当前查询点预测"
          : "平方距离总和",
    );
    text(
      "primary-value",
      mode === "knn"
        ? s.prediction === null
          ? "等待投票"
          : s.prediction > 0
            ? "A 类（+1）"
            : "B 类（−1）"
        : m.primary === null
          ? "完整轮后显示"
          : L.fmt(m.primary),
    );
    text(
      "secondary-label",
      mode === "svm"
        ? "训练 / 验证准确率"
        : mode === "knn"
          ? "验证准确率（同一 k）"
          : "本轮最大中心位移",
    );
    text(
      "secondary-value",
      mode === "svm"
        ? Math.round(m.train * 100) +
            "% / " +
            Math.round(m.validation * 100) +
            "%"
        : mode === "knn"
          ? s.done
            ? Math.round(m.validation * 100) + "%"
            : "推理完成后显示"
          : s.iteration || s.stage === "centers"
            ? L.fmt(s.shift, 4)
            : "尚未更新",
    );
    text("progress-value", m.progress);
    text("trace-title", s.trace.title);
    text("stage-counter", s.steps + " 个计算动作");
    const list = document.getElementById("trace-lines");
    list.replaceChildren(
      ...s.trace.lines.map((line) => {
        const p = document.createElement("p");
        p.textContent = line;
        return p;
      }),
    );
    text("prompt", questions[mode]);
    text("answer", answers[mode]);
    const legend = document.getElementById("legend");
    const labels =
      mode === "svm"
        ? [
            "● A 类（+1）",
            "■ B 类（−1）",
            "实心：训练；蓝/橙叉号：验证",
            "实线：f=0；虚线：f=±1",
          ]
        : mode === "knn"
          ? [
              "● A 类（+1）",
              "■ B 类（−1）",
              "实心：训练；叉号：验证",
              "◇ 查询点；连线：当前计算 / 投票",
            ]
          : [
              "灰点：尚未分配",
              ...["● C1", "■ C2", "▲ C3", "◆ C4", "✚ C5"].slice(
                0,
                s.config.clusters,
              ),
              "编号圆环：中心（无标签）",
              "连线：距离比较；虚线：中心移动；底色：当前最近中心",
            ];
    legend.replaceChildren(
      ...labels.map((v, i) => {
        const span = document.createElement("span");
        span.textContent = v;
        if (mode !== "kmeans" && i < 2)
          span.className = i ? "legend-b" : "legend-a";
        if (mode === "kmeans" && i > 0 && i <= s.config.clusters)
          span.style.color = colors[i - 1];
        return span;
      }),
    );
    let observation =
      mode === "svm"
        ? s.config.dataset === "xor" && !s.config.edits.length
          ? "XOR 的相同类别位于对角两团，一条直线无法完全分开；这反映线性模型的限制。"
          : "观察间隔与目标：一步更新只用一个训练点，因此整体目标可能短暂上升。浅色区域是当前得分的正负号，网格仅近似显示区域，直线位置精确计算。"
        : mode === "knn"
          ? "查询点为待预测记录，无已知标签。完成后背景表示各位置的离散类别预测，不表示概率。"
          : "底色表示此刻最近的中心，点的颜色表示已经实际分配的簇，两者可能在更新中心后暂时不同。全部36点参与聚类，不划分训练/验证。簇编号不代表真实类别。";
    if (mode === "svm" && s.stage === "update")
      observation += " 灰虚线是更新前边界。";
    text("observation", observation);
    text(
      "dataset-note",
      s.config.edits.length ? "生成数据上已修改 " + s.config.edits.length + " 个点；验证点的坐标与标签保留。切换例子或种子会清除手动修改。" : "原创合成特征。切换例子仅改变数据机制，保持种子与算法参数。",
    );
    const fc = document.getElementById("formula-content");
    fc.replaceChildren(
      ...formula[mode].map(([title, v]) => {
        const p = document.createElement("p");
        p.className = "math";
        p.textContent = title + "：" + v;
        return p;
      }),
    );
    text("history-x-label", mode === "kmeans" ? "完成轮次" : "参数更新次数");
    text("history-y-label", mode === "kmeans" ? "平方距离总和" : "训练目标");
    const tbody = document.getElementById("history-body");
    tbody.replaceChildren(
      ...s.history.slice(-8).map((p) => {
        const tr = document.createElement("tr");
        for (const val of [p.x, L.fmt(p.y, 5)]) {
          const td = document.createElement("td");
          td.textContent = val;
          tr.append(td);
        }
        return tr;
      }),
    );
    if (!s.history.length) {
      const tr = document.createElement("tr"),
        td = document.createElement("td");
      td.colSpan = 2;
      td.textContent =
        mode === "knn" ? "kNN 没有参数训练记录。" : "尚无完整更新记录。";
      tr.append(td);
      tbody.append(tr);
    }
    L.renderCalculation(s);
    drawPlot(s);
    drawHistory(s);
  }
  function plotToPoint(event) {
    if (L.interactivePlotToPoint) return L.interactivePlotToPoint(event);
    const c = document.getElementById("plot"),
      r = c.getBoundingClientRect(),
      scale = 1,
      left = (r.width < 440 ? 49 : 62) * scale,
      top = 15,
      right = 16,
      bottom = 49 * scale,
      x = event.clientX - r.left,
      y = event.clientY - r.top;
    if (x < left || x > r.width - right || y < top || y > r.height - bottom)
      return null;
    return {
      x: Number(
        (-2.5 + ((x - left) / (r.width - left - right)) * 5).toFixed(2),
      ),
      y: Number((2.5 - ((y - top) / (r.height - top - bottom)) * 5).toFixed(2)),
    };
  }
  Object.assign(L, { render, drawPlot, drawHistory, plotToPoint });
})(window);
