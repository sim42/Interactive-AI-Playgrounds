(function () {
  "use strict";
  const mc = !!window.MonteCarloModel,
    M = mc ? window.MonteCarloModel : window.OptimizationModel,
    F = window.OptimizationFunctions,
    V = window.OptimizationView,
    $ = (id) => document.getElementById(id),
    fmt = V.fmt;
  let config = { ...M.defaults },
    state = M.initial(config),
    running = false,
    raf = 0,
    lastTime = 0,
    angle = 35,
    planeBox = null,
    draft = false,
    reference = null,
    batchRemaining = 0;
  const numeric = [
    "min",
    "max",
    "x",
    "y",
    "limit",
    ...(mc ? ["sigma", "temp", "cooling", "seed"] : ["rate", "beta"]),
  ];
  function stop() {
    running = false;
    batchRemaining = 0;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function node(title, equation, result, late, commit) {
    const n = el(
      "div",
      "math-node" + (late ? " hidden-phase" : "") + (commit ? " commit" : ""),
    );
    n.append(
      el("small", "", title),
      el("div", "equation", late ? "等待下一阶段" : equation),
    );
    if (!late && result !== undefined) n.append(el("strong", "", result));
    return n;
  }
  function syncInputs() {
    ["fn", "expression", "algorithm", ...numeric].forEach((id) => {
      $(id).value = config[id];
      $(id).removeAttribute("aria-invalid");
    });
    const name = mc ? "sigma" : "rate";
    $(name + "-range").value = Math.min(
      Number($(name + "-range").max),
      config[name],
    );
    $("angle").value = angle;
    draft = false;
    $("input-error").textContent = "";
  }
  function markDraft() {
    stop();
    draft = true;
    state.message = "编辑已暂停；图中仍为上一组已应用条件。请应用函数与起点。";
    render();
  }
  function readConfig() {
    const next = {
      ...config,
      fn: $("fn").value,
      expression: $("expression").value.trim(),
      algorithm: $("algorithm").value,
    };
    numeric.forEach((id) => {
      $(id).removeAttribute("aria-invalid");
      const input = $(id),
        v = input.value.trim() === "" ? NaN : Number(input.value),
        integer = ["seed", "limit"].includes(id);
      if (
        !Number.isFinite(v) ||
        v < Number(input.min) ||
        v > Number(input.max) ||
        (integer && !Number.isInteger(v))
      ) {
        input.setAttribute("aria-invalid", "true");
        throw Error(
          input.labels[0].textContent +
            "：请输入 " +
            input.min +
            "–" +
            input.max +
            " 的" +
            (integer ? "整数" : "有效数值") +
            "。",
        );
      }
      next[id] = v;
    });
    if (!next.expression) throw Error("请输入 f(x,y) 表达式。");
    if (next.expression.length > 240)
      throw Error("函数表达式最多 240 个字符。");
    return next;
  }
  function apply() {
    stop();
    try {
      const next = readConfig(),
        fresh = M.initial(next);
      if (!mc) {
        const g = F.gradient(fresh.fn, fresh.p);
        if (!g.every(Number.isFinite))
          throw Error("起点没有有限梯度，请调整起点。");
      }
      if (
        reference &&
        !window.OptimizationComparison.sameConditions(
          reference.config,
          next,
          mc,
        )
      ) {
        reference = null;
        fresh.message = "共同函数、域、起点或种子改变，原基准已清除。";
      }
      config = next;
      state = fresh;
      state.message = state.message || "条件已应用，旧轮已清空。";
      syncInputs();
      render();
    } catch (e) {
      draft = true;
      $("input-error").textContent = e.message;
      state.message = "输入尚未应用，图中仍显示上一组条件。";
      render();
    }
  }
  function resetRun(message) {
    stop();
    state = M.initial(config);
    state.message = message || "保留全部已应用条件，回到相同起点。";
    draft = false;
    render();
  }
  function step() {
    if (draft || M.terminal(state) || running) return;
    M.advance(state, config);
    $("calculation-panel").open = true;
    state.message = "";
    render();
  }
  function tick(time) {
    if (!running) return;
    if (batchRemaining > 0) {
      const oldStep = state.step;
      for (
        let k = 0;
        k < 3 && state.step === oldStep && !M.terminal(state);
        k++
      )
        M.advance(state, config);
      if (state.step > oldStep) batchRemaining--;
      state.message = "连续观察：还剩 " + batchRemaining + " 次。";
      if (M.terminal(state) || batchRemaining === 0) {
        stop();
        state.message = "连续观察已暂停；可单步核对最近一次计算。";
      }
      render();
    } else if (time - lastTime >= Number($("speed").value)) {
      lastTime = time;
      M.advance(state, config);
      state.message = "";
      if (M.terminal(state)) stop();
      render();
    }
    if (running) raf = requestAnimationFrame(tick);
  }
  function runBatch() {
    if (running || draft || M.terminal(state)) return;
    batchRemaining = 20;
    running = true;
    render();
    raf = requestAnimationFrame(tick);
  }
  function freezeReference() {
    if (draft || !state.step) return;
    stop();
    reference = window.OptimizationComparison.snapshot(state, config);
    resetRun("已冻结基准 A；当前 B 从同一组起点条件重新开始。");
  }
  function showComparison() {
    const box = $("comparison-summary");
    box.replaceChildren();
    $("freeze").disabled = draft || !state.step;
    $("clear-reference").disabled = !reference;
    $("restore-reference").disabled = !reference;
    if (!reference) {
      box.append(
        el("strong", "", "还没有基准 A"),
        el(
          "span",
          "hint",
          "先完成一轮，再冻结。改变一个参数后运行 B，比路径与收敛曲线。",
        ),
      );
      return;
    }
    const common = reference.history.find((h) => h.step === state.step);
    box.append(
      el(
        "strong",
        "",
        common && state.step > 0
          ? mc
            ? `同为 ${state.step} 次：历史最好 A=${fmt(common.best)}，B=${fmt(state.best.value)}；B−A=${fmt(state.best.value - common.best)}`
            : `同为 ${state.step} 次：A f=${fmt(common.value)}，B f=${fmt(state.value)}；B−A=${fmt(state.value - common.value)}`
          : `A 已冻结 ${reference.step} 次 · f=${fmt(reference.value)}；B ${state.step} 次 · f=${fmt(state.value)}`,
      ),
    );
    const diff = window.OptimizationComparison.differences(
      reference.config,
      config,
      M.algorithms,
    );
    box.append(
      el(
        "span",
        "hint",
        diff.length
          ? "变化条件：" +
              diff
                .map((d) => `${d.label} ${d.before} → ${d.after}`)
                .join("；") +
              "。" +
              (diff.length > 1 ? "本轮改变了多个因素。" : "其余条件保持一致。")
          : "全部条件相同；B 用于验证可复现性。",
      ),
    );
    if (reference.terminal)
      box.append(
        el(
          "span",
          "reference-stop",
          "基准 A 的停止条件：" + reference.status + "；" + reference.reason,
        ),
      );
  }
  function start() {
    if (running || draft || M.terminal(state)) return;
    running = true;
    state.message = "";
    lastTime = -Infinity;
    render();
    raf = requestAnimationFrame(tick);
  }
  function gdMath(q) {
    const wrap = $("math");
    wrap.replaceChildren();
    if (!q) {
      const p = el(
        "div",
        "empty-process",
        "第 1 阶段先计算当前位置的双向坡度；第 2 阶段才计算位移；第 3 阶段提交参数。",
      );
      wrap.append(p);
      return;
    }
    if (q.stationary || (q.invalid && !q.details)) {
      wrap.append(
        node(
          "当前位置",
          `p=(${fmt(state.p[0])}, ${fmt(state.p[1])})`,
          `f=${fmt(state.value)}`,
        ),
        node(
          q.stationary ? "坡度停止条件" : "计算失败",
          q.stationary ? "‖g‖ < 0.00001" : q.reason,
          q.stationary ? fmt(q.norm) : "没有提交更新",
        ),
      );
      return;
    }
    if (state.phase === 1) {
      const h = Math.max(
        1e-7,
        Math.min(1e-4, (config.max - config.min) / 1000),
      );
      q.g.forEach((g, i) => {
        const name = i ? "y" : "x",
          left = q.from.slice(),
          right = q.from.slice();
        left[i] = Math.max(config.min, left[i] - h);
        right[i] = Math.min(config.max, right[i] + h);
        const fl = F.evaluate(state.fn, left),
          fr = F.evaluate(state.fn, right),
          width = right[i] - left[i],
          difference = fr - fl,
          approx = difference / width,
          show = (n) =>
            Number.isFinite(n)
              ? Number(n.toPrecision(9)).toString()
              : "无法核对";
        const row = el("div", "math-row");
        row.append(
          el("div", "coordinate", name),
          node(
            "① 只改一个方向",
            `${name}− = ${show(left[i])}，${name}+ = ${show(right[i])}；其余坐标保持`,
            `${name} 的微小间隔 ${show(width)}`,
          ),
          node(
            "① 分别代入同一函数",
            `f− = ${show(fl)}\nf+ = ${show(fr)}`,
            `函数值差 ${show(difference)}`,
          ),
          node(
            "① 数值变化率（核对）",
            `(f+ − f−) / (${name}+ − ${name}−)\n= ${show(difference)} / ${show(width)}`,
            show(approx),
          ),
          node(
            "① 算法使用的坡度",
            `自动微分逐运算求导；数值差分仅作直观核对`,
            fmt(g),
          ),
        );
        row
          .querySelectorAll(".equation")
          .forEach((n) => (n.style.whiteSpace = "pre-line"));
        wrap.append(row);
      });
      return;
    }
    q.details.forEach((d, i) => {
      const name = i ? "y" : "x",
        row = el("div", "math-row");
      row.append(el("div", "coordinate", name));
      row.append(
        node(
          "① 当前局部坡度",
          `∂f/∂${name}，位置 (${q.from.map(fmt).join(", ")})`,
          fmt(d.g),
        ),
      );
      let equation, result;
      if (config.algorithm === "gd") {
        equation = `方向分量 = g${i ? "ᵧ" : "ₓ"}（无记忆）`;
        result = fmt(d.effective);
      } else if (config.algorithm === "momentum") {
        equation = `v′ = ${fmt(config.beta)} × ${fmt(d.oldVelocity)} + ${fmt(d.g)}`;
        result = fmt(d.memory);
      } else if (config.algorithm === "rmsprop") {
        equation = `s′ = 0.9 × ${fmt(d.oldV)} + 0.1 × ${fmt(d.g)}² = ${fmt(d.memory)}\ng / (√s′ + ε) = ${fmt(d.g)} / ${fmt(d.denominator)}`;
        result = fmt(d.effective);
      } else {
        const t = state.pending ? state.step + 1 : state.step;
        equation = `m′ = 0.9×${fmt(d.oldM)} + 0.1×${fmt(d.g)} = ${fmt(d.newM)}\ns′ = 0.999×${fmt(d.oldV)} + 0.001×${fmt(d.g)}² = ${fmt(d.newV)}\nm̂ = m′/(1−0.9^${t}) = ${fmt(d.correctedM)}\nŝ = s′/(1−0.999^${t}) = ${fmt(d.correctedV)}\nm̂/(√ŝ+ε)`;
        result = fmt(d.effective);
      }
      const memory = node(
        "② " + (config.algorithm === "gd" ? "方向" : "更新优化器记忆"),
        equation,
        result,
        state.phase === 1,
      );
      memory.querySelector(".equation").style.whiteSpace = "pre-line";
      row.append(
        memory,
        node(
          "② 学习率乘法 → 位移",
          `Δ${name} = − ${fmt(config.rate)} × ${fmt(d.effective)}`,
          fmt(q.d[i]),
          state.phase === 1,
        ),
        node(
          state.phase === 3 ? "③ 已提交位置" : "② 候选位置（尚未提交）",
          `${name}′ = ${fmt(q.from[i])} + (${fmt(q.d[i])})`,
          fmt(q.p[i]),
          state.phase === 1,
          state.phase === 3 && !state.terminal,
        ),
      );
      wrap.append(row);
    });
  }
  function mcMath(q) {
    const wrap = $("math");
    wrap.replaceChildren();
    if (!q) {
      wrap.append(
        el(
          "div",
          "empty-process",
          "第 1 阶段生成候选；第 2 阶段计算差值与概率；第 3 阶段与随机数比较后接受 / 拒绝。",
        ),
      );
      return;
    }
    if (state.phase === 1) {
      [0, 1].forEach((i) => {
        const name = i ? "y" : "x",
          row = el("div", "math-row"),
          local = config.algorithm !== "uniform";
        row.append(
          el("div", "coordinate", name),
          node(
            "① 种子随机流 [0,1]",
            `第 ${state.step * 3 + i + 1} 个数 r${i + 1}`,
            fmt(q.r[i]),
          ),
          node(
            "① " + (local ? "映射为邻域位移" : "映射到搜索域"),
            local
              ? `δ${name} = ${fmt(config.sigma)} × (2 × ${fmt(q.r[i])} − 1)`
              : `${name}′ = ${fmt(config.min)} + ${fmt(config.max - config.min)} × ${fmt(q.r[i])}`,
            fmt(local ? q.d[i] : q.p[i]),
          ),
          node(
            "① " + (local ? "加到当前位置" : "独立候选坐标"),
            local
              ? `${name}′ = ${fmt(q.from[i])} + (${fmt(q.d[i])})`
              : "全域抽样不以当前点为中心",
            fmt(q.p[i]),
          ),
          node(
            "② 计算候选函数值",
            "下一阶段将比较 f(候选) 与 f(当前)",
            undefined,
            true,
          ),
        );
        wrap.append(row);
      });
      return;
    }
    const compare = el("div", "compare-flow");
    compare.append(
      node(
        "② 两个真实函数值",
        `f(当前) = ${fmt(q.fromValue)}\nf(候选) = ${fmt(q.value)}`,
        q.outside ? "候选域外" : q.invalid ? "函数值无效" : "",
      ),
      node(
        "② 减法 → 高低差",
        `Δf = ${fmt(q.value)} − (${fmt(q.fromValue)})`,
        fmt(q.delta),
      ),
      node(
        "② 接受概率",
        q.outside || q.invalid
          ? "域外 / 无效候选：p = 0"
          : q.delta <= 0
            ? "Δf ≤ 0：p = 1"
            : config.algorithm === "anneal" && q.temperature > 0
              ? `T = ${fmt(config.temp)} × ${fmt(config.cooling)}^${state.pending ? state.step : state.step - 1} = ${fmt(q.temperature)}\np = exp(−${fmt(q.delta)} / ${fmt(q.temperature)})`
              : "更差候选且不退火 / T=0：p = 0",
        String(q.probability),
      ),
    );
    compare
      .querySelectorAll(".equation")
      .forEach((n) => (n.style.whiteSpace = "pre-line"));
    wrap.append(compare);
    const prob = el("div", "probability"),
      labels = el("div", "probability-labels");
    labels.append(
      el("span", "", "0 · 接受区 [0,p)"),
      el("span", "", "1 · 拒绝区 [p,1)"),
    );
    const track = el("div", "prob-track"),
      accepted = el("div", "prob-accepted");
    accepted.style.width = q.probability * 100 + "%";
    const mark = el("div", "prob-u");
    mark.style.left = q.u * 100 + "%";
    const pLabel = el(
      "span",
      "prob-p",
      "p=" + Number(q.probability.toPrecision(8)),
    );
    pLabel.style.left = Math.max(8, Math.min(92, q.probability * 100)) + "%";
    track.append(accepted, mark, pLabel);
    prob.append(
      labels,
      track,
      el(
        "p",
        "prob-rule",
        `第三个随机数 u = ${String(q.u)}；接受规则 u < p。${state.phase === 3 ? (q.accept ? "已接受候选。" : "已拒绝候选，当前点不动。") : "在提交前，先预测标记落在哪个区间。"}`,
      ),
    );
    wrap.append(prob);
  }
  function renderFormula() {
    const formulas = {
      gd: ["p_{k+1}=p_k-\\alpha\\,g_k", "GD：当前位置减去学习率乘坡度。"],
      momentum: [
        "v_{k+1}=\\beta v_k+g_k,\\quad p_{k+1}=p_k-\\alpha v_{k+1}",
        "动量：先保留旧方向，再加入本次坡度。",
      ],
      rmsprop: [
        "s_{k+1}=0.9s_k+0.1g_k^2,\\quad \\Delta p=-\\frac{\\alpha g_k}{\\sqrt{s_{k+1}}+10^{-8}}",
        "RMSProp：每个分量分别累计坡度平方，再缩放位移。",
      ],
      adam: [
        "\\hat m_k=\\frac{m_k}{1-0.9^k},\\quad \\hat s_k=\\frac{s_k}{1-0.999^k},\\quad \\Delta p=-\\frac{\\alpha\\hat m_k}{\\sqrt{\\hat s_k}+10^{-8}}",
        "Adam：两种记忆先进行偏差修正，再算各分量的位移。",
      ],
      uniform: [
        "x'=a+(b-a)r_1,\\quad y'=a+(b-a)r_2",
        "全域搜索：两方向独立均匀取点，只保留更低值。",
      ],
      greedy: [
        "\\Delta p=\\sigma(2r-1),\\quad P(\\mathrm{accept})=\\mathbf 1[\\Delta f\\leq 0]",
        "局部爬山：在方形邻域内提议，只接受不更差候选。",
      ],
      anneal: [
        "P(\\mathrm{accept})=\\min(1,e^{-\\Delta f/T}),\\quad T_k=T_0c^k",
        "模拟退火：域内有效候选在正温度使用该式；T=0、域外与无效值有明确分支。",
      ],
    };
    const chosen = formulas[config.algorithm];
    $("algorithm-formula-plain").textContent = chosen[1];
    if (window.katex)
      katex.render(chosen[0].replace(/\\\\/g, "\\"), $("algorithm-formula"), {
        trust: false,
        throwOnError: false,
        strict: "ignore",
      });
    else $("algorithm-formula").textContent = chosen[0];
  }
  function render() {
    const q = state.pending || state.last;
    const status = draft ? "待应用输入" : running ? "运行中" : state.status;
    $("status").textContent =
      `${status} · ${state.step}/${config.limit} 次${state.message ? " · " + state.message : ""}`;
    $("status").classList.toggle(
      "error",
      draft || /无法|域外/.test(state.status),
    );
    $("start").disabled = running || draft || M.terminal(state);
    $("pause").disabled = !running;
    $("step").disabled = running || draft || M.terminal(state);
    $("math-step").disabled = $("step").disabled;
    $("step").textContent =
      state.phase === 0 || state.phase === 3
        ? "下一阶段：" + (mc ? "生成候选" : "计算坡度")
        : state.phase === 1
          ? "下一阶段：" + (mc ? "比较与概率" : "计算候选")
          : "下一阶段：" + (mc ? "接受 / 拒绝" : "提交参数");
    const alg = M.algorithms[config.algorithm],
      copy = $("algorithm-copy");
    copy.replaceChildren(el("p", "", alg.action));
    $("algorithm-help").replaceChildren(
      el("p", "hint", alg.use),
      el("p", "hint", alg.limit),
    );
    $("function-note").textContent = draft
      ? "函数 / 初始条件草稿未应用，当前绘图仍基于下方所注明的已应用函数。"
      : F.presets[config.fn]
        ? F.presets[config.fn].hint
        : "自定义函数已实际用于绘图与优化；选择域内网格检查通过，不保证每一点连续 / 可导。";
    if (mc) {
      $("sigma").disabled = config.algorithm === "uniform";
      $("sigma-range").disabled = config.algorithm === "uniform";
      $("temp").disabled = config.algorithm !== "anneal";
      $("cooling").disabled = config.algorithm !== "anneal";
    } else $("beta").disabled = config.algorithm !== "momentum";
    let gradient;
    try {
      if (!mc) gradient = F.gradient(state.fn, state.p);
    } catch (e) {
      gradient = null;
    }
    const metrics = mc
      ? [
          fmt(state.value),
          fmt(state.best.value),
          String(state.step),
          config.algorithm === "anneal"
            ? fmt(config.temp * config.cooling ** state.step)
            : "不使用",
        ]
      : [
          fmt(state.value),
          gradient ? fmt(Math.hypot(...gradient)) : "不可导",
          String(state.step),
          q && q.d ? fmt(Math.hypot(...q.d)) : "待计算",
        ];
    metrics.forEach((v, i) => ($("metric-" + i).textContent = v));
    const d = V.surface($("surface"), state, config, angle, reference);
    planeBox = V.plane(
      $("plane"),
      state,
      config,
      reference,
      !mc && $("gradient-field").checked,
    );
    V.history($("history"), state, mc, reference);
    showComparison();
    $("failure-note").hidden = !M.terminal(state);
    $("failure-note").textContent = M.terminal(state)
      ? state.status + "：" + state.reason
      : "";
    $("failure-note").classList.toggle("error", /无法|域外/.test(state.status));
    $("batch").disabled = running || draft || M.terminal(state);
    document.querySelector(".scale").style.background =
      d.min < 0 && d.max > 0
        ? "linear-gradient(90deg, " +
          V.color(d.min, d) +
          ", " +
          V.color(0, d) +
          " " +
          (-d.min / (d.max - d.min)) * 100 +
          "%, " +
          V.color(d.max, d) +
          ")"
        : "linear-gradient(90deg, " +
          V.color(d.min, d) +
          ", " +
          V.color(d.max, d) +
          ")";
    $("scale-label").textContent = `f: ${fmt(d.min)} → ${fmt(d.max)}`;
    $("surface-note").textContent =
      `已应用 f(x,y) = ${config.expression} · 域 [${fmt(config.min)},${fmt(config.max)}]² · ${d.constant ? "常数函数，地形为平面。" : d.min < 0 && d.max > 0 ? "发散色阶：负值青色 / 0 白色 / 正值紫色。" : "线性色阶：浅色低 / 深色高。"}${!mc && q && q.g ? " 坡度箭头统一缩放，仅示方向与分量比例；实际位移见下方。" : ""}`;
    for (let i = 0; i < 3; i++)
      $("phase-" + i).classList.toggle("active", state.phase === i + 1);
    let text =
      state.phase === 0
        ? "尚未计算这一次；先预测，再点击下一阶段。"
        : mc
          ? state.phase === 1
            ? "使用固定种子的三个随机数；前两个决定候选，第三个留给接受检验。当前点尚未移动。"
            : state.phase === 2
              ? "先比较候选高低，计算概率，再看随机数 u 所在位置。当前点仍未移动。"
              : q.accept
                ? "接受：当前点移动，历史最好仅在更低时更新。"
                : "拒绝：当前点保留，但一次提议计入预算。"
          : state.phase === 1
            ? "把一个坐标微调、另一个固定，用函数值差核对局部变化率；实际优化使用自动微分坡度。"
            : state.phase === 2
              ? "先更新暂存记忆，再乘学习率算位移；黑色 × 是候选，旧点尚未移动。"
              : "参数与记忆已一起提交，轨迹和曲线增加一个真实计算点。";
    if (state.terminal) text = state.reason;
    $("process-text").textContent = text;
    mc ? mcMath(q) : gdMath(q);
    renderFormula();
    let decision = "";
    if (q) {
      if (mc && state.phase > 1)
        decision =
          q.reason ||
          `Δf ${q.delta <= 0 ? "≤" : ">"} 0；u ${q.accept ? "<" : "≥"} p → ${state.phase === 2 ? "将" : ""}${q.accept ? "接受" : "拒绝"}。${state.phase === 3 ? "历史最好 f=" + fmt(state.best.value) + "（不会因接受上升点而变差）。" : ""}`;
      else if (!mc && state.phase > 1)
        decision =
          q.reason || q.stationary
            ? q.reason || "局部坡度达到停止阈值；没有提交。"
            : `f(${q.from.map(fmt).join(", ")}) = ${fmt(q.fromValue)} → f(${q.p.map(fmt).join(", ")}) = ${fmt(q.value)}；变化 ${fmt(q.value - q.fromValue)}。${state.phase === 2 ? "候选尚未提交。" : "已提交。"}`;
    }
    $("decision").textContent = decision;
    $("decision").hidden = !decision;
    $("observation").textContent = mc
      ? `当前位置 (${state.p.map(fmt).join(", ")})，f=${fmt(state.value)}；历史最好位于 (${state.best.p.map(fmt).join(", ")})，f=${fmt(state.best.value)}。已接受 ${state.accepted}/${state.step} 个候选。`
      : `当前位置 (${state.p.map(fmt).join(", ")})，f=${fmt(state.value)}；坡度来自当前点，运算面板记录本次或最近一次更新。${state.phase === 3 && state.terminal ? " " + state.reason : ""}`;
    const ledger = $("ledger");
    ledger.replaceChildren();
    state.history.slice(-12).forEach((h) => {
      const tr = el("tr");
      [h.step, ...h.p, h.value, ...(mc ? [h.best] : [])].forEach((v) =>
        tr.append(el("td", "", fmt(v))),
      );
      ledger.append(tr);
    });
  }
  $("expression").addEventListener("input", () => {
    $("fn").value = "custom";
    markDraft();
  });
  ["min", "max", "x", "y"].forEach((id) => {
    $(id).addEventListener("input", markDraft);
  });
  ["min", "max", "x", "y"].forEach((id) =>
    $(id).addEventListener("change", apply),
  );
  numeric
    .filter((id) => !["min", "max", "x", "y"].includes(id))
    .forEach((id) => {
      $(id).addEventListener("input", markDraft);
      $(id).addEventListener("change", apply);
    });
  $("algorithm").addEventListener("change", apply);
  $("fn").addEventListener("change", () => {
    stop();
    const example = F.presets[$("fn").value];
    if (example) {
      $("expression").value = example.source;
      apply();
    } else markDraft();
  });
  $("apply-function").addEventListener("click", apply);
  $("expression").addEventListener("keydown", (e) => {
    if (e.key === "Enter") apply();
  });
  const sliding = mc ? "sigma" : "rate";
  $(sliding + "-range").addEventListener("input", (e) => {
    $(sliding).value = e.target.value;
    apply();
  });
  $("start").addEventListener("click", start);
  $("batch").addEventListener("click", runBatch);
  $("freeze").addEventListener("click", freezeReference);
  $("clear-reference").addEventListener("click", () => {
    reference = null;
    render();
  });
  $("restore-reference").addEventListener("click", () => {
    if (reference) {
      config = { ...reference.config };
      syncInputs();
      resetRun("已恢复基准 A 条件；A 轨迹仍保留。");
    }
  });
  $("pause").addEventListener("click", () => {
    stop();
    if (!M.terminal(state)) state.status = "已暂停";
    render();
  });
  $("step").addEventListener("click", step);
  $("math-step").addEventListener("click", step);
  if (!mc) $("gradient-field").addEventListener("change", render);
  $("restart").addEventListener("click", () => {
    syncInputs();
    resetRun();
  });
  $("reset").addEventListener("click", () => {
    config = { ...M.defaults };
    reference = null;
    if (!mc) $("gradient-field").checked = false;
    angle = 35;
    $("speed").value = "600";
    syncInputs();
    $("preset-note").textContent = "";
    resetRun("已恢复全部默认条件。");
  });
  if (mc)
    $("new-seed").addEventListener("click", () => {
      config.seed = (config.seed + 1) >>> 0;
      reference = null;
      syncInputs();
      resetRun("随机种子已改为 " + config.seed + "。");
    });
  document.querySelectorAll("[data-preset]").forEach((btn) =>
    btn.addEventListener("click", () => {
      stop();
      const i = Number(btn.dataset.preset);
      if (i === 0) config = { ...M.defaults };
      else if (mc)
        config = {
          ...config,
          ...(i === 1
            ? { algorithm: "anneal", temp: 0 }
            : { algorithm: "greedy" }),
        };
      else config = { ...config, rate: i === 1 ? 0.015 : 1.2 };
      if (
        reference &&
        !window.OptimizationComparison.sameConditions(
          reference.config,
          config,
          mc,
        )
      )
        reference = null;
      syncInputs();
      $("preset-note").textContent =
        i === 0
          ? "恢复默认实验的全部条件。"
          : mc
            ? i === 1
              ? "仅改为模拟退火、初温 0；保留当前函数、域、起点、种子及其余参数。"
              : "仅改算法为局部随机爬山；保留函数、域、起点、种子及其余参数。"
            : `仅改学习率为 ${config.rate}；保留函数、算法、域、起点与其余参数。`;
      resetRun("对照条件已应用。");
    }),
  );
  $("angle").addEventListener("input", (e) => {
    angle = Number(e.target.value);
    render();
  });
  let drag = null;
  $("surface").addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, angle };
    $("surface").setPointerCapture(e.pointerId);
  });
  $("surface").addEventListener("pointermove", (e) => {
    if (!drag) return;
    angle =
      ((((drag.angle + (e.clientX - drag.x) * 0.5 + 180) % 360) + 360) % 360) -
      180;
    $("angle").value = angle;
    render();
  });
  $("surface").addEventListener("pointerup", () => (drag = null));
  $("surface").addEventListener("pointercancel", () => (drag = null));
  $("plane").addEventListener("click", (e) => {
    if (!planeBox || draft) return;
    const r = e.target.getBoundingClientRect(),
      x = e.clientX - r.left,
      y = e.clientY - r.top,
      b = planeBox;
    if (x < b.x || y < b.y || x > b.x + b.size || y > b.y + b.size) return;
    stop();
    const px = Math.max(
        config.min,
        Math.min(
          config.max,
          Number(
            (
              config.min +
              ((config.max - config.min) * (x - b.x)) / b.size
            ).toFixed(5),
          ),
        ),
      ),
      py = Math.max(
        config.min,
        Math.min(
          config.max,
          Number(
            (
              config.max -
              ((config.max - config.min) * (y - b.y)) / b.size
            ).toFixed(5),
          ),
        ),
      );
    if (!Number.isFinite(F.evaluate(state.fn, [px, py]))) {
      state.message = "所选起点的函数值无效，请选择其它位置。";
      if (!M.terminal(state)) state.status = "已暂停";
      render();
      return;
    }
    reference = null;
    config.x = px;
    config.y = py;
    syncInputs();
    resetRun("新起点已应用，旧轨迹已清空。");
  });
  window.addEventListener("resize", () => requestAnimationFrame(render));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) {
      stop();
      state.status = "已暂停";
      state.message = "页面隐藏，演示已暂停。";
      render();
    }
  });
  syncInputs();
  render();
  window.OptimizationApp = {
    getState: () => state,
    getConfig: () => ({ ...config }),
    getReference: () => reference,
    apply,
  };
})();
