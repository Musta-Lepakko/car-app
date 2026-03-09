import type { FastifyInstance } from 'fastify';
import { getSearchProfiles } from '../services/searchProfilesService.js';

export async function searchProfilesRoutes(app: FastifyInstance) {
  app.get('/api/search-profiles', async (_request, reply) => {
    try {
      const profiles = await getSearchProfiles();
      return reply.send(profiles);
    } catch (error) {
      requestError(reply, error);
    }
  });
}

function requestError(reply: { code: (code: number) => any; send: (payload: unknown) => unknown }, error: unknown) {
  return reply.code(500).send({ error: error instanceof Error ? error.message : 'Unknown error' });
}
