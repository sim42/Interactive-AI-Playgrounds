const { chromium, firefox } = require("playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict"),
  { pathToFileURL } = require("node:url");
const out =
  process.env.COURSE_QA_OUTPUT || path.join(os.tmpdir(), "ai-course-qa");
fs.mkdirSync(out, { recursive: true });
(async () => {
  for (const [name, type, options] of [
    [
      "Chrome",
      chromium,
      {
        executablePath:
          process.env.COURSE_CHROME_PATH ||
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
    ],
    ["Firefox", firefox, {}],
  ]) {
    const browser = await type.launch({ headless: true, ...options });
    console.log(name, browser.version());
    for (const topic of ["gradient-descent", "monte-carlo-optimization"]) {
      const mc = topic.startsWith("monte"),
        dst = path.join(os.tmpdir(), "课件 重做 独立离线验收", topic);
      fs.rmSync(dst, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.cpSync(
        path.join(
          process.env.COURSE_TOPICS_ROOT ||
            path.resolve(__dirname, "../topics"),
          topic,
        ),
        dst,
        { recursive: true },
      );
      const context = await browser.newContext({
          viewport: { width: 1366, height: 768 },
          offline: true,
          reducedMotion: "reduce",
        }),
        page = await context.newPage(),
        errors = [],
        network = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("request", (r) => {
        if (/^https?:/.test(r.url())) network.push(r.url());
      });
      if (name === "Chrome") {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      }
      const failed = [];
      page.on("requestfailed", (r) => failed.push(r.url()));
      const start = performance.now();
      await page.goto(pathToFileURL(dst + "/index.html").href);
      await page.waitForSelector("#metric-0");
      console.log(topic, "load", Math.round(performance.now() - start), "ms");
      assert.notEqual(await page.locator("#metric-0").textContent(), "—");
      assert.equal(await page.getByText("投影").count(), 0);
      const read = () =>
        page.evaluate(() => ({
          step: OptimizationApp.getState().step,
          phase: OptimizationApp.getState().phase,
          p: OptimizationApp.getState().p.slice(),
          status: OptimizationApp.getState().status,
        }));
      const shot = async (label) =>
        page.screenshot({
          path: path.join(
            out,
            topic + "-" + name + "-d3-upgrade-" + label + ".png",
          ),
          fullPage: label === "math-full",
        });
      await shot("1366-initial");
      if (!mc) {
        await page.click("#gradient-field");
        assert.equal(await page.locator("#gradient-field").isChecked(), true);
        await page.click("#gradient-field");
      }
      assert.equal(
        await page.evaluate(
          () =>
            typeof d3.contours === "function" &&
            typeof d3.geoPath === "function" &&
            typeof katex.render === "function",
        ),
        true,
      );
      await page.click("#batch");
      await page.waitForFunction(() => OptimizationApp.getState().step === 20);
      await page.waitForTimeout(40);
      const baselineHistory = await page.evaluate(
        () => OptimizationApp.getState().history,
      );
      const baselineFinal = await page.evaluate(
        () => OptimizationApp.getState().value,
      );
      await page.click("#freeze");
      assert.equal((await read()).step, 0);
      assert.equal(
        await page.evaluate(() => OptimizationApp.getReference().step),
        20,
      );
      await page.fill(mc ? "#temp" : "#rate", mc ? "0" : "0.015");
      await page.locator(mc ? "#temp" : "#rate").blur();
      assert.equal(
        await page.evaluate(() => OptimizationApp.getReference().value),
        baselineFinal,
      );
      await page.click("#batch");
      await page.waitForFunction(() => OptimizationApp.getState().step === 20);
      await page.waitForTimeout(40);
      assert.ok(
        (await page.locator("#comparison-summary").textContent()).includes(
          "其余条件保持一致",
        ),
      );
      assert.ok(
        (await page.locator("#comparison-summary").textContent()).includes(
          "同为 20 次",
        ),
      );
      await page.evaluate(() => scrollTo(0, 0));
      await shot("comparison");
      await page.click("#restore-reference");
      assert.equal((await read()).step, 0);
      await page.click("#batch");
      await page.waitForFunction(() => OptimizationApp.getState().step === 20);
      await page.waitForTimeout(40);
      assert.equal(
        await page.evaluate(() => OptimizationApp.getState().value),
        baselineFinal,
        "restoring reference configuration reproduces trajectory",
      );
      assert.deepEqual(
        await page.evaluate(() => OptimizationApp.getState().history),
        baselineHistory,
        "restored complete trajectory",
      );
      await page.click("#function-options > summary");
      await page.fill("#x", "1");
      await page.locator("#x").blur();
      assert.equal(
        await page.evaluate(() => OptimizationApp.getReference()),
        null,
        "starting condition invalidates reference",
      );
      await page.click("#function-options > summary");
      await page.click("#reset");
      await page.evaluate(() => scrollTo(0, 0));
      await page.click("#step");
      assert.equal((await read()).phase, 1);
      assert.equal((await read()).step, 0);
      assert.equal(await page.locator(".math-row").count(), 2);
      await shot(mc ? "random-proposal" : "slopes");
      await page.click("#step");
      assert.equal((await read()).phase, 2);
      assert.equal((await read()).step, 0);
      assert.equal(await page.locator("#decision").isVisible(), true);
      if (mc) {
        assert.equal(await page.locator(".prob-track").count(), 1);
        assert.ok(
          (await page.locator(".prob-rule").textContent()).includes("u < p"),
        );
      } else
        assert.ok(
          (await page.locator("#math").textContent()).includes("− 0.15 × 1.15"),
        );
      await page.locator("#calculation-panel").scrollIntoViewIfNeeded();
      await shot("candidate");
      assert.equal(await page.locator(".katex-error").count(), 0);
      await shot("math-full");
      await page.click("#step");
      assert.equal((await read()).step, 1);
      await page.click("#restart");
      assert.equal((await read()).step, 0);
      await page.click("#start");
      await page.evaluate(() => {
        document.getElementById("start").click();
        document.getElementById("start").click();
      });
      await page.waitForTimeout(850);
      await page.click("#pause");
      const paused = await read();
      await page.waitForTimeout(750);
      assert.deepEqual(await read(), paused);
      await page.click("#start");
      await page.fill("#expression", "(x-1)^2+(y+1)^2-10");
      assert.equal(await page.locator("#start").isDisabled(), true);
      const edited = await read();
      await page.waitForTimeout(800);
      assert.deepEqual(
        await read(),
        edited,
        "draft immediately pauses old loop",
      );
      await page.click("#apply-function");
      assert.equal((await read()).step, 0);
      assert.ok(Number(await page.locator("#metric-0").textContent()) < 0);
      assert.ok(
        (await page.locator("#surface-note").textContent()).includes(
          "(x-1)^2+(y+1)^2-10",
        ),
      );
      for (let i = 0; i < 3; i++) await page.click("#step");
      await shot("negative-function");
      await page.fill("#expression", "window.alert(1)");
      await page.click("#apply-function");
      assert.equal(await page.locator("#start").isDisabled(), true);
      assert.ok((await page.locator("#input-error").textContent()).length > 0);
      await page.fill("#expression", "log(x)");
      await page.click("#apply-function");
      assert.ok(
        (await page.locator("#input-error").textContent()).includes(
          "没有有限值",
        ),
      );
      await page.click("#function-options > summary");
      await page.fill("#min", "0.1");
      await page.locator("#min").blur();
      await page.fill("#x", "2");
      await page.locator("#x").blur();
      await page.fill("#y", "1");
      await page.locator("#y").blur();
      await page.click("#apply-function");
      assert.equal(await page.locator("#start").isDisabled(), false);
      await page.fill("#max", "0");
      await page.locator("#max").blur();
      assert.equal(await page.locator("#start").isDisabled(), true);
      await page.click("#reset");
      assert.equal((await read()).step, 0);
      assert.equal(await page.locator("#start").isDisabled(), false);
      const extra = page
        .locator("summary")
        .filter({ hasText: "更多参数与演示速度" });
      await extra.click();
      await page.fill("#limit", "1");
      await page.locator("#limit").blur();
      for (let i = 0; i < 3; i++) await page.click("#step");
      assert.equal((await read()).step, 1);
      assert.equal(await page.locator("#start").isDisabled(), true);
      await page.click("#reset");
      if (!mc) {
        await page.fill("#rate", "10");
        await page.locator("#rate").blur();
        for (let i = 0; i < 3; i++) await page.click("#step");
        assert.equal((await read()).status, "域外停止");
        assert.equal((await read()).step, 0);
        assert.equal(await page.locator("#start").isDisabled(), true);
        assert.ok(
          (await page.locator("#failure-note").textContent()).includes(
            "减小学习率",
          ),
        );
        await page.locator("#function-options > summary").click();
        await page.evaluate(() => scrollTo(0, 0));
        await shot("failure");
        await page.click("#reset");
        if (!(await page.locator("#function-options").evaluate((e) => e.open)))
          await page.locator("#function-options > summary").click();
        await page.fill("#expression", "1e-100*tanh(1e308*x)+y^2");
        for (const [id, value] of [
          ["min", "-0.1"],
          ["max", "0.1"],
          ["x", "0"],
          ["y", "0"],
        ]) {
          await page.fill("#" + id, value);
          await page.locator("#" + id).blur();
        }
        await page.selectOption("#algorithm", "rmsprop");
        await page.click("#apply-function");
        assert.equal(await page.locator("#start").isDisabled(), false);
        for (let i = 0; i < 3; i++) await page.click("#step");
        assert.equal((await read()).status, "无法计算");
        assert.equal((await read()).step, 0);
        assert.ok((await page.locator("#math").textContent()).includes("溢出"));
        assert.ok(
          await page.evaluate(() =>
            OptimizationApp.getState().v.every(Number.isFinite),
          ),
        );
        await shot("memory-overflow");
        await page.click("#reset");
      }
      for (const algorithm of mc
        ? ["uniform", "greedy", "anneal"]
        : ["gd", "momentum", "rmsprop", "adam"]) {
        await page.selectOption("#algorithm", algorithm);
        assert.ok(
          (
            (await page.locator("#algorithm-copy").textContent()) +
            (await page.locator("#algorithm-help").textContent())
          ).length > 40,
        );
        for (let i = 0; i < 2; i++) await page.click("#step");
        await shot(algorithm);
        await page.click("#restart");
      }
      await page.click("#reset");
      await page.locator("#step").focus();
      await page.keyboard.press("Enter");
      assert.equal((await read()).phase, 1);
      await page.click("#reset");
      await page.locator("summary").filter({ hasText: "一因素对照" }).click();
      const before = await page.evaluate(() => OptimizationApp.getConfig());
      await page.locator('[data-preset="1"]').click();
      const after = await page.evaluate(() => OptimizationApp.getConfig());
      assert.equal(before.expression, after.expression);
      assert.equal(before.x, after.x);
      if (mc) assert.equal(before.seed, after.seed);
      await page.click("#reset");
      for (const vp of [
        { width: 1920, height: 1080 },
        { width: 1024, height: 768 },
        { width: 390, height: 844 },
        { width: 683, height: 384 },
      ]) {
        await page.setViewportSize(vp);
        await page.waitForTimeout(100);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "no horizontal overflow " + vp.width,
        );
        await shot(String(vp.width));
      }
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.evaluate(() => (document.documentElement.style.zoom = "200%"));
      await page.waitForTimeout(100);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "200% CSS zoom no overflow",
      );
      await shot("zoom");
      assert.deepEqual(errors, []);
      assert.deepEqual(failed, []);
      assert.deepEqual(network, []);
      await context.close();
      console.log(
        "PASS",
        name,
        topic,
        "copied offline file, custom/negative expressions, invalid safety syntax/domain, pause while editing, sequential math graph, all optimizers, limit/domain failures, keyboard, viewports and 200% CSS zoom",
      );
    }
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
