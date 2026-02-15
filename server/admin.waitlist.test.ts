import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@prysmai.io",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createRegularUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("waitlist.list (admin-only)", () => {
  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.waitlist.list()).rejects.toThrow();
  });

  it("rejects regular (non-admin) users", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.waitlist.list()).rejects.toThrow();
  });

  it("allows admin users to call the endpoint", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // This will either return data or throw a DB error (no DB in test env)
    // We're testing that the auth middleware passes, not the DB query
    try {
      const result = await caller.waitlist.list();
      // If DB is available, result should be an array
      expect(Array.isArray(result)).toBe(true);
    } catch (error: any) {
      // If DB is not available, we should get a DB error, not an auth error
      expect(error.code).not.toBe("FORBIDDEN");
      expect(error.code).not.toBe("UNAUTHORIZED");
    }
  });
});

describe("waitlist.count (public)", () => {
  it("allows unauthenticated access", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.waitlist.count();
      expect(result).toHaveProperty("count");
    } catch (error: any) {
      // DB error is acceptable, auth error is not
      expect(error.code).not.toBe("FORBIDDEN");
      expect(error.code).not.toBe("UNAUTHORIZED");
    }
  });
});
