/**
 * Prysm AI — Multi-Provider Router
 *
 * Detects the correct provider from a model name and resolves
 * the upstream API key + base URL from the project's providerKeys.
 *
 * Priority order:
 * 1. X-Prysm-Provider header (explicit override)
 * 2. Model name pattern matching (claude-* → anthropic, gpt-* → openai, etc.)
 * 3. Project's defaultProvider setting
 * 4. Legacy providerConfig fallback
 */

// ─── Known model prefixes → provider mapping ───

const MODEL_PROVIDER_RULES: Array<{ pattern: RegExp; provider: string }> = [
  // Anthropic
  { pattern: /^claude-/i, provider: "anthropic" },

  // OpenAI
  { pattern: /^gpt-/i, provider: "openai" },
  { pattern: /^o[1-9]-/i, provider: "openai" },       // o1-preview, o3-mini, etc.
  { pattern: /^o[1-9]$/i, provider: "openai" },        // o1, o3, etc.
  { pattern: /^chatgpt-/i, provider: "openai" },
  { pattern: /^dall-e/i, provider: "openai" },
  { pattern: /^tts-/i, provider: "openai" },
  { pattern: /^whisper/i, provider: "openai" },
  { pattern: /^text-embedding/i, provider: "openai" },
  { pattern: /^text-davinci/i, provider: "openai" },
  { pattern: /^text-curie/i, provider: "openai" },
  { pattern: /^text-babbage/i, provider: "openai" },
  { pattern: /^text-ada/i, provider: "openai" },
  { pattern: /^davinci/i, provider: "openai" },
  { pattern: /^curie/i, provider: "openai" },
  { pattern: /^babbage/i, provider: "openai" },
  { pattern: /^ada/i, provider: "openai" },

  // Google / Gemini
  { pattern: /^gemini-/i, provider: "google" },
  { pattern: /^gemma-/i, provider: "google" },
  { pattern: /^palm-/i, provider: "google" },

  // Meta / Llama (typically via vLLM, Ollama, TGI — route as openai-compatible)
  { pattern: /^llama/i, provider: "openai" },
  { pattern: /^meta-llama/i, provider: "openai" },
  { pattern: /^codellama/i, provider: "openai" },

  // Mistral (OpenAI-compatible API)
  { pattern: /^mistral/i, provider: "openai" },
  { pattern: /^mixtral/i, provider: "openai" },
  { pattern: /^codestral/i, provider: "openai" },
  { pattern: /^pixtral/i, provider: "openai" },

  // Cohere
  { pattern: /^command/i, provider: "openai" },

  // DeepSeek
  { pattern: /^deepseek/i, provider: "openai" },

  // Qwen
  { pattern: /^qwen/i, provider: "openai" },
];

/**
 * Detect the provider from a model name.
 * Returns the provider string or null if no match.
 */
export function detectProviderFromModel(model: string): string | null {
  if (!model) return null;
  const normalized = model.trim();
  for (const rule of MODEL_PROVIDER_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.provider;
    }
  }
  return null;
}

// ─── Provider base URLs ───

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta/openai",
};

export function getDefaultBaseUrl(provider: string): string {
  return PROVIDER_BASE_URLS[provider.toLowerCase()] ?? "https://api.openai.com/v1";
}

// ─── Resolve provider + API key from project config ───

export interface ProviderResolution {
  provider: string;
  apiKey: string;
  baseUrl: string;
  source: "model_detection" | "explicit_header" | "default_provider" | "legacy_config" | "dynamic_key";
}

export interface ProjectProviderConfig {
  providerKeys?: Record<string, { apiKey: string; baseUrl?: string }> | null;
  defaultProvider?: string | null;
  providerConfig?: {
    provider: string;
    baseUrl: string;
    apiKeyEncrypted?: string;
  } | null;
}

/**
 * Resolve the provider, API key, and base URL for a request.
 *
 * Priority:
 * 1. X-Prysm-Provider header + matching key from providerKeys
 * 2. Model name detection + matching key from providerKeys
 * 3. defaultProvider + matching key from providerKeys
 * 4. Legacy providerConfig (single provider)
 * 5. X-Prysm-Upstream-Key with detected or default provider
 */
export function resolveProvider(
  model: string,
  project: ProjectProviderConfig,
  options?: {
    explicitProvider?: string;
    dynamicApiKey?: string;
  },
): ProviderResolution | null {
  const providerKeys = project.providerKeys ?? {};
  const legacyConfig = project.providerConfig;

  // 1. Explicit provider header
  if (options?.explicitProvider) {
    const provider = options.explicitProvider.toLowerCase();
    const keyConfig = providerKeys[provider];
    if (keyConfig?.apiKey) {
      return {
        provider,
        apiKey: keyConfig.apiKey,
        baseUrl: keyConfig.baseUrl ?? getDefaultBaseUrl(provider),
        source: "explicit_header",
      };
    }
    // Fallback: explicit provider but key only in legacy config
    if (legacyConfig?.provider?.toLowerCase() === provider && legacyConfig.apiKeyEncrypted) {
      return {
        provider,
        apiKey: legacyConfig.apiKeyEncrypted,
        baseUrl: legacyConfig.baseUrl ?? getDefaultBaseUrl(provider),
        source: "legacy_config",
      };
    }
    // Fallback: explicit provider with dynamic key
    if (options?.dynamicApiKey) {
      return {
        provider,
        apiKey: options.dynamicApiKey,
        baseUrl: getDefaultBaseUrl(provider),
        source: "dynamic_key",
      };
    }
    return null; // Explicit provider requested but no key available
  }

  // 2. Auto-detect from model name
  const detectedProvider = detectProviderFromModel(model);
  if (detectedProvider) {
    const keyConfig = providerKeys[detectedProvider];
    if (keyConfig?.apiKey) {
      return {
        provider: detectedProvider,
        apiKey: keyConfig.apiKey,
        baseUrl: keyConfig.baseUrl ?? getDefaultBaseUrl(detectedProvider),
        source: "model_detection",
      };
    }
    // Check legacy config for this provider
    if (legacyConfig?.provider?.toLowerCase() === detectedProvider && legacyConfig.apiKeyEncrypted) {
      return {
        provider: detectedProvider,
        apiKey: legacyConfig.apiKeyEncrypted,
        baseUrl: legacyConfig.baseUrl ?? getDefaultBaseUrl(detectedProvider),
        source: "legacy_config",
      };
    }
    // Dynamic key with detected provider
    if (options?.dynamicApiKey) {
      return {
        provider: detectedProvider,
        apiKey: options.dynamicApiKey,
        baseUrl: getDefaultBaseUrl(detectedProvider),
        source: "dynamic_key",
      };
    }
  }

  // 3. Default provider
  if (project.defaultProvider) {
    const provider = project.defaultProvider.toLowerCase();
    const keyConfig = providerKeys[provider];
    if (keyConfig?.apiKey) {
      return {
        provider,
        apiKey: keyConfig.apiKey,
        baseUrl: keyConfig.baseUrl ?? getDefaultBaseUrl(provider),
        source: "default_provider",
      };
    }
  }

  // 4. Legacy providerConfig fallback
  if (legacyConfig?.apiKeyEncrypted) {
    const provider = legacyConfig.provider?.toLowerCase() ?? "openai";
    return {
      provider,
      apiKey: legacyConfig.apiKeyEncrypted,
      baseUrl: provider === "google" || provider === "gemini"
        ? PROVIDER_BASE_URLS.google
        : legacyConfig.baseUrl ?? getDefaultBaseUrl(provider),
      source: "legacy_config",
    };
  }

  // 5. Dynamic key with no provider info — assume openai
  if (options?.dynamicApiKey) {
    const provider = detectedProvider ?? "openai";
    return {
      provider,
      apiKey: options.dynamicApiKey,
      baseUrl: getDefaultBaseUrl(provider),
      source: "dynamic_key",
    };
  }

  return null;
}

/**
 * Supported Models Reference (FINDING-001)
 *
 * The router auto-detects providers from model names using regex patterns.
 * Below is the complete list of supported model name patterns and example models.
 *
 * | Provider   | Pattern             | Example Models                                                  |
 * |------------|---------------------|-----------------------------------------------------------------|
 * | OpenAI     | gpt-*               | gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano      |
 * | OpenAI     | o[1-9](-*)?         | o1, o1-preview, o3, o3-mini                                    |
 * | OpenAI     | chatgpt-*           | chatgpt-4o-latest                                               |
 * | OpenAI     | text-embedding*     | text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002 |
 * | OpenAI     | text-davinci*       | text-davinci-003                                                |
 * | OpenAI     | whisper*            | whisper-1                                                       |
 * | OpenAI     | dall-e*             | dall-e-3, dall-e-2                                              |
 * | OpenAI     | tts-*               | tts-1, tts-1-hd                                                |
 * | Anthropic  | claude-*            | claude-sonnet-4-20250514, claude-3.5-sonnet, claude-3-opus      |
 * | Google     | gemini-*            | gemini-2.5-flash, gemini-2.5-pro, gemini-1.5-pro               |
 * | Google     | gemma-*             | gemma-2-9b, gemma-7b                                           |
 * | Meta       | llama*, meta-llama* | llama-3.1-70b, meta-llama/Llama-3.1-8B (via vLLM/Ollama)       |
 * | Mistral    | mistral*, mixtral*  | mistral-large, mixtral-8x7b, codestral, pixtral                |
 * | DeepSeek   | deepseek*           | deepseek-chat, deepseek-coder, deepseek-r1                     |
 * | Qwen       | qwen*               | qwen-2.5-72b, qwen-turbo                                       |
 * | Cohere     | command*            | command-r-plus, command-r                                       |
 *
 * Models routed as "openai" use the OpenAI-compatible API format.
 * Anthropic models are auto-translated via the Anthropic translation layer.
 * Google Gemini models use the OpenAI-compatible endpoint.
 *
 * To use a model not in this list, set X-Prysm-Provider header explicitly
 * or configure a defaultProvider in your project settings.
 */

/**
 * Get a structured list of all supported model patterns for documentation/API.
 */
export function getSupportedModels(): Array<{ provider: string; pattern: string; examples: string[] }> {
  return [
    { provider: "openai", pattern: "gpt-*", examples: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"] },
    { provider: "openai", pattern: "o[1-9]*", examples: ["o1", "o1-preview", "o3", "o3-mini"] },
    { provider: "openai", pattern: "chatgpt-*", examples: ["chatgpt-4o-latest"] },
    { provider: "openai", pattern: "text-embedding*", examples: ["text-embedding-3-small", "text-embedding-3-large"] },
    { provider: "openai", pattern: "whisper*", examples: ["whisper-1"] },
    { provider: "openai", pattern: "dall-e*", examples: ["dall-e-3", "dall-e-2"] },
    { provider: "openai", pattern: "tts-*", examples: ["tts-1", "tts-1-hd"] },
    { provider: "anthropic", pattern: "claude-*", examples: ["claude-sonnet-4-20250514", "claude-3.5-sonnet", "claude-3-opus"] },
    { provider: "google", pattern: "gemini-*", examples: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-pro"] },
    { provider: "google", pattern: "gemma-*", examples: ["gemma-2-9b"] },
    { provider: "openai", pattern: "llama*", examples: ["llama-3.1-70b", "meta-llama/Llama-3.1-8B"] },
    { provider: "openai", pattern: "mistral*", examples: ["mistral-large", "mixtral-8x7b", "codestral"] },
    { provider: "openai", pattern: "deepseek*", examples: ["deepseek-chat", "deepseek-coder", "deepseek-r1"] },
    { provider: "openai", pattern: "qwen*", examples: ["qwen-2.5-72b", "qwen-turbo"] },
    { provider: "openai", pattern: "command*", examples: ["command-r-plus", "command-r"] },
  ];
}

/**
 * Get list of connected providers for a project (for UI display).
 */
export function getConnectedProviders(project: ProjectProviderConfig): string[] {
  const providers = new Set<string>();

  // From providerKeys
  if (project.providerKeys) {
    for (const [provider, config] of Object.entries(project.providerKeys)) {
      if (config?.apiKey) {
        providers.add(provider.toLowerCase());
      }
    }
  }

  // From legacy config
  if (project.providerConfig?.apiKeyEncrypted && project.providerConfig.provider) {
    providers.add(project.providerConfig.provider.toLowerCase());
  }

  return Array.from(providers);
}
