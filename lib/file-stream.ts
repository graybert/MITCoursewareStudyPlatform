import fs from "node:fs";
/** Cancellation-aware bridge: PDF readers routinely abort initial/full requests. */
export function fileStream(
  file: string,
  start: number,
  end: number,
): ReadableStream<Uint8Array> {
  const source = fs.createReadStream(file, { start, end });
  const iterator = source[Symbol.asyncIterator]();
  let canceled = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await iterator.next();
        if (canceled) return;
        if (next.done) controller.close();
        else controller.enqueue(next.value);
      } catch (error) {
        if (!canceled) controller.error(error);
      }
    },
    cancel() {
      canceled = true;
      source.destroy();
    },
  });
}
