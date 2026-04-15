import { Hono } from "hono";
import { cors } from "hono/cors";
import { type AppVariables, sessionMiddleware } from "./auth";
import { authRoutes } from "./routes/auth";
import { taskRoutes } from "./routes/tasks";

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
app.route("/tasks", taskRoutes);

const port = Number(process.env.API_PORT ?? 3001);
const hostname = process.env.API_HOST ?? "0.0.0.0";

console.log(`API listening on http://${hostname}:${port}`);

Bun.serve({
  hostname,
  port,
  fetch: app.fetch,
});
