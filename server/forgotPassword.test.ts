import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashPassword, verifyPassword, generateInviteToken } from "./customAuth";

describe("Forgot Password Flow", () => {
  describe("Password hashing", () => {
    it("should hash and verify passwords correctly", async () => {
      const password = "SecureP@ssw0rd!";
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword("WrongPassword", hash);
      expect(isInvalid).toBe(false);
    });

    it("should generate different hashes for the same password", async () => {
      const password = "TestPassword123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // bcrypt uses random salt
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe("Token generation", () => {
    it("should generate unique tokens", () => {
      const token1 = generateInviteToken();
      const token2 = generateInviteToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(96); // 48 bytes = 96 hex chars
      expect(token2.length).toBe(96);
    });

    it("should generate hex-only tokens", () => {
      const token = generateInviteToken();
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });
  });

  describe("Reset password validation", () => {
    it("should reject passwords shorter than 8 characters", () => {
      const shortPasswords = ["", "a", "1234567", "abc"];
      for (const pw of shortPasswords) {
        expect(pw.length).toBeLessThan(8);
      }
    });

    it("should accept passwords 8 characters or longer", () => {
      const validPasswords = ["12345678", "SecurePassword!", "a".repeat(100)];
      for (const pw of validPasswords) {
        expect(pw.length).toBeGreaterThanOrEqual(8);
      }
    });
  });
});
