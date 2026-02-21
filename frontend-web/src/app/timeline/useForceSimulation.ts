import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import { useEffect, useMemo, useState } from 'react';
import type { Graph, SimLink, SimNode } from './types';
import { nodeType } from './graph-utils';

export function useForceSimulation(graph: Graph | null, size: { w: number; h: number }) {
  const [renderTick, setRenderTick] = useState(0);

  const [simNodes, simLinks] = useMemo(() => {
    if (!graph) return [[], []] as [SimNode[], SimLink[]];
    const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }));

    // Give nodes initial positions so the first paint doesn't pile up at (0,0)
    // (d3-force will quickly take over on the next ticks)
    for (const node of nodes) {
      if (node.x == null) node.x = size.w / 2 + (Math.random() - 0.5) * 80;
      if (node.y == null) node.y = size.h / 2 + (Math.random() - 0.5) * 80;
    }
    const links: SimLink[] = graph.edges.map((e) => ({ source: e.from, target: e.to, type: e.type }));
    return [nodes, links];
  }, [graph, size.h, size.w]);

  useEffect(() => {
    if (!graph) return;

    const nodeById = new Map(simNodes.map((n) => [n.id, n] as const));
    const linksResolved = simLinks.map((l) => ({
      ...l,
      source: nodeById.get(String(l.source)) ?? l.source,
      target: nodeById.get(String(l.target)) ?? l.target,
    }));

    const linkForce = forceLink<SimNode, any>(linksResolved as any)
      .id((d: any) => d.id)
      .distance((d: any) => (d.type === 'THEME' ? 80 : d.type === 'TAGGED' || d.type === 'MENTIONS' ? 70 : 40))
      .strength((d: any) => (d.type === 'THEME' ? 0.15 : d.type === 'TAGGED' || d.type === 'MENTIONS' ? 0.18 : 0.6));

    const sim = forceSimulation(simNodes)
      .force('charge', forceManyBody().strength(-160))
      .force('center', forceCenter(size.w / 2, size.h / 2))
      .force('link', linkForce)
      .force(
        'collide',
        forceCollide<SimNode>()
          .radius((d) => (nodeType(d) === 'event' ? 14 : 18))
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
  }, [graph, size.h, size.w, simLinks, simNodes]);

  return { simNodes, simLinks, renderTick };
}
