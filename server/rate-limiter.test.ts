/**
 * Tests for the IP-based rate limiter.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createRateLimiter, getClientIp } from "./rate-limiter";

describe("createRateLimiter", () => {
  let limiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    limiter = createRateLimiter("test-" + Date.now(), {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
    });
  });

  afterEach(() => {
    limiter.reset();
  });

  it("should allow requests within the limit", () => {
    const result = limiter.check("192.168.1.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.limit).toBe(3);
  });

  it("should decrement remaining count with each request", () => {
    const r1 = limiter.check("192.168.1.1");
    expect(r1.remaining).toBe(2);

    const r2 = limiter.check("192.168.1.1");
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check("192.168.1.1");
    expect(r3.remaining).toBe(0);
  });

  it("should block the 4th request from the same IP", () => {
    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");

    const r4 = limiter.check("192.168.1.1");
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.retryAfterMs).toBeGreaterThan(0);
  });

  it("should track different IPs independently", () => {
    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");

    // Different IP should still be allowed
    const result = limiter.check("10.0.0.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("should allow requests again after the window expires", () => {
    vi.useFakeTimers();

    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");

    const blocked = limiter.check("192.168.1.1");
    expect(blocked.allowed).toBe(false);

    // Advance time past the 1-hour window
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    const allowed = limiter.check("192.168.1.1");
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(2);

    vi.useRealTimers();
  });

  it("should return retryAfterMs that decreases over time", () => {
    vi.useFakeTimers();

    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");

    const blocked1 = limiter.check("192.168.1.1");
    expect(blocked1.allowed).toBe(false);
    const retry1 = blocked1.retryAfterMs;

    // Advance 30 minutes
    vi.advanceTimersByTime(30 * 60 * 1000);

    const blocked2 = limiter.check("192.168.1.1");
    expect(blocked2.allowed).toBe(false);
    expect(blocked2.retryAfterMs).toBeLessThan(retry1);

    vi.useRealTimers();
  });

  it("should reset the store", () => {
    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");
    limiter.check("192.168.1.1");

    expect(limiter.size).toBe(1);

    limiter.reset();
    expect(limiter.size).toBe(0);

    // Should be allowed again after reset
    const result = limiter.check("192.168.1.1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("should handle rapid successive checks correctly", () => {
    const results = Array.from({ length: 5 }, () =>
      limiter.check("192.168.1.1")
    );

    expect(results[0].allowed).toBe(true);
    expect(results[1].allowed).toBe(true);
    expect(results[2].allowed).toBe(true);
    expect(results[3].allowed).toBe(false);
    expect(results[4].allowed).toBe(false);
  });
});

describe("createRateLimiter with different configs", () => {
  it("should respect custom maxRequests", () => {
    const limiter = createRateLimiter("custom-max-" + Date.now(), {
      maxRequests: 1,
      windowMs: 60000,
    });

    const r1 = limiter.check("1.2.3.4");
    expect(r1.allowed).toBe(true);

    const r2 = limiter.check("1.2.3.4");
    expect(r2.allowed).toBe(false);

    limiter.reset();
  });

  it("should respect custom windowMs", () => {
    vi.useFakeTimers();

    const limiter = createRateLimiter("custom-window-" + Date.now(), {
      maxRequests: 2,
      windowMs: 5000, // 5 seconds
    });

    limiter.check("1.2.3.4");
    limiter.check("1.2.3.4");

    const blocked = limiter.check("1.2.3.4");
    expect(blocked.allowed).toBe(false);

    // Advance past 5-second window
    vi.advanceTimersByTime(5001);

    const allowed = limiter.check("1.2.3.4");
    expect(allowed.allowed).toBe(true);

    limiter.reset();
    vi.useRealTimers();
  });
});

describe("getClientIp", () => {
  it("should extract IP from X-Forwarded-For header", () => {
    const ip = getClientIp({
      ip: "127.0.0.1",
      headers: { "x-forwarded-for": "203.0.113.50, 70.41.3.18, 150.172.238.178" },
    });
    expect(ip).toBe("203.0.113.50");
  });

  it("should use single X-Forwarded-For value", () => {
    const ip = getClientIp({
      ip: "127.0.0.1",
      headers: { "x-forwarded-for": "203.0.113.50" },
    });
    expect(ip).toBe("203.0.113.50");
  });

  it("should fall back to req.ip when no X-Forwarded-For", () => {
    const ip = getClientIp({
      ip: "10.0.0.1",
      headers: {},
    });
    expect(ip).toBe("10.0.0.1");
  });

  it("should return 'unknown' when no IP available", () => {
    const ip = getClientIp({
      headers: {},
    });
    expect(ip).toBe("unknown");
  });

  it("should handle array X-Forwarded-For header", () => {
    const ip = getClientIp({
      ip: "127.0.0.1",
      headers: { "x-forwarded-for": ["203.0.113.50, 70.41.3.18"] },
    });
    expect(ip).toBe("203.0.113.50");
  });
});
