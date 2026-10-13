(function (root) {
  'use strict';
  const Lab = root.MachineLearningLab = root.MachineLearningLab || {};
  const DEFAULTS = Object.freeze({algorithm:'svm', dataset:'separable', seed:42, eta:0.08, lambda:0.04, k:5, clusters:2, queryX:0.15, queryY:0.15, interval:650});
  function rng(seed) {let a=seed>>>0; return function () {a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(array, random) {const out=array.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
  function point(random, kind, i, split) {
    let x,y,label;
    const jitter=()=> (random()+random()+random()-1.5);
    if(kind==='xor') {const group=i%4;const sx=group<2?-1:1;const sy=group%2?-1:1;x=sx*1.22+jitter()*0.44;y=sy*1.22+jitter()*0.44;label=sx*sy>0?1:-1;}
    else {label=i%2===0?1:-1;const spread=kind==='overlap'?1.02:0.43;const center=kind==='overlap'?0.52:1.10;x=label*center+jitter()*spread;y=label*0.65+jitter()*spread;}
    return {id:split==='train'?i+1:25+i,x,y,label,split};
  }
  function generateData(kind, seed) {const a=rng(seed), b=rng(seed+19237);return {train:Array.from({length:24},(_,i)=>point(a,kind,i,'train')),validation:Array.from({length:12},(_,i)=>point(b,kind,i,'validation'))};}
  function validateConfig(config) {
    const c=Object.assign({},DEFAULTS,config);
    if(!['svm','knn','kmeans'].includes(c.algorithm)) throw Error('未知算法。');
    if(!['separable','xor','overlap'].includes(c.dataset)) throw Error('未知数据例子。');
    for (const [name,min,max] of [['seed',1,999999],['eta',0.005,0.5],['lambda',0,1],['k',1,15],['clusters',2,5],['queryX',-2.5,2.5],['queryY',-2.5,2.5],['interval',80,1800]]) if(typeof c[name]!=='number'||!Number.isFinite(c[name])||c[name]<min||c[name]>max) throw Error(name+' 超出允许范围。');
    if(!Number.isInteger(c.seed)||!Number.isInteger(c.k)||c.k%2!==1||!Number.isInteger(c.clusters)) throw Error('种子、簇数应为整数，k 应为奇数整数。');
    c.edits=validateEdits(c.edits===undefined?[]:c.edits);
    return c;
  }
  function validateEdits(edits) {
    if(!Array.isArray(edits)||edits.length>24)throw Error('最多修改24个训练样本。');
    const ids=new Set();
    return edits.map(p=>{
      if(!p||!Number.isInteger(p.id)||p.id<1||p.id>24||ids.has(p.id))throw Error('训练样本编号应为1–24且不重复。');
      ids.add(p.id);
      if(![p.x,p.y].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=-2.5&&n<=2.5)||![1,-1].includes(p.label))throw Error('样本坐标应为−2.5至2.5，标签只能是A或B。');
      return {id:p.id,x:p.x,y:p.y,label:p.label};
    });
  }
  function editSample(config,id,changes) {
    const c=validateConfig(config),data=generateData(c.dataset,c.seed);
    const old=c.edits.find(p=>p.id===id)||data.train.find(p=>p.id===id);
    if(!old)throw Error('只能编辑训练样本。');
    const next={...old,...changes,id};
    return validateConfig({...c,edits:c.edits.filter(p=>p.id!==id).concat(next)});
  }
  function score(w,b,p) {return w[0]*p.x+w[1]*p.y+b;}
  function predictSvm(w,b,p) {return score(w,b,p)>=0?1:-1;}
  function hingeGradient(w,b,p,lambda) {const f=score(w,b,p),margin=p.label*f, active=margin<1;return {f,margin,hinge:Math.max(0,1-margin),active,dw:[lambda*w[0]-(active?p.label*p.x:0),lambda*w[1]-(active?p.label*p.y:0)],db:active?-p.label:0};}
  function svmObjective(w,b,points,lambda) {return lambda*(w[0]*w[0]+w[1]*w[1])/2+points.reduce((s,p)=>s+Math.max(0,1-p.label*score(w,b,p)),0)/points.length;}
  function distance(a,b) {return Math.hypot(a.x-b.x,a.y-b.y);}
  function nearest(train,q,k) {return train.map((p,i)=>({index:i,id:p.id,d:distance(p,q),label:p.label})).sort((a,b)=>a.d-b.d||a.id-b.id).slice(0,k);}
  function predictKnn(train,q,k) {return nearest(train,q,k).reduce((v,n)=>v+n.label,0)>0?1:-1;}
  function accuracy(points,predict) {return points.filter(p=>predict(p)===p.label).length/points.length;}
  function createState(config) {
    const c=validateConfig(config), data=generateData(c.dataset,c.seed);
    c.edits.forEach(edit=>Object.assign(data.train[edit.id-1],edit));
    const s={config:c,data,status:'ready',stage:'ready',steps:0,done:false,error:null,trace:{title:'尚未运行',lines:['先作预测，再点“下一步计算”：每次只推进一个计算动作。']},history:[],current:-1};
    if(c.algorithm==='svm'){s.w=[0,0];s.b=0;s.updates=0;s.epoch=0;s.order=shuffle(data.train.map((_,i)=>i),rng(c.seed+401));s.position=0;s.before=null;s.grad=null;}
    if(c.algorithm==='knn'){s.query={x:c.queryX,y:c.queryY};s.distances=[];s.neighbors=[];s.votes={positive:0,negative:0};s.votePosition=0;s.prediction=null;}
    if(c.algorithm==='kmeans'){s.points=data.train.concat(data.validation);const init=shuffle(s.points.map((_,i)=>i),rng(c.seed+707)).slice(0,c.clusters);s.centers=init.map(i=>({x:s.points[i].x,y:s.points[i].y}));s.assignments=s.points.map(()=>-1);s.iteration=0;s.cursor=0;s.centerCursor=0;s.shift=0;s.inertia=null;s.previousCenters=null;s.emptyClusters=[];}
    return s;
  }
  function fmt(n,d=3) {return Number.isFinite(n)?n.toFixed(d):'无法计算';}
  function setTrace(s,title,lines) {s.trace={title,lines};}
  function svmStep(s) {
    const c=s.config;
    if(s.stage==='ready'||s.stage==='update') {
      if(s.position===s.order.length) {s.epoch++;s.position=0;if(s.epoch>=12){s.done=true;setTrace(s,'已到 12 轮上限',['一次 epoch 使用全部 24 个训练样本。有限步近似优化，不能保证精确最优解。']);return;}s.order=shuffle(s.order,rng(c.seed+401+s.epoch));}
      s.current=s.order[s.position];s.before={w:s.w.slice(),b:s.b};s.grad=null;s.stage='sample';const p=s.data.train[s.current];setTrace(s,'① 取一个训练样本',['样本 #'+p.id+'：x₁ = '+fmt(p.x)+'，x₂ = '+fmt(p.y),'已知标签 y = '+(p.label===1?'+1（A 类）':'−1（B 类）')+'。验证叉号不会参与更新。']);
    } else if(s.stage==='sample') {
      const p=s.data.train[s.current];s.grad=hingeGradient(s.w,s.b,p,c.lambda);s.stage='margin';setTrace(s,'② 得分 → 有符号间隔 → hinge 损失',['f = '+fmt(s.w[0])+' × '+fmt(p.x)+' + '+fmt(s.w[1])+' × '+fmt(p.y)+' + '+fmt(s.b)+' = '+fmt(s.grad.f),'间隔 m = y × f = '+fmt(s.grad.margin)+'；损失 max(0, 1 − m) = '+fmt(s.grad.hinge),s.grad.active?(s.grad.margin>=0?'分类正确，但间隔不足 1，仍有数据梯度。':'分类错误或位于边界，数据梯度将推动分类线。'):'间隔已达 1，数据项为零；正则项仍可能缩小权重。']);
    } else if(s.stage==='margin') {
      s.stage='gradient';const p=s.data.train[s.current],g=s.grad;setTrace(s,'③ 计算当前样本的次梯度',['g(w₁) = λw₁ '+(g.active?'− yx₁':'')+' = '+fmt(g.dw[0])+'；g(w₂) = '+fmt(g.dw[1]),'g(b) = '+fmt(g.db)+'。'+(g.active?'数据项使用该样本的标签与特征。':'这里只有权重正则化；偏置不正则化。'),'更新的方向取梯度反向；下面一步才真正修改参数。']);
    } else if(s.stage==='gradient') {
      const g=s.grad,before=s.before;const nw=s.w.map((w,i)=>w-c.eta*g.dw[i]),nb=s.b-c.eta*g.db;
      if(!nw.concat(nb).every(v=>Number.isFinite(v)&&Math.abs(v)<1e5)){s.done=true;s.error='数值超出安全范围';setTrace(s,'数值发散／无法完成',['参数非有限或绝对值超过 100000，已停止。请减小学习率并重新开始。']);return;}
      s.w=nw;s.b=nb;s.stage='update';s.updates++;s.position++;const objective=svmObjective(s.w,s.b,s.data.train,c.lambda);s.history.push({x:s.updates,y:objective});setTrace(s,'④ 参数沿反向梯度移动',['w₁：'+fmt(before.w[0])+' − '+fmt(c.eta)+' × '+fmt(g.dw[0])+' = '+fmt(s.w[0]),'w₂：'+fmt(before.w[1])+' → '+fmt(s.w[1])+'；b：'+fmt(before.b)+' → '+fmt(s.b),'更新后训练目标 = '+fmt(objective)+'。单个样本更新不保证总体目标每次下降。']);
      if(s.updates>=288){s.done=true;s.epoch=12;}
    }
  }
  function knnStep(s) {
    const n=s.data.train.length;
    if(s.distances.length<n) {const i=s.distances.length,p=s.data.train[i];const dx=p.x-s.query.x,dy=p.y-s.query.y,d=Math.hypot(dx,dy);s.distances.push({index:i,id:p.id,d,label:p.label});s.current=i;s.stage='distance';setTrace(s,'① 逐个计算到查询点的距离',['样本 #'+p.id+'：Δx₁ = '+fmt(dx)+'；Δx₂ = '+fmt(dy),'距离 d = √(Δx₁² + Δx₂²) = '+fmt(d),'已计算 '+s.distances.length+' / '+n+' 个距离；尚未投票。']);}
    else if(s.stage==='distance') {s.neighbors=s.distances.slice().sort((a,b)=>a.d-b.d||a.id-b.id).slice(0,s.config.k);s.stage='rank';s.current=-1;setTrace(s,'② 排序并保留最近的 k 个',['k = '+s.config.k+'；最近距离 = '+fmt(s.neighbors[0].d),'选中样本：'+s.neighbors.map(p=>'#'+p.id).join('、'),'距离相同按编号稳定排序。下一步逐个读取其标签。']);}
    else if(s.votePosition<s.neighbors.length){const p=s.neighbors[s.votePosition];s.current=p.index;if(p.label>0)s.votes.positive++;else s.votes.negative++;s.votePosition++;s.stage='vote';setTrace(s,'③ 邻居投票 '+s.votePosition+' / '+s.config.k,['样本 #'+p.id+'，距离 '+fmt(p.d)+'，投给 '+(p.label>0?'A 类':'B 类'),'当前票数 A：'+s.votes.positive+'，B：'+s.votes.negative,'每个邻居一票，不按距离大小加权。']);}
    else {s.prediction=s.votes.positive>s.votes.negative?1:-1;s.done=true;s.stage='result';s.current=-1;setTrace(s,'④ 多数票得到预测',['A 类 '+s.votes.positive+' 票；B 类 '+s.votes.negative+' 票 → '+(s.prediction>0?'A 类':'B 类'),'这是当前查询点的预测；并没有学习或更新一组直线权重。','改变查询位置或 k 会清空本次推理过程。']);}
  }
  function kmeansStep(s) {
    if(s.cursor<s.points.length) {
      const p=s.points[s.cursor], ds=s.centers.map(c=>distance(p,c));let best=0;for(let j=1;j<ds.length;j++)if(ds[j]<ds[best])best=j;s.assignments[s.cursor]=best;s.current=s.cursor;s.cursor++;s.stage='assign';setTrace(s,'① 分配给最近的中心',['样本 #'+p.id+' 距离：'+ds.map((d,i)=>'C'+(i+1)+' '+fmt(d)).join('；'),'最小距离在 C'+(best+1)+' → 分配到簇 '+(best+1),'本轮已分配 '+s.cursor+' / '+s.points.length+' 个点；不读取 A/B 标签。']);
    } else if(s.stage==='assign') {
      s.previousCenters=s.centers.map(c=>({...c}));s.centerCursor=0;s.shift=0;s.emptyClusters=[];s.stage='centers';s.current=-1;setTrace(s,'② 准备根据分配更新均值',['本轮所有点已完成分配。','接下来每一步更新一个中心，直到所有中心都更新；本阶段保持分配不变。']);
    } else if(s.centerCursor<s.centers.length) {
      const j=s.centerCursor, members=s.points.filter((_,i)=>s.assignments[i]===j),old={...s.centers[j]};s.centerCursor++;s.stage='centers';
      if(!members.length){s.emptyClusters.push(j);setTrace(s,'② C'+(j+1)+' 是空簇，保留原中心',['没有点分给该中心，不能计算平均值。','此处明确保留原中心，不除以零。可改变种子或簇数后重试。']);return;}
      const sumX=members.reduce((v,p)=>v+p.x,0),sumY=members.reduce((v,p)=>v+p.y,0);const center={x:sumX/members.length,y:sumY/members.length};s.shift=Math.max(s.shift,distance(old,center));s.centers[j]=center;s.activeCenter=j;setTrace(s,'② 更新中心 C'+(j+1)+'：取本簇平均值',[members.length+' 个点：x₁ 总和 '+fmt(sumX)+' / '+members.length+' = '+fmt(center.x)+'；x₂ 总和 '+fmt(sumY)+' / '+members.length+' = '+fmt(center.y),'中心 ('+fmt(old.x)+', '+fmt(old.y)+') → ('+fmt(center.x)+', '+fmt(center.y)+')','点到中心的平方距离之和在固定分配下由均值最小化。']);
    } else {
      s.iteration++;s.inertia=s.points.reduce((v,p,i)=>v+distance(p,s.centers[s.assignments[i]])**2,0);s.history.push({x:s.iteration,y:s.inertia});s.stage='round';s.current=-1;const converged=s.shift<1e-5;s.done=converged||s.iteration>=12;setTrace(s,s.done?(converged?'已收敛：中心位置稳定':'已到 12 轮上限'):'③ 一轮完成，重新检查分配',['第 '+s.iteration+' 轮，平方距离总和 = '+fmt(s.inertia),'本轮最大中心位移 = '+fmt(s.shift,5)+(s.emptyClusters.length?'；有空簇保留原中心。':'。'),s.done?'此结果依赖初始化，可能只是局部解。':'下轮重新将每个点分配给最近的新中心。']);if(!s.done){s.cursor=0;s.centerCursor=0;s.activeCenter=-1;}
    }
  }
  function step(s) {if(s.done)return s;s.steps++;if(s.config.algorithm==='svm')svmStep(s);else if(s.config.algorithm==='knn')knnStep(s);else kmeansStep(s);if(s.done)s.status=s.error?'error':'done';else s.status='paused';return s;}
  function advanceRound(s) {const initial=s.config.algorithm==='svm'?s.updates:s.config.algorithm==='kmeans'?s.iteration:0;const target=s.config.algorithm==='svm'?Math.floor(initial/24)*24+24:initial+1;for(let guard=0;guard<2500&&!s.done;guard++){step(s);if(s.config.algorithm==='svm'&&s.updates>=target)break;if(s.config.algorithm==='kmeans'&&s.iteration>=target)break;}return s;}
  function metrics(s) {
    if(s.config.algorithm==='svm')return {primary:svmObjective(s.w,s.b,s.data.train,s.config.lambda),train:accuracy(s.data.train,p=>predictSvm(s.w,s.b,p)),validation:accuracy(s.data.validation,p=>predictSvm(s.w,s.b,p)),progress:s.updates+' / 288 次更新'};
    if(s.config.algorithm==='knn')return {primary:s.prediction,train:null,validation:accuracy(s.data.validation,p=>predictKnn(s.data.train,p,s.config.k)),progress:s.distances.length+' / 24 个距离'};
    return {primary:s.inertia,train:null,validation:null,progress:s.iteration+' / 12 轮'};
  }
  Object.assign(Lab,{DEFAULTS,rng,generateData,validateConfig,validateEdits,editSample,createState,step,advanceRound,metrics,score,predictSvm,hingeGradient,svmObjective,distance,nearest,predictKnn,accuracy,fmt});
})(typeof window!=='undefined'?window:globalThis);
