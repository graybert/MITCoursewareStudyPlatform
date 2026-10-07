import type { Course, Textbook } from "./schema";
/** Parse explicit chapter references; page numbers and unrelated labels are ignored. */
export function readingChapters(reading: string): number[] {
  const expression = reading.match(
    /\bchapters?\s+(\d+(?:\s*(?:,|and|&|[-–])\s*\d+)*)/i,
  )?.[1];
  if (!expression) return [];
  const values: number[] = [];
  for (const part of expression.split(/\s*(?:,|and|&)\s*/i)) {
    const range = part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]),
        end = Number(range[2]);
      if (end < start || end - start > 100)
        throw Error("Invalid reading chapter range");
      for (let n = start; n <= end; n++) values.push(n);
    } else values.push(Number(part));
  }
  return [...new Set(values)];
}
export function attachTextbooks(course: Course, textbooks: Textbook[]) {
  for (const book of textbooks) {
    if (course.resources.some((r) => r.id === book.resource.id))
      throw Error(`Duplicate textbook resource ${book.resource.id}`);
    for (const chapter of Object.values(book.chapters))
      if (!Number.isSafeInteger(chapter.pdfPage) || chapter.pdfPage < 1)
        throw Error("Textbook pages must be positive PDF page numbers");
    course.resources.push({
      ...book.resource,
      type: "textbook",
      userSupplied: true,
    });
    for (const item of course.items) {
      const links = readingChapters(item.reading || "").flatMap((number) => {
        const chapter = book.chapters[String(number)];
        return chapter
          ? [
              {
                resourceId: book.resource.id,
                chapter: number,
                pdfPage: chapter.pdfPage,
                printedPage: chapter.printedPage,
                title: chapter.title,
              },
            ]
          : [];
      });
      if (links.length) {
        item.readingLinks = [...(item.readingLinks || []), ...links];
        if (!item.resources.includes(book.resource.id))
          item.resources.push(book.resource.id);
      }
    }
  }
}
