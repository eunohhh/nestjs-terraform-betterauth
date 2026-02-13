import { createSchema } from 'graphql-yoga';
import type { GraphEdge, HistorianEvent } from './historian-graph';
import { buildTimelineEdges, loadHistorianEvents } from './historian-graph';
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
    }

    type Query {
      historianEvents(limit: Int = 50): [HistorianEvent!]!
      historianEvent(id: ID!): HistorianEvent
      historianGraph(limit: Int = 50): Graph!
    }

    type Mutation {
      ingestHistorian(limit: Int = 200): IngestResult!
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
        const nodes = await loadHistorianEvents({ limit: args.limit ?? 50 });
        const edges = buildTimelineEdges(nodes);
        return { nodes, edges };
      },
    },
    Mutation: {
      ingestHistorian: async (_parent: unknown, args: { limit?: number }) => {
        const nodes = await loadHistorianEvents({ limit: args.limit ?? 200 });
        const edges = buildTimelineEdges(nodes);

        if (!isNeo4jEnabled()) {
          return { ok: true, nodes: nodes.length, edges: edges.length, mode: 'file-only' };
        }

        const result = await upsertHistorianGraph({ events: nodes, edges });
        return { ok: true, nodes: result.nodes, edges: result.edges, mode: 'neo4j' };
      },
    },
  },
});
