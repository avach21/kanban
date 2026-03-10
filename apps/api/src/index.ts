import { Hono } from "hono";
import { cors } from "hono/cors";
import { type AppVariables, sessionMiddleware } from "./auth";
import { authRoutes } from "./routes/auth";

const app = new Hono<{ Variables: AppVariables }>();

app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.use("*", sessionMiddleware);

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.route("/auth", authRoutes);

const port = Number(process.env.API_PORT ?? 3001);

console.log(`API listening on http://localhost:${port}`);

Bun.serve({
  port,
  fetch: app.fetch,
});
