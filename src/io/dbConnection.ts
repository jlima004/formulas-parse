import { createPool, type Pool } from "mysql2/promise";
import { getMysqlConfig } from "../config/env.js";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (pool) {
    return pool;
  }

  const config = getMysqlConfig();

  pool = createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    namedPlaceholders: true,
    charset: "utf8mb4",
    timezone: "Z",
  });

  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
}
