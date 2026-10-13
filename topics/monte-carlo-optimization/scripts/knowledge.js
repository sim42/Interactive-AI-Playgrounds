/* Original local explanations; external reading opens only on a user click. */
window.PlaygroundKnowledge = {
  "title": "随机探索如何找到更优解",
  "question": "暂时走向高处，有时为什么反而能走出局部低谷？",
  "concepts": [
    {
      "title": "先把“探索”与“接受”分开",
      "text": "蒙特卡洛（Monte Carlo）方法利用随机采样。这里要观察四件事：候选点从哪里来、它有多高、是否被接受、历史最好是否更新。每一步都实际计算。",
      "try": "单步时同时看当前点、候选点和历史最优点。它们什么时候重合，什么时候不同？"
    },
    {
      "title": "随机搜索：把预算花在全局",
      "text": "在给定方形范围内均匀抽取候选点，保留见过的最好值。它不读取梯度，也不会因为当前点在某个谷底就停止探索。有限次采样不能保证找出全局最低点。"
    },
    {
      "title": "随机爬山：只接受改进",
      "text": "在当前点附近提出候选，只接受更低目标值。步长影响探索范围；步长小可能困在局部谷地，步长大也可能跳过狭窄的好区域。"
    },
    {
      "title": "模拟退火：给上坡一个机会",
      "text": "模拟退火（Simulated Annealing）有时接受更差的候选，概率由高度差和温度决定。高温更容易探索；降温后逐渐趋向保守。温度为零时不接受更差候选。",
      "try": "固定函数、种子和步长，只改变初始温度。观察同一候选被接受的概率如何改变。"
    },
    {
      "title": "“最好值下降”不等于“当前位置下降”",
      "text": "历史最优是目前见过的最低值，它不会变差；退火的当前位置则可以变差。比较算法时应固定函数、预算、起点及种子，不从一条随机轨迹推出普遍结论。"
    }
  ],
  "math": [
    {
      "title": "先算候选的高度差",
      "tex": "\\Delta f=f(x^\\prime,y^\\prime)-f(x,y)",
      "text": "Δf≤0 表示候选不比当前点差；Δf>0 表示要爬升。模拟退火对后者使用概率规则，随机爬山直接拒绝。"
    },
    {
      "title": "接受概率与随机数",
      "tex": "p=\\exp(-\\Delta f/T)\\quad(\\Delta f>0,\\ T>0)",
      "text": "抽取 u∈[0,1)，若 u<p 就接受。概率与本次是否接受是两回事，页面同时展示 p、u 和判断。T=0 使用明确分支而不除以零。"
    },
    {
      "title": "逐渐降温",
      "tex": "T_{t+1}=\\alpha T_t,\\qquad 0<\\alpha\\leq1",
      "text": "α 接近 1 时降温慢，更多预算用于探索；降温太快可能过早固定在局部谷地。这是教学用的几何降温，不保证有限预算内达到全局最优。"
    },
    {
      "title": "记录最好，但不混淆当前",
      "tex": "b_{t+1}=\\min\\bigl(b_t,f(x^\\prime,y^\\prime)\\bigr)",
      "text": "b 是历史最好目标值。图中的当前轨迹展示算法实际接受的位置，最好值曲线展示迄今搜到的结果。"
    }
  ],
  "sources": [
    {
      "title": "How Simulated Annealing Works",
      "url": "https://www.mathworks.com/help/gads/how-simulated-annealing-works.html",
      "type": "MathWorks · 官方说明 · 英文",
      "note": "比较候选生成、温度、接受和降温的角色。其实现细节与本页教学版本并不完全相同。"
    },
    {
      "title": "Basin-hopping optimization",
      "url": "https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.basinhopping.html",
      "type": "SciPy · 官方文档 · 英文 · 延伸",
      "note": "阅读 Metropolis 接受概率以及随机探索与局部优化如何结合。本课件未实现 basin-hopping 的局部最小化子步骤。"
    },
    {
      "title": "Optimization and root finding",
      "url": "https://docs.scipy.org/doc/scipy/reference/optimize.html",
      "type": "SciPy · 算法索引 · 英文",
      "note": "将本页方法放回更完整的局部与全局优化图景；这是延伸索引，不是课件运行依赖。"
    }
  ],
  "id": "monte-carlo-optimization"
};
