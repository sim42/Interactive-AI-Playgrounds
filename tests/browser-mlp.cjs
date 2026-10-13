const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict");
const { chromium, firefox } = require(
  process.env.PLAYWRIGHT_PATH || "playwright",
);
const browserName = process.argv[2] || "chromium",
  out =
    process.env.COURSE_QA_OUTPUT ||
    process.env.MLP_QA_OUT ||
    path.join(os.tmpdir(), "ai-course-qa");
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "MLP 数学离线 "));
  fs.cpSync(
    path.join(
      process.env.COURSE_TOPICS_ROOT || path.resolve(__dirname, "../topics"),
      "mlp-playground",
    ),
    path.join(temp, "独立 课件"),
    { recursive: true },
  );
  const browser = await (browserName === "firefox"
    ? firefox.launch({ headless: true })
    : chromium.launch({
        headless: true,
        executablePath:
          process.env.COURSE_CHROME_PATH ||
          process.env.CHROME_EXECUTABLE ||
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      }));
  const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      offline: true,
    }),
    page = await context.newPage(),
    errors = [],
    network = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  if (browserName !== "firefox") {
    const cd = await context.newCDPSession(page);
    await cd.send("Network.setCacheDisabled", { cacheDisabled: true });
  }
  await page.goto(
    "file://" + encodeURI(path.join(temp, "独立 课件/index.html")),
  );
  async function state() {
    return page.evaluate(() => ({
      sizes: MLPLab.App.getState().net.sizes,
      index: MLPLab.App.getState().trace?.index,
      committed: MLPLab.App.getState().trace?.committed,
      epochs: MLPLab.App.getState().epochs,
      updates: MLPLab.App.getState().updates,
      running: MLPLab.App.getState().running,
      failed: MLPLab.App.getState().failed,
    }));
  }
  async function overflow() {
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "No page-wide horizontal overflow",
    );
  }
  async function shot(name, full = false) {
    await page.screenshot({
      path: path.join(
        out,
        `mlp-upgrade-${name}${browserName === "firefox" ? "-firefox" : ""}.png`,
      ),
      fullPage: full,
    });
  }
  assert.deepEqual((await state()).sizes, [2, 3, 2, 1]);
  await overflow();
  await shot("default");
  assert.equal(await page.locator("#exploreView").isVisible(), true);
  assert.equal(await page.locator(".feature-node").count(), 8);
  assert.equal(await page.locator(".feature-edge").count(), 14);
  assert.equal(await page.locator("#operationFormula .katex").count(), 1);
  const initialImage = await page.locator(".feature-node image").nth(2).getAttribute("href"),
    initialLoss = await page.evaluate(() => MLPLab.App.getState().metrics.train.loss);
  for (let k = 0; k < 40; k++) await page.click("#exploreEpoch");
  assert.notEqual(await page.locator(".feature-node image").nth(2).getAttribute("href"), initialImage, "Feature images reflect trained parameters");
  assert.ok(await page.evaluate(() => MLPLab.App.getState().metrics.train.loss) < initialLoss, "Actual training improves the displayed loss");
  await page.evaluate(() => scrollTo(0,0));
  await shot("training");
  await page.selectOption("#exploreFocus", "w:2:0:1");
  assert.match(await page.locator("#selectedNumbers").textContent(), /本样本贡献/);
  const preserved = await page.evaluate(() => JSON.stringify({net:MLPLab.App.getState().net,history:MLPLab.App.getState().history,phase:MLPLab.App.getState().trace?.index}));
  await page.click("#inspectTab");
  await page.click("#exploreTab");
  assert.equal(await page.evaluate(() => JSON.stringify({net:MLPLab.App.getState().net,history:MLPLab.App.getState().history,phase:MLPLab.App.getState().trace?.index})), preserved, "View switching preserves net, history and trace phase");
  await page.click("#inspectCurrent");
  assert.equal((await state()).epochs, 40);
  assert.equal((await state()).index, 4);
  assert.equal(await page.inputValue("#focusSelect"), "w:2:0:1");
  await page.click("#exploreTab");
  await page.click("#exploreTrain");
  await page.waitForTimeout(180);
  await page.click("#inspectTab");
  const switchedPaused = (await state()).epochs;
  await page.waitForTimeout(180);
  assert.equal((await state()).epochs, switchedPaused, "Switch cancels the old training loop");
  assert.equal((await state()).running, false);
  await page.click("#reset");
  await page.click("#inspectTab");
  await page.locator("#inspectView").scrollIntoViewIfNeeded();
  let before = await page.evaluate(() =>
    JSON.stringify(MLPLab.App.getState().net),
  );
  await page.click("#focusLoss");
  assert.match(await page.locator("#operation").textContent(), /系数为 0/);
  assert.match(await page.locator("#operation").textContent(), /ln/);
  await page.evaluate(() => document.getElementById("inspectView").scrollIntoView({block:"start"}));
  await shot("loss");
  await page.click("#next");
  await page.click("#next");
  assert.match(await page.locator("#operation").textContent(), /下游.*支路/);
  assert.match(await page.locator("#operation").textContent(), /局部导数/);
  assert.equal(
    await page.evaluate(() => JSON.stringify(MLPLab.App.getState().net)),
    before,
    "Preview must preserve all parameters",
  );
  await shot("backward");
  await page.selectOption("#focusSelect", "w:2:0:1");
  assert.match(await page.locator("#operation").textContent(), /dL\/dw/);
  await shot("edge-gradient");
  await page.evaluate(() => MLPLab.App.setPhase(15));
  assert.match(
    await page.locator("#operation").textContent(),
    /预计，尚未提交/,
  );
  assert.match(await page.locator("#operation").textContent(), /旧值.*新值/);
  await shot("update");
  while (!(await page.locator("#next").isDisabled())) await page.click("#next");
  const committed = await state();
  assert.equal(committed.committed, true);
  assert.equal(committed.updates, 1);
  assert.notEqual(
    await page.evaluate(() => JSON.stringify(MLPLab.App.getState().net)),
    before,
  );
  await page.click("#previous");
  await page.click("#next");
  assert.equal(
    (await state()).updates,
    1,
    "Revisiting commit must not update again",
  );
  await page.selectOption("#mode", "inference");
  before = await page.evaluate(() => JSON.stringify(MLPLab.App.getState().net));
  while (!(await page.locator("#next").isDisabled())) await page.click("#next");
  assert.equal(
    await page.evaluate(() => JSON.stringify(MLPLab.App.getState().net)),
    before,
    "Inference must never change any parameter",
  );
  await page.click("#reset");
  await page.click("#trainToggle");
  await page.waitForTimeout(280);
  await page.click("#trainToggle");
  const paused = (await state()).epochs;
  await page.waitForTimeout(160);
  assert.equal((await state()).epochs, paused);
  await page.click("#trainToggle");
  await page.click("#reset");
  await page.waitForTimeout(180);
  assert.equal((await state()).epochs, 0);
  assert.equal((await state()).running, false);
  await page.click("#inspectTab");
  await page.selectOption("#mode", "learning");
  await page.selectOption("#structure", "");
  await page.click("#inspectTab");
  const label0 = await page.evaluate(() =>
    MLPLab.App.getState().data.train.findIndex((s) => s.y === 0),
  );
  await page.selectOption("#sample", String(label0));
  await page.evaluate(() => {
    const s = MLPLab.App.getState(),
      M = MLPLab.Model;
    s.net.weights[0][0].fill(0);
    s.net.biases[0][0] = 1000;
    s.metrics = {
      train: M.metrics(s.net, s.data.train),
      validation: M.metrics(s.net, s.data.validation),
    };
    s.history = [
      {
        epoch: 0,
        train: s.metrics.train.loss,
        validation: s.metrics.validation.loss,
      },
    ];
    s.revision++;
  });
  await page.click("#newRound");
  await page.click("#focusLoss");
  assert.match(await page.locator("#operation").textContent(), /稳定求值/);
  assert.match(await page.locator("#operation").textContent(), /浮点概率舍入/);
  assert.doesNotMatch(
    await page.locator("#operation").textContent(),
    /ln\(0\.000\).*1000/,
  );
  await shot("saturated-loss");
  await page.click("#next");
  assert.match(await page.locator("#operation").textContent(), /稳定 δ=p−y/);
  assert.match(await page.locator("#operation").textContent(), /不画/);
  await shot("saturated-backward");
  await page.click("#reset");
  await page.selectOption("#structure", "6,4,3");
  assert.equal(await page.locator(".feature-node").count(), 16);
  await overflow();
  await page.evaluate(() => scrollTo(0,0));
  await shot("wide-network", true);
  await page.click("#inspectTab");
  assert.ok(await page.locator(".network-wrap").evaluate(e => e.scrollWidth > e.clientWidth), "Wide numerical network remains locally scrollable");
  await shot("wide-inspection", true);
  await page.click("#exploreTab");
  await page.selectOption("#activation", "relu");
  await page.fill("#learningRate", "5");
  await page.locator("#dataset").focus();
  await page.fill("#seed", "107");
  await page.locator("#dataset").focus();
  for (
    let e = 0;
    e < 3 && !(await page.locator("#epochStep").isDisabled());
    e++
  )
    await page.click("#exploreEpoch");
  assert.equal((await state()).failed, true);
  assert.match(await page.locator("#message").textContent(), /未提交/);
  await page.evaluate(() => scrollTo(0,0));
  await shot("failure");
  await page.click("#reset");
  assert.equal((await state()).failed, false);
  await page.fill("#learningRate", "");
  await page.locator("#dataset").focus();
  assert.equal(await page.inputValue("#learningRate"), "0.08");
  assert.match(await page.locator("#message").textContent(), /输入未生效/);
  for (const dataset of ["linear", "ring", "moons", "xor"]) {
    await page.click('#datasetPreviews [data-dataset="'+dataset+'"]');
    assert.equal(await page.inputValue("#dataset"), dataset);
    assert.equal((await state()).updates, 0);
  }
  await page.selectOption("#exploreSample", "1");
  assert.equal(await page.inputValue("#sample"), "1");
  assert.match(await page.locator("#selectedNumbers").textContent(), /样本 #2/);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.click("#reset");
  await overflow();
  await shot("1920");
  await page.setViewportSize({ width: 400, height: 800 });
  await overflow();
  await page.waitForTimeout(80);
  await shot("narrow-start");
  await page.evaluate(() => document.getElementById("exploreView").scrollIntoView({block:"start"}));
  await shot("narrow");
  await page.setViewportSize({ width: 683, height: 384 });
  await overflow();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.click("#inspectTab");
  await page.selectOption("#mode", "learning");
  await page.locator("#next").focus();
  await page.keyboard.press("Enter");
  assert.equal((await state()).index, 2);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => (document.documentElement.style.zoom = "200%"));
  await overflow();
  await page.locator("#next").focus();
  await page.keyboard.press("Enter");
  assert.equal((await state()).index, 3);
  await shot("zoom");
  assert.equal(
    network.length,
    0,
    "Standalone file must send no network requests",
  );
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      browser: browserName,
      version: browser.version(),
      offlineMovedPath: path.join(temp, "独立 课件/index.html"),
      checks:
        "integrated live feature maps, true training improvement, view preservation, old loop cancellation, current-parameter inspection, default layout, loss, forward/backward, edge focus, previews, one commit, inference invariant, pause/reset, saturation, wide network local scroll, failure/recovery, invalid input, 1920/narrow/683/200% layout, keyboard, reduced motion",
      errors,
      network,
      screenshots: out,
    }),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
