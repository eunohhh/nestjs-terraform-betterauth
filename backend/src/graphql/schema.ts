import { createSchema } from 'graphql-yoga';
import type { GraphEdge, HistorianEvent } from './historian-graph';
import { buildTimelineEdges, loadHistorianEvents } from './historian-graph';

export type Graph = { nodes: HistorianEvent[]; edges: GraphEdge[] };

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type HistorianEvent {
      id: ID!
      created: String!
      title: String!
      content: String!
      sourcePath: String!
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

    type Query {
      historianEvents(limit: Int = 50): [HistorianEvent!]!
      historianEvent(id: ID!): HistorianEvent
      historianGraph(limit: Int = 50): Graph!
    }
  `,
  resolvers: {
    Query: {
      historianEvents: async (_parent: unknown, args: { limit?: number }) => {
        return loadHistorianEvents({ limit: args.limit ?? 50 });
      },
      historianEvent: async (_parent: unknown, args: { id: string }) => {
        const events = await loadHistorianEvents({ limit: 500 });
        return events.find((e) => e.id === args.id) ?? null;
      },
      historianGraph: async (_parent: unknown, args: { limit?: number }): Promise<Graph> => {
        const nodes = await loadHistorianEvents({ limit: args.limit ?? 50 });
        const edges = buildTimelineEdges(nodes);
        return { nodes, edges };
      },
    },
  },
});
