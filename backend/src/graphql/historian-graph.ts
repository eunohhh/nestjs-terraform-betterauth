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

const parseFrontmatter = (markdown: string): { attrs: Record<string, string>; body: string } => {
  if (!markdown.startsWith('---')) return { attrs: {}, body: markdown };
  const end = markdown.indexOf('\n---', 3);
  if (end === -1) return { attrs: {}, body: markdown };

  const raw = markdown.slice(3, end).trim();
  const body = markdown.slice(end + '\n---'.length).replace(/^\s+/, '');

  // Minimal YAML-ish parser: key: value (supports quoted strings)
  const attrs: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    value = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (key) attrs[key] = value;
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
      return {
        id: `historian:${created}:${title}`,
        created,
        title,
        content: body,
        sourcePath,
        theme: attrs.theme ?? null,
        source: attrs.source ?? null,
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
