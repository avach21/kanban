import { test } from "@playwright/test";
import {
  createTask,
  editTask,
  expectAuthScreen,
  expectTaskDescription,
  expectTaskInColumn,
  expectTaskNotInColumn,
  generateTaskTitle,
  generateTestEmail,
  getTaskCard,
  moveTaskToColumn,
  openApp,
  reloadAndWaitForBoard,
  signUp,
} from "./helpers";

test("created tasks persist after a page reload", async ({ page }) => {
  const email = generateTestEmail("persist-create");
  const taskTitle = generateTaskTitle("persist-create");

  await openApp(page);
  await expectAuthScreen(page);
  await signUp(page, email);

  await createTask(page, taskTitle, "created task description");
  await expectTaskInColumn(page, "todo", taskTitle);

  await reloadAndWaitForBoard(page);
  await expectTaskInColumn(page, "todo", taskTitle);
});

test("updated task content persists after a page reload", async ({ page }) => {
  const email = generateTestEmail("persist-update");
  const taskTitle = generateTaskTitle("persist-update");
  const updatedTitle = `${taskTitle} updated`;
  const updatedDescription = "updated task description";

  await openApp(page);
  await expectAuthScreen(page);
  await signUp(page, email);

  await createTask(page, taskTitle, "original description");
  await editTask(page, taskTitle, {
    title: updatedTitle,
    description: updatedDescription,
  });

  await reloadAndWaitForBoard(page);
  await expectTaskInColumn(page, "todo", updatedTitle);
  await expectTaskDescription(getTaskCard(page, updatedTitle).first(), updatedDescription);
});

test("moved tasks persist in their new column after a page reload", async ({ page }) => {
  const email = generateTestEmail("persist-move");
  const taskTitle = generateTaskTitle("persist-move");

  await openApp(page);
  await expectAuthScreen(page);
  await signUp(page, email);

  await createTask(page, taskTitle, "move persistence");
  await moveTaskToColumn(page, taskTitle, "in_progress");
  await expectTaskInColumn(page, "in_progress", taskTitle);
  await expectTaskNotInColumn(page, "todo", taskTitle);

  await reloadAndWaitForBoard(page);
  await expectTaskInColumn(page, "in_progress", taskTitle);
  await expectTaskNotInColumn(page, "todo", taskTitle);
});
