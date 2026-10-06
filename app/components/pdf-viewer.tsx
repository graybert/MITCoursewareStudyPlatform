"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
/** One page at a time, lazily decoded. Large originals stay streamed on the server. */
export default function PdfViewer({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(600);
  const [pageHeight, setPageHeight] = useState(550);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [text, setText] = useState("");
  const [rendered, setRendered] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(150, entries[0].contentRect.width - 24)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let canceled = false;
    let task: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined;
    setDocument(null);
    setPage(1);
    setError("");
    setBusy(true);
    setRendered(0);
    import("pdfjs-dist")
      .then(async (pdfjs) => {
        if (canceled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        task = pdfjs.getDocument({
          url,
          standardFontDataUrl: "/pdfjs/standard_fonts/",
        });
        const doc = await task.promise;
        if (!canceled) setDocument(doc);
      })
      .catch((e) => {
        if (!canceled) {
          setError(e.message || "Unable to open PDF.");
          setBusy(false);
        }
      });
    return () => {
      canceled = true;
      void task?.destroy();
    };
  }, [url]);
  useEffect(() => {
    if (!document || !canvas.current) return;
    let canceled = false;
    let render: RenderTask | undefined;
    setBusy(true);
    setRendered(0);
    document
      .getPage(page)
      .then(async (pdfPage) => {
        if (canceled || !canvas.current) return;
        const original = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({
          scale: (Math.min(width, 1000) / original.width) * zoom,
        });
        setPageHeight(viewport.height);
        const target = canvas.current;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        target.width = Math.ceil(viewport.width * ratio);
        target.height = Math.ceil(viewport.height * ratio);
        target.style.width = `${viewport.width}px`;
        target.style.height = `${viewport.height}px`;
        render = pdfPage.render({
          canvas: target,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        await render.promise;
        if (canceled) return;
        setRendered(page);
        setBusy(false);
        const content = await pdfPage.getTextContent();
        if (!canceled)
          setText(
            content.items.map((i) => ("str" in i ? i.str : "")).join(" "),
          );
      })
      .catch((e) => {
        if (!canceled && e.name !== "RenderingCancelledException") {
          setError(e.message);
          setBusy(false);
        }
      });
    return () => {
      canceled = true;
      render?.cancel();
    };
  }, [document, page, zoom, width]);
  return (
    <div
      className="pdf-viewer"
      ref={container}
      style={{ height: Math.min(650, pageHeight + 72) }}
    >
      <div className="pdf-toolbar">
        <button
          disabled={!document || page === 1}
          onClick={() => setPage((p) => p - 1)}
          aria-label="Previous PDF page"
        >
          <ChevronLeft size={16} />
        </button>
        <label>
          Page{" "}
          <input
            aria-label="PDF page"
            type="number"
            min={1}
            max={document?.numPages || 1}
            value={page}
            onChange={(e) =>
              setPage(
                Math.max(
                  1,
                  Math.min(
                    document?.numPages || 1,
                    Number(e.target.value) || 1,
                  ),
                ),
              )
            }
          />{" "}
          <span>of {document?.numPages || "…"}</span>
        </label>
        <button
          disabled={!document || page === document.numPages}
          onClick={() => setPage((p) => p + 1)}
          aria-label="Next PDF page"
        >
          <ChevronRight size={16} />
        </button>
        <select
          aria-label="PDF zoom"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        >
          <option value={0.75}>75%</option>
          <option value={1}>Fit width</option>
          <option value={1.25}>125%</option>
          <option value={1.5}>150%</option>
          <option value={2}>200%</option>
        </select>
      </div>
      <div className="pdf-pages">
        {busy && !error && (
          <div className="pdf-loading" role="status">
            <LoaderCircle size={20} />
            Opening page…
          </div>
        )}
        {error ? (
          <div className="material-notice" role="alert">
            <p>{error}</p>
            <a href={url} target="_blank" rel="noreferrer">
              Open original PDF ↗
            </a>
          </div>
        ) : (
          <canvas
            ref={canvas}
            role="img"
            aria-label={`${title}, page ${page}`}
            data-rendered-page={rendered}
          />
        )}
        <div className="sr-only">{text}</div>
      </div>
    </div>
  );
}
