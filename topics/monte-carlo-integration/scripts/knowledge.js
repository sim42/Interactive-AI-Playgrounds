/* Original local explanations; reading links open only by user action. */
window.PlaygroundKnowledge = {
  "title": "蒙特卡洛积分",
  "question": "怎样把随机样本变成一个总量的估计？",
  "concepts": [
    {
      "title": "先把积分理解为累加",
      "text": "一维曲线下的有符号面积，等于区间宽度乘平均高度；二维曲面下的积分，等于底面区域面积乘平均高度。",
      "try": "编辑f(x)=x并使用[-1,1]，观察正负贡献怎样抵消。"
    },
    {
      "title": "一个点带来一份贡献",
      "text": "先确定位置，再求函数值，乘区域大小后加入累加器。估计使用全部贡献，图中为保持清晰只保留近期样本。"
    },
    {
      "title": "投点法的包围框必须可靠",
      "text": "四分之一圆位于单位方形；eˣ在[a,b]上不超过eᵇ。任意函数未必具有已知高度界，因此自定义函数采用均值法。"
    },
    {
      "title": "更多样本通常更稳，不保证每步更准",
      "text": "用独立重跑比较估计的分布。一次估计碰巧接近答案，不能证明方法的波动更小。"
    },
    {
      "title": "参考值与不确定性不是一回事",
      "text": "已知积分可计算实际误差；自定义函数不预知答案，标准误差只描述抽样波动。近似区间也有适用条件。"
    }
  ],
  "math": [
    {
      "title": "均值估计",
      "tex": "\\widehat I=V\\frac1N\\sum_{i=1}^N f(X_i)",
      "text": "X独立均匀分布在区域内，V是区间长度或区域面积。"
    },
    {
      "title": "估计标准误差",
      "tex": "\\widehat{\\mathrm{SE}}=s_Z/\\sqrt N,\\qquad Z_i=Vf(X_i)",
      "text": "s_Z为单点贡献的样本标准差。独立、有限方差条件下，N增加4倍，误差尺度大致减半。"
    },
    {
      "title": "投点估计π",
      "tex": "\\widehat\\pi=4H/N",
      "text": "H是单位方形内落入四分之一单位圆的数量。二元命中比例采用Wilson近似区间，避免零命中或全命中时误报零宽区间。"
    }
  ],
  "sources": [
    {
      "title": "蒙特卡罗方法：积分与误差",
      "url": "https://github.com/sim42/SCML/blob/f07e5016bd2dc55c6c5a6842c46a39b027e50f1e/Chapter08/2.%20%E8%92%99%E7%89%B9%E5%8D%A1%E7%BD%97%E6%96%B9%E6%B3%95.ipynb",
      "note": "原课件的π、eˣ与多维积分案例在这里按贡献流程重排。",
      "type": "原始课件 · 中文"
    }
  ],
  "id": "monte-carlo-integration"
};
