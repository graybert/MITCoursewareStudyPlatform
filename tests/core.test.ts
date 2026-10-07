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
      c.resources.filter((r) => r.mime === "application/pdf" && !r.userSupplied)
        .length,
      48,
    );
    assert.equal(report.unresolvedFiles.length, 0);
    assert.equal(c.items[0].id, "orientation");
    assert.equal(c.items[1].reading, "Chapter 1");
    assert.match(c.readingCitation || "", /Neuroscience: Exploring the Brain/);
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
          fs.existsSync(
            resolveResource(process.cwd(), r.localRoot ?? c.root, r.path),
          ),
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

test("repeated calendar titles get deterministic distinct IDs", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "ocw-repeat-"));
  try {
    fs.mkdirSync(path.join(base, "pages", "calendar"), { recursive: true });
    fs.writeFileSync(
      path.join(base, "data.json"),
      JSON.stringify({
        course_title: "Repeated topics",
        site_short_id: "repeated",
      }),
    );
    fs.writeFileSync(
      path.join(base, "pages", "calendar", "data.json"),
      JSON.stringify({
        title: "Calendar",
        content:
          "<table><tr><th>Date</th><th>Topics</th></tr><tr><td>Sep 1</td><td>Fourier transforms</td></tr><tr><td>Sep 3</td><td>Fourier transforms</td></tr></table>",
      }),
    );
    const c = importCourse(base, "courses/repeated").course;
    assert.deepEqual(
      c.items.map((i) => i.id),
      ["orientation", "fourier-transforms", "fourier-transforms-2"],
    );
    assert.equal(c.items[1].next, "fourier-transforms-2");
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test("reading chapters support multiple chapters/ranges without confusing page numbers", async () => {
  const { readingChapters } = await import("../lib/readings");
  assert.deepEqual(readingChapters("Chapters 15 and 16"), [15, 16]);
  assert.deepEqual(readingChapters("Chapter 9, pp. 277–308"), [9]);
  assert.deepEqual(readingChapters("Chapters 2–4, 6 & 8"), [2, 3, 4, 6, 8]);
  assert.deepEqual(readingChapters("Pages 15 and 16"), []);
  assert.throws(() => readingChapters("Chapters 4-2"));
});
test("textbook overrides associate readings without changing course order or granting OCW licensing", () => {
  const c = fixture();
  c.items[0].reading = "Chapters 1 and 2";
  const originalIds = c.items.map((i) => i.id);
  applyOverride(c, {
    textbooks: [
      {
        resource: {
          id: "book",
          title: "Private book",
          path: "Book.pdf",
          localRoot: ".",
          mime: "application/pdf",
          type: "textbook",
          description: "",
        },
        chapters: {
          "1": { pdfPage: 43, printedPage: "3" },
          "2": { pdfPage: 63, printedPage: "23" },
        },
      },
    ],
  });
  assert.deepEqual(
    c.items.map((i) => i.id),
    originalIds,
  );
  assert.deepEqual(
    c.items[0].readingLinks?.map((l) => l.pdfPage),
    [43, 63],
  );
  assert.deepEqual(c.items[0].resources, ["pdf", "book"]);
  assert.equal(c.resources.at(-1)?.userSupplied, true);
  assert.equal(c.resources.at(-1)?.license, undefined);
  assert.throws(() =>
    applyOverride(fixture(), {
      textbooks: [
        {
          resource: {
            id: "book",
            title: "Book",
            mime: "application/pdf",
            type: "textbook",
            description: "",
          },
          chapters: { "1": { pdfPage: 0 } },
        },
      ],
    }),
  );
});
test("explicit repository-root resource registration still rejects traversal and escapes", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "ocw-book-"));
  try {
    fs.writeFileSync(path.join(base, "Book.pdf"), "PDF");
    assert.equal(
      resolveResource(base, ".", "Book.pdf"),
      fs.realpathSync(path.join(base, "Book.pdf")),
    );
    assert.throws(() => resolveResource(base, ".", "../private.pdf"));
    assert.throws(() => resolveResource(base, "..", "Book.pdf"));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test("file streams preserve ranges and tolerate cancellation of large requests", async () => {
  const { fileStream } = await import("../lib/file-stream");
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "ocw-stream-"));
  try {
    const file = path.join(base, "large.pdf");
    fs.writeFileSync(file, Buffer.alloc(1024 * 1024, 65));
    const partial = await new Response(fileStream(file, 10, 109)).arrayBuffer();
    assert.equal(partial.byteLength, 100);
    assert.equal(new Uint8Array(partial)[0], 65);
    const reader = fileStream(file, 0, 1024 * 1024 - 1).getReader();
    const first = await reader.read();
    assert.ok(first.value?.byteLength);
    await reader.cancel();
    assert.equal((await reader.read()).done, true);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
test("missing optional textbook does not block course importing", () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "ocw-missing-book-"));
  try {
    fs.writeFileSync(
      path.join(base, "data.json"),
      JSON.stringify({ course_title: "Course", site_short_id: "missing-book" }),
    );
    fs.writeFileSync(
      path.join(base, "course.override.json"),
      JSON.stringify({
        textbooks: [
          {
            resource: {
              id: "missing",
              title: "Missing book",
              path: "missing.pdf",
              type: "textbook",
              mime: "application/pdf",
              description: "",
            },
            chapters: { "1": { pdfPage: 43 } },
          },
        ],
      }),
    );
    const { course, report } = importCourse(base, "courses/missing");
    assert.equal(course.resources.length, 0);
    assert.ok(report.warnings.some((w) => /textbook unavailable/.test(w)));
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
