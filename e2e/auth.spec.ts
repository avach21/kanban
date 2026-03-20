import { test } from "@playwright/test";
import {
  expectAuthScreen,
  expectBoard,
  generateTestEmail,
  logIn,
  logOut,
  openApp,
  reloadAndWaitForBoard,
  signUp,
} from "./helpers";

test("user can sign up, keep the session after reload, log out, and log back in", async ({
  page,
}) => {
  const email = generateTestEmail("auth");

  await openApp(page);
  await expectAuthScreen(page);

  await signUp(page, email);
  await reloadAndWaitForBoard(page);
  await logOut(page);
  await logIn(page, email);
  await expectBoard(page);
});
