/* Original local explanations; external reading opens only on a user click. */
window.PlaygroundKnowledge = {
  "title": "数据如何变成判断",
  "question": "相同的点，为什么不同算法会画出不同的边界？",
  "concepts": [
    {
      "title": "先认清图上的四种角色",
      "text": "每个样本有两个特征 x₁、x₂，也就是它在图上的位置。标签是已知类别；预测是模型作出的判断。实心训练点参与计算，空心验证点用于观察新数据上的表现。",
      "try": "只移动一个训练点，再推进一轮；比较边界和验证指标如何改变。"
    },
    {
      "title": "SVM：给分界线留出余地",
      "text": "支持向量机（Support Vector Machine）用一条直线分类。正确侧还不够：离边界太近的点也会受到惩罚。这里用逐样本次梯度更新演示线性、软间隔 SVM，并非完整二次规划求解器。",
      "try": "选 XOR 数据。即使多训练几轮，一条直线也无法正确分开对角的同类点。"
    },
    {
      "title": "kNN：让附近的样本投票",
      "text": "k 近邻（k-Nearest Neighbors）不训练一条分界线。它先算查询点到训练点的距离，再选最近的 k 个，每点一票。增加 k 会改变参与投票的人。",
      "try": "固定数据和查询位置，将 k 从 1 改成 9。平滑的边界是否一定更准确？"
    },
    {
      "title": "k-means：分组与移动交替进行",
      "text": "先把每个点分给最近的中心，再把每个中心移到组内平均位置；重复这两步。聚类不读取类别标签，中心数由你决定。",
      "try": "固定种子，单步对照“分配”和“移动”。中心移动时，所有点会一起移动吗？"
    },
    {
      "title": "会拟合，不等于会泛化",
      "text": "训练误差衡量已用于学习的数据；验证误差衡量未参与更新的数据。如果反复依据验证结果调参，这些点也不能再冒充独立测试集。所有例子都是合成数据。"
    }
  ],
  "math": [
    {
      "title": "SVM 的得分与间隔",
      "tex": "s=w_1x_1+w_2x_2+b,\\quad r=ys",
      "text": "标签 y 为 +1 或 −1。r<0 表示分错；0≤r<1 表示分对但余地不够。只有 r≥1 时，这个样本的 hinge 损失为 0。"
    },
    {
      "title": "从惩罚到参数更新",
      "tex": "\\ell=\\max(0,1-ys)+\\frac{\\lambda}{2}\\lVert w\\rVert^2",
      "text": "学习率 η 决定沿负次梯度移动多远。图中的“损失→梯度→更新”来自同一份样本计算；边界处采用页面记录的分支约定。"
    },
    {
      "title": "距离决定谁来投票",
      "tex": "d_i=\\sqrt{(x_1-x_{i1})^2+(x_2-x_{i2})^2}",
      "text": "这里两个特征使用同一数值范围，距离为欧氏距离。实际应用中特征单位相差很大时，必须先考虑缩放。"
    },
    {
      "title": "中心是组内平均位置",
      "tex": "\\mu_j=\\frac{1}{|C_j|}\\sum_{x_i\\in C_j}x_i",
      "text": "固定分组时，平均位置最小化组内平方距离和。k-means 的目标下降不代表一定找到了全局最优分组。"
    }
  ],
  "sources": [
    {
      "title": "Support Vector Machines",
      "url": "https://scikit-learn.org/stable/modules/svm.html",
      "type": "官方文档 · 英文",
      "note": "核对间隔、正则化和线性 SVM 的边界。本页采用便于单步检查的微型求解过程。"
    },
    {
      "title": "Nearest Neighbors",
      "url": "https://scikit-learn.org/stable/modules/neighbors.html",
      "type": "官方文档 · 英文",
      "note": "比较邻居数、距离和分类方式；理解 kNN 为什么对特征尺度敏感。"
    },
    {
      "title": "K-means",
      "url": "https://scikit-learn.org/stable/modules/clustering.html#k-means",
      "type": "官方文档 · 英文",
      "note": "进一步阅读分配—更新、初始化和局部最优。"
    }
  ],
  "id": "machine-learning-algorithms"
};
