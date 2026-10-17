(function(root){'use strict';const M=root.SamplingMath;
 const defaults={kind:'pi',d:2,a:0,b:1,ay:0,by:1,method:'mean',budget:1000,seed:42,custom:false,expression:'exp(-x^2-y^2)'};
 function create(config){const c={...defaults,...config};c.d=c.kind==='pi'?2:c.d;const f=M.preflight(c,M.integrand(c));const volume=c.kind==='pi'?4:(c.b-c.a)*(c.d===2?c.by-c.ay:1);return {c,f,random:M.rng(c.seed),volume,stats:M.moments(),phase:0,pending:null,points:[],history:[],reference:M.reference(c),status:'尚未运行'};}
 function advance(s){if(s.stats.n>=s.c.budget&&s.phase===4)return false;const c=s.c;
 if(s.phase===0||s.phase===4){const p=[c.a+(c.b-c.a)*s.random()];if(c.d===2)p.push(c.ay+(c.by-c.ay)*s.random());const u=s.random();s.pending={p,u,before:s.stats.sum,index:s.stats.n+1};s.phase=1;}
 else if(s.phase===1){const t=s.pending;t.f=s.f(t.p);if(!Number.isFinite(t.f))throw Error('采样处函数没有有限值。');t.hit=c.kind==='pi'?t.f===1:c.method==='hit'?t.u*Math.exp(c.b)<=t.f:null;t.height=c.method==='hit'?t.u*Math.exp(c.b):t.f;t.contribution=c.kind==='pi'?4*t.f:c.method==='hit'?s.volume*Math.exp(c.b)*(t.hit?1:0):s.volume*t.f;s.phase=2;}
 else if(s.phase===2){M.add(s.stats,s.pending.contribution);s.pending.after=s.stats.sum;s.phase=3;}
 else {s.points.push({...s.pending,p:s.pending.p.slice()});if(s.points.length>800)s.points.shift();s.history.push({n:s.stats.n,value:s.stats.mean});if(s.history.length>500)s.history=s.history.filter((_,i)=>i%2===0);s.phase=4;}
 return true;}
 function sample(s){do{if(!advance(s))return false;}while(s.phase!==4);return true;}
 function interval(s){if(s.stats.n<2)return null;const c=s.c,n=s.stats.n,binary=c.kind==='pi'||c.method==='hit';if(binary){const scale=c.kind==='pi'?4:s.volume*Math.exp(c.b),p=s.stats.mean/scale,z=1.96,den=1+z*z/n,mid=(p+z*z/(2*n))/den,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;return {low:scale*Math.max(0,mid-half),high:scale*Math.min(1,mid+half),label:'Wilson 近似区间',se:p===0||p===1?null:M.se(s.stats)};}const se=M.se(s.stats);return {low:s.stats.mean-1.96*se,high:s.stats.mean+1.96*se,label:'均值的近似 95% 区间',se};}
 root.IntegrationModel={defaults,create,advance,sample,interval};
})(typeof window!=='undefined'?window:globalThis);
