import type { TaskStatus } from "@kanban/types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

type AuthPayload = {
  email: string;
  password: string;
};

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dogImageUrl: string;
  createdAt: string;
  updatedAt: string;
};

type TaskResponse = {
  task: Task;
};

type TasksResponse = {
  tasks: Task[];
};

type ApiErrorPayload = {
  error?: unknown;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: ApiRequestOptions = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;

  if (!response.ok) {
    const message =
      typeof payload.error === "string"
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export async function signup(payload: AuthPayload) {
  return request<{ user: { id: string; email: string } }>("/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export async function login(payload: AuthPayload) {
  return request<{ user: { id: string; email: string } }>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export async function logout() {
  return request<{ success: boolean }>("/auth/logout", {
    method: "POST",
  });
}

export async function getTasks() {
  return request<TasksResponse>("/tasks");
}

export async function createTask(payload: {
  title: string;
  description: string | null;
  status: TaskStatus;
}) {
  return request<TaskResponse>("/tasks", {
    method: "POST",
    body: payload,
  });
}

export async function updateTask(
  taskId: string,
  payload: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
  },
) {
  return request<TaskResponse>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteTask(taskId: string) {
  return request<{ success: boolean }>(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error.";
}
