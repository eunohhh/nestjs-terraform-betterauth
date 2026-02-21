'use client';

import type { ZoomTransform } from 'd3-zoom';
import type { SimLink, SimNode } from './types';
import { nodeType } from './graph-utils';

export function GraphCanvas(props: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  transform: ZoomTransform;
  simNodes: SimNode[];
  simLinks: SimLink[];
  selectedId: string | null;
  highlighted: Set<string>;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onNodePointerDown: (e: React.PointerEvent, id: string) => void;
  onSvgDoubleClick: (e: React.MouseEvent<SVGSVGElement>) => void;
  onSvgPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
}) {
  return (
    <div className="h-[560px] w-full" onPointerMove={props.onPointerMove} onPointerUp={props.onPointerUp}>
      <svg
        ref={props.svgRef}
        className="h-full w-full select-none"
        role="img"
        aria-label="Historian graph"
        onDoubleClick={props.onSvgDoubleClick}
        onPointerDown={props.onSvgPointerDown}
      >
        <g transform={`translate(${props.transform.x}, ${props.transform.y}) scale(${props.transform.k})`}>
          {/* edges */}
          <g opacity={0.65}>
            {props.simLinks.map((l, idx) => {
              const s = typeof l.source === 'string' ? props.simNodes.find((n) => n.id === l.source) : (l.source as SimNode);
              const t = typeof l.target === 'string' ? props.simNodes.find((n) => n.id === l.target) : (l.target as SimNode);
              if (!s || !t || s.x == null || t.x == null) return null;
              const isHL = props.selectedId ? props.highlighted.has(s.id) && props.highlighted.has(t.id) : false;
              const stroke = l.type === 'THEME' ? '#10b981' : l.type === 'TAGGED' ? '#a855f7' : l.type === 'MENTIONS' ? '#f97316' : '#a1a1aa';
              return (
                <line
                  key={idx}
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={stroke}
                  strokeWidth={isHL ? 2.2 : 1}
                  opacity={isHL ? 0.95 : 0.35}
                />
              );
            })}
          </g>

          {/* nodes */}
          <g>
            {props.simNodes.map((n) => {
              const x = n.x ?? 0;
              const y = n.y ?? 0;
              const t = nodeType(n);
              const hl = props.selectedId ? props.highlighted.has(n.id) : true;

              const r = t === 'event' ? 10 : 12;
              const fill = t === 'topic' ? '#10b981' : t === 'tag' ? '#a855f7' : t === 'person' ? '#f97316' : '#2563eb';
              const stroke = props.selectedId === n.id ? '#f59e0b' : '#0b1220';

              return (
                <g
                  key={n.id}
                  transform={`translate(${x}, ${y})`}
                  onPointerDown={(e) => props.onNodePointerDown(e, n.id)}
                  className="cursor-pointer"
                  style={{ opacity: hl ? 1 : 0.18 }}
                >
                  <circle r={r} fill={fill} stroke={stroke} strokeWidth={props.selectedId === n.id ? 3 : 1.2} />
                  <text x={r + 6} y={4} fontSize={11} fill={t === 'topic' ? '#065f46' : '#1f2937'}>
                    {n.title.length > 40 ? `${n.title.slice(0, 40)}…` : n.title}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}
