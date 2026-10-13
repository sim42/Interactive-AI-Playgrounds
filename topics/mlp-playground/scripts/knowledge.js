/* Original local explanations; external reading opens only on a user click. */
window.PlaygroundKnowledge = {
  "title": "神经网络怎样学会分类",
  "question": "一个样本的误差，怎样变成每条连接的修改量？",
  "concepts": [
    {
      "title": "一个节点就是一段小计算",
      "text": "多层感知机（Multilayer Perceptron, MLP）的节点先做加权求和 z，再经过激活函数得到 a。节点里的小图展示它对整个输入平面的响应，连线表示参与计算的权重。",
      "try": "点击一个隐藏节点，再切换数学检查：找出它接收的输入、权重、偏置及计算结果。"
    },
    {
      "title": "前向：把输入变成概率",
      "text": "一个样本从输入层出发，逐层传递。隐藏层组合特征，输出层用 sigmoid 将最后得分变成类别 1 的概率。推理只计算输出，不改变权重。",
      "try": "在推理模式推进一轮。比较开始与结束时的权重，解释为什么它们相同。"
    },
    {
      "title": "误差：不仅看猜对或猜错",
      "text": "二元交叉熵（Binary Cross-Entropy）衡量预测概率与标签的差异。自信地猜错会有很大损失。损失是标量；梯度进一步说明每个数改变时损失怎样变。"
    },
    {
      "title": "反向：沿连接分配影响",
      "text": "从输出的误差开始，链式法则把影响传回前面的节点。反向阶段展示偏导数和拟议修改量，尚未提交更新；最后一步才一起写入新参数。",
      "try": "选择一条权重。先看 ∂L/∂w 的符号，再预测增加它会使损失怎样改变，最后查看 Δw。"
    },
    {
      "title": "宽度、深度与学习的边界",
      "text": "更多节点提供更灵活的函数，但不保证更快学会或在新数据上更好。训练点更新权重，验证点只评估；图上展示的是小模型的真实计算，不是大语言模型。",
      "try": "固定种子与数据，对照无隐藏层和带隐藏层的 XOR。不要同时改变学习率。"
    }
  ],
  "math": [
    {
      "title": "单个节点的前向传播",
      "tex": "z_j=\\sum_i w_{ji}a_i+b_j,\\qquad a_j=\\phi(z_j)",
      "text": "aᵢ 是上一层输出，w 是连接权重，b 是偏置，φ 是激活函数。所有数值都可在数学检查中逐节点核对。"
    },
    {
      "title": "从概率计算损失",
      "tex": "L=-y\\log p-(1-y)\\log(1-p)",
      "text": "这里标签 y∈{0,1}，p 是正类概率。实际计算采用数值稳定的 logits 形式，避免极端概率直接取对数的溢出。"
    },
    {
      "title": "输出层把误差变为梯度",
      "tex": "\\frac{\\partial L}{\\partial z}=p-y,\\qquad\\frac{\\partial L}{\\partial w_i}=(p-y)a_i",
      "text": "sigmoid 与二元交叉熵组合后，输出得分的梯度恰好是 p−y。对偏置的梯度也是 p−y；对权重还要乘输入。"
    },
    {
      "title": "隐藏层的链式法则",
      "tex": "\\delta_j=\\phi^\\prime(z_j)\\sum_k w_{kj}\\delta_k",
      "text": "后层的影响沿每条连接传回，再乘当前激活函数的斜率。页面展示加和的各项，让“误差向后流”对应具体数值。"
    },
    {
      "title": "梯度与真正更新的区别",
      "tex": "\\Delta w=-\\eta\\frac{\\partial L}{\\partial w},\\qquad w_{new}=w+\\Delta w",
      "text": "正梯度意味着增加权重会局部增加损失，所以沿负方向更新。Δw 是拟议变化量，不是概率意义上的期望；统一提交后网络才改变。"
    }
  ],
  "sources": [
    {
      "title": "But what is a neural network?",
      "url": "https://www.3blue1brown.com/lessons/neural-networks",
      "type": "3Blue1Brown · 动画与图文 · 英文",
      "note": "用节点、权重和激活图像建立网络直觉，适合与本页节点特征图对照。"
    },
    {
      "title": "What is backpropagation really doing?",
      "url": "https://www.3blue1brown.com/lessons/backpropagation",
      "type": "3Blue1Brown · 动画与图文 · 英文",
      "note": "理解损失如何影响不同层的权重，尤其适合配合本页逐层反向检查。"
    },
    {
      "title": "TensorFlow Playground",
      "url": "https://playground.tensorflow.org/",
      "type": "TensorFlow · 在线交互实验",
      "note": "对照网络宽度、深度和特征图；本页另加入单样本数值追踪与离线运行。"
    },
    {
      "title": "Neural Networks and Deep Learning · Chapter 2",
      "url": "http://neuralnetworksanddeeplearning.com/chap2.html",
      "type": "Michael Nielsen · 开放教材 · 英文",
      "note": "链式法则与反向传播的详细推导。作为进阶阅读，无需读完即可操作本页。"
    }
  ],
  "id": "mlp-playground"
};
