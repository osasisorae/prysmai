import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  addWaitlistSignup: vi.fn(),
  getWaitlistCount: vi.fn(),
  getWaitlistSignups: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

// Mock the notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { addWaitlistSignup, getWaitlistCount } from "./db";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("waitlist.join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully adds a new email to the waitlist", async () => {
    const mockAdd = addWaitlistSignup as ReturnType<typeof vi.fn>;
    mockAdd.mockResolvedValue({ success: true });
    const mockCount = getWaitlistCount as ReturnType<typeof vi.fn>;
    mockCount.mockResolvedValue(42);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waitlist.join({
      email: "test@example.com",
      source: "landing_page",
    });

    expect(result).toEqual({ success: true });
    expect(mockAdd).toHaveBeenCalledWith("test@example.com", "landing_page");
  });

  it("handles duplicate email gracefully", async () => {
    const mockAdd = addWaitlistSignup as ReturnType<typeof vi.fn>;
    mockAdd.mockResolvedValue({ success: true, alreadyExists: true });

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waitlist.join({
      email: "existing@example.com",
    });

    expect(result).toEqual({ success: true, alreadyExists: true });
  });

  it("rejects invalid email format", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.waitlist.join({ email: "not-an-email" })
    ).rejects.toThrow();
  });
});

describe("waitlist.count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current waitlist count", async () => {
    const mockCount = getWaitlistCount as ReturnType<typeof vi.fn>;
    mockCount.mockResolvedValue(73);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.waitlist.count();

    expect(result).toEqual({ count: 73 });
  });
});
