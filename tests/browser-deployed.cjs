const { chromium, firefox } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const base = process.env.COURSE_PUBLIC_URL || 'https://ftp.dtsci.cn/IntroductionToAI/';
const out = process.env.COURSE_QA_OUTPUT || '/tmp/ai-course-qa/deployed';
const root = path.resolve(__dirname, '..');
fs.mkdirSync(out, { recursive: true });

(async () => {
  for (const [name, type, options] of [
    ['Chrome', chromium, { executablePath: process.env.COURSE_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }],
    ['Firefox', firefox, {}],
  ]) {
    const browser = await type.launch({ headless: true, ...options });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [], badResources = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) badResources.push([r.status(), r.url()]); });
    page.on('requestfailed', r => badResources.push([r.failure()?.errorText, r.url()]));
    if (name === 'Chrome') {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    }
    const go = async relative => {
      await page.goto(new URL(relative, base).href, { waitUntil: 'load', timeout: 30000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (relative.startsWith('topics/')) {
        await page.locator('.knowledge-open').click();
        assert.equal(await page.locator('#knowledge-drawer').evaluate(d => d.open), true);
        await page.getByRole('tab', { name: '数学关系' }).click();
        assert.ok(await page.locator('#knowledge-panel-1 .katex').count() >= 3);
        assert.equal(await page.locator('.katex-error').count(), 0);
        await page.getByRole('tab', { name: '延伸阅读' }).click();
        assert.ok(await page.locator('.knowledge-source').count() >= 3);
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => document.activeElement.className), 'knowledge-open');
      }
    };
    await go('');
    assert.equal(await page.locator('.lesson h2 a[href^="./topics/"]').count(), 5);
    await page.screenshot({ path: path.join(out, `hub-${name}.png`) });

    await go('topics/machine-learning-algorithms/index.html');
    for (let i = 0; i < 4; i++) await page.click('#step');
    assert.equal(await page.evaluate(() => MachineLearningLab.getState().updates), 1);
    assert.match(await page.locator('#math-diagram').textContent(), /Δ = −η/);
    await page.locator('#sample-editor > summary').click();await page.fill('#sample-x','0.2');await page.click('#apply-sample');
    assert.equal(await page.evaluate(()=>MachineLearningLab.getState().data.train[0].x),.2);
    assert.equal(await page.evaluate(()=>MachineLearningLab.getState().updates),0);


    for (const topic of ['gradient-descent', 'monte-carlo-optimization']) {
      await go(`topics/${topic}/index.html`);
      await page.fill('#expression', '(x-1)^2+(y+1)^2-10');
      await page.click('#apply-function');
      assert.ok(Number(await page.locator('#metric-0').textContent()) < 0);
      for (let i = 0; i < 3; i++) await page.click('#step');
      assert.equal(await page.evaluate(() => OptimizationApp.getState().step), 1);
      await page.click('#freeze');assert.equal(await page.evaluate(()=>OptimizationApp.getReference().step),1);
      for(let i=0;i<3;i++)await page.click('#step');
      assert.match(await page.locator('#comparison-summary').textContent(),/同为 1 次/);
      await page.screenshot({path:path.join(out,topic+'-'+name+'.png')});

    }

    await go('topics/mlp-playground/index.html');
    assert.equal(await page.locator('#featureNetwork .feature-node').count(),8);
    await page.click('#inspectTab');
    await page.click('#focusLoss');
    assert.match(await page.locator('#operation').textContent(), /ln/);
    await page.click('#next');
    await page.click('#next');
    assert.match(await page.locator('#operation').textContent(), /下游.*支路/);
    await page.screenshot({ path: path.join(out, `mlp-backward-${name}.png`) });
    while (!(await page.locator('#next').isDisabled())) await page.click('#next');
    assert.equal(await page.evaluate(() => MLPLab.App.getState().updates), 1);

    await go('topics/universal-approximation/index.html');
    await page.fill('#one-count', '17');
    await page.locator('#one-count').blur();
    assert.equal(await page.evaluate(() => UniversalApprox.App.getOneState().count), 17);
    await page.click('#stage-2');
    for (let i = 0; i < 17; i++) await page.click('#relu-step');
    assert.equal(await page.evaluate(() => UniversalApprox.App.getOneState().added), 17);
    await page.click('#basis-grid button[data-unit="4"]');await page.fill('#relu-weight','0');await page.locator('#relu-weight').blur();
    assert.equal(await page.evaluate(()=>UniversalApprox.App.getOneState().units[4].v),0);
    await page.click('#relu-restore');

    await page.click('#stage-3');
    await page.locator('.function-editor > summary').click();
    await page.fill('#surface-expression', 'sin(pi*x)*cos(pi*y)');
    await page.click('#surface-apply');
    await page.fill('#sample-count', '49');
    await page.locator('#sample-count').blur();
    await page.selectOption('#depth', '2');
    await page.click('#step');
    assert.equal(await page.evaluate(() => UniversalApprox.App.getState().step), 1);
    await page.click('#freeze-baseline');assert.ok(await page.evaluate(()=>!!UniversalApprox.App.getBaseline()));
    await page.selectOption('#prediction-model','baseline');
    await page.screenshot({path:path.join(out,'uat-'+name+'.png')});


    assert.deepEqual(errors, [], `${name}: uncaught errors`);
    assert.deepEqual(badResources, [], `${name}: failed HTTP resources`);
    console.log(name, browser.version(), 'five online lessons and hub passed');
    if (name === 'Chrome') {
      for (const filename of fs.readdirSync(path.join(root, 'dist')).filter(x => x.endsWith('.zip'))) {
        const response = await context.request.get(new URL(`dist/${filename}`, base).href, { timeout: 30000, maxRetries: 2 });
        assert.equal(response.status(), 200, filename);
        const body = await response.body();
        const digest = data => crypto.createHash('sha256').update(data).digest('hex');
        assert.equal(digest(body), digest(fs.readFileSync(path.join(root, 'dist', filename))), filename);
        console.log('Download SHA-256 matched:', filename);
      }
    }
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
