# 本地第三方资源与设计参考（2026-10-10）

## 实际运行资源

- **D3 7.9.0**：`vendor/d3.v7.9.0.min.js`。来源 https://github.com/d3/d3/tree/v7.9.0 ，npm固定版本；ISC及组件许可证保存在`vendor/d3-licenses/`。用esbuild 0.25.12预先打包为传统全局脚本，选用坐标/轴/形状/数据绑定/拖动/等高线等功能；没有数据下载、CSV编译与模块加载代码。课件运行不需要构建。官方UMD/离线说明 https://d3js.org/getting-started 。
- **KaTeX 0.19.0**：`vendor/katex/`。来源 https://github.com/KaTeX/KaTeX/releases/tag/v0.19.0 ，npm固定版本；MIT许可在该目录`LICENSE`。保留JS、样式和所有WOFF2字体，CSS仅移除现代目标浏览器不需要的WOFF/TTF后备项。字体全部在主题内，不请求远程资源；只用于排版本地数学公式，不执行算法。

获取日期：2026-10-10。所有模型、数据与数值仍由本主题代码实际计算；图表库负责呈现。第三方资源源码校验见本目录`vendor/SHA256SUMS.txt`。

## 借鉴的交互与布局

- Kanaries/ml 的 kNN / k-means Playground（https://ml.kanaries.net/playground/knn 、https://ml.kanaries.net/playground/kmeans ，仓库 https://github.com/Kanaries/ml ，MIT）：实际打开页面与截图，借鉴“可改变样本/查询点、图旁显示当前证据”。本主题采用拖动/表单修改固定24个训练点及可拖查询点；继续逐距离、逐票和逐均值计算，不直接使用该项目代码或算法库。
- Naftali Harris k-means 可视化（https://www.naftaliharris.com/blog/visualizing-k-means-clustering/ ）：借鉴分配与中心更新的阶段区分；当前中心的 Voronoi 底色与已完成分配的点色分别说明。未复制代码、样式、素材。
- Karpathy svmjs（https://github.com/karpathy/svmjs ，MIT；旧演示 https://cs.stanford.edu/people/karpathy/svmjs/demo/ ）：借鉴可调整数据与决策边界相邻呈现。旧在线演示资产未完整加载，未记作功能实测。本主题仍用已有的原始次梯度有限步优化，而不是该库的SMO核SVM；未复制原代码或图像。

上述项目仅作为布局/交互研究参考，数值图、说明文字和算法步骤是本课件实现；实际再分发的外部运行代码仅为上述本地D3、KaTeX及其许可文件。研究日期2026-10-10。

## 2026-10-12 视觉参考与知识阅读

本轮界面借鉴 [Kanaries](https://ml.kanaries.net/playground) 的暖纸配色、清晰分组与标题层次，以及 [3Blue1Brown](https://www.3blue1brown.com/) 的数学叙事节奏。布局、图形和中文解释为本项目编写；没有复制这些网站的代码、字体、图片或视频，无新增运行依赖。参考获取日期：2026-10-12。

本地 `scripts/knowledge.js` 保存本主题原创概念说明、公式、操作问题和带作者/资料类型说明的延伸阅读 URL。`scripts/studio.js` 与 `styles/studio.css` 实现知识抽屉和公共导航；它们已复制到本目录，不依赖项目根部。外部链接仅在用户主动点击时打开，不预取或嵌入；核心说明离线可用。外部原文未再分发，原作者权利保留。D3、KaTeX 的版本和许可证不变。
