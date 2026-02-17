/**
 * Custom Email/Password Auth — Independent of Manus OAuth
 * Handles: login, account setup (from invite), session management
 */

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";
import { ENV } from "./_core/env";
import type { Request, Response, Router } from "express";
import { getDb } from "./db";
import { users, waitlistSignups } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const SALT_ROUNDS = 12;
const CUSTOM_COOKIE_NAME = "prysm_session";
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── Password helpers ───

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Invite token helpers ───

export function generateInviteToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

// ─── JWT Session helpers ───

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createCustomSession(userId: number, email: string): Promise<string> {
  const secret = getSessionSecret();
  const expiresAt = Math.floor((Date.now() + SESSION_EXPIRY_MS) / 1000);

  return new SignJWT({ userId, email, type: "custom" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(secret);
}

export async function verifyCustomSession(token: string | undefined | null): Promise<{ userId: number; email: string } | null> {
  if (!token) return null;

  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

    if (payload.type !== "custom" || typeof payload.userId !== "number" || typeof payload.email !== "string") {
      return null;
    }

    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

// ─── Database helpers ───

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function createUserFromInvite(email: string, passwordHash: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate a unique openId for custom auth users (not from Manus OAuth)
  const openId = `prysm_${crypto.randomBytes(16).toString("hex")}`;

  const result = await db.insert(users).values({
    openId,
    email,
    passwordHash,
    name,
    loginMethod: "email",
    role: "user",
    onboarded: false,
    lastSignedIn: new Date(),
  }).$returningId();

  return { id: result[0].id, openId };
}

export async function getWaitlistByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(waitlistSignups)
    .where(and(eq(waitlistSignups.inviteToken, token), eq(waitlistSignups.status, "approved")))
    .limit(1);
  return result[0] ?? undefined;
}

export async function markWaitlistUsed(id: number) {
  const db = await getDb();
  if (!db) return;
  // We don't change status — it stays "approved" but the user now exists
}

export async function approveWaitlistEntry(id: number, inviteToken: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(waitlistSignups).set({
    status: "approved",
    inviteToken,
    inviteSentAt: new Date(),
  }).where(eq(waitlistSignups.id, id));
}

export async function rejectWaitlistEntry(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(waitlistSignups).set({
    status: "rejected",
  }).where(eq(waitlistSignups.id, id));
}

export async function markUserOnboarded(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ onboarded: true }).where(eq(users.id, userId));
}

// ─── Express route registration ───

export function registerCustomAuthRoutes(router: Router) {
  // POST /api/auth/login — Email/password login
  router.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const user = await getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      // Update last signed in
      const db = await getDb();
      if (db) {
        await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
      }

      const token = await createCustomSession(user.id, user.email!);

      res.cookie(CUSTOM_COOKIE_NAME, token, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: req.protocol === "https" || req.headers["x-forwarded-proto"] === "https",
        maxAge: SESSION_EXPIRY_MS,
      });

      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          onboarded: user.onboarded,
        },
      });
    } catch (err: any) {
      console.error("[CustomAuth] Login error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  });

  // POST /api/auth/setup-account — Create account from invite token
  router.post("/api/auth/setup-account", async (req: Request, res: Response) => {
    try {
      const { token, name, password } = req.body;

      if (!token || !name || !password) {
        return res.status(400).json({ error: "Token, name, and password are required." });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters." });
      }

      // Look up the invite
      const invite = await getWaitlistByToken(token);
      if (!invite) {
        return res.status(400).json({ error: "Invalid or expired invite link." });
      }

      // Check if user already exists with this email
      const existing = await getUserByEmail(invite.email);
      if (existing) {
        return res.status(400).json({ error: "An account with this email already exists. Please log in." });
      }

      // Create the user
      const hash = await hashPassword(password);
      const { id: userId } = await createUserFromInvite(invite.email, hash, name);

      // Create session
      const sessionToken = await createCustomSession(userId, invite.email);

      res.cookie(CUSTOM_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: req.protocol === "https" || req.headers["x-forwarded-proto"] === "https",
        maxAge: SESSION_EXPIRY_MS,
      });

      return res.json({
        success: true,
        user: {
          id: userId,
          email: invite.email,
          name,
          role: "user",
          onboarded: false,
        },
      });
    } catch (err: any) {
      console.error("[CustomAuth] Setup account error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  });

  // GET /api/auth/me — Get current user from custom session
  router.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const token = req.cookies?.[CUSTOM_COOKIE_NAME];
      const session = await verifyCustomSession(token);

      if (!session) {
        return res.json({ user: null });
      }

      const user = await getUserById(session.userId);
      if (!user) {
        return res.json({ user: null });
      }

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          onboarded: user.onboarded,
        },
      });
    } catch {
      return res.json({ user: null });
    }
  });

  // POST /api/auth/logout — Clear custom session
  router.post("/api/auth/logout", async (req: Request, res: Response) => {
    res.clearCookie(CUSTOM_COOKIE_NAME, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
    });
    return res.json({ success: true });
  });

  // GET /api/auth/validate-invite — Check if an invite token is valid
  router.get("/api/auth/validate-invite", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ valid: false, error: "Token is required." });
      }

      const invite = await getWaitlistByToken(token);
      if (!invite) {
        return res.json({ valid: false, error: "Invalid or expired invite." });
      }

      // Check if user already exists
      const existing = await getUserByEmail(invite.email);
      if (existing) {
        return res.json({ valid: false, error: "Account already exists. Please log in.", alreadyExists: true });
      }

      return res.json({ valid: true, email: invite.email });
    } catch {
      return res.status(500).json({ valid: false, error: "Internal server error." });
    }
  });

  // POST /api/auth/complete-onboarding — Mark user as onboarded
  router.post("/api/auth/complete-onboarding", async (req: Request, res: Response) => {
    try {
      const token = req.cookies?.[CUSTOM_COOKIE_NAME];
      const session = await verifyCustomSession(token);

      if (!session) {
        return res.status(401).json({ error: "Not authenticated." });
      }

      await markUserOnboarded(session.userId);
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: "Internal server error." });
    }
  });
}
