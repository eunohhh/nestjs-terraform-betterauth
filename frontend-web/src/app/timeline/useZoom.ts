import { select } from 'd3-selection';
import { type ZoomTransform, zoom, zoomIdentity } from 'd3-zoom';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useZoomPan(svgRef: React.RefObject<SVGSVGElement | null>) {
  const zoomRef = useRef<ReturnType<typeof zoom<SVGSVGElement, unknown>> | null>(null);
  const zoomSelectionRef = useRef<any>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);

  const [transform, setTransform] = useState<ZoomTransform>(() => zoomIdentity);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    let raf = 0;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 6])
      .on('zoom', (event) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => setTransform(event.transform));
      });

    const s = select(el);
    // disable default dblclick zoom (we'll implement our own)
    s.on('dblclick.zoom', null);
    s.call(z as any);

    zoomRef.current = z;
    zoomSelectionRef.current = s;

    // Prevent the page from scrolling on touch while interacting with the graph.
    s.style('touch-action', 'none');

    return () => {
      cancelAnimationFrame(raf);
      s.on('.zoom', null);
      zoomRef.current = null;
      zoomSelectionRef.current = null;
    };
  }, [svgRef]);

  const applyTransform = useCallback((t: ZoomTransform) => {
    const z = zoomRef.current;
    const s = zoomSelectionRef.current;
    if (!z || !s) return;
    s.call((z as any).transform, t);
  }, []);

  const resetView = useCallback(() => {
    applyTransform(zoomIdentity);
  }, [applyTransform]);

  const zoomInAt = useCallback(
    (clientX: number, clientY: number, factor = 1.6) => {
      const el = svgRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;

      const nextK = Math.min(6, Math.max(0.2, transform.k * factor));
      const t = zoomIdentity.translate(transform.x, transform.y).scale(transform.k);

      // compute new transform so that (cx, cy) stays fixed
      const p0x = (cx - t.x) / t.k;
      const p0y = (cy - t.y) / t.k;
      const nextX = cx - p0x * nextK;
      const nextY = cy - p0y * nextK;

      applyTransform(zoomIdentity.translate(nextX, nextY).scale(nextK));
    },
    [applyTransform, svgRef, transform.k, transform.x, transform.y],
  );

  const onSvgDoubleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      e.preventDefault();
      zoomInAt(e.clientX, e.clientY, 1.6);
    },
    [zoomInAt],
  );

  const onSvgPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType !== 'touch') return;

      const now = Date.now();
      const prev = lastTapRef.current;
      lastTapRef.current = { t: now, x: e.clientX, y: e.clientY };

      if (!prev) return;

      const dt = now - prev.t;
      const dx = Math.abs(e.clientX - prev.x);
      const dy = Math.abs(e.clientY - prev.y);

      if (dt < 320 && dx < 24 && dy < 24) {
        e.preventDefault();
        zoomInAt(e.clientX, e.clientY, 1.6);
      }
    },
    [zoomInAt],
  );

  return {
    transform,
    applyTransform,
    resetView,
    zoomInAt,
    onSvgDoubleClick,
    onSvgPointerDown,
  };
}
