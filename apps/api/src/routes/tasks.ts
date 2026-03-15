import { Hono, type Context } from "hono";
import { requireAuth, type AppVariables } from "../auth";
import {
  createTask,
  deleteTask,
  getTasks,
  parseCreateTask,
  parseUpdateTask,
  updateTask,
} from "../services/task-service";

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
