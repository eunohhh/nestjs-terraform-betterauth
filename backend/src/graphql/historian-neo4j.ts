import neo4j, { type Driver } from 'neo4j-driver';
import { getNeo4jDriver, getNeo4jConfigFromEnv } from './neo4j';
import type { GraphEdge, HistorianEvent } from './historian-graph';

const EVENT_LABEL = 'HistorianEvent';
const TOPIC_LABEL = 'Topic';
const TAG_LABEL = 'Tag';
const PERSON_LABEL = 'Person';

function getDbName(): string | undefined {
  return getNeo4jConfigFromEnv()?.database;
}

async function withSession<T>(driver: Driver, fn: (session: any) => Promise<T>): Promise<T> {
  const session = driver.session({ database: getDbName() });
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}

export function isNeo4jEnabled(): boolean {
  return Boolean(getNeo4jDriver());
}

export async function ensureConstraints(): Promise<void> {
  const driver = getNeo4jDriver();
  if (!driver) return;

  await withSession(driver, async (session) => {
    // Idempotent constraints
    await session.run(
      `CREATE CONSTRAINT historian_event_id IF NOT EXISTS FOR (e:${EVENT_LABEL}) REQUIRE e.id IS UNIQUE`,
    );
    await session.run(
      `CREATE CONSTRAINT topic_name IF NOT EXISTS FOR (t:${TOPIC_LABEL}) REQUIRE t.name IS UNIQUE`,
    );
    await session.run(
      `CREATE CONSTRAINT tag_name IF NOT EXISTS FOR (t:${TAG_LABEL}) REQUIRE t.name IS UNIQUE`,
    );
    await session.run(
      `CREATE CONSTRAINT person_name IF NOT EXISTS FOR (p:${PERSON_LABEL}) REQUIRE p.name IS UNIQUE`,
    );
  });
}

export async function upsertHistorianGraph(input: {
  events: HistorianEvent[];
  edges: GraphEdge[];
}): Promise<{ nodes: number; edges: number }>{
  const driver = getNeo4jDriver();
  if (!driver) {
    throw new Error('Neo4j is not configured');
  }

  await ensureConstraints();

  const { events, edges } = input;

  return withSession(driver, async (session) => {
    // Upsert events
    await session.run(
      `UNWIND $events AS ev
       MERGE (e:${EVENT_LABEL} { id: ev.id })
       SET e.created = ev.created,
           e.title = ev.title,
           e.content = ev.content,
           e.sourcePath = ev.sourcePath,
           e.theme = ev.theme,
           e.source = ev.source,
           e.kind = ev.kind,
           e.era = ev.era,
           e.tags = ev.tags,
           e.people = ev.people`,
      { events },
    );

    // Theme nodes
    await session.run(
      `UNWIND $events AS ev
       WITH ev WHERE ev.theme IS NOT NULL AND ev.theme <> ''
       MERGE (t:${TOPIC_LABEL} { name: ev.theme })
       WITH ev, t
       MATCH (e:${EVENT_LABEL} { id: ev.id })
       MERGE (e)-[:THEME]->(t)`,
      { events },
    );

    // Tag nodes
    await session.run(
      `UNWIND $events AS ev
       MATCH (e:${EVENT_LABEL} { id: ev.id })
       WITH ev, e
       UNWIND (CASE WHEN ev.tags IS NULL THEN [] ELSE ev.tags END) AS tag
       WITH e, tag WHERE tag IS NOT NULL AND tag <> ''
       MERGE (t:${TAG_LABEL} { name: tag })
       MERGE (e)-[:TAGGED]->(t)`,
      { events },
    );

    // People nodes
    await session.run(
      `UNWIND $events AS ev
       MATCH (e:${EVENT_LABEL} { id: ev.id })
       WITH ev, e
       UNWIND (CASE WHEN ev.people IS NULL THEN [] ELSE ev.people END) AS person
       WITH e, person WHERE person IS NOT NULL AND person <> ''
       MERGE (p:${PERSON_LABEL} { name: person })
       MERGE (e)-[:MENTIONS]->(p)`,
      { events },
    );

    // Upsert NEXT edges (and any future types)
    await session.run(
      `UNWIND $edges AS ed
       MATCH (a:${EVENT_LABEL} { id: ed.from })
       MATCH (b:${EVENT_LABEL} { id: ed.to })
       CALL {
         WITH a, b, ed
         WITH a, b, ed WHERE ed.type = 'NEXT'
         MERGE (a)-[:NEXT]->(b)
         RETURN 1 AS ok
       }
       RETURN count(*) AS cnt`,
      { edges },
    );

    return { nodes: events.length, edges: edges.length };
  });
}

export async function readHistorianGraph(limit: number): Promise<{ nodes: HistorianEvent[]; edges: GraphEdge[] }> {
  const safeLimit = Math.max(0, Math.floor(limit));
  const driver = getNeo4jDriver();
  if (!driver) {
    throw new Error('Neo4j is not configured');
  }

  return withSession(driver, async (session) => {
    const nodesRes = await session.run(
      `MATCH (e:${EVENT_LABEL})
       RETURN e
       ORDER BY e.created DESC
       LIMIT $limit`,
      { limit: neo4j.int(safeLimit) },
    );

    const nodes: HistorianEvent[] = nodesRes.records.map((r: any) => {
      const e = r.get('e').properties;
      return {
        id: e.id,
        created: e.created,
        title: e.title,
        content: e.content,
        sourcePath: e.sourcePath,
        theme: e.theme ?? null,
        source: e.source ?? null,
        kind: e.kind ?? null,
        era: e.era ?? null,
        tags: e.tags ?? [],
        people: e.people ?? [],
      };
    });

    const ids = nodes.map((n) => n.id);
    const edgesRes = await session.run(
      `MATCH (a:${EVENT_LABEL})-[rel:NEXT]->(b:${EVENT_LABEL})
       WHERE a.id IN $ids AND b.id IN $ids
       RETURN a.id AS from, b.id AS to`,
      { ids },
    );

    const edges: GraphEdge[] = edgesRes.records.map((r: any) => ({
      from: r.get('from'),
      to: r.get('to'),
      type: 'NEXT',
    }));

    // Also return THEME edges (event -> topic)
    const themeEdgesRes = await session.run(
      `MATCH (e:${EVENT_LABEL})-[:THEME]->(t:${TOPIC_LABEL})
       WHERE e.id IN $ids
       RETURN e.id AS from, t.name AS to`,
      { ids },
    );

    const themeEdges: GraphEdge[] = themeEdgesRes.records.map((r: any) => ({
      from: r.get('from'),
      to: `topic:${r.get('to')}`,
      type: 'THEME',
    }));

    // TAG edges
    const tagEdgesRes = await session.run(
      `MATCH (e:${EVENT_LABEL})-[:TAGGED]->(t:${TAG_LABEL})
       WHERE e.id IN $ids
       RETURN e.id AS from, t.name AS to`,
      { ids },
    );

    const tagEdges: GraphEdge[] = tagEdgesRes.records.map((r: any) => ({
      from: r.get('from'),
      to: `tag:${r.get('to')}`,
      type: 'TAGGED',
    }));

    // People edges
    const peopleEdgesRes = await session.run(
      `MATCH (e:${EVENT_LABEL})-[:MENTIONS]->(p:${PERSON_LABEL})
       WHERE e.id IN $ids
       RETURN e.id AS from, p.name AS to`,
      { ids },
    );

    const peopleEdges: GraphEdge[] = peopleEdgesRes.records.map((r: any) => ({
      from: r.get('from'),
      to: `person:${r.get('to')}`,
      type: 'MENTIONS',
    }));

    // Include Topic/Tag/Person nodes as pseudo nodes so the UI can render them.
    const extra = new Map<string, HistorianEvent>();

    const ensurePseudo = (id: string, title: string) => {
      if (!extra.has(id)) {
        extra.set(id, {
          id,
          created: '0000-00-00',
          title,
          content: '',
          sourcePath: '',
          theme: null,
          source: null,
          kind: null,
          era: null,
          tags: [],
          people: [],
        });
      }
    };

    for (const e of themeEdges) {
      if (e.type !== 'THEME') continue;
      ensurePseudo(e.to, e.to.replace(/^topic:/, ''));
    }
    for (const e of tagEdges) {
      if (e.type !== 'TAGGED') continue;
      ensurePseudo(e.to, e.to.replace(/^tag:/, ''));
    }
    for (const e of peopleEdges) {
      if (e.type !== 'MENTIONS') continue;
      ensurePseudo(e.to, e.to.replace(/^person:/, ''));
    }

    return {
      nodes: [...nodes, ...extra.values()],
      edges: [...edges, ...themeEdges, ...tagEdges, ...peopleEdges],
    };
  });
}
