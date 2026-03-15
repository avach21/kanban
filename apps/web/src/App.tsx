import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { TaskStatus } from "@kanban/types";
import {
  ApiError,
  createTask,
  deleteTask,
  getErrorMessage,
  getTasks,
  login,
  logout,
  signup,
  updateTask,
  type Task,
} from "./api";

type AuthMode = "login" | "signup";

const STATUS_COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: "todo", label: "Todo" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function mapTaskById(tasks: Task[], updatedTask: Task) {
  return tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
}

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStatus, setCreateStatus] = useState<TaskStatus>("todo");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);

  useEffect(() => {
    void refreshTasks();
  }, []);

  const tasksByStatus = useMemo(() => {
    return {
      todo: tasks.filter((task) => task.status === "todo"),
      in_progress: tasks.filter((task) => task.status === "in_progress"),
      done: tasks.filter((task) => task.status === "done"),
    };
  }, [tasks]);

  async function refreshTasks() {
    setIsLoadingTasks(true);
    setBoardError(null);

    try {
      const response = await getTasks();
      setTasks(response.tasks);
      setIsAuthenticated(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setIsAuthenticated(false);
        setTasks([]);
      } else {
        setBoardError(getErrorMessage(error));
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoadingTasks(false);
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmittingAuth(true);
    setAuthError(null);
    setBoardError(null);

    try {
      if (authMode === "signup") {
        await signup({ email, password });
      } else {
        await login({ email, password });
      }

      setEmail("");
      setPassword("");

      const response = await getTasks();
      setTasks(response.tasks);
      setIsAuthenticated(true);
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    setBoardError(null);

    try {
      await logout();
      setIsAuthenticated(false);
      setTasks([]);
      setEditingTaskId(null);
    } catch (error) {
      setBoardError(getErrorMessage(error));
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsCreatingTask(true);
    setBoardError(null);

    try {
      const response = await createTask({
        title: createTitle,
        description: createDescription.trim() ? createDescription : null,
        status: createStatus,
      });

      setTasks((currentTasks) => [response.task, ...currentTasks]);
      setCreateTitle("");
      setCreateDescription("");
      setCreateStatus("todo");
    } catch (error) {
      setBoardError(getErrorMessage(error));
    } finally {
      setIsCreatingTask(false);
    }
  }

  async function handleMoveTask(taskId: string, status: TaskStatus) {
    setMovingTaskId(taskId);
    setBoardError(null);

    try {
      const response = await updateTask(taskId, { status });
      setTasks((currentTasks) => mapTaskById(currentTasks, response.task));
    } catch (error) {
      setBoardError(getErrorMessage(error));
    } finally {
      setMovingTaskId(null);
    }
  }

  function handleStartEdit(task: Task) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
  }

  function handleCancelEdit() {
    setEditingTaskId(null);
    setEditTitle("");
    setEditDescription("");
  }

  async function handleSaveEdit(taskId: string) {
    setIsSavingTask(true);
    setBoardError(null);

    try {
      const response = await updateTask(taskId, {
        title: editTitle,
        description: editDescription.trim() ? editDescription : null,
      });
      setTasks((currentTasks) => mapTaskById(currentTasks, response.task));
      handleCancelEdit();
    } catch (error) {
      setBoardError(getErrorMessage(error));
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleDeleteTask(taskId: string) {
    setDeletingTaskId(taskId);
    setBoardError(null);

    try {
      await deleteTask(taskId);
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
      if (editingTaskId === taskId) {
        handleCancelEdit();
      }
    } catch (error) {
      setBoardError(getErrorMessage(error));
    } finally {
      setDeletingTaskId(null);
    }
  }

  if (isAuthenticated === null || isLoadingTasks) {
    return (
      <main className="app-shell">
        <h1>Kanban MVP</h1>
        <p>Loading session...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="app-shell">
        <h1>Kanban MVP</h1>
        <section className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === "login" ? "active-tab" : ""}
              onClick={() => setAuthMode("login")}
            >
              Log In
            </button>
            <button
              type="button"
              className={authMode === "signup" ? "active-tab" : ""}
              onClick={() => setAuthMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <form className="stack" onSubmit={handleAuthSubmit}>
            <label className="stack">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="stack">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>

            {authError ? <p className="error-banner">{authError}</p> : null}
            {boardError ? <p className="error-banner">{boardError}</p> : null}

            <button type="submit" disabled={isSubmittingAuth}>
              {isSubmittingAuth
                ? "Submitting..."
                : authMode === "signup"
                  ? "Create account"
                  : "Log in"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell wide">
      <header className="app-header">
        <h1>Kanban MVP</h1>
        <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? "Logging out..." : "Log out"}
        </button>
      </header>

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

          <label className="stack">
            <span>Status</span>
            <select
              value={createStatus}
              onChange={(event) => setCreateStatus(event.target.value as TaskStatus)}
            >
              {STATUS_COLUMNS.map((column) => (
                <option key={column.status} value={column.status}>
                  {column.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={isCreatingTask}>
            {isCreatingTask ? "Creating..." : "Create task"}
          </button>
        </form>
      </section>

      {boardError ? <p className="error-banner">{boardError}</p> : null}

      <section className="board-grid">
        {STATUS_COLUMNS.map((column) => (
          <article key={column.status} className="column">
            <h2>{column.label}</h2>
            <p className="column-count">{tasksByStatus[column.status].length} tasks</p>

            <div className="task-list">
              {tasksByStatus[column.status].map((task) => {
                const isEditing = editingTaskId === task.id;
                const isDeleting = deletingTaskId === task.id;
                const isMoving = movingTaskId === task.id;

                return (
                  <section key={task.id} className="task-card">
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
                        />
                        <textarea
                          rows={3}
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                        />
                      </div>
                    ) : (
                      <>
                        <h3>{task.title}</h3>
                        {task.description ? <p>{task.description}</p> : null}
                      </>
                    )}

                    <label className="stack">
                      <span>Move to</span>
                      <select
                        value={task.status}
                        onChange={(event) =>
                          void handleMoveTask(task.id, event.target.value as TaskStatus)
                        }
                        disabled={isMoving || isSavingTask}
                      >
                        {STATUS_COLUMNS.map((statusOption) => (
                          <option key={statusOption.status} value={statusOption.status}>
                            {statusOption.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <p className="task-meta">Updated {formatDate(task.updatedAt)}</p>

                    <div className="task-actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleSaveEdit(task.id)}
                            disabled={isSavingTask}
                          >
                            {isSavingTask ? "Saving..." : "Save"}
                          </button>
                          <button type="button" onClick={handleCancelEdit} disabled={isSavingTask}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => handleStartEdit(task)}>
                          Edit
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void handleDeleteTask(task.id)}
                        disabled={isDeleting || isSavingTask}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </section>
                );
              })}

              {tasksByStatus[column.status].length === 0 ? (
                <p className="empty-column">No tasks yet.</p>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
