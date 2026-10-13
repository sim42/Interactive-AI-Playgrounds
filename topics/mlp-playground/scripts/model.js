(function (root) {
  'use strict';
  const NS = root.MLPLab = root.MLPLab || {};
  function rng(seed) { let t = seed >>> 0; return function () { t += 0x6D2B79F5; let x = Math.imul(t ^ t >>> 15, 1 | t); x ^= x + Math.imul(x ^ x >>> 7, 61 | x); return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
  const sigmoid = z => z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
  const softplus = z => Math.max(z, 0) + Math.log1p(Math.exp(-Math.abs(z)));
  const finite = x => Number.isFinite(x) && Math.abs(x) < 1e8;
  function makeData(kind, seed) {
    if (!['linear', 'xor', 'ring', 'moons'].includes(kind)) throw Error('未知数据集。');
    function subset(n, salt) {
      const random = rng((seed ^ salt) >>> 0), points = [];
      for (let i = 0; i < n; i++) {
        let x, y, label;
        if (kind === 'linear' || kind === 'xor') {
          x = random() * 2 - 1; y = random() * 2 - 1;
          label = kind === 'linear' ? +(x + 0.6 * y > 0) : +(x * y < 0);
        } else if (kind === 'ring') {
          label = i % 2; const a = random() * Math.PI * 2;
          const r = label ? 0.75 + random() * 0.22 : 0.08 + random() * 0.35;
          x = r * Math.cos(a); y = r * Math.sin(a);
        } else {
          label = i % 2; const a = random() * Math.PI;
          x = .65 * Math.cos(a) + (label ? .3 : -.3) + (random() - .5) * .06;
          y = (label ? .2 - .7 * Math.sin(a) : .7 * Math.sin(a) - .2) + (random() - .5) * .06;
        }
        points.push({x: [x, y], y: label, id: i});
      }
      return points;
    }
    return {train: subset(120, 0xA51F), validation: subset(60, 0xC491)};
  }
  function create(config) {
    let hidden;
    if (Array.isArray(config.shape)) hidden = config.shape.slice();
    else hidden = Array(+config.hiddenLayers).fill(+config.width);
    if (hidden.length > 3 || !hidden.every(n => Number.isInteger(n) && n >= 2 && n <= 6)) throw Error('网络结构超出范围。');
    if (!['tanh', 'relu'].includes(config.activation)) throw Error('未知激活函数。');
    const sizes = [2].concat(hidden, [1]);
    const random = rng((config.seed ^ 0xB41C7D) >>> 0);
    const weights = [], biases = [];
    for (let l = 1; l < sizes.length; l++) {
      const scale = Math.sqrt(6 / (sizes[l - 1] + sizes[l]));
      weights.push(Array.from({length: sizes[l]}, () => Array.from({length: sizes[l - 1]}, () => (random() * 2 - 1) * scale)));
      biases.push(Array(sizes[l]).fill(0));
    }
    return {sizes, weights, biases, activation: config.activation};
  }
  function clone(net) { return {sizes: net.sizes.slice(), activation: net.activation, weights: net.weights.map(a => a.map(b => b.slice())), biases: net.biases.map(a => a.slice())}; }
  function assertNet(net) {
    if (!net.weights.every(a => a.every(b => b.every(finite))) || !net.biases.every(a => a.every(finite))) throw Error('参数出现非有限值或过大数值，请降低学习率并重新开始。');
  }
  function forward(net, input) {
    if (!Array.isArray(input) || input.length !== 2 || !input.every(finite)) throw Error('请输入两个有限的读数。');
    const a = [input.slice()], z = [input.slice()], contributions = [null];
    for (let l = 1; l < net.sizes.length; l++) {
      const last = l === net.sizes.length - 1;
      const terms = net.weights[l - 1].map(row => row.map((w, i) => w * a[l - 1][i]));
      const zl = terms.map((row, j) => row.reduce((s, t) => s + t, net.biases[l - 1][j]));
      if (!zl.every(finite)) throw Error('加权和过大，已停止。请降低学习率并重新开始。');
      contributions.push(terms); z.push(zl);
      a.push(zl.map(t => last ? sigmoid(t) : net.activation === 'tanh' ? Math.tanh(t) : Math.max(0, t)));
    }
    return {a, z, contributions, p: a[a.length - 1][0]};
  }
  function loss(net, input, y) {
    if (y !== 0 && y !== 1) throw Error('标签必须是 0 或 1。');
    const f = forward(net, input), z = f.z[f.z.length - 1][0];
    return softplus(z) - y * z;
  }
  function backward(net, input, y) {
    if (y !== 0 && y !== 1) throw Error('标签必须是 0 或 1。');
    const f = forward(net, input), n = net.sizes.length, dA = Array(n), delta = Array(n), gw = Array(n - 1), gb = Array(n - 1);
    delta[n - 1] = [f.p - y];
    const outputZ = f.z[n - 1][0];
    // dL/dp is for inspection only; training uses the stable combined derivative p-y.
    const outputLogDerivative = y ? softplus(-outputZ) : softplus(outputZ);
    dA[n - 1] = [(y ? -1 : 1) * Math.exp(Math.min(700, outputLogDerivative))];
    for (let l = n - 1; l >= 1; l--) {
      gw[l - 1] = delta[l].map(d => f.a[l - 1].map(a => d * a));
      gb[l - 1] = delta[l].slice();
      dA[l - 1] = Array.from({length: net.sizes[l - 1]}, (_, i) => delta[l].reduce((s, d, j) => s + net.weights[l - 1][j][i] * d, 0));
      if (l > 1) delta[l - 1] = dA[l - 1].map((d, j) => d * (net.activation === 'tanh' ? 1 - f.a[l - 1][j] ** 2 : +(f.z[l - 1][j] > 0)));
    }
    delta[0] = dA[0].slice();
    return {forward: f, delta, dA, weights: gw, biases: gb, loss: softplus(outputZ) - y * outputZ, outputDerivativeCapped: outputLogDerivative > 700};
  }
  function updated(net, grads, learningRate) {
    if (!Number.isFinite(learningRate) || learningRate <= 0 || learningRate > 5) throw Error('学习率范围为 0.001–5。');
    const next = clone(net);
    for (let l = 0; l < next.weights.length; l++) {
      for (let j = 0; j < next.weights[l].length; j++) {
        next.biases[l][j] -= learningRate * grads.biases[l][j];
        for (let i = 0; i < next.weights[l][j].length; i++) next.weights[l][j][i] -= learningRate * grads.weights[l][j][i];
      }
    }
    assertNet(next); return next;
  }
  function metrics(net, points) {
    if (!points.length) throw Error('没有可评估的样本。');
    let sum = 0, right = 0;
    points.forEach(s => { const f = forward(net, s.x); sum += softplus(f.z[f.z.length - 1][0]) - s.y * f.z[f.z.length - 1][0]; right += +(+(f.p >= .5) === s.y); });
    return {loss: sum / points.length, accuracy: right / points.length};
  }
  function epoch(net, points, learningRate, seed, number) {
    const order = points.map((_, i) => i), random = rng((seed ^ 0x8A76 ^ Math.imul(number + 1, 7459)) >>> 0);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    let next = net;
    order.forEach(i => { const s = points[i]; next = updated(next, backward(next, s.x, s.y), learningRate); });
    return next;
  }
  function trace(net, sample, learningRate, training) {
    const before = clone(net), f = forward(before, sample.x), gradients = training ? backward(before, sample.x, sample.y) : null;
    const phases = [{type: 'input', layer: 0, node: 0, title: '读取一个样本的两个特征'}];
    for (let l = 1; l < net.sizes.length; l++) for (let j = 0; j < net.sizes[l]; j++) phases.push({type: 'forward', layer: l, node: j, title: `前向 · ${l === net.sizes.length - 1 ? '输出节点' : '隐藏节点 H' + l + '·' + (j + 1)}`});
    phases.push({type: 'loss', layer: net.sizes.length - 1, node: 0, title: '计算误差 · 交叉熵损失'});
    if (training) {
      for (let l = net.sizes.length - 1; l >= 1; l--) for (let j = 0; j < net.sizes[l]; j++) phases.push({type: 'backward', layer: l, node: j, title: `反向 · ${l === net.sizes.length - 1 ? '输出节点' : '隐藏节点 H' + l + '·' + (j + 1)}`});
      phases.push({type: 'backward-input', layer: 0, node: 0, title: '梯度抵达输入 · 只解释敏感性，不改数据'});
      for (let l = 1; l < net.sizes.length; l++) for (let j = 0; j < net.sizes[l]; j++) phases.push({type: 'update', layer: l, node: j, title: `预览更新 · ${l === net.sizes.length - 1 ? '输出节点' : 'H' + l + '·' + (j + 1)} 的输入连接与偏置`});
      phases.push({type: 'commit', layer: -1, node: 0, title: '提交所有更新 · 检查变化是否真的发生'});
    } else phases.push({type: 'prediction', layer: net.sizes.length - 1, node: 0, title: '推理结束 · 概率已算出，全部参数保持不变'});
    return {before, forward: f, gradients, sample: {x: sample.x.slice(), y: sample.y, id: sample.id}, learningRate, training, phases, index: -1, committed: false};
  }
  NS.Model = {rng, sigmoid, softplus, makeData, create, clone, assertNet, forward, loss, backward, updated, metrics, epoch, trace};
}(typeof window !== 'undefined' ? window : globalThis));
