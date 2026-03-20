import { expect, test, type Page } from "@playwright/test";
import {
  createTask,
  deleteTask,
  editTask,
  expectAuthScreen,
  expectTaskDescription,
  expectTaskInColumn,
  expectTaskNotInColumn,
  generateTaskTitle,
  generateTestEmail,
  getTaskCard,
  logIn,
  logOut,
  moveTaskToColumn,
  openApp,
  reloadAndWaitForBoard,
  signUp,
  type TaskStatus,
} from "./helpers";

async function completeHappyPath(
  page: Page,
  testName: string,
  authenticate: () => Promise<void>,
  targetStatus: TaskStatus,
) {
  const taskTitle = generateTaskTitle(testName);
  const taskDescription = `${testName} description`;
  const updatedTitle = `${taskTitle} updated`;
  const updatedDescription = `${taskDescription} updated`;

  await authenticate();

  await createTask(page, taskTitle, taskDescription);
  await expectTaskInColumn(page, "todo", taskTitle);

  await reloadAndWaitForBoard(page);
  await expectTaskInColumn(page, "todo", taskTitle);

  await editTask(page, taskTitle, {
    title: updatedTitle,
    description: updatedDescription,
  });

  const updatedCard = getTaskCard(page, updatedTitle);
  await expect(updatedCard).toHaveCount(1);
  await expectTaskDescription(updatedCard.first(), updatedDescription);

  await moveTaskToColumn(page, updatedTitle, targetStatus);
  await expectTaskInColumn(page, targetStatus, updatedTitle);
  await expectTaskNotInColumn(page, "todo", updatedTitle);

  await deleteTask(page, updatedTitle);
}

test("new users can sign up and complete the full task lifecycle", async ({ page }) => {
  const email = generateTestEmail("happy-signup");

  await openApp(page);
  await expectAuthScreen(page);

  await completeHappyPath(
    page,
    "signup-happy-path",
    async () => {
      await signUp(page, email);
    },
    "in_progress",
  );
});

test("existing users can log in and complete the full task lifecycle", async ({ page }) => {
  const email = generateTestEmail("happy-login");

  await openApp(page);
  await signUp(page, email);
  await logOut(page);

  await completeHappyPath(
    page,
    "login-happy-path",
    async () => {
      await logIn(page, email);
    },
    "done",
  );
});

test("existing users can log in from a fresh auth screen and complete the full task lifecycle", async ({
  page,
}) => {
  const email = generateTestEmail("happy-login-reload");

  await openApp(page);
  await signUp(page, email);
  await logOut(page);
  await page.reload();
  await expectAuthScreen(page);

  await completeHappyPath(
    page,
    "login-reload-happy-path",
    async () => {
      await logIn(page, email);
    },
    "in_progress",
  );
});
