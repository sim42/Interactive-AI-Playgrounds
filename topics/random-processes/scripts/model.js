(function(root){
'use strict';
function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function integer(v,min,max,name){if(!Number.isInteger(v)||v<min||v>max)throw Error(name+'须为'+min+'至'+max+'的整数');}
function create(c){integer(c.n,3,500,'人数');integer(c.mean,1,30,'初始均额');integer(c.seed,0,4294967295,'种子');integer(c.target,1,200000,'目标尝试数');return {config:{...c},random:rng(c.seed),debt:Array(c.n).fill(c.mean),bounded:Array(c.n).fill(c.mean),attempts:0,phase:0,pending:null,stats:[{transfer:0,zero:0,self:0},{transfer:0,zero:0,self:0}],history:[],selected:0};}
function outcome(values,a,b,bounded){if(a===b)return 'self';if(bounded&&values[a]===0)return 'zero';return 'transfer';}
function advance(s){if(s.attempts>=s.config.target)return false;
 if(s.phase===0){const a=Math.floor(s.random()*s.config.n),b=Math.floor(s.random()*s.config.n);s.pending={a,b,before:[s.debt[a],s.debt[b],s.bounded[a],s.bounded[b]],results:[outcome(s.debt,a,b,false),outcome(s.bounded,a,b,true)]};s.phase=1;return true;}
 if(s.phase===1){s.phase=2;return true;}
 const p=s.pending;[s.debt,s.bounded].forEach((v,j)=>{const result=p.results[j];s.stats[j][result]++;if(result==='transfer'){v[p.a]--;v[p.b]++;}});s.attempts++;s.phase=0;return true;
}
function draw(s){const n=s.attempts;while(s.attempts===n&&advance(s)){}return s.attempts>n;}
function moments(v){const sum=v.reduce((a,b)=>a+b,0),mean=sum/v.length;return {sum,mean,sd:Math.sqrt(v.reduce((a,b)=>a+(b-mean)**2,0)/v.length),min:Math.min(...v),max:Math.max(...v)};}
function marginal(n,total,max){if(n<2||!Number.isInteger(total)||total<0)throw Error('边际分布参数不合法');const out=[(n-1)/(total+n-1)];for(let k=0;k<Math.min(total,max);k++)out.push(out[k]*(total-k)/(total-k+n-2));return out;}
const states=[];for(let a=0;a<=6;a++)for(let b=0;b<=6-a;b++)states.push([a,b,6-a-b]);
function stateIndex(v){return states.findIndex(x=>x.every((a,i)=>a===v[i]));}
function smallCreate(seed=42,target=20000){integer(seed,0,4294967295,'种子');integer(target,1,200000,'目标尝试数');return {config:{seed,target},random:rng(seed),values:[2,2,2],attempts:0,phase:0,pending:null,visits:Array(28).fill(0),stats:{transfer:0,zero:0,self:0}};}
function smallStep(s){if(s.attempts>=s.config.target)return false;if(s.phase===0){const a=Math.floor(s.random()*3),b=Math.floor(s.random()*3);s.pending={a,b,before:s.values.slice(),from:stateIndex(s.values),result:outcome(s.values,a,b,true)};s.phase=1;return true;}if(s.phase===1){s.phase=2;return true;}const p=s.pending;s.stats[p.result]++;if(p.result==='transfer'){s.values[p.a]--;s.values[p.b]++;}s.attempts++;s.visits[stateIndex(s.values)]++;s.phase=0;return true;}
function smallDraw(s){const n=s.attempts;while(s.attempts===n&&smallStep(s)){}return s.attempts>n;}
function transition(i,a,b){const v=states[i].slice();if(outcome(v,a,b,true)==='transfer'){v[a]--;v[b]++;}return stateIndex(v);}
const api={rng,create,outcome,advance,draw,moments,marginal,states,stateIndex,smallCreate,smallStep,smallDraw,transition};root.RandomProcessModel=api;if(typeof module==='object'&&module.exports)module.exports=api;
}(typeof window==='object'?window:globalThis));
