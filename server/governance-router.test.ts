/**
 * Tests for the Governance tRPC Router.
 *
 * The governance router requires a real organization and project in the database.
 * These tests verify the router procedures are properly wired and validate input schemas.
 * For full integration testing, use the API key-based approach with a real project.
 */

import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock Context ───

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-governance",
    email: "test@prysm.ai",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

// ─── Tests ───

describe("governance router", () => {
  describe("router structure", () => {
    it("has all expected governance procedures", () => {
      // Verify the governance sub-router is wired into the main router
      const caller = appRouter.createCaller(createAuthContext().ctx);
      expect(caller.governance).toBeDefined();
      expect(caller.governance.listSessions).toBeDefined();
      expect(caller.governance.getSession).toBeDefined();
      expect(caller.governance.getSessionTimeline).toBeDefined();
      expect(caller.governance.getMetrics).toBeDefined();
      expect(caller.governance.getBehaviorTrends).toBeDefined();
      expect(caller.governance.getDetectorBreakdown).toBeDefined();
      expect(caller.governance.listPolicies).toBeDefined();
      expect(caller.governance.createPolicy).toBeDefined();
      expect(caller.governance.updatePolicy).toBeDefined();
      expect(caller.governance.deletePolicy).toBeDefined();
      expect(caller.governance.listViolations).toBeDefined();
    });
  });

  describe("input validation", () => {
    it("rejects listSessions with invalid status", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.governance.listSessions({
          projectId: 1,
          status: "invalid_status" as any,
        })
      ).rejects.toThrow();
    });

    it("rejects getMetrics with missing required fields", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.governance.getMetrics({
          projectId: 1,
          // missing 'from' and 'to'
        } as any)
      ).rejects.toThrow();
    });

    it("rejects createPolicy with invalid policyType", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.governance.createPolicy({
          projectId: 1,
          name: "Test",
          policyType: "invalid_type" as any,
          enforcement: "warn",
          rules: {},
        })
      ).rejects.toThrow();
    });

    it("rejects createPolicy with invalid enforcement", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.governance.createPolicy({
          projectId: 1,
          name: "Test",
          policyType: "behavioral",
          enforcement: "invalid_enforcement" as any,
          rules: {},
        })
      ).rejects.toThrow();
    });

    it("rejects getBehaviorTrends with non-positive days", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.governance.getBehaviorTrends({
          projectId: 1,
          days: 0,
        })
      ).rejects.toThrow();
    });
  });

  describe("authorization", () => {
    it("requires authentication for governance procedures", async () => {
      // Create context without user
      const ctx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: { clearCookie: () => {} } as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.governance.listSessions({ projectId: 1 })
      ).rejects.toThrow();
    });
  });
});
