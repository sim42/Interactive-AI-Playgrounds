# 可视化项目研究与本轮改版（2026-10-10）

本轮先检索同类项目、阅读页面/源码并检查截图，再将有教学收益的交互落到五个离线课件。下表记录借鉴内容与实际实现；没有把远程页面嵌入课件，没有把网上截图当作实验。所有模型仍以当前状态实际计算。

| 参考项目 | 观察到的设计 | 本课件的实际改动 |
| --- | --- | --- |
| [TensorFlow Playground](https://playground.tensorflow.org/)，[源码](https://github.com/tensorflow/playground) | 数据、带局部特征图的节点、带权连接、输出区域同时出现，训练直接改变图形 | MLP默认打开一体化实验台；每个节点实际计算同一输入平面的响应，连接正负与宽度对应真实权重；可选样本/节点/边进入逐步检查，保留损失、完整反向支路及原子参数提交 |
| [micrograd](https://github.com/karpathy/micrograd) | 小规模计算图中可检查数据和梯度 | 保留并改善逐节点和逐边链式法则检查，主图用简洁的预计Δw，旁边显示乘加、梯度与更新完整数值；没有引入Python运行条件 |
| [optimization-viz](https://github.com/mcylmz/optimization-viz)，[Saddle](https://github.com/MarcosAsh/Saddle) | 等高线、3D轨迹与收敛曲线同步；同场景比较优化器 | 两个优化课件扩大等高线，并排显示CPU 3D与收敛证据；可点击选起点，也可数字输入；冻结运行A，再在相同函数/域/起点/种子下运行B，列出变化条件并在相同迭代次数比较；失败原因在主图上方直示 |
| [Kanaries kNN](https://ml.kanaries.net/playground/knn)、[k-means](https://ml.kanaries.net/playground/kmeans)，[源码](https://github.com/Kanaries/ml) | 直接改变样本/查询点并查看局部证据、预测区域 | 基础算法可以拖动或用表单改一个训练点，验证数据保持原样；修改清空受影响的训练。kNN可拖查询点；k-means的当前最近中心底色与实际已分配点色分别解释；数据与单次数学运算相邻 |
| [Naftali Harris k-means](https://www.naftaliharris.com/blog/visualizing-k-means-clustering/) | 明确区分初始化、分配和均值更新 | 加入真实阶段条；逐距离和逐中心更新继续可检查，Voronoi只表示当前中心，避免拿背景冒充已经执行的分配 |
| [svmjs](https://github.com/karpathy/svmjs) | 决策边界与可操纵样本相邻 | 借鉴可操作数据关系，算法保留原始次梯度有限步优化；其旧网页资产未完整加载，不将旧演示标为功能实测 |
| [ANN-Demo](https://github.com/ESandML/ANN-Demo)、[UAT课页](https://kks32-courses.github.io/ai-geotech/03-mlp/uat.html) | 拆开隐藏单元贡献，将构造与整体曲线建立联系 | 万有近似保留“采样折线→单隐层ReLU构造→多层二元回归”；新增同轴基函数小图、可选单元权重与拐点、z→激活→贡献三图、恢复构造解；误差带与最大误差定位帮助比较，二元拟合可冻结模型基准 |

## 资源、许可与边界

真正采用的外部运行资源是[D3 7.9.0](https://d3js.org/getting-started)和[KaTeX 0.19.0](https://katex.org/docs/browser)。已经保存到每个主题vendor：传统脚本、样式、全部需要的字体、依赖许可证与校验清单。学生打开file://时无需构建或联网。开发构建选项保存在development/vendor。

TensorFlow Playground为Apache-2.0；micrograd和Kanaries/ml为MIT。涉及未提供再分发许可、或附非商业限制的页面，只研究交互/教学表达，没有复制原代码、图片或正文。具体来源、提交、许可与采用范围见每个主题THIRD_PARTY.md。五个主题新增的本地中文说明、数据和数学步骤与对应数值保持一致；D3和KaTeX仅帮助呈现。

研究不是兼容承诺：部分旧演示没有成功加载，网页宣传不算算法验收。单次训练的改善不能证明任意连续函数有限宽网络必然收敛，二维投影和一维构造也不替代多元定理的证明。默认UI减少术语堆叠，进阶计算可以展开，但每个课件仍提供单步、暂停、重置和同步文字证据。

## 如何检查本次成果

从根index.html进入五个实际课件，先按默认条件单步，再改变一个参数做对照。全部主题可以单独复制到中文与空格路径，在浏览器断网、无缓存的新会话打开index.html。测试及实际浏览器版本见TESTING.md和各主题README；来源记录与许可随每个离线ZIP一起交付。

## 2026-10-12：页面编排与随手可读的知识抽屉

本轮按用户指定，实际浏览并截取 [Kanaries Playground](https://ml.kanaries.net/playground) 的目录与梯度下降页面，以及 [3Blue1Brown](https://www.3blue1brown.com/) 首页，阅读神经网络、梯度下降、反向传播文章。参考截图仅供开发对照，不作为课件素材分发。采用以下设计原则，并用原创 HTML/CSS/SVG 实现：

- Kanaries 的纸色底、衬线标题、克制强调色和较宽的分组间距，转化为统一实验室导航、原创算法封面和清楚的实验目录。没有搬入其大幅宣传首屏；课件仍优先显示核心实验。
- 3Blue1Brown 的数学叙事启发：让同一个数、节点或贡献在不同视图中持续可追踪。MLP 用真实计算阶段导航连接前向、损失、反向和更新；万有近似把基函数贡献与总和靠近呈现。没有复制视频、截图、角色形象或字体。
- 每个课件包含独立本地知识手册，分为“直觉与实验 / 数学关系 / 延伸阅读”。打开暂停运行且保留状态；关闭不自动继续。键盘可切换标签、循环焦点、Esc 关闭并返回打开按钮。
- 新增说明为原创中文，公式对应当前微型算法。精选阅读指向原作者文章、官方文档或原始论文；链接均需主动点击，不嵌入、不预取，不是离线学习的前提。

主要知识来源与适用范围在各主题 `scripts/knowledge.js` 中逐项记录，随主题分发。包括 3Blue1Brown 神经网络系列、Distill 动量交互文章、scikit-learn 算法文档、MathWorks 退火说明、SciPy 全局优化文档、Adam 论文与 Cybenko 原论文。Michael Nielsen 教材原站本次验证 HTTP 可访问、HTTPS 证书主机名不匹配，因此保留原站 HTTP 阅读链接，不绕过 TLS 验证。SciPy basin-hopping 和 MathWorks 的具体算法不同于本页版本，抽屉已标明区别。

本轮不新增运行库；继续使用已本地化的 D3 7.9.0 与 KaTeX 0.19.0。没有将外部网站的内容声称为原创，也没有将许可不明的页面打包再分发。
