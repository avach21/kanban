import { expect, type Locator, type Page } from "@playwright/test";

export type TaskStatus = "todo" | "in_progress" | "done";

export const TEST_PASSWORD = "password123";

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateTestEmail(prefix = "user") {
  return `${prefix}-${uniqueSuffix()}@e2e.test`;
}

export function generateTaskTitle(prefix = "task") {
  return `${prefix}-${uniqueSuffix()}`;
}

export function getColumn(page: Page, status: TaskStatus) {
  return page.getByTestId(`task-column-${status}`);
}

export function getTaskCard(page: Page, title: string) {
  return page.getByTestId("task-card").filter({ hasText: title });
}

export function getTaskCardInColumn(page: Page, status: TaskStatus, title: string) {
  return getColumn(page, status).getByTestId("task-card").filter({ hasText: title });
}

export async function openApp(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kanban MVP" })).toBeVisible();
}

export async function expectAuthScreen(page: Page) {
  await expect(page.getByTestId("auth-screen")).toBeVisible();
  await expect(page.getByTestId("auth-form")).toBeVisible();
}

export async function expectBoard(page: Page) {
  await expect(page.getByTestId("task-board-page")).toBeVisible();
  await expect(page.getByTestId("create-task-form")).toBeVisible();
  await expect(page.getByTestId("task-board")).toBeVisible();
}

export async function signUp(page: Page, email: string, password = TEST_PASSWORD) {
  await page.getByTestId("auth-tab-signup").click();
  await page.getByTestId("auth-email-input").fill(email);
  await page.getByTestId("auth-password-input").fill(password);
  await page.getByTestId("auth-submit-button").click();
  await expectBoard(page);
}

export async function logIn(page: Page, email: string, password = TEST_PASSWORD) {
  await page.getByTestId("auth-tab-login").click();
  await page.getByTestId("auth-email-input").fill(email);
  await page.getByTestId("auth-password-input").fill(password);
  await page.getByTestId("auth-submit-button").click();
  await expectBoard(page);
}

export async function logOut(page: Page) {
  await page.getByTestId("logout-button").click();
  await expectAuthScreen(page);
}

export async function createTask(page: Page, title: string, description?: string) {
  await page.getByTestId("create-task-title-input").fill(title);
  await page
    .getByTestId("create-task-description-input")
    .fill(description ?? "");
  await page.getByTestId("create-task-submit-button").click();
  await expect(getTaskCard(page, title)).toHaveCount(1);
}

export async function editTask(
  page: Page,
  currentTitle: string,
  updates: { title?: string; description?: string | null },
) {
  const card = getTaskCard(page, currentTitle);
  await expect(card).toHaveCount(1);

  const taskId = await card.first().getAttribute("data-task-id");
  if (!taskId) {
    throw new Error(`Could not resolve a stable task id for "${currentTitle}".`);
  }

  const stableCard = page.locator(`[data-task-id="${taskId}"]`);
  await stableCard.getByTestId("task-edit-button").click();
  await expect(stableCard.getByTestId("task-edit-title-input")).toBeVisible();

  if (updates.title !== undefined) {
    await stableCard.getByTestId("task-edit-title-input").fill(updates.title);
  }

  if (updates.description !== undefined) {
    await stableCard
      .getByTestId("task-edit-description-input")
      .fill(updates.description ?? "");
  }

  await stableCard.getByTestId("task-save-button").click();
}

export async function deleteTask(page: Page, title: string) {
  const card = getTaskCard(page, title);
  await expect(card).toHaveCount(1);
  await card.getByTestId("task-delete-button").click();
  await expect(getTaskCard(page, title)).toHaveCount(0);
}

export async function expectTaskInColumn(page: Page, status: TaskStatus, title: string) {
  await expect(getTaskCardInColumn(page, status, title)).toHaveCount(1);
}

export async function expectTaskNotInColumn(page: Page, status: TaskStatus, title: string) {
  await expect(getTaskCardInColumn(page, status, title)).toHaveCount(0);
}

export async function reloadAndWaitForBoard(page: Page) {
  await page.reload();
  await expectBoard(page);
}

export async function moveTaskToColumn(page: Page, title: string, status: TaskStatus) {
  const handle = page.getByTestId("task-drag-handle").filter({ hasText: title });
  const targetColumn = getColumn(page, status);

  await expect(handle).toHaveCount(1);
  await expect(targetColumn).toBeVisible();
  await handle.scrollIntoViewIfNeeded();
  await targetColumn.scrollIntoViewIfNeeded();

  const sourceBox = await handle.first().boundingBox();
  const targetBox = await targetColumn.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error(`Could not calculate drag coordinates for "${title}".`);
  }

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + Math.min(targetBox.height / 2, 160);

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await page.mouse.move(sourceX + 24, sourceY + 24, { steps: 5 });
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.mouse.up();
}

export async function expectTaskDescription(card: Locator, description: string) {
  await expect(card).toContainText(description);
}
