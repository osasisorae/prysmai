import { describe, it, expect } from "vitest";
import { getAllPosts, getPostBySlug } from "@/data/blog-posts";

describe("blog-posts data module", () => {
  describe("getAllPosts", () => {
    it("returns an array of blog posts", () => {
      const posts = getAllPosts();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThanOrEqual(3);
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

    it("posts are ordered newest first", () => {
      const posts = getAllPosts();
      // Post 2 (inside-language-model) should be first, then Post 1, then Post 0
      expect(posts[0].slug).toBe("inside-language-model-neural-network");
      expect(posts[1].slug).toBe("what-is-mechanistic-interpretability");
      expect(posts[2].slug).toBe("stop-flying-blind");
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

    it("returns Post 2 (inside-language-model-neural-network) by slug", () => {
      const post = getPostBySlug("inside-language-model-neural-network");
      expect(post).toBeDefined();
      expect(post!.title).toBe(
        "I Looked Inside a Language Model's Neural Network. Here's What I Found."
      );
      expect(post!.category).toBe("DEEP DIVE");
      expect(post!.readTime).toBe("15 min read");
    });

    it("returns undefined for unknown slug", () => {
      const post = getPostBySlug("nonexistent-post");
      expect(post).toBeUndefined();
    });

    it("Post 2 content contains expected sections", () => {
      const post = getPostBySlug("inside-language-model-neural-network");
      expect(post!.content).toContain("<h2>");
      expect(post!.content).toContain("<p>");
      expect(post!.content).toContain("TransformerLens");
      expect(post!.content).toContain("Sparse Autoencoders");
      expect(post!.content).toContain("Golden Gate Claude");
      expect(post!.content).toContain("Circuit Tracing");
      expect(post!.content).toContain("superposition");
    });

    it("Post 2 content has references section", () => {
      const post = getPostBySlug("inside-language-model-neural-network");
      expect(post!.content).toContain('class="references"');
      expect(post!.content).toContain("Anthropic");
      expect(post!.content).toContain("transformer-circuits.pub");
    });

    it("Post 1 content contains HTML markup", () => {
      const post = getPostBySlug("what-is-mechanistic-interpretability");
      expect(post!.content).toContain("<h2>");
      expect(post!.content).toContain("<p>");
      expect(post!.content).toContain("mechanistic interpretability");
    });
  });
});
