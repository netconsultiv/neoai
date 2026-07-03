// src/server/lib/providers.ts
// -----------------------------------------------------------------------------
// Model access for NeoAI nodes.
//
//   * TEXT (llm node): via @nocobase/plugin-ai when present — the owner-approved
//     central model/key management (llmServices collection, Settings → AI).
//     plugin-ai's API surface is partly undocumented, so everything is kept
//     behind THIS one adapter (CRM-SPEC §16 encapsulation rule) and probed
//     defensively; on any shape drift we fall back to the raw Gemini REST path
//     so a NeoAI run never depends on plugin-ai internals to merely function.
//   * IMAGE (image node): ALWAYS the raw Gemini REST path — proven convention
//     from @neomodul/konfigurator (renderPhotoAi/generateTextures):
//     POST generateContent, `x-goog-api-key`, snake_case parts, 60s abort,
//     status-only logging, key never echoed.
//
// Key resolution (raw path): env GEMINI_API_KEY → neoai_settings.gemini_api_key
// → konfigurator_plugin_settings.ai_photo_api_key (read-only courtesy fallback,
// it is the same shared key on staging).

import { isSandbox } from './env';
import { MOCK_IMAGE_DATA_URL, mockFromSchema, mockLlmText, mockUsage } from './mock';

export const GEMINI_TIMEOUT_MS = 60_000;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export type LlmResult = {
  text: string;
  json?: any;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
  via: 'plugin-ai' | 'gemini-rest' | 'mock';
};

export type ImageResult = {
  imageDataUrl: string;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
};

export async function resolveGeminiKey(app: any): Promise<string> {
  const envKey = String(process.env.GEMINI_API_KEY ?? '').trim();
  if (envKey) return envKey;
  try {
    const own = await app.db.getRepository('neoai_settings')?.findOne();
    const k = String(own?.get?.('gemini_api_key') ?? '').trim();
    if (k) return k;
  } catch {
    /* settings not provisioned yet */
  }
  try {
    const konf = await app.db.getRepository('konfigurator_plugin_settings')?.findOne();
    const k = String(konf?.get?.('ai_photo_api_key') ?? '').trim();
    if (k) return k;
  } catch {
    /* konfigurator not co-installed */
  }
  return '';
}

function extractJson(text: string): any {
  // Strict-JSON prompts still occasionally come back fenced — strip and parse.
  const cleaned = String(text ?? '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// plugin-ai adapter (probed, never trusted blindly)

function normalizeLangchainContent(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p: any) => (typeof p === 'string' ? p : p?.text ?? ''))
      .filter(Boolean)
      .join('\n');
  }
  return content == null ? '' : String(content);
}

async function invokeViaPluginAi(
  app: any,
  opts: { service?: string; model?: string; system?: string; prompt: string; jsonSchema?: any; temperature?: number; maxTokens?: number },
  signal: AbortSignal,
): Promise<LlmResult | null> {
  const ai: any = app.pm?.get?.('ai');
  const manager: any = ai?.aiManager;
  if (!manager?.getLLMService && !manager?.llmProviders) return null;

  // Resolve service name: explicit → configured default → first enabled.
  let serviceName = String(opts.service ?? '').trim();
  if (!serviceName) {
    try {
      const settings = await app.db.getRepository('neoai_settings')?.findOne();
      serviceName = String(settings?.get?.('default_llm_service') ?? '').trim();
    } catch {
      /* ignore */
    }
  }

  const modelOptions: any = {};
  if (opts.model) modelOptions.model = opts.model;
  if (opts.temperature != null) modelOptions.temperature = opts.temperature;
  if (opts.maxTokens != null) modelOptions.maxOutputTokens = opts.maxTokens;

  let provider: any = null;
  let resolvedModel = String(opts.model ?? '');
  try {
    if (typeof manager.getLLMService === 'function') {
      // v2.1.x shape: getLLMService({ llmService, modelOptions }) → { provider, model, service }
      const got = await manager.getLLMService({ llmService: serviceName || undefined, modelOptions });
      provider = got?.provider ?? got;
      resolvedModel = String(got?.model ?? resolvedModel);
    }
  } catch (err) {
    app.logger?.info?.(`[neoai] plugin-ai getLLMService unavailable (${(err as any)?.message ?? err}) — raw fallback`);
    return null;
  }
  if (!provider?.invoke) return null;

  const messages: any[] = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: opts.prompt });

  const structuredOutput = opts.jsonSchema
    ? { responseFormat: 'json_schema', schema: opts.jsonSchema }
    : undefined;

  const res: any = await provider.invoke({ messages, structuredOutput }, { signal });
  // LangChain AIMessage-ish: content + usage_metadata; structured output may
  // land in .parsed / .structuredOutput depending on provider version.
  const msg: any = res?.message ?? res;
  const text = normalizeLangchainContent(msg?.content ?? msg?.text ?? '');
  const usageMeta: any = msg?.usage_metadata ?? res?.usage_metadata ?? res?.usage ?? {};
  const json = msg?.parsed ?? res?.parsed ?? (opts.jsonSchema ? extractJson(text) : undefined);
  return {
    text,
    json,
    usage: {
      inputTokens: Number(usageMeta.input_tokens ?? usageMeta.promptTokens ?? 0) || 0,
      outputTokens: Number(usageMeta.output_tokens ?? usageMeta.completionTokens ?? 0) || 0,
    },
    model: resolvedModel || 'via-plugin-ai',
    via: 'plugin-ai',
  };
}

// ---------------------------------------------------------------------------
// Raw Gemini REST (text + image) — konfigurator conventions.

async function geminiFetch(app: any, model: string, body: any, key: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const res = await fetch(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    // Status-only logging — never the key, never the payload.
    app.logger?.info?.(`[neoai] gemini ${model} → ${res.status}`);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`gemini ${model} HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function geminiUsage(data: any): { inputTokens: number; outputTokens: number } {
  const u = data?.usageMetadata ?? {};
  return {
    inputTokens: Number(u.promptTokenCount ?? 0) || 0,
    outputTokens: Number(u.candidatesTokenCount ?? u.totalTokenCount ?? 0) || 0,
  };
}

async function invokeGeminiText(
  app: any,
  opts: { model?: string; system?: string; prompt: string; jsonSchema?: any; temperature?: number; maxTokens?: number },
  key: string,
): Promise<LlmResult> {
  const model = opts.model || 'gemini-2.5-flash';
  const body: any = {
    contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      ...(opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
      ...(opts.jsonSchema ? { response_mime_type: 'application/json' } : {}),
    },
  };
  if (opts.system) body.system_instruction = { parts: [{ text: opts.system }] };
  const data = await geminiFetch(app, model, body, key);
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: any) => p?.text ?? '').join('');
  return {
    text,
    json: opts.jsonSchema ? extractJson(text) : undefined,
    usage: geminiUsage(data),
    model,
    via: 'gemini-rest',
  };
}

// ---------------------------------------------------------------------------
// Public API

export async function llmInvoke(
  app: any,
  opts: { service?: string; model?: string; system?: string; prompt: string; jsonSchema?: any; temperature?: number; maxTokens?: number },
): Promise<LlmResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const viaAi = await invokeViaPluginAi(app, opts, controller.signal).catch((err) => {
      app.logger?.warn?.(`[neoai] plugin-ai invoke failed (${err?.message ?? err}) — raw fallback`);
      return null;
    });
    if (viaAi) return viaAi;
  } finally {
    clearTimeout(timer);
  }
  const key = await resolveGeminiKey(app);
  if (!key) {
    // Sandbox-only mock (NEOAI_SANDBOX=1): keeps E2E walkable without a key or
    // spend; NEVER fires on staging/prod (flag unset ⇒ hard error, as before).
    if (isSandbox()) {
      app.logger?.info?.('[neoai] llm MOCK (sandbox, no key/plugin-ai)');
      return {
        text: mockLlmText(opts.prompt),
        json: opts.jsonSchema ? mockFromSchema(opts.jsonSchema) : undefined,
        usage: mockUsage(opts.prompt),
        model: 'mock',
        via: 'mock',
      };
    }
    throw new Error(
      'no LLM available: plugin-ai has no usable llmService and no Gemini key is configured (GEMINI_API_KEY / neoai_settings.gemini_api_key)',
    );
  }
  return invokeGeminiText(app, opts, key);
}

export async function imageInvoke(
  app: any,
  opts: { model?: string; prompt: string; imageDataUrl?: string },
): Promise<ImageResult> {
  const key = await resolveGeminiKey(app);
  if (!key) {
    if (isSandbox()) {
      app.logger?.info?.('[neoai] image MOCK (sandbox, no key)');
      return { imageDataUrl: MOCK_IMAGE_DATA_URL, usage: { inputTokens: 0, outputTokens: 0 }, model: 'mock' };
    }
    throw new Error('no Gemini key configured for image node');
  }
  const model = opts.model || 'gemini-2.5-flash-image';
  const parts: any[] = [{ text: opts.prompt }];
  if (opts.imageDataUrl) {
    const m = String(opts.imageDataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error('image node: imageDataUrl must be a base64 data URL');
    parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
  }
  const data = await geminiFetch(app, model, { contents: [{ role: 'user', parts }] }, key);
  const outParts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  const img = outParts.find((p: any) => p?.inlineData?.data || p?.inline_data?.data);
  const inline = img?.inlineData ?? img?.inline_data;
  if (!inline?.data) throw new Error(`gemini ${model} returned no image`);
  const mime = inline.mimeType ?? inline.mime_type ?? 'image/png';
  return {
    imageDataUrl: `data:${mime};base64,${inline.data}`,
    usage: geminiUsage(data),
    model,
  };
}
