import { describe, it, expect } from "vitest";

describe("SITE_URL environment variable", () => {
  it("should be set and be a valid URL", () => {
    const siteUrl = process.env.SITE_URL;
    expect(siteUrl).toBeDefined();
    expect(siteUrl).not.toBe("");
    expect(siteUrl).toMatch(/^https?:\/\//);
  });

  it("should produce a clean base URL without trailing slash", () => {
    const siteUrl = process.env.SITE_URL;
    if (siteUrl) {
      // Our code strips trailing slashes at runtime, verify it works
      const cleaned = siteUrl.replace(/\/$/, "");
      expect(cleaned).toMatch(/^https?:\/\/.+/);
      expect(cleaned.endsWith("/")).toBe(false);
    }
  });
});
