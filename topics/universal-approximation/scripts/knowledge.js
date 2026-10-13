/* Original local explanations; external reading opens only on a user click. */
window.PlaygroundKnowledge = {
  "title": "用简单形状拼出复杂函数",
  "question": "一层足够宽的网络，怎样逐渐逼近连续曲线？",
  "concepts": [
    {
      "title": "先做一条折线",
      "text": "在有限区间内取一组采样点，用直线连接相邻点。对于连续函数，足够密的采样可以让折线一致逼近目标；“连续”与“有限区间”是这里重要的条件。",
      "try": "先看同一函数的少量与较多采样点。尖峰附近需要多少点才看得出来？"
    },
    {
      "title": "ReLU 是可以组合的折角",
      "text": "ReLU(t)=max(0,t)：左侧为零，右侧为直线。移动折角的位置，再调节系数，就能改变某处之后的斜率。多个折角相加，可以精确拼出采样折线。",
      "try": "逐个加入单元，观察每一条基函数的贡献，以及累加曲线在哪一段改变斜率。"
    },
    {
      "title": "“一层”指一个隐藏层",
      "text": "这不是只有线性输出的网络。一个隐藏层提供多个非线性折角，输出层将它们相加。足够宽的单隐藏层在合适条件下具有很强表达能力。"
    },
    {
      "title": "存在好参数，不等于能学到",
      "text": "万有近似定理谈的是表达能力：存在能让误差足够小的参数。它不承诺所需宽度、训练时间，也不保证有限样本与某次优化能找到这些参数。",
      "try": "手动改一个 ReLU 系数破坏折线，再恢复构造。对比后续多层网络逐步学习的过程。"
    },
    {
      "title": "从曲线过渡到双变量曲面",
      "text": "前两阶段用一维曲线展示可核对的构造；第三阶段使用双变量连续函数，训练多层网络拟合曲面。此时采样数影响学习证据，网格误差衡量有限检查网格上的表现。",
      "try": "固定目标函数、种子、网络与训练预算，只改变采样点数；比较训练误差和网格误差。"
    }
  ],
  "math": [
    {
      "title": "折线的斜率由相邻点决定",
      "tex": "m_i=\\frac{f(t_{i+1})-f(t_i)}{t_{i+1}-t_i}",
      "text": "tᵢ 是按顺序排列的采样位置。两点间斜率固定，在下一处采样点才改变。"
    },
    {
      "title": "用 ReLU 表示折线",
      "tex": "\\begin{aligned}\\hat f(x)={}&f(t_0)+m_0(x-t_0)\\\\&+\\sum_{i=1}^{n-2}(m_i-m_{i-1})\\operatorname{ReLU}(x-t_i)\\end{aligned}",
      "text": "每个隐藏单元负责一次斜率变化。常数和基础斜率也可由偏置及 ReLU 单元在目标区间内实现；页面说明采用的具体基底。"
    },
    {
      "title": "逼近精度的含义",
      "tex": "\\sup_{x\\in K}|f(x)-\\hat f(x)|<\\varepsilon",
      "text": "对紧致区间或区域 K 上的连续函数，适当激活函数与足够宽度可提供任意小的逼近误差。这是存在性结论，有限图格不能单独证明它。"
    },
    {
      "title": "实际拟合使用均方误差",
      "tex": "\\mathrm{MSE}=\\frac1N\\sum_{i=1}^{N}\\bigl(\\hat f(x_i,y_i)-f(x_i,y_i)\\bigr)^2",
      "text": "N 为训练采样点数。网格误差在另一组固定位置计算，不参与参数更新；如果据此反复调参，它不能再称作独立测试。"
    }
  ],
  "sources": [
    {
      "title": "A visual proof that neural nets can compute any function",
      "url": "http://neuralnetworksanddeeplearning.com/chap4.html",
      "type": "Michael Nielsen · 可视化教材 · 英文",
      "note": "用可组合的简单形状建立万有近似直觉。原文的构造与本页 ReLU 折线构造不同。"
    },
    {
      "title": "Approximation by superpositions of a sigmoidal function",
      "url": "https://link.springer.com/article/10.1007/BF02551274",
      "type": "George Cybenko · 原始论文 · 英文 · 进阶",
      "note": "经典的单隐藏层存在性结果，原文使用 sigmoid 类函数；不要直接将其条件与本页 ReLU 构造混用。"
    },
    {
      "title": "But what is a neural network?",
      "url": "https://www.3blue1brown.com/lessons/neural-networks",
      "type": "3Blue1Brown · 动画与图文 · 英文",
      "note": "补齐加权组合、激活函数和层的含义，再回到本页观察基函数叠加。"
    }
  ],
  "id": "universal-approximation"
};
