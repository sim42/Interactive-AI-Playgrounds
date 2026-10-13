# 概念核对记录（非运行依赖）

获取/核对日期：2026-10-09。下文为本项目原创摘要；外部正文未复制进交付目录，不使用外部代码/素材。网址仅供追溯。

- Cornell CS 4780，Lecture 9: SVM，2023 年秋季版：https://www.cs.cornell.edu/courses/cs4780/2023fa/lectures/lecturenote09.html 。核对线性得分、标签 ±1、hinge 损失与权重正则化构成软间隔优化目标。本课采用 λ/2‖w‖² + 平均 hinge，参数化与讲义的 C 求和形式可转换；采用逐样本次梯度，偏置不正则化。
- scikit-learn 官方 Nearest Neighbors 文档：https://scikit-learn.org/stable/modules/neighbors.html 。核对 k 近邻从已有样本中按距离选邻居，再进行标签投票。本课仅二维欧氏距离、等权投票与奇数 k；没有使用 scikit-learn 代码。
- scikit-learn 官方 KMeans 文档，1.5.2：https://scikit-learn.org/1.5/modules/generated/sklearn.cluster.KMeans.html 。核对 Lloyd 分配/均值迭代、平方距离惯量和局部解边界。本课仅单次随机初始化，不实现 k-means++ 或多次重启求最优；空簇保留原中心。
