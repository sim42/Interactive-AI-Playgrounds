"""Original local field guides for the seven stochastic/simulation lessons."""
import json
import shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
COMMIT='f07e5016bd2dc55c6c5a6842c46a39b027e50f1e'
BASE='https://github.com/sim42/SCML/blob/'+COMMIT+'/'
R=BASE+'Chapter08/1.%20%E9%9A%8F%E6%9C%BA%E8%BF%87%E7%A8%8B%E5%92%8C%E7%AD%89%E6%A6%82%E7%8E%87%E5%8E%9F%E7%90%86.ipynb'
I=BASE+'Chapter08/2.%20%E8%92%99%E7%89%B9%E5%8D%A1%E7%BD%97%E6%96%B9%E6%B3%95.ipynb'
D=BASE+'Chapter09/4.%20%E5%88%86%E5%AD%90%E5%8A%A8%E5%8A%9B%E5%AD%A6%E6%A8%A1%E6%8B%9F.ipynb'
def c(title,text,task=''):return dict(title=title,text=text,**({'try':task} if task else {}))
def m(title,tex,text):return dict(title=title,tex=tex,text=text)
def src(title,url,note,kind='原始课件 · 中文'):return dict(title=title,url=url,note=note,type=kind)
books={
'random-number-generation':dict(title='随机数如何生成？',question='确定的规则，为什么能产生看起来随机的一串数？',concepts=[
c('种子是内部状态的起点','伪随机数生成器按照确定规则改变状态。同一种子、同一算法和同样的调用顺序，会得到同一序列。它适合重现实验，不能因此用于密码学。','生成一批数，重新开始，再比较前16个输出。'),
c('频率均匀不等于没有结构','直方图只检查每个区间出现多少次；相邻点散图检查前后两个数的关系。满周期也不保证序列在所有统计意义上都好。','只把乘数a从5改成4，观察状态环何时不再前进。'),
c('概率是区间的长度','均匀数u在[0,1)中取值。把区间按概率切成六段，就能生成带指定概率的离散结果。概率为零的段没有宽度。'),
c('从均匀分布到等待时间','指数分布用累积概率F(x)表示“等待不超过x”的概率。先抽u，再沿曲线反查x；改变λ只改变这一步映射。','固定种子，将λ加倍；对应等待时间是否减半？')],math=[
m('LCG 的一步',r's_{n+1}=(a s_n+c)\bmod m,\qquad u_n=s_{n+1}/m','小模数用于看见每个状态；m=16,a=5,c=1可走遍16个状态。大序列对照使用项目已有的32位教学生成器。'),
m('逆累积分布',r'F(x)=1-e^{-\lambda x},\quad x=-\log(1-u)/\lambda','u小于1，λ为正数。程序使用log1p提高接近零处的数值精度。'),
m('离散结果',r'P(X=k)=p_k,\quad \sum_{k=1}^{6}p_k=1,\quad p_k\ge0','累积概率确定各段右边界；结果由u落在哪一段决定。')],sources=[src('蒙特卡罗方法：随机数与分布变换',I,'保留LCG与逆累积分布的教学主线，改为可单步检查的浏览器实验。'),src('NumPy Random Generator','https://numpy.org/doc/stable/reference/random/generator.html','了解现代生成器与随机源的区别。本页不声称模拟NumPy实现。','官方文档 · 英文')]),
'random-processes':dict(title='随机交换与统计分布',question='公平的转移规则，为什么不会给出平坦的余额直方图？',concepts=[
c('先区分状态与观测量','完整状态包含所有人的余额；一个人的余额只是其中一个观测量。很多不同完整状态可以给出相同观测值。','观察3人模型中A=0与A=6各对应多少节点。'),
c('守恒不意味着个体不变','每次有效转账付款人减1、收款人加1，总额和平均值不变，个人余额和群体宽度仍会变化。'),
c('零余额的处理也是算法','每次均匀抽取付款、收款候选；付款人没有钱就跳过。若改为从有钱人中重新选择付款人，转移概率与平稳分布可能改变。'),
c('两种约束，两种长期行为','非负整数余额且总量固定时，可访问的完整状态有限。允许无限负债时，余额可继续展宽，不存在本例那种有限平衡分布。','两组用同一候选序列运行，比较均值和标准差。'),
c('经验分布不是平稳分布的证明','一条轨迹中相邻访问相关；有限人数、有限尝试仍有波动。这个守恒模型也不是对真实经济分配的预测。')],math=[
m('28个微观状态',r'\#\Omega=\binom{M+N-1}{N-1}=\binom82=28','N=3人，总额M=6。每个状态为非负整数三元组。'),
m('观测量的概率来自计数',r'P(m_1=k)=\frac{\binom{M-k+N-2}{N-2}}{\binom{M+N-1}{N-1}}','在完整状态均匀的平稳分布下，N=3,M=6时得到(7−k)/28。大系统可出现几何／指数近似，但有限系统一般不恰好是指数分布。'),
m('总量守恒',r'\sum_i m_i=M,\qquad \overline m=M/N','界面在每个完整交换后核对总量；转移、零余额跳过和自转账的计数之和等于尝试次数。')],sources=[src('随机过程和等概率原理',R,'资金交换、非负约束与统计分布的原始教学案例；本页补充完整状态枚举和计算边界。')]),
'monte-carlo-integration':dict(title='蒙特卡洛积分',question='怎样把随机样本变成一个总量的估计？',concepts=[
c('先把积分理解为累加','一维曲线下的有符号面积，等于区间宽度乘平均高度；二维曲面下的积分，等于底面区域面积乘平均高度。','编辑f(x)=x并使用[-1,1]，观察正负贡献怎样抵消。'),
c('一个点带来一份贡献','先确定位置，再求函数值，乘区域大小后加入累加器。估计使用全部贡献，图中为保持清晰只保留近期样本。'),
c('投点法的包围框必须可靠','四分之一圆位于单位方形；eˣ在[a,b]上不超过eᵇ。任意函数未必具有已知高度界，因此自定义函数采用均值法。'),
c('更多样本通常更稳，不保证每步更准','用独立重跑比较估计的分布。一次估计碰巧接近答案，不能证明方法的波动更小。'),
c('参考值与不确定性不是一回事','已知积分可计算实际误差；自定义函数不预知答案，标准误差只描述抽样波动。近似区间也有适用条件。')],math=[
m('均值估计',r'\widehat I=V\frac1N\sum_{i=1}^N f(X_i)','X独立均匀分布在区域内，V是区间长度或区域面积。'),
m('估计标准误差',r'\widehat{\mathrm{SE}}=s_Z/\sqrt N,\qquad Z_i=Vf(X_i)','s_Z为单点贡献的样本标准差。独立、有限方差条件下，N增加4倍，误差尺度大致减半。'),
m('投点估计π',r'\widehat\pi=4H/N','H是单位方形内落入四分之一单位圆的数量。二元命中比例采用Wilson近似区间，避免零命中或全命中时误报零宽区间。')],sources=[src('蒙特卡罗方法：积分与误差',I,'原课件的π、eˣ与多维积分案例在这里按贡献流程重排。')]),
'curse-of-dimensionality':dict(title='积分的维度灾难',question='相同计算预算，维数怎样改变积分难度？',concepts=[
c('每维加点会相乘','每维m个点，完整张量网格有mᵈ个组合。这里比较的是这一类网格，不代表所有确定性积分算法。','每维10点，从2维升到8维，计算量增加多少倍？'),
c('预算相同，实际开销也要看清','网格需要完整遍历一个mᵈ布局，可能用不完上限；随机采样可以用满预算。页面分别显示实际求值数。'),
c('投影不能替代高维函数','底色把未显示坐标固定在中点；样本点仅投影前两维。完整高维函数值用于估计，不能从底色读出任意样本的高度。'),
c('高维优势有条件','蒙特卡洛的1/√N指数不显含维数，但方差、相对误差和求值成本可能随维度恶化。窄峰会使两种方法都困难。','固定预算，把平滑函数换成窄峰，再独立重跑。')],math=[
m('完整张量网格',r'N_{\mathrm{grid}}=m^d,\quad m=\lfloor B^{1/d}\rfloor','B为每种方法的预算上限；程序不执行超过100,000次的网格。'),
m('可分离参考积分',r'\int_{[a,b]^d}e^{-\sum_j x_j^2}\,dx=\left(\int_a^b e^{-x^2}\,dx\right)^d','利用可分离结构给出参考值；一维高斯积分使用erf数值近似。此特殊结构不是一般自定义函数的捷径。'),
m('误差中的维度',r'\mathrm{Var}(\widehat I)=V^2\mathrm{Var}(f(X))/N','V和函数值方差都可能随维度变化，不能由1/N断言高维没有代价。')],sources=[src('蒙特卡罗方法：高维积分',I,'保留exp(−Σx²)和窄峰例子，加入明确预算、切片和失败状态。')]),
'variance-reduction':dict(title='让每个样本更有用',question='怎样改变采样方式，同时保持估计的意义？',concepts=[
c('分层先保证覆盖','将区域分成等体积格子，在每层独立采样。先求每层均值，再按体积相加；误差也按层分别计算。'),
c('对偶变量是一对贡献','u和1−u共享一个随机输入。在单调函数上常能抵消波动，但对称函数可能没有收益。把两次求值算成一对独立估计单位。'),
c('更常去重要区域，需要修正权重','从密度q采样后，每个点贡献f/q。分布必须覆盖有贡献的区域；本页二维提议混入10%均匀密度以保持覆盖。','把提议中心移离函数峰值，观察最大贡献和重复估计波动。'),
c('没有命中不等于概率为零','正态大于5的事件极少见。普通抽样零命中时只能说本轮未见；尾部重要性采样把计算用于相关区域，并用密度比修正。'),
c('错误的提议也会更差','少数巨大权重可主导答案。比较应使用相同函数求值预算和多次独立重跑，不能挑选一次幸运结果。')],math=[
m('重要性估计',r'I=\int f(x)\,dx=\mathbb E_q[f(X)/q(X)]','这是普通重要性估计，没有再把权重除以权重之和。'),
m('对偶变量的独立单位',r'Z_i=\frac{f(U_i)+f(1-U_i)}2','先对每对求均值，再用这些独立均值估计标准误差。总求值预算按2的倍数取整。'),
m('分层的误差',r'\widehat I=\sum_h W_h\overline f_h,\quad \widehat{\mathrm{SE}}^2=\sum_h W_h^2s_h^2/n_h','W_h为各层体积。至少每层2个样本后才有层内样本方差。'),
m('零命中的上界',r'p_{\mathrm{upper}}=1-0.05^{1/N}','N次独立伯努利试验零命中时的95%单侧上界，约为3/N；不是概率等于零的证明。')],sources=[src('蒙特卡罗方法：方差缩减',I,'保留正态尾部重要性采样，并增加贡献账本与方法特有误差估计。'),src('Monte Carlo: Importance Sampling','https://artowen.su.domains/mc/Ch-var-is.pdf','重要性权重、方差与不合适提议分布的理论参考。','作者教材 · 英文')]),
'event-driven-simulation':dict(title='模拟的时间怎样前进？',question='碰撞发生在两次检查之间，会有什么后果？',concepts=[
c('三种时间不要混淆','物理时间描述模拟世界；固定时间步决定何时检查；播放帧只决定画面何时显示。改变播放速度不改变物理结果。'),
c('事件驱动提前预报','硬球碰撞之间匀速，因此能解出接触时刻，直接推进到事件，再改变速度。连续受力时不能直接套用这种匀速预报。'),
c('预报也有失效日期','一个球先与别人相撞，原来的速度不再有效。事件保存粒子版本，取出时核对；失效事件必须跳过。','选择三球接力，查看旧预报的保存版本与当前版本。'),
c('固定步基线的边界','本页只在每步末检查重叠，用来展示延迟或漏碰撞；加入连续碰撞检测的固定步方法也可避免穿越。'),
c('守恒不是唯一验收','漏掉碰撞时速度可能完全不变，动能仍可守恒。因此还要检查碰撞次数、时刻和轨迹。共享粒子的同时接触会明确停止。')],math=[
m('接触时刻',r'\|\Delta r+\Delta v\tau\|^2=(r_a+r_b)^2','展开为二次方程，选择相互靠近且最早的非负根；无合法根就没有未来碰撞事件。'),
m('弹性碰撞冲量',r'J=-\frac{2(v_b-v_a)\cdot n}{1/m_a+1/m_b}','n从a指向b，只有相互靠近时施加冲量。a速度减J n/m_a，b速度加J n/m_b。'),
m('无外力的守恒量',r'P=\sum_i m_i v_i,\qquad K=\frac12\sum_i m_i\|v_i\|^2','本页开放空间没有墙与外力，弹性碰撞应保持总动量与动能。')],sources=[src('Event-Driven Simulation','https://algs4.cs.princeton.edu/61event/index.php','硬球碰撞、事件队列和失效预报的教学参考。','Princeton 教材 · 英文'),src('分子动力学模拟',D,'本课件作为原分子动力学主题前的数值模拟桥梁，事件队列是新增内容。')]),
'molecular-dynamics':dict(title='从粒子受力到分子运动',question='局部相互作用如何形成可观测的集体运动？',concepts=[
c('势能坡度决定力','势能下降最快的方向就是力的方向。距离很小时强排斥，稍远时可吸引。标准LJ势的σ是势能零点，不是最低点。'),
c('位置更新后，力也要重新计算','Velocity Verlet先用旧速度和旧力求新位置，再用全部新位置重算力，最后用新旧力平均更新速度。每个阶段对应实际模型状态。'),
c('周期边界表示重复的盒子','粒子穿出一侧会从另一侧出现；相互作用取最近镜像，角落也须处理。每对粒子的势能只计一次。'),
c('截断势与力必须一致','本页盒内用移力截断：势与力在截断处都连续到零。曲线、力和能量计算都使用同一修改后的函数。'),
c('冷却是外界干预','速度缩放会取走动能，所以总能量可变；界面将这笔外界功扣除后再检查数值误差。一次缩放不能称为正确的NVT采样。','先预测0.7倍速度对应多少动能，再点击冷却核对。'),
c('模型的边界','二维经典约化模型不包含电子或量子效应。温度自由度、速度分布与三维不同；不能由小系统聚集现象推出真实材料相变温度。')],math=[
m('标准 LJ 势',r'U(r)=4\epsilon[(\sigma/r)^{12}-(\sigma/r)^6],\quad F=-U\prime(r)','最小值位于r=2^(1/6)σ；本页截断模型修改了函数，其零点与最低点也随之变化。'),
m('移力截断',r'U_s=U(r)-U(r_c)-(r-r_c)U\prime(r_c),\quad F_s=F(r)-F(r_c)','仅r<rc使用；超过截断两者为0。势与力必须同时修改，不能只平移能量却随意修改力。'),
m('Velocity Verlet',r'r_{t+h}=r_t+v_th+\frac{F_t}{2m}h^2,\quad v_{t+h}=v_t+\frac{F_t+F_{t+h}}{2m}h','更新在同一份粒子状态上进行；普通教学电脑中以小粒子数分批计算。'),
m('二维温度',r'T^*=\frac{2K}{2N-2}','m=kB=1的约化单位，盒内去掉整体平动。两个粒子的演示只读间距，不把该小系统温度当作热平衡结论。')],sources=[src('分子动力学模拟',D,'LJ势、Verlet、周期边界与能量交换的原始教学案例；本页重新实现一致的截断力与势。'),src('LAMMPS: Lennard-Jones','https://docs.lammps.org/pair_lj.html','核对标准LJ定义及σ与势阱最低点的区别。','官方文档 · 英文'),src('LAMMPS: Temperature','https://docs.lammps.org/compute_temp.html','核对动能、维数和扣除的自由度。','官方文档 · 英文')])}
for slug,book in books.items():
    topic=ROOT/'topics'/slug
    book['id']=slug
    (topic/'scripts'/'knowledge.js').write_text('/* Original local explanations; reading links open only by user action. */\nwindow.PlaygroundKnowledge = '+json.dumps(book,ensure_ascii=False,indent=2)+';\n')
    ref=topic/'references';ref.mkdir(exist_ok=True)
    license_source=ROOT/'topics'/'random-number-generation'/'references'/'SCML-LICENSE.txt'
    if not (ref/'SCML-LICENSE.txt').exists():shutil.copy2(license_source,ref/'SCML-LICENSE.txt')
    (ref/'SCML-NOTES.md').write_text('# 原课件与本地改写\n\n来源：sim42/SCML，提交 '+COMMIT+'，研究日期2026-10-16。\n\n'+ '\n\n'.join(x['title']+'：'+x['text'] for x in book['concepts'])+'\n\n以上为本项目原创中文解释与重设计摘要；原课件链接及适用范围见 scripts/knowledge.js。使用的原课件案例在CC0范围内重写，许可随本目录保存。未复制外链图片或未获许可的正文。\n')
    (topic/'THIRD_PARTY.md').write_text('# 来源与第三方资源\n\n- SCML 原始课件：提交 `'+COMMIT+'`，研究日期2026-10-16。参考范围与原文链接在本地 `references/SCML-NOTES.md` 和 `scripts/knowledge.js`；许可 `references/SCML-LICENSE.txt`（CC0 1.0）。数值内核与界面重新编写，未直接移植Notebook运行依赖或外链图片。\n- D3 7.9.0：`vendor/d3.v7.9.0.min.js`；来源 https://d3js.org/ ，各组成依赖许可证位于 `vendor/d3-licenses/`。沿用本仓库固定本地构建；资源校验值位于 `vendor/SHA256SUMS.txt`。\n- KaTeX 0.19.0：`vendor/katex/`，来源 https://katex.org/ ，许可证 `vendor/katex/LICENSE`；所需字体全部在本地。\n- `styles/lab.css`、`scripts/lab.js` 与 studio 文件来自本仓库开发源文件，发布时复制进本主题；没有运行时跨主题引用。\n- 其余外部教材只作为开发参考和用户主动点击的延伸阅读。未打包外部网页或视频，核心知识已在本地用原创中文解释。\n')
print('Built seven local field guides with provenance and license records.')
