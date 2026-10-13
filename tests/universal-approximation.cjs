'use strict';
const assert=require('node:assert/strict');
require('../topics/universal-approximation/scripts/expression.js');require('../topics/universal-approximation/scripts/model.js');
const M=globalThis.UniversalApprox.Model;
const close=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<=eps,`${a} differs from ${b}`);
// Actual interpolation equals actual single-hidden-layer ReLU for every preset and density.
for(const preset of Object.values(M.ONE))for(const count of [3,9,17,40]){
 const one=M.makeOne(preset.source,count);assert.equal(one.points.length,count);assert.equal(one.units.length,count);
 for(let i=0;i<=1200;i++){const x=-1+2*i/1200;close(M.constructed(one,x),M.interpolate(one,x),2e-10);}
 for(const point of one.points){close(M.constructed(one,point.x),point.y,2e-10);}
 for(let k=1;k<count-1;k++)close(one.units[k+1].v,one.slopes[k]-one.slopes[k-1]);
 const initial=M.constructed(one,.5,0);close(initial,one.c);for(let j=0;j<count;j++){M.oneStep(one);assert.equal(one.added,j+1);}assert.equal(one.status,'ended');M.oneStep(one);assert.equal(one.added,count);
}
const sparse=M.makeOne('sin(pi*x)+0.25*x',3),dense=M.makeOne('sin(pi*x)+0.25*x',17);assert.ok(dense.gridError<sparse.gridError*.05);
for(const source of ['-0.4','0','0.001*sin(x)','x^3-0.1*x']){const one=M.makeOne(source,17);for(let i=0;i<=80;i++){const x=-1+i/40;close(M.constructed(one,x),M.interpolate(one,x),2e-10);}assert.ok(one.range[0]<one.range[1]);}
assert.throws(()=>M.makeOne('x+y',9));assert.throws(()=>M.makeOne('1/x',9));assert.throws(()=>M.makeOne('x',41));assert.throws(()=>M.makeOne('sin(',9));
// A manual change modifies only one genuine contribution, including the negative-input unit.
for(const index of [0,1,4]){
 const o=M.makeOne(M.ONE.wave.source,9),before=o.units.map(u=>({...u})),oldValue=M.constructed(o,.63),newWeight=before[index].v+.7,newKnot=.23;
 M.editUnit(o,index,newWeight,newKnot);assert.equal(o.edited,true);assert.equal(o.added,9);assert.equal(o.status,'ended');
 const newContribution=newWeight*Math.max(0,before[index].w*(.63-newKnot));close(M.constructed(o,.63),oldValue-M.contribution(before[index],.63)+newContribution,1e-10);
 for(let i=0;i<9;i++)if(i!==index)assert.deepEqual(o.units[i],before[i]);close(o.units[index].b,-o.units[index].w*newKnot);
 const safe=o.units.map(u=>({...u}));assert.throws(()=>M.editUnit(o,index,Infinity,0));assert.throws(()=>M.editUnit(o,index,0,1.1));assert.throws(()=>M.editUnit(o,index,o.weightLimit+1,0));assert.deepEqual(o.units,safe);
 M.restoreConstruction(o);assert.equal(o.edited,false);for(let i=0;i<801;i++)close(M.constructed(o,-1+i/400),M.interpolate(o,-1+i/400),2e-10);
}
const frozenSource=M.makeState();M.advance(frozenSource,12);const frozen=M.freeze(frozenSource),frozenParameters=Array.from(frozen.network.p),frozenPrediction=M.predict(frozen.network,.35,-.25);M.advance(frozenSource,8);assert.deepEqual(Array.from(frozen.network.p),frozenParameters);close(M.predict(frozen.network,.35,-.25),frozenPrediction,0);close(M.metrics(frozen.network,frozenSource.data.validation).rmse,frozen.metrics.validation.rmse,1e-14);assert.notEqual(frozenSource.metrics.validation.rmse,frozen.metrics.validation.rmse);
// Back-propagation agrees with numerical loss differences in every depth and activation.
const samples=[{x:.21,y:-.32,target:.7},{x:-.57,y:.43,target:-.2},{x:.81,y:.69,target:.3}];
for(const depth of [1,2,3])for(const activation of ['tanh','relu','linear']){
 const net=M.network(3,activation,17,depth),analytic=M.lossGradient(net,samples),epsilon=1e-6;
 for(let k=0;k<net.p.length;k++){const old=net.p[k];net.p[k]=old+epsilon;const plus=M.lossGradient(net,samples).loss;net.p[k]=old-epsilon;const minus=M.lossGradient(net,samples).loss;net.p[k]=old;close(analytic.gradient[k],(plus-minus)/(2*epsilon),5e-8);}
 close(M.forward(net,.2,-.6).prediction,M.predict(net,.2,-.6));
}
const a=M.makeState(),b=M.makeState();assert.deepEqual(a.data,b.data);assert.deepEqual(Array.from(a.network.p),Array.from(b.network.p));M.advance(a,17);M.advance(b,7);M.advance(b,10);assert.deepEqual(Array.from(a.network.p),Array.from(b.network.p));
for(const sampleCount of [25,225,900]){const ds=M.data({...M.DEFAULTS,sampleCount});assert.equal(ds.train.length,sampleCount);assert.equal(ds.validation.length,441);const coordinates=new Set(ds.train.map(p=>`${p.x},${p.y}`));assert.ok(ds.validation.every(p=>!coordinates.has(`${p.x},${p.y}`)));}
const fixedGridA=M.data({...M.DEFAULTS,sampleCount:25,dataSeed:1}),fixedGridB=M.data({...M.DEFAULTS,sampleCount:900,dataSeed:177});assert.deepEqual(fixedGridA.validation,fixedGridB.validation);
const normal=M.makeState(),altered=M.makeState();altered.data.validation.forEach(p=>p.target+=1000);M.advance(normal,9);M.advance(altered,9);assert.deepEqual(Array.from(normal.network.p),Array.from(altered.network.p));
const results=[];
for(const [functionId,preset] of Object.entries(M.TWO)){const state=M.makeState({source:preset.source,functionId}),before=state.metrics.validation.rmse;for(let i=0;i<200;i++)M.advance(state,10);assert.equal(state.status,'ended');assert.ok(state.metrics.validation.rmse<before*.25,`${functionId}: actual default training must improve`);assert.ok(state.history.length<=402);results.push(`${functionId} RMSE=${state.metrics.validation.rmse.toFixed(5)}`);}
for(const depth of [2,3]){const state=M.makeState({depth,width:12,maxSteps:400}),before=state.metrics.train.rmse;for(let i=0;i<40;i++)M.advance(state,10);assert.equal(state.network.layers.length,depth+1);assert.ok(state.metrics.train.rmse<before*.35);}
const linear=M.makeState({activation:'linear'});for(let i=0;i<200;i++)M.advance(linear,10);assert.ok(linear.metrics.validation.rmse>.25);const pred=(x,y)=>M.predict(linear.network,x,y);close(pred(.2,.7)+pred(-.4,-.5),2*pred(-.1,.1),1e-10);
const failure=M.makeState();failure.config.learningRate=Infinity;const before=Array.from(failure.network.p);M.advance(failure,1);assert.equal(failure.status,'failed');assert.equal(failure.step,0);assert.deepEqual(Array.from(failure.network.p),before);
for(const invalid of [{sampleCount:24},{sampleCount:901},{depth:0},{depth:4},{width:0},{width:49},{learningRate:NaN},{dataSeed:-1},{maxSteps:2001}])assert.notEqual(M.validateConfig({...M.DEFAULTS,...invalid}),'');
for(const source of ['-0.4','0','-0.2-x^2-y^2']){const state=M.makeState({source,sampleCount:25,depth:3,width:4});assert.ok(state.range[0]<state.range[1]);M.advance(state,1);assert.ok(Number.isFinite(state.metrics.validation.rmse));}
assert.throws(()=>M.makeState({source:'log(-1)'}));assert.throws(()=>M.makeState({source:'1/(x-x)'}));
console.log('Passed: 1D interpolation=ReLU construction; slope changes; density; manual units/restore; immutable baseline; parser/domain guards; all-depth gradients; deterministic training; validation isolation; five real regressions; deep training; affine counterexample; atomic failure/bounds.');console.log(results.join('\n'));
