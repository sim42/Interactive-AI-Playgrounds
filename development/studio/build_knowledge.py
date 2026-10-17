"""Build local reading guides and copy the common offline shell into each lesson."""
import json
from pathlib import Path
import shutil
ROOT = Path(__file__).resolve().parents[2]

def c(title, text, task=None):
    return dict(title=title, text=text, **({'try': task} if task else {}))
def m(title, tex, text):
    return dict(title=title, tex=tex, text=text)
def s(title, url, kind, note):
    return dict(title=title,url=url,type=kind,note=note)
books = {
'machine-learning-algorithms': dict(title='数据如何变成判断', question='相同的点，为什么不同算法会画出不同的边界？', concepts=[
 c('先认清图上的四种角色','每个样本有两个特征 x₁、x₂，也就是它在图上的位置。标签是已知类别；预测是模型作出的判断。实心训练点参与计算，空心验证点用于观察新数据上的表现。','只移动一个训练点，再推进一轮；比较边界和验证指标如何改变。'),
 c('SVM：给分界线留出余地','支持向量机（Support Vector Machine）用一条直线分类。正确侧还不够：离边界太近的点也会受到惩罚。这里用逐样本次梯度更新演示线性、软间隔 SVM，并非完整二次规划求解器。','选 XOR 数据。即使多训练几轮，一条直线也无法正确分开对角的同类点。'),
 c('kNN：让附近的样本投票','k 近邻（k-Nearest Neighbors）不训练一条分界线。它先算查询点到训练点的距离，再选最近的 k 个，每点一票。增加 k 会改变参与投票的人。','固定数据和查询位置，将 k 从 1 改成 9。平滑的边界是否一定更准确？'),
 c('k-means：分组与移动交替进行','先把每个点分给最近的中心，再把每个中心移到组内平均位置；重复这两步。聚类不读取类别标签，中心数由你决定。','固定种子，单步对照“分配”和“移动”。中心移动时，所有点会一起移动吗？'),
 c('会拟合，不等于会泛化','训练误差衡量已用于学习的数据；验证误差衡量未参与更新的数据。如果反复依据验证结果调参，这些点也不能再冒充独立测试集。所有例子都是合成数据。')
], math=[
 m('SVM 的得分与间隔',r's=w_1x_1+w_2x_2+b,\quad r=ys','标签 y 为 +1 或 −1。r<0 表示分错；0≤r<1 表示分对但余地不够。只有 r≥1 时，这个样本的 hinge 损失为 0。'),
 m('从惩罚到参数更新',r'\ell=\max(0,1-ys)+\frac{\lambda}{2}\lVert w\rVert^2','学习率 η 决定沿负次梯度移动多远。图中的“损失→梯度→更新”来自同一份样本计算；边界处采用页面记录的分支约定。'),
 m('距离决定谁来投票',r'd_i=\sqrt{(x_1-x_{i1})^2+(x_2-x_{i2})^2}','这里两个特征使用同一数值范围，距离为欧氏距离。实际应用中特征单位相差很大时，必须先考虑缩放。'),
 m('中心是组内平均位置',r'\mu_j=\frac{1}{|C_j|}\sum_{x_i\in C_j}x_i','固定分组时，平均位置最小化组内平方距离和。k-means 的目标下降不代表一定找到了全局最优分组。')
], sources=[
 s('Support Vector Machines','https://scikit-learn.org/stable/modules/svm.html','官方文档 · 英文','核对间隔、正则化和线性 SVM 的边界。本页采用便于单步检查的微型求解过程。'),
 s('Nearest Neighbors','https://scikit-learn.org/stable/modules/neighbors.html','官方文档 · 英文','比较邻居数、距离和分类方式；理解 kNN 为什么对特征尺度敏感。'),
 s('K-means','https://scikit-learn.org/stable/modules/clustering.html#k-means','官方文档 · 英文','进一步阅读分配—更新、初始化和局部最优。')]),
'gradient-descent': dict(title='沿着坡度寻找低处', question='同一片地形，为什么有的走法直达谷底，有的绕路或发散？', concepts=[
 c('把两个参数看成一个位置','函数 f(x,y) 的高度是要降低的目标值；平面位置就是两个待调整参数。梯度是当前位置最陡的上升方向，取负号才是局部下降方向。','固定起点，先预测下一个点的方向，再按单步，看两个坐标分别改变多少。'),
 c('学习率是一脚迈多远','梯度下降（Gradient Descent）每一步重新测坡度，再移动。步子小通常更稳但更慢；步子过大可能越过谷底、来回振荡，甚至发散。','只改变学习率，并冻结一条对照轨迹。在相同步数下比较目标值。'),
 c('动量：记住最近的方向','动量（Momentum）把过去的更新方向累积起来，能减轻某些狭长谷地中的摇摆。惯性也可能让轨迹冲过最低处。β 越大，旧方向保留越久。'),
 c('自适应算法也有代价','RMSProp 和 Adam 根据过去的梯度调整不同坐标的步长。Adam 同时使用方向与平方梯度统计。它们依然依赖超参数，不能保证每一步都下降或找到全局最优。'),
 c('自定义函数是新的实验条件','输入表达式后需应用，旧轨迹会清空。定义域无效、不可导位置或数值溢出会给出反馈；图中有限范围也不是函数的整个世界。','试 f(x,y)=x^2+10*y^2。保持起点不变，观察两个方向的曲率差异。')
], math=[
 m('梯度下降的一步',r'\begin{pmatrix}x\cr y\end{pmatrix}_{t+1}=\begin{pmatrix}x\cr y\end{pmatrix}_t-\eta\begin{pmatrix}\partial f/\partial x\cr\partial f/\partial y\end{pmatrix}_t','η 为学习率。页面逐项给出当前坐标、两个偏导数、更新量与新目标值。局部线性近似不能保证大步移动仍会降低目标。'),
 m('动量保留历史方向',r'v_t=\beta v_{t-1}+g_t,\qquad \theta_{t+1}=\theta_t-\eta v_t','本课件的动量采用此约定：gₜ 为当前梯度，v₀=0。不同文献也会对梯度乘 (1−β)，学习率的数值不能直接混用。'),
 m('Adam 的两个记忆',r'm_t=\beta_1m_{t-1}+(1-\beta_1)g_t','平方梯度的滑动平均 vₜ 用 β₂ 更新；对 m、v 进行初期偏差修正后，使用 η m̂/(√v̂+ε) 更新。数学面板展示本次实际中间量。'),
 m('一个可手算的对照',r'f=x^2+10y^2,\qquad\nabla f=(2x,20y)','同样的坐标偏移，y 方向坡度大得多。普通梯度下降在狭长谷地容易横向摆动，这可以在等高线轨迹中直接观察。')
], sources=[
 s('Gradient descent, how neural networks learn','https://www.3blue1brown.com/lessons/gradient-descent','3Blue1Brown · 动画与图文 · 英文','从地形直觉进入高维参数优化，适合建立损失函数与梯度的联系。'),
 s('Why Momentum Really Works','https://distill.pub/2017/momentum/','Distill · 交互文章 · 英文','通过可操作的路径、曲率和动力学图像理解动量，适合做对照实验。'),
 s('Adam: A Method for Stochastic Optimization','https://arxiv.org/abs/1412.6980','原始论文 · 英文 · 进阶','核对 Adam 的矩估计、偏差修正和更新规则。先观察本页数值再阅读更容易。')]),
'monte-carlo-optimization': dict(title='随机搜索与模拟退火', question='暂时走向高处，有时为什么反而能走出局部低谷？', concepts=[
 c('优化与积分回答不同问题','本页寻找目标函数的较低位置，观察当前点、历史最好值与接受概率。蒙特卡洛积分则把样本贡献平均以估计总量，并观察估计误差；随机取点并不意味着两种任务相同。'),
 c('先把“探索”与“接受”分开','蒙特卡洛（Monte Carlo）方法利用随机采样。这里要观察四件事：候选点从哪里来、它有多高、是否被接受、历史最好是否更新。每一步都实际计算。','单步时同时看当前点、候选点和历史最优点。它们什么时候重合，什么时候不同？'),
 c('随机搜索：把预算花在全局','在给定方形范围内均匀抽取候选点，保留见过的最好值。它不读取梯度，也不会因为当前点在某个谷底就停止探索。有限次采样不能保证找出全局最低点。'),
 c('随机爬山：只接受改进','在当前点附近提出候选，只接受更低目标值。步长影响探索范围；步长小可能困在局部谷地，步长大也可能跳过狭窄的好区域。'),
 c('模拟退火：给上坡一个机会','模拟退火（Simulated Annealing）有时接受更差的候选，概率由高度差和温度决定。高温更容易探索；降温后逐渐趋向保守。温度为零时不接受更差候选。','固定函数、种子和步长，只改变初始温度。观察同一候选被接受的概率如何改变。'),
 c('“最好值下降”不等于“当前位置下降”','历史最优是目前见过的最低值，它不会变差；退火的当前位置则可以变差。比较算法时应固定函数、预算、起点及种子，不从一条随机轨迹推出普遍结论。')
], math=[
 m('先算候选的高度差',r'\Delta f=f(x^\prime,y^\prime)-f(x,y)','Δf≤0 表示候选不比当前点差；Δf>0 表示要爬升。模拟退火对后者使用概率规则，随机爬山直接拒绝。'),
 m('接受概率与随机数',r'p=\exp(-\Delta f/T)\quad(\Delta f>0,\ T>0)','抽取 u∈[0,1)，若 u<p 就接受。概率与本次是否接受是两回事，页面同时展示 p、u 和判断。T=0 使用明确分支而不除以零。'),
 m('逐渐降温',r'T_{t+1}=\alpha T_t,\qquad 0<\alpha\leq1','α 接近 1 时降温慢，更多预算用于探索；降温太快可能过早固定在局部谷地。这是教学用的几何降温，不保证有限预算内达到全局最优。'),
 m('记录最好，但不混淆当前',r'b_{t+1}=\min\bigl(b_t,f(x^\prime,y^\prime)\bigr)','b 是历史最好目标值。图中的当前轨迹展示算法实际接受的位置，最好值曲线展示迄今搜到的结果。')
], sources=[
 s('How Simulated Annealing Works','https://www.mathworks.com/help/gads/how-simulated-annealing-works.html','MathWorks · 官方说明 · 英文','比较候选生成、温度、接受和降温的角色。其实现细节与本页教学版本并不完全相同。'),
 s('Basin-hopping optimization','https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.basinhopping.html','SciPy · 官方文档 · 英文 · 延伸','阅读 Metropolis 接受概率以及随机探索与局部优化如何结合。本课件未实现 basin-hopping 的局部最小化子步骤。'),
 s('Optimization and root finding','https://docs.scipy.org/doc/scipy/reference/optimize.html','SciPy · 算法索引 · 英文','将本页方法放回更完整的局部与全局优化图景；这是延伸索引，不是课件运行依赖。')]),
'mlp-playground': dict(title='神经网络怎样学会分类', question='一个样本的误差，怎样变成每条连接的修改量？', concepts=[
 c('一个节点就是一段小计算','多层感知机（Multilayer Perceptron, MLP）的节点先做加权求和 z，再经过激活函数得到 a。节点里的小图展示它对整个输入平面的响应，连线表示参与计算的权重。','点击一个隐藏节点，再切换数学检查：找出它接收的输入、权重、偏置及计算结果。'),
 c('前向：把输入变成概率','一个样本从输入层出发，逐层传递。隐藏层组合特征，输出层用 sigmoid 将最后得分变成类别 1 的概率。推理只计算输出，不改变权重。','在推理模式推进一轮。比较开始与结束时的权重，解释为什么它们相同。'),
 c('误差：不仅看猜对或猜错','二元交叉熵（Binary Cross-Entropy）衡量预测概率与标签的差异。自信地猜错会有很大损失。损失是标量；梯度进一步说明每个数改变时损失怎样变。'),
 c('反向：沿连接分配影响','从输出的误差开始，链式法则把影响传回前面的节点。反向阶段展示偏导数和拟议修改量，尚未提交更新；最后一步才一起写入新参数。','选择一条权重。先看 ∂L/∂w 的符号，再预测增加它会使损失怎样改变，最后查看 Δw。'),
 c('宽度、深度与学习的边界','更多节点提供更灵活的函数，但不保证更快学会或在新数据上更好。训练点更新权重，验证点只评估；图上展示的是小模型的真实计算，不是大语言模型。','固定种子与数据，对照无隐藏层和带隐藏层的 XOR。不要同时改变学习率。')
], math=[
 m('单个节点的前向传播',r'z_j=\sum_i w_{ji}a_i+b_j,\qquad a_j=\phi(z_j)','aᵢ 是上一层输出，w 是连接权重，b 是偏置，φ 是激活函数。所有数值都可在数学检查中逐节点核对。'),
 m('从概率计算损失',r'L=-y\log p-(1-y)\log(1-p)','这里标签 y∈{0,1}，p 是正类概率。实际计算采用数值稳定的 logits 形式，避免极端概率直接取对数的溢出。'),
 m('输出层把误差变为梯度',r'\frac{\partial L}{\partial z}=p-y,\qquad\frac{\partial L}{\partial w_i}=(p-y)a_i','sigmoid 与二元交叉熵组合后，输出得分的梯度恰好是 p−y。对偏置的梯度也是 p−y；对权重还要乘输入。'),
 m('隐藏层的链式法则',r'\delta_j=\phi^\prime(z_j)\sum_k w_{kj}\delta_k','后层的影响沿每条连接传回，再乘当前激活函数的斜率。页面展示加和的各项，让“误差向后流”对应具体数值。'),
 m('梯度与真正更新的区别',r'\Delta w=-\eta\frac{\partial L}{\partial w},\qquad w_{new}=w+\Delta w','正梯度意味着增加权重会局部增加损失，所以沿负方向更新。Δw 是拟议变化量，不是概率意义上的期望；统一提交后网络才改变。')
], sources=[
 s('But what is a neural network?','https://www.3blue1brown.com/lessons/neural-networks','3Blue1Brown · 动画与图文 · 英文','用节点、权重和激活图像建立网络直觉，适合与本页节点特征图对照。'),
 s('What is backpropagation really doing?','https://www.3blue1brown.com/lessons/backpropagation','3Blue1Brown · 动画与图文 · 英文','理解损失如何影响不同层的权重，尤其适合配合本页逐层反向检查。'),
 s('TensorFlow Playground','https://playground.tensorflow.org/','TensorFlow · 在线交互实验','对照网络宽度、深度和特征图；本页另加入单样本数值追踪与离线运行。'),
 s('Neural Networks and Deep Learning · Chapter 2','http://neuralnetworksanddeeplearning.com/chap2.html','Michael Nielsen · 开放教材 · 英文','链式法则与反向传播的详细推导。作为进阶阅读，无需读完即可操作本页。')]),
'universal-approximation': dict(title='用简单形状拼出复杂函数', question='一层足够宽的网络，怎样逐渐逼近连续曲线？', concepts=[
 c('先做一条折线','在有限区间内取一组采样点，用直线连接相邻点。对于连续函数，足够密的采样可以让折线一致逼近目标；“连续”与“有限区间”是这里重要的条件。','先看同一函数的少量与较多采样点。尖峰附近需要多少点才看得出来？'),
 c('ReLU 是可以组合的折角','ReLU(t)=max(0,t)：左侧为零，右侧为直线。移动折角的位置，再调节系数，就能改变某处之后的斜率。多个折角相加，可以精确拼出采样折线。','逐个加入单元，观察每一条基函数的贡献，以及累加曲线在哪一段改变斜率。'),
 c('“一层”指一个隐藏层','这不是只有线性输出的网络。一个隐藏层提供多个非线性折角，输出层将它们相加。足够宽的单隐藏层在合适条件下具有很强表达能力。'),
 c('存在好参数，不等于能学到','万有近似定理谈的是表达能力：存在能让误差足够小的参数。它不承诺所需宽度、训练时间，也不保证有限样本与某次优化能找到这些参数。','手动改一个 ReLU 系数破坏折线，再恢复构造。对比后续多层网络逐步学习的过程。'),
 c('从曲线过渡到双变量曲面','前两阶段用一维曲线展示可核对的构造；第三阶段使用双变量连续函数，训练多层网络拟合曲面。此时采样数影响学习证据，网格误差衡量有限检查网格上的表现。','固定目标函数、种子、网络与训练预算，只改变采样点数；比较训练误差和网格误差。')
], math=[
 m('折线的斜率由相邻点决定',r'm_i=\frac{f(t_{i+1})-f(t_i)}{t_{i+1}-t_i}','tᵢ 是按顺序排列的采样位置。两点间斜率固定，在下一处采样点才改变。'),
 m('用 ReLU 表示折线',r'\begin{aligned}\hat f(x)={}&f(t_0)+m_0(x-t_0)\\&+\sum_{i=1}^{n-2}(m_i-m_{i-1})\operatorname{ReLU}(x-t_i)\end{aligned}','每个隐藏单元负责一次斜率变化。常数和基础斜率也可由偏置及 ReLU 单元在目标区间内实现；页面说明采用的具体基底。'),
 m('逼近精度的含义',r'\sup_{x\in K}|f(x)-\hat f(x)|<\varepsilon','对紧致区间或区域 K 上的连续函数，适当激活函数与足够宽度可提供任意小的逼近误差。这是存在性结论，有限图格不能单独证明它。'),
 m('实际拟合使用均方误差',r'\mathrm{MSE}=\frac1N\sum_{i=1}^{N}\bigl(\hat f(x_i,y_i)-f(x_i,y_i)\bigr)^2','N 为训练采样点数。网格误差在另一组固定位置计算，不参与参数更新；如果据此反复调参，它不能再称作独立测试。')
], sources=[
 s('A visual proof that neural nets can compute any function','http://neuralnetworksanddeeplearning.com/chap4.html','Michael Nielsen · 可视化教材 · 英文','用可组合的简单形状建立万有近似直觉。原文的构造与本页 ReLU 折线构造不同。'),
 s('Approximation by superpositions of a sigmoidal function','https://link.springer.com/article/10.1007/BF02551274','George Cybenko · 原始论文 · 英文 · 进阶','经典的单隐藏层存在性结果，原文使用 sigmoid 类函数；不要直接将其条件与本页 ReLU 构造混用。'),
 s('But what is a neural network?','https://www.3blue1brown.com/lessons/neural-networks','3Blue1Brown · 动画与图文 · 英文','补齐加权组合、激活函数和层的含义，再回到本页观察基函数叠加。')])
}
for name, book in books.items():
    topic = ROOT / 'topics' / name
    book['id'] = name
    (topic / 'scripts' / 'knowledge.js').write_text('/* Original local explanations; external reading opens only on a user click. */\nwindow.PlaygroundKnowledge = ' + json.dumps(book, ensure_ascii=False, indent=2) + ';\n')
    for file in ('studio.js','studio.css'):
        target = 'scripts' if file.endswith('.js') else 'styles'
        shutil.copy2(ROOT / 'development' / 'studio' / file, topic / target / file)
    html = (topic / 'index.html').read_text()
    if './styles/studio.css' not in html:
        html = html.replace('</head>', '<link rel="stylesheet" href="./styles/studio.css">\n<script defer src="./scripts/knowledge.js"></script>\n<script defer src="./scripts/studio.js"></script>\n</head>')
        (topic / 'index.html').write_text(html)
# New lessons own their original knowledge.js; keep their content and sync only the shell.
for topic in (ROOT / 'topics').iterdir():
    if topic.name in books or not (topic / 'scripts' / 'knowledge.js').exists():
        continue
    for file in ('studio.js', 'studio.css'):
        target = 'scripts' if file.endswith('.js') else 'styles'
        shutil.copy2(ROOT / 'development' / 'studio' / file, topic / target / file)
print('Built existing field guides and synced the shell for all local guides.')
