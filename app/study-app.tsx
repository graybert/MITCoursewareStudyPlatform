"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark as BookmarkIcon,
  Check,
  ChevronRight,
  FileText,
  GraduationCap,
  Menu,
  PanelRightClose,
  Search,
  Settings,
  X,
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
const PdfViewer = dynamic(() => import("./components/pdf-viewer"), {
  ssr: false,
  loading: () => <p className="muted">Opening PDF viewer…</p>,
});
import ReactMarkdown from "react-markdown";
import { Course, CourseItem, Resource } from "../lib/schema";
import { percentage, progressKey, resumeItem } from "../lib/study";
import { supabase } from "../lib/supabase";
import { useStudyWorkspace } from "../lib/use-study-workspace";
import { resourceUrl } from "../lib/resource-provider";
type View = "dashboard" | "course" | "player" | "saved" | "settings";
export default function StudyApp({ courses }: { courses: Course[] }) {
  const { state, setState, ready, error, setError, sync, saved, setSaved } =
    useStudyWorkspace();
  const [view, setView] = useState<View>("dashboard");
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const [itemId, setItemId] = useState("orientation");
  const [resourceId, setResourceId] = useState("");
  const [resourcePage, setResourcePage] = useState<number | undefined>();
  const [pageRequestId, setPageRequestId] = useState(0);
  const [query, setQuery] = useState("");
  const [nav, setNav] = useState(true);
  const [notesPane, setNotesPane] = useState(true);
  const [tab, setTab] = useState<"content" | "resources">("content");
  const [email, setEmail] = useState("");
  const [noteId, setNoteId] = useState("");
  const [preview, setPreview] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (window.matchMedia("(max-width: 700px)").matches) setNav(false);
    const hash = () => {
      let parts: string[];
      try {
        parts = location.hash.slice(1).split("/").map(decodeURIComponent);
      } catch {
        return;
      }
      if (
        parts[0] === "study" &&
        courses.some(
          (c) => c.id === parts[1] && c.items.some((i) => i.id === parts[2]),
        )
      ) {
        setCourseId(parts[1]);
        setItemId(parts[2]);
        setResourceId(parts[3] || "");
        setResourcePage(
          /^\d+$/.test(parts[4] || "") && Number(parts[4]) > 0
            ? Number(parts[4])
            : undefined,
        );
        setView("player");
      } else if (
        parts[0] === "course" &&
        courses.some((c) => c.id === parts[1])
      ) {
        setCourseId(parts[1]);
        setView("course");
      }
    };
    hash();
    window.addEventListener("hashchange", hash);
    return () => window.removeEventListener("hashchange", hash);
  }, [courses]);
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);
  const course = courses.find((c) => c.id === courseId);
  const item = course?.items.find((i) => i.id === itemId) || course?.items[0];
  useEffect(() => {
    if (!ready || view !== "player" || !course || !item) return;
    setState((s) => ({
      ...s,
      positions: { ...s.positions, [course.id]: item.id },
      progress: {
        ...s.progress,
        [progressKey(course.id, item.id)]: {
          ...s.progress[progressKey(course.id, item.id)],
          completed:
            s.progress[progressKey(course.id, item.id)]?.completed || false,
          openedAt: new Date().toISOString(),
        },
      },
    }));
  }, [ready, view, course, item, setState]);
  function open(c: Course, i: CourseItem, r = "", page?: number) {
    setCourseId(c.id);
    setItemId(i.id);
    setResourceId(r);
    setResourcePage(page);
    setPageRequestId((n) => n + 1);
    setTab("content");
    setView("player");
    setNoteId("");
    location.hash = `study/${encodeURIComponent(c.id)}/${encodeURIComponent(i.id)}${r ? "/" + encodeURIComponent(r) : ""}${r && page ? "/" + page : ""}`;
  }
  function home(c: Course) {
    setCourseId(c.id);
    setView("course");
    setQuery("");
    location.hash = `course/${encodeURIComponent(c.id)}`;
  }
  function changeView(v: View) {
    setView(v);
    setQuery("");
    history.replaceState(null, "", location.pathname);
  }
  function complete(c: Course, i: CourseItem, advance = false) {
    setState((s) => ({
      ...s,
      progress: {
        ...s.progress,
        [progressKey(c.id, i.id)]: {
          completed: true,
          openedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      },
    }));
    if (advance && i.next)
      open(
        c,
        c.items.find((x) => x.id === i.next)!,
      );
    else if (advance) home(c);
  }
  function bookmark(c: Course, i: CourseItem, r?: Resource) {
    const id = `${c.id}/${i.id}/${r?.id || ""}`;
    setState((s) => ({
      ...s,
      bookmarks: s.bookmarks.some((b) => b.id === id)
        ? s.bookmarks.filter((b) => b.id !== id)
        : [
            ...s.bookmarks,
            {
              id,
              courseId: c.id,
              itemId: i.id,
              resourceId: r?.id,
              label: r?.title || i.title,
              createdAt: new Date().toISOString(),
            },
          ],
    }));
  }
  const activeResources =
    course && item
      ? course.resources.filter(
          (r) => item.resources.includes(r.id) && !r.hidden,
        )
      : [];
  const selected =
    course?.resources.find((r) => r.id === resourceId && !r.hidden) ||
    activeResources[0];
  const selectedPage =
    resourcePage ??
    item?.readingLinks?.find((link) => link.resourceId === selected?.id)
      ?.pdfPage ??
    1;
  const selectedUrl =
    course && selected
      ? resourceUrl(course, selected) +
        (selected.mime.includes("pdf") ? `#page=${selectedPage}` : "")
      : "";
  const currentNotes = state.notes.filter(
    (n) => n.courseId === courseId && (n.itemId === item?.id || !n.itemId),
  );
  const currentNote =
    currentNotes.find((n) => n.id === noteId) || currentNotes[0];
  function addNote(scope: "item" | "course") {
    const id = crypto.randomUUID();
    setState((s) => ({
      ...s,
      notes: [
        ...s.notes,
        {
          id,
          courseId,
          itemId: scope === "item" ? item?.id : undefined,
          resourceId: scope === "item" ? selected?.id : undefined,
          text: "",
          updatedAt: new Date().toISOString(),
        },
      ],
    }));
    setNoteId(id);
    setPreview(false);
  }
  function resourceCard(c: Course, r: Resource) {
    return (
      <div className="resource-card" key={r.id}>
        <FileText size={19} />
        <div>
          <strong>{r.title}</strong>
          <small>
            {r.type} · {r.mime.includes("pdf") ? "PDF" : r.mime}
          </small>
        </div>
        <button
          onClick={() => {
            if (item) open(c, item, r.id);
          }}
          aria-label={`View ${r.title}`}
        >
          View
        </button>
        <a
          href={resourceUrl(c, r)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${r.title} externally`}
        >
          ↗
        </a>
        {item && (
          <button
            className="icon-button"
            onClick={() => bookmark(c, item, r)}
            aria-label={`Bookmark ${r.title}`}
          >
            <BookmarkIcon size={16} />
          </button>
        )}
      </div>
    );
  }
  if (!ready)
    return (
      <main className="loading">
        <BookOpen />
        <p>{error || "Opening your study workspace…"}</p>
      </main>
    );
  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => changeView("dashboard")}>
          <span className="brand-mark">
            <BookOpen size={22} />
          </span>
          Open Study<span className="brand-sub">COURSEWARE</span>
        </button>
        <nav>
          <button
            className={view === "dashboard" ? "active" : ""}
            onClick={() => changeView("dashboard")}
          >
            My courses
          </button>
          <button
            className={view === "saved" ? "active" : ""}
            onClick={() => changeView("saved")}
          >
            Saved
          </button>
        </nav>
        <button
          className="icon-button"
          aria-label="Settings"
          onClick={() => changeView("settings")}
        >
          <Settings size={19} />
        </button>
      </header>
      {error && (
        <div className="error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}
      {view === "dashboard" && (
        <main className="dashboard">
          <div className="eyebrow">YOUR LEARNING WORKSPACE</div>
          <h1>
            A little further,
            <br />
            <span>every day.</span>
          </h1>
          <p className="lead">
            Pick up where you left off. Make room for curiosity.
          </p>
          <div className="section-heading">
            <h2>
              My courses <span className="count">{courses.length}</span>
            </h2>
            <span className="muted">Original materials. Your own pace.</span>
          </div>
          <div
            className={
              "course-grid " + (courses.length === 1 ? "single-course" : "")
            }
          >
            {courses.map((c) => {
              const pct = percentage(c, state);
              const next = resumeItem(c, state);
              return (
                <article className="course-card" key={c.id}>
                  <div className="course-art">
                    <div className="orbital">
                      <span />
                      <span />
                      <span />
                      <GraduationCap size={48} />
                    </div>
                    <span className="art-label">MIT OPENCOURSEWARE</span>
                    <span className="course-number">{c.number}</span>
                  </div>
                  <div className="card-body">
                    <div className="eyebrow">
                      {String(c.metadata.term || "")}{" "}
                      {String(c.metadata.year || "")} ·{" "}
                      {String(c.metadata.level || "")}
                    </div>
                    <button className="title-button" onClick={() => home(c)}>
                      <h2>{c.title}</h2>
                    </button>
                    <p>{c.instructors.join(" & ")}</p>
                    <div className="progress-label">
                      <span>
                        {pct === 100
                          ? "Course complete"
                          : pct
                            ? "In progress"
                            : "Ready to begin"}
                      </span>
                      <strong>{pct}%</strong>
                    </div>
                    <progress value={pct} max={100} />
                    <small className="next-label">UP NEXT</small>
                    <div className="next-title">{next.title}</div>
                    <button
                      className="primary wide"
                      onClick={() => open(c, next)}
                    >
                      {pct ? "Resume course" : "Start course"}
                      <ArrowRight size={17} />
                    </button>
                    <button
                      className="text-button wide"
                      onClick={() => home(c)}
                    >
                      Explore course <ChevronRight size={15} />
                    </button>
                    <small className="muted">
                      {c.items.filter((i) => i.type === "lecture").length}{" "}
                      lectures ·{" "}
                      {c.items.filter((i) => i.type === "problem-set").length}{" "}
                      problem sets
                      {state.progress[progressKey(c.id, state.positions[c.id])]
                        ?.openedAt
                        ? ` · Last studied ${new Date(state.progress[progressKey(c.id, state.positions[c.id])].openedAt).toLocaleDateString()}`
                        : ""}
                    </small>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="quiet-panel">
            <BookOpen size={24} />
            <div>
              <strong>A focused place to learn.</strong>
              <p>
                Authentic course materials, a clear path forward, and your notes
                alongside.
              </p>
            </div>
            <span className="local-badge">
              {sync ? "Account sync" : "Local workspace"}
            </span>
          </div>
          {!courses.length && (
            <p>
              No courses imported. Place an OCW download in courses/ and run npm
              run import:courses.
            </p>
          )}
        </main>
      )}
      {view === "course" && course && (
        <main className="course-home">
          <button
            className="text-button"
            onClick={() => changeView("dashboard")}
          >
            <ArrowLeft size={16} />
            My courses
          </button>
          <div className="course-hero">
            <div>
              <div className="eyebrow">
                MIT {course.number} · {String(course.metadata.term || "")}{" "}
                {String(course.metadata.year || "")}
              </div>
              <h1>{course.title}</h1>
              <p className="lead">{course.description}</p>
              <p className="muted">{course.instructors.join(" · ")}</p>
            </div>
            <div className="resume-box">
              <strong>{percentage(course, state)}%</strong>
              <span>of your course complete</span>
              <progress max={100} value={percentage(course, state)} />
              <button
                className="primary"
                onClick={() => open(course, resumeItem(course, state))}
              >
                {percentage(course, state) ? "Resume course" : "Start course"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          <div className="section-heading">
            <h2>Your course map</h2>
            <label className="search">
              <Search size={17} />
              <input
                aria-label="Search course"
                placeholder="Find a topic or resource"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <div className="home-columns">
            <div>
              {[...new Set(course.items.map((i) => i.section))].map(
                (section) => (
                  <section className="timeline-section" key={section}>
                    <h3>{section}</h3>
                    {course.items
                      .filter(
                        (i) =>
                          i.section === section &&
                          `${i.title} ${i.reading || ""}`
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                      )
                      .map((i) => (
                        <button
                          key={i.id}
                          className="timeline-item"
                          onClick={() => open(course, i)}
                        >
                          <span
                            className={
                              "step " +
                              (state.progress[progressKey(course.id, i.id)]
                                ?.completed
                                ? "done"
                                : "")
                            }
                          >
                            {state.progress[progressKey(course.id, i.id)]
                              ?.completed ? (
                              <Check size={15} />
                            ) : i.type === "lecture" ? (
                              <BookOpen size={15} />
                            ) : (
                              <FileText size={15} />
                            )}
                          </span>
                          <div>
                            <strong>{i.title}</strong>
                            <small>
                              {i.type.replace("-", " ")}
                              {i.week ? ` · Week ${i.week}` : ""}
                              {i.reading ? ` · ${i.reading}` : ""}
                            </small>
                          </div>
                          <ChevronRight size={17} />
                        </button>
                      ))}
                  </section>
                ),
              )}
            </div>
            <aside className="library">
              <h3>Resource library</h3>
              <p className="muted">
                All imported materials, including files without a clear calendar
                association.
              </p>
              {course.resources
                .filter(
                  (r) =>
                    !r.hidden &&
                    `${r.title} ${r.type}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                )
                .map((r) => (
                  <button
                    className="library-link"
                    key={r.id}
                    onClick={() =>
                      open(
                        course,
                        course.items.find((i) => i.resources.includes(r.id)) ||
                          course.items[0],
                        r.id,
                      )
                    }
                  >
                    <FileText size={16} />
                    <span>
                      {r.title}
                      <small>{r.type}</small>
                    </span>
                    <ChevronRight size={14} />
                  </button>
                ))}
            </aside>
          </div>
          <Attribution course={course} />
        </main>
      )}
      {view === "player" && course && item && (
        <div
          className={
            "player " +
            (!nav ? "nav-hidden " : "") +
            (!notesPane ? "notes-hidden" : "")
          }
        >
          <aside className="sequence">
            <button className="text-button" onClick={() => home(course)}>
              <ArrowLeft size={15} />
              Course overview
            </button>
            <h3>{course.title}</h3>
            <div className="progress-label">
              <span>Your progress</span>
              <span>{percentage(course, state)}%</span>
            </div>
            <progress max={100} value={percentage(course, state)} />
            <label className="search">
              <Search size={15} />
              <input
                aria-label="Search sequence"
                placeholder="Find a lesson"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {[...new Set(course.items.map((i) => i.section))].map((section) => (
              <div key={section}>
                <div className="sequence-heading">{section}</div>
                {course.items
                  .filter(
                    (i) =>
                      i.section === section &&
                      i.title.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((i) => (
                    <button
                      className={
                        "sequence-item " + (item.id === i.id ? "selected" : "")
                      }
                      key={i.id}
                      onClick={() => open(course, i)}
                    >
                      <span className="sequence-dot">
                        {state.progress[progressKey(course.id, i.id)]
                          ?.completed ? (
                          <Check size={14} />
                        ) : i.type === "lecture" ? (
                          <BookOpen size={14} />
                        ) : (
                          <FileText size={14} />
                        )}
                      </span>
                      <span>{i.title}</span>
                    </button>
                  ))}
              </div>
            ))}
          </aside>
          <main className="learning">
            <div className="player-toolbar">
              <button
                className="icon-button"
                onClick={() => setNav(!nav)}
                aria-label="Toggle course navigation"
              >
                <Menu size={19} />
              </button>
              <span>
                MIT {course.number} <ChevronRight size={13} />{" "}
                {item.type.replace("-", " ")}
              </span>
              <button
                className="icon-button"
                aria-label="Bookmark item"
                onClick={() => bookmark(course, item)}
              >
                <BookmarkIcon
                  size={18}
                  fill={
                    state.bookmarks.some(
                      (b) => b.id === `${course.id}/${item.id}/`,
                    )
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
              <button
                className="icon-button"
                aria-label="Toggle notes"
                onClick={() => setNotesPane(!notesPane)}
              >
                <PanelRightClose size={19} />
              </button>
            </div>
            <div className="lesson-heading">
              <div className="eyebrow">
                {item.section}
                {item.week ? ` · WEEK ${item.week}` : ""}
              </div>
              <h1>{item.title}</h1>
              {item.lecturer && (
                <p className="muted">Lecturer: {item.lecturer}</p>
              )}
            </div>
            {item.reading && (
              <div className="reading-callout">
                <BookOpen size={20} />
                <div>
                  <strong>Read before this lecture</strong>
                  <p>{item.reading}</p>
                  <small>
                    {course.readingCitation ||
                      "See the original syllabus for reading instructions."}
                  </small>
                  {item.readingLinks?.length ? (
                    <div className="reading-links">
                      {item.readingLinks.map((link) => (
                        <button
                          key={`${link.resourceId}/${link.chapter}`}
                          onClick={() => {
                            open(course, item, link.resourceId, link.pdfPage);
                          }}
                          title={link.title}
                        >
                          <BookOpen size={15} />
                          Read Chapter {link.chapter}
                          <span>
                            {link.printedPage
                              ? `p. ${link.printedPage}`
                              : `PDF p. ${link.pdfPage}`}
                          </span>
                        </button>
                      ))}
                      <small>
                        Your local textbook · opens at the assigned chapter.
                      </small>
                    </div>
                  ) : (
                    <small className="reading-availability">
                      Referenced books may need to be obtained separately from
                      the course download.
                    </small>
                  )}
                </div>
              </div>
            )}
            <div className="tabs">
              <button
                className={tab === "content" ? "selected" : ""}
                onClick={() => setTab("content")}
              >
                Study material
              </button>
              <button
                className={tab === "resources" ? "selected" : ""}
                onClick={() => setTab("resources")}
              >
                Resources{" "}
                <span className="count">{activeResources.length}</span>
              </button>
              {selected && tab === "content" && (
                <a
                  className="external"
                  href={selectedUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open externally ↗
                </a>
              )}
            </div>
            <div className="lesson-content">
              {tab === "resources" ? (
                <>
                  {activeResources.map((r) => resourceCard(course, r))}
                  {!activeResources.length && (
                    <p className="muted">
                      No downloadable resources were provided for this topic.
                    </p>
                  )}
                </>
              ) : (
                <>
                  {selected ? (
                    <>
                      <div className="resource-select">
                        <label>
                          Viewing{" "}
                          <select
                            aria-label="Select resource"
                            value={selected.id}
                            onChange={(e) => open(course, item, e.target.value)}
                          >
                            {[
                              ...new Map(
                                [...activeResources, selected].map((r) => [
                                  r.id,
                                  r,
                                ]),
                              ).values(),
                            ].map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <a
                          href={
                            resourceUrl(course, selected) +
                            (selected.url ? "" : "?download=1")
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download ↗
                        </a>
                      </div>
                      <ResourceViewer
                        course={course}
                        resource={selected}
                        initialPage={selectedPage}
                        pageRequestId={pageRequestId}
                      />
                    </>
                  ) : item.html ? (
                    <div
                      className="source-html"
                      dangerouslySetInnerHTML={{ __html: item.html }}
                    />
                  ) : (
                    <div className="material-notice">
                      <FileText size={35} />
                      <h3>Study the assigned material</h3>
                      <p>
                        {item.type === "lecture"
                          ? "MIT did not provide lecture notes or video for this topic in this download. Use the assigned reading and any available course resources."
                          : "This scheduled item has no attached downloadable paper in the source archive."}
                      </p>
                      <button onClick={() => home(course)}>
                        Browse all course resources <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="lesson-footer">
              <button
                disabled={!item.previous}
                onClick={() =>
                  open(
                    course,
                    course.items.find((i) => i.id === item.previous)!,
                  )
                }
              >
                <ArrowLeft size={16} />
                Previous
              </button>
              <button
                className="primary"
                onClick={() => complete(course, item, true)}
              >
                <Check size={17} />
                {item.next ? "Complete & continue" : "Complete course"}
              </button>
              <button
                disabled={!item.next}
                onClick={() =>
                  open(
                    course,
                    course.items.find((i) => i.id === item.next)!,
                  )
                }
              >
                Next
                <ArrowRight size={16} />
              </button>
            </div>
            {item.next && (
              <p className="up-next">
                NEXT UP · {course.items.find((i) => i.id === item.next)?.title}
              </p>
            )}
            <Attribution course={course} />
          </main>
          <aside className="notes-pane">
            <div className="section-heading">
              <h3>Your notes</h3>
              <span className="dot" />
            </div>
            <p className="muted">Keep the ideas that matter.</p>
            <div className="note-actions">
              <button onClick={() => addNote("item")}>+ Item note</button>
              <button onClick={() => addNote("course")}>+ Course note</button>
            </div>
            {currentNotes.length > 0 && (
              <select
                aria-label="Select note"
                value={currentNote?.id || ""}
                onChange={(e) => setNoteId(e.target.value)}
              >
                {currentNotes.map((n, k) => (
                  <option key={n.id} value={n.id}>
                    {n.itemId ? "Item" : "Course"} ·{" "}
                    {n.text.slice(0, 30) || `Note ${k + 1}`}
                  </option>
                ))}
              </select>
            )}
            {currentNote ? (
              <>
                <div className="note-top">
                  <small>
                    {currentNote.itemId
                      ? "Attached to this item"
                      : "Course note"}
                  </small>
                  <button
                    className="text-button"
                    onClick={() => setPreview(!preview)}
                  >
                    {preview ? "Edit" : "Preview"}
                  </button>
                </div>
                {preview ? (
                  <div className="markdown">
                    <ReactMarkdown>
                      {currentNote.text || "Your note is empty."}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    className="note-editor"
                    aria-label="Note text"
                    placeholder="Write a thought… Markdown supported."
                    value={currentNote.text}
                    onChange={(e) => {
                      const text = e.target.value;
                      setState((s) => ({
                        ...s,
                        notes: s.notes.map((n) =>
                          n.id === currentNote.id
                            ? {
                                ...n,
                                text,
                                updatedAt: new Date().toISOString(),
                              }
                            : n,
                        ),
                      }));
                    }}
                  />
                )}
                <small className="muted">
                  {saved} ·{" "}
                  {new Date(currentNote.updatedAt).toLocaleTimeString()}
                </small>
                <button
                  className="delete-note"
                  onClick={() => {
                    setState((s) => ({
                      ...s,
                      notes: s.notes.filter((n) => n.id !== currentNote.id),
                    }));
                    setNoteId("");
                  }}
                >
                  Delete note
                </button>
              </>
            ) : (
              <div className="empty-note">
                <FileText size={28} />
                <p>
                  A space for your thinking.
                  <br />
                  Add a note to get started.
                </p>
              </div>
            )}
            <div className="notes-context">
              <small>CURRENT CONTEXT</small>
              <strong>{item.title}</strong>
              {selected && <span>{selected.title}</span>}
            </div>
          </aside>
        </div>
      )}
      {view === "saved" && (
        <main className="dashboard">
          <div className="eyebrow">YOUR STUDY COLLECTION</div>
          <h1>Saved for later.</h1>
          <p className="lead">
            Bookmarks and notes, right where you need them.
          </p>
          <h2>
            Bookmarks <span className="count">{state.bookmarks.length}</span>
          </h2>
          {!state.bookmarks.length && (
            <p className="muted">
              Bookmark an item or resource from the learning player.
            </p>
          )}
          {state.bookmarks.map((b) => {
            const c = courses.find((c) => c.id === b.courseId);
            const i = c?.items.find((i) => i.id === b.itemId);
            return (
              <div className="saved-row" key={b.id}>
                <BookmarkIcon size={19} />
                <button onClick={() => c && i && open(c, i, b.resourceId)}>
                  <strong>{b.label}</strong>
                  <small>{c?.title || b.courseId}</small>
                </button>
                <button
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      bookmarks: s.bookmarks.filter((x) => x.id !== b.id),
                    }))
                  }
                  aria-label="Remove bookmark"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
          <h2 className="space-top">
            Notes <span className="count">{state.notes.length}</span>
          </h2>
          {state.notes.map((n) => {
            const c = courses.find((c) => c.id === n.courseId);
            return (
              <div className="saved-note" key={n.id}>
                <button
                  className="text-button"
                  onClick={() => {
                    if (c) {
                      open(
                        c,
                        c.items.find((i) => i.id === n.itemId) || c.items[0],
                      );
                      setNoteId(n.id);
                    }
                  }}
                >
                  {c?.title} <ChevronRight size={15} />
                </button>
                <ReactMarkdown>{n.text || "Empty note"}</ReactMarkdown>
                <small className="muted">
                  Updated {new Date(n.updatedAt).toLocaleString()}
                </small>
              </div>
            );
          })}
        </main>
      )}
      {view === "settings" && (
        <main className="dashboard settings">
          <div className="eyebrow">MAKE IT YOURS</div>
          <h1>Your workspace.</h1>
          <section className="settings-card">
            <h2>Appearance</h2>
            <p className="muted">
              Choose a comfortable setting for long study sessions.
            </p>
            <div className="theme-options">
              {["dark", "light", "oled", "sage"].map((t) => (
                <button
                  key={t}
                  className={
                    "theme-option " + (state.theme === t ? "chosen" : "")
                  }
                  onClick={() => setState((s) => ({ ...s, theme: t }))}
                >
                  <span data-swatch={t} />
                  {t === "oled"
                    ? "OLED"
                    : t.charAt(0).toUpperCase() + t.slice(1)}
                  {state.theme === t && <Check size={16} />}
                </button>
              ))}
            </div>
          </section>
          <section className="settings-card">
            <h2>Storage & sync</h2>
            <p>
              {sync
                ? "Your account is connected. Changes save locally and sync to Supabase."
                : "Your progress, notes and bookmarks save automatically in this browser."}
            </p>
            {supabase ? (
              <>
                {sync ? (
                  <button onClick={() => supabase!.auth.signOut()}>
                    Sign out
                  </button>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const { error } = await supabase!.auth.signInWithOtp({
                        email,
                        options: { emailRedirectTo: location.origin },
                      });
                      if (error) setError(error.message);
                      else setSaved("Check your email for a sign-in link.");
                    }}
                  >
                    <label>
                      Email address
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </label>
                    <button className="primary">Send sign-in link</button>
                    <p>{saved}</p>
                    <small>
                      Signing in loads your account study state. Export local
                      data first if you want to keep a separate backup.
                    </small>
                  </form>
                )}
              </>
            ) : (
              <p className="muted">
                Optional account sync can be enabled with the Supabase
                environment variables in the README.
              </p>
            )}
            <button
              onClick={() => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(
                  new Blob([JSON.stringify(stateRef.current, null, 2)], {
                    type: "application/json",
                  }),
                );
                a.download = "open-study-backup.json";
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              Export study data
            </button>
          </section>
        </main>
      )}
    </div>
  );
}
function Attribution({ course }: { course: Course }) {
  return (
    <footer className="attribution">
      Course materials:{" "}
      <a href={course.source} target="_blank" rel="noreferrer">
        MIT OpenCourseWare
      </a>
      {course.license && (
        <>
          {" "}
          ·{" "}
          <a href={course.license} target="_blank" rel="noreferrer">
            Source license
          </a>
        </>
      )}{" "}
      · Independent study player
    </footer>
  );
}
function ResourceViewer({
  course,
  resource: r,
  initialPage = 1,
  pageRequestId = 0,
}: {
  course: Course;
  resource: Resource;
  initialPage?: number;
  pageRequestId?: number;
}) {
  const url = resourceUrl(course, r);
  if (r.mime.includes("pdf"))
    return (
      <PdfViewer
        key={r.id}
        url={url}
        title={r.title}
        initialPage={initialPage}
        pageRequestId={pageRequestId}
      />
    );
  if (r.mime === "video/youtube") {
    const id = new URL(url).searchParams.get("v");
    return (
      <iframe
        className="video-viewer"
        title={r.title}
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id || "")}`}
        allowFullScreen
      />
    );
  }
  if (r.mime.startsWith("video/"))
    return <video className="video-viewer" controls src={url} />;
  if (r.mime.startsWith("image/"))
    return (
      <div className="resource-image">
        <Image
          src={url}
          alt={r.title}
          width={1000}
          height={700}
          unoptimized
          style={{ height: "auto" }}
        />
      </div>
    );
  return (
    <div className="material-notice">
      <FileText size={30} />
      <h3>{r.title}</h3>
      <p>{r.description.replace(/<[^>]*>/g, "")}</p>
      <a href={url} target="_blank" rel="noreferrer">
        Open resource ↗
      </a>
    </div>
  );
}
