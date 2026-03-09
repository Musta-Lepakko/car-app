import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getListings, updateListingState } from '../services/listingsService.js';

const querySchema = z.object({
  city: z.string().optional(),
  brand: z.string().optional(),
  transmission: z.string().optional(),
  minScore: z.coerce.number().optional(),
  favoritesOnly: z.coerce.boolean().optional(),
  shortlistedOnly: z.coerce.boolean().optional(),
  hideRejected: z.coerce.boolean().optional(),
  includeExceptions: z.coerce.boolean().optional(),
  sortBy: z.enum(['score_desc', 'price_asc', 'year_desc', 'mileage_asc', 'last_seen_desc']).optional()
});

const stateSchema = z.object({
  favorite: z.boolean().optional(),
  shortlisted: z.boolean().optional(),
  rejected: z.boolean().optional(),
  notes: z.string().nullable().optional()
});

const paramsSchema = z.object({
  id: z.string().uuid()
});

export async function listingsRoutes(app: FastifyInstance) {
  app.get('/api/listings', async (request, reply) => {
    try {
      const query = querySchema.parse(request.query);
      const result = await getListings(query);
      return reply.send(result);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  app.patch('/api/listings/:id/state', async (request, reply) => {
    try {
      const params = paramsSchema.parse(request.params);
      const body = stateSchema.parse(request.body);
      const updated = await updateListingState(params.id, body);
      return reply.send(updated);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });
}
