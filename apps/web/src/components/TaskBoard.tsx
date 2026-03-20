import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { TaskStatus } from "@kanban/types";
import { useState } from "react";
import { getErrorMessage, moveTask, type Task } from "../api";
import { groupTasksByStatus, STATUS_COLUMNS } from "../utils/board";
import { TaskColumn } from "./TaskColumn";

type TaskBoardProps = {
  tasks: Task[];
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
  onTasksReordered: (tasks: Task[]) => void;
  onError: (error: string) => void;
};

export function TaskBoard({
  tasks,
  onTaskUpdated,
  onTaskDeleted,
  onTasksReordered,
  onError,
}: TaskBoardProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Task[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const tasksByStatus = groupTasksByStatus(tasks);

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    setActiveTaskId(active.id as string);
    setSnapshot([...tasks]);
  }

  function handleDragOver(_event: DragOverEvent) {
    // dnd-kit handles visual feedback automatically
    // We'll handle the actual reordering in handleDragEnd
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveTaskId(null);

    if (!over || active.id === over.id) {
      // Restore snapshot if dropped outside or no change
      if (snapshot) {
        onTasksReordered(snapshot);
        setSnapshot(null);
      }
      return;
    }

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) {
      if (snapshot) {
        onTasksReordered(snapshot);
        setSnapshot(null);
      }
      return;
    }

    const overId = over.id as string;
    const isOverColumn = STATUS_COLUMNS.some((col) => col.status === overId);

    let targetStatus: TaskStatus = activeTask.status;
    let targetIndex = 0;

    if (isOverColumn) {
      // Dropped on a column - move to end of that column
      targetStatus = overId as TaskStatus;
      const targetColumnTasks = tasks.filter((t) => t.status === targetStatus);
      targetIndex = targetColumnTasks.length;
    } else {
      // Dropped on another task
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) {
        if (snapshot) {
          onTasksReordered(snapshot);
          setSnapshot(null);
        }
        return;
      }

      targetStatus = overTask.status;
      const targetColumnTasks = tasks.filter((t) => t.status === targetStatus);
      const overIndex = targetColumnTasks.findIndex((t) => t.id === overId);

      // Determine insertion index
      if (activeTask.status === targetStatus) {
        // Same column reorder
        const activeIndex = targetColumnTasks.findIndex((t) => t.id === active.id);
        if (activeIndex === -1) {
          if (snapshot) {
            onTasksReordered(snapshot);
            setSnapshot(null);
          }
          return;
        }
        // If moving down, insert after; if moving up, insert before
        targetIndex = activeIndex < overIndex ? overIndex : overIndex + 1;
      } else {
        // Cross-column move - insert after the over task
        targetIndex = overIndex + 1;
      }
    }

    // Only move if something changed
    if (activeTask.status === targetStatus) {
      const currentColumnTasks = tasks.filter((t) => t.status === targetStatus);
      const currentIndex = currentColumnTasks.findIndex((t) => t.id === active.id);
      if (currentIndex === targetIndex) {
        setSnapshot(null);
        return; // No change
      }
    }

    // Call move API
    try {
      const response = await moveTask(active.id as string, {
        toStatus: targetStatus,
        toIndex: targetIndex,
      });
      onTasksReordered(response.tasks);
      setSnapshot(null);
    } catch (error) {
      onError(getErrorMessage(error));
      // Restore snapshot on error
      if (snapshot) {
        onTasksReordered(snapshot);
        setSnapshot(null);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <section className="board-grid" data-testid="task-board">
        {STATUS_COLUMNS.map((column) => (
          <TaskColumn
            key={column.status}
            status={column.status}
            label={column.label}
            tasks={tasksByStatus[column.status]}
            activeTaskId={activeTaskId}
            onTaskUpdated={onTaskUpdated}
            onTaskDeleted={onTaskDeleted}
            onError={onError}
          />
        ))}
      </section>
    </DndContext>
  );
}
