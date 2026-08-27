import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Spelled out (not ReturnType<typeof neon>) so the false/false defaults are
// preserved — ReturnType would widen both to `boolean` and blur every
// query's row type into a FullQueryResults union.
type Sql = NeonQueryFunction<false, false>;

let cached: Sql | null = null;

// Lazy on purpose: this module is imported by every page/route that touches
// data, and Next.js loads those modules (just to read config like `dynamic`)
// during `next build`'s page-data-collection step even for routes that never
// actually render at build time. Throwing eagerly at import time would break
// `next build` whenever POSTGRES_URL isn't set yet (e.g. before the Postgres
// store is attached in Vercel) — deferring the check to first real query
// keeps the build green and only fails requests that actually hit the DB.
function getSql(): Sql {
  if (cached) return cached;
  const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "POSTGRES_URL (or DATABASE_URL) is not set. Attach a Postgres store in the Vercel dashboard " +
        "(or set it in .env for local dev), then run `npm run db:migrate`."
    );
  }
  cached = neon(connectionString);
  return cached;
}

export const sql: Sql = new Proxy((() => {}) as unknown as Sql, {
  apply(_target, _thisArg, args) {
    return Reflect.apply(getSql(), _thisArg, args);
  },
  get(_target, prop, receiver) {
    return Reflect.get(getSql(), prop, receiver);
  },
});
