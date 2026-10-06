import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applyOverride, importCourse, tableRows } from "../lib/importer";
import { resolveResource } from "../lib/resolver";
import { emptyState, percentage, progressKey, resumeItem } from "../lib/study";
import { Course } from "../lib/schema";
const root = path.resolve("9.01-fall-2007");
const fixture = () =>
  ({
    id: "test",
    title: "Test",
    number: "1",
    description: "",
    instructors: [],
    department: "",
    source: "",
    license: "",
    root: "courses/test",
    metadata: {},
    resources: [
      {
        id: "pdf",
        title: "Notes",
        type: "lecture-notes",
        mime: "application/pdf",
        description: "",
        path: "notes.pdf",
      },
    ],
    items: [
      {
        id: "a",
        title: "First",
        type: "lecture",
        section: "Course",
        resources: ["pdf"],
      },
      {
        id: "b",
        title: "Second",
        type: "lecture",
        section: "Course",
        resources: [],
      },
      {
        id: "c",
        title: "Third",
        type: "exam",
        section: "Course",
        resources: [],
      },
    ],
  }) as Course;
test("rowspan expansion retains week and assignment due cells", () => {
  const rows = tableRows(
    '<table><tr><td rowspan="2">3</td><td>A</td><td rowspan="2">Due</td></tr><tr><td>B</td></tr></table>',
  );
  assert.deepEqual(
    rows.map((r) => r.cells),
    [
      ["3", "A", "Due"],
      ["3", "B", "Due"],
    ],
  );
});
test("override ordering, moving attachments, hiding and links", () => {
  const c = applyOverride(fixture(), {
    items: { c: { after: "a" }, b: { hidden: true } },
    resources: { pdf: { itemId: "c", type: "exam" } },
  });
  assert.deepEqual(
    c.items.map((i) => i.id),
    ["a", "c"],
  );
  assert.deepEqual(c.items[0].resources, []);
  assert.deepEqual(c.items[1].resources, ["pdf"]);
  assert.equal(c.items[0].next, "c");
  assert.equal(c.items[1].previous, "a");
  assert.throws(() => applyOverride(fixture(), { order: ["missing"] }));
});
test("progress ignores unknown IDs and resume follows incomplete position", () => {
  const c = fixture();
  const s = emptyState();
  s.progress[progressKey(c.id, "a")] = { completed: true, openedAt: "" };
  s.progress[progressKey(c.id, "unknown")] = { completed: true, openedAt: "" };
  assert.equal(percentage(c, s), 33);
  assert.equal(resumeItem(c, s).id, "b");
  s.positions[c.id] = "c";
  assert.equal(resumeItem(c, s).id, "c");
  assert.equal(percentage({ ...c, items: [] }, s), 0);
});
test("resource resolver rejects traversal, absolute paths and symlink escapes", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "ocw-test-"));
  try {
    fs.mkdirSync(path.join(base, "course"));
    fs.writeFileSync(path.join(base, "course", "file.pdf"), "test");
    fs.writeFileSync(path.join(base, "outside"), "private");
    fs.symlinkSync(
      path.join(base, "outside"),
      path.join(base, "course", "escape"),
    );
    assert.equal(
      resolveResource(base, "course", "file.pdf"),
      fs.realpathSync(path.join(base, "course", "file.pdf")),
    );
    for (const name of ["../outside", "/etc/passwd", "..\\outside", "escape"])
      assert.throws(() => resolveResource(base, "course", name));
    assert.throws(() => resolveResource(base, "../", "outside"));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
test(
  "real course preserves source order, all PDFs and reading references",
  { skip: !fs.existsSync(root) },
  () => {
    const { course: c, report } = importCourse(root, "9.01-fall-2007");
    assert.equal(c.items.filter((i) => i.type === "lecture").length, 22);
    assert.equal(c.items.filter((i) => i.type === "exam").length, 3);
    assert.equal(
      c.resources.filter((r) => r.mime === "application/pdf").length,
      48,
    );
    assert.equal(report.unresolvedFiles.length, 0);
    assert.equal(c.items[0].id, "orientation");
    assert.equal(c.items[1].reading, "Chapter 1");
    for (const [id, prev] of [
      ["problem-set-1", "synaptic-transmission-1-physiology"],
      ["problem-set-2", "olfaction"],
      ["problem-set-3", "learning-and-memory-2"],
    ])
      assert.equal(c.items.find((i) => i.id === id)?.previous, prev);
    assert.equal(
      c.items.find((i) => i.id === "problem-set-1")?.resources.length,
      2,
    );
    assert.equal(
      c.items.find((i) => i.id === "final-exam")?.resources.length,
      5,
    );
    assert.deepEqual(importCourse(root, "9.01-fall-2007"), {
      course: c,
      report,
    });
    for (const r of c.resources)
      if (r.path)
        assert.ok(
          fs.existsSync(resolveResource(process.cwd(), c.root, r.path)),
        );
  },
);
test("a second synthetic course imports without course-specific assumptions", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "ocw-import-"));
  try {
    fs.mkdirSync(path.join(base, "pages", "syllabus"), { recursive: true });
    fs.mkdirSync(path.join(base, "resources", "notes"), { recursive: true });
    fs.mkdirSync(path.join(base, "static_resources"));
    fs.writeFileSync(
      path.join(base, "data.json"),
      JSON.stringify({
        site_short_id: "6.003-demo",
        course_title: "Signals",
        primary_course_number: "6.003",
      }),
    );
    fs.writeFileSync(
      path.join(base, "pages", "syllabus", "data.json"),
      JSON.stringify({
        title: "Syllabus",
        content:
          "<table><tr><td>1</td><td>Signals and systems</td><td>Teacher</td></tr></table>",
      }),
    );
    fs.writeFileSync(
      path.join(base, "resources", "notes", "data.json"),
      JSON.stringify({
        uid: "notes",
        title: "Signals and systems",
        file: "/courses/demo/notes.pdf",
        file_type: "application/pdf",
      }),
    );
    fs.writeFileSync(path.join(base, "static_resources", "notes.pdf"), "PDF");
    const c = importCourse(base, "courses/signals").course;
    assert.equal(c.number, "6.003");
    assert.equal(c.items[1].title, "Signals and systems");
    assert.deepEqual(c.items[1].resources, ["notes"]);
    assert.equal(c.items[0].next, c.items[1].id);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test("local persistence separates guest and account state and rejects corrupt data", async () => {
  const { createLocalStorageAdapter, parseStudyState } =
    await import("../lib/study");
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) || null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  const guest = createLocalStorageAdapter("guest", storage);
  const account = createLocalStorageAdapter("user:alice", storage);
  const s = emptyState();
  s.theme = "light";
  await guest.save(s);
  assert.equal((await account.load()).theme, "dark");
  assert.equal((await guest.load()).theme, "light");
  data.set("user:alice", "broken");
  await assert.rejects(account.load(), /could not be read/);
  assert.throws(() => parseStudyState({ notes: "bad" }));
  assert.throws(() => parseStudyState({ notes: [{ id: "x" }] }));
});
test("providers encode filenames and preserve original external links", async () => {
  const { localProvider, staticProvider, studyContext } =
    await import("../lib/resource-provider");
  const c = applyOverride(fixture(), {});
  assert.equal(localProvider.url(c, c.resources[0]), "/api/resources/test/pdf");
  const r = { ...c.resources[0], path: "static_resources/file #1.pdf" };
  assert.equal(
    staticProvider("https://assets.example/").url(c, r),
    "https://assets.example/courses/test/static_resources/file%20%231.pdf",
  );
  assert.equal(
    localProvider.url(c, { ...r, url: "https://ocw.mit.edu/source.pdf" }),
    "https://ocw.mit.edu/source.pdf",
  );
  assert.equal(studyContext(c, "b", "pdf").previous?.id, "a");
  assert.equal(studyContext(c, "b", "pdf").next?.id, "c");
});
