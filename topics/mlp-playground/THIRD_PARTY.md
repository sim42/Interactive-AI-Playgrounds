# 本地第三方资源与设计参考（2026-10-10）

## 实际运行资源

- **D3 7.9.0**：`vendor/d3.v7.9.0.min.js`。来源 https://github.com/d3/d3/tree/v7.9.0 ，npm固定版本；ISC及组件许可证保存在`vendor/d3-licenses/`。用esbuild 0.25.12预先打包为传统全局脚本，选用坐标/轴/形状/数据绑定/拖动/等高线等功能；没有数据下载、CSV编译与模块加载代码。课件运行不需要构建。官方UMD/离线说明 https://d3js.org/getting-started 。
- **KaTeX 0.19.0**：`vendor/katex/`。来源 https://github.com/KaTeX/KaTeX/releases/tag/v0.19.0 ，npm固定版本；MIT许可在该目录`LICENSE`。保留JS、样式和所有WOFF2字体，CSS仅移除现代目标浏览器不需要的WOFF/TTF后备项。字体全部在主题内，不请求远程资源；只用于排版本地数学公式，不执行算法。

获取日期：2026-10-10。所有模型、数据与数值仍由本主题代码实际计算；图表库负责呈现。第三方资源源码校验见本目录`vendor/SHA256SUMS.txt`。

## 借鉴的交互与布局

- **TensorFlow Playground**：在线演示 https://playground.tensorflow.org/ ，原项目 https://github.com/tensorflow/playground ，核对提交 `02469bd3751764b20486015d4202b792af5362a6`。Apache-2.0 许可原件保存为 `references/tensorflow-playground-LICENSE.txt`。借鉴数据→节点内二维响应→输出的一体化关系、权重宽度/符号编码和节点聚焦；未复制原项目代码、网页、标志或素材，未嵌入原站点。
- **micrograd**：原项目 https://github.com/karpathy/micrograd ，核对提交 `7bc720e951fe422b8f8814aa5aa1b64121d26b4c`，阅读 `trace_graph.ipynb` 的标量计算图与反向梯度可视化。MIT 许可原件保存为 `references/micrograd-LICENSE.txt`。借鉴中间值/梯度沿同一计算支路展示的教学方式；未复制 Python 自动微分或 Graphviz 代码，实际解析梯度仍由本主题原创 JavaScript 计算。

两项参考均只用于设计核对，不是运行资源。原创分析和采用范围见本地 `references/design-research.md`；核心说明、公式、示例和图形都在课件内，学生无需访问来源网址。

## 2026-10-12 视觉参考与知识阅读

本轮界面借鉴 [Kanaries](https://ml.kanaries.net/playground) 的暖纸配色、清晰分组与标题层次，以及 [3Blue1Brown](https://www.3blue1brown.com/) 的数学叙事节奏。布局、图形和中文解释为本项目编写；没有复制这些网站的代码、字体、图片或视频，无新增运行依赖。参考获取日期：2026-10-12。

本地 `scripts/knowledge.js` 保存本主题原创概念说明、公式、操作问题和带作者/资料类型说明的延伸阅读 URL。`scripts/studio.js` 与 `styles/studio.css` 实现知识抽屉和公共导航；它们已复制到本目录，不依赖项目根部。外部链接仅在用户主动点击时打开，不预取或嵌入；核心说明离线可用。外部原文未再分发，原作者权利保留。D3、KaTeX 的版本和许可证不变。
