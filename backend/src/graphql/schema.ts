import { createSchema } from 'graphql-yoga';
import type { GraphEdge, HistorianEvent } from './historian-graph';
import { loadHistorianEvents } from './historian-graph';
import { isNeo4jEnabled, readHistorianGraph, upsertHistorianGraph } from './historian-neo4j';

export type Graph = { nodes: HistorianEvent[]; edges: GraphEdge[] };

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type HistorianEvent {
      id: ID!
      created: String!
      title: String!
      content: String!
      sourcePath: String!
      theme: String
      source: String
    }

    type GraphEdge {
      from: ID!
      to: ID!
      type: String!
    }

    type Graph {
      nodes: [HistorianEvent!]!
      edges: [GraphEdge!]!
    }

    type IngestResult {
      ok: Boolean!
      nodes: Int!
      edges: Int!
      mode: String!
      id: ID
    }

    input HistorianEventInput {
      id: ID
      created: String!
      title: String!
      content: String!
      sourcePath: String!
      theme: String
      source: String
    }

    type Query {
      historianEvents(limit: Int = 50): [HistorianEvent!]!
      historianEvent(id: ID!): HistorianEvent
      historianGraph(limit: Int = 50): Graph!
    }

    type Mutation {
      ingestHistorian(input: HistorianEventInput!, previousEventId: ID): IngestResult!
    }
  `,
  resolvers: {
    Query: {
      historianEvents: async (_parent: unknown, args: { limit?: number }) => {
        if (isNeo4jEnabled()) {
          const graph = await readHistorianGraph(args.limit ?? 50);
          // filter out topic pseudo nodes
          return graph.nodes.filter((n) => !n.id.startsWith('topic:')).slice(0, args.limit ?? 50);
        }
        return loadHistorianEvents({ limit: args.limit ?? 50 });
      },
      historianEvent: async (_parent: unknown, args: { id: string }) => {
        if (isNeo4jEnabled()) {
          const graph = await readHistorianGraph(500);
          return graph.nodes.find((e) => e.id === args.id) ?? null;
        }
        const events = await loadHistorianEvents({ limit: 500 });
        return events.find((e) => e.id === args.id) ?? null;
      },
      historianGraph: async (_parent: unknown, args: { limit?: number }): Promise<Graph> => {
        if (isNeo4jEnabled()) {
          return readHistorianGraph(args.limit ?? 50);
        }
        // File-mode graph has been removed from the server path (ECS won't have the files).
        // Use the local ingest script to populate Neo4j, then query from Neo4j.
        throw new Error('Neo4j is not configured');
      },
    },
    Mutation: {
      ingestHistorian: async (
        _parent: unknown,
        args: { input: HistorianEvent; previousEventId?: string | null },
        ctx: { adminKey?: string | undefined },
      ) => {
        const expected = process.env.GRAPHQL_ADMIN_KEY;
        if (!expected) {
          throw new Error('GRAPHQL_ADMIN_KEY is not set');
        }
        if (!ctx.adminKey || ctx.adminKey !== expected) {
          throw new Error('Unauthorized');
        }

        if (!isNeo4jEnabled()) {
          throw new Error('Neo4j is not configured');
        }

        const input = args.input;
        const id = input.id && input.id.length > 0 ? input.id : `historian:${input.created}:${input.title}`;

        const event: HistorianEvent = {
          id,
          created: input.created,
          title: input.title,
          content: input.content,
          sourcePath: input.sourcePath,
          theme: input.theme ?? null,
          source: input.source ?? null,
        };

        const edges: GraphEdge[] = [];
        if (args.previousEventId && args.previousEventId.length > 0) {
          edges.push({ from: args.previousEventId, to: id, type: 'NEXT' });
        }

        const result = await upsertHistorianGraph({ events: [event], edges });
        return { ok: true, nodes: result.nodes, edges: result.edges, mode: 'neo4j', id };
      },
    },
  },
});
