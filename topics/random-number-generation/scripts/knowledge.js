/* Original local explanations; reading links open only by user action. */
window.PlaygroundKnowledge = {
  "title": "随机数如何生成？",
  "question": "确定的规则，为什么能产生看起来随机的一串数？",
  "concepts": [
    {
      "title": "种子是内部状态的起点",
      "text": "伪随机数生成器按照确定规则改变状态。同一种子、同一算法和同样的调用顺序，会得到同一序列。它适合重现实验，不能因此用于密码学。",
      "try": "生成一批数，重新开始，再比较前16个输出。"
    },
    {
      "title": "频率均匀不等于没有结构",
      "text": "直方图只检查每个区间出现多少次；相邻点散图检查前后两个数的关系。满周期也不保证序列在所有统计意义上都好。",
      "try": "只把乘数a从5改成4，观察状态环何时不再前进。"
    },
    {
      "title": "概率是区间的长度",
      "text": "均匀数u在[0,1)中取值。把区间按概率切成六段，就能生成带指定概率的离散结果。概率为零的段没有宽度。"
    },
    {
      "title": "从均匀分布到等待时间",
      "text": "指数分布用累积概率F(x)表示“等待不超过x”的概率。先抽u，再沿曲线反查x；改变λ只改变这一步映射。",
      "try": "固定种子，将λ加倍；对应等待时间是否减半？"
    }
  ],
  "math": [
    {
      "title": "LCG 的一步",
      "tex": "s_{n+1}=(a s_n+c)\\bmod m,\\qquad u_n=s_{n+1}/m",
      "text": "小模数用于看见每个状态；m=16,a=5,c=1可走遍16个状态。大序列对照使用项目已有的32位教学生成器。"
    },
    {
      "title": "逆累积分布",
      "tex": "F(x)=1-e^{-\\lambda x},\\quad x=-\\log(1-u)/\\lambda",
      "text": "u小于1，λ为正数。程序使用log1p提高接近零处的数值精度。"
    },
    {
      "title": "离散结果",
      "tex": "P(X=k)=p_k,\\quad \\sum_{k=1}^{6}p_k=1,\\quad p_k\\ge0",
      "text": "累积概率确定各段右边界；结果由u落在哪一段决定。"
    }
  ],
  "sources": [
    {
      "title": "蒙特卡罗方法：随机数与分布变换",
      "url": "https://github.com/sim42/SCML/blob/f07e5016bd2dc55c6c5a6842c46a39b027e50f1e/Chapter08/2.%20%E8%92%99%E7%89%B9%E5%8D%A1%E7%BD%97%E6%96%B9%E6%B3%95.ipynb",
      "note": "保留LCG与逆累积分布的教学主线，改为可单步检查的浏览器实验。",
      "type": "原始课件 · 中文"
    },
    {
      "title": "NumPy Random Generator",
      "url": "https://numpy.org/doc/stable/reference/random/generator.html",
      "note": "了解现代生成器与随机源的区别。本页不声称模拟NumPy实现。",
      "type": "官方文档 · 英文"
    }
  ],
  "id": "random-number-generation"
};
