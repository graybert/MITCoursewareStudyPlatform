import { Course } from "./schema";
export interface Note {
  id: string;
  courseId: string;
  itemId?: string;
  resourceId?: string;
  text: string;
  updatedAt: string;
}
export interface Bookmark {
  id: string;
  courseId: string;
  itemId?: string;
  resourceId?: string;
  label: string;
  createdAt: string;
}
export interface Progress {
  completed: boolean;
  openedAt: string;
  completedAt?: string;
}
export interface StudyState {
  progress: Record<string, Progress>;
  positions: Record<string, string>;
  notes: Note[];
  bookmarks: Bookmark[];
  theme: string;
}
export const emptyState = (): StudyState => ({
  progress: {},
  positions: {},
  notes: [],
  bookmarks: [],
  theme: "dark",
});
export const progressKey = (course: string, item: string) =>
  `${course}/${item}`;
export function percentage(course: Course, state: StudyState) {
  return course.items.length
    ? Math.round(
        (course.items.filter(
          (i) => state.progress[progressKey(course.id, i.id)]?.completed,
        ).length /
          course.items.length) *
          100,
      )
    : 0;
}
export function resumeItem(course: Course, state: StudyState) {
  const current = course.items.find((i) => i.id === state.positions[course.id]);
  return current &&
    !state.progress[progressKey(course.id, current.id)]?.completed
    ? current
    : course.items.find(
        (i) => !state.progress[progressKey(course.id, i.id)]?.completed,
      ) || course.items.at(-1)!;
}
export interface StudyStorage {
  load(): Promise<StudyState>;
  save(state: StudyState): Promise<void>;
}
export function parseStudyState(raw: unknown): StudyState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw Error("Invalid saved study document.");
  const state = { ...emptyState(), ...raw } as StudyState;
  if (
    !state.progress ||
    typeof state.progress !== "object" ||
    Array.isArray(state.progress) ||
    !state.positions ||
    typeof state.positions !== "object" ||
    Array.isArray(state.positions) ||
    !Array.isArray(state.notes) ||
    !Array.isArray(state.bookmarks) ||
    !["dark", "light", "oled", "sage"].includes(state.theme)
  )
    throw Error("Invalid saved study document.");
  if (
    state.notes.some(
      (n) =>
        !n ||
        typeof n.id !== "string" ||
        typeof n.courseId !== "string" ||
        typeof n.text !== "string" ||
        typeof n.updatedAt !== "string",
    ) ||
    state.bookmarks.some(
      (b) =>
        !b ||
        typeof b.id !== "string" ||
        typeof b.courseId !== "string" ||
        typeof b.label !== "string",
    )
  )
    throw Error("Invalid saved study entries.");
  return state;
}
export function createLocalStorageAdapter(
  key = "ocw-study-v1",
  storage?: Pick<Storage, "getItem" | "setItem">,
): StudyStorage {
  return {
    async load() {
      const raw = (storage || globalThis.localStorage).getItem(key);
      if (!raw) return emptyState();
      try {
        return parseStudyState(JSON.parse(raw));
      } catch {
        throw Error(
          "Saved study data could not be read. Export or repair browser storage before saving.",
        );
      }
    },
    async save(state) {
      (storage || globalThis.localStorage).setItem(key, JSON.stringify(state));
    },
  };
}
export const localStorageAdapter = createLocalStorageAdapter();
