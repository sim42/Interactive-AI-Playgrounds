# 算法核对来源

核对日期：2026-10-09。以下是开发阶段参考信息，不是页面运行依赖。课件中所需概念、算法说明和公式均为本地原创表述，未复制来源的代码、插图或长篇文字，因此未将无必要的网页副本加入交付包。

- Stanford CS231n，Optimization: Backpropagation，https://cs231n.github.io/optimization-2/ ：核对链式法则、分支梯度相加以及中间量梯度和模型参数的区别。
- Stanford CS231n，Neural Networks Part 1，https://cs231n.github.io/neural-networks-1/ ：核对全连接层、非线性激活以及梯度下降的训练方式。
- 本课件输出使用二元 sigmoid；稳定交叉熵为 max(z,0)+log(1+exp(−|z|))−yz，直接解析求得 dL/dz = sigmoid(z)−y。实现及全参数有限差分核对为原创。
- 本课件不是 TensorFlow Playground 的复制版，不包含其源代码或资产；借鉴“调整微型网络并观察二维分类边界”的交互任务形式。

2026-10-10 新增成熟项目交互核对：TensorFlow Playground 的节点特征图/权重编码与 micrograd 的标量计算图/梯度追踪，采用范围、固定提交和许可原件见本地 `references/design-research.md` 及 `THIRD_PARTY.md`。
