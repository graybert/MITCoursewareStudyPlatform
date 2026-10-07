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

User supplied `Neuroscience - Bear.pdf` at repository root and requested direct chapter/page integration. Third edition verified from actual front matter; 898 pages. All 25 chapter bookmarks extracted and recorded in `9.01-fall-2007/course.override.json` under `textbooks`. Example Chapter 1: PDF 43 / printed 3; Chapter 9: PDF 317 / printed 277; Chapters 15/16: PDF 521/549. Typed links now attach to all 22 reading-bearing lectures. Private book ignored via root PDF ignore rule, not copied or uploaded; optional missing book warns and falls back. `lib/readings.ts` handles references/ranges; resource `localRoot` supports explicitly registered repository-relative storage with canonical-path checks. Player reading buttons, PDF.js initialPage and hash page links preserve chapter targets on refresh. Final tests/build/commit still pending; read current PROJECT_STATUS.md and git status before resuming.
