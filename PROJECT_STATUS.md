# Project status

## Current stage — ready for local study (2026-10-07)

The complete local MIT OCW study flow is implemented and verified. Open MIT 9.01, Start/Resume, study original PDFs/readings in syllabus order, complete items, and keep persistent notes/bookmarks. All significant milestones are committed and pushed to `origin/main`. Downloaded assets remain local; only the small override is tracked.

Current import: 29 items, 22 lecture topics, 3 problem sets, 3 exams; 50 resources including all 48 PDFs. All educational PDFs have sequence associations. Only two course images remain unassociated and available in the library. No unresolved learning files.

Final verification: clean Node 22 `npm ci`; formatting check; lint with no warnings; strict typecheck; 9/9 unit tests; production build; 4/4 desktop/mobile browser tests against the production server; actual PDF page rendering, page navigation, zoom, notes/bookmarks/progress/theme persistence and byte ranges. Runtime audit: zero vulnerabilities. Major screenshots, including actual lecture PDF content on page 2, inspected.

No input is required to use the local application. Optional Supabase accounts require the environment variables and SQL migration documented in README; live cloud verification was not possible without credentials. Remote state uses last-write-wins and loads on sign-in/reload. Offline content caching, exact PDF/video-position persistence and legacy HTML-only imports are future improvements. Development-only ESLint glob/braces advisory remains upstream; runtime dependencies are clean.

Run `nvm use`, then `npm run dev`; open http://localhost:3000. Production: `npm run build` then `npm start`. See README for full setup and course imports.

## Recommended next steps

1. Study the real initial course and refine personal course overrides if desired.
2. Add another modern OCW download and inspect its report; date and repeated-topic synthetic fixtures already pass.
3. Configure Supabase and verify live email sign-in and two-device sync before public account rollout.
4. Extend normalized cloud tables/conflict resolution and optional PDF/video-position bookmarks when needed.

## Implementation journal

## Plan and source inspection

Build a deterministic metadata/HTML importer, normalized manifests and full inventory reports; then a Next.js player with local persistence, optional Supabase synchronization, themes, notes, bookmarks and search. Verify parser/security/state behavior, production build and browser flows.

The repository initially contains only `9.01-fall-2007` (56 MB). Inventory: 68 HTML, 79 JSON, 48 PDF, images and bundled website assets. Course metadata lives in root data.json; section and resource data.json preserve original HTML and licenses. The syllabus calendar is authoritative: 22 lecture topics, three exams and problem sets due weeks 3, 8, 14. Readings carry chapter references. Lecture notes cover only selected topics; no videos exist. Recitation HTML has repeated/mistaken links; unlinked metadata resources must remain accessible. No textbook is included.

## Decisions

- Preserve downloaded assets in place; serve only manifest-registered resources through a checked resolver.
- Use original calendar ordering and expand rowspans. No invented content or AI.
- Keep missing-material notices and distinguish scheduled exams from available review sheets.
- Shared generated manifests are separate from private study state.

## Initial stage (historical)

Initial scaffolding and importer; subsequent milestones below record verification and completion.

## Milestone 1 — source mapping and initial importer

Inspected actual root/section/resource metadata and all file inventory. Existing scaffolding imports 29 sequence items and 50 resources, retaining 13 unassociated resources in the library. Original schedule includes a combined anatomy quiz/vision topic. Source folder stays local and is excluded from GitHub; generated metadata includes attribution. Next: improve resource coverage, add player/storage, verify tests. This milestone has not yet passed full application checks.

## Milestone 2 — working study workspace

Implemented dashboard, course map with search and complete resource library, responsive learning player with collapsible navigation/notes, native embedded PDF viewer, video/image handlers, original syllabus presentation and attribution. Progress, notes with Markdown preview, item/resource bookmarks and four themes use browser persistence. Added optional Supabase email authentication, private study-state adapter and RLS migration. Supabase uses a versioned JSON study document per user for this first pass rather than normalized per-feature tables; shared course manifests remain separate. Fixed problem-set auxiliary links and metadata-based week associations to preserve unlinked recitations. Typecheck passes; lint has minor warnings to clean up. Full browser/build checks are next.

## Milestone 3 — import coverage and verification infrastructure

Six unit tests pass: rowspan handling, override attachments/order/hiding, progress/resume, traversal/symlink protection, deterministic real-course import and a separate synthetic course. All 48 PDFs resolve on disk; no unresolved course assets. Four resources remain without a reliable sequence association and are available in the library. Calendar header detection and nested section discovery improved. Lecture notes display ahead of recitations. Production build passed. Installed Playwright Chromium and added desktop/mobile smoke flows; running those now. Updated Next.js to 15.5.27 and patched runtime dependencies; `npm audit --omit=dev` reports zero vulnerabilities. Node 22 is installed and `.nvmrc` documents the sanitizer's minimum runtime. Development ESLint dependency tree still has an upstream braces advisory with no compatible patched release; no runtime dependency is affected.

## Milestone 4 — browser verification and visual polish

Desktop and mobile smoke tests all pass (4/4), including note/bookmark persistence after reload, complete/next, theme persistence, search, PDF byte ranges and no horizontal overflow. Browser tests exposed a real refresh race in debounced local theme saving; local writes are now immediate, cloud writes remain debounced. Inspected dashboard/course/player/mobile screenshots. Improved single-course dashboard composition and collapsed navigation by default on mobile so the study content opens immediately. Added resource-provider/context module, completion undo and a comprehensive README with exact setup, override format, backend migration and candid limitations. Optional cloud remains unverified against a live Supabase project. Final expanded checks and documentation cleanup follow.

## Milestone 5 — declarative source correction

Verified metadata and the actual unlinked Chapter 6 PDF content/filenames. Added a small tracked `9.01-fall-2007/course.override.json` attaching those two presentations to synaptic transmission chemistry, preserving the original PDFs. Parser code contains no course-specific exception. Only the two course images remain unassociated; all educational PDFs now attach to appropriate sequence items. Ignore rules permit override files while retaining local-only course content. Unit tests still pass. Desktop/mobile browser checks also pass following mobile/default-navigation changes.

## Milestone 6 — storage isolation and reliability

Extracted persistence/auth lifecycle into `use-study-workspace.ts`. Guest and account local caches are separate; sign-out restores guest state, identity changes cancel pending saves, and cloud writes serialize to avoid request-order races. Added saved-data shape validation and scoped-cache/provider tests (8 unit tests pass). Invalid persisted data is surfaced rather than overwritten. Local HTML/SVG resource responses are sandboxed, and duplicate hashing now uses bounded buffers suitable for large files. Typecheck and lint pass without warnings. Remote Supabase still requires credentials for live verification.

## Milestone 7 — reusable import edge cases

Repeated calendar topics now receive deterministic distinct IDs, date/session metadata is retained, and MIME types fall back to file extensions for local videos and other assets. Calendar links and headings improve non-week schedules; additional learning files outside static_resources appear as unresolved rather than disappearing. Added explicit website-asset classification in reports. Nine unit tests pass, including a date-based repeated-topic synthetic course. Inspect command verified. Browser flows remain passing after the storage refactor. Final production rebuild and production-server smoke checks remain.

## Milestone 8 — verified PDF rendering

Visual QA found the native PDF iframe was blank in headless Chromium despite successful HTTP serving. Replaced it with lazy-loaded PDF.js canvas rendering and a same-origin worker, consistent page controls/zoom, original extracted text for screen readers, and external/download options. Browser tests now wait for actual render completion and exercise page 2 and zoom on desktop/mobile; all four tests pass. Inspected screenshots showing the original MIT PDF cover. Worker/font/license files are generated by npm postinstall and excluded from source control. Viewer height follows the current page to avoid blank space on mobile. Lint/typecheck pass; runtime audit remains clean. Final fresh-install/build/production checks are next.

## Milestone 9 — clean installation and content separation audit

Fresh `npm ci` successfully generates PDF.js worker/fonts through postinstall; production build passes with the PDF viewer. Removed the remaining course-specific textbook string from the player: bibliographic text is now extracted from the original course reading/syllabus metadata and stored in the manifest. Added production-server mode for browser smoke tests. No course title, textbook or course number is hardcoded into presentation components. Final production browser run remains before handoff.

## Final handoff

Production browser tests pass (4/4). Final generated manifest includes the original reading citation. Source remains unchanged except the declarative override. No AI features or APIs are present. Repository is runnable, documented and pushed; remaining work is optional enhancement/live backend setup, not a blocker to local study.
