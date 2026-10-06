# Saved working context

User authorizes autonomous implementation, package installation, tests, commits and GitHub pushes at each significant milestone. Do not ask questions unless useful progress is impossible. No AI features. Source content must remain original.

Working repository: MITCoursewareStudyPlatform. Initial source: 9.01-fall-2007, modern OCW download with data.json metadata, section content HTML, resources metadata and static_resources assets. Some uncommitted scaffolding was present at task start and is being completed. Remote: https://github.com/graybert/MITCoursewareStudyPlatform.git, main initially unborn.

Plan and live progress: PROJECT_STATUS.md. Generated shared manifests: generated/courses.json. Import inventory/report: generated/reports/*.json. Preserve source assets locally and exclude downloaded course bundles from GitHub to avoid automatically redistributing third-party course content. App must run locally without Supabase.

Resume by reading PROJECT_STATUS.md, inspecting git status, running appropriate checks, and continuing outstanding work. Update this file and project journal at milestones and commit/push.

Current implementation: player/UI and local study data implemented; optional Supabase RLS-backed JSON adapter exists but no credentials available for remote verification. Unit tests pass, build passes, browser checks underway. Source inventory now accounts for 48 PDFs / 50 total resources / 29 items; four unassociated resources remain in library. Use Node 22 (`nvm use`), matching `.nvmrc`. Runtime audit clean; upstream ESLint glob tooling advisory remains documented.
