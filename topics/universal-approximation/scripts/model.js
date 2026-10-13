(function (root) {
  'use strict';
  var U=root.UniversalApprox=root.UniversalApprox||{};
  var ONE={wave:{name:'缓慢波形',source:'sin(pi*x)+0.25*x'},bowl:{name:'碗形曲线',source:'x^2-0.4'},bump:{name:'平滑小山',source:'exp(-7*x^2)-0.3'},corner:{name:'连续的尖角',source:'abs(x)-0.4'},ripple:{name:'更密的波纹',source:'0.6*sin(3*pi*x)'}};
  var TWO={bowl:{name:'碗形响应',source:'0.65*(x^2+y^2)-0.6'},saddle:{name:'鞍面响应',source:'0.85*x*y'},ripple:{name:'交错波纹',source:'0.65*sin(pi*x)*cos(pi*y)'},bumps:{name:'一峰一谷',source:'0.95*exp(-5*((x-0.35)^2+(y+0.25)^2))-0.7*exp(-7*((x+0.45)^2+(y-0.35)^2))'},ridge:{name:'弯曲山脊',source:'0.65*tanh(2.8*(x+y))+0.15*x*y'}};
  var DEFAULTS={source:TWO.bowl.source,functionId:'bowl',sampleCount:225,depth:1,width:32,activation:'tanh',learningRate:.01,dataSeed:20261009,initSeed:20261009,maxSteps:2000};
  function rng(seed){var t=seed>>>0;return function(){t+=0x6D2B79F5;var z=t;z=Math.imul(z^z>>>15,z|1);z^=z+Math.imul(z^z>>>7,z|61);return ((z^z>>>14)>>>0)/4294967296;};}
  function compile(source,variables){if(!root.CourseExpression)throw new Error('函数解析器未加载；请完整复制本主题目录。');return root.CourseExpression.compile(source,{variables:variables});}
  function finite(value){if(!Number.isFinite(value)||Math.abs(value)>1e6)throw new Error('函数在观察位置取值无效或超过 1,000,000；请检查分母、log/sqrt 定义域或缩小数值。');return value;}
  function relu(z){return Math.max(0,z);}
  function makeOne(source,count){
    if(!Number.isInteger(count)||count<3||count>40)throw new Error('一维采样点数必须是 3–40 的整数。');
    var target=compile(source,['x']),points=[],dense=[];
    for(var i=0;i<count;i++){var x=-1+2*i/(count-1);points.push({x:x,y:finite(target.evaluate(x,0))});}
    for(var k=0;k<=800;k++){var dx=-1+2*k/800;dense.push({x:dx,y:finite(target.evaluate(dx,0))});}
    var slopes=[];for(var j=0;j<count-1;j++)slopes.push((points[j+1].y-points[j].y)/(points[j+1].x-points[j].x));
    var c=points[0].y-slopes[0]*points[0].x;
    var units=[{kind:'line-positive',name:'直线通路 · 正半轴',w:1,b:0,v:slopes[0],knot:0,delta:slopes[0],leftSlope:0,rightSlope:slopes[0]}, {kind:'line-negative',name:'直线通路 · 负半轴',w:-1,b:0,v:-slopes[0],knot:0,delta:-slopes[0],leftSlope:slopes[0],rightSlope:0}];
    for(var q=1;q<count-1;q++)units.push({kind:'hinge',name:'内部拐点 '+q,w:1,b:-points[q].x,v:slopes[q]-slopes[q-1],knot:points[q].x,delta:slopes[q]-slopes[q-1],leftSlope:slopes[q-1],rightSlope:slopes[q]});
    var one={source:target.source||source,count:count,target:target,points:points,dense:dense,slopes:slopes,c:c,units:units,originalUnits:units.map(function(u){return Object.assign({},u);}),edited:false,added:0,selected:0,status:'ready'};
    var error=0;dense.forEach(function(p){error=Math.max(error,Math.abs(p.y-interpolate(one,p.x)));});one.gridError=error;
    // A fixed range for the complete construction prevents autoscaling from pretending it converges.
    var low=Infinity,high=-Infinity;
    dense.forEach(function(p){low=Math.min(low,p.y);high=Math.max(high,p.y);var sum=c;low=Math.min(low,sum);high=Math.max(high,sum);units.forEach(function(u){var v=u.v*relu(u.w*p.x+u.b);low=Math.min(low,v);high=Math.max(high,v);sum+=v;low=Math.min(low,sum);high=Math.max(high,sum);});});
    var pad=high-low>1e-12?(high-low)*.1:Math.max(.1,Math.abs(low)*.1);one.range=[low-pad,high+pad];
    var tMin=Math.min.apply(null,dense.map(function(p){return p.y;})),tMax=Math.max.apply(null,dense.map(function(p){return p.y;})),samplePad=tMax-tMin>1e-12?(tMax-tMin)*.12:Math.max(.1,Math.abs(tMin)*.1);one.sampleRange=[tMin-samplePad,tMax+samplePad];one.weightLimit=Math.ceil(Math.max(5,Math.max.apply(null,units.map(function(u){return Math.abs(u.v);}))*2)*100)/100;one.baseRange=one.range.slice();return one;
  }
  function interpolate(one,x){var i=Math.min(one.count-2,Math.max(0,Math.floor((x+1)*(one.count-1)/2)));var p=one.points[i];return p.y+one.slopes[i]*(x-p.x);}
  function contribution(unit,x){return unit.v*relu(unit.w*x+unit.b);}
  function constructed(one,x,count){var sum=one.c;for(var i=0;i<(count===undefined?one.units.length:count);i++)sum+=contribution(one.units[i],x);return sum;}
  function editUnit(one,index,weight,knot){
    if(!Number.isInteger(index)||index<0||index>=one.units.length)throw new Error('请选择一个有效单元。');
    if(!Number.isFinite(weight)||Math.abs(weight)>one.weightLimit)throw new Error('输出权重必须在 −'+one.weightLimit.toFixed(2)+' 到 '+one.weightLimit.toFixed(2)+' 之间。');
    if(!Number.isFinite(knot)||knot<-1||knot>1)throw new Error('拐点必须在 −1 到 1 之间。');
    var u=one.units[index];u.v=weight;u.knot=knot;u.b=-u.w*knot;u.delta=weight*Math.abs(u.w);
    one.edited=one.units.some(function(v,i){return v.v!==one.originalUnits[i].v||v.knot!==one.originalUnits[i].knot;});
    // Manual edits show the full network, so a not-yet-added unit cannot appear to have no effect.
    one.added=one.units.length;one.selected=index;one.status='ended';
    var lo=one.baseRange[0],hi=one.baseRange[1];one.dense.forEach(function(p){var sum=one.c;one.units.forEach(function(v){var value=contribution(v,p.x);lo=Math.min(lo,value);hi=Math.max(hi,value);sum+=value;lo=Math.min(lo,sum);hi=Math.max(hi,sum);});});
    var pad=(hi-lo)*.03;one.range=[lo-pad,hi+pad];return one;
  }
  function restoreConstruction(one){one.units=one.originalUnits.map(function(u){return Object.assign({},u);});one.edited=false;one.range=one.baseRange.slice();one.added=one.units.length;one.status='ended';return one;}
  function freeze(state){
    var n=state.network;
    return {config:Object.assign({},state.config),step:state.step,network:{width:n.width,depth:n.depth,activation:n.activation,layers:n.layers.map(function(l){return Object.assign({},l);}),sizes:n.sizes.slice(),p:new Float64Array(n.p)},metrics:{train:Object.assign({},state.metrics.train),validation:Object.assign({},state.metrics.validation)},range:state.range.slice()};
  }
  function oneStep(one){if(one.added>=one.units.length){one.status='ended';return;}one.selected=one.added;one.added++;one.status=one.added===one.units.length?'ended':'paused';}
  function activate(z,name){return name==='tanh'?Math.tanh(z):name==='relu'?relu(z):z;}
  function derivative(z,a,name){return name==='tanh'?1-a*a:name==='relu'?(z>0?1:0):1;}
  function validateConfig(c){
    if(!c||typeof c.source!=='string'||!c.source.trim())return '请输入二元目标函数。';
    if(!Number.isInteger(c.sampleCount)||c.sampleCount<25||c.sampleCount>900)return '二元训练点数必须是 25–900 的整数。';
    if(!Number.isInteger(c.depth)||c.depth<1||c.depth>3)return '隐藏层数必须是 1–3 的整数。';
    if(!Number.isInteger(c.width)||c.width<1||c.width>48)return '每层宽度必须是 1–48 的整数。';
    if(!['tanh','relu','linear'].includes(c.activation))return '请选择 tanh、ReLU 或线性激活。';
    if(!Number.isFinite(c.learningRate)||c.learningRate<.0001||c.learningRate>.1)return '学习率必须在 0.0001–0.1 之间。';
    if(![c.dataSeed,c.initSeed].every(function(s){return Number.isInteger(s)&&s>=0&&s<=4294967295;}))return '种子必须是 0–4294967295 的整数。';
    if(!Number.isInteger(c.maxSteps)||c.maxSteps<1||c.maxSteps>2000)return '更新上限必须是 1–2000 的整数。';return '';
  }
  function data(c,target){
    target=target||compile(c.source,['x','y']);var random=rng(c.dataSeed),train=[],validation=[],order=[];
    for(var j=0;j<c.sampleCount;j++)order.push(j);
    for(var k=order.length-1;k>0;k--){var r=Math.floor(random()*(k+1)),swap=order[k];order[k]=order[r];order[r]=swap;}
    for(var i=0;i<c.sampleCount;i++){var x=-1+2*(i+.1+.8*random())/c.sampleCount,y=-1+2*(order[i]+.1+.8*random())/c.sampleCount;train.push({x:x,y:y,target:finite(target.evaluate(x,y))});}
    for(var vj=0;vj<=20;vj++)for(var vi=0;vi<=20;vi++){var vx=-1+vi/10,vy=-1+vj/10;train.forEach(function(p){if(p.x===vx&&p.y===vy){p.x+=p.x===1?-1e-8:1e-8;p.target=finite(target.evaluate(p.x,p.y));}});validation.push({x:vx,y:vy,target:finite(target.evaluate(vx,vy))});}
    // Explicitly check the dense drawing grid too; these points never participate in updates.
    var range=[Infinity,-Infinity];train.concat(validation).forEach(function(p){range[0]=Math.min(range[0],p.target);range[1]=Math.max(range[1],p.target);});for(var dj=0;dj<=32;dj++)for(var di=0;di<=32;di++){var value=finite(target.evaluate(-1+di/16,-1+dj/16));range[0]=Math.min(range[0],value);range[1]=Math.max(range[1],value);}
    return {train:train,validation:validation,targetRange:range};
  }
  function network(width,activation,seed,depth){
    depth=depth||1;var sizes=[2];for(var d=0;d<depth;d++)sizes.push(width);sizes.push(1);var layers=[],offset=0;
    for(var l=1;l<sizes.length;l++){var nin=sizes[l-1],nout=sizes[l];layers.push({nin:nin,nout:nout,wOffset:offset,bOffset:offset+nin*nout,hidden:l<sizes.length-1});offset+=nin*nout+nout;}
    var p=new Float64Array(offset),random=rng(seed^0xA511E9B3);
    layers.forEach(function(layer,li){var bound=li===0?1.6:layer.hidden?Math.sqrt(6/(layer.nin+layer.nout)):1/Math.sqrt(layer.nin);for(var j=0;j<layer.nout;j++){for(var i=0;i<layer.nin;i++)p[layer.wOffset+j*layer.nin+i]=(random()*2-1)*bound;p[layer.bOffset+j]=(random()*2-1)*.15;}});
    return {width:width,depth:depth,activation:activation,layers:layers,sizes:sizes,p:p,m:new Float64Array(offset),v:new Float64Array(offset),step:0,lastUpdate:0,gradientNorm:0};
  }
  function forward(n,x,y){var values=[[x,y]],pre=[];n.layers.forEach(function(layer){var prev=values[values.length-1],a=[],z=[];for(var j=0;j<layer.nout;j++){var v=n.p[layer.bOffset+j];for(var i=0;i<layer.nin;i++)v+=n.p[layer.wOffset+j*layer.nin+i]*prev[i];z.push(v);a.push(layer.hidden?activate(v,n.activation):v);}pre.push(z);values.push(a);});return {values:values,pre:pre,prediction:values[values.length-1][0]};}
  function predict(n,x,y){return forward(n,x,y).prediction;}
  function lossGradient(n,samples){
    if(!samples.length)throw new Error('没有训练点，无法计算梯度。');var g=new Float64Array(n.p.length),loss=0;
    var acts=n.sizes.map(function(size){return new Float64Array(size);}),zs=n.layers.map(function(layer){return new Float64Array(layer.nout);}),deltas=n.layers.map(function(layer){return new Float64Array(layer.nout);});
    for(var s=0;s<samples.length;s++){
      var sample=samples[s];acts[0][0]=sample.x;acts[0][1]=sample.y;
      for(var li=0;li<n.layers.length;li++){var layer=n.layers[li];for(var j=0;j<layer.nout;j++){var z=n.p[layer.bOffset+j];for(var i=0;i<layer.nin;i++)z+=n.p[layer.wOffset+j*layer.nin+i]*acts[li][i];zs[li][j]=z;acts[li+1][j]=layer.hidden?activate(z,n.activation):z;}}
      var difference=acts[acts.length-1][0]-sample.target;loss+=difference*difference/samples.length;deltas[deltas.length-1][0]=2*difference/samples.length;
      for(var back=n.layers.length-1;back>=0;back--){var current=n.layers[back];if(back<n.layers.length-1){var next=n.layers[back+1];for(var q=0;q<current.nout;q++){var signal=0;for(var r=0;r<next.nout;r++)signal+=n.p[next.wOffset+r*next.nin+q]*deltas[back+1][r];deltas[back][q]=signal*derivative(zs[back][q],acts[back+1][q],n.activation);}}
        for(var out=0;out<current.nout;out++){g[current.bOffset+out]+=deltas[back][out];for(var inp=0;inp<current.nin;inp++)g[current.wOffset+out*current.nin+inp]+=deltas[back][out]*acts[back][inp];}
      }
    }return {loss:loss,gradient:g};
  }
  function update(n,samples,lr){var result=lossGradient(n,samples),nextStep=n.step+1,next=new Float64Array(n.p.length),nm=new Float64Array(n.p.length),nv=new Float64Array(n.p.length),norm=0,change=0,c1=1-Math.pow(.9,nextStep),c2=1-Math.pow(.999,nextStep);
    for(var k=0;k<n.p.length;k++){var g=result.gradient[k];nm[k]=.9*n.m[k]+.1*g;nv[k]=.999*n.v[k]+.001*g*g;var delta=lr*(nm[k]/c1)/(Math.sqrt(nv[k]/c2)+1e-8);next[k]=n.p[k]-delta;if(!Number.isFinite(next[k])||!Number.isFinite(nv[k])||Math.abs(next[k])>1e6)throw new Error('参数数值发散；请降低学习率并重新开始。');norm+=g*g;change+=delta*delta;}
    n.p=next;n.m=nm;n.v=nv;n.step=nextStep;n.gradientNorm=Math.sqrt(norm);n.lastUpdate=Math.sqrt(change);return result;
  }
  function metrics(n,samples){var mse=0,maxError=0;for(var i=0;i<samples.length;i++){var p=samples[i],e=Math.abs(predict(n,p.x,p.y)-p.target);mse+=e*e/samples.length;maxError=Math.max(maxError,e);}return {mse:mse,rmse:Math.sqrt(mse),maxError:maxError};}
  function measure(state){state.metrics={train:metrics(state.network,state.data.train),validation:metrics(state.network,state.data.validation)};state.history.push({step:state.step,train:state.metrics.train.rmse,validation:state.metrics.validation.rmse});if(state.history.length>402)state.history=state.history.filter(function(p,i){return i===0||i===state.history.length-1||i%2===0;});}
  function makeState(config){var c=Object.assign({},DEFAULTS,config),problem=validateConfig(c);if(problem)throw new Error(problem);var target=compile(c.source,['x','y']),ds=data(c,target),net=network(c.width,c.activation,c.initSeed,c.depth);var state={config:c,target:target,data:ds,network:net,step:0,status:'ready',message:'尚未训练：显示当前结构的随机初始预测。',history:[]};measure(state);
    var lo=ds.targetRange[0],hi=ds.targetRange[1],span=hi-lo,pad=span>1e-12?span*.15:Math.max(.1,Math.abs(lo)*.1);state.range=[lo-pad,hi+pad];state.errorLimit=span>1e-12?span:Math.max(.1,Math.abs(lo)*.2);return state;
  }
  function advance(state,count){count=Math.min(Math.max(1,Math.floor(count)),state.config.maxSteps-state.step);if(state.status==='failed'||count<=0)return state;try{for(var i=0;i<count;i++){update(state.network,state.data.train,state.config.learningRate);state.step++;}measure(state);if(state.step>=state.config.maxSteps){state.status='ended';state.message='已结束：达到 '+state.config.maxSteps+' 次更新上限。有限训练不保证达到任意精度。';}}catch(e){state.status='failed';state.message=e.message;measure(state);}return state;}
  U.Model={ONE:ONE,TWO:TWO,FUNCTIONS:TWO,DEFAULTS:DEFAULTS,rng:rng,compile:compile,finite:finite,relu:relu,makeOne:makeOne,interpolate:interpolate,contribution:contribution,constructed:constructed,oneStep:oneStep,editUnit:editUnit,restoreConstruction:restoreConstruction,freeze:freeze,activate:activate,validateConfig:validateConfig,data:data,network:network,forward:forward,predict:predict,lossGradient:lossGradient,update:update,metrics:metrics,makeState:makeState,measure:measure,advance:advance};
})(typeof window!=='undefined'?window:globalThis);
