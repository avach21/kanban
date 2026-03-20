import { useEffect, useState } from "react";
import { ApiError, getTasks, type Task } from "./api";
import { AuthScreen } from "./components/AuthScreen";
import { TaskBoardPage } from "./components/TaskBoardPage";

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  useEffect(() => {
    void checkAuth();
  }, []);

  async function checkAuth() {
    setIsLoadingTasks(true);
    try {
      await getTasks();
      setIsAuthenticated(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoadingTasks(false);
    }
  }

  function handleAuthSuccess(tasks: Task[]) {
    setIsAuthenticated(true);
  }

  function handleLogout() {
    setIsAuthenticated(false);
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
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return <TaskBoardPage onLogout={handleLogout} />;
}
