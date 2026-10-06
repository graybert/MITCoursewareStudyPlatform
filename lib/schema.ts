export type ItemType =
  | "orientation"
  | "lecture"
  | "exam"
  | "problem-set"
  | "review"
  | "supplemental"
  | "reading"
  | "solution"
  | "other";
export interface Resource {
  id: string;
  title: string;
  type: string;
  path?: string;
  url?: string;
  mime: string;
  description: string;
  license?: string;
  hidden?: boolean;
}
export interface CourseItem {
  id: string;
  title: string;
  type: ItemType;
  section: string;
  week?: number;
  date?: string;
  lectureNumber?: number;
  lecturer?: string;
  reading?: string;
  html?: string;
  resources: string[];
  previous?: string;
  next?: string;
  hidden?: boolean;
}
export interface Course {
  id: string;
  title: string;
  number: string;
  description: string;
  instructors: string[];
  department: string;
  source: string;
  license: string;
  root: string;
  items: CourseItem[];
  resources: Resource[];
  metadata: Record<string, unknown>;
}
export interface Override {
  title?: string;
  items?: Record<string, Partial<CourseItem> & { after?: string }>;
  resources?: Record<string, Partial<Resource> & { itemId?: string }>;
  order?: string[];
}
