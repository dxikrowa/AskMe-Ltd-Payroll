"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  url: string;
  maxPages?: number;
  width?: number;
}

export default function PdfPreview({ url, maxPages, width }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [useNativeViewer, setUseNativeViewer] = useState(false);

  const nativeHeight = useMemo(() => {
    if (maxPages === 1) return 820;
    return 980;
  }, [maxPages]);

  useEffect(() => {
    if (!url) {
      setStatus("idle");
      setErrorMsg("");
      setUseNativeViewer(false);
      if (containerRef.current) containerRef.current.innerHTML = "";
      return;
    }

    let cancelled = false;
    let loadingTask: any = null;
    const canvases: HTMLCanvasElement[] = [];

    async function render() {
      setStatus("loading");
      setErrorMsg("");
      setUseNativeViewer(false);

      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
            import.meta.url
          ).toString();
        }

        const response = await fetch(url, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to load preview PDF (${response.status})`);
        }

        const bytes = new Uint8Array(await response.arrayBuffer());

        loadingTask = pdfjs.getDocument({
          data: bytes,
          cMapPacked: true,
          isEvalSupported: false,
          useWorkerFetch: false,
        });

        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const numPages = Math.min(pdf.numPages, maxPages ?? pdf.numPages);

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          if (cancelled) return;

          const containerWidth = width ?? container.clientWidth ?? 700;
          const naturalViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / naturalViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvases.push(canvas);
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          canvas.style.width = "100%";
          canvas.style.display = "block";
          canvas.style.background = "#fff";
          canvas.style.borderRadius = pageNum === 1 ? "10px 10px 0 0" : "0";
          canvas.style.borderBottom =
            pageNum < numPages ? "1px solid rgba(255,255,255,0.08)" : "none";
          if (pageNum === numPages) {
            canvas.style.borderRadius = numPages === 1 ? "10px" : "0 0 10px 10px";
          }

          container.appendChild(canvas);

          const ctx = canvas.getContext("2d", { alpha: false });
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport }).promise;
        }

        if (!cancelled) setStatus("done");
      } catch (e: any) {
        if (cancelled) return;
        console.error("[PdfPreview] Falling back to native PDF viewer", e);
        setErrorMsg(e?.message ?? "Failed to render PDF with PDF.js");
        setUseNativeViewer(true);
        setStatus("error");
      }
    }

    render();

    return () => {
      cancelled = true;
      try {
        loadingTask?.destroy?.();
      } catch {}
      if (containerRef.current) containerRef.current.innerHTML = "";
      canvases.splice(0, canvases.length);
    };
  }, [url, maxPages, width]);

  return (
    <div style={{ position: "relative" }}>
      {status === "loading" && (
        <div
          style={{
            padding: "40px 0",
            textAlign: "center",
            opacity: 0.55,
            fontSize: 14,
          }}
        >
          Rendering preview…
        </div>
      )}

      {useNativeViewer ? (
        <div>
          <iframe
            src={url}
            title="PDF preview"
            style={{
              width: "100%",
              height: nativeHeight,
              border: "1px solid var(--panel-border, rgba(255,255,255,0.1))",
              borderRadius: 10,
              background: "#fff",
            }}
          />
          {errorMsg ? (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
              
            </div>
          ) : null}
        </div>
      ) : (
        <div
          ref={containerRef}
          style={{
            borderRadius: 10,
            overflow: "hidden",
            background: "#fff",
            display: status === "done" ? "block" : "none",
          }}
        />
      )}
    </div>
  );
}
