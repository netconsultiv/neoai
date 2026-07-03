var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// package.json
var require_package = __commonJS({
  "package.json"(exports2, module2) {
    module2.exports = {
      name: "@neomodul/neoai",
      version: "0.1.6",
      displayName: "NeoAI",
      description: "NeoAI for NeoBase: central AI workflow management \u2014 tree-structured multi-step workflows (LLM, image, HTTP, data and approval nodes) with a visual editor, run monitor, cost tracking and a function registry other @neomodul plugins dispatch through. Gemini-first via @nocobase/plugin-ai; legacy code paths stay as fallback.",
      license: "UNLICENSED",
      private: true,
      main: "dist/server/index.js",
      homepage: "https://github.com/netconsultiv/neoai",
      scripts: {
        build: "node build-server.js && node build-client.js",
        test: "node --experimental-strip-types --test test/*.test.mjs"
      },
      peerDependencies: {
        "@nocobase/client": "2.x",
        "@nocobase/server": "2.x"
      },
      devDependencies: {
        esbuild: "^0.21.5"
      },
      keywords: [
        "nocobase",
        "neomodul",
        "ai",
        "workflows",
        "gemini"
      ]
    };
  }
});

// src/server/index.ts
var server_exports = {};
__export(server_exports, {
  default: () => NeoaiPlugin
});
module.exports = __toCommonJS(server_exports);

// src/server/plugin.ts
var import_server = require("@nocobase/server");

// src/server/collections.ts
var str = (name, title, extra = {}) => ({
  name,
  type: "string",
  interface: "input",
  uiSchema: { type: "string", title, "x-component": "Input" },
  ...extra
});
var text = (name, title) => ({
  name,
  type: "text",
  interface: "textarea",
  uiSchema: { type: "string", title, "x-component": "Input.TextArea" }
});
var bool = (name, title, defaultValue = false) => ({
  name,
  type: "boolean",
  interface: "checkbox",
  defaultValue,
  uiSchema: { type: "boolean", title, "x-component": "Checkbox" }
});
var int = (name, title, defaultValue = 0) => ({
  name,
  type: "integer",
  interface: "integer",
  defaultValue,
  uiSchema: { type: "number", title, "x-component": "InputNumber" }
});
var dbl = (name, title, defaultValue = 0) => ({
  name,
  type: "double",
  interface: "number",
  defaultValue,
  uiSchema: { type: "number", title, "x-component": "InputNumber" }
});
var json = (name, title) => ({
  name,
  type: "json",
  interface: "json",
  uiSchema: { type: "object", title, "x-component": "Input.JSON" }
});
var dt = (name, title) => ({
  name,
  type: "date",
  interface: "datetime",
  uiSchema: { type: "string", title, "x-component": "DatePicker", "x-component-props": { showTime: true } }
});
var select = (name, title, options, defaultValue) => ({
  name,
  type: "string",
  interface: "select",
  defaultValue,
  uiSchema: {
    type: "string",
    title,
    "x-component": "Select",
    enum: options.map((v) => ({ value: v, label: v }))
  }
});
var RUN_STATUSES = ["queued", "running", "waiting", "succeeded", "failed", "cancelled", "rejected"];
var STEP_STATUSES = ["running", "done", "failed", "waiting", "skipped"];
var NEOAI_COLLECTIONS = [
  {
    name: "neoai_workflows",
    title: "NeoAI Workflows",
    titleField: "name",
    fields: [
      str("key", "Key", { unique: true }),
      str("name", "Name"),
      text("description", "Description"),
      bool("enabled", "Enabled", false),
      bool("require_confirm", "Require confirm before run", false),
      dbl("daily_budget_usd", "Daily budget (USD, 0 = unlimited)", 0),
      int("current_version", "Current version", 0),
      json("definition_draft", "Draft definition"),
      // Time trigger (scoping Q21 "Beides"): "every 15m" | "every 2h" | "daily 07:00".
      str("schedule", "Schedule (empty = off)"),
      json("schedule_input", "Schedule input"),
      dt("last_scheduled_at", "Last scheduled run")
    ]
  },
  {
    name: "neoai_workflow_versions",
    title: "NeoAI Workflow Versions",
    titleField: "id",
    fields: [
      {
        name: "workflow",
        type: "belongsTo",
        interface: "m2o",
        target: "neoai_workflows",
        foreignKey: "workflow_id",
        uiSchema: { title: "Workflow", "x-component": "AssociationField" }
      },
      int("version", "Version", 1),
      json("definition", "Definition (immutable)"),
      str("published_by", "Published by"),
      text("notes", "Notes")
    ]
  },
  {
    name: "neoai_functions",
    title: "NeoAI Functions",
    titleField: "title",
    fields: [
      str("key", "Function key", { unique: true }),
      str("title", "Title"),
      str("plugin", "Owning plugin"),
      text("description", "Description"),
      json("input_example", "Input example"),
      bool("enabled", "Enabled", true),
      {
        name: "workflow",
        type: "belongsTo",
        interface: "m2o",
        target: "neoai_workflows",
        foreignKey: "workflow_id",
        uiSchema: { title: "Bound workflow (empty = legacy code path)", "x-component": "AssociationField" }
      }
    ]
  },
  {
    name: "neoai_runs",
    title: "NeoAI Runs",
    titleField: "id",
    fields: [
      {
        name: "workflow",
        type: "belongsTo",
        interface: "m2o",
        target: "neoai_workflows",
        foreignKey: "workflow_id",
        uiSchema: { title: "Workflow", "x-component": "AssociationField" }
      },
      int("version", "Definition version", 0),
      str("function_key", "Function key"),
      select("status", "Status", RUN_STATUSES, "queued"),
      str("trigger", "Trigger"),
      json("input", "Input"),
      json("output", "Output"),
      text("error", "Error"),
      json("state", "Suspended state"),
      text("waiting_message", "Waiting message"),
      str("triggered_by", "Triggered by"),
      dt("started_at", "Started at"),
      dt("finished_at", "Finished at"),
      int("input_tokens", "Input tokens", 0),
      int("output_tokens", "Output tokens", 0),
      dbl("cost_usd", "Cost (USD, estimate)", 0)
    ]
  },
  {
    name: "neoai_run_steps",
    title: "NeoAI Run Steps",
    titleField: "id",
    fields: [
      {
        name: "run",
        type: "belongsTo",
        interface: "m2o",
        target: "neoai_runs",
        foreignKey: "run_id",
        uiSchema: { title: "Run", "x-component": "AssociationField" }
      },
      int("seq", "Sequence", 0),
      str("node_id", "Node id"),
      str("node_type", "Node type"),
      str("title", "Title"),
      str("path", "Path"),
      select("status", "Status", STEP_STATUSES, "running"),
      dt("started_at", "Started at"),
      dt("finished_at", "Finished at"),
      int("duration_ms", "Duration (ms)", 0),
      json("output", "Output (truncated)"),
      text("error", "Error"),
      int("input_tokens", "Input tokens", 0),
      int("output_tokens", "Output tokens", 0),
      dbl("cost_usd", "Cost (USD, estimate)", 0)
    ]
  },
  {
    name: "neoai_settings",
    title: "NeoAI Settings",
    titleField: "id",
    fields: [
      // Write-only by convention: actions never echo the key back (only a
      // boolean "configured" flag) — konfigurator ai_photo_api_key pattern.
      str("gemini_api_key", "Gemini API key (fallback when plugin-ai has no service)"),
      // Admin-switchable: all llm/image nodes return labelled mocks (no spend),
      // even when a real key/service exists. For staging test rounds.
      bool("force_mock", "Force mock mode (no real model calls)", false),
      str("default_llm_service", "Default plugin-ai LLM service name"),
      str("default_model", "Default model"),
      dbl("daily_budget_usd", "Global daily budget (USD, 0 = unlimited)", 0),
      dbl("image_price_usd", "Estimated price per generated image (USD)", 0.04),
      json("prices", "Price table override (USD per 1M tokens)")
    ]
  }
];
var NEOAI_EXTRA_FIELDS = [
  { collection: "neoai_settings", field: bool("force_mock", "Force mock mode (no real model calls)", false) },
  { collection: "neoai_workflows", field: str("schedule", "Schedule (empty = off)") },
  { collection: "neoai_workflows", field: json("schedule_input", "Schedule input") },
  { collection: "neoai_workflows", field: dt("last_scheduled_at", "Last scheduled run") },
  {
    collection: "neoai_workflows",
    field: {
      name: "versions",
      type: "hasMany",
      interface: "o2m",
      target: "neoai_workflow_versions",
      foreignKey: "workflow_id",
      uiSchema: { title: "Versions", "x-component": "AssociationField" }
    }
  },
  {
    collection: "neoai_workflows",
    field: {
      name: "runs",
      type: "hasMany",
      interface: "o2m",
      target: "neoai_runs",
      foreignKey: "workflow_id",
      uiSchema: { title: "Runs", "x-component": "AssociationField" }
    }
  },
  {
    collection: "neoai_runs",
    field: {
      name: "steps",
      type: "hasMany",
      interface: "o2m",
      target: "neoai_run_steps",
      foreignKey: "run_id",
      uiSchema: { title: "Steps", "x-component": "AssociationField" }
    }
  }
];
var MENU_LINKS = [
  { title: "NeoAI", icon: "RobotOutlined", href: "/admin/neoai/workflows", legacyHrefs: ["/neoai", "/admin/neoai"], sort: 14 }
];

// src/server/lib/env.ts
function isSandbox(env = process.env) {
  const v = String(env.NEOAI_SANDBOX ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
var ADMIN_ROLES = /* @__PURE__ */ new Set(["root", "admin"]);
function isAdminCtx(ctx) {
  const role = String(ctx?.state?.currentRole ?? "");
  if (ADMIN_ROLES.has(role)) return true;
  const roles = ctx?.state?.currentUser?.roles ?? [];
  return roles.some((r) => ADMIN_ROLES.has(String(r?.name ?? r)));
}

// src/server/lib/cost.ts
var DEFAULT_PRICES = {
  "gemini-2.5-flash": { in: 0.3, out: 2.5 },
  "gemini-2.5-pro": { in: 1.25, out: 10 },
  "gemini-3.0-pro": { in: 2, out: 12 },
  "gemini-2.0-flash": { in: 0.1, out: 0.4 }
};
var DEFAULT_IMAGE_PRICE_USD = 0.04;
function priceFor(model, prices = DEFAULT_PRICES) {
  const m = String(model ?? "").toLowerCase();
  let best = null;
  for (const [key, entry] of Object.entries(prices)) {
    if (m.startsWith(key.toLowerCase()) && (!best || key.length > best.key.length)) {
      best = { key, entry };
    }
  }
  return best?.entry ?? null;
}
function costOf(model, usage, prices) {
  if (!usage) return 0;
  const p = priceFor(model, prices ?? DEFAULT_PRICES);
  if (!p) return 0;
  const inTok = Math.max(0, usage.inputTokens ?? 0);
  const outTok = Math.max(0, usage.outputTokens ?? 0);
  return inTok / 1e6 * p.in + outTok / 1e6 * p.out;
}
function checkBudget(opts) {
  const g = opts.globalDailyBudgetUsd ?? 0;
  if (g > 0 && opts.spentTodayUsd >= g) {
    return { ok: false, reason: `global daily budget exhausted (${opts.spentTodayUsd.toFixed(2)} / ${g} USD)` };
  }
  const w = opts.workflowDailyBudgetUsd ?? 0;
  if (w > 0 && opts.workflowSpentTodayUsd >= w) {
    return { ok: false, reason: `workflow daily budget exhausted (${opts.workflowSpentTodayUsd.toFixed(2)} / ${w} USD)` };
  }
  return { ok: true };
}

// src/server/lib/mock.ts
var MOCK_LABEL = "\u26A0\uFE0E MOCK (NEOAI_SANDBOX) \u2014 no real model call";
function mockFromSchema(schema, propName = "") {
  if (!schema || typeof schema !== "object") return `MOCK ${propName}`.trim();
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  switch (type) {
    case "object": {
      const out = {};
      for (const [k, sub] of Object.entries(schema.properties ?? {})) out[k] = mockFromSchema(sub, k);
      return out;
    }
    case "array":
      return [mockFromSchema(schema.items, propName)];
    case "number":
    case "integer":
      return 1;
    case "boolean":
      return true;
    case "string":
    default:
      return `MOCK ${propName || "value"}`;
  }
}
function mockLlmText(prompt) {
  const head = String(prompt ?? "").replace(/\s+/g, " ").slice(0, 160);
  return `${MOCK_LABEL}
Echo of prompt head: "${head}"`;
}
function mockUsage(prompt) {
  return { inputTokens: Math.max(1, Math.ceil(String(prompt ?? "").length / 4)), outputTokens: 64 };
}
var MOCK_IMAGE_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADgQF/e5IkGQAAAABJRU5ErkJggg==";

// src/server/lib/providers.ts
var GEMINI_TIMEOUT_MS = 6e4;
var GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
async function isForceMock(app) {
  try {
    const s = await app.db.getRepository("neoai_settings")?.findOne();
    return s?.get?.("force_mock") === true;
  } catch {
    return false;
  }
}
async function resolveGeminiKey(app) {
  const envKey = String(process.env.GEMINI_API_KEY ?? "").trim();
  if (envKey) return envKey;
  try {
    const own = await app.db.getRepository("neoai_settings")?.findOne();
    const k = String(own?.get?.("gemini_api_key") ?? "").trim();
    if (k) return k;
  } catch {
  }
  try {
    const konf = await app.db.getRepository("konfigurator_plugin_settings")?.findOne();
    const k = String(konf?.get?.("ai_photo_api_key") ?? "").trim();
    if (k) return k;
  } catch {
  }
  return "";
}
function extractJson(text2) {
  const cleaned = String(text2 ?? "").replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return void 0;
  }
}
function normalizeLangchainContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((p) => typeof p === "string" ? p : p?.text ?? "").filter(Boolean).join("\n");
  }
  return content == null ? "" : String(content);
}
async function invokeViaPluginAi(app, opts, signal) {
  const ai = app.pm?.get?.("ai");
  const manager = ai?.aiManager;
  if (!manager?.getLLMService && !manager?.llmProviders) return null;
  let serviceName = String(opts.service ?? "").trim();
  if (!serviceName) {
    try {
      const settings = await app.db.getRepository("neoai_settings")?.findOne();
      serviceName = String(settings?.get?.("default_llm_service") ?? "").trim();
    } catch {
    }
  }
  const modelOptions = {};
  if (opts.model) modelOptions.model = opts.model;
  if (opts.temperature != null) modelOptions.temperature = opts.temperature;
  if (opts.maxTokens != null) modelOptions.maxOutputTokens = opts.maxTokens;
  let provider = null;
  let resolvedModel = String(opts.model ?? "");
  try {
    if (typeof manager.getLLMService === "function") {
      const got = await manager.getLLMService({ llmService: serviceName || void 0, modelOptions });
      provider = got?.provider ?? got;
      resolvedModel = String(got?.model ?? resolvedModel);
    }
  } catch (err) {
    app.logger?.info?.(`[neoai] plugin-ai getLLMService unavailable (${err?.message ?? err}) \u2014 raw fallback`);
    return null;
  }
  if (!provider?.invoke) return null;
  const messages = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.prompt });
  const structuredOutput = opts.jsonSchema ? { responseFormat: "json_schema", schema: opts.jsonSchema } : void 0;
  const res = await provider.invoke({ messages, structuredOutput }, { signal });
  const msg = res?.message ?? res;
  const text2 = normalizeLangchainContent(msg?.content ?? msg?.text ?? "");
  const usageMeta = msg?.usage_metadata ?? res?.usage_metadata ?? res?.usage ?? {};
  const json2 = msg?.parsed ?? res?.parsed ?? (opts.jsonSchema ? extractJson(text2) : void 0);
  return {
    text: text2,
    json: json2,
    usage: {
      inputTokens: Number(usageMeta.input_tokens ?? usageMeta.promptTokens ?? 0) || 0,
      outputTokens: Number(usageMeta.output_tokens ?? usageMeta.completionTokens ?? 0) || 0
    },
    model: resolvedModel || "via-plugin-ai",
    via: "plugin-ai"
  };
}
async function geminiFetch(app, model, body, key) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const res = await fetch(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    app.logger?.info?.(`[neoai] gemini ${model} \u2192 ${res.status}`);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`gemini ${model} HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
function geminiUsage(data) {
  const u = data?.usageMetadata ?? {};
  return {
    inputTokens: Number(u.promptTokenCount ?? 0) || 0,
    outputTokens: Number(u.candidatesTokenCount ?? u.totalTokenCount ?? 0) || 0
  };
}
async function invokeGeminiText(app, opts, key) {
  const model = opts.model || "gemini-2.5-flash";
  const body = {
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      ...opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {},
      ...opts.jsonSchema ? { response_mime_type: "application/json" } : {}
    }
  };
  if (opts.system) body.system_instruction = { parts: [{ text: opts.system }] };
  const data = await geminiFetch(app, model, body, key);
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text2 = parts.map((p) => p?.text ?? "").join("");
  return {
    text: text2,
    json: opts.jsonSchema ? extractJson(text2) : void 0,
    usage: geminiUsage(data),
    model,
    via: "gemini-rest"
  };
}
async function llmInvoke(app, opts) {
  if (await isForceMock(app)) {
    app.logger?.info?.("[neoai] llm MOCK (force_mock setting)");
    return {
      text: mockLlmText(opts.prompt),
      json: opts.jsonSchema ? mockFromSchema(opts.jsonSchema) : void 0,
      usage: mockUsage(opts.prompt),
      model: "mock",
      via: "mock"
    };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const viaAi = await invokeViaPluginAi(app, opts, controller.signal).catch((err) => {
      app.logger?.warn?.(`[neoai] plugin-ai invoke failed (${err?.message ?? err}) \u2014 raw fallback`);
      return null;
    });
    if (viaAi) return viaAi;
  } finally {
    clearTimeout(timer);
  }
  const key = await resolveGeminiKey(app);
  if (!key) {
    if (isSandbox()) {
      app.logger?.info?.("[neoai] llm MOCK (sandbox, no key/plugin-ai)");
      return {
        text: mockLlmText(opts.prompt),
        json: opts.jsonSchema ? mockFromSchema(opts.jsonSchema) : void 0,
        usage: mockUsage(opts.prompt),
        model: "mock",
        via: "mock"
      };
    }
    throw new Error(
      "no LLM available: plugin-ai has no usable llmService and no Gemini key is configured (GEMINI_API_KEY / neoai_settings.gemini_api_key)"
    );
  }
  return invokeGeminiText(app, opts, key);
}
async function imageInvoke(app, opts) {
  if (await isForceMock(app)) {
    app.logger?.info?.("[neoai] image MOCK (force_mock setting)");
    return { imageDataUrl: MOCK_IMAGE_DATA_URL, usage: { inputTokens: 0, outputTokens: 0 }, model: "mock" };
  }
  const key = await resolveGeminiKey(app);
  if (!key) {
    if (isSandbox()) {
      app.logger?.info?.("[neoai] image MOCK (sandbox, no key)");
      return { imageDataUrl: MOCK_IMAGE_DATA_URL, usage: { inputTokens: 0, outputTokens: 0 }, model: "mock" };
    }
    throw new Error("no Gemini key configured for image node");
  }
  const model = opts.model || "gemini-2.5-flash-image";
  const parts = [{ text: opts.prompt }];
  if (opts.imageDataUrl) {
    const m = String(opts.imageDataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new Error("image node: imageDataUrl must be a base64 data URL");
    parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
  }
  const data = await geminiFetch(app, model, { contents: [{ role: "user", parts }] }, key);
  const outParts = data?.candidates?.[0]?.content?.parts ?? [];
  const img = outParts.find((p) => p?.inlineData?.data || p?.inline_data?.data);
  const inline = img?.inlineData ?? img?.inline_data;
  if (!inline?.data) throw new Error(`gemini ${model} returned no image`);
  const mime = inline.mimeType ?? inline.mime_type ?? "image/png";
  return {
    imageDataUrl: `data:${mime};base64,${inline.data}`,
    usage: geminiUsage(data),
    model
  };
}

// src/server/lib/template.ts
var WHOLE_RE = /^\{\{\s*([^{}]+?)\s*\}\}$/;
var PART_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;
function getPath(obj, path) {
  if (!path) return void 0;
  let cur = obj;
  for (const raw of path.split(".")) {
    const key = raw.trim();
    if (cur == null) return void 0;
    cur = cur[key];
  }
  return cur;
}
function toText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
function resolveString(s, scope) {
  const whole = s.match(WHOLE_RE);
  if (whole) return getPath(scope, whole[1]);
  return s.replace(PART_RE, (_m, p1) => toText(getPath(scope, String(p1))));
}
function resolveTemplates(value, scope) {
  if (typeof value === "string") return resolveString(value, scope);
  if (Array.isArray(value)) return value.map((v) => resolveTemplates(v, scope));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveTemplates(v, scope);
    return out;
  }
  return value;
}
function asNumber(v) {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}
function evalCondition(cfg, scope) {
  if (!cfg) return true;
  const left = resolveTemplates(cfg.left, scope);
  const right = resolveTemplates(cfg.right, scope);
  const op = String(cfg.op ?? "truthy");
  switch (op) {
    case "eq":
      return String(left ?? "") === String(right ?? "");
    case "ne":
      return String(left ?? "") !== String(right ?? "");
    case "gt": {
      const l = asNumber(left);
      const r = asNumber(right);
      return l != null && r != null && l > r;
    }
    case "gte": {
      const l = asNumber(left);
      const r = asNumber(right);
      return l != null && r != null && l >= r;
    }
    case "lt": {
      const l = asNumber(left);
      const r = asNumber(right);
      return l != null && r != null && l < r;
    }
    case "lte": {
      const l = asNumber(left);
      const r = asNumber(right);
      return l != null && r != null && l <= r;
    }
    case "contains": {
      if (Array.isArray(left)) return left.map((x) => String(x)).includes(String(right ?? ""));
      return String(left ?? "").includes(String(right ?? ""));
    }
    case "empty":
      return left == null || String(left) === "" || Array.isArray(left) && left.length === 0;
    case "notEmpty":
      return !(left == null || String(left) === "" || Array.isArray(left) && left.length === 0);
    case "truthy":
    default:
      return !!left;
  }
}
function truncateJson(value, maxChars = 8e3) {
  if (value === void 0) return null;
  let s;
  try {
    s = JSON.stringify(value);
  } catch {
    s = String(value);
  }
  if (s == null) return null;
  if (s.length <= maxChars) return value;
  return { __truncated: true, preview: s.slice(0, maxChars) };
}

// src/server/lib/nodes.ts
var HTTP_TIMEOUT_MS = 45e3;
var PRIVATE_HOST_RE = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|fd[0-9a-f]{2}:)/i;
function isPrivateHost(url) {
  try {
    const host = new URL(url).hostname;
    return PRIVATE_HOST_RE.test(host) || host.endsWith(".internal") || host.endsWith(".local");
  } catch {
    return true;
  }
}
async function execHttp(node, scope) {
  const cfg = resolveTemplates(node.config ?? {}, scope);
  const method = String(cfg.method ?? "GET").toUpperCase();
  const url = String(cfg.url ?? "");
  if (!/^https?:\/\//i.test(url)) throw new Error(`http node "${node.id}": invalid url`);
  if (cfg.allowPrivate !== true && isPrivateHost(url)) {
    throw new Error(`http node "${node.id}": private/internal target blocked (set allowPrivate:true to permit)`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(Number(cfg.timeoutMs) || HTTP_TIMEOUT_MS, 6e4));
  try {
    const headers = { ...cfg.headers ?? {} };
    let body;
    if (cfg.body != null && method !== "GET" && method !== "HEAD") {
      if (typeof cfg.body === "string") {
        body = cfg.body;
      } else {
        body = JSON.stringify(cfg.body);
        if (!headers["Content-Type"] && !headers["content-type"]) headers["Content-Type"] = "application/json";
      }
    }
    const res = await fetch(url, { method, headers, body, signal: controller.signal });
    const text2 = await res.text();
    let parsed = text2;
    if (String(cfg.responseType ?? "json") === "json") {
      try {
        parsed = JSON.parse(text2);
      } catch {
        parsed = text2;
      }
    }
    if (!res.ok && cfg.failOnHttpError !== false) {
      throw new Error(`http node "${node.id}": ${method} ${res.status} ${String(text2).slice(0, 200)}`);
    }
    return { output: { status: res.status, body: parsed } };
  } finally {
    clearTimeout(timer);
  }
}
async function execData(node, scope, deps) {
  const cfg = resolveTemplates(node.config ?? {}, scope);
  const collection = String(cfg.collection ?? "");
  const repo = deps.app.db.getRepository(collection);
  if (!repo) throw new Error(`data node "${node.id}": unknown collection "${collection}"`);
  const op = String(cfg.op ?? "list");
  if ((op === "create" || op === "update") && cfg.allowWrite !== true) {
    throw new Error(`data node "${node.id}": ${op} requires allowWrite:true`);
  }
  if (op === "list") {
    const rows = await repo.find({
      filter: cfg.filter ?? {},
      limit: Math.min(Number(cfg.limit) || 20, 200),
      sort: cfg.sort
    });
    return { output: { rows: rows.map((r) => r.toJSON?.() ?? r), count: rows.length } };
  }
  if (op === "get") {
    const row = await repo.findOne({ filter: cfg.filter ?? {}, filterByTk: cfg.id });
    return { output: { row: row?.toJSON?.() ?? row ?? null } };
  }
  if (op === "create") {
    const row = await repo.create({ values: cfg.values ?? {} });
    return { output: { id: row?.get?.("id") ?? null } };
  }
  if (op === "update") {
    await repo.update({ filter: cfg.filter ?? {}, filterByTk: cfg.id, values: cfg.values ?? {} });
    return { output: { ok: true } };
  }
  throw new Error(`data node "${node.id}": unknown op "${op}"`);
}
async function execLlm(node, scope, deps) {
  await deps.guardModelCall();
  const cfg = node.config ?? {};
  const prompt = String(resolveTemplates(cfg.prompt ?? "", scope) ?? "");
  if (!prompt.trim()) throw new Error(`llm node "${node.id}": empty prompt`);
  const system = cfg.system ? String(resolveTemplates(cfg.system, scope)) : void 0;
  const res = await llmInvoke(deps.app, {
    service: cfg.service ?? deps.defaultService,
    model: cfg.model ?? deps.defaultModel,
    system,
    prompt,
    jsonSchema: cfg.jsonSchema,
    temperature: cfg.temperature,
    maxTokens: cfg.maxTokens
  });
  const cost = costOf(res.model, res.usage, deps.prices);
  deps.recordUsage(res.usage, cost);
  if (cfg.jsonSchema && res.json === void 0) {
    throw new Error(`llm node "${node.id}": model returned no parseable JSON`);
  }
  return {
    output: { text: res.text, json: res.json, model: res.model, via: res.via },
    usage: res.usage,
    costUsd: cost
  };
}
async function execImage(node, scope, deps) {
  await deps.guardModelCall();
  const cfg = node.config ?? {};
  const prompt = String(resolveTemplates(cfg.prompt ?? "", scope) ?? "");
  if (!prompt.trim()) throw new Error(`image node "${node.id}": empty prompt`);
  const imageDataUrl = cfg.image ? String(resolveTemplates(cfg.image, scope)) : void 0;
  const res = await imageInvoke(deps.app, { model: cfg.model, prompt, imageDataUrl });
  const cost = deps.imagePriceUsd ?? DEFAULT_IMAGE_PRICE_USD;
  deps.recordUsage(res.usage, cost);
  return {
    // Data URLs are big — steps truncate on persist; downstream nodes can
    // still consume {{nodes.<id>.imageDataUrl}} in-memory within the run.
    output: { imageDataUrl: res.imageDataUrl, model: res.model },
    usage: res.usage,
    costUsd: cost
  };
}
function execTransform(node, scope) {
  const map = node.config?.map ?? node.config ?? {};
  return { output: resolveTemplates(map, scope) };
}
function execHumanGate(node, scope) {
  const message = String(resolveTemplates(node.config?.message ?? "Approval required", scope) ?? "");
  return { suspend: true, output: { message } };
}
function execOutput(node, scope) {
  const map = node.config?.map ?? node.config ?? {};
  return { output: resolveTemplates(map, scope), end: node.config?.end === true };
}
function execLeafFactory(deps) {
  return async (node, scope) => {
    switch (node.type) {
      case "llm":
        return execLlm(node, scope, deps);
      case "image":
        return execImage(node, scope, deps);
      case "http":
        return execHttp(node, scope);
      case "data":
        return execData(node, scope, deps);
      case "transform":
        return execTransform(node, scope);
      case "human_gate":
        return execHumanGate(node, scope);
      case "output":
        return execOutput(node, scope);
      default:
        throw new Error(`unknown node type "${node.type}" (node "${node.id}")`);
    }
  };
}

// src/server/lib/runner.ts
var CancelledError = class extends Error {
  constructor() {
    super("cancelled");
  }
};
var MAX_LOOP_ITERATIONS = 100;
var MAX_SUBWORKFLOW_DEPTH = 3;
var STRUCTURAL = /* @__PURE__ */ new Set(["condition", "parallel", "loop"]);
function baseScope(input, vars, runMeta) {
  return { input, nodes: vars, run: runMeta ?? {} };
}
function validateDefinition(def) {
  const errors = [];
  const seen = /* @__PURE__ */ new Set();
  const walk = (nodes, insideParallel) => {
    for (const n of nodes ?? []) {
      if (!n.id || typeof n.id !== "string") errors.push(`node without id (type ${n.type})`);
      else if (seen.has(n.id)) errors.push(`duplicate node id "${n.id}"`);
      else seen.add(n.id);
      if (!n.type) errors.push(`node "${n.id}" without type`);
      if (insideParallel && n.type === "human_gate") {
        errors.push(`human_gate "${n.id}" inside a parallel block is not supported (v1)`);
      }
      const branches = n.branches ?? [];
      if (n.type === "condition" && branches.length < 1) errors.push(`condition "${n.id}" needs branches[0]`);
      if (n.type === "loop" && branches.length < 1) errors.push(`loop "${n.id}" needs branches[0] (body)`);
      if (n.type === "parallel" && branches.length < 1) errors.push(`parallel "${n.id}" needs at least one branch`);
      for (const b of branches) walk(b ?? [], insideParallel || n.type === "parallel");
    }
  };
  walk(def?.nodes ?? [], false);
  if (!def?.nodes?.length) errors.push("workflow has no nodes");
  return errors;
}
var Runner = class _Runner {
  constructor(rt) {
    this.rt = rt;
  }
  async run(def, input, runMeta) {
    const state = {
      frames: [{ kind: "seq", nodes: def.nodes ?? [], idx: 0, path: "" }],
      vars: {},
      output: void 0
    };
    return this.drive(state, input, runMeta);
  }
  /** Continue a suspended run. `approval` becomes the waiting gate's output. */
  async resume(def, input, state, approval, runMeta) {
    const gateId = state.waitingNodeId;
    if (gateId) {
      state.vars[gateId] = approval;
      await this.rt.onStep({
        nodeId: gateId,
        nodeType: "human_gate",
        title: gateId,
        phase: approval?.approved ? "done" : "error",
        output: approval,
        error: approval?.approved ? void 0 : "rejected"
      });
      if (!approval?.approved) {
        return { status: "failed", error: "rejected at approval gate", nodeId: gateId };
      }
      const top = state.frames[state.frames.length - 1];
      if (top) top.idx += 1;
      state.waitingNodeId = void 0;
    }
    return this.drive(state, input, runMeta);
  }
  async drive(state, input, runMeta) {
    try {
      while (state.frames.length > 0) {
        if (this.rt.isCancelled()) throw new CancelledError();
        const frame = state.frames[state.frames.length - 1];
        const nodes = frame.kind === "seq" ? frame.nodes : frame.node.branches?.[0] ?? [];
        if (frame.idx >= nodes.length) {
          if (frame.kind === "loop") {
            const items = frame.items;
            frame.iter += 1;
            if (frame.iter < Math.min(items.length, MAX_LOOP_ITERATIONS)) {
              frame.idx = 0;
              continue;
            }
            state.vars[frame.node.id] = { iterations: Math.min(items.length, MAX_LOOP_ITERATIONS) };
          }
          state.frames.pop();
          continue;
        }
        const node = nodes[frame.idx];
        const scope = baseScope(input, state.vars, runMeta);
        if (frame.kind === "loop") {
          scope.item = frame.items[frame.iter];
          scope.index = frame.iter;
        }
        const path = frame.path;
        if (STRUCTURAL.has(node.type)) {
          if (node.type === "condition") {
            const which = evalCondition(node.config, scope) ? 0 : 1;
            state.vars[node.id] = { branch: which === 0 ? "true" : "false" };
            await this.rt.onStep({
              nodeId: node.id,
              nodeType: node.type,
              title: node.title ?? node.id,
              phase: "done",
              output: state.vars[node.id],
              path
            });
            frame.idx += 1;
            const branch = node.branches?.[which] ?? [];
            if (branch.length) state.frames.push({ kind: "seq", nodes: branch, idx: 0, path });
            continue;
          }
          if (node.type === "loop") {
            const itemsRaw = resolveTemplates(node.config?.items, scope);
            const items = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw == null ? [] : [itemsRaw];
            await this.rt.onStep({
              nodeId: node.id,
              nodeType: node.type,
              title: node.title ?? node.id,
              phase: "done",
              output: { items: items.length },
              path
            });
            frame.idx += 1;
            if (items.length) {
              state.frames.push({ kind: "loop", node, items, iter: 0, idx: 0, path: `${path}${node.id}[i].` });
            } else {
              state.vars[node.id] = { iterations: 0 };
            }
            continue;
          }
          if (node.type === "parallel") {
            await this.rt.onStep({
              nodeId: node.id,
              nodeType: node.type,
              title: node.title ?? node.id,
              phase: "start",
              path
            });
            const branches = node.branches ?? [];
            const results = await Promise.all(
              branches.map(async (branch, i) => {
                const sub = {
                  frames: [{ kind: "seq", nodes: branch ?? [], idx: 0, path: `${path}${node.id}[${i}].` }],
                  vars: state.vars,
                  // shared on purpose — unique ids, outputs visible downstream
                  output: void 0
                };
                const out = await this.drive(sub, input, runMeta);
                if (out.status === "failed") throw new Error(`branch ${i}: ${out.error}`);
                if (out.status === "waiting") throw new Error(`branch ${i}: human_gate inside parallel is not supported`);
                if (out.status === "cancelled") throw new CancelledError();
                return out.status === "succeeded" ? out.output : void 0;
              })
            );
            state.vars[node.id] = { branches: results };
            await this.rt.onStep({
              nodeId: node.id,
              nodeType: node.type,
              title: node.title ?? node.id,
              phase: "done",
              output: { branches: branches.length },
              path
            });
            frame.idx += 1;
            continue;
          }
        }
        if (node.type === "subworkflow") {
          const depth = this.rt.depth ?? 0;
          if (depth >= MAX_SUBWORKFLOW_DEPTH) throw new Error(`subworkflow "${node.id}": max depth ${MAX_SUBWORKFLOW_DEPTH} exceeded`);
          const key = String(node.config?.workflowKey ?? "");
          const child = this.rt.loadWorkflow ? await this.rt.loadWorkflow(key) : null;
          if (!child) throw new Error(`subworkflow "${node.id}": workflow "${key}" not found/published`);
          const childInput = resolveTemplates(node.config?.input ?? {}, scope);
          await this.rt.onStep({ nodeId: node.id, nodeType: node.type, title: node.title ?? key, phase: "start", path });
          const childRunner = new _Runner({ ...this.rt, depth: depth + 1 });
          const out = await childRunner.run(child, childInput, runMeta);
          if (out.status === "failed") throw new Error(`subworkflow "${key}": ${out.error}`);
          if (out.status === "cancelled") throw new CancelledError();
          if (out.status === "waiting") throw new Error(`subworkflow "${key}": human_gate inside subworkflow is not supported (v1)`);
          state.vars[node.id] = out.output ?? {};
          await this.rt.onStep({
            nodeId: node.id,
            nodeType: node.type,
            title: node.title ?? key,
            phase: "done",
            output: out.output,
            path
          });
          frame.idx += 1;
          continue;
        }
        await this.rt.onStep({ nodeId: node.id, nodeType: node.type, title: node.title ?? node.id, phase: "start", path });
        let res;
        try {
          res = await this.rt.execLeaf(node, scope, path);
        } catch (err) {
          if (err instanceof CancelledError) throw err;
          const attempts = Math.max(0, Number(node.config?.retries ?? 0));
          let lastErr = err;
          let ok = null;
          for (let a = 0; a < attempts; a++) {
            if (this.rt.isCancelled()) throw new CancelledError();
            try {
              ok = await this.rt.execLeaf(node, scope, path);
              break;
            } catch (e2) {
              lastErr = e2;
            }
          }
          if (!ok) {
            await this.rt.onStep({
              nodeId: node.id,
              nodeType: node.type,
              title: node.title ?? node.id,
              phase: "error",
              error: String(lastErr?.message ?? lastErr),
              path
            });
            return { status: "failed", error: String(lastErr?.message ?? lastErr), nodeId: node.id };
          }
          res = ok;
        }
        if (res.suspend) {
          state.waitingNodeId = node.id;
          await this.rt.onStep({
            nodeId: node.id,
            nodeType: node.type,
            title: node.title ?? node.id,
            phase: "suspend",
            output: res.output,
            path
          });
          return { status: "waiting", state, message: res.output?.message };
        }
        state.vars[node.id] = res.output ?? {};
        if (node.type === "output") {
          state.output = { ...state.output ?? {}, ...res.output ?? {} };
        }
        await this.rt.onStep({
          nodeId: node.id,
          nodeType: node.type,
          title: node.title ?? node.id,
          phase: "done",
          output: res.output,
          usage: res.usage,
          costUsd: res.costUsd,
          path
        });
        frame.idx += 1;
        if (res.end) break;
      }
      return { status: "succeeded", output: state.output ?? null, vars: state.vars };
    } catch (err) {
      if (err instanceof CancelledError) return { status: "cancelled" };
      return { status: "failed", error: String(err?.message ?? err) };
    }
  }
};

// src/server/lib/schedule.ts
var EVERY_RE = /^every\s+(\d+)\s*(m|min|minutes?|h|hours?)$/i;
var DAILY_RE = /^daily\s+(\d{1,2}):(\d{2})$/i;
function parseSchedule(text2) {
  const s = String(text2 ?? "").trim();
  if (!s) return null;
  const every = s.match(EVERY_RE);
  if (every) {
    const n = parseInt(every[1], 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    const unit = every[2].toLowerCase().startsWith("h") ? 36e5 : 6e4;
    const ms = n * unit;
    return ms >= 6e4 ? { kind: "every", ms } : null;
  }
  const daily = s.match(DAILY_RE);
  if (daily) {
    const hour = parseInt(daily[1], 10);
    const minute = parseInt(daily[2], 10);
    if (hour > 23 || minute > 59) return null;
    return { kind: "daily", hour, minute };
  }
  return null;
}
function isDue(spec, lastRunAt, now) {
  if (spec.kind === "every") {
    if (!lastRunAt) return true;
    return now.getTime() - lastRunAt.getTime() >= spec.ms;
  }
  const todayAt = new Date(now);
  todayAt.setHours(spec.hour, spec.minute, 0, 0);
  if (now < todayAt) return false;
  return !lastRunAt || lastRunAt < todayAt;
}

// src/server/seed.ts
var OVERPASS_VEGETATION = `[out:json][timeout:25];(node["natural"="tree"](around:250,{{nodes.geo.lat}},{{nodes.geo.lon}});way["natural"="wood"](around:250,{{nodes.geo.lat}},{{nodes.geo.lon}});way["landuse"="forest"](around:250,{{nodes.geo.lat}},{{nodes.geo.lon}});way["natural"="water"](around:250,{{nodes.geo.lat}},{{nodes.geo.lon}}););out tags center 100;`;
var OVERPASS_TRANSPORT = `[out:json][timeout:25];(way["highway"]["maxwidth"](around:400,{{nodes.geo.lat}},{{nodes.geo.lon}});way["highway"]["maxheight"](around:400,{{nodes.geo.lat}},{{nodes.geo.lon}});way["highway"]["maxweight"](around:400,{{nodes.geo.lat}},{{nodes.geo.lon}});way["highway"~"^(primary|secondary|tertiary|residential|unclassified|service|track)$"](around:200,{{nodes.geo.lat}},{{nodes.geo.lon}}););out tags center 120;`;
var SYNTH_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "short German summary of the plot situation" },
    constraints: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", description: "transport|vegetation|zufahrt|sonstig" },
          severity: { type: "string", description: "info|warn|block" },
          title: { type: "string" },
          detail: { type: "string" }
        },
        required: ["kind", "severity", "title"]
      }
    }
  },
  required: ["summary", "constraints"]
};
var BUILDING_PLOT_DEFINITION = {
  nodes: [
    {
      id: "geo_raw",
      type: "http",
      title: "Geocode address (Nominatim)",
      config: {
        method: "GET",
        url: "https://nominatim.openstreetmap.org/search?format=json&limit=1&q={{input.address}}",
        headers: { "User-Agent": "NeoAI/0.1 (Neomodul internal; plot analysis)" },
        responseType: "json"
      }
    },
    {
      id: "geo",
      type: "transform",
      title: "Extract coordinates",
      config: {
        map: {
          lat: "{{nodes.geo_raw.body.0.lat}}",
          lon: "{{nodes.geo_raw.body.0.lon}}",
          display_name: "{{nodes.geo_raw.body.0.display_name}}"
        }
      }
    },
    {
      id: "geo_check",
      type: "condition",
      title: "Address found?",
      config: { left: "{{nodes.geo.lat}}", op: "notEmpty" },
      branches: [
        [
          {
            id: "par",
            type: "parallel",
            title: "Open-data lookups",
            branches: [
              [
                {
                  id: "vegetation",
                  type: "http",
                  title: "Overpass: vegetation & water",
                  config: {
                    method: "POST",
                    url: "https://overpass-api.de/api/interpreter",
                    headers: { "Content-Type": "text/plain", "User-Agent": "NeoAI/0.1 (Neomodul internal)" },
                    body: OVERPASS_VEGETATION,
                    responseType: "json"
                  }
                },
                {
                  id: "veg_sum",
                  type: "transform",
                  title: "Summarise vegetation",
                  config: { map: { elements: "{{nodes.vegetation.body.elements}}" } }
                }
              ],
              [
                {
                  id: "transport",
                  type: "http",
                  title: "Overpass: road restrictions",
                  config: {
                    method: "POST",
                    url: "https://overpass-api.de/api/interpreter",
                    headers: { "Content-Type": "text/plain", "User-Agent": "NeoAI/0.1 (Neomodul internal)" },
                    body: OVERPASS_TRANSPORT,
                    responseType: "json"
                  }
                }
              ]
            ]
          },
          {
            id: "synth",
            type: "llm",
            title: "Gemini synthesis",
            config: {
              system: "Du bist Bau-Logistik- und Grundst\xFCcksanalyst f\xFCr Modulh\xE4user (Modulbreite ~4m, Schwertransport). Antworte ausschlie\xDFlich mit JSON nach dem vorgegebenen Schema. Severity: block nur bei harten Hindernissen, warn bei zu pr\xFCfenden Punkten, info f\xFCr Kontext.",
              prompt: "Grundst\xFCck: {{nodes.geo.display_name}} (lat {{nodes.geo.lat}}, lon {{nodes.geo.lon}}).\n\nVegetation/Wasser im Umkreis 250m (OSM):\n{{nodes.veg_sum.elements}}\n\nStra\xDFen + Beschr\xE4nkungen im Umkreis 400m (OSM):\n{{nodes.transport.body.elements}}\n\nLeite daraus Transport-/Zufahrts- und Grundst\xFCcks-Constraints f\xFCr die Anlieferung und Aufstellung eines Modulhauses ab. Wenn die Daten d\xFCnn sind, sage das ehrlich (severity info).",
              jsonSchema: SYNTH_SCHEMA,
              temperature: 0.2
            }
          },
          {
            id: "out",
            type: "output",
            title: "Result",
            config: {
              map: {
                address: "{{nodes.geo.display_name}}",
                lat: "{{nodes.geo.lat}}",
                lon: "{{nodes.geo.lon}}",
                summary: "{{nodes.synth.json.summary}}",
                constraints: "{{nodes.synth.json.constraints}}"
              }
            }
          }
        ],
        [
          {
            id: "out_fail",
            type: "output",
            title: "Address not found",
            config: { map: { error: "address not found", address: "{{input.address}}" }, end: true }
          }
        ]
      ]
    }
  ]
};
async function ensureSeedWorkflows(plugin) {
  const repo = plugin.db.getRepository("neoai_workflows");
  if (!repo) return;
  const key = "building-plot-analysis";
  const existing = await repo.findOne({ filter: { key } });
  if (existing) return;
  const wf = await repo.create({
    values: {
      key,
      name: "Building Plot Analysis",
      description: 'Analyses a building plot from a plain address: geocode (Nominatim) \u2192 parallel open-data lookups (Overpass vegetation/water + road restrictions) \u2192 Gemini synthesis into draft constraints. Input: { "address": "\u2026" }. Seed workflow \u2014 extend freely.',
      enabled: false,
      require_confirm: true,
      current_version: 0,
      definition_draft: BUILDING_PLOT_DEFINITION
    }
  });
  await plugin.db.getRepository("neoai_workflow_versions").create({
    values: {
      workflow_id: wf.get("id"),
      version: 1,
      definition: BUILDING_PLOT_DEFINITION,
      published_by: "seed",
      notes: "Initial seed (P0)"
    }
  });
  await repo.update({ filterByTk: wf.get("id"), values: { current_version: 1 } });
  plugin.app.logger.info('[neoai] seeded workflow "building-plot-analysis" (disabled, confirm-gated)');
}

// src/server/plugin.ts
function countModelNodes(def) {
  const out = { llm: 0, image: 0 };
  const walk = (nodes) => {
    for (const n of nodes ?? []) {
      if (n.type === "llm") out.llm += 1;
      if (n.type === "image") out.image += 1;
      for (const b of n.branches ?? []) walk(b ?? []);
    }
  };
  walk(def?.nodes ?? []);
  return out;
}
var pkg = require_package();
var NeoaiPlugin = class extends import_server.Plugin {
  constructor() {
    super(...arguments);
    this.running = /* @__PURE__ */ new Map();
    this.schedulerTimer = null;
  }
  async install() {
    await this.setup();
  }
  async afterEnable() {
    await this.setup();
  }
  async load() {
    this.app.acl.registerSnippet({ name: "pm.neoai.settings", actions: ["neoai:*"] });
    this.app.acl.allow("neoai", "*", "loggedIn");
    const requireAdmin = (ctx) => {
      if (!isAdminCtx(ctx)) ctx.throw(403, "NeoAI is admin-only for now");
    };
    this.app.resourceManager.define({
      name: "neoai",
      actions: {
        ping: async (ctx, next) => {
          requireAdmin(ctx);
          const names = NEOAI_COLLECTIONS.map((c) => c.name);
          const settingsRow = await this.settingsRow();
          ctx.body = {
            ok: true,
            plugin: pkg.name,
            version: pkg.version,
            sandbox: isSandbox(),
            forceMock: settingsRow?.get?.("force_mock") === true,
            collections: names.filter((n) => !!this.db.getCollection(n)),
            pluginAi: !!this.app.pm?.get?.("ai")?.aiManager
          };
          await next();
        },
        run: async (ctx, next) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          ctx.body = await this.startRun({
            workflowId: p.workflowId,
            workflowKey: p.workflowKey,
            functionKey: p.functionKey,
            input: p.input ?? {},
            draft: p.draft === true,
            confirmed: p.confirmed === true,
            trigger: String(p.trigger ?? "manual"),
            triggeredBy: String(ctx.state?.currentUser?.nickname ?? ctx.state?.currentUser?.username ?? "admin")
          });
          await next();
        },
        runStatus: async (ctx, next) => {
          requireAdmin(ctx);
          const p = { ...ctx.action.params.values ?? {}, ...ctx.action.params ?? {} };
          const runId = Number(p.runId);
          const run = await this.db.getRepository("neoai_runs").findOne({ filterByTk: runId });
          if (!run) ctx.throw(404, `run ${runId} not found`);
          const steps = await this.db.getRepository("neoai_run_steps").find({
            filter: { run_id: runId },
            sort: ["seq"],
            limit: 500
          });
          ctx.body = { run: run.toJSON(), steps: steps.map((s) => s.toJSON()) };
          await next();
        },
        cancelRun: async (ctx, next) => {
          requireAdmin(ctx);
          const runId = Number(ctx.action.params.values?.runId);
          const repo = this.db.getRepository("neoai_runs");
          const run = await repo.findOne({ filterByTk: runId });
          if (!run) ctx.throw(404, `run ${runId} not found`);
          const handle = this.running.get(runId);
          if (handle) handle.cancelled = true;
          if (run.get("status") === "waiting" || !handle && run.get("status") === "running") {
            await repo.update({
              filterByTk: runId,
              values: { status: "cancelled", finished_at: /* @__PURE__ */ new Date(), state: null }
            });
          }
          ctx.body = { ok: true };
          await next();
        },
        resumeRun: async (ctx, next) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const runId = Number(p.runId);
          const approved = p.approved === true;
          const comment = String(p.comment ?? "");
          ctx.body = await this.resumeRun(runId, {
            approved,
            comment,
            by: String(ctx.state?.currentUser?.nickname ?? "admin")
          });
          await next();
        },
        publishWorkflow: async (ctx, next) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const wfRepo = this.db.getRepository("neoai_workflows");
          const wf = await wfRepo.findOne({ filterByTk: Number(p.workflowId) });
          if (!wf) ctx.throw(404, "workflow not found");
          const def = wf.get("definition_draft") ?? {};
          const errors = validateDefinition(def);
          if (errors.length) {
            ctx.body = { ok: false, errors };
            return next();
          }
          const version = Number(wf.get("current_version") ?? 0) + 1;
          await this.db.getRepository("neoai_workflow_versions").create({
            values: {
              workflow_id: wf.get("id"),
              version,
              definition: def,
              published_by: String(ctx.state?.currentUser?.nickname ?? "admin"),
              notes: String(p.notes ?? "")
            }
          });
          await wfRepo.update({ filterByTk: wf.get("id"), values: { current_version: version } });
          ctx.body = { ok: true, version };
          await next();
        },
        getSettings: async (ctx, next) => {
          requireAdmin(ctx);
          const s = await this.settingsRow();
          const j = s?.toJSON?.() ?? {};
          delete j.gemini_api_key;
          ctx.body = {
            ...j,
            geminiKeyConfigured: !!(process.env.GEMINI_API_KEY || s?.get?.("gemini_api_key")),
            geminiKeyFromEnv: !!process.env.GEMINI_API_KEY
          };
          await next();
        },
        saveSettings: async (ctx, next) => {
          requireAdmin(ctx);
          const p = { ...ctx.action.params.values ?? {} };
          const repo = this.db.getRepository("neoai_settings");
          const row = await this.settingsRow();
          const values = {};
          for (const k of ["default_llm_service", "default_model", "daily_budget_usd", "image_price_usd", "prices", "force_mock"]) {
            if (p[k] !== void 0) values[k] = p[k];
          }
          if (typeof p.gemini_api_key === "string") values.gemini_api_key = p.gemini_api_key.trim();
          if (row) await repo.update({ filterByTk: row.get("id"), values });
          else await repo.create({ values });
          ctx.body = { ok: true };
          await next();
        },
        spendToday: async (ctx, next) => {
          requireAdmin(ctx);
          ctx.body = { global: await this.spentTodayUsd(), byWorkflow: await this.spentTodayByWorkflow() };
          await next();
        },
        // HTTP surface of the in-process function dispatch — used by the
        // console's Functions panel and by E2E; host plugins call the service
        // method directly instead.
        runFunction: async (ctx, next) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const res = await this.runFunction(String(p.functionKey ?? ""), p.input ?? {}, {
            triggeredBy: String(ctx.state?.currentUser?.nickname ?? "admin"),
            wait: p.wait === true
          });
          ctx.body = res ?? { legacy: true, reason: "no workflow bound (or function disabled) \u2014 caller must use its legacy code path" };
          await next();
        }
      }
    });
    this.registerAutomationBridge();
    this.app.on("afterStart", async () => {
      try {
        const repo = this.db.getRepository("neoai_runs");
        if (!repo) return;
        const stale = await repo.find({ filter: { status: "running" }, limit: 200 });
        for (const r of stale) {
          await repo.update({
            filterByTk: r.get("id"),
            values: { status: "failed", error: "interrupted by server restart", finished_at: /* @__PURE__ */ new Date() }
          });
        }
        if (stale.length) this.app.logger.warn(`[neoai] marked ${stale.length} orphaned running run(s) as failed`);
      } catch (err) {
        this.app.logger.warn(`[neoai] restart sweep failed (non-fatal): ${err}`);
      }
      this.startScheduler();
    });
    this.app.on("beforeStop", () => {
      if (this.schedulerTimer) clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    });
  }
  // ---------------------------------------------------------------------------
  // Automation bridge (scoping Q21 "Beides" + Q2 automation hub): registers a
  // "neoai-run" instruction on NocoBase's plugin-workflow so ANY automation
  // (collection event, schedule, action) can invoke a published NeoAI workflow
  // as a step. Registered as a plain InstructionInterface object — no import
  // from plugin-workflow needed (its registerInstruction accepts instances).
  // Best-effort: absence of plugin-workflow must never break load.
  registerAutomationBridge() {
    try {
      const wf = this.app.pm?.get?.("workflow");
      if (!wf?.registerInstruction) {
        this.app.logger.info("[neoai] plugin-workflow not present \u2014 automation bridge skipped");
        return;
      }
      const plugin = this;
      wf.registerInstruction("neoai-run", {
        run: async (node, _input, processor) => {
          try {
            const cfg = node.config ?? {};
            const key = String(cfg.workflowKey ?? "").trim();
            let input = {};
            if (typeof cfg.inputJson === "string" && cfg.inputJson.trim()) {
              try {
                input = JSON.parse(cfg.inputJson);
              } catch {
                return { status: -1, result: { error: "neoai-run: inputJson is not valid JSON" } };
              }
            } else if (cfg.input && typeof cfg.input === "object") {
              input = cfg.input;
            }
            if (cfg.includeContext !== false) {
              input = { ...input, $trigger: processor?.execution?.context ?? null };
            }
            const started = await plugin.startRun({
              workflowKey: key,
              input,
              trigger: "automation",
              triggeredBy: `plugin-workflow:${processor?.execution?.workflow?.title ?? processor?.execution?.workflowId ?? "?"}`,
              confirmed: true
              // configuring the automation IS the admin's consent
            });
            if (!("runId" in started)) {
              return { status: -1, result: { error: started.error ?? "needsConfirm unexpected here" } };
            }
            const done = await plugin.waitForRun(started.runId, 12e4);
            if (done.status === "succeeded") return { status: 1, result: { runId: started.runId, output: done.output } };
            return { status: -1, result: { runId: started.runId, error: done.error ?? `run ended ${done.status}` } };
          } catch (err) {
            return { status: -1, result: { error: String(err?.message ?? err) } };
          }
        }
      });
      this.app.logger.info('[neoai] automation bridge registered (plugin-workflow instruction "neoai-run")');
    } catch (err) {
      this.app.logger.warn(`[neoai] automation bridge registration failed (non-fatal): ${err}`);
    }
  }
  // ---------------------------------------------------------------------------
  // Time triggers (scoping Q21 "Beides") — dependency-free ~30s tick.
  startScheduler() {
    if (this.schedulerTimer) return;
    this.schedulerTimer = setInterval(() => {
      this.schedulerTick().catch((err) => this.app.logger.warn(`[neoai] scheduler tick failed: ${err}`));
    }, 3e4);
    this.app.logger.info("[neoai] scheduler started (30s tick)");
  }
  async schedulerTick() {
    const repo = this.db.getRepository("neoai_workflows");
    if (!repo) return;
    const rows = await repo.find({ filter: { enabled: true }, limit: 200 });
    const now = /* @__PURE__ */ new Date();
    for (const wf of rows) {
      const spec = parseSchedule(wf.get("schedule"));
      if (!spec) continue;
      const wfId = Number(wf.get("id"));
      if ([...this.running.values()].some((h) => h.workflowId === wfId)) continue;
      const lastRaw = wf.get("last_scheduled_at");
      const last = lastRaw ? new Date(lastRaw) : null;
      if (!isDue(spec, last, now)) continue;
      await repo.update({ filterByTk: wfId, values: { last_scheduled_at: now } });
      const res = await this.startRun({
        workflowId: wfId,
        input: wf.get("schedule_input") ?? {},
        trigger: "schedule",
        triggeredBy: "scheduler",
        confirmed: true
        // configuring a schedule IS the admin's standing consent
      });
      this.app.logger.info(`[neoai] schedule fired for workflow ${wfId}: ${JSON.stringify(res)}`);
    }
  }
  // ---------------------------------------------------------------------------
  // In-process service for host plugins (function registry + dispatch)
  /** Idempotently register/refresh an AI function of a host plugin. */
  async registerFunction(def) {
    const repo = this.db.getRepository("neoai_functions");
    if (!repo) return;
    const existing = await repo.findOne({ filter: { key: def.key } });
    if (existing) {
      await repo.update({
        filterByTk: existing.get("id"),
        values: { title: def.title, plugin: def.plugin, description: def.description ?? existing.get("description") }
      });
    } else {
      await repo.create({
        values: {
          key: def.key,
          title: def.title,
          plugin: def.plugin,
          description: def.description ?? "",
          input_example: def.inputExample ?? null,
          enabled: true
        }
      });
    }
  }
  /**
   * Dispatch a host-plugin AI function through its bound workflow.
   * Returns null when no workflow is bound/enabled — the caller MUST then run
   * its legacy code path (scoping Q4: fallback stays).
   */
  async runFunction(key, input, opts = {}) {
    const fn = await this.db.getRepository("neoai_functions")?.findOne({ filter: { key } });
    if (!fn || fn.get("enabled") === false || !fn.get("workflow_id")) return null;
    const started = await this.startRun({
      workflowId: Number(fn.get("workflow_id")),
      functionKey: key,
      input,
      trigger: "function",
      triggeredBy: opts.triggeredBy ?? `function:${key}`,
      confirmed: true
      // function dispatch is programmatic — confirm gates are for the console
    });
    if (!("runId" in started)) return started;
    if (!opts.wait) return started;
    return this.waitForRun(started.runId);
  }
  async waitForRun(runId, timeoutMs = 18e4) {
    const repo = this.db.getRepository("neoai_runs");
    const t0 = Date.now();
    for (; ; ) {
      const run = await repo.findOne({ filterByTk: runId });
      const status = String(run?.get("status") ?? "failed");
      if (!["queued", "running"].includes(status)) return { runId, status, output: run?.get("output"), error: run?.get("error") };
      if (Date.now() - t0 > timeoutMs) return { runId, status: "running", timeout: true };
      await new Promise((r) => setTimeout(r, 1e3));
    }
  }
  // ---------------------------------------------------------------------------
  // Run lifecycle
  async settingsRow() {
    try {
      return await this.db.getRepository("neoai_settings")?.findOne();
    } catch {
      return null;
    }
  }
  dayStart() {
    const d = /* @__PURE__ */ new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  async spentTodayUsd(workflowId) {
    try {
      const repo = this.db.getRepository("neoai_runs");
      const rows = await repo.find({
        filter: { started_at: { $gte: this.dayStart() }, ...workflowId ? { workflow_id: workflowId } : {} },
        fields: ["cost_usd"],
        limit: 2e3
      });
      return rows.reduce((s, r) => s + (Number(r.get("cost_usd")) || 0), 0);
    } catch {
      return 0;
    }
  }
  async spentTodayByWorkflow() {
    try {
      const repo = this.db.getRepository("neoai_runs");
      const rows = await repo.find({
        filter: { started_at: { $gte: this.dayStart() } },
        fields: ["workflow_id", "cost_usd"],
        limit: 2e3
      });
      const out = {};
      for (const r of rows) {
        const k = String(r.get("workflow_id") ?? "");
        out[k] = (out[k] ?? 0) + (Number(r.get("cost_usd")) || 0);
      }
      return out;
    } catch {
      return {};
    }
  }
  async loadPublishedDefinition(workflowId) {
    const wf = await this.db.getRepository("neoai_workflows").findOne({ filterByTk: workflowId });
    if (!wf) return null;
    const version = Number(wf.get("current_version") ?? 0);
    if (!version) return null;
    const row = await this.db.getRepository("neoai_workflow_versions").findOne({
      filter: { workflow_id: workflowId, version }
    });
    if (!row) return null;
    return { def: row.get("definition") ?? {}, version };
  }
  async startRun(opts) {
    const wfRepo = this.db.getRepository("neoai_workflows");
    const wf = opts.workflowId ? await wfRepo.findOne({ filterByTk: opts.workflowId }) : await wfRepo.findOne({ filter: { key: String(opts.workflowKey ?? "") } });
    if (!wf) return { error: "workflow not found" };
    const workflowId = Number(wf.get("id"));
    let def;
    let version = 0;
    if (opts.draft) {
      def = wf.get("definition_draft") ?? {};
    } else {
      const published = await this.loadPublishedDefinition(workflowId);
      if (!published) return { error: "workflow has no published version (publish it first, or run as draft test)" };
      def = published.def;
      version = published.version;
      if (wf.get("enabled") !== true && opts.trigger !== "manual" && opts.trigger !== "test") {
        return { error: "workflow is disabled" };
      }
    }
    const errors = validateDefinition(def);
    if (errors.length) return { error: `invalid definition: ${errors.join("; ")}` };
    if (wf.get("require_confirm") === true && opts.confirmed !== true) {
      const counts = countModelNodes(def);
      const settings = await this.settingsRow();
      return {
        needsConfirm: true,
        workflowId,
        estimate: {
          llmCalls: counts.llm,
          imageCalls: counts.image,
          spentTodayUsd: await this.spentTodayUsd(),
          workflowSpentTodayUsd: await this.spentTodayUsd(workflowId),
          globalDailyBudgetUsd: Number(settings?.get?.("daily_budget_usd")) || 0,
          workflowDailyBudgetUsd: Number(wf.get("daily_budget_usd")) || 0
        }
      };
    }
    const run = await this.db.getRepository("neoai_runs").create({
      values: {
        workflow_id: workflowId,
        version,
        function_key: opts.functionKey ?? "",
        status: "running",
        trigger: opts.trigger,
        input: truncateJson(opts.input, 6e4),
        triggered_by: opts.triggeredBy,
        started_at: /* @__PURE__ */ new Date()
      }
    });
    const runId = Number(run.get("id"));
    const handle = { cancelled: false, workflowId };
    this.running.set(runId, handle);
    setImmediate(() => {
      this.executeRun(runId, def, opts.input, handle, wf).catch((err) => {
        this.app.logger.error(`[neoai] run ${runId} crashed outside runner: ${err}`);
      });
    });
    return { runId };
  }
  async resumeRun(runId, approval) {
    const repo = this.db.getRepository("neoai_runs");
    const run = await repo.findOne({ filterByTk: runId });
    if (!run) return { error: `run ${runId} not found` };
    if (run.get("status") !== "waiting") return { error: `run ${runId} is not waiting (status ${run.get("status")})` };
    const state = run.get("state");
    if (!state?.frames) return { error: `run ${runId} has no resumable state` };
    const wf = await this.db.getRepository("neoai_workflows").findOne({ filterByTk: run.get("workflow_id") });
    if (!wf) return { error: "workflow of this run no longer exists" };
    await repo.update({ filterByTk: runId, values: { status: "running", waiting_message: "" } });
    const handle = { cancelled: false };
    this.running.set(runId, handle);
    const input = run.get("input") ?? {};
    setImmediate(() => {
      this.executeRun(runId, { nodes: [] }, input, handle, wf, { state, approval }).catch((err) => {
        this.app.logger.error(`[neoai] resume ${runId} crashed outside runner: ${err}`);
      });
    });
    return { ok: true, runId };
  }
  async executeRun(runId, def, input, handle, wf, resume) {
    const runsRepo = this.db.getRepository("neoai_runs");
    const stepsRepo = this.db.getRepository("neoai_run_steps");
    const settings = await this.settingsRow();
    const prices = { ...DEFAULT_PRICES, ...settings?.get?.("prices") ?? {} };
    const workflowId = Number(wf.get("id"));
    let seq = 0;
    let totalIn = 0;
    let totalOut = 0;
    let totalCost = 0;
    let spendCache = null;
    const openSteps = /* @__PURE__ */ new Map();
    const onStep = async (evt) => {
      try {
        const key = `${evt.path ?? ""}|${evt.nodeId}`;
        if (evt.phase === "start") {
          seq += 1;
          const row = await stepsRepo.create({
            values: {
              run_id: runId,
              seq,
              node_id: evt.nodeId,
              node_type: evt.nodeType,
              title: evt.title,
              path: evt.path ?? "",
              status: "running",
              started_at: /* @__PURE__ */ new Date()
            }
          });
          openSteps.set(key, { id: Number(row.get("id")), startedAt: Date.now() });
          return;
        }
        const open = openSteps.get(key);
        const finished = /* @__PURE__ */ new Date();
        const statusMap = { done: "done", error: "failed", suspend: "waiting", skipped: "skipped" };
        const values = {
          status: statusMap[evt.phase] ?? "done",
          finished_at: evt.phase === "suspend" ? null : finished,
          duration_ms: open ? Date.now() - open.startedAt : 0,
          output: truncateJson(evt.output, 8e3),
          error: evt.error ?? null,
          input_tokens: evt.usage?.inputTokens ?? 0,
          output_tokens: evt.usage?.outputTokens ?? 0,
          cost_usd: evt.costUsd ?? 0
        };
        if (open) {
          await stepsRepo.update({ filterByTk: open.id, values });
          openSteps.delete(key);
        } else {
          const stale = await stepsRepo.findOne({
            filter: { run_id: runId, node_id: evt.nodeId, status: "waiting" }
          });
          if (stale) {
            await stepsRepo.update({ filterByTk: stale.get("id"), values });
            return;
          }
          seq += 1;
          await stepsRepo.create({
            values: {
              run_id: runId,
              seq,
              node_id: evt.nodeId,
              node_type: evt.nodeType,
              title: evt.title,
              path: evt.path ?? "",
              started_at: finished,
              ...values
            }
          });
        }
      } catch (err) {
        this.app.logger.warn(`[neoai] step persist failed (run ${runId}, node ${evt.nodeId}): ${err}`);
      }
    };
    const execLeaf = execLeafFactory({
      app: this.app,
      prices,
      imagePriceUsd: Number(settings?.get?.("image_price_usd")) || DEFAULT_IMAGE_PRICE_USD,
      defaultModel: String(settings?.get?.("default_model") || "gemini-2.5-flash"),
      defaultService: String(settings?.get?.("default_llm_service") || ""),
      guardModelCall: async () => {
        const now = Date.now();
        if (!spendCache || now - spendCache.at > 5e3) {
          const byWf = await this.spentTodayByWorkflow();
          const global = Object.values(byWf).reduce((s, v) => s + v, 0);
          spendCache = { at: now, global, wf: byWf[String(workflowId)] ?? 0 };
        }
        const check = checkBudget({
          spentTodayUsd: spendCache.global + totalCost,
          workflowSpentTodayUsd: spendCache.wf + totalCost,
          globalDailyBudgetUsd: Number(settings?.get?.("daily_budget_usd")) || 0,
          workflowDailyBudgetUsd: Number(wf.get("daily_budget_usd")) || 0
        });
        if (!check.ok) throw new Error(`budget: ${check.reason}`);
      },
      recordUsage: (usage, costUsd) => {
        totalIn += usage.inputTokens ?? 0;
        totalOut += usage.outputTokens ?? 0;
        totalCost += costUsd ?? 0;
      }
    });
    const runner = new Runner({
      execLeaf: (node, scope) => execLeaf(node, scope),
      onStep,
      isCancelled: () => handle.cancelled,
      loadWorkflow: async (key) => {
        const sub = await this.db.getRepository("neoai_workflows").findOne({ filter: { key } });
        if (!sub) return null;
        const published = await this.loadPublishedDefinition(Number(sub.get("id")));
        return published?.def ?? null;
      }
    });
    let outcome;
    try {
      outcome = resume ? await runner.resume(def, input, resume.state, resume.approval, { id: runId }) : await runner.run(def, input, { id: runId });
    } catch (err) {
      outcome = { status: "failed", error: String(err?.message ?? err) };
    }
    this.running.delete(runId);
    let prevIn = 0;
    let prevOut = 0;
    let prevCost = 0;
    try {
      const prev = await runsRepo.findOne({ filterByTk: runId });
      prevIn = Number(prev?.get("input_tokens")) || 0;
      prevOut = Number(prev?.get("output_tokens")) || 0;
      prevCost = Number(prev?.get("cost_usd")) || 0;
    } catch {
    }
    const totals = {
      input_tokens: prevIn + totalIn,
      output_tokens: prevOut + totalOut,
      cost_usd: Math.round((prevCost + totalCost) * 1e6) / 1e6
    };
    try {
      if (outcome.status === "succeeded") {
        await runsRepo.update({
          filterByTk: runId,
          values: { status: "succeeded", output: truncateJson(outcome.output, 6e4), finished_at: /* @__PURE__ */ new Date(), state: null, ...this.addTotals(totals, runId) }
        });
      } else if (outcome.status === "waiting") {
        await runsRepo.update({
          filterByTk: runId,
          values: { status: "waiting", state: outcome.state, waiting_message: outcome.message ?? "Approval required", ...this.addTotals(totals, runId) }
        });
      } else if (outcome.status === "cancelled") {
        await runsRepo.update({
          filterByTk: runId,
          values: { status: "cancelled", finished_at: /* @__PURE__ */ new Date(), state: null, ...this.addTotals(totals, runId) }
        });
      } else {
        await runsRepo.update({
          filterByTk: runId,
          values: {
            status: handle.cancelled ? "cancelled" : "failed",
            error: outcome.status === "failed" ? outcome.error : null,
            finished_at: /* @__PURE__ */ new Date(),
            state: null,
            ...this.addTotals(totals, runId)
          }
        });
      }
    } catch (err) {
      this.app.logger.error(`[neoai] run ${runId}: final status persist failed: ${err}`);
    }
  }
  /** Spread helper: only include totals when anything was spent/counted. */
  addTotals(totals, _runId) {
    return totals.input_tokens || totals.output_tokens || totals.cost_usd ? totals : {};
  }
  // ---------------------------------------------------------------------------
  // Idempotent provisioning (CRM ensureCollection/ensureField pattern)
  async setup() {
    for (const values of NEOAI_COLLECTIONS) {
      try {
        await this.ensureCollection(values);
      } catch (err) {
        this.app.logger.error(`[neoai] ensureCollection ${values.name} failed: ${err}`);
      }
    }
    for (const { collection, field } of NEOAI_EXTRA_FIELDS) {
      try {
        await this.ensureField(collection, field);
      } catch (err) {
        this.app.logger.warn(`[neoai] ensureField ${collection}.${field?.name} failed (non-fatal): ${err}`);
      }
    }
    try {
      const repo = this.db.getRepository("neoai_settings");
      if (repo && !await repo.findOne()) {
        await repo.create({ values: { default_model: "gemini-2.5-flash", daily_budget_usd: 0, image_price_usd: 0.04 } });
      }
    } catch (err) {
      this.app.logger.warn(`[neoai] settings seed failed (non-fatal): ${err}`);
    }
    await this.ensureMenuLinks();
    try {
      await ensureSeedWorkflows(this);
    } catch (err) {
      this.app.logger.warn(`[neoai] seed workflows failed (non-fatal): ${err}`);
    }
  }
  async ensureCollection(values) {
    const repo = this.db.getRepository("collections");
    let model = await repo.findOne({ filter: { name: values.name } });
    if (model) {
      if (values.titleField && model.get("titleField") !== values.titleField) {
        await repo.update({ filterByTk: values.name, values: { titleField: values.titleField } });
      }
    } else {
      model = await repo.create({ values });
      this.app.logger.info(`[neoai] created collection "${values.name}"`);
    }
    await model.load();
    await this.db.getCollection(values.name).sync({ force: false, alter: { drop: false } });
  }
  async ensureField(collectionName, values) {
    const fieldsRepo = this.db.getRepository("fields");
    let field = await fieldsRepo.findOne({ filter: { collectionName, name: values.name } });
    if (!field) {
      field = await fieldsRepo.create({ values: { collectionName, ...values } });
      this.app.logger.info(`[neoai] created field ${collectionName}.${values.name}`);
    }
    await field.load();
    await this.db.getCollection(collectionName).sync({ force: false, alter: { drop: false } });
  }
  async ensureMenuLinks() {
    try {
      const routesRepo = this.db.getRepository("desktopRoutes");
      if (!routesRepo) return;
      const existing = await routesRepo.find({ filter: { type: "link" } });
      for (const link of MENU_LINKS) {
        const hit = existing.find((l) => l.options?.href === link.href) ?? existing.find((l) => (link.legacyHrefs ?? []).includes(l.options?.href));
        if (hit) {
          if (hit.title !== link.title || hit.icon !== link.icon || hit.options?.href !== link.href) {
            await routesRepo.update({
              filterByTk: hit.id,
              values: { title: link.title, icon: link.icon, sort: link.sort, options: { href: link.href, openInNewWindow: false } }
            });
          }
          continue;
        }
        await routesRepo.create({
          values: { type: "link", title: link.title, icon: link.icon, sort: link.sort, options: { href: link.href, openInNewWindow: false } }
        });
        this.app.logger.info(`[neoai] menu link provisioned: ${link.title} \u2192 ${link.href}`);
      }
    } catch (err) {
      this.app.logger.warn(`[neoai] menu link provisioning failed (non-fatal): ${err}`);
    }
  }
};
