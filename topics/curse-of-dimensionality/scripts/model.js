(function(root){'use strict';const M=root.SamplingMath;
 const defaults={kind:'smooth',d:2,a:0,b:1,budget:1000,seed:42,custom:false,expression:'exp(-x1^2-x2^2)',high:true,center:.72,width:.12};
 function gridSize(budget,d){let m=Math.floor(Math.pow(budget,1/d)+1e-10);while(Math.pow(m,d)>budget)m--;while(Math.pow(m+1,d)<=budget)m++;return Math.max(1,m);}
 function gridPoint(index,m,c){const p=[];for(let j=0;j<c.d;j++){const k=index%m;index=Math.floor(index/m);p.push(c.a+(k+.5)*(c.b-c.a)/m);}return p;}
 function create(config){const c={...defaults,...config},m=gridSize(c.budget,c.d),f=M.preflight(c,M.integrand(c));return {c,m,gridTotal:Math.pow(m,c.d),f,random:M.rng(c.seed),volume:Math.pow(c.b-c.a,c.d),stats:M.moments(),grid:M.moments(),phase:0,pending:null,points:[],gridPoints:[],history:[],reference:M.reference(c),status:'尚未运行',elapsed:0};}
 function advance(s){if(s.stats.n>=s.c.budget&&s.phase===4)return false;const c=s.c;
 if(s.phase===0||s.phase===4){s.pending={p:Array.from({length:c.d},()=>c.a+(c.b-c.a)*s.random()),gp:s.grid.n<s.gridTotal?gridPoint(s.grid.n,s.m,c):null,index:s.stats.n+1,before:s.stats.sum};s.phase=1;}
 else if(s.phase===1){const t=s.pending;t.f=s.f(t.p);t.contribution=s.volume*t.f;if(t.gp){t.gf=s.f(t.gp);t.gc=s.volume*t.gf;}s.phase=2;}
 else if(s.phase===2){M.add(s.stats,s.pending.contribution);if(s.pending.gp)M.add(s.grid,s.pending.gc);s.pending.after=s.stats.sum;s.phase=3;}
 else {s.points.push(s.pending);if(s.points.length>600)s.points.shift();if(s.pending.gp){s.gridPoints.push(s.pending.gp);if(s.gridPoints.length>600)s.gridPoints.shift();}s.history.push({n:s.stats.n,value:s.stats.mean,grid:s.grid.n===s.gridTotal?s.grid.mean:null});if(s.history.length>500)s.history=s.history.filter((_,i)=>i%2===0);s.phase=4;}return true;}
 function sample(s){do{if(!advance(s))return false;}while(s.phase!==4);return true;}
 root.DimensionModel={defaults,gridSize,gridPoint,create,advance,sample};
})(typeof window!=='undefined'?window:globalThis);
