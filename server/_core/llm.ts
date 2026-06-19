import { ENV } from "./env";
import { getRealGPTPrompt } from "./realGPT";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  model?: string;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  provider?: string;
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

type ProviderConfig = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
};

type ProviderState = {
  failures: number;
  successes: number;
  openedUntil: number;
  lastError?: string;
  lastStatus?: number;
  lastLatencyMs?: number;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
};

export type LLMProviderStatus = ProviderState & {
  name: string;
  circuitOpen: boolean;
};

const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_CIRCUIT_FAILURES = 3;
const DEFAULT_CIRCUIT_COOLDOWN_MS = 60_000;

const providerState = new Map<string, ProviderState>();

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

const intFromEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const nonNegativeIntFromEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const normalizeChatCompletionsUrl = (baseUrl: string): string => {
  const clean = trimTrailingSlash(baseUrl);
  if (clean.endsWith("/chat/completions")) return clean;
  if (clean.endsWith("/v1")) return `${clean}/chat/completions`;
  return `${clean}/v1/chat/completions`;
};

const parseJsonProviders = (): Array<Partial<ProviderConfig>> => {
  const raw = process.env.LLM_FALLBACKS || process.env.CREATORVAULT_LLM_FALLBACKS || "";
  if (!raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("[LLM] Ignoring invalid LLM_FALLBACKS JSON", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};

const createProvider = (candidate: {
  name: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
}): ProviderConfig | null => {
  if (!candidate.apiKey || !candidate.apiKey.trim()) return null;

  return {
    name: candidate.name,
    baseUrl: normalizeChatCompletionsUrl(candidate.baseUrl || "https://api.openai.com"),
    apiKey: candidate.apiKey,
    model: candidate.model || process.env.LLM_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL,
    timeoutMs: candidate.timeoutMs || intFromEnv("LLM_TIMEOUT_MS", DEFAULT_TIMEOUT_MS),
    maxRetries: candidate.maxRetries ?? nonNegativeIntFromEnv("LLM_PROVIDER_RETRIES", DEFAULT_MAX_RETRIES),
  };
};

const resolveProviders = (requestedModel?: string): ProviderConfig[] => {
  const timeoutMs = intFromEnv("LLM_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
  const maxRetries = nonNegativeIntFromEnv("LLM_PROVIDER_RETRIES", DEFAULT_MAX_RETRIES);
  const providers: ProviderConfig[] = [];

  const primary = createProvider({
    name: process.env.LLM_PRIMARY_NAME || "openai-primary",
    baseUrl: process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE || "https://api.openai.com",
    apiKey: process.env.OPENAI_API_KEY || ENV.forgeApiKey,
    model: requestedModel || process.env.OPENAI_MODEL || process.env.LLM_MODEL || DEFAULT_MODEL,
    timeoutMs,
    maxRetries,
  });
  if (primary) providers.push(primary);

  const explicitFallback = createProvider({
    name: process.env.LLM_FALLBACK_NAME || "configured-fallback",
    baseUrl: process.env.LLM_FALLBACK_BASE_URL || process.env.CREATORVAULT_LLM_FALLBACK_BASE_URL,
    apiKey: process.env.LLM_FALLBACK_API_KEY || process.env.CREATORVAULT_LLM_FALLBACK_API_KEY,
    model: requestedModel || process.env.LLM_FALLBACK_MODEL || process.env.CREATORVAULT_LLM_FALLBACK_MODEL,
    timeoutMs,
    maxRetries,
  });
  if (explicitFallback) providers.push(explicitFallback);

  const backupOpenAI = createProvider({
    name: process.env.OPENAI_BACKUP_NAME || "openai-backup",
    baseUrl: process.env.OPENAI_BACKUP_BASE_URL || process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE || "https://api.openai.com",
    apiKey: process.env.OPENAI_BACKUP_API_KEY,
    model: requestedModel || process.env.OPENAI_BACKUP_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL,
    timeoutMs,
    maxRetries,
  });
  if (backupOpenAI) providers.push(backupOpenAI);

  const openRouter = createProvider({
    name: "openrouter",
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    model: requestedModel || process.env.OPENROUTER_MODEL,
    timeoutMs,
    maxRetries,
  });
  if (openRouter) providers.push(openRouter);

  for (const provider of parseJsonProviders()) {
    const resolved = createProvider({
      name: String(provider.name || `json-fallback-${providers.length + 1}`),
      baseUrl: String(provider.baseUrl || ""),
      apiKey: String(provider.apiKey || ""),
      model: requestedModel || String(provider.model || ""),
      timeoutMs: Number(provider.timeoutMs) || timeoutMs,
      maxRetries: Number.isFinite(Number(provider.maxRetries)) ? Number(provider.maxRetries) : maxRetries,
    });
    if (resolved) providers.push(resolved);
  }

  const seen = new Set<string>();
  return providers.filter(provider => {
    const key = `${provider.name}:${provider.baseUrl}:${provider.model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getState = (providerName: string): ProviderState => {
  const existing = providerState.get(providerName);
  if (existing) return existing;
  const created: ProviderState = {
    failures: 0,
    successes: 0,
    openedUntil: 0,
  };
  providerState.set(providerName, created);
  return created;
};

const isCircuitOpen = (providerName: string): boolean => {
  const state = getState(providerName);
  return state.openedUntil > Date.now();
};

const classifyFailure = (status?: number, error?: unknown): { retryable: boolean; reason: string } => {
  if (typeof status === "number") {
    if (status === 408 || status === 409 || status === 425 || status === 429 || status >= 500) {
      return { retryable: true, reason: `retryable_http_${status}` };
    }
    return { retryable: false, reason: `non_retryable_http_${status}` };
  }

  const message = error instanceof Error ? error.message : String(error || "unknown_error");
  if (/abort|timeout|network|fetch failed|ECONNRESET|ETIMEDOUT/i.test(message)) {
    return { retryable: true, reason: "retryable_transport" };
  }

  return { retryable: true, reason: "retryable_unknown" };
};

const recordSuccess = (provider: ProviderConfig, latencyMs: number): void => {
  const state = getState(provider.name);
  state.successes += 1;
  state.failures = 0;
  state.openedUntil = 0;
  state.lastLatencyMs = latencyMs;
  state.lastAttemptAt = new Date().toISOString();
  state.lastSuccessAt = state.lastAttemptAt;
  delete state.lastError;
  delete state.lastStatus;
};

const recordFailure = (provider: ProviderConfig, errorMessage: string, status?: number, latencyMs?: number): void => {
  const state = getState(provider.name);
  state.failures += 1;
  state.lastError = errorMessage.slice(0, 500);
  state.lastStatus = status;
  state.lastLatencyMs = latencyMs;
  state.lastAttemptAt = new Date().toISOString();

  const threshold = intFromEnv("LLM_CIRCUIT_BREAKER_FAILURES", DEFAULT_CIRCUIT_FAILURES);
  if (state.failures >= threshold) {
    state.openedUntil = Date.now() + intFromEnv("LLM_CIRCUIT_BREAKER_COOLDOWN_MS", DEFAULT_CIRCUIT_COOLDOWN_MS);
  }
};

const logTelemetry = (event: string, fields: Record<string, unknown>): void => {
  const payload = {
    event,
    at: new Date().toISOString(),
    ...fields,
  };
  const line = `[LLM] ${JSON.stringify(payload)}`;
  if (event.includes("failed") || event.includes("circuit") || event.includes("exhausted")) {
    console.warn(line);
  } else {
    console.info(line);
  }
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const buildPayload = (params: InvokeParams, provider: ProviderConfig): Record<string, unknown> => {
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    maxTokens,
    max_tokens,
  } = params;

  const payload: Record<string, unknown> = {
    model: provider.model,
    messages: messages.map(normalizeMessage),
    max_tokens: maxTokens || max_tokens || DEFAULT_MAX_TOKENS,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  return payload;
};

const invokeProvider = async (provider: ProviderConfig, params: InvokeParams): Promise<InvokeResult> => {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), provider.timeoutMs);

  try {
    const response = await fetch(provider.baseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(buildPayload(params, provider)),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(
        `LLM provider ${provider.name} failed: ${response.status} ${response.statusText} – ${errorText}`
      );
      (error as Error & { status?: number }).status = response.status;
      recordFailure(provider, error.message, response.status, latencyMs);
      throw error;
    }

    const json = (await response.json()) as InvokeResult;
    recordSuccess(provider, latencyMs);
    logTelemetry("llm_provider_success", {
      provider: provider.name,
      model: provider.model,
      latencyMs,
      totalTokens: json.usage?.total_tokens,
    });
    return {
      ...json,
      model: json.model || provider.model,
      provider: provider.name,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const status = (error as Error & { status?: number })?.status;
    if (status === undefined) {
      recordFailure(provider, error instanceof Error ? error.message : String(error), status, latencyMs);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export function getLLMProviderStatus(): LLMProviderStatus[] {
  return Array.from(providerState.entries()).map(([name, state]) => ({
    name,
    ...state,
    circuitOpen: state.openedUntil > Date.now(),
  }));
}

export function resetLLMProviderStatusForTests(): void {
  if (process.env.NODE_ENV === "test") {
    providerState.clear();
  }
}

/**
 * Invoke LLM with RealGPT personality (KingCam AI).
 * Automatically injects the RealGPT system prompt with cultural intelligence.
 */
export async function invokeRealGPT(params: Omit<InvokeParams, "messages"> & {
  userMessage: string;
  country?: "US" | "DR" | "HT";
  mode?: "KingCam" | "Cameron" | "Cam" | "Architect" | "Lion" | "Realist" | "Dad";
  conversationHistory?: Message[];
}): Promise<InvokeResult> {
  const systemPrompt = getRealGPTPrompt({
    country: params.country,
    mode: params.mode,
  });

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...(params.conversationHistory || []),
    { role: "user", content: params.userMessage },
  ];

  return invokeLLM({
    ...params,
    messages,
  });
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const providers = resolveProviders(params.model);

  if (providers.length === 0) {
    throw new Error("No LLM providers configured. Set OPENAI_API_KEY or a configured LLM fallback provider key.");
  }

  const errors: string[] = [];

  for (const provider of providers) {
    if (isCircuitOpen(provider.name)) {
      const state = getState(provider.name);
      const skipMessage = `LLM provider ${provider.name} circuit open until ${new Date(state.openedUntil).toISOString()}`;
      errors.push(skipMessage);
      logTelemetry("llm_provider_circuit_open", {
        provider: provider.name,
        openedUntil: new Date(state.openedUntil).toISOString(),
      });
      continue;
    }

    for (let attempt = 0; attempt <= provider.maxRetries; attempt += 1) {
      try {
        if (attempt > 0) {
          const backoffMs = Math.min(2_000, 250 * 2 ** (attempt - 1));
          await sleep(backoffMs);
        }

        return await invokeProvider(provider, params);
      } catch (error) {
        const status = (error as Error & { status?: number })?.status;
        const failure = classifyFailure(status, error);
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${provider.name} attempt ${attempt + 1}: ${message}`);
        logTelemetry("llm_provider_attempt_failed", {
          provider: provider.name,
          attempt: attempt + 1,
          maxAttempts: provider.maxRetries + 1,
          retryable: failure.retryable,
          reason: failure.reason,
          status,
        });

        if (!failure.retryable || attempt >= provider.maxRetries) {
          if (!failure.retryable) {
            throw new Error(`LLM invoke failed without retry: ${message}`);
          }
          break;
        }
      }
    }
  }

  logTelemetry("llm_providers_exhausted", {
    providersTried: providers.map(provider => provider.name),
    errorCount: errors.length,
  });
  throw new Error(`LLM invoke failed across configured providers: ${errors.join(" | ")}`);
}
