# Saved working context

## User intent and authorization

Build an autonomous, polished, reusable MIT OCW learning player from real downloaded folders. Install packages, edit/refactor, test, commit and push each significant milestone without asking questions unless useful progress is impossible. Preserve original academic content. No AI features/APIs. Keep progress documentation updated.

## Current stage — completed local product, 2026-10-07

Read `PROJECT_STATUS.md` for final verification and the full milestone journal, and `README.md` for commands/architecture/limitations. Branch `main`, remote https://github.com/graybert/MITCoursewareStudyPlatform.git. All milestones pushed.

Initial source is `9.01-fall-2007/`: modern OCW `data.json` metadata, original section HTML and static resources. Downloaded assets stay in place and are excluded from GitHub. Only `course.override.json` is tracked in that folder. This override associates two unlinked Chapter 6 presentations with synaptic transmission chemistry. Every educational PDF attaches to the sequence; two images remain in the library. Import: 29 items, 22 lectures, 3 problem sets, 3 exams, 50 resources/48 PDFs. No videos, textbook chapters or exam papers are present.

## Modules

- `lib/importer.ts`, `scripts/import.ts`: deterministic ingestion, rowspans, calendar/readings/resources joins, overrides, inventory and reports.
- `generated/courses.json`, `generated/reports/`: shared content, rebuilt with `npm run import:courses`.
- `app/study-app.tsx`: dashboard, course map, responsive player, search, notes/bookmarks/themes.
- `app/components/pdf-viewer.tsx`: lazy PDF.js, page/zoom controls, original text accessibility. `npm ci` postinstall prepares ignored worker/font assets.
- `lib/study.ts`, `lib/use-study-workspace.ts`, `lib/supabase.ts`: local/account-isolated caches, immediate local saves, serialized/debounced optional authenticated cloud saves.
- `lib/resource-provider.ts`, `lib/resolver.ts`, resource API: provider boundary, canonical-path allowlist, streaming/range downloads. HTML/SVG responses sandboxed.
- `supabase/migrations/001_study_state.sql`: private user JSON document + profiles with RLS. Credentials absent; local mode works immediately.

## Verification

Node 22 installed; `.nvmrc` uses 22, minimum 22.12. Clean `npm ci` works. Formatter, lint (zero warnings), typecheck, 9 unit tests, production build and 4 production desktop/mobile smoke tests pass. Browser tests verify actual PDF canvas rendering/page 2/zoom, byte ranges, complete/next, notes/bookmark persistence, themes, search and viewport width. Major screenshots inspected. Runtime audit clean. An upstream development-only ESLint glob/braces advisory has no compatible patched release and is documented.

## Commands

```sh
nvm use
npm run dev
npm run import:courses
npm run inspect:course -- 9.01-fall-2007
npm run test
npm run build
PLAYWRIGHT_PRODUCTION=1 npm run test:e2e
```

Local address: http://localhost:3000. A fresh GitHub clone must add an actual course download before importing; no course binaries are redistributed.

## Remaining optional work

Live Supabase verification needs credentials; instructions and `.env.example` exist. Cloud is last-write-wins on a whole private document, with sign-in/reload loading rather than realtime conflict merging. Future: normalized per-feature tables, persistent PDF/video positions, resource/page bookmarks, additional real-course fixtures, legacy HTML-only importer and opted-in offline caching. PWA manifest/icon exist without a service worker. No further user input is needed for local use.

If continuing, inspect git status and current journal before edits; preserve the original materials, update status and commit/push significant changes.

## Latest follow-up — local textbook integration

User supplied `Neuroscience - Bear.pdf` at repository root and requested direct chapter/page integration. Third edition verified from actual front matter; 898 pages. All 25 chapter bookmarks extracted and recorded in `9.01-fall-2007/course.override.json` under `textbooks`. Example Chapter 1: PDF 43 / printed 3; Chapter 9: PDF 317 / printed 277; Chapters 15/16: PDF 521/549. Typed links now attach to all 22 reading-bearing lectures. Private book ignored via root PDF ignore rule, not copied or uploaded; optional missing book warns and falls back. `lib/readings.ts` handles references/ranges; resource `localRoot` supports explicitly registered repository-relative storage with canonical-path checks. Player reading buttons, PDF.js initialPage and hash page links preserve chapter targets on refresh. Completed and pushed: 14 unit tests, 6 production desktop/mobile browser tests, formatter, lint, typecheck and build pass. Textbook page targets render correctly and survive refresh. Cancellation-safe `lib/file-stream.ts` handles aborted large PDF requests. Repeated chapter-button clicks reset to the chapter start without reloading the book. Read current PROJECT_STATUS.md and git status before future work.

## Latest follow-up — selectable textbook/PDF text (2026-10-08)

User requested copying and highlighting text directly in the embedded textbook. `app/components/pdf-viewer.tsx` now builds a PDF.js TextLayer over the unchanged page canvas using the same viewport, with matching font/rotation/scale CSS in `app/globals.css`. Text is transparent until normal browser selection; accessible text replaces the old hidden duplicate. Drag to select and Cmd/Ctrl+C works; clipboard paste into study notes verified on both Chromium desktop/mobile projects. Layer is replaced/cancelled on page or zoom changes. PDF destruction promise catches expected request-abort rejection. Tests cover original-book page 549 selection/copy/paste, zoom and page 550 text replacement. 14 unit tests and 8 production browser tests pass, production build and static checks pass, desktop/mobile screenshots inspected. No OCR, persistent highlights, or book upload implemented. README documents controls and source-text limitation. Continue to keep private book ignored.
