import 'dotenv/config';
import { loadHistorianEvents, buildTimelineEdges } from '../src/graphql/historian-graph';
import { upsertHistorianGraph } from '../src/graphql/historian-neo4j';
import { closeNeo4jDriver } from '../src/graphql/neo4j';

const DEFAULT_HISTORIAN_DIR = '/home/eunoh/문서/screenxyz/historian';

type Args = {
  files: string;
  limit: number;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  let files = DEFAULT_HISTORIAN_DIR;
  let limit = 200;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if ((a === '--files' || a === '--dir') && argv[i + 1]) {
      files = argv[i + 1] as string;
      i++;
      continue;
    }

    if (a === '--limit' && argv[i + 1]) {
      const n = Number(argv[i + 1]);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`Invalid --limit: ${argv[i + 1]}`);
      }
      limit = Math.floor(n);
      i++;
      continue;
    }

    if (a === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (a === '--help' || a === '-h') {
      printHelpAndExit(0);
    }

    if (a === '--') {
      continue;
    }

    if (a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a}`);
    }
  }

  return { files, limit, dryRun };
}

function printHelpAndExit(code: number): never {
  // eslint-disable-next-line no-console
  console.log(`\nIngest Obsidian Historian notes into Neo4j\n\nUsage:\n  pnpm ingest\n  pnpm ingest -- --files "/path/to/vault/historian"\n\nOptions:\n  --files, --dir   Path to historian directory (default: ${DEFAULT_HISTORIAN_DIR})\n  --limit          Max number of markdown files to ingest (default: 200)\n  --dry-run        Parse files and build graph, but do not write to Neo4j\n\nNeo4j env required:\n  NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, (optional) NEO4J_DATABASE\n`);
  process.exit(code);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // eslint-disable-next-line no-console
  console.log(`[ingest] historianDir=${args.files}`);
  // eslint-disable-next-line no-console
  console.log(`[ingest] limit=${args.limit} dryRun=${args.dryRun}`);

  const events = await loadHistorianEvents({ historianDir: args.files, limit: args.limit });
  const edges = buildTimelineEdges(events);

  // eslint-disable-next-line no-console
  console.log(`[ingest] parsed events=${events.length} edges=${edges.length}`);

  if (args.dryRun) {
    // eslint-disable-next-line no-console
    console.log('[ingest] dry-run complete');
    return;
  }

  const result = await upsertHistorianGraph({ events, edges });

  // eslint-disable-next-line no-console
  console.log(`[ingest] upserted nodes=${result.nodes} edges=${result.edges}`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[ingest] failed', err);
    process.exitCode = 1;
  })
  .finally(() => closeNeo4jDriver());
