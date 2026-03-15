import { betterAuth } from "better-auth";
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";

const SESSION_COOKIE_NAME = "kanban_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const DEV_FALLBACK_SECRET = "kanban_dev_secret_at_least_32_characters";

export type AppVariables = {
  userId: string | null;
};

type AppContext = Context<{ Variables: AppVariables }>;

function getAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET must be set and at least 32 characters.");
  }

  console.warn(
    "BETTER_AUTH_SECRET is missing or too short. Using development fallback secret.",
  );
  return DEV_FALLBACK_SECRET;
}

const auth = betterAuth({
  secret: getAuthSecret(),
});

async function getPasswordContext() {
  const context = await auth.$context;
  return context.password;
}

export async function hashPassword(password: string) {
  const passwordContext = await getPasswordContext();
  return passwordContext.hash(password);
}

export async function verifyPassword(password: string, passwordHash: string) {
  const passwordContext = await getPasswordContext();
  return passwordContext.verify(password, passwordHash);
}

export async function setAuthSession(c: AppContext, userId: string) {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${userId}:${expiresAt}`;

  await setSignedCookie(c, SESSION_COOKIE_NAME, payload, getAuthSecret(), {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearAuthSession(c: AppContext) {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

async function readAuthSession(c: AppContext) {
  const rawSession = await getSignedCookie(c, getAuthSecret(), SESSION_COOKIE_NAME);
  if (typeof rawSession !== "string") {
    return null;
  }

  const [userId, expiresAtText] = rawSession.split(":");
  const expiresAt = Number(expiresAtText);

  if (!userId || !Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
    await clearAuthSession(c);
    return null;
  }

  return { userId };
}

export const sessionMiddleware: MiddlewareHandler<{ Variables: AppVariables }> = async (
  c,
  next,
) => {
  const session = await readAuthSession(c);
  c.set("userId", session?.userId ?? null);
  await next();
};

export const requireAuth: MiddlewareHandler<{ Variables: AppVariables }> = async (c, next) => {
  if (!c.get("userId")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
};
