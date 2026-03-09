import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createSearchJob, getSearchJob } from '../services/searchJobsService.js';

const createSchema = z.object({ profileId: z.string().uuid() });
const paramsSchema = z.object({ id: z.string().uuid() });

export async function searchJobsRoutes(app: FastifyInstance) {
  app.post('/api/search-jobs', async (request, reply) => {
    try {
      const body = createSchema.parse(request.body);
      const job = await createSearchJob(body.profileId);
      return reply.code(201).send(job);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  app.get('/api/search-jobs/:id', async (request, reply) => {
    try {
      const params = paramsSchema.parse(request.params);
      const job = await getSearchJob(params.id);
      return reply.send(job);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });
}
