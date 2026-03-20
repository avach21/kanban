---
name: E2E Playwright Tests
overview: "Add Playwright E2E tests for the kanban app: configure Playwright, implement 3 full happy-path tests (signup/login flows), 1 auth flow test, and 3 task persistence tests. Use a separate test database for isolation."
todos: []
isProject: false
---

# E2E Playwright Tests for Kanban App

## Architecture

```mermaid
flowchart TB
    subgraph E2E [E2E Test Run]
        PW[Playwright]
    end
    subgraph Servers [Test Servers]
        Web[Web :5173]
        API[API :3001]
    end
    subgraph DB [Database]
        TestDB[(kanban_test)]
    end
    PW -->|HTTP| Web
    Web -->|API calls| API
    API --> TestDB
```

- **Web**: Vite dev server on port 5173
- **API**: Bun/Hono server on port 3001
- **Database**: Separate `kanban_test` DB for isolation (recommended over shared dev DB to avoid test pollution and flakiness)

---

## 1. Playwright Setup

**Location**: Root of monorepo (`/Users/ava/kanban/`) so tests can target the web app and orchestrate both servers.

**Files to create**:

- `playwright.config.ts` – base URL `http://localhost:5173`, `webServer` to start `bun run dev` (or `dev:web` + `dev:api` in parallel)
- `package.json` scripts: `e2e`, `e2e:ui`, `e2e:headed`
- `apps/web/package.json`: add `@playwright/test` as devDep (or at root if preferred)

**Config details**:

- `webServer`: Run `bun run dev` from root; wait for `http://localhost:5173` and `http://localhost:3001/health` before tests
- `use.baseURL`: `http://localhost:5173`
- `use.credentials`: `{ cookies: [], origins: [] }` – tests will sign up/login to get session cookies
- `testDir`: `e2e` or `apps/web/e2e`
- `fullyParallel`: `false` if tests share DB state; `true` if each test uses unique user (recommended: unique emails per test)

**Database**:

- Add `DATABASE_URL` override for E2E: `postgres://postgres:postgres@localhost:5432/kanban_test`
- Create `kanban_test` DB and run migrations before E2E (document in README or add `e2e:setup` script)
- Use unique emails per test: `test-${Date.now()}-${random}@e2e.test` to avoid conflicts when parallel

---

## 2. Test Helpers and Fixtures

**File**: `e2e/fixtures/auth.ts` or `e2e/helpers.ts`

- `generateTestEmail()` → unique email for signup
- `signUp(page, email, password)` – fill auth form, submit, wait for board
- `logIn(page, email, password)` – same
- `createTask(page, title, description?)` – fill create form, submit, return task title for assertions
- `getTaskCard(page, title)` – locator for task card by title
- `reloadAndWaitForBoard(page)` – reload, wait for board to load

---

## 3. Test Structure (7 tests)

### 3.1 Auth Flow Test (1)

**File**: `e2e/auth.spec.ts`

| Step | Action                                                      |
| ---- | ----------------------------------------------------------- |
| 1    | Go to `/`                                                   |
| 2    | Sign up with unique email + password                        |
| 3    | Assert: board visible (e.g. "Create task" section, columns) |
| 4    | Log out (click "Log out")                                   |
| 5    | Assert: AuthScreen (login/signup tabs)                      |
| 6    | Log in with same email + password                           |
| 7    | Assert: board visible again                                 |

**Selectors** (from [AuthScreen.tsx](apps/web/src/components/AuthScreen.tsx), [TaskBoardPage.tsx](apps/web/src/components/TaskBoardPage.tsx)):

- Auth: `input[type="email"]`, `input[type="password"]`, `button:has-text("Create account")` / `button:has-text("Log in")`, tab `button:has-text("Sign Up")`
- Logout: `button:has-text("Log out")`
- Board: `section.create-task-card`, `h2:has-text("Create task")`

---

### 3.2 Full Happy-Path Tests (3)

**File**: `e2e/happy-path.spec.ts`

Each test runs: **auth → create task → task on board → reload → task persists → update task → move task → delete task**.

| Test                 | Auth Method                                            |
| -------------------- | ------------------------------------------------------ |
| `happy-path-signup`  | Sign up (new user)                                     |
| `happy-path-login-1` | Log in (user created in signup test or fixture)        |
| `happy-path-login-2` | Log in (another user, created via signup in same test) |

**Flow details**:

1. **Auth**: Sign up or log in (unique email per test)
2. **Create**: Fill title "E2E Task X", optional description, submit
3. **Assert**: Task card with `data-task-id` and title visible in Todo column
4. **Reload**: `page.reload()`, wait for board
5. **Assert**: Same task still visible
6. **Update**: Click Edit on card, change title to "E2E Task X Updated", Save
7. **Assert**: New title visible
8. **Move**: Drag task from Todo to "In Progress" (or Done) – use `page.dragAndDrop()` or `locator.dragTo()` targeting column droppable `[data-droppable-id="in_progress"]` or similar; dnd-kit uses `status` as droppable id
9. **Assert**: Task in new column
10. **Delete**: Click Delete on card
11. **Assert**: Task no longer visible

**Drag-and-drop**: [TaskBoard.tsx](apps/web/src/components/TaskBoard.tsx) uses `@dnd-kit`. Columns use `useDroppable({ id: status })` with `status` = `todo`, `in_progress`, `done`. Playwright `locator.dragTo()` may work; if not, use `page.mouse` events or consider a "Move" button fallback. dnd-kit typically uses `data-dnd-kit-` or similar; verify droppable selectors in DOM.

---

### 3.3 Task Persistence Tests (3)

**File**: `e2e/persistence.spec.ts`

Each test: **auth → action → reload → assert persistence**.

| Test                 | Action                                     | Assertion After Reload     |
| -------------------- | ------------------------------------------ | -------------------------- |
| `persistence-create` | Create task                                | Task still visible in Todo |
| `persistence-update` | Create task, then update title/description | Updated content visible    |
| `persistence-move`   | Create task, move to In Progress           | Task in In Progress column |

**Setup**: Each test signs up (or logs in) with unique email, creates a task, performs the action, reloads, then asserts.

---

## 4. Key Selectors Reference

| Element                 | Selector                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Email input             | `input[type="email"]`                                                                                   |
| Password input          | `input[type="password"]`                                                                                |
| Submit (auth)           | `button[type="submit"]` or `button:has-text("Create account")` / `button:has-text("Log in")`            |
| Auth tabs               | `button:has-text("Log In")`, `button:has-text("Sign Up")`                                               |
| Create task title       | `section.create-task-card input[type="text"]`                                                           |
| Create task description | `section.create-task-card textarea`                                                                     |
| Create task submit      | `section.create-task-card button:has-text("Create task")`                                               |
| Task card               | `section.task-card[data-task-id]` or `section.task-card:has-text("TITLE")`                              |
| Edit button             | `section.task-card button:has-text("Edit")`                                                             |
| Save button             | `section.task-card button:has-text("Save")`                                                             |
| Delete button           | `section.task-card button:has-text("Delete")`                                                           |
| Log out                 | `button:has-text("Log out")`                                                                            |
| Columns                 | `article.column` with `h2:has-text("Todo")`, `h2:has-text("In Progress")`, `h2:has-text("Done")`        |
| Drag handle             | `.drag-handle` (wraps TaskCard in [SortableTaskCard.tsx](apps/web/src/components/SortableTaskCard.tsx)) |

---

## 5. Database Setup for E2E

**Recommendation**: Use `kanban_test` database.

1. Create DB: `createdb kanban_test` (or `psql -c "CREATE DATABASE kanban_test"`)
2. Migrate: `DATABASE_URL=postgres://.../kanban_test bun run db:migrate`
3. In `playwright.config.ts` or `e2e` setup: ensure API is started with `DATABASE_URL=...kanban_test` when running E2E

**Option**: Add `e2e:setup` script that creates DB and runs migrations. Document in README.

---

## 6. File Layout

```
kanban/
├── playwright.config.ts
├── package.json          # add e2e scripts, @playwright/test
├── e2e/
│   ├── fixtures/
│   │   └── auth.ts       # signUp, logIn, createTask helpers
│   ├── auth.spec.ts
│   ├── happy-path.spec.ts
│   └── persistence.spec.ts
└── apps/web/
    └── package.json      # or @playwright/test here
```

---

## 7. Execution Order and Isolation

- Use **unique emails per test** to avoid conflicts: `test-${crypto.randomUUID()}@e2e.test`
- Run tests **sequentially** (`fullyParallel: false`) if DB is shared and tests might race; or keep parallel with unique users
- Consider `beforeEach` to reset or use `test.beforeAll` to create a shared user for login tests

---

## 8. Risks and Edge Cases

- **Drag-and-drop**: `@dnd-kit` may not play well with Playwright's `dragTo`. Fallback: add a "Move to..." dropdown/button for E2E if drag is flaky.
- **Dog API**: Task creation fetches dog image from external API. Mock or ensure network allows it; slow responses could cause timeouts.
- **Session cookies**: `credentials: "include"` – ensure `baseURL` matches CORS origin so cookies are sent.

---

## 9. Implementation Order

1. Add Playwright and config
2. Add `e2e:setup` / DB setup docs
3. Implement auth helpers and auth flow test
4. Implement happy-path tests (including drag-and-drop)
5. Implement persistence tests
6. Add `e2e` script to root `package.json` and verify CI/local run
