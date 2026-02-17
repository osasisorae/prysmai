import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateInviteToken,
  createCustomSession,
  verifyCustomSession,
} from "./customAuth";

describe("customAuth", () => {
  describe("password hashing", () => {
    it("hashes and verifies a password correctly", async () => {
      const password = "MySecureP@ss123";
      const hash = await hashPassword(password);

      // Hash should be a bcrypt string
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2")).toBe(true);

      // Verify correct password
      const valid = await verifyPassword(password, hash);
      expect(valid).toBe(true);

      // Reject wrong password
      const invalid = await verifyPassword("wrongpassword", hash);
      expect(invalid).toBe(false);
    });

    it("produces different hashes for the same password", async () => {
      const password = "SamePassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2); // bcrypt uses random salt
    });
  });

  describe("invite tokens", () => {
    it("generates a 96-character hex token", () => {
      const token = generateInviteToken();
      expect(token).toBeTruthy();
      expect(token.length).toBe(96); // 48 bytes = 96 hex chars
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it("generates unique tokens", () => {
      const tokens = new Set(Array.from({ length: 10 }, () => generateInviteToken()));
      expect(tokens.size).toBe(10);
    });
  });

  describe("JWT sessions", () => {
    it("creates and verifies a session token", async () => {
      const token = await createCustomSession(42, "test@example.com");
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      const session = await verifyCustomSession(token);
      expect(session).not.toBeNull();
      expect(session!.userId).toBe(42);
      expect(session!.email).toBe("test@example.com");
    });

    it("returns null for invalid tokens", async () => {
      const session = await verifyCustomSession("invalid.token.here");
      expect(session).toBeNull();
    });

    it("returns null for undefined/null tokens", async () => {
      expect(await verifyCustomSession(undefined)).toBeNull();
      expect(await verifyCustomSession(null)).toBeNull();
      expect(await verifyCustomSession("")).toBeNull();
    });
  });
});
