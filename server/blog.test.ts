import { describe, it, expect } from "vitest";
import { getAllPosts, getPostBySlug } from "@/data/blog-posts";

describe("blog-posts data module", () => {
  describe("getAllPosts", () => {
    it("returns an array of blog posts", () => {
      const posts = getAllPosts();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThanOrEqual(4);
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
      // Post 3 (prompt injection) should be first, then Post 2, Post 1, Post 0
      expect(posts[0].slug).toBe("why-prompt-injection-still-works-2026");
      expect(posts[1].slug).toBe("inside-language-model-neural-network");
      expect(posts[2].slug).toBe("what-is-mechanistic-interpretability");
      expect(posts[3].slug).toBe("stop-flying-blind");
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

    it("returns Post 3 (why-prompt-injection-still-works-2026) by slug", () => {
      const post = getPostBySlug("why-prompt-injection-still-works-2026");
      expect(post).toBeDefined();
      expect(post!.title).toBe(
        "Why Prompt Injection Still Works in 2026 (And What Actually Stops It)"
      );
      expect(post!.category).toBe("AI SECURITY");
      expect(post!.readTime).toBe("14 min read");
    });

    it("returns undefined for unknown slug", () => {
      const post = getPostBySlug("nonexistent-post");
      expect(post).toBeUndefined();
    });

    it("Post 3 content contains expected sections", () => {
      const post = getPostBySlug("why-prompt-injection-still-works-2026");
      expect(post!.content).toContain("<h2>");
      expect(post!.content).toContain("<p>");
      expect(post!.content).toContain("prompt injection");
      expect(post!.content).toContain("CaMeL");
      expect(post!.content).toContain("Constitutional Classifiers");
      expect(post!.content).toContain("defense in depth");
      expect(post!.content).toContain("Bruce Schneier");
    });

    it("Post 3 content has references section with 15 citations", () => {
      const post = getPostBySlug("why-prompt-injection-still-works-2026");
      expect(post!.content).toContain('class="references"');
      expect(post!.content).toContain("IEEE Spectrum");
      expect(post!.content).toContain("OWASP");
      expect(post!.content).toContain("Anthropic");
      expect(post!.content).toContain("arxiv.org");
    });

    it("Post 3 content has tables for defense comparison", () => {
      const post = getPostBySlug("why-prompt-injection-still-works-2026");
      expect(post!.content).toContain("<table>");
      expect(post!.content).toContain("Defense Layer");
      expect(post!.content).toContain("System prompt hardening");
      expect(post!.content).toContain("Internal Activation Monitoring");
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
