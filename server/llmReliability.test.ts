import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const resetEnv = () => {
  process.env = { ...ORIGINAL_ENV, NODE_ENV: "test" };
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_BASE;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;
  delete process.env.LLM_FALLBACK_API_KEY;
  delete process.env.LLM_FALLBACK_BASE_URL;
  delete process.env.LLM_FALLBACK_MODEL;
  delete process.env.OPENAI_BACKUP_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.LLM_PROVIDER_RETRIES;
  delete process.env.LLM_CIRCUIT_BREAKER_FAILURES;
  delete process.env.LLM_CIRCUIT_BREAKER_COOLDOWN_MS;
};

describe("LLM provider reliability foundation", () => {
  beforeEach(() => {
    vi.resetModules();
    resetEnv();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetEnv();
  });

  it("falls back to a configured secondary provider after a retryable primary provider failure", async () => {
    process.env.OPENAI_API_KEY = "primary-key";
    process.env.OPENAI_API_BASE = "https://primary.example/v1";
    process.env.OPENAI_MODEL = "primary-model";
    process.env.LLM_FALLBACK_API_KEY = "fallback-key";
    process.env.LLM_FALLBACK_BASE_URL = "https://fallback.example/v1";
    process.env.LLM_FALLBACK_MODEL = "fallback-model";
    process.env.LLM_PROVIDER_RETRIES = "0";
    process.env.LLM_CIRCUIT_BREAKER_FAILURES = "1";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("quota exceeded", { status: 429, statusText: "Too Many Requests" })
      )
      .mockResolvedValueOnce(
        Response.json({
          id: "chatcmpl_success",
          created: 1,
          model: "fallback-model",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "fallback worked" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const { getLLMProviderStatus, invokeLLM, resetLLMProviderStatusForTests } = await import("./_core/llm");
    resetLLMProviderStatusForTests();

    const result = await invokeLLM({
      messages: [{ role: "user", content: "prove fallback" }],
    });

    expect(result.provider).toBe("configured-fallback");
    expect(result.choices[0].message.content).toBe("fallback worked");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://primary.example/v1/chat/completions");
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://fallback.example/v1/chat/completions");

    const status = getLLMProviderStatus();
    expect(status.find(provider => provider.name === "openai-primary")?.circuitOpen).toBe(true);
    expect(status.find(provider => provider.name === "configured-fallback")?.successes).toBe(1);
  });

  it("sends caller maxTokens into the actual provider request payload", async () => {
    process.env.OPENAI_API_KEY = "primary-key";
    process.env.OPENAI_API_BASE = "https://primary.example";
    process.env.OPENAI_MODEL = "primary-model";

    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        id: "chatcmpl_tokens",
        created: 1,
        model: "primary-model",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "ok" },
            finish_reason: "stop",
          },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { invokeLLM, resetLLMProviderStatusForTests } = await import("./_core/llm");
    resetLLMProviderStatusForTests();

    await invokeLLM({
      messages: [{ role: "user", content: "token cap" }],
      maxTokens: 123,
    });

    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.max_tokens).toBe(123);
    expect(request.model).toBe("primary-model");
  });
});
