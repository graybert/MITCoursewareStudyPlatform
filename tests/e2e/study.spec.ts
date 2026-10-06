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
  await expect(page.locator("iframe.pdf-viewer")).toBeVisible();
  const src = await page.locator("iframe.pdf-viewer").getAttribute("src");
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
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
