import { describe, expect, it, vi, beforeEach } from "vitest";

// Use vi.hoisted so the mock fn is available inside vi.mock (which is hoisted)
const mockForward = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      receiving: {
        forward: mockForward,
      },
    },
  })),
}));

import express from "express";
import request from "supertest";
import { resendWebhookRouter } from "./resendWebhook";

// Create a test Express app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/webhooks", resendWebhookRouter);
  return app;
}

describe("Resend Inbound Webhook — Email Forwarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/webhooks/resend", () => {
    it("forwards email.received events to osasisorae@gmail.com", async () => {
      mockForward.mockResolvedValue({
        data: { id: "fwd_123abc" },
        error: null,
      });

      const app = createTestApp();
      const res = await request(app)
        .post("/api/webhooks/resend")
        .send({
          type: "email.received",
          data: {
            email_id: "email_abc123",
            from: "sender@example.com",
            to: ["info@prysmai.io"],
            subject: "Test email",
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.forwarded).toBe(true);
      expect(res.body.id).toBe("fwd_123abc");
      expect(mockForward).toHaveBeenCalledWith({
        emailId: "email_abc123",
        to: "osasisorae@gmail.com",
        from: "info@prysmai.io",
      });
    });

    it("calls forward with correct emailId from event data", async () => {
      mockForward.mockResolvedValue({
        data: { id: "fwd_xyz789" },
        error: null,
      });

      const app = createTestApp();
      await request(app)
        .post("/api/webhooks/resend")
        .send({
          type: "email.received",
          data: { email_id: "email_specific_id_456" },
        });

      expect(mockForward).toHaveBeenCalledTimes(1);
      expect(mockForward).toHaveBeenCalledWith(
        expect.objectContaining({ emailId: "email_specific_id_456" })
      );
    });

    it("acknowledges non-email.received events without forwarding", async () => {
      const app = createTestApp();
      const res = await request(app)
        .post("/api/webhooks/resend")
        .send({
          type: "email.sent",
          data: { email_id: "email_sent_123" },
        });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(res.body.forwarded).toBe(false);
      expect(mockForward).not.toHaveBeenCalled();
    });

    it("acknowledges email.delivered events without forwarding", async () => {
      const app = createTestApp();
      const res = await request(app)
        .post("/api/webhooks/resend")
        .send({
          type: "email.delivered",
          data: { email_id: "email_del_123" },
        });

      expect(res.status).toBe(200);
      expect(res.body.forwarded).toBe(false);
      expect(mockForward).not.toHaveBeenCalled();
    });

    it("returns 400 when email_id is missing from event data", async () => {
      const app = createTestApp();
      const res = await request(app)
        .post("/api/webhooks/resend")
        .send({
          type: "email.received",
          data: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing email_id");
      expect(mockForward).not.toHaveBeenCalled();
    });

    it("returns 400 when data object is missing entirely", async () => {
      const app = createTestApp();
      const res = await request(app)
        .post("/api/webhooks/resend")
        .send({
          type: "email.received",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing email_id");
      expect(mockForward).not.toHaveBeenCalled();
    });

    it("returns 500 when Resend forward API returns an error", async () => {
      mockForward.mockResolvedValue({
        data: null,
        error: { message: "Email not found", statusCode: 404 },
      });

      const app = createTestApp();
      const res = await request(app)
        .post("/api/webhooks/resend")
        .send({
          type: "email.received",
          data: { email_id: "email_not_found" },
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Email not found");
    });

    it("returns 500 when Resend forward throws an exception", async () => {
      mockForward.mockRejectedValue(new Error("Network timeout"));

      const app = createTestApp();
      const res = await request(app)
        .post("/api/webhooks/resend")
        .send({
          type: "email.received",
          data: { email_id: "email_timeout" },
        });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Internal server error");
    });

    it("handles empty request body gracefully", async () => {
      const app = createTestApp();
      const res = await request(app)
        .post("/api/webhooks/resend")
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(res.body.forwarded).toBe(false);
      expect(mockForward).not.toHaveBeenCalled();
    });

    it("always forwards to the configured email address", async () => {
      mockForward.mockResolvedValue({
        data: { id: "fwd_check" },
        error: null,
      });

      const app = createTestApp();
      await request(app)
        .post("/api/webhooks/resend")
        .send({
          type: "email.received",
          data: { email_id: "email_any" },
        });

      // Verify the 'to' and 'from' are always the configured values
      const callArgs = mockForward.mock.calls[0][0];
      expect(callArgs.to).toBe("osasisorae@gmail.com");
      expect(callArgs.from).toBe("info@prysmai.io");
    });
  });
});
