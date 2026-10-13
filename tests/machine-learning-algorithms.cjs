'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const sandbox={};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../topics/machine-learning-algorithms/scripts/model.js'),'utf8'),sandbox);
const M=sandbox.MachineLearningLab;
const close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} ≈ ${b}`);
const clone=o=>JSON.parse(JSON.stringify(o));
const run=s=>{let guard=0;while(!s.done&&guard++<3000)M.step(s);assert.ok(s.done,'bounded termination');return s;};
for(const p of [{x:.7,y:-.4,label:1},{x:2,y:1,label:1}]){
 const w=[1.1,.4],b=.15,lambda=.07,g=M.hingeGradient(w,b,p,lambda),eps=1e-6;
 for(let i=0;i<2;i++){const a=w.slice(),c=w.slice();a[i]+=eps;c[i]-=eps;close(g.dw[i],(M.svmObjective(a,b,[p],lambda)-M.svmObjective(c,b,[p],lambda))/(2*eps));}
 close(g.db,(M.svmObjective(w,b+eps,[p],lambda)-M.svmObjective(w,b-eps,[p],lambda))/(2*eps));
}
const equality=M.hingeGradient([1,0],0,{x:1,y:0,label:1},.1);assert.equal(equality.active,false);close(equality.dw[0],.1);
assert.equal(JSON.stringify(M.generateData('xor',42)),JSON.stringify(M.generateData('xor',42)));
assert.notEqual(JSON.stringify(M.generateData('xor',42)),JSON.stringify(M.generateData('xor',43)));
const s=M.createState();const expectedPoint=s.data.train[s.order[0]];
M.step(s);assert.equal(s.current,s.order[0]);assert.deepEqual(clone(s.w),[0,0]);
M.step(s);close(s.grad.margin,0);M.step(s);assert.deepEqual(clone(s.w),[0,0]);M.step(s);
close(s.w[0],.08*expectedPoint.label*expectedPoint.x);close(s.w[1],.08*expectedPoint.label*expectedPoint.y);close(s.b,.08*expectedPoint.label);
const svm=run(M.createState());assert.equal(svm.updates,288);assert.equal(svm.steps,1152);assert.ok(M.metrics(svm).validation>=.9);assert.ok(M.svmObjective(svm.w,svm.b,svm.data.train,.04)<.12);
const svmAgain=run(M.createState());assert.equal(JSON.stringify(svm.w),JSON.stringify(svmAgain.w));assert.equal(svm.b,svmAgain.b);
const poisoned=M.createState();poisoned.data.validation.forEach(p=>{p.x=1e8;p.y=-1e8;p.label=-p.label;});run(poisoned);assert.equal(JSON.stringify(svm.w),JSON.stringify(poisoned.w),'validation points cannot alter training');
const xor=run(M.createState({dataset:'xor'}));assert.ok(M.metrics(xor).train<1,'linear model does not claim perfect XOR separation');
const toy=[{id:2,x:1,y:0,label:1},{id:1,x:-1,y:0,label:-1},{id:3,x:0,y:2,label:1}];assert.equal(M.nearest(toy,{x:0,y:0},1)[0].id,1,'distance ties ordered by id');assert.equal(M.predictKnn(toy,{x:0,y:0},3),1);
const knn=run(M.createState({algorithm:'knn'}));assert.equal(knn.distances.length,24);assert.equal(knn.neighbors.length,5);assert.equal(knn.votes.positive+knn.votes.negative,5);assert.equal(knn.steps,31);assert.equal(knn.prediction,M.predictKnn(knn.data.train,knn.query,5));
for(const dataset of ['separable','xor','overlap'])for(const clusters of [2,3,5]){
 const km=run(M.createState({algorithm:'kmeans',dataset,clusters}));
 assert.ok(km.assignments.every(v=>Number.isInteger(v)&&v>=0&&v<clusters));
 assert.ok(km.centers.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)));
 for(let i=1;i<km.history.length;i++)assert.ok(km.history[i].y<=km.history[i-1].y+1e-9,'Lloyd full-round objective does not increase');
 const check=km.points.reduce((total,p,i)=>total+M.distance(p,km.centers[km.assignments[i]])**2,0);close(km.inertia,check);
}
const empty=M.createState({algorithm:'kmeans',clusters:3});empty.centers=empty.centers.map(()=>({x:0,y:0}));M.advanceRound(empty);assert.ok(empty.emptyClusters.length===2);assert.deepEqual(clone(empty.centers[1]),{x:0,y:0});assert.ok(Number.isFinite(empty.inertia));
for(const bad of [{eta:NaN},{seed:0},{seed:1.2},{k:2},{clusters:6},{queryX:4},{interval:79},{algorithm:'oops'}])assert.throws(()=>M.createState(bad));
const base=M.createState(), changedCfg=M.editSample(base.config,1,{x:0.7,y:-1.1,label:-1}),changed=M.createState(changedCfg);
assert.deepEqual(clone(changed.data.validation),clone(base.data.validation),'editable samples cannot contaminate validation');
assert.deepEqual(clone(changed.data.train[0]),{id:1,x:.7,y:-1.1,label:-1,split:'train'});
assert.deepEqual(clone(changed.data.train.slice(1)),clone(base.data.train.slice(1)),'editing one sample leaves other samples alone');
assert.deepEqual(clone(changed),clone(M.createState(changedCfg)),'edited configuration is reproducible');
const twice=M.editSample(changedCfg,1,{y:.5});assert.equal(twice.edits.length,1);assert.equal(twice.edits[0].x,.7);assert.equal(twice.edits[0].y,.5);
assert.deepEqual(clone(M.createState({...twice,edits:[]}).data),clone(base.data),'restore seed-generated samples');
assert.throws(()=>M.editSample(base.config,25,{x:1}));
for(const edits of [[{id:1,x:3,y:0,label:1}],[{id:1,x:0,y:NaN,label:1}],[{id:1,x:0,y:0,label:0}],[{id:1,x:0,y:0,label:1},{id:1,x:0,y:0,label:1}]])assert.throws(()=>M.createState({edits}));
const finite=M.createState({eta:.5,lambda:1});run(finite);assert.ok(finite.w.every(Number.isFinite));
const corrupt=M.createState();M.step(corrupt);M.step(corrupt);M.step(corrupt);corrupt.grad.dw[0]=Infinity;M.step(corrupt);assert.ok(corrupt.done);assert.equal(corrupt.status,'error');
console.log('PASS: SVM analytic gradients and parameter steps; seeded reproducibility; validation isolation; XOR boundary; kNN ranking/voting; Lloyd monotonic full rounds and empty clusters; bounded stops and invalid inputs.');
console.log(JSON.stringify({svm:{training:M.metrics(svm).train,validation:M.metrics(svm).validation,objective:M.metrics(svm).primary,steps:svm.steps},xor:{training:M.metrics(xor).train,validation:M.metrics(xor).validation},knn:{prediction:knn.prediction,votes:knn.votes,steps:knn.steps}},null,2));
