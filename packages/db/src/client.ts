import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DEV_FALLBACK_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/kanban";

export function createDb(connectionString = process.env.DATABASE_URL) {
  const resolvedConnectionString =
    connectionString ??
    (process.env.NODE_ENV === "production" ? undefined : DEV_FALLBACK_DATABASE_URL);

  if (!resolvedConnectionString) {
    throw new Error("DATABASE_URL is required to create a database client.");
  }

  const client = postgres(resolvedConnectionString);
  return drizzle(client, { schema });
}
