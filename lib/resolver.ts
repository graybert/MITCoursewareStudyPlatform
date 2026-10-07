import fs from "node:fs";
import path from "node:path";
export function resolveResource(base: string, root: string, relative: string) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes(".."))
    throw Error("Invalid resource path");
  const safeBase = fs.realpathSync(base);
  const courseRoot = fs.realpathSync(path.resolve(base, root));
  if (courseRoot !== safeBase && !courseRoot.startsWith(safeBase + path.sep))
    throw Error("Course outside repository");
  const resolved = fs.realpathSync(path.resolve(courseRoot, relative));
  if (!resolved.startsWith(courseRoot + path.sep))
    throw Error("Resource outside course");
  return resolved;
}
