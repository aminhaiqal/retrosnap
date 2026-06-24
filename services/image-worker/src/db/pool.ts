import pg from "pg";

const { Pool } = pg;

export function createPool(databaseUrl: string) {
  return new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export type PgPool = pg.Pool;
export type PgClient = pg.PoolClient;
