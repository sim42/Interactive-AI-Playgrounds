/* Original local explanations; reading links open only by user action. */
window.PlaygroundKnowledge = {
  "title": "让每个样本更有用",
  "question": "怎样改变采样方式，同时保持估计的意义？",
  "concepts": [
    {
      "title": "分层先保证覆盖",
      "text": "将区域分成等体积格子，在每层独立采样。先求每层均值，再按体积相加；误差也按层分别计算。"
    },
    {
      "title": "对偶变量是一对贡献",
      "text": "u和1−u共享一个随机输入。在单调函数上常能抵消波动，但对称函数可能没有收益。把两次求值算成一对独立估计单位。"
    },
    {
      "title": "更常去重要区域，需要修正权重",
      "text": "从密度q采样后，每个点贡献f/q。分布必须覆盖有贡献的区域；本页二维提议混入10%均匀密度以保持覆盖。",
      "try": "把提议中心移离函数峰值，观察最大贡献和重复估计波动。"
    },
    {
      "title": "没有命中不等于概率为零",
      "text": "正态大于5的事件极少见。普通抽样零命中时只能说本轮未见；尾部重要性采样把计算用于相关区域，并用密度比修正。"
    },
    {
      "title": "错误的提议也会更差",
      "text": "少数巨大权重可主导答案。比较应使用相同函数求值预算和多次独立重跑，不能挑选一次幸运结果。"
    }
  ],
  "math": [
    {
      "title": "重要性估计",
      "tex": "I=\\int f(x)\\,dx=\\mathbb E_q[f(X)/q(X)]",
      "text": "这是普通重要性估计，没有再把权重除以权重之和。"
    },
    {
      "title": "对偶变量的独立单位",
      "tex": "Z_i=\\frac{f(U_i)+f(1-U_i)}2",
      "text": "先对每对求均值，再用这些独立均值估计标准误差。总求值预算按2的倍数取整。"
    },
    {
      "title": "分层的误差",
      "tex": "\\widehat I=\\sum_h W_h\\overline f_h,\\quad \\widehat{\\mathrm{SE}}^2=\\sum_h W_h^2s_h^2/n_h",
      "text": "W_h为各层体积。至少每层2个样本后才有层内样本方差。"
    },
    {
      "title": "零命中的上界",
      "tex": "p_{\\mathrm{upper}}=1-0.05^{1/N}",
      "text": "N次独立伯努利试验零命中时的95%单侧上界，约为3/N；不是概率等于零的证明。"
    }
  ],
  "sources": [
    {
      "title": "蒙特卡罗方法：方差缩减",
      "url": "https://github.com/sim42/SCML/blob/f07e5016bd2dc55c6c5a6842c46a39b027e50f1e/Chapter08/2.%20%E8%92%99%E7%89%B9%E5%8D%A1%E7%BD%97%E6%96%B9%E6%B3%95.ipynb",
      "note": "保留正态尾部重要性采样，并增加贡献账本与方法特有误差估计。",
      "type": "原始课件 · 中文"
    },
    {
      "title": "Monte Carlo: Importance Sampling",
      "url": "https://artowen.su.domains/mc/Ch-var-is.pdf",
      "note": "重要性权重、方差与不合适提议分布的理论参考。",
      "type": "作者教材 · 英文"
    }
  ],
  "id": "variance-reduction"
};
