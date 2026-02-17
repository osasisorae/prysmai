import { describe, it, expect } from "vitest";
import { getAllPosts, getPostBySlug } from "@/data/blog-posts";

describe("blog-posts data module", () => {
  describe("getAllPosts", () => {
    it("returns an array of blog posts", () => {
      const posts = getAllPosts();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThanOrEqual(6);
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
      // Post 5 (observability) should be first, then Post 4, Post 3, Post 2, Post 1, Post 0
      expect(posts[0].slug).toBe("ai-observability-stack-2026");
      expect(posts[1].slug).toBe("how-interpretability-makes-ai-security-work");
      expect(posts[2].slug).toBe("why-prompt-injection-still-works-2026");
      expect(posts[3].slug).toBe("inside-language-model-neural-network");
      expect(posts[4].slug).toBe("what-is-mechanistic-interpretability");
      expect(posts[5].slug).toBe("stop-flying-blind");
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

    it("returns Post 4 (how-interpretability-makes-ai-security-work) by slug", () => {
      const post = getPostBySlug("how-interpretability-makes-ai-security-work");
      expect(post).toBeDefined();
      expect(post!.title).toBe(
        "The Missing Link: How Interpretability Makes AI Security Actually Work"
      );
      expect(post!.category).toBe("INTERPRETABILITY + SECURITY");
      expect(post!.readTime).toBe("16 min read");
    });

    it("returns Post 5 (ai-observability-stack-2026) by slug", () => {
      const post = getPostBySlug("ai-observability-stack-2026");
      expect(post).toBeDefined();
      expect(post!.title).toBe(
        "The AI Observability Stack in 2026: What's Changed and What's Still Missing"
      );
      expect(post!.category).toBe("OBSERVABILITY");
      expect(post!.readTime).toBe("14 min read");
    });

    it("returns undefined for unknown slug", () => {
      const post = getPostBySlug("nonexistent-post");
      expect(post).toBeUndefined();
    });

    it("Post 5 content contains expected sections", () => {
      const post = getPostBySlug("ai-observability-stack-2026");
      expect(post!.content).toContain("<h2>");
      expect(post!.content).toContain("<p>");
      expect(post!.content).toContain("Market Has Exploded");
      expect(post!.content).toContain("Current Landscape");
      expect(post!.content).toContain("Missing Layer");
      expect(post!.content).toContain("OpenTelemetry");
      expect(post!.content).toContain("ClickHouse acquired Langfuse");
      expect(post!.content).toContain("Five-Layer Framework");
    });

    it("Post 5 content has references section with 12 citations", () => {
      const post = getPostBySlug("ai-observability-stack-2026");
      expect(post!.content).toContain('class="references"');
      expect(post!.content).toContain("market.us");
      expect(post!.content).toContain("siliconangle.com");
      expect(post!.content).toContain("datadoghq.com");
      expect(post!.content).toContain("opentelemetry.io");
      expect(post!.content).toContain("anthropic.com");
    });

    it("Post 5 content has comparison tables for tools and layers", () => {
      const post = getPostBySlug("ai-observability-stack-2026");
      expect(post!.content).toContain("<table>");
      expect(post!.content).toContain("Langfuse");
      expect(post!.content).toContain("Arize Phoenix");
      expect(post!.content).toContain("Helicone");
      expect(post!.content).toContain("Braintrust");
      expect(post!.content).toContain("Model (Internal)");
    });

    it("Post 4 content contains expected sections", () => {
      const post = getPostBySlug("how-interpretability-makes-ai-security-work");
      expect(post!.content).toContain("<h2>");
      expect(post!.content).toContain("<p>");
      expect(post!.content).toContain("Arms Race Is Unwinnable");
      expect(post!.content).toContain("Constitutional Classifiers");
      expect(post!.content).toContain("CC-Delta");
      expect(post!.content).toContain("Sparse Autoencoders");
      expect(post!.content).toContain("linear probes");
      expect(post!.content).toContain("Subspace Rerouting");
    });

    it("Post 4 content has references section with 11 citations", () => {
      const post = getPostBySlug("how-interpretability-makes-ai-security-work");
      expect(post!.content).toContain('class="references"');
      expect(post!.content).toContain("Anthropic");
      expect(post!.content).toContain("arxiv.org");
      expect(post!.content).toContain("alignment.anthropic.com");
      expect(post!.content).toContain("EU Artificial Intelligence Act");
    });

    it("Post 4 content has tables for detection methods and production architecture", () => {
      const post = getPostBySlug("how-interpretability-makes-ai-security-work");
      expect(post!.content).toContain("<table>");
      expect(post!.content).toContain("Detection Method");
      expect(post!.content).toContain("EMA linear probe");
      expect(post!.content).toContain("SAE feature monitoring");
      expect(post!.content).toContain("Activation steering");
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
