'use client';

import { type ZoomTransform, zoomIdentity } from 'd3-zoom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Graph } from './types';
import { nodeType } from './graph-utils';
import { toast } from '@/components/ui/use-toast';
import { useGraphData } from './useGraphData';
import { useZoomPan } from './useZoom';
import { useForceSimulation } from './useForceSimulation';
import { GraphToolbar } from './GraphToolbar';
import { GraphCanvas } from './GraphCanvas';
import { LoadingOverlay } from './LoadingOverlay';
import { AddEventDialog, type AddEventForm } from './AddEventDialog';
import { DetailsDialog } from './DetailsDialog';

export default function GraphClient() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const [limit, setLimit] = useState(60);

  const [showEvents, setShowEvents] = useState(true);
  const [showTopics, setShowTopics] = useState(true);
  const [showTags, setShowTags] = useState(true);
  const [showPeople, setShowPeople] = useState(true);

  const [form, setForm] = useState<AddEventForm>({
    ingestKey: '',
    created: '',
    title: '',
    theme: '',
    kind: 'concept',
    era: '',
    tags: '',
    people: '',
    source: 'Historian by OpenClaw',
    sourcePath: '',
    content: '',
    linkFromSelected: true,
  });

  const { graph, error, isInitialLoading, fetchGraph } = useGraphData(limit);

  useEffect(() => {
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    }
  }, [error]);

  const filteredGraph: Graph | null = useMemo(() => {
    if (!graph) return null;

    const allowedTypes = new Set<string>();
    if (showEvents) allowedTypes.add('event');
    if (showTopics) allowedTypes.add('topic');
    if (showTags) allowedTypes.add('tag');
    if (showPeople) allowedTypes.add('person');

    const nodes = graph.nodes.filter((n) => allowedTypes.has(nodeType(n)));
    const allowedIds = new Set(nodes.map((n) => n.id));
    const edges = graph.edges.filter((e) => allowedIds.has(e.from) && allowedIds.has(e.to));

    return { nodes, edges };
  }, [graph, showEvents, showPeople, showTags, showTopics]);

  useEffect(() => {
    if (!selectedId || !filteredGraph) return;
    if (!filteredGraph.nodes.some((n) => n.id === selectedId)) {
      setSelectedId(null);
      setDetailsOpen(false);
    }
  }, [filteredGraph, selectedId]);

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

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState({ w: 900, h: 560 });

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

  const { transform, resetView, onSvgDoubleClick, onSvgPointerDown, applyTransform } = useZoomPan(svgRef);

  const { simNodes, simLinks, renderTick } = useForceSimulation(filteredGraph, size);

  const centerOnSelected = useCallback(() => {
    if (!selectedId) return;
    const node = simNodes.find((n) => n.id === selectedId);
    if (!node || node.x == null || node.y == null) return;
    const k = transform.k;
    const x = size.w / 2 - node.x * k;
    const y = size.h / 2 - node.y * k;
    // use same scale, only pan
    applyTransform(zoomIdentity.translate(x, y).scale(k));
  }, [applyTransform, selectedId, simNodes, size.h, size.w, transform]);

  // Drag handling (keep simple; works alongside zoom)
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
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
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      dragRef.current = null;
      (e.currentTarget as any).releasePointerCapture?.(e.pointerId);
    }
  };

  const ingest = async (payload: { ingestKey: string; event: any; previousEventId: string | null }) => {
    const res = await fetch(`/api/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ingest-Key': payload.ingestKey,
      },
      body: JSON.stringify({ event: payload.event, previousEventId: payload.previousEventId }),
    });
    const json = (await res.json()) as any;
    if (!res.ok) {
      throw new Error(json?.error ?? `Ingest failed (${res.status})`);
    }
    await fetchGraph();
  };

  return (
    <div className="relative">
      <GraphToolbar
        limit={limit}
        setLimit={setLimit}
        onRefresh={fetchGraph}
        onResetView={resetView}
        onCenter={centerOnSelected}
        canCenter={Boolean(selectedId)}
        showEvents={showEvents}
        setShowEvents={setShowEvents}
        showTopics={showTopics}
        setShowTopics={setShowTopics}
        showTags={showTags}
        setShowTags={setShowTags}
        showPeople={showPeople}
        setShowPeople={setShowPeople}
        onOpenAdd={() => setAddOpen(true)}
      />

      <div className="relative rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {isInitialLoading && <LoadingOverlay label="Loading graph…" />}

        <GraphCanvas
          svgRef={svgRef}
          transform={transform}
          simNodes={simNodes}
          simLinks={simLinks}
          selectedId={selectedId}
          highlighted={highlighted}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onNodePointerDown={onNodePointerDown}
          onSvgDoubleClick={onSvgDoubleClick}
          onSvgPointerDown={onSvgPointerDown}
        />

        <div className="mt-3 text-xs text-zinc-500">
          Wheel/pinch to zoom. Double click/tap to zoom in. Drag nodes to adjust.
          <span className="sr-only">tick {renderTick}</span>
        </div>
      </div>

      <AddEventDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        selected={selected}
        form={form}
        setForm={setForm}
        onSave={async (payload) => {
          try {
            await ingest(payload);
          } catch (e) {
            // Bubble up via alert-like UI (reuse error banner)
            throw e;
          }
        }}
      />

      <DetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        selected={selected}
        adjacency={adjacency}
        graph={filteredGraph}
        onSelectNeighbor={(id) => {
          setSelectedId(id);
          setDetailsOpen(true);
        }}
      />
    </div>
  );
}
