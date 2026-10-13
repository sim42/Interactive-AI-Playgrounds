(function (root) {
  "use strict";
  const L = root.MachineLearningLab;
  let config = { ...L.DEFAULTS },
    state = L.createState(config),
    timer = null,
    generation = 0,
    resizeFrame = null,
    selected = 1,
    draft = false;
  const $ = (id) => document.getElementById(id);
  function feedback(message, error) {
    $("control-feedback").textContent = message;
    $("control-feedback").className = "feedback" + (error ? " error" : "");
  }
  function stop() {
    generation++;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (state.status === "running")
      state.status = state.done ? "done" : "paused";
  }
  function syncInputs() {
    for (const [id, key] of [
      ["algorithm", "algorithm"],
      ["dataset", "dataset"],
      ["eta", "eta"],
      ["eta-range", "eta"],
      ["lambda", "lambda"],
      ["k", "k"],
      ["k-range", "k"],
      ["clusters", "clusters"],
      ["clusters-range", "clusters"],
      ["seed", "seed"],
      ["query-x", "queryX"],
      ["query-y", "queryY"],
      ["interval", "interval"],
    ]) {
      $(id).value = config[key];
      $(id).removeAttribute("aria-invalid");
    }
  }
  function render() {
    state.inspected = selected;
    L.render(state);
    $("play").textContent =
      state.status === "running" ? "暂停计算" : "播放计算";
    $("play").disabled = state.done || draft;
    $("step").disabled = state.done || draft;
    $("round").disabled = state.done || draft;
    $("round").textContent =
      config.algorithm === "knn" ? "完成本次推理" : "计算到本轮末尾";
    syncEditor();
    renderStages();
    renderEquation();
  }
  function restart(message) {
    stop();
    draft = false;
    config = L.validateConfig(config);
    state = L.createState(config);
    syncInputs();
    render();
    feedback(message || "已清空本轮进度，保留当前参数、数据种子和查询点。");
  }
  function tick(token) {
    if (token !== generation || state.status !== "running") return;
    L.step(state);
    if (!state.done) state.status = "running";
    render();
    if (!state.done) timer = setTimeout(() => tick(token), config.interval);
    else {
      timer = null;
      feedback(
        state.error
          ? "已停止：" + state.error + "。请减小学习率后重新开始。"
          : "已达到停止条件。可重新开始或改变条件再验证。",
        !!state.error,
      );
    }
  }
  $("play").addEventListener("click", () => {
    if (state.status === "running") {
      stop();
      render();
      feedback("已暂停，保留本轮状态；单步可继续计算。");
      return;
    }
    if (state.done) return;
    state.status = "running";
    generation++;
    const token = generation;
    render();
    tick(token);
  });
  $("step").addEventListener("click", () => {
    stop();
    L.step(state);
    render();
    feedback(state.done ? "已达到停止条件。" : "已推进一个实际计算动作。");
  });
  $("round").addEventListener("click", () => {
    stop();
    L.advanceRound(state);
    render();
    feedback("已按相同步长计算到本轮末尾；可用重新开始逐步检查。");
  });
  $("restart").addEventListener("click", () => restart());
  $("reset").addEventListener("click", () => {
    config = { ...L.DEFAULTS };
    selected = 1;
    restart("已恢复默认算法、参数、数据、种子与查询点。");
  });
  $("new-data").addEventListener("click", () => {
    config.seed = config.seed >= 999999 ? 1 : config.seed + 1;
    config.edits = [];
    restart("数据种子已改为 " + config.seed + "，受数据影响的进度已清空。");
  });
  function numericControl(id, key, partner) {
    $(id).addEventListener("change", () => {
      stop();
      render();
      const input = $(id),
        raw = input.value.trim(),
        value = Number(raw),
        next = { ...config, [key]: value };
      try {
        if (!raw) throw Error("输入不能为空。");
        L.validateConfig(next);
        config = key === 'seed' ? {...next, edits:[]} : next;
        if (key === "interval") {
          state.config.interval = value;
          syncInputs();
          feedback("播放速度已更新，算法状态与步长保持不变。");
        } else
          restart(
            "已修改 " +
              ({
                eta: "学习率",
                lambda: "正则系数",
                k: "邻居数",
                clusters: "簇数",
                seed: "种子",
                queryX: "查询 x₁",
                queryY: "查询 x₂",
              }[key] || key) +
              "，原结果失效，本轮已重新开始。",
          );
      } catch (e) {
        feedback(
          e.message + " 请在允许范围内重新输入；当前实验参数未改变。",
          true,
        );
        input.setAttribute("aria-invalid", "true");
        return;
      }
      input.removeAttribute("aria-invalid");
      if (partner) $(partner).value = config[key];
    });
  }
  for (const [id, key, partner] of [
    ["eta", "eta", "eta-range"],
    ["eta-range", "eta", "eta"],
    ["lambda", "lambda"],
    ["k", "k", "k-range"],
    ["k-range", "k", "k"],
    ["clusters", "clusters", "clusters-range"],
    ["clusters-range", "clusters", "clusters"],
    ["seed", "seed"],
    ["query-x", "queryX"],
    ["query-y", "queryY"],
    ["interval", "interval"],
  ])
    numericControl(id, key, partner);
  for (const key of ["algorithm", "dataset"])
    $(key).addEventListener("change", () => {
      config[key] = $(key).value;
      if (key === 'dataset') config.edits = [];
      restart(
        key === "algorithm"
          ? "已切换算法，保留数据、种子和其他参数；计算进度已清空。"
          : "已切换合成数据机制，保留种子和算法参数；计算进度已清空。",
      );
    });
  $("plot").addEventListener("click", (event) => {
    if (config.algorithm !== "knn") return;
    const q = L.plotToPoint(event);
    if (!q) return;
    config.queryX = q.x;
    config.queryY = q.y;
    restart("查询点已改为 (" + q.x + ", " + q.y + ")，距离与投票已清空。");
  });
  function syncEditor() {
    const chooser=$('sample-id');
    if (!chooser.options.length) {
      state.data.train.forEach(p=>{const option=document.createElement('option');option.value=p.id;option.textContent='#'+p.id;chooser.append(option);});
    }
    chooser.value=selected;
    if(!draft) {
      const p=state.data.train.find(p=>p.id===selected);
      $('sample-x').value=L.fmt(p.x,3);$('sample-y').value=L.fmt(p.y,3);$('sample-label').value=p.label;
    }
    $('sample-label').disabled=config.algorithm==='kmeans';
    $('edit-count').textContent=(config.edits?.length||0)+'个训练点已编辑 · 验证点保持原样';
  }
  function renderStages() {
    const mode=config.algorithm, phases=mode==='svm'?['取样本','得分与间隔','次梯度','更新参数']:mode==='knn'?['算距离','取最近k点','逐票计数','得到预测']:['分配到最近中心','更新坐标均值','检查一轮'];
    const index=mode==='svm'?Math.max(0,['sample','margin','gradient','update'].indexOf(state.stage)):mode==='knn'?Math.max(0,['distance','rank','vote','result'].indexOf(state.stage)):Math.max(0,['assign','centers','round'].indexOf(state.stage));
    $('phase-track').replaceChildren(...phases.map((name,i)=>{const li=document.createElement('li');li.textContent=(i+1)+' · '+name;li.className=i===index?'current':'';if(i===index)li.setAttribute('aria-current','step');return li;}));
  }
  function renderEquation() {
    let tex=config.algorithm==='svm'?'f(x)=w_1x_1+w_2x_2+b':config.algorithm==='knn'?'d(x,q)=\\sqrt{(x_1-q_1)^2+(x_2-q_2)^2}':'\\mu_j=\\frac{1}{n_j}\\sum_{i\\in C_j}x_i';
    if(config.algorithm==='svm'&&state.grad)tex='\\ell=\\max(0,1-yf(x))=\\max(0,1-('+L.fmt(state.grad.margin)+'))='+L.fmt(state.grad.hinge);
    if(config.algorithm==='knn'&&state.current>=0&&state.distances.length){const p=state.data.train[state.current],d=state.distances.find(v=>v.index===state.current);if(d)tex='d_{'+p.id+'}=\\sqrt{('+L.fmt(p.x-state.query.x)+')^2+('+L.fmt(p.y-state.query.y)+')^2}='+L.fmt(d.d);}
    root.katex.render(tex,$('step-equation'),{throwOnError:false,trust:false,displayMode:true});
  }
  function beginDraft() {
    stop();draft=true;
    $('play').textContent='播放计算';
    for(const id of ['play','step','round'])$(id).disabled=true;
    feedback('编辑草稿尚未应用。应用后从当前条件重新计算，或撤销草稿继续旧实验。');
  }
  function selectSample(id) {
    stop();draft=false;selected=id;$('sample-editor').open=true;render();
    feedback('已选择训练点 #'+id+'。选择只用于检查；拖动或应用表单才改变数据。');
  }
  function applySample(changes) {
    try {
      const next=L.editSample(config,selected,changes);
      config=next;
      restart('训练点 #'+selected+' 已修改；旧循环已停止，所有受数据影响的参数和计算已重新开始，验证点不变。');
    } catch(e) { feedback(e.message+' 请修正或撤销草稿。',true); }
  }
  $('sample-id').addEventListener('change',()=>selectSample(Number($('sample-id').value)));
  for(const id of ['sample-x','sample-y','sample-label'])$(id).addEventListener('input',beginDraft);
  $('apply-sample').addEventListener('click',()=>{
    if(!$('sample-x').value.trim()||!$('sample-y').value.trim()){feedback('训练点坐标不能为空。请输入−2.5至2.5的数值。',true);return;}
    applySample({x:Number($('sample-x').value),y:Number($('sample-y').value),label:Number($('sample-label').value)});
  });
  $('discard-draft').addEventListener('click',()=>{draft=false;render();feedback('已撤销草稿；原数据、参数与计算进度保留。');});
  $('restore-data').addEventListener('click',()=>{config.edits=[];restart('已恢复当前种子的生成数据，其他条件保持不变。');});
  $('plot').addEventListener('sample-select',e=>selectSample(e.detail.id));
  $('plot').addEventListener('sample-drag-start',e=>{selected=e.detail.id;beginDraft();});
  $('plot').addEventListener('sample-move',e=>{selected=e.detail.id;applySample({x:e.detail.x,y:e.detail.y});});
  $('plot').addEventListener('query-drag-start',beginDraft);
  $('plot').addEventListener('query-cancel',()=>{draft=false;render();feedback('查询点位置未改变；可继续原推理。');});
  $('plot').addEventListener('query-move',e=>{config.queryX=e.detail.x;config.queryY=e.detail.y;restart('查询点已移动；只重做本次推理，不修改训练点。');});
  $('math-expand').addEventListener('click',()=>{const open=document.querySelector('.workspace').classList.toggle('math-expanded');$('math-expand').textContent=open?'恢复并排检查':'展开运算区域';$('math-expand').setAttribute('aria-expanded',String(open));render();});
  document
    .querySelector(".history")
    .addEventListener("toggle", () => L.drawHistory(state));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.status === "running") {
      stop();
      render();
      feedback("页面已隐藏，自动暂停；返回后可继续。");
    }
  });
  root.addEventListener("resize", () => {
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      render();
    });
  });
  root.addEventListener("pagehide", stop);
  Object.assign(L, {
    getState: () => state,
    getConfig: () => ({ ...config }),
    restartExperiment: restart,
  });
  syncInputs();
  render();
})(window);
