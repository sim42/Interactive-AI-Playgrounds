"""Build the self-contained course gallery. Original SVG concept illustrations."""
from pathlib import Path
import math
ROOT=Path(__file__).resolve().parents[1]

def svg(inner):
    return '<svg viewBox="0 0 440 190" aria-hidden="true" focusable="false">'+inner+'</svg>'

def network():
    xs=[76,172,268,364]; ys=[[70,120],[43,95,147],[56,110,162],[94]]
    out=''
    for l in range(3):
        for i,y in enumerate(ys[l]):
            for j,z in enumerate(ys[l+1]):
                color='#aa97c2' if (i+j)%2 else '#bba991'
                out+=f'<path d="M{xs[l]} {y} L{xs[l+1]} {z}" stroke="{color}" stroke-width="{1+(i+j)%3*.4}" opacity=".6"/>'
    for l,x in enumerate(xs):
        for i,y in enumerate(ys[l]):
            out+=f'<circle cx="{x}" cy="{y}" r="16" fill="{["#faf8f1","#eee7f4","#e5edf1","#e8dbbc"][l]}" stroke="#887e93"/>'
            if l in (1,2):
                out+=f'<path d="M{x-10} {y+6} Q{x} {y+6} {x+2} {y-4} T{x+10} {y-6}" fill="none" stroke="#75628f" stroke-width="1.4"/>'
    return svg(out)

def contour(random=False):
    out=''
    for i in range(6):
        out+=f'<ellipse cx="222" cy="99" rx="{28+i*28}" ry="{10+i*12}" transform="rotate(-18 222 99)" fill="none" stroke="{["#806690","#9680a4","#ab96b6","#bbadbd","#d3c6ce","#e1d7db"][i]}" stroke-width="1.4"/>'
    pts=[(78,50),(144,132),(182,69),(203,116),(217,90),(222,100)] if not random else [(64,65),(112,111),(173,58),(189,140),(248,84),(211,103)]
    out+='<polyline points="'+' '.join(f'{x},{y}' for x,y in pts)+'" fill="none" stroke="#bc7b4f" stroke-width="2"'+(' stroke-dasharray="5 4"' if random else '')+'/>'
    for i,(x,y) in enumerate(pts): out+=f'<circle cx="{x}" cy="{y}" r="{4 if i<len(pts)-1 else 6}" fill="{ "#fffefa" if i<len(pts)-1 else "#8f4f2c"}" stroke="#bc7b4f" stroke-width="1.5"/>'
    return svg(out)

def fit():
    pts=[(25+i*3.25,99-52*math.sin(i/18)+.12*i) for i in range(121)]
    out='<path d="M25 155H420M25 22V155" fill="none" stroke="#c3b9a9"/>'
    out+='<polyline points="'+' '.join(f'{x:.1f},{y:.1f}' for x,y in pts)+'" fill="none" stroke="#4c7593" stroke-width="2.5"/>'
    chosen=pts[::20]
    out+='<polyline points="'+' '.join(f'{x:.1f},{y:.1f}' for x,y in chosen)+'" fill="none" stroke="#bf824b" stroke-width="2"/>'
    for x,y in chosen: out+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#fffefa" stroke="#bf824b" stroke-width="1.5"/>'
    return svg(out)

def points():
    out='<path d="M215 17L160 176" stroke="#b8a5c8" stroke-width="50" opacity=".13"/><path d="M215 17L160 176" stroke="#80708d" stroke-width="2"/>'
    for k,(cx,cy,col) in enumerate([(116,78,'#557fa2'),(300,116,'#b67d46')]):
        for i in range(16):
            x=cx+math.sin(i*2.4)* (15+i*3); y=cy+math.cos(i*2.4)*(10+i*2.4)
            out+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.5" fill="{col}" opacity=".85"/>'
    return svg(out)
lessons=[
 ('machine-learning-algorithms','01','从数据到判断','简单机器学习','拖动一个点，观察边界为什么改变。逐步核对距离、投票、间隔与权重更新。','SVM · kNN · k-means',points()),
 ('gradient-descent','02','从坡度到方向','梯度下降','在同一片地形上改变步长和走法。看懂收敛、振荡，以及动量留下的轨迹。','自定义函数 · 3D 地形 · 算法对照',contour()),
 ('monte-carlo-optimization','03','从随机到探索','蒙特卡洛优化','走向高处也可能是一条出路。逐步检查候选、接受概率和历史最优。','随机搜索 · 爬山 · 模拟退火',contour(True)),
 ('mlp-playground','04','从误差到学习','神经网络 Playground','看看每个节点学到了什么，再追踪一个样本的前向、损失、反向与参数更新。','节点特征图 · 单样本计算 · 二分类',network()),
 ('universal-approximation','05','从折角到曲面','万有近似','从一条采样折线出发，用 ReLU 逐段拼接，再过渡到多层网络的曲面拟合。','可调采样 · 基函数组合 · 二元回归',fit())]
cards=''
for id,n,kicker,title,desc,tags,art in lessons:
    cards+=f'''<article class="lesson"><a class="lesson-cover" href="./topics/{id}/index.html" tabindex="-1" aria-hidden="true"><span class="lesson-number">{n} / EXPERIMENT</span>{art}<span class="cover-arrow">↗</span></a><div class="lesson-body"><p class="kicker">{kicker}</p><h2><a href="./topics/{id}/index.html">{title}<span aria-hidden="true"> ↗</span></a></h2><p class="description">{desc}</p><div class="lesson-foot"><span>{tags}</span><a href="./dist/{id}.zip" download aria-label="下载{title}离线课件">ZIP ↓</a></div></div></article>'''
html='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="五个可离线运行的中文 AI 交互实验。改变条件，逐步看见计算。"><title>Interactive AI Playgrounds · 交互式人工智能实验室</title><style>
:root{color-scheme:light;--bg:#faf8f1;--ink:#24211e;--muted:#696258;--line:#ded8cb;--accent:#62518b}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}a{color:inherit;text-decoration:none}a:focus-visible,summary:focus-visible{outline:3px solid #7c3aed;outline-offset:5px}p,h1,h2,h3{margin:0}.site-nav{max-width:1260px;margin:auto;padding:18px 32px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);gap:16px}.brand{font-weight:750;letter-spacing:-.4px;display:flex;gap:10px;align-items:center}.brand-mark{display:grid;place-items:center;width:29px;height:29px;border:1px solid #8d7ba5;border-radius:9px;color:var(--accent);font:italic 25px Georgia,serif}.site-nav a{font-size:13px;color:var(--muted);min-height:44px;display:inline-flex;align-items:center;gap:6px}.nav-links{display:flex;gap:24px}.site-nav a:hover{color:var(--accent)}main{max-width:1260px;margin:auto;padding:44px 32px 36px}.hero{display:flex;align-items:flex-end;justify-content:space-between;gap:36px;padding-bottom:36px}.overline{font-size:11px;font-weight:650;letter-spacing:2.5px;color:var(--accent);margin-bottom:13px}h1{font:600 44px/1.35 "Songti SC","STSong","SimSun",Georgia,serif;letter-spacing:1px}h1 em{font-style:normal;color:var(--accent)}.intro{font-size:15px;max-width:680px;color:var(--muted);line-height:1.8;margin-top:16px}.hero-side{min-width:214px;text-align:right;padding-bottom:4px}.download-all{display:inline-flex;align-items:center;gap:24px;padding:12px 18px;border:1px solid #62518b;border-radius:10px;font-size:14px;color:#fffefa;background:#62518b;min-height:48px;transition:background .16s}.download-all:hover{background:#514274}.offline-note{font-size:12px;color:var(--muted);margin-top:10px}.collection-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 0;border-top:1px solid var(--line)}.collection-head h2{font-size:14px;letter-spacing:.4px;font-weight:650}.collection-head span{font-size:12px;color:var(--muted)}.lessons{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:24px}.lesson{grid-column:span 2}.lesson:nth-child(n+4){grid-column:span 3}.lesson{min-width:0;background:#fffefa;border:1px solid #ded8cb;border-radius:14px;overflow:hidden;transition:transform .2s,box-shadow .2s,border-color .2s}.lesson:hover{transform:translateY(-3px);border-color:#b8abc4;box-shadow:0 9px 28px #47392a0b}.lesson-cover{position:relative;display:block;background:#f3efe5;border-bottom:1px solid #e6dfd1;height:176px;overflow:hidden}.lesson:nth-child(2) .lesson-cover{background:#f2edf1}.lesson:nth-child(3) .lesson-cover{background:#f4efe4}.lesson:nth-child(4) .lesson-cover{background:#eeeef0}.lesson:nth-child(5) .lesson-cover{background:#edf1ee}.lesson-cover svg{display:block;width:100%;height:100%}.lesson-number{position:absolute;top:14px;left:18px;font-size:9px;letter-spacing:1.7px;color:#817769;font-weight:650}.cover-arrow{position:absolute;bottom:12px;right:16px;font-size:20px;color:#80738d}.lesson-body{padding:21px 22px 0}.kicker{color:#7a6a88;font-size:11px;letter-spacing:1px;margin-bottom:5px}.lesson h2{font:600 24px/1.4 "Songti SC","STSong","SimSun",Georgia,serif;letter-spacing:.3px}.lesson h2 a{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:34px}.lesson h2 span{font:16px system-ui;color:#9b8ba9;opacity:0}.lesson h2 a:hover{color:var(--accent)}.lesson h2 a:hover span{opacity:1}.description{font-size:14px;color:#696258;line-height:1.8;margin-top:12px;min-height:76px}.lesson-foot{border-top:1px solid #e6dfd1;margin-top:16px;display:flex;justify-content:space-between;gap:10px;align-items:center;min-height:53px}.lesson-foot span{font-size:10px;line-height:1.7;letter-spacing:.2px;color:#787065}.lesson-foot a{font-size:11px;white-space:nowrap;color:#62518b;min-height:44px;display:flex;align-items:center}.lesson-foot a:hover{text-decoration:underline}.guide{margin-top:42px;border-top:1px solid var(--line);display:grid;grid-template-columns:1fr 1fr 1fr;gap:36px;padding-top:28px}.guide .step{font:italic 22px Georgia,serif;color:#9b8aa9;margin-bottom:6px}.guide h3{font-size:15px;font-weight:650}.guide p{font-size:13px;color:#696258;line-height:1.8;margin-top:7px}.guide details{font-size:13px;color:#696258}.guide summary{cursor:pointer;padding:8px 0;min-height:44px}footer{border-top:1px solid var(--line);margin-top:32px;padding-top:20px;display:flex;justify-content:space-between;gap:16px;color:#817769;font-size:11px}footer a{color:#62518b;text-decoration:underline;text-underline-offset:3px}
@media(min-width:1650px){main{padding-top:54px}.lesson-cover{height:200px}.description{min-height:76px}}@media(max-width:1060px){.lesson,.lesson:nth-child(n+4){grid-column:span 1}.lessons{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{align-items:start}h1{font-size:37px}.description{min-height:52px}}@media(max-width:700px){.site-nav{padding:10px 20px}.nav-links{gap:14px}.site-nav .nav-info{display:none}main{padding:28px 20px}.hero{display:block;padding-bottom:28px}h1{font-size:33px}.hero-side{text-align:left;margin-top:22px}.offline-note{display:inline-block;margin-left:10px}.collection-head{align-items:start}.collection-head span{max-width:150px;text-align:right}.lessons{gap:18px;grid-template-columns:1fr}.lesson-cover{height:175px}.description{min-height:0}.guide{grid-template-columns:1fr;gap:20px}.guide .step{float:left;margin-right:14px}.guide p{padding-left:35px}.guide h3{padding-top:4px}footer{display:block}footer span{display:block;margin-bottom:8px}.brand{font-size:14px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}.lesson:hover{transform:none}}
</style></head><body><nav class="site-nav" aria-label="课程导航"><span class="brand"><span class="brand-mark" aria-hidden="true">∿</span>Interactive AI Playgrounds</span><div class="nav-links"><a href="#guide" class="nav-info">使用指南</a><a href="https://github.com/sim42/Interactive-AI-Playgrounds" target="_blank" rel="noopener noreferrer" data-external>GitHub ↗</a></div></nav><main><header class="hero"><div><p class="overline">A SMALL LAB FOR BIG IDEAS / 人工智能交互实验室</p><h1>让抽象的算法，<em>变得可见。</em></h1><p class="intro">改变一个条件，沿着计算走一步。<br>从数据的边界，到神经网络的每一次学习，用五个实验建立自己的直觉。</p></div><div class="hero-side"><a class="download-all" href="./dist/ai-interactive-courseware.zip" download>下载全部离线课件 <span aria-hidden="true">↓</span></a><p class="offline-note">无需安装 · 解压后双击打开</p></div></header><section aria-label="课件目录"><div class="collection-head"><h2>选择一个问题，开始探索</h2><span>05 个实验 / 中文 / 本地实际计算</span></div><div class="lessons">'''+cards+'''</div></section><section id="guide" class="guide" aria-label="学习与使用指南"><div><div class="step">01</div><h3>先预测，再动手</h3><p>每个实验有默认例子。调整一个参数，再单步或播放，观察数据、数值与图形如何一起变化。</p></div><div><div class="step">02</div><h3>带着问题打开知识手册</h3><p>每页右上角提供直觉、数学关系与精选阅读。阅读时暂停实验，关闭后从当前状态继续。</p></div><div><div class="step">03</div><h3>把整个实验带走</h3><p>下载 ZIP 并完整解压，双击 index.html。每个主题可单独复制；实验和本地手册无需网络。</p><details><summary>离线与兼容说明</summary><p>外部阅读和 GitHub 链接需主动联网打开，不影响核心实验。实际验证范围与未测项见每个主题的 README.md；现代桌面 Chrome 和 Firefox 为本轮验收目标。</p></details></div></section><footer><span>Interactive AI Playgrounds · 为理解而实验<br>封面为原创概念示意；实验页中的图形与指标来自实际计算。</span><span>设计参考 <a href="https://ml.kanaries.net/playground" target="_blank" rel="noopener noreferrer" data-external>Kanaries</a> 与 <a href="https://www.3blue1brown.com/" target="_blank" rel="noopener noreferrer" data-external>3Blue1Brown</a><br>独立离线课件 · 2026</span></footer></main></body></html>'''
(ROOT/'index.html').write_text(html)
print('Built self-contained course gallery.')
