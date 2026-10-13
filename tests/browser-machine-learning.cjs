require("node:fs").mkdirSync(
  process.env.COURSE_QA_OUTPUT ||
    require("node:path").join(require("node:os").tmpdir(), "ai-course-qa"),
  { recursive: true },
);
const { chromium, firefox } = require("playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  { pathToFileURL } = require("node:url"),
  assert = require("node:assert/strict");
(async () => {
  for (const [name, type, opts] of [
    [
      "Chrome",
      chromium,
      {
        ...(process.env.COURSE_CHROME_PATH
          ? { executablePath: process.env.COURSE_CHROME_PATH }
          : process.platform === "darwin"
            ? {
                executablePath:
                  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              }
            : {}),
        args: ["--disable-gpu"],
      },
    ],
    ["Firefox", firefox, {}],
  ]) {
    const browser = await type.launch({ headless: true, ...opts });
    console.log(name, browser.version());
    const dst = require("node:path").join(
      require("node:os").tmpdir(),
      "课件 独立离线验收",
      "machine-learning-algorithms",
    );
    fs.rmSync(dst, { recursive: true, force: true });
    fs.cpSync(
      require("node:path").join(
        process.env.COURSE_TOPICS_ROOT ||
          require("node:path").resolve(__dirname, "../topics"),
        "machine-learning-algorithms",
      ),
      dst,
      { recursive: true },
    );
    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        offline: true,
        reducedMotion: "reduce",
      }),
      page = await context.newPage();
    const errors = [],
      net = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) net.push(r.url());
    });
    if (name === "Chrome") {
      const c = await context.newCDPSession(page);
      await c.send("Network.setCacheDisabled", { cacheDisabled: true });
    }
    const started = performance.now();
    await page.goto(pathToFileURL(dst + "/index.html").href);
    await page.waitForSelector("#plot");
    console.log("load", Math.round(performance.now() - started), "ms");
    await page.screenshot({
      path:
        (process.env.COURSE_QA_OUTPUT ||
          require("node:path").join(
            require("node:os").tmpdir(),
            "ai-course-qa",
          )) +
        "/ml-" +
        name +
        "-1366.png",
    });
    const shot = (label) =>
      page.screenshot({
        path: path.join(
          process.env.COURSE_QA_OUTPUT ||
            path.join(require("node:os").tmpdir(), "ai-course-qa"),
          "ml-" + name + "-revision-" + label + ".png",
        ),
        fullPage: true,
      });
    assert.equal(await page.locator("#projection").count(), 0);
    assert.equal(await page.locator(".math-box").count(), 4);
    const get = () =>
      page.evaluate(() => {
        const s = MachineLearningLab.getState();
        return {
          stage: s.stage,
          steps: s.steps,
          updates: s.updates,
          w: s.w,
          done: s.done,
          status: s.status,
          iteration: s.iteration,
        };
      });
    // Real pointer and form edits must be reproducible, isolated, and cancel stale loops.
    const initialData=await page.evaluate(()=>JSON.parse(JSON.stringify(MachineLearningLab.getState().data)));
    await page.locator('.training-point[data-id="1"]').click();
    assert.equal(await page.locator('#sample-editor').getAttribute('open'),'');
    assert.equal((await page.evaluate(()=>MachineLearningLab.getConfig())).edits?.length||0,0,'a click selects without rounding/editing data');
    await page.fill('#sample-x','0.75');
    await page.fill('#sample-y','-1.2');
    assert.equal(await page.locator('#step').isDisabled(),true);
    await page.click('#apply-sample');
    assert.equal((await get()).steps,0);
    const edited=await page.evaluate(()=>MachineLearningLab.getState());
    assert.equal(edited.data.train[0].x,.75);assert.equal(edited.data.train[0].y,-1.2);
    assert.deepEqual(edited.data.validation,initialData.validation);
    await page.fill('#sample-x','');await page.click('#apply-sample');
    assert.ok((await page.locator('#control-feedback').textContent()).includes('不能为空'));
    await page.click('#discard-draft');assert.equal(await page.locator('#step').isDisabled(),false);
    await page.click('#play');await page.waitForTimeout(100);
    await page.fill('#sample-x','0.2');const stopped=await get();await page.waitForTimeout(750);assert.deepEqual(await get(),stopped);
    await page.click('#discard-draft');await page.click('#restore-data');
    assert.deepEqual(await page.evaluate(()=>MachineLearningLab.getState().data),initialData);
    const mark=page.locator('.training-point[data-id="1"]');await mark.scrollIntoViewIfNeeded();const box=await mark.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+50,box.y+box.height/2-20,{steps:6});await page.mouse.up();
    assert.equal((await page.evaluate(()=>MachineLearningLab.getConfig())).edits.length,1);
    const dragged=await page.evaluate(()=>MachineLearningLab.getState().data.train[0]);
    assert.ok(dragged.x>initialData.train[0].x+.1);assert.ok(dragged.y>initialData.train[0].y+.1);
    await shot('edited-data');await page.click('#reset');
    await page.click('#math-expand');assert.equal(await page.locator('.workspace.math-expanded').count(),1);await page.click('#math-expand');
    await page.click("#step");
    assert.equal((await get()).stage, "sample");
    await page.click("#step");
    assert.equal((await get()).stage, "margin");
    assert.equal(await page.locator("#math-diagram svg").count(), 1);
    assert.ok(
      (await page.locator("#math-summary").textContent()).includes("缺口"),
    );
    await shot("svm-margin");
    await page.click("#step");
    assert.equal((await get()).stage, "gradient");
    assert.equal((await get()).updates, 0);
    assert.equal(await page.locator(".signed-row").count(), 3);
    await shot("svm-gradient");
    await page.click("#step");
    assert.equal((await get()).updates, 1);
    assert.equal(await page.locator(".signed-bar.second").count(), 3);
    assert.ok(
      (await page.locator("#math-diagram").textContent()).includes("Δ = −η"),
    );
    await shot("svm-update");
    await page.click("#restart");
    assert.equal((await get()).updates, 0);
    await page.click("#play");
    await page.waitForTimeout(150);
    await page.click("#play");
    const paused = await get();
    await page.waitForTimeout(750);
    assert.deepEqual(await get(), paused);
    await page.click("#reset");
    await page.selectOption("#dataset", "xor");
    for (let i = 0; i < 12; i++) await page.click("#round");
    assert.equal((await get()).done, true);
    assert.ok(
      (await page.locator("#secondary-value").textContent()).includes("50%"),
    );
    await page.screenshot({
      path:
        (process.env.COURSE_QA_OUTPUT ||
          require("node:path").join(
            require("node:os").tmpdir(),
            "ai-course-qa",
          )) +
        "/ml-" +
        name +
        "-xor.png",
    });
    await page.selectOption("#algorithm", "knn");
    await page.click("#step");
    assert.equal((await get()).stage, "distance");
    assert.ok(
      (await page.locator("#math-diagram").textContent()).includes(
        "平方后相加",
      ),
    );
    await shot("knn-distance");
    await page.click("#round");
    assert.equal((await get()).stage, "result");
    assert.equal(await page.locator(".vote-counter").count(), 2);
    await shot("knn-votes");
    const beforeQuery=await page.evaluate(()=>({query:MachineLearningLab.getState().query,data:MachineLearningLab.getState().data}));
    const query=page.locator('.query-point');await query.scrollIntoViewIfNeeded();const qb=await query.boundingBox();
    await page.mouse.move(qb.x+qb.width/2,qb.y+qb.height/2);await page.mouse.down();await page.mouse.move(qb.x+qb.width/2-60,qb.y+qb.height/2+35,{steps:6});await page.mouse.up();
    const afterQuery=await page.evaluate(()=>({query:MachineLearningLab.getState().query,data:MachineLearningLab.getState().data,steps:MachineLearningLab.getState().steps}));
    assert.ok(afterQuery.query.x<beforeQuery.query.x-.1);assert.ok(afterQuery.query.y<beforeQuery.query.y-.1);
    assert.deepEqual(afterQuery.data,beforeQuery.data);assert.equal(afterQuery.steps,0);
    await page.click('#round');assert.equal((await get()).done,true);

    await page.fill("#k", "2");
    await page.locator("#k").blur();
    assert.equal(await page.locator("#k").getAttribute("aria-invalid"), "true");
    await page.click("#reset");
    assert.equal(await page.locator("#k").getAttribute("aria-invalid"), null);
    await page.selectOption("#algorithm", "kmeans");
    await page.click("#step");
    assert.equal((await get()).stage, "assign");
    assert.equal(await page.locator(".distance-row").count(), 2);
    for (let i = 0; i < 37; i++) await page.click("#step");
    assert.equal((await get()).stage, "centers");
    assert.equal(await page.locator(".signed-bar.second").count(), 2);
    await shot("kmeans-mean");
    await page.click("#round");
    assert.equal((await get()).iteration, 1);
    await page.screenshot({
      path:
        (process.env.COURSE_QA_OUTPUT ||
          require("node:path").join(
            require("node:os").tmpdir(),
            "ai-course-qa",
          )) +
        "/ml-" +
        name +
        "-kmeans.png",
    });
    await page.click("#new-data");
    assert.equal(await page.locator("#seed-label").textContent(), "43");
    await page.click("#reset");
    await page.locator("#step").focus();
    await page.keyboard.press("Enter");
    assert.equal((await get()).stage, "sample");
    for (const vp of [
      { width: 1920, height: 1080 },
      { width: 390, height: 844 },
      { width: 683, height: 384 },
    ]) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(80);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.screenshot({
        path:
          (process.env.COURSE_QA_OUTPUT ||
            require("node:path").join(
              require("node:os").tmpdir(),
              "ai-course-qa",
            )) +
          "/ml-" +
          name +
          "-" +
          vp.width +
          ".png",
      });
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.evaluate(() => (document.documentElement.style.zoom = "200%"));
    await page.waitForTimeout(100);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path:
        (process.env.COURSE_QA_OUTPUT ||
          require("node:path").join(
            require("node:os").tmpdir(),
            "ai-course-qa",
          )) +
        "/ml-" +
        name +
        "-zoom.png",
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(net, []);
    console.log(
      "PASS",
      name,
      "copied offline file, all algorithms/stages, pause, XOR, invalid/reset, seed, keyboard, responsive and 200% CSS zoom",
    );
    await context.close();
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
