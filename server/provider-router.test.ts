/**
 * Vitest tests for provider-router.ts — Multi-Provider Routing
 *
 * Tests cover:
 * 1. detectProviderFromModel — all 3 providers + edge cases
 * 2. resolveProvider — priority chain (explicit > model > default > legacy > dynamic)
 * 3. getConnectedProviders — provider enumeration
 * 4. getDefaultBaseUrl — URL resolution
 */

import { describe, it, expect } from "vitest";
import {
  detectProviderFromModel,
  resolveProvider,
  getConnectedProviders,
  getDefaultBaseUrl,
  type ProjectProviderConfig,
} from "./provider-router";

// ═══════════════════════════════════════════════════════════
// detectProviderFromModel
// ═══════════════════════════════════════════════════════════

describe("detectProviderFromModel", () => {
  // --- OpenAI models ---
  it("detects gpt-4o as openai", () => {
    expect(detectProviderFromModel("gpt-4o")).toBe("openai");
  });
  it("detects gpt-4o-mini as openai", () => {
    expect(detectProviderFromModel("gpt-4o-mini")).toBe("openai");
  });
  it("detects gpt-3.5-turbo as openai", () => {
    expect(detectProviderFromModel("gpt-3.5-turbo")).toBe("openai");
  });
  it("detects o1-preview as openai", () => {
    expect(detectProviderFromModel("o1-preview")).toBe("openai");
  });
  it("detects o3-mini as openai", () => {
    expect(detectProviderFromModel("o3-mini")).toBe("openai");
  });
  it("detects o1 as openai", () => {
    expect(detectProviderFromModel("o1")).toBe("openai");
  });
  it("detects text-embedding-3-small as openai", () => {
    expect(detectProviderFromModel("text-embedding-3-small")).toBe("openai");
  });
  it("detects chatgpt-4o-latest as openai", () => {
    expect(detectProviderFromModel("chatgpt-4o-latest")).toBe("openai");
  });

  // --- Anthropic models ---
  it("detects claude-sonnet-4-20250514 as anthropic", () => {
    expect(detectProviderFromModel("claude-sonnet-4-20250514")).toBe("anthropic");
  });
  it("detects claude-3-5-sonnet-20241022 as anthropic", () => {
    expect(detectProviderFromModel("claude-3-5-sonnet-20241022")).toBe("anthropic");
  });
  it("detects claude-3-5-haiku-20241022 as anthropic", () => {
    expect(detectProviderFromModel("claude-3-5-haiku-20241022")).toBe("anthropic");
  });
  it("detects claude-3-opus-20240229 as anthropic", () => {
    expect(detectProviderFromModel("claude-3-opus-20240229")).toBe("anthropic");
  });

  // --- Google models ---
  it("detects gemini-2.5-flash as google", () => {
    expect(detectProviderFromModel("gemini-2.5-flash")).toBe("google");
  });
  it("detects gemini-2.5-pro as google", () => {
    expect(detectProviderFromModel("gemini-2.5-pro")).toBe("google");
  });
  it("detects gemini-2.0-flash as google", () => {
    expect(detectProviderFromModel("gemini-2.0-flash")).toBe("google");
  });
  it("detects gemma-2-9b as google", () => {
    expect(detectProviderFromModel("gemma-2-9b")).toBe("google");
  });

  // --- OpenAI-compatible models (route as openai) ---
  it("detects llama-3.1-70b as openai (compatible)", () => {
    expect(detectProviderFromModel("llama-3.1-70b")).toBe("openai");
  });
  it("detects mistral-large as openai (compatible)", () => {
    expect(detectProviderFromModel("mistral-large")).toBe("openai");
  });
  it("detects deepseek-chat as openai (compatible)", () => {
    expect(detectProviderFromModel("deepseek-chat")).toBe("openai");
  });
  it("detects mixtral-8x7b as openai (compatible)", () => {
    expect(detectProviderFromModel("mixtral-8x7b")).toBe("openai");
  });
  it("detects qwen-2-72b as openai (compatible)", () => {
    expect(detectProviderFromModel("qwen-2-72b")).toBe("openai");
  });

  // --- Edge cases ---
  it("returns null for empty string", () => {
    expect(detectProviderFromModel("")).toBeNull();
  });
  it("returns null for unknown model", () => {
    expect(detectProviderFromModel("my-custom-model-v1")).toBeNull();
  });
  it("is case-insensitive", () => {
    expect(detectProviderFromModel("GPT-4o")).toBe("openai");
    expect(detectProviderFromModel("Claude-Sonnet-4-20250514")).toBe("anthropic");
    expect(detectProviderFromModel("Gemini-2.5-Flash")).toBe("google");
  });
  it("handles whitespace in model name", () => {
    expect(detectProviderFromModel("  gpt-4o  ")).toBe("openai");
  });
});

// ═══════════════════════════════════════════════════════════
// resolveProvider — Priority Chain
// ═══════════════════════════════════════════════════════════

describe("resolveProvider", () => {
  const multiKeyProject: ProjectProviderConfig = {
    providerKeys: {
      openai: { apiKey: "sk-openai-test-key" },
      anthropic: { apiKey: "sk-ant-test-key" },
      google: { apiKey: "google-test-key" },
    },
    defaultProvider: "openai",
    providerConfig: null,
  };

  const legacyProject: ProjectProviderConfig = {
    providerKeys: null,
    defaultProvider: null,
    providerConfig: {
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      apiKeyEncrypted: "sk-ant-legacy-key",
    },
  };

  const emptyProject: ProjectProviderConfig = {
    providerKeys: null,
    defaultProvider: null,
    providerConfig: null,
  };

  // --- Priority 1: Explicit provider header ---
  it("uses explicit provider header when set (OpenAI)", () => {
    const result = resolveProvider("some-model", multiKeyProject, { explicitProvider: "openai" });
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("openai");
    expect(result!.apiKey).toBe("sk-openai-test-key");
    expect(result!.source).toBe("explicit_header");
  });

  it("uses explicit provider header when set (Anthropic)", () => {
    const result = resolveProvider("some-model", multiKeyProject, { explicitProvider: "anthropic" });
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("anthropic");
    expect(result!.apiKey).toBe("sk-ant-test-key");
    expect(result!.source).toBe("explicit_header");
  });

  it("uses explicit provider header when set (Google)", () => {
    const result = resolveProvider("some-model", multiKeyProject, { explicitProvider: "google" });
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("google");
    expect(result!.apiKey).toBe("google-test-key");
    expect(result!.source).toBe("explicit_header");
  });

  it("falls back to legacy config for explicit provider", () => {
    const result = resolveProvider("some-model", legacyProject, { explicitProvider: "anthropic" });
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("anthropic");
    expect(result!.apiKey).toBe("sk-ant-legacy-key");
    expect(result!.source).toBe("legacy_config");
  });

  it("falls back to dynamic key for explicit provider", () => {
    const result = resolveProvider("some-model", emptyProject, {
      explicitProvider: "openai",
      dynamicApiKey: "sk-dynamic-key",
    });
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("openai");
    expect(result!.apiKey).toBe("sk-dynamic-key");
    expect(result!.source).toBe("dynamic_key");
  });

  it("returns null for explicit provider with no key available", () => {
    const result = resolveProvider("some-model", emptyProject, { explicitProvider: "openai" });
    expect(result).toBeNull();
  });

  // --- Priority 2: Model name detection ---
  it("auto-detects OpenAI from gpt-4o model name", () => {
    const result = resolveProvider("gpt-4o", multiKeyProject);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("openai");
    expect(result!.apiKey).toBe("sk-openai-test-key");
    expect(result!.source).toBe("model_detection");
  });

  it("auto-detects Anthropic from claude model name", () => {
    const result = resolveProvider("claude-sonnet-4-20250514", multiKeyProject);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("anthropic");
    expect(result!.apiKey).toBe("sk-ant-test-key");
    expect(result!.source).toBe("model_detection");
  });

  it("auto-detects Google from gemini model name", () => {
    const result = resolveProvider("gemini-2.5-flash", multiKeyProject);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("google");
    expect(result!.apiKey).toBe("google-test-key");
    expect(result!.source).toBe("model_detection");
  });

  it("falls back to legacy config when model detected but no providerKey", () => {
    const result = resolveProvider("claude-sonnet-4-20250514", legacyProject);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("anthropic");
    expect(result!.apiKey).toBe("sk-ant-legacy-key");
    expect(result!.source).toBe("legacy_config");
  });

  it("falls back to dynamic key when model detected but no stored key", () => {
    const result = resolveProvider("gpt-4o", emptyProject, { dynamicApiKey: "sk-dynamic" });
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("openai");
    expect(result!.apiKey).toBe("sk-dynamic");
    expect(result!.source).toBe("dynamic_key");
  });

  // --- Priority 3: Default provider ---
  it("uses default provider for unknown model", () => {
    const result = resolveProvider("my-custom-model", multiKeyProject);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("openai"); // defaultProvider
    expect(result!.apiKey).toBe("sk-openai-test-key");
    expect(result!.source).toBe("default_provider");
  });

  // --- Priority 4: Legacy config ---
  it("uses legacy config when no providerKeys and no default", () => {
    const result = resolveProvider("my-custom-model", legacyProject);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("anthropic");
    expect(result!.apiKey).toBe("sk-ant-legacy-key");
    expect(result!.source).toBe("legacy_config");
  });

  // --- Priority 5: Dynamic key ---
  it("uses dynamic key with detected provider as last resort", () => {
    const result = resolveProvider("gpt-4o", emptyProject, { dynamicApiKey: "sk-dynamic" });
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("openai");
    expect(result!.apiKey).toBe("sk-dynamic");
    expect(result!.source).toBe("dynamic_key");
  });

  it("uses dynamic key with openai default for unknown model", () => {
    const result = resolveProvider("unknown-model", emptyProject, { dynamicApiKey: "sk-dynamic" });
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("openai"); // fallback
    expect(result!.apiKey).toBe("sk-dynamic");
    expect(result!.source).toBe("dynamic_key");
  });

  it("returns null when nothing is available", () => {
    const result = resolveProvider("gpt-4o", emptyProject);
    expect(result).toBeNull();
  });

  // --- Base URL resolution ---
  it("uses default OpenAI base URL", () => {
    const result = resolveProvider("gpt-4o", multiKeyProject);
    expect(result!.baseUrl).toBe("https://api.openai.com/v1");
  });

  it("uses default Anthropic base URL", () => {
    const result = resolveProvider("claude-sonnet-4-20250514", multiKeyProject);
    expect(result!.baseUrl).toBe("https://api.anthropic.com/v1");
  });

  it("uses default Google base URL", () => {
    const result = resolveProvider("gemini-2.5-flash", multiKeyProject);
    expect(result!.baseUrl).toBe("https://generativelanguage.googleapis.com/v1beta/openai");
  });

  it("uses custom base URL from providerKeys", () => {
    const customProject: ProjectProviderConfig = {
      providerKeys: {
        openai: { apiKey: "sk-test", baseUrl: "https://my-vllm.example.com/v1" },
      },
      defaultProvider: "openai",
      providerConfig: null,
    };
    const result = resolveProvider("gpt-4o", customProject);
    expect(result!.baseUrl).toBe("https://my-vllm.example.com/v1");
  });

  // --- Mixed scenarios ---
  it("explicit header overrides model detection", () => {
    // Model says "gpt-4o" (openai), but header says "anthropic"
    const result = resolveProvider("gpt-4o", multiKeyProject, { explicitProvider: "anthropic" });
    expect(result!.provider).toBe("anthropic");
    expect(result!.apiKey).toBe("sk-ant-test-key");
  });

  it("handles project with only one provider key — falls to default when detected key missing", () => {
    const singleProvider: ProjectProviderConfig = {
      providerKeys: { anthropic: { apiKey: "sk-ant-only" } },
      defaultProvider: "anthropic",
      providerConfig: null,
    };
    // OpenAI model but only anthropic key available
    // Model detects openai, no openai key → falls through to defaultProvider (anthropic)
    const result = resolveProvider("gpt-4o", singleProvider);
    expect(result).not.toBeNull();
    expect(result!.provider).toBe("anthropic");
    expect(result!.apiKey).toBe("sk-ant-only");
    expect(result!.source).toBe("default_provider");
  });

  it("handles project with only one provider key and unknown model", () => {
    const singleProvider: ProjectProviderConfig = {
      providerKeys: { anthropic: { apiKey: "sk-ant-only" } },
      defaultProvider: "anthropic",
      providerConfig: null,
    };
    const result = resolveProvider("unknown-model", singleProvider);
    expect(result!.provider).toBe("anthropic");
    expect(result!.apiKey).toBe("sk-ant-only");
    expect(result!.source).toBe("default_provider");
  });
});

// ═══════════════════════════════════════════════════════════
// getConnectedProviders
// ═══════════════════════════════════════════════════════════

describe("getConnectedProviders", () => {
  it("returns all providers from providerKeys", () => {
    const project: ProjectProviderConfig = {
      providerKeys: {
        openai: { apiKey: "sk-test" },
        anthropic: { apiKey: "sk-ant" },
        google: { apiKey: "goog" },
      },
      defaultProvider: "openai",
      providerConfig: null,
    };
    const providers = getConnectedProviders(project);
    expect(providers).toContain("openai");
    expect(providers).toContain("anthropic");
    expect(providers).toContain("google");
    expect(providers).toHaveLength(3);
  });

  it("includes legacy provider", () => {
    const project: ProjectProviderConfig = {
      providerKeys: null,
      defaultProvider: null,
      providerConfig: {
        provider: "anthropic",
        baseUrl: "https://api.anthropic.com/v1",
        apiKeyEncrypted: "sk-ant-legacy",
      },
    };
    const providers = getConnectedProviders(project);
    expect(providers).toContain("anthropic");
    expect(providers).toHaveLength(1);
  });

  it("deduplicates providers from both sources", () => {
    const project: ProjectProviderConfig = {
      providerKeys: { anthropic: { apiKey: "sk-ant-new" } },
      defaultProvider: "anthropic",
      providerConfig: {
        provider: "anthropic",
        baseUrl: "https://api.anthropic.com/v1",
        apiKeyEncrypted: "sk-ant-legacy",
      },
    };
    const providers = getConnectedProviders(project);
    expect(providers).toContain("anthropic");
    expect(providers).toHaveLength(1);
  });

  it("returns empty array for no providers", () => {
    const project: ProjectProviderConfig = {
      providerKeys: null,
      defaultProvider: null,
      providerConfig: null,
    };
    expect(getConnectedProviders(project)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════
// getDefaultBaseUrl
// ═══════════════════════════════════════════════════════════

describe("getDefaultBaseUrl", () => {
  it("returns OpenAI URL for openai", () => {
    expect(getDefaultBaseUrl("openai")).toBe("https://api.openai.com/v1");
  });
  it("returns Anthropic URL for anthropic", () => {
    expect(getDefaultBaseUrl("anthropic")).toBe("https://api.anthropic.com/v1");
  });
  it("returns Google URL for google", () => {
    expect(getDefaultBaseUrl("google")).toBe("https://generativelanguage.googleapis.com/v1beta/openai");
  });
  it("returns OpenAI URL as fallback for unknown provider", () => {
    expect(getDefaultBaseUrl("unknown")).toBe("https://api.openai.com/v1");
  });
  it("is case-insensitive", () => {
    expect(getDefaultBaseUrl("OpenAI")).toBe("https://api.openai.com/v1");
    expect(getDefaultBaseUrl("ANTHROPIC")).toBe("https://api.anthropic.com/v1");
  });
});
