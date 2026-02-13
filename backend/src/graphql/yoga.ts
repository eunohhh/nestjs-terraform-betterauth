import { createYoga, type YogaInitialContext } from 'graphql-yoga';
import { schema } from './schema';

type GraphQLContext = YogaInitialContext & { adminKey?: string | undefined };

export const yoga = createYoga<GraphQLContext>({
  schema,
  graphqlEndpoint: '/graphql',
  landingPage: true,
  context: ({ request }) => {
    const adminKey = request.headers.get('x-admin-key') ?? undefined;
    return { adminKey };
  },
});
