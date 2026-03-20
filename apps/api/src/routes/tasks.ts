import { Hono, type Context } from "hono";
import type { TaskStatus } from "@kanban/types";
import { requireAuth, type AppVariables } from "../auth";
import {
  createTask,
  deleteTask,
  getTasks,
  moveTask,
  parseCreateTask,
  parseUpdateTask,
  updateTask,
  type MoveTaskInput,
} from "../services/task-service";

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

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

function parseMoveTask(
  input: unknown,
): { ok: true; value: MoveTaskInput } | { ok: false; message: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const body = input as Record<string, unknown>;
  const toStatusRaw = body.toStatus;
  const toIndexRaw = body.toIndex;

  if (
    typeof toStatusRaw !== "string" ||
    !VALID_STATUSES.includes(toStatusRaw as TaskStatus)
  ) {
    return {
      ok: false,
      message: "toStatus must be todo, in_progress, or done.",
    };
  }

  if (typeof toIndexRaw !== "number" || toIndexRaw < 0) {
    return {
      ok: false,
      message: "toIndex must be a non-negative integer.",
    };
  }

  return {
    ok: true,
    value: {
      toStatus: toStatusRaw as TaskStatus,
      toIndex: Math.floor(toIndexRaw),
    },
  };
}

export const taskRoutes = new Hono<{ Variables: AppVariables }>();

taskRoutes.use("*", requireAuth);

taskRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const userTasks = await getTasks(userId);
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
    const body = await parseJsonBody(c);
    if (!body.ok) {
      return c.json({ error: body.message }, 400);
    }

    const parsed = parseCreateTask(body.value);
    if (!parsed.ok) {
      return c.json({ error: parsed.message }, 400);
    }

    const createdTask = await createTask(userId, parsed.value);

    if (!createdTask) {
      return c.json({ error: "Failed to create task." }, 500);
    }

    return c.json({ task: createdTask }, 201);
  } catch (error) {
    console.error("task create failed", error);
    return c.json({ error: "Failed to create task." }, 500);
  }
});

taskRoutes.post("/:id/move", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const taskId = c.req.param("id");
  if (!taskId) {
    return c.json({ error: "Task id is required." }, 400);
  }

  try {
    const body = await parseJsonBody(c);
    if (!body.ok) {
      return c.json({ error: body.message }, 400);
    }

    const parsed = parseMoveTask(body.value);
    if (!parsed.ok) {
      return c.json({ error: parsed.message }, 400);
    }

    const updatedTasks = await moveTask(userId, taskId, parsed.value);

    if (!updatedTasks) {
      return c.json({ error: "Task not found." }, 404);
    }

    return c.json({ tasks: updatedTasks });
  } catch (error) {
    console.error("task move failed", error);
    return c.json({ error: "Failed to move task." }, 500);
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
    const body = await parseJsonBody(c);
    if (!body.ok) {
      return c.json({ error: body.message }, 400);
    }

    const parsed = parseUpdateTask(body.value);
    if (!parsed.ok) {
      return c.json({ error: parsed.message }, 400);
    }

    const updatedTask = await updateTask(userId, taskId, parsed.value);

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
    const deletedTask = await deleteTask(userId, taskId);

    if (!deletedTask) {
      return c.json({ error: "Task not found." }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("task delete failed", error);
    return c.json({ error: "Failed to delete task." }, 500);
  }
});
