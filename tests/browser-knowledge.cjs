/* Behavioral acceptance for the offline field guide, not styling snapshots alone. */
const {chromium,firefox}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),source=process.env.COURSE_TOPICS_ROOT||path.join(root,'topics');
const out=process.env.COURSE_QA_OUTPUT||path.join(os.tmpdir(),'ai-studio-qa');fs.mkdirSync(out,{recursive:true});
const ids=['machine-learning-algorithms','gradient-descent','monte-carlo-optimization','mlp-playground','universal-approximation'];
async function state(page,id){return page.evaluate(id=>{
 if(id==='machine-learning-algorithms'){const s=MachineLearningLab.getState();return {running:s.status==='running',progress:[s.updates,s.phase,s.stage]};}
 if(id==='mlp-playground'){const s=MLPLab.App.getState();return {running:s.running,progress:[s.epochs,s.updates]};}
 if(id==='universal-approximation'){const s=UniversalApprox.App.getOneState();return {running:s.status==='running',progress:[s.added,s.status]};}
 const s=OptimizationApp.getState();return {running:!document.getElementById('pause').disabled,progress:[s.step,s.phase]};
},id);}
(async()=>{for(const [name,engine,options] of [['Chrome',chromium,{executablePath:process.env.COURSE_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}],['Firefox',firefox,{}]]){
const browser=await engine.launch({headless:true,...options});console.log(name,browser.version());
for(const id of ids){
 const dst=path.join(os.tmpdir(),'知识手册 独立离线 '+name,id);fs.rmSync(dst,{force:true,recursive:true});fs.mkdirSync(path.dirname(dst),{recursive:true});fs.cpSync(path.join(source,id),dst,{recursive:true});
 const context=await browser.newContext({viewport:{width:1366,height:768},offline:true,reducedMotion:'reduce'});const p=await context.newPage();const errors=[],requests=[],failed=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});p.on('requestfailed',r=>failed.push(r.url()));
 if(name==='Chrome'){const cdp=await context.newCDPSession(p);await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});}
 await p.goto(pathToFileURL(path.join(dst,'index.html')).href);await p.locator('.knowledge-open').waitFor();
 const before=await state(p,id);await p.locator('.knowledge-open').click();assert.equal(await p.locator('dialog').evaluate(d=>d.open),true);assert.deepEqual(await state(p,id),before,'Opening a ready lesson must not alter it');
 await p.locator('#knowledge-tab-0').focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('#knowledge-tab-1').getAttribute('aria-selected'),'true');assert.ok(await p.locator('#knowledge-panel-1 .katex').count()>=3);assert.equal(await p.locator('.katex-error').count(),0);
 await p.keyboard.press('End');const links=await p.locator('.knowledge-source').evaluateAll(list=>list.map(a=>({url:a.href,target:a.target,rel:a.rel,text:a.innerText})));assert.ok(links.length>=3);for(const a of links){assert.ok(/^https?:/.test(a.url));assert.equal(a.target,'_blank');assert.ok(a.rel.includes('noopener')&&a.rel.includes('noreferrer'));assert.ok(a.text.length>40);}
 await p.keyboard.press('Escape');assert.equal(await p.locator('dialog').evaluate(d=>d.open),false);assert.equal(await p.evaluate(()=>document.activeElement.className),'knowledge-open');
 if(id==='universal-approximation')await p.click('#stage-2');const start=id==='machine-learning-algorithms'?'#play':id==='mlp-playground'?'#exploreTrain':id==='universal-approximation'?'#relu-start':'#start';await p.click(start);assert.equal((await state(p,id)).running,true);
 await p.locator('.knowledge-open').click();assert.equal((await state(p,id)).running,false);assert.match(await p.locator('.knowledge-footer').textContent(),/暂停/);const paused=await state(p,id);await p.waitForTimeout(800);assert.deepEqual(await state(p,id),paused,'No late loop write while reading');
 await p.getByRole('tab',{name:'直觉与实验'}).click();await p.screenshot({path:path.join(out,id+'-guide-'+name+'.png')});
 // Native dialog traps Tab and Shift+Tab.
 for(let i=0;i<12;i++){await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)),true);}
 await p.getByRole('button',{name:'关闭知识手册'}).click();assert.equal((await state(p,id)).running,false);
 await p.locator('.knowledge-open').click();await p.mouse.click(10,100);assert.equal(await p.locator('dialog').evaluate(d=>d.open),false);
 for(const viewport of [{width:1920,height:1080},{width:390,height:844}]){await p.setViewportSize(viewport);await p.locator('.knowledge-open').click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const rect=await p.locator('dialog').boundingBox();assert.ok(rect.x>=-1&&rect.x+rect.width<=viewport.width+1);await p.getByRole('tab',{name:'数学关系'}).click();await p.screenshot({path:path.join(out,id+'-guide-'+viewport.width+'-'+name+'.png')});await p.keyboard.press('Escape');}
 await p.setViewportSize({width:1366,height:768});await p.evaluate(()=>document.body.style.zoom='2');await p.locator('.knowledge-open').click();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.keyboard.press('Escape');
 assert.deepEqual(errors,[],id+' uncaught');assert.deepEqual(requests,[],id+' network');assert.deepEqual(failed,[],id+' missing resources');console.log(id,'guide pause/state/keyboard/sources/overflow/offline PASS');await context.close();
}
await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
