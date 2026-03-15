import { createDb, tasks } from "@kanban/db";
import type { TaskStatus } from "@kanban/types";
import { and, desc, eq } from "drizzle-orm";
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
      dogImageUrl: tasks.dogImageUrl,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt));
}

export async function createTask(userId: string, input: CreateTaskInput) {
  const db = getDb();
  const dogImageUrl = await fetchRandomDogImageUrl();

  const [createdTask] = await db
    .insert(tasks)
    .values({
      title: input.title,
      description: input.description,
      status: input.status,
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
      dogImageUrl: tasks.dogImageUrl,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    });

  return updatedTask;
}

export async function deleteTask(userId: string, taskId: string) {
  const db = getDb();

  const [deletedTask] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });

  return deletedTask;
}
