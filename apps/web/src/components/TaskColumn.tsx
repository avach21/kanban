import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { TaskStatus } from "@kanban/types";
import type { Task } from "../api";
import { SortableTaskCard } from "./SortableTaskCard";

type TaskColumnProps = {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  activeTaskId: string | null;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
  onError: (error: string) => void;
};

export function TaskColumn({
  status,
  label,
  tasks,
  activeTaskId,
  onTaskUpdated,
  onTaskDeleted,
  onError,
}: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const taskIds = tasks.map((task) => task.id);

  return (
    <article
      ref={setNodeRef}
      className={`column ${isOver ? "drag-over" : ""}`}
    >
      <h2>{label}</h2>
      <p className="column-count">{tasks.length} tasks</p>

      <div className="task-list">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onTaskUpdated={onTaskUpdated}
              onTaskDeleted={onTaskDeleted}
              onError={onError}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 ? (
          <p className="empty-column">No tasks yet.</p>
        ) : null}
      </div>
    </article>
  );
}
