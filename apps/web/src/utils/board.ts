import type { TaskStatus } from "@kanban/types";
import type { Task } from "../api";

export const STATUS_COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: "todo", label: "Todo" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

export function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const grouped: Record<TaskStatus, Task[]> = {
    todo: [],
    in_progress: [],
    done: [],
  };

  for (const task of tasks) {
    grouped[task.status].push(task);
  }

  // Sort each group by position
  for (const status of STATUS_COLUMNS) {
    grouped[status.status].sort((a, b) => a.position - b.position);
  }

  return grouped;
}

export function mapTaskById(tasks: Task[], updatedTask: Task): Task[] {
  return tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
}
