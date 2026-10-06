import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const root = path.dirname(require.resolve("pdfjs-dist/package.json"));
fs.mkdirSync("public/pdfjs", { recursive: true });
fs.copyFileSync(
  path.join(root, "build/pdf.worker.min.mjs"),
  "public/pdfjs/pdf.worker.min.mjs",
);
fs.cpSync(path.join(root, "standard_fonts"), "public/pdfjs/standard_fonts", {
  recursive: true,
});
fs.copyFileSync(path.join(root, "LICENSE"), "public/pdfjs/LICENSE");
