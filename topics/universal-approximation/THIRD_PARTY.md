# 本地第三方资源与设计参考（2026-10-10）

## 实际运行资源

- **D3 7.9.0**：`vendor/d3.v7.9.0.min.js`。来源 https://github.com/d3/d3/tree/v7.9.0 ，npm固定版本；ISC及组件许可证保存在`vendor/d3-licenses/`。用esbuild 0.25.12预先打包为传统全局脚本，选用坐标/轴/形状/数据绑定/拖动/等高线等功能；没有数据下载、CSV编译与模块加载代码。课件运行不需要构建。官方UMD/离线说明 https://d3js.org/getting-started 。
- **KaTeX 0.19.0**：`vendor/katex/`。来源 https://github.com/KaTeX/KaTeX/releases/tag/v0.19.0 ，npm固定版本；MIT许可在该目录`LICENSE`。保留JS、样式和所有WOFF2字体，CSS仅移除现代目标浏览器不需要的WOFF/TTF后备项。字体全部在主题内，不请求远程资源；只用于排版本地数学公式，不执行算法。

获取日期：2026-10-10。所有模型、数据与数值仍由本主题代码实际计算；图表库负责呈现。第三方资源源码校验见本目录`vendor/SHA256SUMS.txt`。

## 借鉴的交互与布局

- **ESandML/ANN-Demo**：https://github.com/ESandML/ANN-Demo ，提交 `b4329be38989bd738e055ac377d4643786a4321e`，MIT（2024 Edward Sanderson）。阅读 PyTorch notebook 中目标/训练/验证区分及“加权输入→激活→输出权重→相加”的小图阵列；借鉴逐单元分解与同步显示数值的布局，不复制代码、文字或图形。它依赖 Python/Colab，不能直接用作离线网页。
- **AI Geotech UAT**：https://kks32-courses.github.io/ai-geotech/03-mlp/uat.html ，仓库提交 `e79d12fb85b639ff0054e88fb523daa7f51dd2ea`，CC BY-SA 4.0（仓库 LICENSE.md）。阅读实际 ReLU 曲线/单元开关/网络结构与源 `docs/03-mlp/uat.md`；借鉴贡献与求和并列，以及条件说明紧邻实验。没有复制源代码或内容，也不采用页面的外部嵌入。
- **Michael Nielsen《Neural Networks and Deep Learning》Chapter 4**：https://neuralnetworksanddeeplearning.com/chap4.html ，源码 https://github.com/mnielsen/nnadl_site ，提交 `432a38f0d08330ade884fa4859e490919d020fd8`。网页页脚声明 CC BY-NC 3.0。查看参数可调曲线及 `js/chap4.js`、`js/scrubbable.js` 的交互组织，借鉴“调参数立即看响应”的方式；本主题重新实现 ReLU 机制，未复制该书文字、图片或代码。

研究日期 2026-10-10。以上项目仅为设计参考，未成为运行依赖；详细取舍见本地 `references/design-research.md`。

## 2026-10-12 视觉参考与知识阅读

本轮界面借鉴 [Kanaries](https://ml.kanaries.net/playground) 的暖纸配色、清晰分组与标题层次，以及 [3Blue1Brown](https://www.3blue1brown.com/) 的数学叙事节奏。布局、图形和中文解释为本项目编写；没有复制这些网站的代码、字体、图片或视频，无新增运行依赖。参考获取日期：2026-10-12。

本地 `scripts/knowledge.js` 保存本主题原创概念说明、公式、操作问题和带作者/资料类型说明的延伸阅读 URL。`scripts/studio.js` 与 `styles/studio.css` 实现知识抽屉和公共导航；它们已复制到本目录，不依赖项目根部。外部链接仅在用户主动点击时打开，不预取或嵌入；核心说明离线可用。外部原文未再分发，原作者权利保留。D3、KaTeX 的版本和许可证不变。
