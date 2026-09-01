import { config as loadEnv } from 'dotenv';

/*
 * Env loading for scripts — THE single source.
 *
 * Next.js reads .env.local itself, but scripts run under tsx do not. If they are
 * not fed from the same file you get the "works in the app, fails in ingest"
 * class of bug. Precedence matches Next: .env.local > .env
 *
 * Why a separate file: this loading used to live inside `shared/db.ts`, which
 * made env availability DEPEND on importing that module. Scripts that never
 * touch the database (`scripts/revalidate`) were left without env — which is why
 * `npm run revalidate` had never worked, exiting silently with "REVALIDATE_SECRET
 * missing" every time.
 *
 * CAUTION — import order. Modules such as `src/lib/seo/config.ts` read env AT
 * EVALUATION TIME and freeze it into a constant. If a script imports both such a
 * module and this one, do not rely on this being evaluated FIRST: ESM import
 * order follows the order written in the file, and the linter may reorder it.
 * Read env-dependent values from `process.env` at the point of use rather than
 * from a constant (see `scripts/revalidate` -> `revalidateBaseUrl`).
 */
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });
