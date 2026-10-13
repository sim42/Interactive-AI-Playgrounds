/* Original local explanations; external reading opens only on a user click. */
window.PlaygroundKnowledge = {
  "title": "沿着坡度寻找低处",
  "question": "同一片地形，为什么有的走法直达谷底，有的绕路或发散？",
  "concepts": [
    {
      "title": "把两个参数看成一个位置",
      "text": "函数 f(x,y) 的高度是要降低的目标值；平面位置就是两个待调整参数。梯度是当前位置最陡的上升方向，取负号才是局部下降方向。",
      "try": "固定起点，先预测下一个点的方向，再按单步，看两个坐标分别改变多少。"
    },
    {
      "title": "学习率是一脚迈多远",
      "text": "梯度下降（Gradient Descent）每一步重新测坡度，再移动。步子小通常更稳但更慢；步子过大可能越过谷底、来回振荡，甚至发散。",
      "try": "只改变学习率，并冻结一条对照轨迹。在相同步数下比较目标值。"
    },
    {
      "title": "动量：记住最近的方向",
      "text": "动量（Momentum）把过去的更新方向累积起来，能减轻某些狭长谷地中的摇摆。惯性也可能让轨迹冲过最低处。β 越大，旧方向保留越久。"
    },
    {
      "title": "自适应算法也有代价",
      "text": "RMSProp 和 Adam 根据过去的梯度调整不同坐标的步长。Adam 同时使用方向与平方梯度统计。它们依然依赖超参数，不能保证每一步都下降或找到全局最优。"
    },
    {
      "title": "自定义函数是新的实验条件",
      "text": "输入表达式后需应用，旧轨迹会清空。定义域无效、不可导位置或数值溢出会给出反馈；图中有限范围也不是函数的整个世界。",
      "try": "试 f(x,y)=x^2+10*y^2。保持起点不变，观察两个方向的曲率差异。"
    }
  ],
  "math": [
    {
      "title": "梯度下降的一步",
      "tex": "\\begin{pmatrix}x\\cr y\\end{pmatrix}_{t+1}=\\begin{pmatrix}x\\cr y\\end{pmatrix}_t-\\eta\\begin{pmatrix}\\partial f/\\partial x\\cr\\partial f/\\partial y\\end{pmatrix}_t",
      "text": "η 为学习率。页面逐项给出当前坐标、两个偏导数、更新量与新目标值。局部线性近似不能保证大步移动仍会降低目标。"
    },
    {
      "title": "动量保留历史方向",
      "tex": "v_t=\\beta v_{t-1}+g_t,\\qquad \\theta_{t+1}=\\theta_t-\\eta v_t",
      "text": "本课件的动量采用此约定：gₜ 为当前梯度，v₀=0。不同文献也会对梯度乘 (1−β)，学习率的数值不能直接混用。"
    },
    {
      "title": "Adam 的两个记忆",
      "tex": "m_t=\\beta_1m_{t-1}+(1-\\beta_1)g_t",
      "text": "平方梯度的滑动平均 vₜ 用 β₂ 更新；对 m、v 进行初期偏差修正后，使用 η m̂/(√v̂+ε) 更新。数学面板展示本次实际中间量。"
    },
    {
      "title": "一个可手算的对照",
      "tex": "f=x^2+10y^2,\\qquad\\nabla f=(2x,20y)",
      "text": "同样的坐标偏移，y 方向坡度大得多。普通梯度下降在狭长谷地容易横向摆动，这可以在等高线轨迹中直接观察。"
    }
  ],
  "sources": [
    {
      "title": "Gradient descent, how neural networks learn",
      "url": "https://www.3blue1brown.com/lessons/gradient-descent",
      "type": "3Blue1Brown · 动画与图文 · 英文",
      "note": "从地形直觉进入高维参数优化，适合建立损失函数与梯度的联系。"
    },
    {
      "title": "Why Momentum Really Works",
      "url": "https://distill.pub/2017/momentum/",
      "type": "Distill · 交互文章 · 英文",
      "note": "通过可操作的路径、曲率和动力学图像理解动量，适合做对照实验。"
    },
    {
      "title": "Adam: A Method for Stochastic Optimization",
      "url": "https://arxiv.org/abs/1412.6980",
      "type": "原始论文 · 英文 · 进阶",
      "note": "核对 Adam 的矩估计、偏差修正和更新规则。先观察本页数值再阅读更容易。"
    }
  ],
  "id": "gradient-descent"
};
