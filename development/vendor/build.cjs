// Developer command only: npm install --ignore-scripts, then npm run build.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const esbuild = require('esbuild');
const here = __dirname;
const topics = path.resolve(here, '../../topics');
const output = path.join(here, 'output');
fs.rmSync(output, {recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});
esbuild.buildSync({entryPoints:[path.join(here,'d3-entry.mjs')], outfile:path.join(output,'d3.v7.9.0.min.js'), bundle:true, minify:true, format:'iife', globalName:'d3', target:'es2018', legalComments:'none'});
const licenses=path.join(output,'d3-licenses');fs.mkdirSync(licenses);
const visited=new Set();
function packageDir(name){
  let dir=path.dirname(require.resolve(name));
  while(dir!==path.dirname(dir)){
    const file=path.join(dir,'package.json');
    if(fs.existsSync(file)&&JSON.parse(fs.readFileSync(file)).name===name)return dir;
    dir=path.dirname(dir);
  }
  throw Error('Cannot locate installed package: '+name);
}
function licenseTree(name){
  if(visited.has(name))return;visited.add(name);
  const pkgDir=packageDir(name);
  for(const f of fs.readdirSync(pkgDir))if(/^licen[cs]e/i.test(f))fs.copyFileSync(path.join(pkgDir,f),path.join(licenses,name.replaceAll('/','-')+'-'+f));
  for(const dep of Object.keys(JSON.parse(fs.readFileSync(path.join(pkgDir,'package.json'))).dependencies||{}))licenseTree(dep);
}
licenseTree('d3');
const katexDir=packageDir('katex');
const mathDir=path.join(output,'katex');fs.mkdirSync(path.join(mathDir,'fonts'),{recursive:true});
for(const f of ['katex.min.js','katex.min.css'])fs.copyFileSync(path.join(katexDir,'dist',f),path.join(mathDir,f));
fs.copyFileSync(path.join(katexDir,'LICENSE'),path.join(mathDir,'LICENSE'));
let css=fs.readFileSync(path.join(mathDir,'katex.min.css'),'utf8');
css=css.replace(/,url\([^)]*\.(?:woff|ttf)\) format\("[^"]*"\)/g,'');
fs.writeFileSync(path.join(mathDir,'katex.min.css'),css);
for(const f of fs.readdirSync(path.join(katexDir,'dist/fonts')))if(f.endsWith('.woff2'))fs.copyFileSync(path.join(katexDir,'dist/fonts',f),path.join(mathDir,'fonts',f));
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
fs.writeFileSync(path.join(output,'SHA256SUMS.txt'),files(output).sort().map(f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')+'  '+path.relative(output,f)).join('\n')+'\n');
if(!process.argv.includes('--build-only'))for(const topic of fs.readdirSync(topics)){if(!fs.existsSync(path.join(topics,topic,'index.html')))continue;fs.cpSync(output,path.join(topics,topic,'vendor'),{recursive:true});}
console.log(process.argv.includes('--build-only')?'Development artifacts rebuilt; lesson directories unchanged.':'Local traditional D3/KaTeX artifacts copied to all lesson vendor directories.');
