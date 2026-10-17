/* Original local explanations; reading links open only by user action. */
window.PlaygroundKnowledge = {
  "title": "积分的维度灾难",
  "question": "相同计算预算，维数怎样改变积分难度？",
  "concepts": [
    {
      "title": "每维加点会相乘",
      "text": "每维m个点，完整张量网格有mᵈ个组合。这里比较的是这一类网格，不代表所有确定性积分算法。",
      "try": "每维10点，从2维升到8维，计算量增加多少倍？"
    },
    {
      "title": "预算相同，实际开销也要看清",
      "text": "网格需要完整遍历一个mᵈ布局，可能用不完上限；随机采样可以用满预算。页面分别显示实际求值数。"
    },
    {
      "title": "投影不能替代高维函数",
      "text": "底色把未显示坐标固定在中点；样本点仅投影前两维。完整高维函数值用于估计，不能从底色读出任意样本的高度。"
    },
    {
      "title": "高维优势有条件",
      "text": "蒙特卡洛的1/√N指数不显含维数，但方差、相对误差和求值成本可能随维度恶化。窄峰会使两种方法都困难。",
      "try": "固定预算，把平滑函数换成窄峰，再独立重跑。"
    }
  ],
  "math": [
    {
      "title": "完整张量网格",
      "tex": "N_{\\mathrm{grid}}=m^d,\\quad m=\\lfloor B^{1/d}\\rfloor",
      "text": "B为每种方法的预算上限；程序不执行超过100,000次的网格。"
    },
    {
      "title": "可分离参考积分",
      "tex": "\\int_{[a,b]^d}e^{-\\sum_j x_j^2}\\,dx=\\left(\\int_a^b e^{-x^2}\\,dx\\right)^d",
      "text": "利用可分离结构给出参考值；一维高斯积分使用erf数值近似。此特殊结构不是一般自定义函数的捷径。"
    },
    {
      "title": "误差中的维度",
      "tex": "\\mathrm{Var}(\\widehat I)=V^2\\mathrm{Var}(f(X))/N",
      "text": "V和函数值方差都可能随维度变化，不能由1/N断言高维没有代价。"
    }
  ],
  "sources": [
    {
      "title": "蒙特卡罗方法：高维积分",
      "url": "https://github.com/sim42/SCML/blob/f07e5016bd2dc55c6c5a6842c46a39b027e50f1e/Chapter08/2.%20%E8%92%99%E7%89%B9%E5%8D%A1%E7%BD%97%E6%96%B9%E6%B3%95.ipynb",
      "note": "保留exp(−Σx²)和窄峰例子，加入明确预算、切片和失败状态。",
      "type": "原始课件 · 中文"
    }
  ],
  "id": "curse-of-dimensionality"
};
