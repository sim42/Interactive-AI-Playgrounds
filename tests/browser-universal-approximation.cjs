"use strict";
const { chromium, firefox } = require(
  process.env.PLAYWRIGHT_PATH || "playwright",
);
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const out = process.env.COURSE_QA_OUTPUT || "/tmp";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const delivery = path.join("/tmp", "通用近似 独立验收", `run-${Date.now()}`);
  fs.mkdirSync(delivery, { recursive: true });
  fs.cpSync(
    path.join(
      process.env.COURSE_TOPICS_ROOT || path.resolve(__dirname, "../topics"),
      "universal-approximation",
    ),
    delivery,
    { recursive: true },
  );
  for (const engine of [chromium, firefox]) {
    const options = { headless: true };
    if (engine === chromium)
      options.executablePath =
        process.env.COURSE_CHROME_PATH ||
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    const browser = await engine.launch(options);
    try {
      const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        offline: true,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = [],
        remote = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("request", (r) => {
        if (/^https?:/.test(r.url())) remote.push(r.url());
      });
      if (engine === chromium) {
        const session = await context.newCDPSession(page);
        await session.send("Network.enable");
        await session.send("Network.setCacheDisabled", { cacheDisabled: true });
      }
      await page.goto(pathToFileURL(path.join(delivery, "index.html")).href);
      const state = () =>
        page.evaluate(() => ({
          one: {
            count: UniversalApprox.App.getOneState().count,
            added: UniversalApprox.App.getOneState().added,
            source: UniversalApprox.App.getOneState().source,
            status: UniversalApprox.App.getOneState().status,
          },
          two: {
            step: UniversalApprox.App.getState().step,
            status: UniversalApprox.App.getState().status,
            config: UniversalApprox.App.getState().config,
          },
          ui: UniversalApprox.App.getUI(),
        }));
      assert.equal((await state()).ui.stage, 1);
      assert.equal(await page.evaluate(()=>d3.version||typeof d3.scaleLinear), 'function');
      assert.ok(await page.locator('#sample-canvas .data-line').count()>=3);
      await page.click('#one-max-error');
      assert.ok(await page.evaluate(()=>{const o=UniversalApprox.App.getOneState(),x=UniversalApprox.App.getUI().probeX;return Math.abs(Math.abs(o.target.evaluate(x)-UniversalApprox.Model.interpolate(o,x))-o.gridError)<1e-12;}));
      await page.screenshot({
        path: `${out}/ua-refined-stage1-${engine.name()}.png`,
      });
      await page.fill("#one-count", "3");
      await page.locator("#one-count").blur();
      assert.equal((await state()).one.count, 3);
      await page.fill("#one-count", "40");
      await page.locator("#one-count").blur();
      assert.equal((await state()).one.count, 40);
      await page.fill("#one-count", "41");
      await page.locator("#one-count").blur();
      assert.ok(await page.locator("#one-error").isVisible());
      assert.equal((await state()).one.count, 40);
      await page.fill("#one-count", "9");
      await page.locator("#one-count").blur();
      await page.fill("#one-expression", "sin(pi*x)+x^2");
      await page.click("#one-apply");
      assert.equal((await state()).one.source, "sin(pi*x)+x^2");
      await page.fill("#one-expression", "1/x");
      await page.click("#one-apply");
      assert.ok(await page.locator("#one-error").isVisible());
      assert.equal((await state()).one.source, "sin(pi*x)+x^2");
      await page.selectOption("#one-function", "wave");
      await page.click("#stage-2");
      for (let i = 0; i < 5; i++) await page.click("#relu-step");
      assert.equal((await state()).one.added, 5);
      assert.ok(await page.evaluate(()=>{const v=[...document.querySelectorAll('#relu-sum-strip strong')].map(e=>Number(e.textContent));return v.length===4&&Math.abs(v[1]+v[2]-v[3])<.0002;}));
      await page.screenshot({
        path: `${out}/ua-refined-stage2-${engine.name()}.png`,
      });
      for (let i = 5; i < 9; i++) await page.click("#relu-step");
      assert.equal((await state()).one.status, "ended");
      assert.ok(
        await page.evaluate(() => {
          const M = UniversalApprox.Model,
            o = UniversalApprox.App.getOneState();
          return (
            Math.abs(M.constructed(o, 0.33, o.added) - M.interpolate(o, 0.33)) <
            1e-9
          );
        }),
      );
      assert.equal(await page.locator('#basis-grid .basis-card').count(),9);
      assert.ok(await page.locator('#relu-unit-formula .katex').count());
      await page.click('#basis-grid button[data-unit="4"]');
      assert.equal(await page.evaluate(()=>UniversalApprox.App.getOneState().selected),4);
      await page.fill('#relu-weight','0');await page.locator('#relu-weight').blur();
      assert.ok(await page.locator('#relu-edit-note').isVisible());
      assert.equal(await page.evaluate(()=>UniversalApprox.App.getOneState().units[4].v),0);
      assert.ok(await page.evaluate(()=>Math.abs(UniversalApprox.Model.constructed(UniversalApprox.App.getOneState(),.8)-UniversalApprox.Model.interpolate(UniversalApprox.App.getOneState(),.8))>.1));
      await page.fill('#relu-knot','0.31');await page.locator('#relu-knot').blur();
      assert.equal(await page.evaluate(()=>UniversalApprox.App.getOneState().units[4].knot),.31);
      await page.fill('#relu-knot','1.1');await page.locator('#relu-knot').blur();
      assert.ok(await page.locator('#relu-edit-error').isVisible());
      assert.equal(await page.evaluate(()=>UniversalApprox.App.getOneState().units[4].knot),.31);
      await page.click('#relu-restart');
      assert.equal((await state()).one.added,0);
      assert.ok((await page.textContent('#relu-edit-note')).includes('0 / 9'));
      await page.click('#relu-restore');
      assert.ok(await page.evaluate(()=>{const o=UniversalApprox.App.getOneState(),M=UniversalApprox.Model;return !o.edited&&Math.abs(M.constructed(o,.8)-M.interpolate(o,.8))<1e-10;}));
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:`${out}/ua-refined-stage2-complete-${engine.name()}.png`});
      await page.locator('#basis-grid').screenshot({path:`${out}/ua-refined-basis-${engine.name()}.png`});
      await page.locator('.selected-section').screenshot({path:`${out}/ua-refined-selected-${engine.name()}.png`});
      await page.click('#panel-2 > .text-details > summary');
      await page.locator('#panel-2 > .text-details').screenshot({path:`${out}/ua-refined-formula-${engine.name()}.png`});
      await page.click('#panel-2 > .text-details > summary');
      await page.click('#relu-restart');
      await page.click('#relu-start');
      await page.click('.knowledge-open');
      assert.equal((await state()).one.status,'paused');
      assert.ok(await page.locator('#knowledge-drawer').isVisible());
      const drawerPaused=(await state()).one.added;
      await page.waitForTimeout(400);
      assert.equal((await state()).one.added,drawerPaused);
      await page.click('#knowledge-tab-1');
      assert.ok(await page.locator('#knowledge-panel-1 .katex').count()>0);
      await page.screenshot({path:`${out}/ua-studio-knowledge-${engine.name()}.png`});
      await page.keyboard.press('Escape');
      assert.ok(await page.locator('.knowledge-open').evaluate(e=>e===document.activeElement));
      await page.click("#relu-restart");
      assert.equal((await state()).one.added, 0);
      await page.click("#relu-start");
      await page.evaluate(() => {
        document.querySelector("#relu-start").click();
        document.querySelector("#stage-3").click();
      });
      const paused = (await state()).one.added;
      await page.waitForTimeout(1400);
      assert.equal((await state()).one.added, paused);
      assert.equal((await state()).ui.stage, 3);
      await page.selectOption("#depth", "3");
      await page.fill("#width", "12");
      await page.locator("#width").blur();
      await page.fill("#sample-count", "100");
      await page.locator("#sample-count").blur();
      assert.equal((await state()).two.config.depth, 3);
      assert.equal(await page.locator("#layer-flow .layer-box").count(), 5);
      await page.click("#step");
      assert.equal((await state()).two.step, 1);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: `${out}/ua-refined-stage3-${engine.name()}.png`,
      });
      await page.click('#freeze-baseline');
      const frozen=await page.evaluate(()=>Array.from(UniversalApprox.App.getBaseline().network.p));
      await page.fill('#width','10');await page.locator('#width').blur();
      assert.ok(await page.locator('#baseline-evidence').isVisible());
      assert.ok((await page.textContent('#baseline-summary')).includes('宽度 12→10'));
      await page.click('#step');
      assert.deepEqual(await page.evaluate(()=>Array.from(UniversalApprox.App.getBaseline().network.p)),frozen);
      await page.selectOption('#prediction-model','baseline');
      assert.ok((await page.textContent('#prediction-title')).includes('冻结基准'));
      await page.locator('#baseline-evidence').screenshot({path:`${out}/ua-refined-baseline-${engine.name()}.png`});
      await page.selectOption('#prediction-model','current');
      await page.click("#start");
      await page.waitForTimeout(180);
      await page.click("#pause");
      const step = (await state()).two.step;
      await page.waitForTimeout(150);
      assert.equal((await state()).two.step, step);
      await page.click("#restart");
      assert.equal((await state()).two.step, 0);
      await page.fill("#sample-count", "24");
      await page.locator("#sample-count").blur();
      assert.ok(await page.locator("#surface-error").isVisible());
      assert.equal((await state()).two.config.sampleCount, 100);
      await page.fill("#sample-count", "900");
      await page.locator("#sample-count").blur();
      assert.equal((await state()).two.config.sampleCount, 900);
      await page.locator(".function-editor > summary").click();
      await page.fill("#surface-expression", "sin(x+y)+0.2*x^2");
      await page.click("#surface-apply");
      assert.equal((await state()).two.config.functionId, "custom");
      assert.equal((await state()).ui.hasBaseline,false);
      assert.ok(await page.locator("#prediction-model").isDisabled());
      await page.fill("#surface-expression", "sqrt(-1)");
      await page.click("#surface-apply");
      assert.ok(await page.locator("#surface-error").isVisible());
      assert.equal((await state()).two.config.source, "sin(x+y)+0.2*x^2");
      await page.selectOption("#display-mode", "heatmap");
      await page.selectOption("#plot-kind", "error");
      assert.ok((await page.textContent("#scale-note")).includes("误差范围"));
      await page.click("#new-data");
      assert.equal((await state()).two.config.dataSeed, 20261010);
      await page.click("#start");
      await page.evaluate(() => {
        document.querySelector("#start").click();
        document.querySelector("#stage-1").click();
      });
      const old = (await state()).two.step;
      await page.waitForTimeout(150);
      assert.equal((await state()).two.step, old);
      await page.click("#stage-3");
      await page.fill("#sample-count", "25");
      await page.locator("#sample-count").blur();
      assert.equal((await state()).two.config.sampleCount, 25);
      await page.fill("#surface-expression", "-0.2-x^2-y^2");
      await page.click("#surface-apply");
      assert.ok(
        await page.evaluate(() =>
          UniversalApprox.App.getState().data.validation.every(
            (p) => p.target < 0,
          ),
        ),
      );
      await page.fill("#surface-expression", "-0.4");
      await page.click("#surface-apply");
      assert.ok(
        await page.evaluate(() => {
          const s = UniversalApprox.App.getState();
          return (
            s.range.every(Number.isFinite) &&
            s.range[0] < s.range[1] &&
            s.data.validation.every((p) => p.target === -0.4)
          );
        }),
      );
      await page.click("#step");
      assert.equal((await state()).two.step, 1);
      await page.click("#reset-global");
      assert.equal((await state()).ui.stage, 1);
      assert.equal((await state()).one.count, 9);
      assert.equal((await state()).two.config.depth, 1);
      assert.equal((await state()).two.config.sampleCount, 225);
      await page.locator("#stage-1").focus();
      await page.keyboard.press("ArrowRight");
      assert.equal((await state()).ui.stage, 2);
      await page.locator("#relu-step").focus();
      await page.keyboard.press("Enter");
      assert.equal((await state()).one.added, 1);
      for (const viewport of [
        { width: 1920, height: 1080 },
        { width: 390, height: 844 },
      ])
        for (const stage of [1, 2, 3]) {
          await page.setViewportSize(viewport);
          await page.click("#stage-" + stage);
          await page.waitForTimeout(100);
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${engine.name()} ${viewport.width} stage ${stage} overflow`,
          );
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({
            path: `${out}/ua-refined-${viewport.width}-stage${stage}-${engine.name()}.png`,
          });
        }
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.evaluate(() => (document.documentElement.style.zoom = "200%"));
      for (const stage of [1, 2, 3]) {
        await page.click("#stage-" + stage);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
      }
      await page.screenshot({
        path: `${out}/ua-refined-zoom-${engine.name()}.png`,
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      assert.deepEqual(remote, []);
      console.log(
        `${engine.name()} ${browser.version()}: moved offline file; stages/constructive equality/manual units/restore/D3/KaTeX/actual sum/knowledge drawer pause and focus/frozen baseline/custom functions/domain errors/sample bounds/deep network/loops/pause/restart/reset/keyboard/1366/1920/390/reduced-motion passed.`,
      );
    } finally {
      await browser.close();
    }
  }
  console.log("Delivery tested:", delivery);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
