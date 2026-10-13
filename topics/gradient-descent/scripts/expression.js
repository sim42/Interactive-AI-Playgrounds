(function (root) {
  'use strict';
  const names = new Set(['sin', 'cos', 'tan', 'tanh', 'exp', 'log', 'ln', 'sqrt', 'abs', 'pow', 'min', 'max']);
  const fail = message => { throw new Error(message); };
  function compile(input, options) {
    if (typeof input !== 'string' || !input.trim()) fail('请输入函数，例如 x^2 + y^2。');
    if (input.length > 240) fail('函数最多 240 个字符，请拆成较短的表达式。');
    const source = input.trim();
    const text = source.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi').replace(/\*\*/g, '^');
    const variables = (options && options.variables) || ['x', 'y'];
    if (!Array.isArray(variables) || variables.some(v => !['x', 'y'].includes(v))) fail('变量仅支持 x 和 y。');
    const tokens = []; let cursor = 0;
    while (cursor < text.length) {
      if (/\s/.test(text[cursor])) { cursor++; continue; }
      const tail = text.slice(cursor);
      const number = tail.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (number) { const value = Number(number[0]); if (!Number.isFinite(value)) fail('常数必须为有限数值。'); tokens.push({kind:'number',value,pos:cursor}); cursor += number[0].length; continue; }
      const name = tail.match(/^[a-zA-Z_][a-zA-Z_0-9]*/);
      if (name) { tokens.push({kind:'name',value:name[0].toLowerCase(),pos:cursor}); cursor += name[0].length; continue; }
      if ('+-*/^(),'.includes(text[cursor])) { tokens.push({kind:text[cursor],pos:cursor}); cursor++; continue; }
      fail('第 '+(cursor+1)+' 个字符无法识别；使用 x、y、数字与数学运算符。');
    }
    tokens.push({kind:'end',pos:text.length});
    let at = 0, nodes = 0, depth = 0;
    const peek = kind => tokens[at].kind === kind;
    const eat = kind => { if (!peek(kind)) fail('第 '+(tokens[at].pos+1)+' 个字符附近需要“'+kind+'”。'); return tokens[at++]; };
    const node = (kind, data) => { if (++nodes > 120) fail('表达式过于复杂，最多 120 个运算节点。'); return {kind,...data}; };
    function nested(fn) { if (++depth > 32) fail('括号或运算嵌套过深，最多 32 层。'); const value = fn(); depth--; return value; }
    function atom() {
      if (peek('number')) return node('number',{value:eat('number').value});
      if (peek('(')) { eat('('); const value = nested(sum); eat(')'); return value; }
      if (peek('name')) {
        const name = eat('name').value;
        if (name === 'pi' || name === 'e') return node('number',{value:name==='pi'?Math.PI:Math.E});
        if (variables.includes(name)) return node('variable',{name});
        if (!names.has(name)) fail('未知名称“'+name+'”。允许变量 '+variables.join('、')+'；乘法请写 *。');
        eat('('); const args = [nested(sum)];
        while (peek(',')) { eat(','); args.push(nested(sum)); if (args.length>2) fail('函数最多两个参数。'); }
        eat(')'); const arity = ['pow','min','max'].includes(name)?2:1;
        if (args.length !== arity) fail(name+' 需要 '+arity+' 个参数。');
        return name==='pow'?node('binary',{op:'^',a:args[0],b:args[1]}):node('call',{name,args});
      }
      fail('第 '+(tokens[at].pos+1)+' 个字符附近缺少数值或变量。');
    }
    function power() { const a=atom(); return peek('^')?(eat('^'),node('binary',{op:'^',a,b:nested(unary)})):a; }
    function unary() { if (peek('+')) {eat('+');return nested(unary);} if (peek('-')) {eat('-');return node('negative',{a:nested(unary)});} return power(); }
    function product() { let a=unary(); while(peek('*')||peek('/')) {const op=tokens[at++].kind;a=node('binary',{op,a,b:unary()});} return a; }
    function sum() { let a=product(); while(peek('+')||peek('-')) {const op=tokens[at++].kind;a=node('binary',{op,a,b:product()});} return a; }
    const ast=sum();
    if (!peek('end')) fail('第 '+(tokens[at].pos+1)+' 个字符后有多余内容；乘法必须写 *，例如 2*x。');
    const finite = value => { if(!Number.isFinite(value))fail('函数在该位置无实数有限值：检查除零、开方、对数或指数范围。'); return value; };
    function call(name,a,b) {
      if ((name==='log'||name==='ln') && a<=0) fail('log 的输入必须大于 0。');
      if (name==='sqrt' && a<0) fail('sqrt 的输入不能为负数。');
      if (name==='tan' && Math.abs(Math.cos(a))<1e-12) fail('tan 在该位置接近无定义点。');
      return finite((name==='ln'?Math.log:Math[name])(a,b));
    }
    function operation(op,a,b) {
      if(op==='/' && b===0)fail('函数出现除零，请更换函数或缩小输入域。');
      return finite(op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:op==='/'?a/b:Math.pow(a,b));
    }
    function value(n,x,y) {
      if(n.kind==='number')return n.value;
      if(n.kind==='variable')return n.name==='x'?x:y;
      if(n.kind==='negative')return -value(n.a,x,y);
      if(n.kind==='binary')return operation(n.op,value(n.a,x,y),value(n.b,x,y));
      return call(n.name,value(n.args[0],x,y),n.args[1]?value(n.args[1],x,y):undefined);
    }
    function dependsOnVariable(n) {
      if(n.kind==='variable')return true;
      if(n.kind==='number')return false;
      if(n.kind==='negative')return dependsOnVariable(n.a);
      if(n.kind==='binary')return dependsOnVariable(n.a)||dependsOnVariable(n.b);
      return n.args.some(dependsOnVariable);
    }
    function dual(n,x,y,warnings) {
      if(n.kind==='number')return {v:n.value,dx:0,dy:0};
      if(n.kind==='variable')return {v:n.name==='x'?x:y,dx:n.name==='x'?1:0,dy:n.name==='y'?1:0};
      if(n.kind==='negative'){const a=dual(n.a,x,y,warnings);return {v:-a.v,dx:-a.dx,dy:-a.dy};}
      if(n.kind==='binary'){
        const a=dual(n.a,x,y,warnings),b=dual(n.b,x,y,warnings),v=operation(n.op,a.v,b.v);
        if(n.op==='+')return {v,dx:a.dx+b.dx,dy:a.dy+b.dy};
        if(n.op==='-')return {v,dx:a.dx-b.dx,dy:a.dy-b.dy};
        if(n.op==='*')return {v,dx:a.dx*b.v+a.v*b.dx,dy:a.dy*b.v+a.v*b.dy};
        if(n.op==='/')return {v,dx:(a.dx*b.v-a.v*b.dx)/(b.v*b.v),dy:(a.dy*b.v-a.v*b.dy)/(b.v*b.v)};
        if(!dependsOnVariable(n.b)){
          if(b.v===0)return {v,dx:0,dy:0};
          const factor=b.v*Math.pow(a.v,b.v-1);
          if(!Number.isFinite(factor))fail('幂函数在此处没有有限导数；请更换起点或函数。');
          return {v,dx:factor*a.dx,dy:factor*a.dy};
        }
        if(a.v<=0)fail('变量指数的梯度需要正底数，请使用 exp(...) 或调整定义域。');
        return {v,dx:v*(b.dx*Math.log(a.v)+b.v*a.dx/a.v),dy:v*(b.dy*Math.log(a.v)+b.v*a.dy/a.v)};
      }
      const a=dual(n.args[0],x,y,warnings),b=n.args[1]?dual(n.args[1],x,y,warnings):null,v=call(n.name,a.v,b&&b.v);let factor;
      if(n.name==='min'||n.name==='max'){
        if(a.v===b.v){warnings.push(n.name+' 在相等处分支不可导，本页采用两支导数平均值。');return {v,dx:(a.dx+b.dx)/2,dy:(a.dy+b.dy)/2};}
        const selected=(n.name==='min'?a.v<b.v:a.v>b.v)?a:b;return {v,dx:selected.dx,dy:selected.dy};
      }
      switch(n.name){
        case 'sin':factor=Math.cos(a.v);break;
        case 'cos':factor=-Math.sin(a.v);break;
        case 'tan':factor=1/Math.cos(a.v)**2;break;
        case 'tanh':factor=1-v*v;break;
        case 'exp':factor=v;break;
        case 'log':case 'ln':factor=1/a.v;break;
        case 'sqrt':if(a.v===0)fail('sqrt 在 0 处没有有限导数；请更换起点。');factor=.5/v;break;
        case 'abs':factor=Math.sign(a.v);if(a.v===0)warnings.push('abs 在 0 处不可导，本页采用次梯度 0。');break;
      }
      return {v,dx:factor*a.dx,dy:factor*a.dy};
    }
    function inputs(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))fail('输入坐标必须为有限数值。');}
    return Object.freeze({source,variables:variables.slice(),evaluate(x,y=0){inputs(x,y);return finite(value(ast,x,y));},gradient(x,y=0){inputs(x,y);const warnings=[],d=dual(ast,x,y,warnings);finite(d.dx);finite(d.dy);return {value:d.v,dx:d.dx,dy:d.dy,differentiable:warnings.length===0,warnings};}});
  }
  root.CourseExpression = Object.freeze({compile});
})(typeof window !== 'undefined' ? window : globalThis);
