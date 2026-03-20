import { useState } from "react";
import { deleteTask, getErrorMessage, updateTask, type Task } from "../api";
import { formatDate } from "../utils/date";

type TaskCardProps = {
  task: Task;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: (taskId: string) => void;
  onError: (error: string) => void;
  isDragging?: boolean;
};

export function TaskCard({
  task,
  onTaskUpdated,
  onTaskDeleted,
  onError,
  isDragging = false,
}: TaskCardProps) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const isEditing = editingTaskId === task.id;
  const isDeleting = deletingTaskId === task.id;

  function handleStartEdit() {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
  }

  function handleCancelEdit() {
    setEditingTaskId(null);
    setEditTitle("");
    setEditDescription("");
  }

  async function handleSaveEdit() {
    setIsSavingTask(true);

    try {
      const response = await updateTask(task.id, {
        title: editTitle,
        description: editDescription.trim() ? editDescription : null,
      });
      onTaskUpdated(response.task);
      handleCancelEdit();
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleDeleteTask() {
    setDeletingTaskId(task.id);

    try {
      await deleteTask(task.id);
      onTaskDeleted(task.id);
      if (editingTaskId === task.id) {
        handleCancelEdit();
      }
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setDeletingTaskId(null);
    }
  }

  return (
    <section
      className={`task-card ${isDragging ? "dragging" : ""}`}
      data-task-id={task.id}
      data-testid="task-card"
    >
      <img
        className="task-image"
        src={task.dogImageUrl}
        alt="Dog for task"
        loading="lazy"
      />

      {isEditing ? (
        <div className="stack">
          <input
            type="text"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            data-testid="task-edit-title-input"
          />
          <textarea
            rows={3}
            value={editDescription}
            onChange={(event) => setEditDescription(event.target.value)}
            data-testid="task-edit-description-input"
          />
        </div>
      ) : (
        <>
          <h3>{task.title}</h3>
          {task.description ? <p>{task.description}</p> : null}
        </>
      )}

      <p className="task-meta">Updated {formatDate(task.updatedAt)}</p>

      <div className="task-actions">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSavingTask}
              data-testid="task-save-button"
            >
              {isSavingTask ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSavingTask}
              data-testid="task-cancel-button"
            >
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={handleStartEdit} data-testid="task-edit-button">
            Edit
          </button>
        )}

        <button
          type="button"
          onClick={handleDeleteTask}
          disabled={isDeleting || isSavingTask}
          data-testid="task-delete-button"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </section>
  );
}
