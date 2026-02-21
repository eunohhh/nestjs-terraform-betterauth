'use client';

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
} from '@/components/ui/dialog';
import { labelFor, nodeType } from '../_libs/graph-utils';
import type { Graph, HistorianEventNode } from '../_types/types';

export function DetailsDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selected: HistorianEventNode | null;
  adjacency: Map<string, Set<string>>;
  graph: Graph | null;
  onSelectNeighbor: (id: string) => void;
}) {
  const n = props.selected;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{n ? labelFor(n) : 'Details'}</DialogTitle>
          <DialogDescription>{n ? nodeType(n) : ''}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {!n && <div className="text-sm text-zinc-500">Select a node.</div>}

          {n && (
            <div className="space-y-4">
            <div>
              {n.theme && (
                <div className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                  {n.theme}
                </div>
              )}
              {n.source && <div className="mt-2 text-xs text-zinc-500">source: {n.source}</div>}
              {n.kind && <div className="mt-1 text-xs text-zinc-500">kind: {n.kind}</div>}
              {n.era && <div className="mt-1 text-xs text-zinc-500">era: {n.era}</div>}

              {n.tags && n.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {n.tags.slice(0, 16).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-950/40 dark:text-purple-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {n.people && n.people.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {n.people.slice(0, 16).map((p) => (
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

            {nodeType(n) === 'event' && (
              <>
                <div className="markdown max-h-[55vh] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {n.content}
                  </ReactMarkdown>
                </div>
                {n.sourcePath && (
                  <div className="text-xs text-zinc-500 break-all">{n.sourcePath}</div>
                )}
              </>
            )}

            <div>
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Neighbors</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {[...(props.adjacency.get(n.id) ?? [])].slice(0, 30).map((id) => {
                  const neighbor = props.graph?.nodes.find((x) => x.id === id);
                  if (!neighbor) return null;
                  const t = nodeType(neighbor);
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
                      onClick={() => props.onSelectNeighbor(id)}
                      className={`rounded-full border px-2 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 ${cls}`}
                    >
                      {neighbor.title.length > 26
                        ? `${neighbor.title.slice(0, 26)}…`
                        : neighbor.title}
                    </button>
                  );
                })}
              </div>
            </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
