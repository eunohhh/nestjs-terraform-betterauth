import 'dotenv/config';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_HISTORIAN_DIR = '/home/eunoh/문서/screenxyz/historian';

type Args = {
  dir: string;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  let dir = process.env.HISTORIAN_DIR ?? DEFAULT_HISTORIAN_DIR;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--dir' || a === '--files') && argv[i + 1]) {
      dir = argv[i + 1]!;
      i++;
      continue;
    }
    if (a === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (a === '--help' || a === '-h') {
      // eslint-disable-next-line no-console
      console.log(`\nAdd 'year' field to Historian markdown frontmatter (nullable)\n\nUsage:\n  pnpm ts-node scripts/add-year-frontmatter.ts -- --dir "/path/to/historian"\n  pnpm ts-node scripts/add-year-frontmatter.ts -- --dry-run\n\nNotes:\n- If frontmatter already contains 'year:', it is left untouched.\n- Otherwise inserts: year: (empty)\n`);
      process.exit(0);
    }
  }

  return { dir, dryRun };
}

function ensureYearFrontmatter(raw: string): { updated: string; changed: boolean } {
  if (!raw.startsWith('---')) return { updated: raw, changed: false };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { updated: raw, changed: false };

  const fmBlock = raw.slice(3, end); // keep original spacing inside block
  const body = raw.slice(end + '\n---'.length);

  const lines = fmBlock.split('\n');
  const hasYear = lines.some((l) => l.trimStart().startsWith('year:'));
  if (hasYear) return { updated: raw, changed: false };

  const findAfter = (key: string) =>
    lines.findIndex((l) => l.trimStart().startsWith(`${key}:`));

  let insertAt = -1;
  for (const k of ['era', 'kind', 'title', 'created', 'source', 'theme']) {
    const idx = findAfter(k);
    if (idx !== -1) {
      insertAt = idx + 1;
      break;
    }
  }
  if (insertAt === -1) insertAt = 0;

  lines.splice(insertAt, 0, 'year:');

  const newFmBlock = lines.join('\n');
  const updated = `---${newFmBlock}\n---${body}`;
  return { updated, changed: true };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // eslint-disable-next-line no-console
  console.log(`[add-year] dir=${args.dir} dryRun=${args.dryRun}`);

  let files = await readdir(args.dir);
  files = files.filter((f) => f.endsWith('.md'));

  let changedCount = 0;

  for (const f of files) {
    const p = path.join(args.dir, f);
    const raw = await readFile(p, 'utf-8');
    const { updated, changed } = ensureYearFrontmatter(raw);
    if (!changed) continue;

    changedCount++;
    if (!args.dryRun) {
      await writeFile(p, updated, 'utf-8');
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[add-year] changed=${changedCount}/${files.length}`);
  if (args.dryRun) {
    // eslint-disable-next-line no-console
    console.log('[add-year] dry-run complete (no files written)');
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[add-year] failed', err);
  process.exitCode = 1;
});
