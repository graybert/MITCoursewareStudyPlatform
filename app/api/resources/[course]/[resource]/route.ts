import { NextRequest } from "next/server";
import fs from "node:fs";
import { Readable } from "node:stream";
import { courses } from "../../../../../lib/courses";
import { resolveResource } from "../../../../../lib/resolver";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ course: string; resource: string }> },
) {
  const p = await params;
  const c = courses.find((c) => c.id === p.course);
  const r = c?.resources.find((r) => r.id === p.resource && !r.hidden);
  if (!c || !r?.path) return new Response("Not found", { status: 404 });
  try {
    const file = resolveResource(process.cwd(), c.root, r.path);
    const size = fs.statSync(file).size;
    const headers: Record<string, string> = {
      "Content-Type": r.mime,
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `${request.nextUrl.searchParams.has("download") ? "attachment" : "inline"}; filename="${file
        .split("/")
        .at(-1)
        ?.replace(/[^a-zA-Z0-9_.-]/g, "_")}"`,
    };
    const range = request.headers.get("range");
    let start = 0,
      end = size - 1,
      status = 200;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!m) return new Response(null, { status: 416 });
      start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
      end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      if (start > end || start >= size)
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      status = 206;
      headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    }
    headers["Content-Length"] = String(end - start + 1);
    return new Response(
      Readable.toWeb(
        fs.createReadStream(file, { start, end }),
      ) as ReadableStream,
      { status, headers },
    );
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
