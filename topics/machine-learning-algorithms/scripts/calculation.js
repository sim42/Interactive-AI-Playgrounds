(function (root) {
  "use strict";
  const L = root.MachineLearningLab;
  const colors = ["#2457c5", "#b45309", "#0f766e", "#7e22ce", "#a21caf"];
  const fmt = (n) => L.fmt(n, 3);
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function box(title, value, detail, active) {
    const node = element(
      "div",
      undefined,
      "math-box" + (active ? " active" : ""),
    );
    node.append(
      element("span", title),
      element("strong", value),
      element("p", detail),
    );
    return node;
  }
  function grid(items) {
    const node = element("div", undefined, "math-grid");
    node.append(...items);
    return node;
  }
  function branches(first, second, merge, last) {
    const node = element("div", undefined, "math-branches");
    const parallel = element("div", undefined, "branch-pair");
    parallel.append(first, second);
    const join = element("div", undefined, "math-join");
    join.append(element("span", "两路相加 →", "operation-arrow"), merge);
    const final = element("div", undefined, "math-join");
    final.append(element("span", "继续运算 →", "operation-arrow"), last);
    node.append(parallel, join, final);
    return node;
  }
  function note(text) {
    return element("p", text, "math-note");
  }
  function signedRow(label, first, second, limit, output, secondLabel) {
    const row = element("div", undefined, "signed-row");
    row.append(element("strong", label));
    const area = element("div", undefined, "bar-area");
    area.setAttribute("role", "img");
    area.setAttribute(
      "aria-label",
      label + "：" + fmt(first) + (second === null ? "" : " → " + fmt(second)),
    );
    area.append(element("span", undefined, "zero-line"));
    for (const [index, value] of [first, second].entries()) {
      if (value === null) continue;
      const bar = element(
        "span",
        undefined,
        "signed-bar" + (index ? " second" : ""),
      );
      bar.style.left = 50 + (Math.min(0, value) / limit) * 48 + "%";
      bar.style.width = Math.max(0.3, (Math.abs(value) / limit) * 48) + "%";
      bar.style.background = index ? "#0f766e" : "#2457c5";
      bar.title = (index ? secondLabel || "更新后" : "当前") + " " + fmt(value);
      area.append(bar);
    }
    row.append(area, element("output", output));
    return row;
  }
  function distanceRow(label, distance, max, chosen, color) {
    const row = element(
      "div",
      undefined,
      "distance-row" + (chosen ? " chosen" : ""),
    );
    const track = element("div", undefined, "distance-track");
    const bar = element("div", undefined, "distance-bar");
    bar.style.width =
      Math.max(0.4, (distance / Math.max(max, 1e-8)) * 100) + "%";
    if (color) bar.style.background = color;
    track.append(bar);
    row.append(
      element("span", label + (chosen ? " ✓" : "")),
      track,
      element("output", fmt(distance)),
    );
    return row;
  }
  function hingeDiagram(margin, loss) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 480 120");
    svg.setAttribute("role", "img");
    svg.setAttribute(
      "aria-label",
      "有符号间隔 " + fmt(margin) + "，到阈值 1 的缺口 " + fmt(loss),
    );
    const low = Math.min(-1, margin - 0.3),
      high = Math.max(2, margin + 0.3);
    const X = (x) => 55 + ((x - low) / (high - low)) * 370;
    function shape(tag, attrs, content) {
      const node = document.createElementNS(svgNS, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      if (content) node.textContent = content;
      svg.append(node);
      return node;
    }
    shape("line", {
      x1: 55,
      y1: 60,
      x2: 425,
      y2: 60,
      stroke: "#7d8da5",
      "stroke-width": 2,
    });
    for (const t of [0, 1]) {
      shape("line", {
        x1: X(t),
        y1: 46,
        x2: X(t),
        y2: 74,
        stroke: "#182230",
        "stroke-width": 2,
      });
      shape(
        "text",
        {
          x: X(t),
          y: 97,
          "text-anchor": "middle",
          fill: "#526079",
          "font-size": 18,
        },
        t === 0 ? "0：分类边界" : "1：间隔要求",
      );
    }
    if (loss > 0) {
      shape("line", {
        x1: X(margin),
        y1: 32,
        x2: X(1),
        y2: 32,
        stroke: "#b45309",
        "stroke-width": 6,
      });
      shape(
        "text",
        {
          x: (X(margin) + X(1)) / 2,
          y: 19,
          "text-anchor": "middle",
          fill: "#b45309",
          "font-size": 18,
        },
        "损失 = 缺口 " + fmt(loss),
      );
    } else
      shape(
        "text",
        {
          x: 240,
          y: 20,
          "text-anchor": "middle",
          fill: "#0f766e",
          "font-size": 18,
        },
        "已达到间隔要求：数据损失 = 0",
      );
    shape("circle", {
      cx: X(margin),
      cy: 60,
      r: 7,
      fill: "#2457c5",
      stroke: "#fff",
      "stroke-width": 2,
    });
    shape(
      "text",
      {
        x: X(margin),
        y: 43,
        "text-anchor": "middle",
        fill: "#2457c5",
        "font-size": 18,
      },
      "m=" + fmt(margin),
    );
    return svg;
  }
  function svm(s, out) {
    if (s.current < 0) {
      out.append(
        grid([
          box(
            "① 取样本",
            "x₁、x₂、标签 y",
            "只用实心训练点；验证叉号不参与更新。",
            true,
          ),
          box(
            "② 比较间隔",
            "m = y·f(x)",
            "把得分代入标签，再量出离阈值 1 的缺口。",
          ),
          box("③ 求变化率", "g = 正则 + 数据项", "找出每个参数对目标的影响。"),
          box(
            "④ 更新参数",
            "新值 = 旧值 − ηg",
            "下一步计算沿这条路径逐项亮起。",
          ),
        ]),
      );
      return "先点“下一步计算”取一个样本。每四步完成一次参数更新；图中的边界随实际参数移动。";
    }
    const p = s.data.train[s.current],
      before = s.before || { w: s.w, b: s.b },
      g = s.grad;
    if (s.stage === "sample") {
      out.append(
        grid([
          box(
            "样本 #" + p.id,
            "(" + fmt(p.x) + ", " + fmt(p.y) + ")",
            "两个标准化特征 x₁、x₂。",
            true,
          ),
          box(
            "正确类别 y",
            p.label > 0 ? "+1 · A 类" : "−1 · B 类",
            "标签用于检查得分是否方向正确。",
          ),
          box(
            "当前权重 (w₁,w₂)",
            "(" + fmt(before.w[0]) + ", " + fmt(before.w[1]) + ")",
            "各特征影响得分的大小。",
          ),
          box("偏置 b", fmt(before.b), "下一步相乘、相加，得到 f(x)。"),
        ]),
      );
      return "圈出的训练点就是这次更新的依据。参数在这一阶段还没有变化。";
    }
    if (s.stage === "margin") {
      out.append(
        branches(
          box(
            "输入 x₁ → 乘以 w₁",
            fmt(p.x * before.w[0]),
            fmt(p.x) + " × " + fmt(before.w[0]),
          ),
          box(
            "输入 x₂ → 乘以 w₂",
            fmt(p.y * before.w[1]),
            fmt(p.y) + " × " + fmt(before.w[1]),
          ),
          box(
            "两项相加，再加 b",
            "f = " + fmt(g.f),
            fmt(p.x * before.w[0]) +
              " + " +
              fmt(p.y * before.w[1]) +
              " + " +
              fmt(before.b),
          ),
          box(
            "标签 × 得分",
            "m = " + fmt(g.margin),
            p.label + " × " + fmt(g.f) + "；缺口 max(0,1−m)。",
            true,
          ),
        ),
      );
      out.append(hingeDiagram(g.margin, g.hinge));
      return g.active
        ? "蓝点尚未达到 m=1，橙色缺口就是 hinge 损失。即使 m>0 已分类正确，只要 m<1 仍会推动参数。"
        : "蓝点达到或超过 m=1，数据项为零；下一步仍会计算权重正则项。";
    }
    if (s.stage === "gradient") {
      const regular = before.w.map((v) => s.config.lambda * v);
      const data = g.active
        ? [-p.label * p.x, -p.label * p.y, -p.label]
        : [0, 0, 0];
      out.append(
        grid([
          box(
            "间隔判断",
            g.active ? "m < 1 → 数据项开启" : "m ≥ 1 → 数据项为 0",
            "使用刚才同一个样本和同一组参数。",
          ),
          ...["w₁", "w₂", "b"].map((name, i) =>
            box(
              "对 " + name + " 的次梯度",
              "g = " + fmt(i < 2 ? g.dw[i] : g.db),
              i < 2
                ? fmt(regular[i]) + "（λw） + " + fmt(data[i]) + "（−yx）"
                : "偏置不正则化；数据项 = " + fmt(data[i]),
              true,
            ),
          ),
        ]),
      );
      const values = g.dw.concat(g.db),
        lim = Math.max(0.1, ...values.map(Math.abs));
      out.append(
        note(
          "变化率的方向与大小：零线左侧为负，右侧为正；三条使用相同刻度 ±" +
            fmt(lim) +
            "。",
        ),
      );
      values.forEach((v, i) =>
        out.append(
          signedRow(["g(w₁)", "g(w₂)", "g(b)"][i], v, null, lim, fmt(v)),
        ),
      );
      return "梯度指向目标增加的方向。下一步乘以负学习率 −η，再加到原参数；这一阶段只算变化率。";
    }
    const old = before.w.concat(before.b),
      current = s.w.concat(s.b),
      grads = g.dw.concat(g.db);
    const lim = Math.max(0.1, ...old.concat(current).map(Math.abs));
    out.append(
      grid([
        box(
          "步长 η",
          fmt(s.config.eta),
          "同一梯度，较大 η 会产生较大参数位移。",
        ),
        ...["w₁", "w₂", "b"].map((name, i) =>
          box(
            name + "：旧值 + Δ",
            fmt(current[i]),
            fmt(old[i]) +
              " + (" +
              fmt(-s.config.eta * grads[i]) +
              ")；Δ = −η × " +
              fmt(grads[i]),
            true,
          ),
        ),
      ]),
    );
    out.append(
      note(
        "蓝条：更新前；青条：更新后；三条使用相同刻度 ±" +
          fmt(lim) +
          "。零线在中央。",
      ),
    );
    old.forEach((v, i) =>
      out.append(
        signedRow(
          ["w₁", "w₂", "b"][i],
          v,
          current[i],
          lim,
          fmt(v) + " → " + fmt(current[i]),
        ),
      ),
    );
    return "新权重和偏置已经提交。上图灰虚线是旧边界，黑实线是新边界；总体目标用全部训练点重新计算。";
  }
  function knn(s, out) {
    if (s.stage === "ready") {
      out.append(
        grid([
          box(
            "① 查询位置",
            "(" + fmt(s.query.x) + ", " + fmt(s.query.y) + ")",
            "点击主图或在高级设置输入坐标。",
            true,
          ),
          box(
            "② 计算距离",
            "Δ → 平方 → 和 → 开方",
            "下一步逐个比较 24 个训练点。",
          ),
          box(
            "③ 选最近 k 个",
            String(s.config.k) + " 个",
            "按实际距离排序，同距按编号。",
          ),
          box("④ 每点一票", "A / B 多数票", "邻居数可以改变分类；不更新权重。"),
        ]),
      );
      return "点“下一步计算”，主图连线和这里的坐标运算使用同一个样本。";
    }
    if (s.stage === "distance") {
      const p = s.data.train[s.current],
        dx = p.x - s.query.x,
        dy = p.y - s.query.y,
        sum = dx * dx + dy * dy;
      out.append(
        branches(
          box(
            "x₁ 坐标差 → 平方",
            fmt(dx * dx),
            "(" + fmt(p.x) + " − " + fmt(s.query.x) + ")² = (" + fmt(dx) + ")²",
          ),
          box(
            "x₂ 坐标差 → 平方",
            fmt(dy * dy),
            "(" + fmt(p.y) + " − " + fmt(s.query.y) + ")² = (" + fmt(dy) + ")²",
          ),
          box("平方后相加", fmt(sum), fmt(dx * dx) + " + " + fmt(dy * dy)),
          box(
            "开平方 → 距离 d",
            fmt(Math.sqrt(sum)),
            "√" + fmt(sum) + "；距离越小，位置越近。",
            true,
          ),
        ),
      );
      const max = Math.max(...s.distances.map((v) => v.d), 0.1);
      out.append(
        note("已计算距离（展示最近完成的 4 个；共同上限 " + fmt(max) + "）："),
      );
      s.distances
        .slice(-4)
        .forEach((v) =>
          out.append(
            distanceRow(
              "#" + v.id,
              v.d,
              max,
              v.index === s.current,
              v.label > 0 ? colors[0] : colors[1],
            ),
          ),
        );
      return (
        "坐标差可正可负，平方后都贡献非负距离。这一步不读取标签投票。已完成 " +
        s.distances.length +
        " / 24 个距离。"
      );
    }
    if (s.stage === "rank") {
      const sorted = s.distances
          .slice()
          .sort((a, b) => a.d - b.d || a.id - b.id),
        max = sorted[sorted.length - 1].d;
      out.append(
        note(
          "从近到远；框线 ✓ 表示入选。条长共同上限 " +
            fmt(max) +
            "，类别只决定颜色。",
        ),
      );
      sorted
        .slice(0, Math.min(s.config.k + 2, 17))
        .forEach((v, i) =>
          out.append(
            distanceRow(
              "#" + v.id,
              v.d,
              max,
              i < s.config.k,
              v.label > 0 ? colors[0] : colors[1],
            ),
          ),
        );
      return (
        "只保留前 " +
        s.config.k +
        " 个邻居。后面的点没有投票权；接下来逐个加票。"
      );
    }
    const votes = element("div", undefined, "votes");
    for (const [label, value, color] of [
      ["A 类", s.votes.positive, colors[0]],
      ["B 类", s.votes.negative, colors[1]],
    ]) {
      const counter = element("div", undefined, "vote-counter");
      counter.style.borderColor = color;
      counter.append(element("span", label), element("strong", value + " 票"));
      for (let i = 0; i < value; i++) {
        const chip = element("span", "+1", "vote-chip");
        chip.style.color = color;
        counter.append(chip);
      }
      votes.append(counter);
    }
    out.append(votes);
    out.append(
      note(
        "已读取 " +
          s.votePosition +
          " / " +
          s.config.k +
          " 个邻居。" +
          (s.stage === "vote"
            ? "本步样本 #" +
              s.data.train[s.current].id +
              " 投给 " +
              (s.data.train[s.current].label > 0 ? "A" : "B") +
              " 类。"
            : "多数票预测：" + (s.prediction > 0 ? "A" : "B") + " 类。"),
      ),
    );
    return s.done
      ? "多数票已经得到预测。票数占比不等于经过校准的概率；kNN 在这里没有训练参数更新。"
      : "每个邻居贡献一票。继续单步会把当前邻居的标签加入计数，主图同步亮起这条连线。";
  }
  function kmeans(s, out) {
    if (s.stage === "ready") {
      out.append(
        grid([
          box(
            "① 比较距离",
            s.config.clusters + " 个中心",
            "每个点选择最近中心，不读取类别标签。",
            true,
          ),
          box("② 固定分配", "收集每簇坐标", "一轮分配完成后才移动中心。"),
          box("③ 算坐标平均", "总和 ÷ 点数", "每一步只更新一个中心。"),
          box(
            "④ 再次分配",
            "重复，直到位置稳定",
            "初始中心依赖种子，可能得到局部解。",
          ),
        ]),
      );
      return "先计算一个点到所有中心的距离，找出最短的那一条。";
    }
    if (s.stage === "assign") {
      const p = s.points[s.current],
        ds = s.centers.map((c) => L.distance(p, c)),
        max = Math.max(...ds, 0.1);
      out.append(
        note(
          "样本 #" +
            p.id +
            " = (" +
            fmt(p.x) +
            ", " +
            fmt(p.y) +
            ")；各中心距离使用共同上限 " +
            fmt(max) +
            "。",
        ),
      );
      ds.forEach((d, j) =>
        out.append(
          distanceRow(
            "C" + (j + 1),
            d,
            max,
            j === s.assignments[s.current],
            colors[j],
          ),
        ),
      );
      const j = s.assignments[s.current],
        c = s.centers[j];
      out.append(
        grid([
          box(
            "最近中心 C" + (j + 1),
            "(" + fmt(c.x) + ", " + fmt(c.y) + ")",
            "✓ 对应最短的距离条。",
            true,
          ),
          box(
            "坐标差平方和",
            fmt((p.x - c.x) ** 2 + (p.y - c.y) ** 2),
            "(" + fmt(p.x - c.x) + ")² + (" + fmt(p.y - c.y) + ")²",
          ),
          box("开方", fmt(ds[j]), "这是该点到中心的欧氏距离。"),
          box(
            "提交分配",
            "点 #" + p.id + " → C" + (j + 1),
            "中心在分配阶段保持不动。",
          ),
        ]),
      );
      return "比较的是位置距离，A/B 标签没有参与计算；同距选择编号较小的中心。";
    }
    if (s.stage === "centers" && s.centerCursor > 0) {
      const j = s.centerCursor - 1,
        members = s.points.filter((_, i) => s.assignments[i] === j),
        old = s.previousCenters[j],
        current = s.centers[j];
      if (!members.length) {
        out.append(
          box(
            "空簇 C" + (j + 1),
            "0 个点",
            "没有可求平均的坐标；保留原中心，避免除以零。",
            true,
          ),
        );
        return (
          "这轮 C" + (j + 1) + " 没有成员。可以改变簇数或种子比较空簇现象。"
        );
      }
      const sx = members.reduce((v, p) => v + p.x, 0),
        sy = members.reduce((v, p) => v + p.y, 0);
      out.append(
        grid([
          box(
            "簇 C" + (j + 1) + " 的成员",
            members.length + " 个点",
            members.map((p) => "#" + p.id).join("、"),
          ),
          box(
            "x₁ 坐标平均",
            fmt(current.x),
            fmt(sx) + " ÷ " + members.length,
            true,
          ),
          box(
            "x₂ 坐标平均",
            fmt(current.y),
            fmt(sy) + " ÷ " + members.length,
            true,
          ),
          box(
            "中心移动距离",
            fmt(L.distance(old, current)),
            "旧 (" +
              fmt(old.x) +
              ", " +
              fmt(old.y) +
              ") → 新 (" +
              fmt(current.x) +
              ", " +
              fmt(current.y) +
              ")",
          ),
        ]),
      );
      const lim = Math.max(
        0.1,
        Math.abs(old.x),
        Math.abs(old.y),
        Math.abs(current.x),
        Math.abs(current.y),
      );
      out.append(
        note("同一坐标刻度 ±" + fmt(lim) + "；蓝条：更新前，青条：坐标平均。"),
      );
      out.append(
        signedRow(
          "中心 x₁",
          old.x,
          current.x,
          lim,
          fmt(old.x) + " → " + fmt(current.x),
        ),
        signedRow(
          "中心 x₂",
          old.y,
          current.y,
          lim,
          fmt(old.y) + " → " + fmt(current.y),
        ),
      );
      return "保持这轮成员不变，坐标平均能最小化本簇的平方距离总和。下一轮再用新中心检查分配。";
    }
    if (s.stage === "centers") {
      out.append(
        box(
          "分配已完成",
          s.points.length + " 个点",
          "下一步逐簇把坐标相加并除以点数。",
          true,
        ),
      );
      return "接下来更新均值；当前分配暂时固定。";
    }
    out.append(
      grid([
        box(
          "完成轮次",
          String(s.iteration),
          "每轮包括所有点的分配、所有中心的更新。",
        ),
        box(
          "平方距离总和",
          fmt(s.inertia),
          "把每个点到所属新中心的距离平方再相加。",
          true,
        ),
        box("最大中心位移", fmt(s.shift), "所有中心移动距离中的最大值。"),
        box(
          "停止判断",
          s.done ? "已结束" : "继续分配",
          "位移 < 0.00001 或到 12 轮上限。",
        ),
      ]),
    );
    return "更小的平方距离总和表示当前分组更紧凑，不等于发现了真实类别。改变种子能检查初始化的影响。";
  }
  function renderCalculation(s) {
    const out = document.getElementById("math-diagram");
    out.replaceChildren();
    const summary =
      s.config.algorithm === "svm"
        ? svm(s, out)
        : s.config.algorithm === "knn"
          ? knn(s, out)
          : kmeans(s, out);
    document.getElementById("math-summary").textContent = summary;
  }
  Object.assign(L, { renderCalculation });
})(window);
