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
