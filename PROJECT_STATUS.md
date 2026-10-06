# Project status

## Plan and source inspection

Build a deterministic metadata/HTML importer, normalized manifests and full inventory reports; then a Next.js player with local persistence, optional Supabase synchronization, themes, notes, bookmarks and search. Verify parser/security/state behavior, production build and browser flows.

The repository initially contains only `9.01-fall-2007` (56 MB). Inventory: 68 HTML, 79 JSON, 48 PDF, images and bundled website assets. Course metadata lives in root data.json; section and resource data.json preserve original HTML and licenses. The syllabus calendar is authoritative: 22 lecture topics, three exams and problem sets due weeks 3, 8, 14. Readings carry chapter references. Lecture notes cover only selected topics; no videos exist. Recitation HTML has repeated/mistaken links; unlinked metadata resources must remain accessible. No textbook is included.

## Decisions

- Preserve downloaded assets in place; serve only manifest-registered resources through a checked resolver.
- Use original calendar ordering and expand rowspans. No invented content or AI.
- Keep missing-material notices and distinguish scheduled exams from available review sheets.
- Shared generated manifests are separate from private study state.

## Work in progress

Initial scaffolding and importer. No verification completed yet.

## Milestone 1 — source mapping and initial importer

Inspected actual root/section/resource metadata and all file inventory. Existing scaffolding imports 29 sequence items and 50 resources, retaining 13 unassociated resources in the library. Original schedule includes a combined anatomy quiz/vision topic. Source folder stays local and is excluded from GitHub; generated metadata includes attribution. Next: improve resource coverage, add player/storage, verify tests. This milestone has not yet passed full application checks.

## Milestone 2 — working study workspace

Implemented dashboard, course map with search and complete resource library, responsive learning player with collapsible navigation/notes, native embedded PDF viewer, video/image handlers, original syllabus presentation and attribution. Progress, notes with Markdown preview, item/resource bookmarks and four themes use browser persistence. Added optional Supabase email authentication, private study-state adapter and RLS migration. Supabase uses a versioned JSON study document per user for this first pass rather than normalized per-feature tables; shared course manifests remain separate. Fixed problem-set auxiliary links and metadata-based week associations to preserve unlinked recitations. Typecheck passes; lint has minor warnings to clean up. Full browser/build checks are next.

## Milestone 3 — import coverage and verification infrastructure

Six unit tests pass: rowspan handling, override attachments/order/hiding, progress/resume, traversal/symlink protection, deterministic real-course import and a separate synthetic course. All 48 PDFs resolve on disk; no unresolved course assets. Four resources remain without a reliable sequence association and are available in the library. Calendar header detection and nested section discovery improved. Lecture notes display ahead of recitations. Production build passed. Installed Playwright Chromium and added desktop/mobile smoke flows; running those now. Updated Next.js to 15.5.27 and patched runtime dependencies; `npm audit --omit=dev` reports zero vulnerabilities. Node 22 is installed and `.nvmrc` documents the sanitizer's minimum runtime. Development ESLint dependency tree still has an upstream braces advisory with no compatible patched release; no runtime dependency is affected.

## Milestone 4 — browser verification and visual polish

Desktop and mobile smoke tests all pass (4/4), including note/bookmark persistence after reload, complete/next, theme persistence, search, PDF byte ranges and no horizontal overflow. Browser tests exposed a real refresh race in debounced local theme saving; local writes are now immediate, cloud writes remain debounced. Inspected dashboard/course/player/mobile screenshots. Improved single-course dashboard composition and collapsed navigation by default on mobile so the study content opens immediately. Added resource-provider/context module, completion undo and a comprehensive README with exact setup, override format, backend migration and candid limitations. Optional cloud remains unverified against a live Supabase project. Final expanded checks and documentation cleanup follow.
