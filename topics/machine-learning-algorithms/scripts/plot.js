(function (root) {
  'use strict';
  const L=root.MachineLearningLab, D=root.d3;
  const colors=['#2457c5','#b45309','#0f766e','#7e22ce','#a21caf'];
  let geometry, knnCache;
  const clamp=n=>Math.max(-2.5,Math.min(2.5,n));
  const signal=(name,detail)=>document.getElementById('plot').dispatchEvent(new CustomEvent(name,{detail}));
  function implicit(w,b,level) {
    const pts=[];
    for(const x of [-2.5,2.5])if(Math.abs(w[1])>1e-12){const y=(level-b-w[0]*x)/w[1];if(y>=-2.5&&y<=2.5)pts.push([x,y]);}
    for(const y of [-2.5,2.5])if(Math.abs(w[0])>1e-12){const x=(level-b-w[1]*y)/w[0];if(x>=-2.5&&x<=2.5)pts.push([x,y]);}
    return pts.length>1?pts.slice(0,2):[];
  }
  function draw(s) {
    const el=document.getElementById('plot'),r=el.getBoundingClientRect();
    const w=Math.max(280,r.width),h=Math.max(270,r.height),m={l:52,r:18,t:18,b:48};
    const X=D.scaleLinear().domain([-2.5,2.5]).range([m.l,w-m.r]),Y=D.scaleLinear().domain([-2.5,2.5]).range([h-m.b,m.t]);
    geometry={X,Y,w,h,m};
    const svg=D.select(el).attr('viewBox',`0 0 ${w} ${h}`);
    svg.selectAll('*').remove();
    svg.append('defs').append('clipPath').attr('id','plot-clip').append('rect').attr('x',m.l).attr('y',m.t).attr('width',w-m.l-m.r).attr('height',h-m.t-m.b);
    const graph=svg.append('g').attr('clip-path','url(#plot-clip)');
    graph.append('rect').attr('class','plot-background').attr('x',m.l).attr('y',m.t).attr('width',w-m.l-m.r).attr('height',h-m.t-m.b).attr('fill','#fafcff');
    const mode=s.config.algorithm;
    if(mode==='kmeans') {
      const voronoi=D.Delaunay.from(s.centers,c=>X(c.x),c=>Y(c.y)).voronoi([m.l,m.t,w-m.r,h-m.b]);
      graph.selectAll('.voronoi').data(s.centers).join('path').attr('class','voronoi').attr('d',(_,i)=>voronoi.renderCell(i)).attr('fill',(_,i)=>colors[i]).attr('fill-opacity',.065).attr('stroke','#fff').attr('stroke-width',1.5);
    } else if(mode==='svm'&&s.updates||mode==='knn'&&s.done) {
      const n=50,values=[];
      if(mode==='knn'&&knnCache?.data===s.data&&knnCache.k===s.config.k)values.push(...knnCache.values);
      else {
        for(let j=0;j<n;j++)for(let i=0;i<n;i++) {
          const p={x:-2.5+(i+.5)*5/n,y:2.5-(j+.5)*5/n};
          values.push(mode==='svm'?L.score(s.w,s.b,p):L.predictKnn(s.data.train,p,s.config.k));
        }
        if(mode==='knn')knnCache={data:s.data,k:s.config.k,values:values.slice()};
      }
      graph.select('.plot-background').attr('fill','#fff4e9');
      const transform=D.geoTransform({point(x,y){this.stream.point(m.l+x*(w-m.l-m.r)/n,m.t+y*(h-m.t-m.b)/n);}});
      graph.selectAll('.decision-region').data(D.contours().size([n,n]).thresholds([0])(values)).join('path').attr('class','decision-region').attr('d',D.geoPath(transform)).attr('fill','#eaf0ff');
    }
    const grid=svg.append('g').attr('class','plot-grid');
    grid.append('g').attr('transform',`translate(0,${h-m.b})`).call(D.axisBottom(X).ticks(5).tickSize(-(h-m.b-m.t)).tickFormat(''));
    grid.append('g').attr('transform',`translate(${m.l},0)`).call(D.axisLeft(Y).ticks(5).tickSize(-(w-m.l-m.r)).tickFormat(''));
    const axes=svg.append('g').attr('class','plot-axes');
    axes.append('g').attr('transform',`translate(0,${h-m.b})`).call(D.axisBottom(X).ticks(5).tickSize(5));
    axes.append('g').attr('transform',`translate(${m.l},0)`).call(D.axisLeft(Y).ticks(5).tickSize(5));
    axes.append('text').attr('class','axis-label').attr('x',(m.l+w-m.r)/2).attr('y',h-10).attr('text-anchor','middle').text('特征 x₁（无量纲）');
    axes.append('text').attr('class','axis-label').attr('transform',`translate(15,${(m.t+h-m.b)/2}) rotate(-90)`).attr('text-anchor','middle').text('特征 x₂（无量纲）');
    function segment(a,b,color,width=1.5,dash='') {
      graph.append('line').attr('x1',X(a.x)).attr('y1',Y(a.y)).attr('x2',X(b.x)).attr('y2',Y(b.y)).attr('stroke',color).attr('stroke-width',width).attr('stroke-dasharray',dash).attr('class','algorithm-link');
    }
    if(mode==='svm') {
      const lines=[{w:s.w,b:s.b,level:-1,color:'#657792',dash:'5 4'},{w:s.w,b:s.b,level:1,color:'#657792',dash:'5 4'},{w:s.w,b:s.b,level:0,color:'#182230',dash:''}];
      if(s.stage==='update'&&s.before)lines.unshift({w:s.before.w,b:s.before.b,level:0,color:'#8c98ab',dash:'3 4'});
      graph.selectAll('.svm-boundary').data(lines).join('path').attr('class','svm-boundary').attr('d',q=>D.line()(implicit(q.w,q.b,q.level).map(([x,y])=>[X(x),Y(y)]))).attr('fill','none').attr('stroke',q=>q.color).attr('stroke-width',q=>q.level===0?2.5:1.3).attr('stroke-dasharray',q=>q.dash);
    }
    if(mode==='knn') {
      if(s.current>=0)segment(s.query,s.data.train[s.current],'#182230',2);
      s.neighbors.forEach((p,i)=>segment(s.query,s.data.train[p.index],i<s.votePosition?colors[p.label>0?0:1]:'#7d8da5',i<s.votePosition?2.5:1.5,i<s.votePosition?'':'4 4'));
    }
    if(mode==='kmeans') {
      if(s.current>=0)s.centers.forEach((c,j)=>segment(s.points[s.current],c,colors[j],s.assignments[s.current]===j?2.5:1,s.assignments[s.current]===j?'':'4 4'));
      if(s.previousCenters&&s.stage==='centers')s.centers.forEach((c,j)=>segment(s.previousCenters[j],c,colors[j],2,'3 3'));
    }
    const points=mode==='kmeans'?s.points:s.data.train.concat(s.data.validation);
    const symbols=[D.symbolCircle,D.symbolSquare,D.symbolTriangle,D.symbolDiamond,D.symbolCross];
    const pColor=(p,i)=>mode==='kmeans'?(s.assignments[i]<0?'#718199':colors[s.assignments[i]]):colors[p.label>0?0:1];
    const layer=graph.append('g');
    const nodes=layer.selectAll('.sample-mark').data(points,p=>p.id).join('g').attr('data-id',p=>p.id).attr('class',p=>'sample-mark '+(p.split==='train'?'training-point':'validation-point')).attr('transform',p=>`translate(${X(p.x)},${Y(p.y)})`);
    nodes.append('circle').attr('pointer-events','none').attr('r',12).attr('fill','transparent').attr('stroke',(p,i)=>i===s.current?'#182230':p.id===s.inspected?'#7c3aed':'none').attr('stroke-width',2.5).attr('stroke-dasharray',(p,i)=>i===s.current?'':'3 2');
    nodes.append('path').attr('d',(p,i)=>D.symbol().type(mode==='kmeans'?symbols[Math.max(0,s.assignments[i])]:p.split==='validation'?D.symbolCross:p.label>0?D.symbolCircle:D.symbolSquare).size(p.split==='validation'&&mode!=='kmeans'?58:82)()).attr('fill',p=>p.split==='validation'&&mode!=='kmeans'?'#fff':null).attr('fill',(p,i)=>p.split==='validation'&&mode!=='kmeans'?'#fff':pColor(p,i)).attr('stroke',pColor).attr('stroke-width',1.8);
    nodes.append('title').text(p=>`#${p.id} · ${p.split==='train'?'训练':'验证'} · (${L.fmt(p.x)}, ${L.fmt(p.y)})${mode==='kmeans'?'':' · '+(p.label>0?'A':'B')}`);
    nodes.filter(p=>p.split==='train').attr('tabindex',0).attr('role','button')
      .attr('aria-label',p=>`选择训练样本${p.id}，坐标${L.fmt(p.x)}、${L.fmt(p.y)}`)
      .on('click',(event,p)=>{event.stopPropagation();signal('sample-select',{id:p.id});})
      .on('keydown',(event,p)=>{if(['Enter',' '].includes(event.key)){event.preventDefault();signal('sample-select',{id:p.id});}})
      .call(D.drag().subject((event,p)=>({x:X(p.x),y:Y(p.y)})).clickDistance(4)
        .on('start',function(event,p){this._dragOrigin={x:event.x,y:event.y};signal('sample-drag-start',{id:p.id});})
        .on('drag',function(event){D.select(this).attr('transform',`translate(${X(clamp(X.invert(event.x)))},${Y(clamp(Y.invert(event.y)))})`);})
        .on('end',function(event,p){
          const origin=this._dragOrigin;
          if(Math.hypot(event.x-origin.x,event.y-origin.y)<3){signal('sample-select',{id:p.id});return;}
          signal('sample-move',{id:p.id,x:Number(clamp(X.invert(event.x)).toFixed(3)),y:Number(clamp(Y.invert(event.y)).toFixed(3))});
        }));
    nodes.filter(p=>p.id===s.inspected).raise();
    if(mode==='knn') {
      const q=graph.append('g').attr('class','query-point').attr('transform',`translate(${X(s.query.x)},${Y(s.query.y)})`);
      q.append('path').attr('d',D.symbol().type(D.symbolDiamond).size(240)()).attr('fill',s.prediction===null?'#fff':colors[s.prediction>0?0:1]).attr('stroke','#182230').attr('stroke-width',2.5);
      q.append('text').attr('x',13).attr('y',-10).attr('class','plot-point-label').text('查询');
      q.on('click',e=>e.stopPropagation()).call(D.drag().subject(()=>({x:X(s.query.x),y:Y(s.query.y)})).on('start',function(event){this._dragOrigin={x:event.x,y:event.y};signal('query-drag-start',{});}).on('drag',function(event){D.select(this).attr('transform',`translate(${X(clamp(X.invert(event.x)))},${Y(clamp(Y.invert(event.y)))})`);}).on('end',function(event){if(Math.hypot(event.x-this._dragOrigin.x,event.y-this._dragOrigin.y)<3){signal('query-cancel',{});return;}signal('query-move',{x:Number(clamp(X.invert(event.x)).toFixed(3)),y:Number(clamp(Y.invert(event.y)).toFixed(3))});}));
    }
    if(mode==='kmeans') {
      const centers=graph.append('g').selectAll('.cluster-center').data(s.centers).join('g').attr('class','cluster-center').attr('transform',c=>`translate(${X(c.x)},${Y(c.y)})`);
      centers.append('circle').attr('r',12).attr('fill','#fff').attr('stroke',(_,i)=>colors[i]).attr('stroke-width',3);
      centers.append('text').attr('text-anchor','middle').attr('dy','.35em').attr('fill',(_,i)=>colors[i]).attr('class','center-number').text((_,i)=>i+1);
      centers.append('title').text((c,i)=>`中心C${i+1}：${L.fmt(c.x)}, ${L.fmt(c.y)}`);
    }
    if(s.current>=0) {
      const p=points[s.current];
      graph.append('text').attr('class','plot-point-label').attr('x',Math.min(w-m.r-28,X(p.x)+14)).attr('y',Math.max(m.t+14,Y(p.y)-14)).text('#'+p.id);
    }
  }
  function pointer(event) {
    if(!geometry)return null;
    const [x,y]=D.pointer(event,document.getElementById('plot')),{X,Y,w,h,m}=geometry;
    if(x<m.l||x>w-m.r||y<m.t||y>h-m.b)return null;
    return {x:Number(X.invert(x).toFixed(2)),y:Number(Y.invert(y).toFixed(2))};
  }
  Object.assign(L,{drawInteractivePlot:draw,interactivePlotToPoint:pointer});
})(window);
