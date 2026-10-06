# Open Study

A quiet, reusable learning player for downloaded MIT OpenCourseWare. Start a course, follow its original calendar, study attached PDFs and readings, and keep your progress, Markdown notes and bookmarks together. Charcoal, light, OLED and sage themes are included. No AI, generated academic content, or paid API is involved.

## Quick Start

Requires Node **22.12+** and npm. The course already present in this workspace stays in `9.01-fall-2007/`.

```sh
nvm install  # if you use nvm; reads .nvmrc
nvm use
npm ci
npm run import:courses
npm run dev
```

Open http://localhost:3000, choose **Start course** or **Resume course**. Everything works without environment variables or a login. For production locally:

```sh
npm run build
npm start
```

The GitHub repository excludes downloaded course bundles. A fresh clone must add an OCW download before importing; committed manifests document the original test course but do not include its PDF assets. A build regenerates manifests from the folders actually present.

## Adding another MIT OCW course

1. Download and unzip the full course from MIT OCW.
2. Place the extracted folder containing `data.json`, `pages/`, `resources/` and `static_resources/` under `courses/<folder>/`. Direct course folders at repository root are also supported for the initial download.
3. Run `npm run import:courses`.
4. Inspect `generated/reports/<course-id>.json` or run `npm run inspect:course -- <course-id>`.
5. Correct any uncertain grouping with `course.override.json` in the source folder, reimport, and restart the server.

Each course has its own sequence and resources; private study state uses course and item IDs. Keep IDs stable when moving folders. The importer accepts modern OCW metadata downloads. Older HTML-only exports require a separate ingestion adapter; they are not silently presented as fully imported courses.

## Course importer

`lib/importer.ts` walks every source file once per import, reads OCW metadata and original HTML content, and builds strongly typed manifests. It expands table rowspans, respects syllabus/calendar order, joins readings/notes/recitations by normalized topic, and places problem sets after the final topic in their due week. Direct schedule resource links and metadata title/week signals supplement section links. Number-aware filename sorting gives a deterministic fallback where no schedule exists. Section pages remain available as source HTML when a calendar cannot be inferred. Missing metadata associations remain in the complete library, with warnings.

The report contains original metadata, detected lectures/readings/problem sets/exams, unassociated resources, unresolved asset files, SHA-256 duplicates, section links, heuristics and the full file inventory. Bundled website CSS/JS/fonts are inventoried separately from learning resources and are not executed by the player. Inspect warnings before assuming a new course imports perfectly. Repeated topic IDs and invalid overrides fail explicitly.

The initial course imports **29 sequence items**, **22 lecture topics**, **3 problem sets**, **3 scheduled exams**, and **50 resources (48 PDFs + 2 images)**. MIT supplies selected notes and exam reviews, not videos, textbook chapters or exam papers. The combined anatomy quiz/vision calendar row remains combined. Source link errors are preserved; metadata provides missing recitation resources by week, and uncertain files stay in the library.

## Course override files

Create `course.override.json` next to the course's root `data.json`. Obtain exact IDs from the generated manifest/report. This example is illustrative; replace IDs with the course's own IDs:

```json
{
  "title": "My corrected course title",
  "items": {
    "exam-1": { "after": "lecture-13", "type": "exam" },
    "obsolete-item": { "hidden": true }
  },
  "resources": {
    "resource-uuid": { "itemId": "lecture-4", "type": "lecture-notes" },
    "old-resource-uuid": { "hidden": true }
  },
  "order": ["orientation", "lecture-1", "lecture-2"]
}
```

`after` moves an item immediately after another item. Resource `itemId` moves that resource out of all prior groups and into the target item. `items[id].resources` can specify an exact list for a group; share attachments by listing IDs in multiple items. `order` places listed items first in that order and preserves the order of all unlisted items. Hidden items leave the sequence; hidden resources leave both attachments and the library. Previous/next pointers rebuild automatically. Override IDs must exist. Do not rename IDs to change titles; change the `title` field instead. Reimport after editing.

Source-specific exceptions belong in overrides, never in UI components or parser conditionals. An override file is local with its course; save a separate copy if you need to version it privately.

## Storage

Shared manifests live in `generated/`; progress and personal study data do not. `lib/study.ts` defines the `StudyStorage` contract, private state, progress calculation and resume policy. Local mode uses `localStorage` under `ocw-study-v1`; it survives browser refresh/restarts and supports JSON export from Settings. Clearing browser storage removes local data. Use one browser profile per learner in local mode.

Progress tracks item completion, current position and last-opened/completed timestamps. Navigation is always unlocked. Resume returns the current unfinished item, or the first remaining item when the current one is complete. Notes may be attached to a course, item and active resource; bookmarks link back to an item/resource. The Saved page gathers both.

Optional Supabase mode uses Auth plus a private `study_state` row per user. Its versioned JSON document is the first-pass storage shape: individual notes/progress can later migrate to normalized tables without changing the player data contract. Writes are debounced. Account state loads on sign-in, and changes sync to the same account from another device on sign-in/reload. Simultaneous edits on multiple devices use last-write-wins; realtime conflict merging is future work. Export local work before first signing in because account state becomes the active workspace. Sign out when finished on a shared computer; local browser data is still present in this first version.

## Supabase setup

No remote database is required for local use. To enable accounts:

1. Create a Supabase project.
2. Run `supabase/migrations/001_study_state.sql` in its SQL editor (or use the Supabase CLI migration workflow).
3. Enable email authentication under Authentication → Providers.
4. Set the Auth Site URL and redirect allowlist to your app URL, including `http://localhost:3000` for development.
5. Copy `.env.example` to `.env.local` and set:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

6. Restart/rebuild Next.js, open Settings, and request an email sign-in link.

Use the project's public anon key, never a service-role key. RLS limits every row to its authenticated owner. Credentials are intentionally absent from Git. Auth and remote synchronization have not been verified against a live project in this workspace; local persistence is covered by browser tests. Reference: [Supabase email sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithotp).

## Architecture

- `lib/schema.ts`: shared course/item/resource/override types.
- `lib/importer.ts`, `scripts/import.ts`: deterministic offline ingestion and reports.
- `generated/courses.json`: prebuilt shared course catalog; not parsed on every render.
- `lib/resource-provider.ts`: URL-provider contract, local/static URL providers and a current study-context boundary for future extensions.
- `lib/resolver.ts`, `app/api/resources/...`: manifest-registered local assets; normalized canonical paths reject traversal and symlink escapes. Files stream on demand with byte ranges and inline/download headers.
- `lib/study.ts`, `lib/supabase.ts`: local storage and optional authenticated cloud adapter.
- `app/study-app.tsx`: dashboard, course map, player and personal workspace.
- `app/globals.css`: responsive layouts and theme tokens. Plain CSS avoids a second component styling framework for this compact first version.
- `supabase/migrations/`: private state schema and RLS.
- `tests/`: importer, security, state and desktop/mobile browser coverage.

The engine is separate from the downloaded materials. Preserve source attribution and original resource license metadata. Deployment currently needs a Node server with access to the course directories. To serve assets from object/static hosting, select a provider for that base URL rather than copying large PDFs/videos into the application bundle. Check each resource's license and rights before publishing any content; this project does not upload the download automatically.

## Testing

```sh
npm run format
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests launch the development server on port 3000 if necessary. They exercise desktop/mobile dashboard → course map → player → complete → next → note/bookmark → refresh, themes, search, PDF response/ranges and viewport overflow. Screenshots and failure traces appear in ignored `test-results/`. Unit tests skip the real-course assertions when that local source folder is absent, while synthetic-course/security tests still run.

## Future improvements

- Normalized Supabase notes/bookmarks/progress tables, account-isolated local caches and conflict-aware realtime sync.
- PDF.js page controls, persistent PDF page/video timestamps and split video/notes view.
- HTML-only legacy OCW adapter and more real-course fixtures for varied calendar columns and nested lecture pages.
- A fully offline PWA shell with explicit opt-in per-resource download quotas. The manifest/icon make the app PWA-ready; no service worker caches large course assets.
- A **future** reactive AI tutor may consume `studyContext()` and explicitly selected resources/notes. No AI API, AI UI, summaries, quizzes, flashcards or embeddings are implemented now.

## Known limitations

- Downloaded course omissions cannot be supplied by the player. The first introduction lecture has a reading reference but no supplied lecture PDF/video; recitation material starts later.
- Native PDF embedding depends on the browser; mobile browsers may use their own inline PDF behavior. Open externally is always available. Page and zoom controls belong to the native viewer.
- Import inference is deliberately conservative. Unknown calendar layouts may need declarative overrides; broader OCW coverage needs additional real course fixtures.
- Search covers titles, reading labels and resource types, not full PDF text.
- Notes and bookmarks can reference resources but not exact PDF pages/video timestamps yet.
- Supabase uses a whole study document and last-write-wins. Remote behavior requires configured credentials; no live backend was available for verification.
- No service worker/offline content cache is included.
- Runtime `npm audit --omit=dev` is clean. An upstream advisory in ESLint's development-only glob/braces dependency tree currently lacks a compatible fix.
