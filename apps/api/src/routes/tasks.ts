import { createDb, tasks } from "@kanban/db";
import type { TaskStatus } from "@kanban/types";
import { and, desc, eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { requireAuth, type AppVariables } from "../auth";
import { fetchRandomDogImageUrl } from "../services/dog-api";

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

let dbClient: ReturnType<typeof createDb> | null = null;

function getDb() {
  if (!dbClient) {
    dbClient = createDb();
  }
  return dbClient;
}

type CreateTaskInput = {
  title: string;
  description: string | null;
  status: TaskStatus;
};

type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
};

function normalizeDescription(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCreateTask(input: unknown):
  | { ok: true; value: CreateTaskInput }
  | { ok: false; message: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const body = input as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const descriptionRaw =
    typeof body.description === "string" || body.description === null
      ? body.description
      : undefined;
  const statusRaw = body.status;

  if (!title) {
    return { ok: false, message: "Title is required." };
  }

  if (descriptionRaw === undefined && body.description !== undefined) {
    return { ok: false, message: "Description must be a string or null." };
  }

  let status: TaskStatus = "todo";
  if (statusRaw !== undefined) {
    if (typeof statusRaw !== "string" || !VALID_STATUSES.includes(statusRaw as TaskStatus)) {
      return { ok: false, message: "Status must be todo, in_progress, or done." };
    }
    status = statusRaw as TaskStatus;
  }

  return {
    ok: true,
    value: {
      title,
      description: normalizeDescription(descriptionRaw) ?? null,
      status,
    },
  };
}

function parseUpdateTask(input: unknown):
  | { ok: true; value: UpdateTaskInput }
  | { ok: false; message: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const body = input as Record<string, unknown>;
  const updates: UpdateTaskInput = {};

  if ("title" in body) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return { ok: false, message: "Title must be a non-empty string." };
    }
    updates.title = body.title.trim();
  }

  if ("description" in body) {
    if (typeof body.description !== "string" && body.description !== null) {
      return { ok: false, message: "Description must be a string or null." };
    }
    updates.description = normalizeDescription(body.description);
  }

  if ("status" in body) {
    if (
      typeof body.status !== "string" ||
      !VALID_STATUSES.includes(body.status as TaskStatus)
    ) {
      return { ok: false, message: "Status must be todo, in_progress, or done." };
    }
    updates.status = body.status as TaskStatus;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, message: "Provide at least one field to update." };
  }

  return { ok: true, value: updates };
}

async function parseJsonBody(c: Context<{ Variables: AppVariables }>) {
  try {
    const body = await c.req.json();
    return { ok: true as const, value: body as unknown };
  } catch {
    return {
      ok: false as const,
      message: "Request body must be valid JSON.",
    };
  }
}

export const taskRoutes = new Hono<{ Variables: AppVariables }>();

taskRoutes.use("*", requireAuth);

taskRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDb();

    const userTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        dogImageUrl: tasks.dogImageUrl,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));

    return c.json({ tasks: userTasks });
  } catch (error) {
    console.error("tasks list failed", error);
    return c.json({ error: "Failed to load tasks." }, 500);
  }
});

taskRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDb();

    const body = await parseJsonBody(c);
    if (!body.ok) {
      return c.json({ error: body.message }, 400);
    }

    const parsed = parseCreateTask(body.value);
    if (!parsed.ok) {
      return c.json({ error: parsed.message }, 400);
    }

    let dogImageUrl: string;
    try {
      dogImageUrl = await fetchRandomDogImageUrl();
    } catch (error) {
      console.error("dog api fetch failed", error);
      return c.json({ error: "Failed to fetch dog image." }, 502);
    }

    const [createdTask] = await db
      .insert(tasks)
      .values({
        title: parsed.value.title,
        description: parsed.value.description,
        status: parsed.value.status,
        dogImageUrl,
        userId,
        updatedAt: new Date(),
      })
      .returning({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        dogImageUrl: tasks.dogImageUrl,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      });

    if (!createdTask) {
      return c.json({ error: "Failed to create task." }, 500);
    }

    return c.json({ task: createdTask }, 201);
  } catch (error) {
    console.error("task create failed", error);
    return c.json({ error: "Failed to create task." }, 500);
  }
});

taskRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const taskId = c.req.param("id");
  if (!taskId) {
    return c.json({ error: "Task id is required." }, 400);
  }

  try {
    const db = getDb();

    const body = await parseJsonBody(c);
    if (!body.ok) {
      return c.json({ error: body.message }, 400);
    }

    const parsed = parseUpdateTask(body.value);
    if (!parsed.ok) {
      return c.json({ error: parsed.message }, 400);
    }

    const [updatedTask] = await db
      .update(tasks)
      .set({
        ...parsed.value,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        dogImageUrl: tasks.dogImageUrl,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      });

    if (!updatedTask) {
      return c.json({ error: "Task not found." }, 404);
    }

    return c.json({ task: updatedTask });
  } catch (error) {
    console.error("task update failed", error);
    return c.json({ error: "Failed to update task." }, 500);
  }
});

taskRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const taskId = c.req.param("id");
  if (!taskId) {
    return c.json({ error: "Task id is required." }, 400);
  }

  try {
    const db = getDb();

    const [deletedTask] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning({ id: tasks.id });

    if (!deletedTask) {
      return c.json({ error: "Task not found." }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("task delete failed", error);
    return c.json({ error: "Failed to delete task." }, 500);
  }
});
