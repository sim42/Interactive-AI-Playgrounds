/* Deterministic numerical core. Browser classic script; Node export only for checks. */
(function (root) {
  'use strict';
  function integer(v,min,max,name){if(!Number.isInteger(v)||v<min||v>max)throw Error(name+'须为'+min+'至'+max+'的整数');return v;}
  function validate(c){integer(c.seed,0,4294967295,'种子');integer(c.target,1,10000,'目标数量');if(!['lcg','mulberry'].includes(c.generator))throw Error('未知生成器');if(c.generator==='lcg'){integer(c.m,2,32,'模数m');integer(c.a,0,65535,'乘数a');integer(c.c,0,65535,'增量c');}return {...c};}
  function mix(state){let next=(state+0x6D2B79F5)>>>0;let t=next;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return {next,word:(t^(t>>>14))>>>0};}
  function rng(seed){let state=seed>>>0;return function(){const r=mix(state);state=r.next;return r.word/4294967296;};}
  function create(config){const c=validate(config),value=c.generator==='lcg'?c.seed%c.m:c.seed;return {config:c,value,phase:0,pending:null,samples:[],pairs:[],states:[value],seen:new Map([[value,0]]),cycle:null};}
  function advance(s){const c=s.config;if(s.samples.length>=c.target)return false;
    if(s.phase===0){const old=s.value;if(c.generator==='lcg')s.pending={old,product:c.a*old,sum:c.a*old+c.c,next:(c.a*old+c.c)%c.m};else{const r=mix(old);s.pending={old,next:r.next,word:r.word};}s.phase=1;return true;}
    if(s.phase<4){s.phase++;return true;}
    const p=s.pending,u=c.generator==='lcg'?p.next/c.m:p.word/4294967296;
    if(s.samples.length)s.pairs.push([s.samples.at(-1),u]);s.samples.push(u);s.value=p.next;s.states.push(p.next);
    if(c.generator==='lcg'&&!s.cycle&&s.seen.has(p.next))s.cycle={start:s.seen.get(p.next),length:s.samples.length-s.seen.get(p.next),at:s.samples.length};
    if(!s.seen.has(p.next))s.seen.set(p.next,s.samples.length);s.phase=0;return true;
  }
  function draw(s){const old=s.samples.length;while(s.samples.length===old&&advance(s)){}return s.samples.length>old;}
  function probabilities(text){const p=text.trim().split(/[,，;；\s]+/).map(Number);if(p.length!==6||p.some(x=>!Number.isFinite(x)||x<0)||Math.abs(p.reduce((a,b)=>a+b,0)-1)>1e-8)throw Error('请输入6个非负概率，且总和须为1（用逗号分隔）');return p;}
  function inverse(u,lambda){if(!Number.isFinite(u)||u<0||u>=1||!Number.isFinite(lambda)||lambda<=0)throw Error('u须在[0,1)，λ须为正数');return -Math.log1p(-u)/lambda;}
  function discrete(u,p){if(u<0||u>=1)throw Error('u须在[0,1)');let sum=0;for(let i=0;i<p.length;i++){sum+=p[i];if(u<sum)return i+1;}return p.length;}
  function createTransform(c){integer(c.seed,0,4294967295,'种子');integer(c.target,1,10000,'目标数量');if(!Number.isFinite(c.lambda)||c.lambda<.1||c.lambda>5)throw Error('λ须在0.1至5之间');const p=probabilities(c.probabilities);return {config:{...c},p,random:rng(c.seed),phase:0,pending:null,samples:[],uniforms:[]};}
  function transformStep(s){if(s.samples.length>=s.config.target)return false;if(s.phase===0){const u=s.random();s.pending={u,x:s.config.distribution==='exponential'?inverse(u,s.config.lambda):discrete(u,s.p)};s.phase=1;return true;}if(s.phase<3){s.phase++;return true;}s.uniforms.push(s.pending.u);s.samples.push(s.pending.x);s.phase=0;return true;}
  function transformDraw(s){const old=s.samples.length;while(s.samples.length===old&&transformStep(s)){}return s.samples.length>old;}
  const api={validate,mix,rng,create,advance,draw,probabilities,inverse,discrete,createTransform,transformStep,transformDraw};root.RandomNumberModel=api;if(typeof module==='object'&&module.exports)module.exports=api;
}(typeof window==='object'?window:globalThis));
