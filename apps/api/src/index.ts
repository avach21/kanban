import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

const port = Number(process.env.API_PORT ?? 3001);

console.log(`API listening on http://localhost:${port}`);

Bun.serve({
  port,
  fetch: app.fetch,
});
