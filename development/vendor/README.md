# 仅供开发：本地第三方资源构建

学生只需主题里的成品，不使用这个目录或任何命令。

依赖版本固定在package.json。D3按d3-entry.mjs选出图表/交互所需功能，esbuild生成传统全局脚本；不引入d3-fetch或d3-dsv的动态CSV函数编译。KaTeX复制JS、CSS、MIT许可及所有WOFF2字体，删除CSS内WOFF/TTF后备引用。递归保存D3完整依赖许可证，并生成每主题的SHA-256清单。

开发者在本目录执行`npm install --ignore-scripts`及`npm run build`。构建将更新各主题vendor成品，随后须重跑资源审计及独立断网file://验收。output和node_modules仅为开发产物，不放入交付ZIP。2026-10-10发布所用的预构建资源已保存在各主题vendor内；源选择与本脚本供后续维护。
