import { createDb, tasks } from "@kanban/db";
import type { TaskStatus } from "@kanban/types";
import { and, asc, desc, eq, gt, max } from "drizzle-orm";
import { fetchRandomDogImageUrl } from "./dog-api";

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];

let dbClient: ReturnType<typeof createDb> | null = null;

function getDb() {
  if (!dbClient) {
    dbClient = createDb();
  }
  return dbClient;
}

export type CreateTaskInput = {
  title: string;
  description: string | null;
  status: TaskStatus;
};

export type UpdateTaskInput = {
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

export function parseCreateTask(
  input: unknown,
): { ok: true; value: CreateTaskInput } | { ok: false; message: string } {
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
    if (
      typeof statusRaw !== "string" ||
      !VALID_STATUSES.includes(statusRaw as TaskStatus)
    ) {
      return {
        ok: false,
        message: "Status must be todo, in_progress, or done.",
      };
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

export function parseUpdateTask(
  input: unknown,
): { ok: true; value: UpdateTaskInput } | { ok: false; message: string } {
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
      return {
        ok: false,
        message: "Status must be todo, in_progress, or done.",
      };
    }
    updates.status = body.status as TaskStatus;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, message: "Provide at least one field to update." };
  }

  return { ok: true, value: updates };
}

export async function getTasks(userId: string) {
  const db = getDb();

  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      position: tasks.position,
      dogImageUrl: tasks.dogImageUrl,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.status), asc(tasks.position));
}

export async function createTask(userId: string, input: CreateTaskInput) {
  const db = getDb();
  const dogImageUrl = await fetchRandomDogImageUrl();

  // Get the max position for this user/status to assign the next position
  const [maxPositionResult] = await db
    .select({ maxPosition: max(tasks.position) })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.status, input.status)));

  const nextPosition = (maxPositionResult?.maxPosition ?? -1) + 1;

  const [createdTask] = await db
    .insert(tasks)
    .values({
      title: input.title,
      description: input.description,
      status: input.status,
      position: nextPosition,
      dogImageUrl,
      userId,
      updatedAt: new Date(),
    })
    .returning({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      position: tasks.position,
      dogImageUrl: tasks.dogImageUrl,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    });

  return createdTask;
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: UpdateTaskInput,
) {
  const db = getDb();

  const [updatedTask] = await db
    .update(tasks)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      position: tasks.position,
      dogImageUrl: tasks.dogImageUrl,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    });

  return updatedTask;
}

export type MoveTaskInput = {
  toStatus: TaskStatus;
  toIndex: number;
};

export async function moveTask(
  userId: string,
  taskId: string,
  input: MoveTaskInput,
) {
  const db = getDb();

  // Get the current task
  const [currentTask] = await db
    .select({
      id: tasks.id,
      status: tasks.status,
      position: tasks.position,
    })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

  if (!currentTask) {
    return undefined;
  }

  const { toStatus, toIndex } = input;
  const isSameColumn = currentTask.status === toStatus;

  if (isSameColumn) {
    // Same-column reorder: shift positions
    const currentPos = currentTask.position;
    const targetPos = toIndex;

    if (currentPos === targetPos) {
      // No change needed
      return await getTasks(userId);
    }

    // Get all tasks in this column ordered by position
    const columnTasks = await db
      .select({ id: tasks.id, position: tasks.position })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.status, toStatus)))
      .orderBy(asc(tasks.position));

    // Remove the moving task from the list
    const tasksWithoutMoving = columnTasks.filter((t) => t.id !== taskId);
    // Insert it at the target position
    const reordered = [
      ...tasksWithoutMoving.slice(0, toIndex),
      { id: taskId, position: targetPos },
      ...tasksWithoutMoving.slice(toIndex),
    ];

    // Update positions sequentially (dense reordering)
    for (let i = 0; i < reordered.length; i++) {
      await db
        .update(tasks)
        .set({ position: i, updatedAt: new Date() })
        .where(eq(tasks.id, reordered[i].id));
    }
  } else {
    // Cross-column move: shift source column, insert into target column
    // First, shift positions in source column (remove gap)
    const sourceTasks = await db
      .select({ id: tasks.id, position: tasks.position })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, currentTask.status),
          gt(tasks.position, currentTask.position),
        ),
      )
      .orderBy(asc(tasks.position));

    // Decrement positions in source column
    for (const task of sourceTasks) {
      await db
        .update(tasks)
        .set({ position: task.position - 1, updatedAt: new Date() })
        .where(eq(tasks.id, task.id));
    }

    // Get target column tasks
    const targetTasks = await db
      .select({ id: tasks.id, position: tasks.position })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.status, toStatus)))
      .orderBy(asc(tasks.position));

    // Shift target column to make room
    const tasksToShift = targetTasks.filter((t) => t.position >= toIndex);
    for (const task of tasksToShift) {
      await db
        .update(tasks)
        .set({ position: task.position + 1, updatedAt: new Date() })
        .where(eq(tasks.id, task.id));
    }

    // Move the task to target column and position
    await db
      .update(tasks)
      .set({
        status: toStatus,
        position: toIndex,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));
  }

  // Return all tasks in their new order
  return await getTasks(userId);
}

export async function deleteTask(userId: string, taskId: string) {
  const db = getDb();

  const [deletedTask] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });

  return deletedTask;
}
