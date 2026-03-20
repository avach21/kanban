import { useState, type FormEvent } from "react";
import { createTask, getErrorMessage, type Task } from "../api";

type CreateTaskFormProps = {
  onTaskCreated: (task: Task) => void;
  onError: (error: string) => void;
};

export function CreateTaskForm({ onTaskCreated, onError }: CreateTaskFormProps) {
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsCreatingTask(true);

    try {
      const response = await createTask({
        title: createTitle,
        description: createDescription.trim() ? createDescription : null,
      });

      onTaskCreated(response.task);
      setCreateTitle("");
      setCreateDescription("");
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setIsCreatingTask(false);
    }
  }

  return (
    <section className="create-task-card">
      <h2>Create task</h2>
      <form className="stack" onSubmit={handleCreateTask}>
        <label className="stack">
          <span>Title</span>
          <input
            type="text"
            value={createTitle}
            onChange={(event) => setCreateTitle(event.target.value)}
            required
          />
        </label>

        <label className="stack">
          <span>Description (optional)</span>
          <textarea
            value={createDescription}
            onChange={(event) => setCreateDescription(event.target.value)}
            rows={3}
          />
        </label>

        <button type="submit" disabled={isCreatingTask}>
          {isCreatingTask ? "Creating..." : "Create task"}
        </button>
      </form>
    </section>
  );
}
