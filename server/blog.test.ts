import { describe, it, expect } from "vitest";
import { getAllPosts, getPostBySlug } from "@/data/blog-posts";

describe("blog-posts data module", () => {
  describe("getAllPosts", () => {
    it("returns an array of blog posts", () => {
      const posts = getAllPosts();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThanOrEqual(2);
    });

    it("each post has required fields", () => {
      const posts = getAllPosts();
      for (const post of posts) {
        expect(post.slug).toBeTruthy();
        expect(post.title).toBeTruthy();
        expect(post.author).toBeTruthy();
        expect(post.date).toBeTruthy();
        expect(post.readTime).toBeTruthy();
        expect(post.category).toBeTruthy();
        expect(post.excerpt).toBeTruthy();
        expect(post.content).toBeTruthy();
      }
    });

    it("all slugs are unique", () => {
      const posts = getAllPosts();
      const slugs = posts.map((p) => p.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });

  describe("getPostBySlug", () => {
    it("returns Post 0 (stop-flying-blind) by slug", () => {
      const post = getPostBySlug("stop-flying-blind");
      expect(post).toBeDefined();
      expect(post!.title).toBe(
        "Stop Flying Blind: Why We Need to See Inside Our AI Agents"
      );
      expect(post!.category).toBe("AI SECURITY");
    });

    it("returns Post 1 (what-is-mechanistic-interpretability) by slug", () => {
      const post = getPostBySlug("what-is-mechanistic-interpretability");
      expect(post).toBeDefined();
      expect(post!.title).toBe(
        "What Is Mechanistic Interpretability? A Practical Guide for AI Engineers"
      );
      expect(post!.category).toBe("INTERPRETABILITY");
    });

    it("returns undefined for unknown slug", () => {
      const post = getPostBySlug("nonexistent-post");
      expect(post).toBeUndefined();
    });

    it("post content contains HTML markup", () => {
      const post = getPostBySlug("what-is-mechanistic-interpretability");
      expect(post!.content).toContain("<h2>");
      expect(post!.content).toContain("<p>");
      expect(post!.content).toContain("mechanistic interpretability");
    });
  });
});
