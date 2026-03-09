import Fastify from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';
import { listingsRoutes } from './routes/listings.js';
import { searchJobsRoutes } from './routes/searchJobs.js';
import { searchProfilesRoutes } from './routes/searchProfiles.js';
import { env } from './lib/env.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: env.FRONTEND_ORIGIN === '*' ? true : env.FRONTEND_ORIGIN,
    methods: ['GET', 'PATCH', 'POST', 'OPTIONS']
  });

  app.register(healthRoutes);
  app.register(searchProfilesRoutes);
  app.register(listingsRoutes);
  app.register(searchJobsRoutes);

  return app;
}
