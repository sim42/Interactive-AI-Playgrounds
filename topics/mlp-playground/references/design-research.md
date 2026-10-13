# 成熟项目设计核对（2026-10-10）

本记录是原创的开发分析，不是原项目教程的转载。必要学习内容均在课件内，学生无需访问在线演示。

- tensorflow-playground: https://github.com/tensorflow/playground ，核对提交 `02469bd3751764b20486015d4202b792af5362a6`；许可原件本地保存为 `tensorflow-playground-LICENSE.txt`，来源 https://raw.githubusercontent.com/tensorflow/playground/02469bd3751764b20486015d4202b792af5362a6/LICENSE。
- micrograd: https://github.com/karpathy/micrograd ，核对提交 `7bc720e951fe422b8f8814aa5aa1b64121d26b4c`；许可原件本地保存为 `micrograd-LICENSE.txt`，来源 https://raw.githubusercontent.com/karpathy/micrograd/7bc720e951fe422b8f8814aa5aa1b64121d26b4c/LICENSE。

## TensorFlow Playground

查看在线原演示 https://playground.tensorflow.org/ 和源码 src/playground.ts / src/heatmap.ts。采用的交互思路：数据、特征、隐藏层和输出横向相邻；每个节点画实际输入平面的响应；连接宽度表达权重大小，正负同时使用颜色/线型；训练结果与节点图同步；用户能聚焦一个节点理解它的作用。

本课件的调整：教学文案、合成数据和计算算法仍原创；不复制原项目 HTML/CSS/TypeScript、Google 标志或图片，也不加载原站点。保留 CPU 小网络、独立 file:// 交付、真实单样本反向检查和稳定数值分支。

## micrograd

查看原 README 的 tracing/visualization 说明、trace_graph.ipynb 的 draw_dot，以及标量引擎的拓扑反向传播说明。采用的教学思路：把神经元拆成乘法、加法、激活等可检查操作，中间值与反向梯度沿同一条计算关系展示；分支先相加，再传回。

本课件的调整：并未嵌入 Python、Graphviz 或复制自动微分代码；仍使用已经通过有限差分验证的原创 JavaScript MLP 和解析梯度。逐步检查区保留数据值、局部导数、梯度和预计更新的具体代入，同时改进公式排版。
