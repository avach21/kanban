import { useEffect, useState } from "react";
import { ApiError, getErrorMessage, getTasks, type Task } from "../api";
import { mapTaskById } from "../utils/board";
import { CreateTaskForm } from "./CreateTaskForm";
import { TaskBoard } from "./TaskBoard";

type TaskBoardPageProps = {
  onLogout: () => void;
};

export function TaskBoardPage({ onLogout }: TaskBoardPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    void refreshTasks();
  }, []);

  async function refreshTasks() {
    setIsLoadingTasks(true);
    setBoardError(null);

    try {
      const response = await getTasks();
      setTasks(response.tasks);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onLogout();
      } else {
        setBoardError(getErrorMessage(error));
      }
    } finally {
      setIsLoadingTasks(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    setBoardError(null);

    try {
      const logout = await import("../api").then((m) => m.logout);
      await logout();
      onLogout();
    } catch (error) {
      setBoardError(getErrorMessage(error));
    } finally {
      setIsLoggingOut(false);
    }
  }

  function handleTaskCreated(task: Task) {
    setTasks((currentTasks) => [task, ...currentTasks]);
  }

  function handleTaskUpdated(task: Task) {
    setTasks((currentTasks) => mapTaskById(currentTasks, task));
  }

  function handleTaskDeleted(taskId: string) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
  }

  function handleTasksReordered(newTasks: Task[]) {
    setTasks(newTasks);
  }

  function handleError(error: string) {
    setBoardError(error);
  }

  if (isLoadingTasks) {
    return (
      <main className="app-shell wide">
        <h1>Kanban MVP</h1>
        <p>Loading tasks...</p>
      </main>
    );
  }

  return (
    <main className="app-shell wide" data-testid="task-board-page">
      <header className="app-header">
        <h1>Kanban MVP</h1>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          data-testid="logout-button"
        >
          {isLoggingOut ? "Logging out..." : "Log out"}
        </button>
      </header>

      <CreateTaskForm onTaskCreated={handleTaskCreated} onError={handleError} />

      {boardError ? <p className="error-banner">{boardError}</p> : null}

      <TaskBoard
        tasks={tasks}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
        onTasksReordered={handleTasksReordered}
        onError={handleError}
      />
    </main>
  );
}
