/* Local numerical utilities. All samples and estimates are computed, not scripted. */
(function(root){'use strict';
 function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
 function streamSeed(seed,index){let x=(seed+Math.imul(index+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);return(x^(x>>>16))>>>0;}
 function normal(random){return Math.sqrt(-2*Math.log(Math.max(1/4294967296,random())))*Math.cos(2*Math.PI*random());}
 function moments(){return {n:0,mean:0,m2:0,sum:0};}
 function add(s,x){if(!Number.isFinite(x)||Math.abs(x)>1e150)throw Error('贡献过大或非有限，无法可靠累计；请修改函数或定义域。');s.n++;const d=x-s.mean;s.mean+=d/s.n;s.m2+=d*(x-s.mean);s.sum+=x;if(!Number.isFinite(s.m2)||!Number.isFinite(s.sum))throw Error('累计量溢出，请缩小函数数值范围。');return s;}
 function se(s){return s.n<2?null:Math.sqrt(Math.max(0,s.m2)/(s.n-1)/s.n);}
 function sd(s){return s.n<2?null:Math.sqrt(Math.max(0,s.m2)/(s.n-1));}
 // Abramowitz-Stegun 7.1.26, absolute erf error < 1.5e-7; references are marked numerical.
 function erf(x){const sign=Math.sign(x),z=Math.abs(x),t=1/(1+.3275911*z);return sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z));}
 function gaussianIntegral(a,b,c,s){return .5*Math.sqrt(Math.PI)*s*(erf((b-c)/s)-erf((a-c)/s));}
 function triangular(u,c,w){const a=Math.max(0,c-w),b=Math.min(1,c+w),f=(c-a)/(b-a);return u<f?a+Math.sqrt(u*(b-a)*(c-a)):b-Math.sqrt((1-u)*(b-a)*(b-c));}
 function trianglePDF(x,c,w){const a=Math.max(0,c-w),b=Math.min(1,c+w);if(x<a||x>b)return 0;if(x===c)return 2/(b-a);return x<c?2*(x-a)/((b-a)*(c-a)):2*(b-x)/((b-a)*(b-c));}
 function finiteNumber(value,name,min,max,integer){if(value===''||value==null)throw Error(name+'不能为空。');const n=Number(value);if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw Error(name+'应为 '+min+' 至 '+max+(integer?' 的整数。':' 之间的有限数。'));return n;}
 function reference(c){if(c.custom)return null;if(c.kind==='pi')return Math.PI;if(c.kind==='exp')return Math.exp(c.b)-Math.exp(c.a);if(c.kind==='signed')return .5*(c.b*c.b-c.a*c.a);if(c.kind==='symmetric')return 1/12;if(c.kind==='tail')return 2.866515718791939e-7;if(c.kind==='smooth')return c.d===2&&!c.high?gaussianIntegral(c.a,c.b,0,1)*gaussianIntegral(c.ay==null?c.a:c.ay,c.by==null?c.b:c.by,0,1):Math.pow(gaussianIntegral(c.a,c.b,0,1),c.d);if(c.kind==='peak')return c.d===2&&!c.high?gaussianIntegral(c.a,c.b,c.center||.72,c.width||.08)*gaussianIntegral(c.ay==null?c.a:c.ay,c.by==null?c.b:c.by,c.center||.72,c.width||.08):Math.pow(gaussianIntegral(c.a,c.b,c.center||.72,c.width||.08),c.d);return null;}
 function integrand(c){if(c.custom){const vars=c.high?Array.from({length:c.d},(_,i)=>'x'+(i+1)):c.d===1?['x']:['x','y'];const p=root.CourseExpression.compile(c.expression,{variables:vars});return xs=>p.evaluateVector(xs);}
 if(c.kind==='pi')return p=>p[0]*p[0]+p[1]*p[1]<=1?1:0;
 if(c.kind==='exp')return p=>Math.exp(p[0]);if(c.kind==='signed')return p=>p[0];if(c.kind==='symmetric')return p=>(p[0]-.5)**2;
 const center=c.kind==='peak'?(c.center||.72):0,width=c.kind==='peak'?(c.width||.08):1;return p=>Math.exp(-p.reduce((s,x)=>s+((x-center)/width)**2,0));}
 function preflight(c,f){const a=c.a,b=c.b;for(let k=0;k<=12;k++){const p=Array.from({length:c.d},(_,j)=>(j===1&&c.ay!=null?c.ay:a)+((j===1&&c.by!=null?c.by:b)-(j===1&&c.ay!=null?c.ay:a))*((k+j*5)%13)/12);const v=f(p);if(!Number.isFinite(v)||Math.abs(v)>1e150)throw Error('函数在预检位置 '+p.map(x=>x.toFixed(3)).join(', ')+' 无有限值或数值过大。');}return f;}
 function snapshot(s){return {n:s.n,mean:s.mean,sum:s.sum,m2:s.m2};}
 root.SamplingMath={rng,streamSeed,normal,moments,add,se,sd,erf,gaussianIntegral,triangular,trianglePDF,finiteNumber,reference,integrand,preflight,snapshot};
})(typeof window!=='undefined'?window:globalThis);
