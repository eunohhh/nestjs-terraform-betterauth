'use client';

import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomTransform } from 'd3-zoom';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type HistorianEventNode = {
  id: string;
  created: string;
  title: string;
  content: string;
  sourcePath: string;
  theme?: string | null;
  source?: string | null;
  kind?: string | null;
  era?: string | null;
  tags?: string[];
  people?: string[];
};

type GraphEdge = {
  from: string;
  to: string;
  type: string;
};

type Graph = {
  nodes: HistorianEventNode[];
  edges: GraphEdge[];
};

type SimNode = HistorianEventNode & {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  index?: number;
};

type SimLink = {
  source: string | SimNode;
  target: string | SimNode;
  type: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

function nodeType(n: HistorianEventNode): 'topic' | 'tag' | 'person' | 'event' {
  if (n.id.startsWith('topic:')) return 'topic';
  if (n.id.startsWith('tag:')) return 'tag';
  if (n.id.startsWith('person:')) return 'person';
  return 'event';
}

function isTopic(n: HistorianEventNode) {
  return nodeType(n) === 'topic';
}

function isExtraNode(n: HistorianEventNode) {
  return nodeType(n) !== 'event';
}

function labelFor(n: HistorianEventNode) {
  if (isExtraNode(n)) return n.title;
  return `${n.created} · ${n.title}`;
}

export default function GraphClient() {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [limit, setLimit] = useState(60);
  const [ingestKey, setIngestKey] = useState('');

  const [newCreated, setNewCreated] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTheme, setNewTheme] = useState('');
  const [newKind, setNewKind] = useState('concept');
  const [newEra, setNewEra] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newPeople, setNewPeople] = useState('');
  const [newSource, setNewSource] = useState('Historian by OpenClaw');
  const [newSourcePath, setNewSourcePath] = useState('');
  const [newContent, setNewContent] = useState('');
  const [linkFromSelected, setLinkFromSelected] = useState(true);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewportRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<ReturnType<typeof zoom<SVGSVGElement, unknown>> | null>(null);
  const zoomSelectionRef = useRef<any>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);

  const [showEvents, setShowEvents] = useState(true);
  const [showTopics, setShowTopics] = useState(true);
  const [showTags, setShowTags] = useState(true);
  const [showPeople, setShowPeople] = useState(true);

  const [size, setSize] = useState({ w: 900, h: 560 });
  const [transform, setTransform] = useState<ZoomTransform>(() => zoomIdentity);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const cr = entry.contentRect;
      if (cr.width > 0 && cr.height > 0) {
        setSize({ w: Math.floor(cr.width), h: Math.floor(cr.height) });
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Zoom / pan (wheel on desktop, pinch on mobile)
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
    // disable default dblclick zoom (we'll implement our own for dblclick + double-tap)
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
  }, []);

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
      const z = zoomRef.current;
      const s = zoomSelectionRef.current;
      const el = svgRef.current;
      if (!z || !s || !el) return;

      const rect = el.getBoundingClientRect();
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;

      const nextK = Math.min(6, Math.max(0.2, transform.k * factor));
      const t = zoomIdentity
        .translate(transform.x, transform.y)
        .scale(transform.k);

      // compute new transform so that (cx, cy) stays fixed
      const p0x = (cx - t.x) / t.k;
      const p0y = (cy - t.y) / t.k;
      const nextX = cx - p0x * nextK;
      const nextY = cy - p0y * nextK;

      applyTransform(zoomIdentity.translate(nextX, nextY).scale(nextK));
    },
    [applyTransform, transform.k, transform.x, transform.y],
  );

  // centerOnSelected is defined later (after simNodes is available)

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

  const fetchGraph = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query ($limit: Int!) {
            historianGraph(limit: $limit) {
              nodes { id created title content sourcePath theme source kind era tags people }
              edges { from to type }
            }
          }`,
          variables: { limit },
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || json.errors) {
        throw new Error(json.errors?.[0]?.message ?? `GraphQL error (${res.status})`);
      }
      setGraph(json.data.historianGraph as Graph);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load graph');
      setGraph(null);
    }
  }, [limit]);

  const ingest = async (payload: { event: any; previousEventId?: string | null }) => {
    setError(null);
    try {
      const res = await fetch(`/api/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ingest-Key': ingestKey,
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as any;
      if (!res.ok) {
        throw new Error(json?.error ?? `Ingest failed (${res.status})`);
      }
      await fetchGraph();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to ingest');
    }
  };

  useEffect(() => {
    void fetchGraph();
  }, [fetchGraph]);

  const filteredGraph = useMemo(() => {
    if (!graph) return null;

    const allowedTypes = new Set<string>();
    if (showEvents) allowedTypes.add('event');
    if (showTopics) allowedTypes.add('topic');
    if (showTags) allowedTypes.add('tag');
    if (showPeople) allowedTypes.add('person');

    const nodes = graph.nodes.filter((n) => allowedTypes.has(nodeType(n)));
    const allowedIds = new Set(nodes.map((n) => n.id));
    const edges = graph.edges.filter((e) => allowedIds.has(e.from) && allowedIds.has(e.to));

    return { nodes, edges } satisfies Graph;
  }, [graph, showEvents, showPeople, showTags, showTopics]);

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!filteredGraph) return map;
    for (const e of filteredGraph.edges) {
      if (!map.has(e.from)) map.set(e.from, new Set());
      if (!map.has(e.to)) map.set(e.to, new Set());
      map.get(e.from)?.add(e.to);
      map.get(e.to)?.add(e.from);
    }
    return map;
  }, [filteredGraph]);

  const selected = useMemo(() => {
    if (!filteredGraph || !selectedId) return null;
    return filteredGraph.nodes.find((n) => n.id === selectedId) ?? null;
  }, [filteredGraph, selectedId]);

  const highlighted = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const set = new Set<string>();
    set.add(selectedId);
    for (const n of adjacency.get(selectedId) ?? []) set.add(n);
    return set;
  }, [adjacency, selectedId]);

  useEffect(() => {
    if (!selectedId || !filteredGraph) return;
    if (!filteredGraph.nodes.some((n) => n.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filteredGraph, selectedId]);

  const [simNodes, simLinks] = useMemo(() => {
    if (!filteredGraph) return [[], []] as [SimNode[], SimLink[]];
    const nodes: SimNode[] = filteredGraph.nodes.map((n) => ({ ...n }));
    const links: SimLink[] = filteredGraph.edges.map((e) => ({
      source: e.from,
      target: e.to,
      type: e.type,
    }));
    return [nodes, links];
  }, [filteredGraph]);

  const centerOnSelected = useCallback(() => {
    if (!selectedId) return;
    const node = simNodes.find((n) => n.id === selectedId);
    if (!node || node.x == null || node.y == null) return;
    const k = transform.k;
    const x = size.w / 2 - node.x * k;
    const y = size.h / 2 - node.y * k;
    applyTransform(zoomIdentity.translate(x, y).scale(k));
  }, [applyTransform, selectedId, simNodes, size.h, size.w, transform.k]);

  const [renderTick, setRenderTick] = useState(0);

  useEffect(() => {
    if (!filteredGraph) return;

    const nodeById = new Map(simNodes.map((n) => [n.id, n] as const));
    const linksResolved = simLinks.map((l) => ({
      ...l,
      source: nodeById.get(String(l.source)) ?? l.source,
      target: nodeById.get(String(l.target)) ?? l.target,
    }));

    const linkForce = forceLink<SimNode, any>(linksResolved as any)
      .id((d: any) => d.id)
      .distance((d: any) =>
        d.type === 'THEME' ? 80 : d.type === 'TAGGED' || d.type === 'MENTIONS' ? 70 : 40,
      )
      .strength((d: any) =>
        d.type === 'THEME' ? 0.15 : d.type === 'TAGGED' || d.type === 'MENTIONS' ? 0.18 : 0.6,
      );

    const sim = forceSimulation(simNodes)
      .force('charge', forceManyBody().strength(-160))
      .force('center', forceCenter(size.w / 2, size.h / 2))
      .force('link', linkForce)
      .force(
        'collide',
        forceCollide<SimNode>()
          .radius((d) => (isExtraNode(d) ? 18 : 14))
          .strength(0.9),
      );

    let raf = 0;
    sim.on('tick', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setRenderTick((x) => x + 1));
    });

    return () => {
      cancelAnimationFrame(raf);
      sim.stop();
    };
  }, [filteredGraph, size.w, size.h, simLinks, simNodes]);

  // Drag handling
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const onPointerDownNode = (e: React.PointerEvent, id: string) => {
    const n = simNodes.find((x) => x.id === id);
    if (!n || n.x == null || n.y == null) return;
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    dragRef.current = { id, dx: n.x - e.clientX, dy: n.y - e.clientY };
    setSelectedId(id);
    setDetailsOpen(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const n = simNodes.find((x) => x.id === drag.id);
    if (!n) return;
    n.x = e.clientX + drag.dx;
    n.y = e.clientY + drag.dy;
    n.vx = 0;
    n.vy = 0;
    setRenderTick((x) => x + 1);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      dragRef.current = null;
      (e.currentTarget as any).releasePointerCapture?.(e.pointerId);
    }
  };

  const nodesToRender = simNodes;

  return (
    <div>
      <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Historian Graph</div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Label htmlFor="graph-limit" className="text-xs text-zinc-500">
              limit
            </Label>
            <Input
              id="graph-limit"
              className="w-20"
              type="number"
              min={10}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />

            <Button variant="outline" onClick={fetchGraph}>
              Refresh
            </Button>
            <Button variant="outline" onClick={resetView} title="Reset zoom/pan">
              Reset view
            </Button>
            <Button variant="outline" onClick={centerOnSelected} disabled={!selectedId} title="Center on selected node">
              Center
            </Button>

            <div className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)} />
                events
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={showTopics} onChange={(e) => setShowTopics(e.target.checked)} />
                topics
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={showTags} onChange={(e) => setShowTags(e.target.checked)} />
                tags
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={showPeople} onChange={(e) => setShowPeople(e.target.checked)} />
                people
              </label>

              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="default">
                    Add event
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Historian Event</DialogTitle>
                    <DialogDescription>
                      Ingest key is required. This writes directly to Neo4j via GraphQL.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-1">
                      <Label htmlFor="ingest-key">Ingest key</Label>
                      <Input
                        id="ingest-key"
                        placeholder="INGEST_KEY"
                        value={ingestKey}
                        onChange={(e) => setIngestKey(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-1">
                      <Label htmlFor="new-created">created</Label>
                      <Input
                        id="new-created"
                        placeholder="YYYY-MM-DD"
                        value={newCreated}
                        onChange={(e) => setNewCreated(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-1">
                      <Label htmlFor="new-title">title</Label>
                      <Input id="new-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                    </div>

                    <div className="grid gap-1">
                      <Label htmlFor="new-theme">theme</Label>
                      <Input id="new-theme" value={newTheme} onChange={(e) => setNewTheme(e.target.value)} />
                    </div>

                    <div className="grid gap-1">
                      <Label htmlFor="new-kind">kind</Label>
                      <Input id="new-kind" value={newKind} onChange={(e) => setNewKind(e.target.value)} />
                    </div>

                    <div className="grid gap-1">
                      <Label htmlFor="new-era">era</Label>
                      <Input id="new-era" value={newEra} onChange={(e) => setNewEra(e.target.value)} />
                    </div>

                    <div className="grid gap-1">
                      <Label htmlFor="new-tags">tags</Label>
                      <Input
                        id="new-tags"
                        placeholder="comma separated"
                        value={newTags}
                        onChange={(e) => setNewTags(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-1">
                      <Label htmlFor="new-people">people</Label>
                      <Input
                        id="new-people"
                        placeholder="comma separated"
                        value={newPeople}
                        onChange={(e) => setNewPeople(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-1">
                      <Label htmlFor="new-source">source</Label>
                      <Input id="new-source" value={newSource} onChange={(e) => setNewSource(e.target.value)} />
                    </div>

                    <div className="grid gap-1">
                      <Label htmlFor="new-sourcePath">sourcePath</Label>
                      <Input id="new-sourcePath" value={newSourcePath} onChange={(e) => setNewSourcePath(e.target.value)} />
                    </div>

                    <div className="grid gap-1">
                      <Label htmlFor="new-content">content</Label>
                      <Textarea
                        id="new-content"
                        className="h-56"
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={linkFromSelected}
                        onChange={(e) => setLinkFromSelected(e.target.checked)}
                      />
                      Link from selected event as previous (creates NEXT edge)
                    </label>
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      onClick={async () => {
                        await ingest({
                          event: {
                            created: newCreated,
                            title: newTitle,
                            theme: newTheme || null,
                            kind: newKind || null,
                            era: newEra || null,
                            tags: newTags
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                            people: newPeople
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                            source: newSource || null,
                            sourcePath: newSourcePath || '',
                            content: newContent,
                          },
                          previousEventId: linkFromSelected && selected && !isTopic(selected) ? selected.id : null,
                        });
                        setAddOpen(false);
                      }}
                      disabled={!ingestKey || !newCreated || !newTitle || !newContent}
                    >
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="h-[560px] w-full" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          <svg
            ref={svgRef}
            className="h-full w-full select-none"
            role="img"
            aria-label="Historian graph"
            onDoubleClick={onSvgDoubleClick}
            onPointerDown={onSvgPointerDown}
          >
            <g
              ref={viewportRef}
              transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
            >
              {/* edges */}
              <g opacity={0.65}>
              {simLinks.map((l, idx) => {
                const s =
                  typeof l.source === 'string'
                    ? simNodes.find((n) => n.id === l.source)
                    : (l.source as SimNode);
                const t =
                  typeof l.target === 'string'
                    ? simNodes.find((n) => n.id === l.target)
                    : (l.target as SimNode);
                if (!s || !t || s.x == null || t.x == null) return null;
                const isHL = selectedId ? highlighted.has(s.id) && highlighted.has(t.id) : false;
                const stroke = l.type === 'THEME' ? '#10b981' : '#a1a1aa';
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
              {nodesToRender.map((n) => {
                const x = n.x ?? 0;
                const y = n.y ?? 0;
                const t = nodeType(n);
                const hl = selectedId ? highlighted.has(n.id) : true;

                const r = t === 'event' ? 10 : 12;
                const fill =
                  t === 'topic'
                    ? '#10b981'
                    : t === 'tag'
                      ? '#a855f7'
                      : t === 'person'
                        ? '#f97316'
                        : '#2563eb';
                const stroke = selectedId === n.id ? '#f59e0b' : '#0b1220';

                return (
                  <g
                    key={n.id}
                    transform={`translate(${x}, ${y})`}
                    onPointerDown={(e) => onPointerDownNode(e, n.id)}
                    style={{ cursor: 'pointer', opacity: hl ? 1 : 0.18 }}
                  >
                    <circle
                      r={r}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={selectedId === n.id ? 3 : 1.2}
                    />
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

        <div className="mt-3 text-xs text-zinc-500">
          Blue = event, Green = theme/topic. Click a node to highlight 1-hop neighborhood. Drag
          nodes to adjust.
          <span className="sr-only">render tick {renderTick}</span>
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected ? labelFor(selected) : 'Details'}</DialogTitle>
            <DialogDescription>
              {selected ? nodeType(selected) : ''}
            </DialogDescription>
          </DialogHeader>

          {!selected && <div className="text-sm text-zinc-500">Select a node.</div>}

          {selected && (
            <div className="mt-4 space-y-4">
              <div>
                {selected.theme && (
                  <div className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {selected.theme}
                  </div>
                )}
                {selected.source && <div className="mt-2 text-xs text-zinc-500">source: {selected.source}</div>}
                {selected.kind && <div className="mt-1 text-xs text-zinc-500">kind: {selected.kind}</div>}
                {selected.era && <div className="mt-1 text-xs text-zinc-500">era: {selected.era}</div>}

                {selected.tags && selected.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.tags.slice(0, 16).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-950/40 dark:text-purple-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {selected.people && selected.people.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.people.slice(0, 16).map((p) => (
                      <span
                        key={p}
                        className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700 dark:bg-orange-950/40 dark:text-orange-200"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {nodeType(selected) === 'event' && (
                <>
                  <div className="markdown max-h-[55vh] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                      {selected.content}
                    </ReactMarkdown>
                  </div>
                  {selected.sourcePath && <div className="text-xs text-zinc-500 break-all">{selected.sourcePath}</div>}
                </>
              )}

              <div>
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Neighbors</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[...(adjacency.get(selected.id) ?? [])].slice(0, 30).map((id) => {
                    const n = filteredGraph?.nodes.find((x) => x.id === id);
                    if (!n) return null;
                    const t = nodeType(n);
                    const cls =
                      t === 'topic'
                        ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-200'
                        : t === 'tag'
                          ? 'border-purple-200 text-purple-700 dark:border-purple-900/50 dark:text-purple-200'
                          : t === 'person'
                            ? 'border-orange-200 text-orange-700 dark:border-orange-900/50 dark:text-orange-200'
                            : 'border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200';
                    return (
                      <button
                        type="button"
                        key={id}
                        onClick={() => {
                          setSelectedId(id);
                          setDetailsOpen(true);
                        }}
                        className={`rounded-full border px-2 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 ${cls}`}
                      >
                        {n.title.length > 26 ? `${n.title.slice(0, 26)}…` : n.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
