import { createDb, users } from "@kanban/db";
import { eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import {
  clearAuthSession,
  hashPassword,
  setAuthSession,
  type AppVariables,
  verifyPassword,
} from "../auth";

const db = createDb();

type Credentials = {
  email: string;
  password: string;
};

function parseCredentials(input: unknown):
  | { ok: true; value: Credentials }
  | { ok: false; message: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const body = input as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !email.includes("@")) {
    return { ok: false, message: "A valid email is required." };
  }

  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  return { ok: true, value: { email, password } };
}

export const authRoutes = new Hono<{ Variables: AppVariables }>();

async function parseCredentialsFromRequest(c: Context<{ Variables: AppVariables }>) {
  try {
    const body = await c.req.json();
    const parsed = parseCredentials(body);
    if (!parsed.ok) {
      return { ok: false as const, status: 400 as const, message: parsed.message };
    }
    return { ok: true as const, value: parsed.value };
  } catch {
    return {
      ok: false as const,
      status: 400 as const,
      message: "Request body must be valid JSON.",
    };
  }
}

authRoutes.post("/signup", async (c) => {
  try {
    const parsed = await parseCredentialsFromRequest(c);
    if (!parsed.ok) {
      return c.json({ error: parsed.message }, parsed.status);
    }

    const { email, password } = parsed.value;

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return c.json({ error: "Email already in use." }, 409);
    }

    const passwordHash = await hashPassword(password);

    const [createdUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
      });

    if (!createdUser) {
      return c.json({ error: "Failed to create account." }, 500);
    }

    await setAuthSession(c, createdUser.id);

    return c.json({ user: createdUser }, 201);
  } catch (error) {
    console.error("auth signup failed", error);
    return c.json({ error: "Failed to create account." }, 500);
  }
});

authRoutes.post("/login", async (c) => {
  try {
    const parsed = await parseCredentialsFromRequest(c);
    if (!parsed.ok) {
      return c.json({ error: parsed.message }, parsed.status);
    }

    const { email, password } = parsed.value;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return c.json({ error: "Invalid credentials." }, 401);
    }

    const passwordIsValid = await verifyPassword(password, user.passwordHash);
    if (!passwordIsValid) {
      return c.json({ error: "Invalid credentials." }, 401);
    }

    await setAuthSession(c, user.id);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("auth login failed", error);
    return c.json({ error: "Failed to login." }, 500);
  }
});

authRoutes.post("/logout", async (c) => {
  await clearAuthSession(c);
  return c.json({ success: true });
});
