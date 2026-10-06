import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as cheerio from "cheerio";
import sanitize from "sanitize-html";
import { Course, CourseItem, Override, Resource } from "./schema";
const natural = new Intl.Collator("en", { numeric: true });
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
export const stableId = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function inventory(root: string): string[] {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .sort((a, b) => natural.compare(a.name, b.name))
    .flatMap((e) =>
      e.isSymbolicLink()
        ? []
        : e.isDirectory()
          ? inventory(path.join(root, e.name)).map((f) => `${e.name}/${f}`)
          : [e.name],
    );
}
export function tableRows(html: string) {
  const $ = cheerio.load(html);
  const result: { cells: string[]; html: string[]; section: string; headers: string[] }[] = [];
  $("table").each((_, table) => {
    const spans = new Map<
      number,
      { text: string; html: string; left: number }
    >();
    let section = "Course";
    let headers:string[]=[];
    $(table)
      .find("tr")
      .each((_, tr) => {
        if($(tr).children("th").length){headers=$(tr).children("th").map((_,h)=>clean($(h).text())).get();return;}
        const tds = $(tr).children("td");
        if (!tds.length) return;
        if (Number(tds.first().attr("colspan")) > 1) {
          section = clean(tds.text());
          return;
        }
        const cells: string[] = [];
        const contents: string[] = [];
        let col = 0;
        const inherited = () => {
          while (spans.has(col)) {
            const s = spans.get(col)!;
            cells[col] = s.text;
            contents[col] = s.html;
            s.left--;
            if (!s.left) spans.delete(col);
            col++;
          }
        };
        tds.each((_, td) => {
          inherited();
          const text = clean($(td).text());
          const h = $(td).html() || "";
          cells[col] = text;
          contents[col] = h;
          const n = Number($(td).attr("rowspan") || 1);
          if (n > 1) spans.set(col, { text, html: h, left: n - 1 });
          col++;
        });
        inherited();
        result.push({ cells, html: contents, section, headers });
      });
  });
  return result;
}
export function applyOverride(course: Course, override: Override) {
  if (override.title) course.title = override.title;
  for (const [id, patch] of Object.entries(override.items || {})) {
    const item = course.items.find((i) => i.id === id);
    if (!item) throw Error(`Unknown override item ${id}`);
    const { after, ...rest } = patch;
    Object.assign(item, rest);
    if (after) {
      const target = course.items.find((i) => i.id === after);
      if (!target) throw Error(`Unknown after item ${after}`);
      course.items = course.items.filter((i) => i !== item);
      course.items.splice(course.items.indexOf(target) + 1, 0, item);
    }
  }
  for (const [id, patch] of Object.entries(override.resources || {})) {
    const r = course.resources.find((r) => r.id === id);
    if (!r) throw Error(`Unknown override resource ${id}`);
    const { itemId, ...rest } = patch;
    Object.assign(r, rest);
    if (itemId) {
      const item = course.items.find((i) => i.id === itemId);
      if (!item) throw Error(`Unknown resource target ${itemId}`);
      for (const i of course.items)
        i.resources = i.resources.filter((x) => x !== id);
      item.resources.push(id);
    }
  }
  if (override.order) {
    const rank = new Map(override.order.map((id, i) => [id, i]));
    for (const id of rank.keys())
      if (!course.items.some((i) => i.id === id))
        throw Error(`Unknown order item ${id}`);
    course.items.sort(
      (a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999),
    );
  }
  course.items = course.items.filter((i) => !i.hidden);
  const hidden = new Set(
    course.resources.filter((r) => r.hidden).map((r) => r.id),
  );
  for (const i of course.items)
    i.resources = i.resources.filter((id) => !hidden.has(id));
  course.items.forEach((i, n) => {
    i.previous = course.items[n - 1]?.id;
    i.next = course.items[n + 1]?.id;
  });
  return course;
}
export function importCourse(root: string, relativeRoot: string) {
  const files = inventory(root);
  const read = (f: string) =>
    JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
  const meta = read("data.json");
  const warnings: string[] = [];
  const resources: Resource[] = [];
  const byPage = new Map<string, string>();
  for (const f of files.filter(
    (f) => f.endsWith("data.json") && f.startsWith("resources/"),
  )) {
    const m = read(f);
    if (!m.file && !m.video_metadata?.youtube_id) continue;
    const candidates = files.filter(
      (p) =>
        !p.endsWith("data.json") &&
        path.basename(p) === path.basename(m.file || ""),
    );
    const local = candidates[0];
    if (candidates.length > 1)
      warnings.push(`Ambiguous asset filename: ${m.file}`);
    const youtube = m.video_metadata?.youtube_id;
    const r: Resource = {
      id: m.uid || stableId(f),
      title: m.title || path.basename(f),
      type: (
        m.learning_resource_types?.[0] ||
        m.resourcetype ||
        "other"
      ).toLowerCase(),
      path: local,
      url: youtube
        ? `https://www.youtube.com/watch?v=${youtube}`
        : !local && m.file?.startsWith("http")
          ? m.file
          : undefined,
      mime:
        m.file_type || (youtube ? "video/youtube" : "application/octet-stream"),
      description: m.description || "",
      license: m.license,
    };
    resources.push(r);
    byPage.set(f.replace("data.json", "index.html"), r.id);
    if(local)byPage.set(local,r.id);
    if (!local && !r.url) warnings.push(`Missing asset: ${m.file}`);
  }
  const pages = files
    .filter((f) => /^pages\/.+\/data.json$/.test(f))
    .map((f) => ({ file: f, ...read(f) }));
  const page = (pattern: RegExp) => pages.find((p) => pattern.test(p.title));
  const links = (html: string, file: string) => {
    const $ = cheerio.load(html);
    const ids: string[] = [];
    $("a[href]").each((_, a) => {
      const href = $(a).attr("href")!;
      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(file), href.split(/[?#]/)[0]),
      );
      const id = byPage.get(resolved);
      if (id) ids.push(id);
    });
    return [...new Set(ids)];
  };
  const syllabus = page(/syllabus/i);
  const readings = page(/^readings$/i);
  const notes = page(/lecture notes/i);
  const recitations = page(/recitations/i);
  const exams = page(/^exams$/i);
  const assignments = page(/^assignments$/i);
  const calendar = page(/calendar|schedule/i);
  const schedule = tableRows(
    calendar?.content || syllabus?.content || "",
  ).filter(
    (r) => /^\d/.test(r.cells[0] || "") || /final exam/i.test(r.cells[1] || "") || (r.headers.some(h=>/topics?|lecture title/i.test(h)) && !!r.cells[r.headers.findIndex(h=>/topics?|lecture title/i.test(h))]),
  );
  const items: CourseItem[] = [
    {
      id: "orientation",
      title: "Welcome & syllabus",
      type: "orientation",
      section: "Getting started",
      html: syllabus?.content || meta.course_description_html || "",
      resources: [],
    },
  ];
  const readingRows = tableRows(readings?.content || "");
  const noteRows = tableRows(notes?.content || "");
  const recRows = tableRows(recitations?.content || "");
  const matchTitle = (s: string) =>
    clean(s.replace(/\(PDF[^)]*\)|\(Courtesy[\s\S]*$/gi, "")).toLowerCase();
  let lecture = 0;
  for (const row of schedule) {
    const topicColumn=row.headers.findIndex(h=>/topics?|lecture title/i.test(h));
    const title = clean(
      (row.cells[topicColumn<0?1:topicColumn] || "").replace(/\(PDF[^)]*\)|\(Courtesy[\s\S]*$/gi, ""),
    );
    const exam = /^(exam\b|final exam\b|midterm\b|quiz\b)|quiz$/i.test(title);
    const weekColumn=row.headers.findIndex(h=>/week/i.test(h));
    const week = parseInt(row.cells[weekColumn<0?0:weekColumn]) || undefined;
    const reading = readingRows.find(
      (r) => matchTitle(r.cells[1] || "") === matchTitle(title),
    )?.cells[3];
    const rs = [...links(row.html.join(" "),calendar?.file||syllabus?.file||"pages/index.html"), ...[...noteRows, ...recRows]
      .filter((r) => matchTitle(r.cells[1] || "") === matchTitle(title))
      .flatMap((r) =>
        links(
          r.html.join(" "),
          (noteRows.includes(r) ? notes : recitations)?.file || "",
        ),
      )];
    if (exam && exams) {
      const $ = cheerio.load(exams.content);
      const h = $("h3").filter((_, e) =>
        clean($(e).text())
          .toLowerCase()
          .startsWith(title.replace(/exam$/i, "exam").toLowerCase()),
      );
      h.each((_, e) => {
        let next = $(e).next();
        while (next.length && !next.is("h3")) {
          rs.push(...links($.html(next), exams.file));
          next = next.next();
        }
      });
    }
    items.push({
      id: stableId(title),
      title,
      type: exam ? "exam" : "lecture",
      section: row.section,
      week,
      lecturer: row.cells[2],
      reading,
      resources: [...new Set(rs)],
      html: exam
        ? "<p>This is a scheduled assessment. The download provides selected review materials, not the original exam paper.</p>"
        : undefined,
    });
    if (!exam) lecture++;
    const due = row.cells.join(" ").match(/problem set\s*(\d+)\s*due/i);
    if (
      due &&
      !schedule.some(
        (r, n) =>
          n > schedule.indexOf(row) &&
          r.cells[0] === row.cells[0] &&
          new RegExp(`problem set ${due[1]}\\s*due`,"i").test(r.cells.join(" ")),
      )
    ) {
      const n = due[1];
      const ids = resources
        .filter((r) => new RegExp(`problem set ${n}\\b`, "i").test(r.title))
        .map((r) => r.id);
      if (assignments) {
        const $ = cheerio.load(assignments.content);
        $("p").each((_, p) => {
          if (new RegExp(`problem set ${n}\\b`, "i").test($(p).text()))
            ids.push(...links($.html(p), assignments.file));
        });
      }
      items.push({
        id: `problem-set-${n}`,
        title: `Problem set ${n}`,
        type: "problem-set",
        section: row.section,
        week,
        resources: [...new Set(ids)],
      });
    }
  }
  if (!schedule.length) {
    warnings.push(
      "No calendar detected; falling back to section/resource order.",
    );
    for (const p of pages.filter((p) => p !== syllabus))
      items.push({
        id: stableId(p.title),
        title: p.title,
        type: /lecture/i.test(p.title) ? "lecture" : "supplemental",
        section: "Course",
        html: p.content,
        resources: links(p.content, p.file),
      });
  }
  // Conservative metadata associations repair unlinked recitation files and exact title matches.
  for (const r of resources) {
    const week = r.title.match(/^week\s*(\d+)/i);
    for (const i of items) {
      if (
        (week && i.type === "lecture" && i.week === Number(week[1])) ||
        (i.type === "lecture" && matchTitle(i.title) === matchTitle(r.title)) ||
        (i.type === "exam" &&
          /final/i.test(i.title) &&
          /finalrev_/i.test(r.path || ""))
      ) {
        if (!i.resources.includes(r.id)) i.resources.push(r.id);
      }
    }
  }
  for (const p of pages.filter(
    (p) => schedule.length > 0 &&
      ![
        syllabus,
        calendar,
        readings,
        notes,
        recitations,
        exams,
        assignments,
      ].includes(p),
  )) {
    items.push({
      id: stableId(p.title),
      title: p.title,
      type: "supplemental",
      section: "Additional materials",
      html: p.content,
      resources: links(p.content || "", p.file),
    });
  }
  // Metadata keeps all files discoverable even when the source HTML does not link them.
  for(const i of items)i.resources.sort((a,b)=>Number(!/lecture|video/i.test(resources.find(r=>r.id===a)?.type||""))-Number(!/lecture|video/i.test(resources.find(r=>r.id===b)?.type||"")));
  const used = new Set(items.flatMap((i) => i.resources));
  const unmatched = resources.filter((r) => !used.has(r.id));
  if (unmatched.length)
    warnings.push(
      `${unmatched.length} resources lack a reliable calendar association; retained in library.`,
    );
  if (!resources.some((r) => r.mime.startsWith("video")))
    warnings.push("No lecture videos in this download.");
  if (items.some((i) => i.reading))
    warnings.push(
      "Reading references may require material not included in this download.",
    );
  const course: Course = {
    id: meta.site_short_id || stableId(path.basename(root)),
    title: meta.course_title || meta.title,
    number: meta.primary_course_number || "",
    description: meta.course_description || "",
    instructors: (meta.instructors || []).map(
      (i: { title: string }) => i.title,
    ),
    department: meta.department_numbers?.join(", ") || "",
    source: `https://ocw.mit.edu/${meta.site_url_path || ""}`,
    license: syllabus?.license || resources[0]?.license || "",
    root: relativeRoot,
    items,
    resources,
    metadata: meta,
  };
  // Original content only, safe HTML with resource links resolved through the engine.
  for (const i of items)
    if (i.html) {
      const $ = cheerio.load(i.html);
      $("a[href]").each((_, a) => {
        const href = $(a).attr("href")!;
        const id = byPage.get(
          path.posix.normalize(path.posix.join(path.posix.dirname(pages.find(p=>stableId(p.title)===i.id)?.file||syllabus?.file||"pages/index.html"), href.split("#")[0])),
        );
        if (id) $(a).attr("href", `/api/resources/${course.id}/${id}`);
        else if (!/^https?:|^#/.test(href)) $(a).removeAttr("href");
      });
      i.html = sanitize($.html(), {
        allowedTags: sanitize.defaults.allowedTags,
        allowedAttributes: {
          a: ["href", "target", "rel"],
          td: ["colspan", "rowspan"],
          th: ["colspan", "rowspan"],
        },
      });
    }
  const overridePath = path.join(root, "course.override.json");
  applyOverride(
    course,
    fs.existsSync(overridePath) ? read("course.override.json") : {},
  );
  const hashes = new Map<string, string[]>();
  for (const r of resources.filter((r) => r.path)) {
    const hash = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(root, r.path!)))
      .digest("hex");
    hashes.set(hash, [...(hashes.get(hash) || []), r.id]);
  }
  const registered = new Set(resources.map((r) => r.path));
  const unresolved = files.filter(
    (f) =>
      f.startsWith("static_resources/") &&
      !registered.has(f) &&
      !/(index.html|data.json)$/.test(f),
  );
  if (unresolved.length)
    warnings.push(
      `${unresolved.length} asset files have no resource metadata; inspect unresolvedFiles.`,
    );
  for(const i of course.items){if(i.html)i.html=sanitize(i.html,{allowedTags:sanitize.defaults.allowedTags,allowedAttributes:{a:["href","target","rel"],td:["colspan","rowspan"],th:["colspan","rowspan"],h3:["id"]}});for(const id of i.resources)if(!course.resources.some(r=>r.id===id))throw Error(`Unknown item resource ${id}`);}
  const ids = course.items.map((i) => i.id);
  if (new Set(ids).size !== ids.length)
    throw Error(
      "Duplicate item IDs; use explicit stable IDs to disambiguate source topics.",
    );
  return {
    course,
    report: {
      metadata: meta,
      detectedLectures: lecture,
      lectures: course.items.filter((i) => i.type === "lecture"),
      readings: items
        .filter((i) => i.reading)
        .map((i) => ({ item: i.id, reading: i.reading })),
      assignments: items.filter((i) => i.type === "problem-set"),
      exams: items.filter((i) => i.type === "exam"),
      unassociatedResources: unmatched.map((r) => r.id),
      unresolvedFiles: unresolved,
      duplicateResources: [...hashes.values()].filter((v) => v.length > 1),
      warnings,
      heuristics: [
        "Syllabus/calendar table order is authoritative; rowspan cells expanded.",
        "Readings/notes/recitations joined by exact normalized topic title.",
        "Problem sets placed after final topic in due week.",
      ],
      inventory: files,
      pages: pages.map((p) => ({
        title: p.title,
        file: p.file,
        links: links(p.content || "", p.file),
      })),
    },
  };
}
