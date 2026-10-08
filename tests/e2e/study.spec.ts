import { test, expect } from "@playwright/test";
test("study, complete, bookmark, take notes and resume after refresh", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little further, every day." }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${test.info().project.name}-dashboard.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Explore course" }).click();
  await expect(
    page.getByRole("heading", { name: "Your course map" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${test.info().project.name}-course.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Start course", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome & syllabus" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Complete & continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Introduction", exact: true }),
  ).toBeVisible();
  if (await page.getByRole("button", { name: /Read Chapter 1 / }).count())
    await expect(page.locator(".pdf-viewer canvas")).toHaveAttribute(
      "data-rendered-page",
      "43",
      { timeout: 15000 },
    );
  await page
    .getByRole("button", { name: "Bookmark item", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Item note", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Note text" })
    .fill("My **neuroscience** study note.");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("ocw-study-v1") || "{}").notes?.[0]
            ?.text,
      ),
    )
    .toBe("My **neuroscience** study note.");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Introduction", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Note text" })).toHaveValue(
    "My **neuroscience** study note.",
  );
  await page.screenshot({
    path: `test-results/${test.info().project.name}-player.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Introduction Introduction to Neuroscience",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", { name: "Resume course", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Introduction", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("PDF is served safely with byte ranges and topic search works", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore course" }).click();
  await page
    .getByRole("textbox", { name: "Search course", exact: true })
    .fill("Vision 1");
  await page
    .getByRole("button", {
      name: "Vision 1: the eye lecture · Week 6 · Chapter 9",
    })
    .click();
  await expect(page.locator(".pdf-viewer canvas")).toHaveAttribute(
    "data-rendered-page",
    "1",
  );
  const src = await page.locator(".tabs .external").getAttribute("href");
  const result = await request.get(src!.split("#")[0], {
    headers: { range: "bytes=0-99" },
  });
  expect(result.status()).toBe(206);
  expect(result.headers()["content-type"]).toBe("application/pdf");
  expect((await result.body()).length).toBe(100);
  expect((await result.body()).toString().startsWith("%PDF")).toBeTruthy();
  expect((await request.get("/api/resources/invalid/invalid")).status()).toBe(
    404,
  );
  await page.screenshot({
    path: `test-results/${test.info().project.name}-pdf.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Next PDF page", exact: true })
    .click();
  await expect(page.locator(".pdf-viewer canvas")).toHaveAttribute(
    "data-rendered-page",
    "2",
  );
  await page.getByRole("combobox", { name: "PDF zoom" }).selectOption("1.25");
  await expect(page.locator(".pdf-viewer canvas")).toHaveAttribute(
    "data-rendered-page",
    "2",
  );
  await page.screenshot({
    path: `test-results/${test.info().project.name}-pdf-page2.png`,
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("assigned textbook chapters open at verified pages and survive refresh", async ({
  page,
  request,
}) => {
  const response = await request.get(
    "/api/resources/9.01-fall-2007/neuroscience-bear-3e",
    { headers: { range: "bytes=0-9" } },
  );
  test.skip(
    response.status() === 404,
    "User-supplied textbook is not present on this machine.",
  );
  expect(response.status()).toBe(206);
  await page.goto("/#study/9.01-fall-2007/vision-1-the-eye");
  await expect(
    page.getByRole("button", { name: /Read Chapter 9/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Read Chapter 9/ }).click();
  await expect(page.locator(".pdf-viewer canvas")).toHaveAttribute(
    "data-rendered-page",
    "317",
    { timeout: 15000 },
  );
  await expect(page.getByRole("spinbutton", { name: "PDF page" })).toHaveValue(
    "317",
  );
  await expect(page.locator(".tabs .external")).toHaveAttribute(
    "href",
    /bear-3e#page=317$/,
  );
  await page.reload();
  await expect(page.locator(".pdf-viewer canvas")).toHaveAttribute(
    "data-rendered-page",
    "317",
    { timeout: 15000 },
  );
  await page.goto(
    "/#study/9.01-fall-2007/chemical-control-of-brain-2-motivation",
  );
  await page.getByRole("button", { name: /Read Chapter 15/ }).click();
  await expect(page.locator(".pdf-viewer canvas")).toHaveAttribute(
    "data-rendered-page",
    "521",
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: /Read Chapter 16/ }).click();
  await expect(page.locator(".pdf-viewer canvas")).toHaveAttribute(
    "data-rendered-page",
    "549",
    { timeout: 15000 },
  );
  await page
    .getByRole("button", { name: "Next PDF page", exact: true })
    .click();
  await expect(page.locator(".pdf-viewer canvas")).toHaveAttribute(
    "data-rendered-page",
    "550",
  );
  await page.getByRole("button", { name: /Read Chapter 16/ }).click();
  await expect(page.locator(".pdf-viewer canvas")).toHaveAttribute(
    "data-rendered-page",
    "549",
  );
  await page.screenshot({
    path: `test-results/${test.info().project.name}-textbook.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("textbook text can be selected, copied and pasted into a study note", async ({
  page,
  context,
  request,
}) => {
  const response = await request.get(
    "/api/resources/9.01-fall-2007/neuroscience-bear-3e",
    { headers: { range: "bytes=0-9" } },
  );
  test.skip(response.status() === 404, "Private textbook is not installed.");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(
    "/#study/9.01-fall-2007/chemical-control-of-brain-2-motivation",
  );
  await page.getByRole("button", { name: /Read Chapter 16/ }).click();
  await expect(page.locator(".pdf-viewer canvas")).toHaveAttribute(
    "data-rendered-page",
    "549",
    { timeout: 15000 },
  );
  const heading = page
    .locator(".pdf-text-layer span")
    .filter({ hasText: /^Motivation$/ })
    .first();
  await expect(heading).toBeVisible();
  const selectHeading = async () => {
    await heading.scrollIntoViewIfNeeded();
    const box = (await heading.boundingBox())!;
    await page.mouse.move(box.x + 1, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, {
      steps: 12,
    });
    await page.mouse.up();
    await expect
      .poll(() => page.evaluate(() => window.getSelection()?.toString()))
      .toMatch(/otivatio/);
  };
  await selectHeading();
  const selected = await page.evaluate(() => window.getSelection()!.toString());
  await page.screenshot({
    path: `test-results/${test.info().project.name}-text-selection.png`,
    fullPage: true,
  });
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+c" : "Control+c",
  );
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(selected);
  await page.getByRole("button", { name: "+ Item note", exact: true }).click();
  const note = page.getByRole("textbox", { name: "Note text" });
  await note.focus();
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+v" : "Control+v",
  );
  await expect(note).toHaveValue(selected);
  await page.getByRole("combobox", { name: "PDF zoom" }).selectOption("1.25");
  await expect(page.locator(".pdf-viewer canvas")).toHaveAttribute(
    "data-rendered-page",
    "549",
  );
  await expect(heading).toBeVisible();
  await selectHeading();
  await page
    .getByRole("button", { name: "Next PDF page", exact: true })
    .click();
  await expect(page.locator(".pdf-viewer canvas")).toHaveAttribute(
    "data-rendered-page",
    "550",
  );
  await expect(heading).toHaveCount(0);
  expect(await page.locator(".pdf-text-layer").innerText()).toContain(
    "INTRODUCTION",
  );
});
