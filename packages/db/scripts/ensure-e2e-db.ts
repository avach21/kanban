import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before running the E2E database setup.");
}

const parsedUrl = new URL(databaseUrl);
const databaseName = parsedUrl.pathname.replace(/^\//, "");

if (!databaseName) {
  throw new Error("DATABASE_URL must include a database name.");
}

const adminUrl = new URL(databaseUrl);
adminUrl.pathname = "/postgres";

const sql = postgres(adminUrl.toString(), {
  max: 1,
});

const escapedDatabaseName = databaseName.replaceAll('"', '""');

try {
  const [result] =
    await sql<{ exists: boolean }[]>`SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = ${databaseName}) AS exists`;

  if (!result?.exists) {
    await sql.unsafe(`CREATE DATABASE "${escapedDatabaseName}"`);
    console.log(`Created E2E database "${databaseName}".`);
  } else {
    console.log(`E2E database "${databaseName}" already exists.`);
  }
} finally {
  await sql.end();
}
