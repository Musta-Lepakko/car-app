import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DEFAULT_USER_ID: z.string().uuid(),
  FRONTEND_ORIGIN: z.string().optional().default('*')
});

export const env = envSchema.parse(process.env);
