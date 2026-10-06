import type { Course, Resource } from "./schema";
/** URL providers keep rendering independent from physical course storage. */
export interface ResourceProvider {
  url(course: Course, resource: Resource): string;
}
export const localProvider: ResourceProvider = {
  url: (c, r) =>
    r.url ||
    `/api/resources/${encodeURIComponent(c.id)}/${encodeURIComponent(r.id)}`,
};
export function staticProvider(baseUrl: string): ResourceProvider {
  return {
    url: (c, r) =>
      r.url ||
      `${baseUrl.replace(/\/$/, "")}/${c.root.split("/").map(encodeURIComponent).join("/")}/${(r.path || "").split("/").map(encodeURIComponent).join("/")}`,
  };
}
export const resourceUrl = (course: Course, resource: Resource) =>
  localProvider.url(course, resource);
/** Deterministic context boundary for future extensions; no AI implementation. */
export function studyContext(
  course: Course,
  itemId: string,
  resourceId?: string,
) {
  const item = course.items.find((i) => i.id === itemId);
  return {
    course: { id: course.id, title: course.title, source: course.source },
    item,
    resource: course.resources.find((r) => r.id === resourceId),
    previous: course.items.find((i) => i.id === item?.previous),
    next: course.items.find((i) => i.id === item?.next),
  };
}
