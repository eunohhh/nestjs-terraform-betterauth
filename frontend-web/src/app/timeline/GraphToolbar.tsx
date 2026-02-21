'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function GraphToolbar(props: {
  limit: number;
  setLimit: (n: number) => void;
  onRefresh: () => void;
  onResetView: () => void;
  onCenter: () => void;
  canCenter: boolean;
  showEvents: boolean;
  setShowEvents: (v: boolean) => void;
  showTopics: boolean;
  setShowTopics: (v: boolean) => void;
  showTags: boolean;
  setShowTags: (v: boolean) => void;
  showPeople: boolean;
  setShowPeople: (v: boolean) => void;
  onOpenAdd: () => void;
}) {
  return (
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
          value={props.limit}
          onChange={(e) => props.setLimit(Number(e.target.value))}
        />

        <Button variant="outline" onClick={props.onRefresh}>
          Refresh
        </Button>
        <Button variant="outline" onClick={props.onResetView} title="Reset zoom/pan">
          Reset view
        </Button>
        <Button
          variant="outline"
          onClick={props.onCenter}
          disabled={!props.canCenter}
          title="Center on selected node"
        >
          Center
        </Button>

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={props.showEvents} onChange={(e) => props.setShowEvents(e.target.checked)} />
            events
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={props.showTopics} onChange={(e) => props.setShowTopics(e.target.checked)} />
            topics
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={props.showTags} onChange={(e) => props.setShowTags(e.target.checked)} />
            tags
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={props.showPeople} onChange={(e) => props.setShowPeople(e.target.checked)} />
            people
          </label>

          <Button size="sm" variant="default" onClick={props.onOpenAdd}>
            Add event
          </Button>
        </div>
      </div>
    </div>
  );
}
