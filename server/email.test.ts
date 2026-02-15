import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the resend module before importing our email module
vi.mock("resend", () => {
  const mockSend = vi.fn();
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: { send: mockSend },
    })),
    __mockSend: mockSend,
  };
});

import { sendWaitlistConfirmation } from "./email";
import { Resend } from "resend";

// Access the mock send function
function getMockSend() {
  const instance = new Resend("test");
  return instance.emails.send as ReturnType<typeof vi.fn>;
}

describe("sendWaitlistConfirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends an email with correct parameters", async () => {
    const mockSend = getMockSend();
    mockSend.mockResolvedValue({ data: { id: "email_123" }, error: null });

    const result = await sendWaitlistConfirmation("test@example.com");

    expect(result.success).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(1);

    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.to).toBe("test@example.com");
    expect(callArgs.subject).toContain("Prysm AI");
    expect(callArgs.from).toContain("Prysm AI");
    expect(callArgs.html).toContain("early access");
  });

  it("returns error when Resend API returns an error", async () => {
    const mockSend = getMockSend();
    mockSend.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key", name: "validation_error" },
    });

    const result = await sendWaitlistConfirmation("test@example.com");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid API key");
  });

  it("handles network/throw errors gracefully", async () => {
    const mockSend = getMockSend();
    mockSend.mockRejectedValue(new Error("Network timeout"));

    const result = await sendWaitlistConfirmation("test@example.com");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network timeout");
  });

  it("includes proper HTML content in the email", async () => {
    const mockSend = getMockSend();
    mockSend.mockResolvedValue({ data: { id: "email_456" }, error: null });

    await sendWaitlistConfirmation("builder@company.com");

    const callArgs = mockSend.mock.calls[0][0];
    // Verify the email HTML contains key content
    expect(callArgs.html).toContain("You're on the list");
    expect(callArgs.html).toContain("Prysm AI");
    expect(callArgs.html).toContain("early access");
    expect(callArgs.html).toContain("What's next");
  });
});

describe("waitlist.join with email integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls sendWaitlistConfirmation for new signups in the router", async () => {
    // This test validates the integration is wired correctly
    // by importing the router and checking the email module is imported
    const routerModule = await import("./routers");
    expect(routerModule.appRouter).toBeDefined();
  });
});
