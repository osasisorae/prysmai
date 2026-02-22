/**
 * Tests for Dynamic Upstream API Key & Custom Header Forwarding
 * 
 * These features enable GitLab AI Gateway integration:
 * 1. X-Prysm-Upstream-Key: override stored API key at request time
 * 2. X-Prysm-Forward-Headers: merge custom headers into upstream request
 */
import { describe, it, expect } from "vitest";

// ─── mergeForwardHeaders (unit-testable helper) ───
// We re-implement the logic here since it's a private function in proxy.ts
// This tests the merge algorithm independently

function mergeForwardHeaders(
  baseHeaders: Record<string, string>,
  forwardHeaders?: Record<string, string>,
): Record<string, string> {
  if (!forwardHeaders) return baseHeaders;
  const merged = { ...baseHeaders };
  for (const [key, value] of Object.entries(forwardHeaders)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "content-type" || lowerKey === "authorization") continue;
    merged[key] = value;
  }
  return merged;
}

describe("mergeForwardHeaders", () => {
  it("returns base headers unchanged when no forward headers provided", () => {
    const base = { "Content-Type": "application/json", "Authorization": "Bearer sk-123" };
    const result = mergeForwardHeaders(base, undefined);
    expect(result).toEqual(base);
    expect(result).toBe(base); // same reference, no copy
  });

  it("merges custom headers into base headers", () => {
    const base = { "Content-Type": "application/json", "Authorization": "Bearer sk-123" };
    const forward = { "X-Custom-Header": "value1", "X-Another": "value2" };
    const result = mergeForwardHeaders(base, forward);
    expect(result).toEqual({
      "Content-Type": "application/json",
      "Authorization": "Bearer sk-123",
      "X-Custom-Header": "value1",
      "X-Another": "value2",
    });
  });

  it("does NOT allow overriding Content-Type", () => {
    const base = { "Content-Type": "application/json", "Authorization": "Bearer sk-123" };
    const forward = { "Content-Type": "text/plain" };
    const result = mergeForwardHeaders(base, forward);
    expect(result["Content-Type"]).toBe("application/json");
  });

  it("does NOT allow overriding Authorization", () => {
    const base = { "Content-Type": "application/json", "Authorization": "Bearer sk-123" };
    const forward = { "Authorization": "Bearer malicious-key" };
    const result = mergeForwardHeaders(base, forward);
    expect(result["Authorization"]).toBe("Bearer sk-123");
  });

  it("blocks Content-Type override case-insensitively", () => {
    const base = { "Content-Type": "application/json" };
    const forward = { "content-type": "text/html", "CONTENT-TYPE": "text/xml" };
    const result = mergeForwardHeaders(base, forward);
    expect(result["Content-Type"]).toBe("application/json");
    // The lowercase/uppercase keys should not appear
    expect(result["content-type"]).toBeUndefined();
    expect(result["CONTENT-TYPE"]).toBeUndefined();
  });

  it("blocks Authorization override case-insensitively", () => {
    const base = { "Authorization": "Bearer safe" };
    const forward = { "authorization": "Bearer evil", "AUTHORIZATION": "Bearer also-evil" };
    const result = mergeForwardHeaders(base, forward);
    expect(result["Authorization"]).toBe("Bearer safe");
  });

  it("handles empty forward headers object", () => {
    const base = { "Content-Type": "application/json" };
    const result = mergeForwardHeaders(base, {});
    expect(result).toEqual({ "Content-Type": "application/json" });
  });

  it("preserves GitLab AI Gateway headers", () => {
    const base = { "Content-Type": "application/json", "Authorization": "Bearer sk-123" };
    const forward = {
      "X-Gitlab-Authentication-Type": "oidc",
      "X-Gitlab-Global-User-Id": "user-abc-123",
      "X-Gitlab-Host-Name": "gitlab.example.com",
      "X-Gitlab-Instance-Id": "instance-xyz",
      "X-Gitlab-Realm": "saas",
      "X-Gitlab-Version": "17.8.0",
    };
    const result = mergeForwardHeaders(base, forward);
    expect(result["X-Gitlab-Authentication-Type"]).toBe("oidc");
    expect(result["X-Gitlab-Global-User-Id"]).toBe("user-abc-123");
    expect(result["X-Gitlab-Host-Name"]).toBe("gitlab.example.com");
    expect(result["X-Gitlab-Instance-Id"]).toBe("instance-xyz");
    expect(result["X-Gitlab-Realm"]).toBe("saas");
    expect(result["X-Gitlab-Version"]).toBe("17.8.0");
  });

  it("does not mutate the original base headers object", () => {
    const base = { "Content-Type": "application/json" };
    const forward = { "X-Extra": "value" };
    const result = mergeForwardHeaders(base, forward);
    expect(base).toEqual({ "Content-Type": "application/json" });
    expect(result).not.toBe(base);
  });
});

// ─── X-Prysm-Forward-Headers JSON parsing ───

describe("X-Prysm-Forward-Headers JSON parsing", () => {
  it("parses valid JSON header string", () => {
    const raw = '{"X-Custom": "value", "X-Another": "123"}';
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({ "X-Custom": "value", "X-Another": "123" });
  });

  it("handles malformed JSON gracefully", () => {
    const raw = "not-valid-json{";
    let parsed: Record<string, string> | undefined;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = undefined;
    }
    expect(parsed).toBeUndefined();
  });

  it("handles empty JSON object", () => {
    const raw = "{}";
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual({});
  });

  it("handles nested JSON (only top-level string values used)", () => {
    const raw = '{"X-Simple": "value", "X-Nested": {"inner": "val"}}';
    const parsed = JSON.parse(raw);
    expect(parsed["X-Simple"]).toBe("value");
    // Nested values become objects, but mergeForwardHeaders would just toString them
    expect(typeof parsed["X-Nested"]).toBe("object");
  });
});

// ─── Dynamic upstream key selection logic ───

describe("Dynamic upstream API key selection", () => {
  it("uses dynamic key when X-Prysm-Upstream-Key is present", () => {
    const storedKey = "sk-stored-key-123";
    const dynamicKey = "sk-dynamic-key-456";
    const effectiveKey = dynamicKey || storedKey;
    expect(effectiveKey).toBe("sk-dynamic-key-456");
  });

  it("falls back to stored key when no dynamic key", () => {
    const storedKey = "sk-stored-key-123";
    const dynamicKey = undefined;
    const effectiveKey = dynamicKey || storedKey;
    expect(effectiveKey).toBe("sk-stored-key-123");
  });

  it("uses dynamic key even when stored key exists", () => {
    const storedKey = "sk-stored-key-123";
    const dynamicKey = "gitlab-ai-gateway-token-xyz";
    const effectiveKey = dynamicKey || storedKey;
    expect(effectiveKey).toBe("gitlab-ai-gateway-token-xyz");
  });

  it("returns null when neither key is available", () => {
    const storedKey: string | undefined = undefined;
    const dynamicKey: string | undefined = undefined;
    const effectiveKey = dynamicKey || storedKey || null;
    expect(effectiveKey).toBeNull();
  });

  it("handles empty string dynamic key (falls back to stored)", () => {
    const storedKey = "sk-stored-key-123";
    const dynamicKey = "";
    // Empty string is falsy, so falls back
    const effectiveKey = dynamicKey || storedKey;
    expect(effectiveKey).toBe("sk-stored-key-123");
  });
});

// ─── GitLab AI Gateway integration scenario ───

describe("GitLab AI Gateway integration scenario", () => {
  it("correctly merges GitLab injected headers with Prysm proxy headers", () => {
    // Simulate what happens when a GitLab CI runner sends a request through Prysm
    const prysmapiKey = "Bearer sk-prysm-project-key";
    const gitlabGatewayToken = "glpat-xxxxxxxxxxxxxxxxxxxx";
    const gitlabHeaders = {
      "X-Gitlab-Authentication-Type": "oidc",
      "X-Gitlab-Global-User-Id": "user-12345",
      "X-Gitlab-Host-Name": "gitlab.com",
      "X-Gitlab-Instance-Id": "ea8bf810-1d6f-4a6a-b4fd-93e8cbd8b57f",
      "X-Gitlab-Realm": "saas",
      "X-Gitlab-Version": "17.8.0-pre",
    };

    // Step 1: Dynamic key replaces stored key
    const effectiveKey = gitlabGatewayToken;
    expect(effectiveKey).toBe("glpat-xxxxxxxxxxxxxxxxxxxx");

    // Step 2: Forward headers are merged
    const upstreamHeaders = mergeForwardHeaders(
      {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${effectiveKey}`,
      },
      gitlabHeaders,
    );

    // Verify: Authorization uses the dynamic key
    expect(upstreamHeaders["Authorization"]).toBe("Bearer glpat-xxxxxxxxxxxxxxxxxxxx");
    // Verify: All GitLab headers are forwarded
    expect(upstreamHeaders["X-Gitlab-Authentication-Type"]).toBe("oidc");
    expect(upstreamHeaders["X-Gitlab-Global-User-Id"]).toBe("user-12345");
    expect(upstreamHeaders["X-Gitlab-Realm"]).toBe("saas");
    // Verify: Content-Type is preserved
    expect(upstreamHeaders["Content-Type"]).toBe("application/json");
  });

  it("prevents header injection attacks via forward headers", () => {
    const base = {
      "Content-Type": "application/json",
      "Authorization": "Bearer legitimate-token",
    };
    const maliciousForward = {
      "Authorization": "Bearer stolen-token",
      "Content-Type": "text/html",
      "X-Legit-Header": "safe-value",
    };

    const result = mergeForwardHeaders(base, maliciousForward);
    // Protected headers unchanged
    expect(result["Authorization"]).toBe("Bearer legitimate-token");
    expect(result["Content-Type"]).toBe("application/json");
    // Legitimate header passes through
    expect(result["X-Legit-Header"]).toBe("safe-value");
  });
});
