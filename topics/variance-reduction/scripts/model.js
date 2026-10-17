(function(root){'use strict';const M=root.SamplingMath;
 const defaults={kind:'exp',d:1,a:0,b:1,budget:1000,seed:42,method:'antithetic',strata:5,center:.72,width:.2,peakCenter:.72,peakWidth:.08,rate:5,custom:false,expression:'exp(x)'};
 function create(config){const c={...defaults,...config};if(c.kind==='tail'){c.d=1;if(!['ordinary','importance'].includes(c.method))c.method='importance';}const fc={...c,center:c.peakCenter,width:c.peakWidth},f=c.kind==='tail'?null:M.preflight(fc,M.integrand(fc)),K=Math.pow(c.strata,c.d),unit=c.method==='antithetic'?2:c.method==='stratified'?K:1,budget=Math.floor(c.budget/unit)*unit;
 if(budget<2*unit&&c.method==='stratified')throw Error('每层至少需要 2 个样本，请提高预算或减少分层数。');return {c:{...c,effectiveBudget:budget},f,random:M.rng(c.seed),baselineRandom:M.rng(c.seed),stats:M.moments(),baseline:M.moments(),units:M.moments(),layers:Array.from({length:K},M.moments),phase:0,pending:null,points:[],history:[],reference:M.reference(fc),lastPair:null,maxContribution:0,status:'尚未运行'};}
 function prepare(s){const c=s.c,n=s.stats.n,random=s.random;let p=[],q=1,layer=null;
 if(c.kind==='tail'){if(c.method==='importance'){p=[5-Math.log(Math.max(1/4294967296,random()))/c.rate];q=c.rate*Math.exp(-c.rate*(p[0]-5));}else p=[M.normal(random)];}
 else if(c.method==='importance'){const useTriangle=random()>=.1;p=Array.from({length:c.d},()=>useTriangle?M.triangular(random(),c.center,c.width):random());q=.1+.9*p.reduce((v,x)=>v*M.trianglePDF(x,c.center,c.width),1);}
 else if(c.method==='antithetic'&&n%2){p=s.lastPair.p.map(x=>1-x);}
 else if(c.method==='stratified'){layer=n%s.layers.length;let k=layer;for(let j=0;j<c.d;j++){p.push((k%c.strata+random())/c.strata);k=Math.floor(k/c.strata);}}
 else p=Array.from({length:c.d},()=>random());
 const bp=c.kind==='tail'?[M.normal(s.baselineRandom)]:Array.from({length:c.d},()=>s.baselineRandom());return {p,q,layer,bp,index:n+1,before:s.stats.sum};}
 function evaluate(s,t){const c=s.c;
 if(c.kind==='tail'){t.f=Math.exp(-.5*t.p[0]**2)/Math.sqrt(2*Math.PI);t.contribution=c.method==='importance'?Math.exp(-.5*t.p[0]**2-.5*Math.log(2*Math.PI)-Math.log(c.rate)+c.rate*(t.p[0]-5)):(t.p[0]>5?1:0);t.baselineContribution=t.bp[0]>5?1:0;}
 else {t.f=s.f(t.p);t.contribution=t.f/t.q;t.baselineContribution=s.f(t.bp);}
 return t;}
 function estimate(s){if(!s.stats.n)return null;if(s.c.method==='stratified'){if(s.layers.some(l=>!l.n))return null;return s.layers.reduce((sum,l)=>sum+l.mean,0)/s.layers.length;}if(s.c.method==='antithetic')return s.units.n?s.units.mean:null;return s.stats.mean;}
 function standardError(s){if(s.c.kind==='tail'&&s.c.method==='ordinary'&&(s.stats.sum===0||s.stats.sum===s.stats.n))return null;if(s.c.method==='stratified'){if(s.layers.some(l=>l.n<2))return null;return Math.sqrt(s.layers.reduce((sum,l)=>sum+M.se(l)**2,0))/s.layers.length;}if(s.c.method==='antithetic')return M.se(s.units);return M.se(s.stats);}
 function advance(s){if(s.stats.n>=s.c.effectiveBudget&&s.phase===4)return false;
 if(s.phase===0||s.phase===4){s.pending=prepare(s);s.phase=1;}
 else if(s.phase===1){evaluate(s,s.pending);s.phase=2;}
 else if(s.phase===2){const t=s.pending;M.add(s.stats,t.contribution);M.add(s.baseline,t.baselineContribution);if(s.c.method==='stratified')M.add(s.layers[t.layer],t.contribution);if(s.c.method==='antithetic'){if(s.stats.n%2)s.lastPair=t;else{t.pairMean=(s.lastPair.contribution+t.contribution)/2;M.add(s.units,t.pairMean);}}s.maxContribution=Math.max(s.maxContribution,Math.abs(t.contribution));t.after=s.stats.sum;s.phase=3;}
 else {s.points.push(s.pending);if(s.points.length>600)s.points.shift();s.history.push({n:s.stats.n,value:estimate(s),baseline:s.baseline.mean});if(s.history.length>500)s.history=s.history.filter((_,i)=>i%2===0);s.phase=4;}return true;}
 function sample(s){do{if(!advance(s))return false;}while(s.phase!==4);return true;}
 root.VarianceModel={defaults,create,prepare,evaluate,estimate,standardError,advance,sample};
})(typeof window!=='undefined'?window:globalThis);
