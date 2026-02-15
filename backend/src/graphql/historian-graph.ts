import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export type HistorianEvent = {
  id: string;
  created: string; // YYYY-MM-DD
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

export type GraphEdge = {
  from: string;
  to: string;
  type: string;
};

const DEFAULT_HISTORIAN_DIR = '/home/eunoh/문서/screenxyz/historian';

const parseHistorianFilename = (filename: string) => {
  // e.g. 2026-02-10.TLS와 HTTPS의 대중화(SSL→TLS→HSTS).md
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})\.(.+)\.md$/);
  if (!match) return null;
  return { created: match[1], title: match[2] };
};

type FrontmatterValue = string | string[];

const parseInlineList = (value: string): string[] | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return null;
  const inner = trimmed.slice(1, -1).trim();
  if (inner.length === 0) return [];
  return inner
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^"|"$/g, '').replace(/^'|'$/g, ''));
};

const parseFrontmatter = (
  markdown: string,
): { attrs: Record<string, FrontmatterValue>; body: string } => {
  if (!markdown.startsWith('---')) return { attrs: {}, body: markdown };
  const end = markdown.indexOf('\n---', 3);
  if (end === -1) return { attrs: {}, body: markdown };

  const raw = markdown.slice(3, end).trim();
  const body = markdown.slice(end + '\n---'.length).replace(/^\s+/, '');

  // Minimal YAML-ish parser: key: value
  // Supports quoted strings and inline lists: tags: [a, b]
  const attrs: Record<string, FrontmatterValue> = {};
  for (const line of raw.split('\n')) {
    const cleaned = line.trim();
    if (cleaned.length === 0) continue;

    const idx = cleaned.indexOf(':');
    if (idx === -1) continue;

    const key = cleaned.slice(0, idx).trim();
    let value = cleaned.slice(idx + 1).trim();
    value = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');

    const list = parseInlineList(value);
    attrs[key] = list ?? value;
  }

  return { attrs, body };
};

export async function loadHistorianEvents(opts?: {
  historianDir?: string;
  limit?: number;
  since?: string; // YYYY-MM-DD inclusive
  until?: string; // YYYY-MM-DD inclusive
}): Promise<HistorianEvent[]> {
  const historianDir = opts?.historianDir ?? process.env.HISTORIAN_DIR ?? DEFAULT_HISTORIAN_DIR;
  const limit = opts?.limit ?? 200;
  const since = opts?.since;
  const until = opts?.until;

  let files = await readdir(historianDir);
  files = files.filter((f) => f.endsWith('.md'));

  let parsed = files
    .map((f) => {
      const meta = parseHistorianFilename(f);
      if (!meta) return null;
      return { filename: f, ...meta };
    })
    .filter((x): x is { filename: string; created: string; title: string } => Boolean(x));

  // date range filter (YYYY-MM-DD string comparison)
  if (since) {
    parsed = parsed.filter((x) => x.created >= since);
  }
  if (until) {
    parsed = parsed.filter((x) => x.created <= until);
  }

  // newest first
  parsed.sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : 0));

  const selected = parsed.slice(0, limit);

  const events = await Promise.all(
    selected.map(async ({ filename, created, title }) => {
      const sourcePath = path.join(historianDir, filename);
      const raw = await readFile(sourcePath, 'utf-8');
      const { attrs, body } = parseFrontmatter(raw);
      const fmTitle = typeof attrs.title === 'string' ? attrs.title : undefined;
      const fmCreated = typeof attrs.created === 'string' ? attrs.created : undefined;
      const fmTags = Array.isArray(attrs.tags) ? attrs.tags : [];
      const fmPeople = Array.isArray(attrs.people) ? attrs.people : [];
      const fmKind = typeof attrs.kind === 'string' ? attrs.kind : undefined;
      const fmEra = typeof attrs.era === 'string' ? attrs.era : undefined;
      const fmTheme = typeof attrs.theme === 'string' ? attrs.theme : undefined;
      const fmSource = typeof attrs.source === 'string' ? attrs.source : undefined;

      const resolvedCreated = fmCreated ?? created;
      const resolvedTitle = fmTitle ?? title;

      return {
        id: `historian:${resolvedCreated}:${resolvedTitle}`,
        created: resolvedCreated,
        title: resolvedTitle,
        content: body,
        sourcePath,
        theme: fmTheme ?? null,
        source: fmSource ?? null,
        kind: fmKind ?? null,
        era: fmEra ?? null,
        tags: fmTags,
        people: fmPeople,
      } satisfies HistorianEvent;
    }),
  );

  return events;
}

export function buildTimelineEdges(events: HistorianEvent[]): GraphEdge[] {
  // Expect events newest-first; connect chronological neighbors
  const sorted = [...events].sort((a, b) =>
    a.created > b.created ? 1 : a.created < b.created ? -1 : 0,
  );
  const edges: GraphEdge[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    edges.push({ from: sorted[i].id, to: sorted[i + 1].id, type: 'NEXT' });
  }
  return edges;
}
