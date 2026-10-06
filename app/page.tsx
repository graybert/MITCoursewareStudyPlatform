import { courses } from "../lib/courses";
import StudyApp from "./study-app";
export default function Page() {
  return <StudyApp courses={courses} />;
}
