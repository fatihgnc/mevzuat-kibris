import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './supabase/migrations/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Elle yazılmış SQL migration'lar (search config, RLS, generated column) otorite;
  // drizzle-kit yalnızca tip ve diff kontrolü için kullanılır.
  verbose: true,
  strict: true,
});
