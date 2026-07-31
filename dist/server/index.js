var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// package.json
var require_package = __commonJS({
  "package.json"(exports2, module2) {
    module2.exports = {
      name: "@neomodul/neoai",
      version: "0.1.7",
      displayName: "NeoAI",
      description: "NeoAI for NeoBase: central AI workflow management \u2014 tree-structured multi-step workflows (LLM, image, HTTP, data and approval nodes) with a visual editor, run monitor, cost tracking and a function registry other @neomodul plugins dispatch through. Gemini-first via @nocobase/plugin-ai; legacy code paths stay as fallback.",
      license: "UNLICENSED",
      private: true,
      main: "dist/server/index.js",
      homepage: "https://github.com/netconsultiv/neoai",
      scripts: {
        build: "node build-server.js && node build-client.js",
        test: 'node scripts/run-unit-tests.mjs --experimental-strip-types "test/*.test.mjs" "test/*/*.test.mjs"',
        "test:unit": 'node scripts/run-unit-tests.mjs --experimental-strip-types "test/*.test.mjs" "test/*/*.test.mjs"'
      },
      peerDependencies: {
        "@nocobase/client": "2.x",
        "@nocobase/server": "2.x"
      },
      devDependencies: {
        esbuild: "0.21.5"
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
  },
  {
    name: "neoai_memories",
    title: "NeoAI Memories",
    titleField: "id",
    fields: [
      // Loose namespace reference (e.g. "crm.deal", "konfigurator.configuration") —
      // no FK, matches neoai_functions.plugin's existing convention so the store
      // stays central and works even when the referencing plugin isn't installed.
      str("entity_type", "Entity type"),
      // Always a string, even for numeric ids (String(dealId)) — keeps this column
      // uniform across entity types with no per-type branching.
      str("entity_id", "Entity id"),
      str("key", "Key", { defaultValue: "summary" }),
      text("summary", "Summary"),
      json("structured", "Structured (reserved for Phase 2)"),
      select("status", "Status", ["draft", "confirmed"], "draft"),
      {
        name: "source_run",
        type: "belongsTo",
        interface: "m2o",
        target: "neoai_runs",
        foreignKey: "source_run_id",
        uiSchema: { title: "Source run", "x-component": "AssociationField" }
      },
      str("updated_by", "Updated by"),
      dt("confirmed_at", "Confirmed at")
    ]
  },
  {
    // Encrypted secrets vault (item 13). value_encrypted stores
    // "iv:authTag:ciphertext" (all base64) via src/server/lib/secrets.ts —
    // AES-256-GCM, key derived from APP_KEY. The `secretsList` action NEVER
    // returns this field (not even the encrypted form) — only {id, name,
    // configured}. Real encryption-at-rest, not masking (owner's explicit call).
    name: "neoai_secrets",
    title: "NeoAI Secrets",
    titleField: "name",
    fields: [
      str("name", "Name", { unique: true }),
      text("value_encrypted", "Encrypted value (iv:authTag:ciphertext, base64)")
    ]
  },
  {
    // Registered MCP server connections (item 11) — a reusable, named
    // picker instead of freehand per-node URLs (owner's explicit call).
    name: "neoai_mcp_servers",
    title: "NeoAI MCP Servers",
    titleField: "name",
    fields: [
      str("name", "Name", { unique: true }),
      str("url", "URL"),
      str("auth_header", 'Auth header name (e.g. "Authorization")'),
      {
        name: "auth_secret",
        type: "belongsTo",
        interface: "m2o",
        target: "neoai_secrets",
        foreignKey: "auth_secret_id",
        uiSchema: { title: "Auth secret", "x-component": "AssociationField" }
      },
      text("description", "Description")
    ]
  },
  // ---- Knowledge Hub (moved out of @neomodul/crm + extended) ----------------
  // Human-gated knowledge base for both humans and AI: articles/prompts are
  // plain admin-editable collections (native ACL, admin-only), but AI/workflow
  // code may NEVER write to neoai_knowledge_articles directly — it can only
  // create a neoai_knowledge_suggestions row (status:'pending') that a human
  // reviews via neoai:knowledgeSuggestionApprove/Reject. This is the opposite
  // write-permission default from neoai_memories (which IS AI-writable via
  // upsertMemory/confirmMemory) — a deliberately different concept living
  // alongside it.
  {
    name: "neoai_knowledge_articles",
    title: "NeoAI Knowledge Articles",
    titleField: "title",
    fields: [
      str("title", "Title", { allowNull: false }),
      text("body", "Body"),
      // Comma-separated, matches CRM knowledge_articles.tags convention.
      str("tags", "Tags (comma-separated)"),
      // Free string (not a fixed select): this now spans multiple plugins'
      // use cases (CRM, Konfigurator, …), so a closed enum would constantly
      // need code changes. Sensible defaults are offered in the console UI.
      str("use_case", "Use Case"),
      select("language", "Language", ["en", "de", "pl"], "en"),
      bool("active", "Active", true),
      // Provenance: 'manual' | 'crm-migration' | 'ai-suggested'.
      str("source", "Source", { defaultValue: "manual" })
    ]
  },
  {
    name: "neoai_prompts",
    title: "NeoAI Prompts",
    titleField: "title",
    fields: [
      str("use_case", "Use Case Key", { allowNull: false }),
      str("title", "Title"),
      text("system_prompt", "System Prompt"),
      str("model_hint", "Model Hint"),
      json("settings", "Generation Settings"),
      bool("active", "Active", true),
      text("notes", "Notes")
    ]
  },
  {
    // Cross-entity links: an article can point at ANY other entity (catalog
    // items, CRM deals, …) — free entity_type/entity_id strings, same loose-
    // coupling convention as neoai_memories (no FK into other plugins).
    name: "neoai_knowledge_links",
    title: "NeoAI Knowledge Links",
    titleField: "id",
    fields: [
      {
        name: "article",
        type: "belongsTo",
        interface: "m2o",
        target: "neoai_knowledge_articles",
        foreignKey: "article_id",
        uiSchema: { title: "Article", "x-component": "AssociationField" }
      },
      str("entity_type", 'Entity type (e.g. "konfigurator.catalog_option", "crm.deal")'),
      // Always a string, even for numeric ids — same convention as
      // neoai_memories.entity_id.
      str("entity_id", "Entity id"),
      str("label", "Label (optional human-readable cache)")
    ]
  },
  {
    // The ONLY path AI/workflow code may use to affect Knowledge. Never
    // writes neoai_knowledge_articles directly — a human always approves or
    // rejects via neoai:knowledgeSuggestionApprove/Reject.
    name: "neoai_knowledge_suggestions",
    title: "NeoAI Knowledge Suggestions",
    titleField: "proposed_title",
    fields: [
      {
        // Null = propose a brand-new article.
        name: "target_article",
        type: "belongsTo",
        interface: "m2o",
        target: "neoai_knowledge_articles",
        foreignKey: "target_article_id",
        uiSchema: { title: "Target article (empty = new article)", "x-component": "AssociationField" }
      },
      str("proposed_title", "Proposed title"),
      text("proposed_body", "Proposed body"),
      str("proposed_tags", "Proposed tags (comma-separated)"),
      str("proposed_use_case", "Proposed use case"),
      select("proposed_language", "Proposed language", ["en", "de", "pl"], "en"),
      text("reason", "Reason (why this was proposed)"),
      {
        name: "source_run",
        type: "belongsTo",
        interface: "m2o",
        target: "neoai_runs",
        foreignKey: "source_run_id",
        uiSchema: { title: "Source run", "x-component": "AssociationField" }
      },
      select("status", "Status", ["pending", "approved", "rejected"], "pending"),
      str("reviewed_by", "Reviewed by"),
      dt("reviewed_at", "Reviewed at")
    ]
  }
];
var NEOAI_EXTRA_FIELDS = [
  { collection: "neoai_settings", field: bool("force_mock", "Force mock mode (no real model calls)", false) },
  { collection: "neoai_workflows", field: str("schedule", "Schedule (empty = off)") },
  { collection: "neoai_workflows", field: json("schedule_input", "Schedule input") },
  { collection: "neoai_workflows", field: dt("last_scheduled_at", "Last scheduled run") },
  // On-failure hook (item 7): fires the named workflow after THIS one ends
  // failed, reusing the same startRun path a subworkflow node uses — single
  // level only, never chains (a hook's own failure never fires another hook).
  { collection: "neoai_workflows", field: str("on_failure_workflow_key", "On-failure hook: workflow key (empty = off)") },
  { collection: "neoai_workflows", field: json("on_failure_input", "On-failure hook input (JSON of templates: {{run.id}}, {{run.error}}, {{input.x}})") },
  // Per-function budget override (item 14): takes precedence over the bound
  // workflow's own budget when set and >0.
  { collection: "neoai_functions", field: dbl("daily_budget_usd", "Daily budget override (USD, 0 = use the bound workflow's budget)", 0) },
  // Proactive spend alerts (item 15): forward-looking warning threshold —
  // the hard block still only ever comes from daily_budget_usd via checkBudget.
  { collection: "neoai_settings", field: dbl("spend_alert_pct", "Warn when spend crosses this % of the daily budget", 80) },
  // Staleness indicator (item 19): stamped on every upsert/confirm write, so
  // the panel can show "last touched" even before anything is ever confirmed.
  // The staleness BADGE itself is based on confirmed_at, not this field — see
  // MemoryPanel.tsx.
  { collection: "neoai_memories", field: dt("updated_at", "Last updated at") },
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
  { title: "NeoAI", icon: "RobotOutlined", href: "/admin/neoai/workflows", legacyHrefs: ["/neoai", "/admin/neoai"], sort: 14 },
  // Knowledge Hub: OWN top-level menu entry (NOT nested under the "NeoAI"
  // link/sidebar) — moved out of @neomodul/crm, same sort position (12) so it
  // visually replaces CRM's old top-level "Knowledge" link. See
  // src/client/console/KnowledgeConsole.tsx for the console this points at.
  { title: "Knowledge", icon: "ReadOutlined", href: "/admin/neoai-knowledge/articles", legacyHrefs: ["/neoai-knowledge"], sort: 12 }
];

// src/server/lib/env.ts
function isSandbox(env = process.env) {
  const v = String(env.NEOAI_SANDBOX ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

// src/server/lib/roleContext.ts
var NEOAI_ADMIN_SNIPPET = "pm.neoai.settings";
function rolesOfContext(ctx) {
  const raw = ctx?.state?.currentRoles;
  const list = Array.isArray(raw) && raw.length ? raw : [ctx?.state?.currentRole];
  const names = [];
  for (const entry of list) {
    const name = typeof entry === "string" ? entry : entry?.name ?? entry?.role;
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed || trimmed === "__union__") continue;
    if (!names.includes(trimmed)) names.push(trimmed);
  }
  return names;
}
function neoaiActionPath(ctx) {
  const action = ctx?.action?.actionName;
  return `neoai:${typeof action === "string" && action.trim() ? action.trim() : "*"}`;
}
function isAdminCtx(acl, ctx) {
  if (!acl || typeof acl.getRole !== "function") return false;
  const actionPath = neoaiActionPath(ctx);
  for (const role of rolesOfContext(ctx)) {
    if (role === "root") return true;
    let verdict = null;
    try {
      verdict = acl.getRole(role)?.snippetAllowed?.(actionPath);
    } catch {
      verdict = null;
    }
    if (verdict === true) return true;
  }
  return false;
}
var NEOAI_OPEN_ACTIONS = ["access"];
function isOpenNeoaiAction(action) {
  return typeof action === "string" && NEOAI_OPEN_ACTIONS.includes(action);
}
function mayOperateNeoai(acl, ctx) {
  return isAdminCtx(acl, { ...ctx, state: ctx?.state, action: { actionName: "*" } });
}
function neoaiGateMiddleware(acl) {
  return async function neoaiAdminGate(ctx, next) {
    if (ctx?.action?.resourceName !== "neoai") return next();
    if (isOpenNeoaiAction(ctx?.action?.actionName)) return next();
    if (!isAdminCtx(acl, ctx)) ctx.throw(403, "NeoAI is admin-only for now");
    return next();
  };
}
function blanketNeoaiGrants(acl) {
  const actions = acl?.allowManager?.skipActions?.get?.("neoai");
  if (!actions || typeof actions.forEach !== "function") return [];
  const found = [];
  actions.forEach((_condition, action) => {
    if (isOpenNeoaiAction(action)) return;
    found.push(`neoai:${action}`);
  });
  return found;
}

// src/server/lib/neoaiConfigCollections.ts
var NEOAI_GATED_COLLECTIONS = [
  "neoai_workflows",
  "neoai_workflow_versions",
  "neoai_functions",
  "neoai_runs",
  "neoai_run_steps",
  "neoai_settings",
  "neoai_memories",
  "neoai_secrets",
  "neoai_mcp_servers",
  "neoai_knowledge_articles",
  "neoai_prompts",
  "neoai_knowledge_links",
  "neoai_knowledge_suggestions"
];
function neoaiSnippetActions() {
  return ["neoai:*", ...NEOAI_GATED_COLLECTIONS.map((name) => `${name}:*`)];
}
function detachNeoaiCollectionsFromStrategy(app) {
  const acl = app?.acl;
  if (!acl || !acl.strategyResources || typeof acl.removeStrategyResource !== "function") return 0;
  let removed = 0;
  for (const name of NEOAI_GATED_COLLECTIONS) {
    if (acl.strategyResources.has(name)) {
      acl.removeStrategyResource(name);
      removed++;
    }
  }
  return removed;
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
  const f = opts.functionDailyBudgetUsd ?? 0;
  if (f > 0 && (opts.functionSpentTodayUsd ?? 0) >= f) {
    return { ok: false, reason: `function daily budget exhausted (${(opts.functionSpentTodayUsd ?? 0).toFixed(2)} / ${f} USD)` };
  }
  return { ok: true };
}

// src/server/lib/net.ts
var PRIVATE_HOST_RE = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|fd[0-9a-f]{2}:)/i;
function isPrivateHost(url) {
  try {
    const host = new URL(url).hostname;
    return PRIVATE_HOST_RE.test(host) || host.endsWith(".internal") || host.endsWith(".local");
  } catch {
    return true;
  }
}

// src/server/lib/mcp.ts
var MCP_TIMEOUT_MS = 45e3;
var rpcIdCounter = 0;
async function callMcpTool(serverUrl, toolName, args = {}, authHeader, authValue, opts = {}) {
  if (!/^https?:\/\//i.test(String(serverUrl ?? ""))) {
    throw new Error(`mcp: invalid server url "${serverUrl}"`);
  }
  if (opts.allowPrivate !== true && isPrivateHost(serverUrl)) {
    throw new Error(`mcp: private/internal target blocked (set allowPrivate:true to permit)`);
  }
  if (!toolName) throw new Error("mcp: toolName is required");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(opts.timeoutMs || MCP_TIMEOUT_MS, 6e4));
  try {
    rpcIdCounter += 1;
    const body = {
      jsonrpc: "2.0",
      id: rpcIdCounter,
      method: "tools/call",
      params: { name: toolName, arguments: args ?? {} }
    };
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream"
    };
    if (authHeader && authValue) headers[authHeader] = authValue;
    const res = await fetch(serverUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text2 = await res.text();
    if (!res.ok) {
      throw new Error(`mcp: ${toolName} \u2192 HTTP ${res.status} ${String(text2).slice(0, 200)}`);
    }
    let parsed;
    try {
      parsed = JSON.parse(text2);
    } catch {
      throw new Error(`mcp: ${toolName} \u2192 non-JSON response: ${String(text2).slice(0, 200)}`);
    }
    if (parsed?.error) {
      throw new Error(`mcp: ${toolName} \u2192 ${parsed.error.message ?? JSON.stringify(parsed.error)}`);
    }
    return { result: parsed?.result, isError: parsed?.result?.isError === true };
  } finally {
    clearTimeout(timer);
  }
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
async function execMcpTool(node, scope, deps) {
  const cfg = resolveTemplates(node.config ?? {}, scope);
  const serverId = cfg.serverId ?? cfg.server_id;
  if (!serverId) throw new Error(`mcp_tool node "${node.id}": serverId is required`);
  const toolName = String(cfg.toolName ?? "");
  if (!toolName) throw new Error(`mcp_tool node "${node.id}": toolName is required`);
  const repo = deps.app.db.getRepository("neoai_mcp_servers");
  if (!repo) throw new Error(`mcp_tool node "${node.id}": neoai_mcp_servers collection unavailable`);
  const serverRow = await repo.findOne({ filterByTk: Number(serverId), appends: ["auth_secret"] });
  if (!serverRow) throw new Error(`mcp_tool node "${node.id}": MCP server ${serverId} not found`);
  const serverUrl = String(serverRow.get("url") ?? "");
  const authHeader = String(serverRow.get("auth_header") ?? "") || void 0;
  let authValue;
  const secretRow = serverRow.get("auth_secret");
  const secretName = secretRow?.name ?? secretRow?.get?.("name");
  if (secretName) authValue = deps.secrets?.[String(secretName)];
  const args = cfg.args && typeof cfg.args === "object" ? cfg.args : {};
  const res = await callMcpTool(serverUrl, toolName, args, authHeader, authValue, { allowPrivate: cfg.allowPrivate === true });
  return { output: res };
}
var AGENT_DECIDE_SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["call_tool", "finish"] },
    tool: { type: "string" },
    args: { type: "object" },
    reasoning: { type: "string" },
    finalOutput: {}
  },
  required: ["action", "reasoning"]
};
async function execAgentDecide(node, scope, deps) {
  await deps.guardModelCall();
  const cfg = node.config ?? {};
  const goal = String(cfg.goal ?? "");
  const tools = Array.isArray(cfg.tools) ? cfg.tools : [];
  const toolsDesc = tools.map((t) => `- ${t.name} (${t.type}): ${t.description || "no description"}`).join("\n");
  const observations = String(cfg.observations ?? "");
  const system = String(
    resolveTemplates(
      cfg.systemPrompt ?? "You are an autonomous agent. Decide the next action: either call one of the available tools, or finish with a final output. Respond ONLY with the requested JSON.",
      scope
    ) ?? ""
  );
  const prompt = [
    `Goal: ${goal}`,
    tools.length ? `Available tools:
${toolsDesc}` : "No tools are available.",
    observations ? `Observations so far:${observations}` : "No observations yet \u2014 this is the first turn.",
    'Decide the next action. If you have enough information to satisfy the goal, use action "finish" and set finalOutput. Otherwise use action "call_tool", set "tool" to one of the available tool names, and "args" to the arguments object for that tool.'
  ].join("\n\n");
  const res = await llmInvoke(deps.app, {
    service: cfg.service ?? deps.defaultService,
    model: cfg.model ?? deps.defaultModel,
    system,
    prompt,
    jsonSchema: AGENT_DECIDE_SCHEMA,
    temperature: cfg.temperature ?? 0.1
  });
  const cost = costOf(res.model, res.usage, deps.prices);
  deps.recordUsage(res.usage, cost);
  if (res.json === void 0) {
    throw new Error(`agent_decide node "${node.id}": model returned no parseable JSON`);
  }
  return {
    output: { text: res.text, json: res.json, model: res.model, via: res.via },
    usage: res.usage,
    costUsd: cost
  };
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
      case "mcp_tool":
        return execMcpTool(node, scope, deps);
      case "agent_decide":
        return execAgentDecide(node, scope, deps);
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
var MAX_AGENT_TURNS = 25;
var STRUCTURAL = /* @__PURE__ */ new Set(["condition", "parallel", "loop", "agent"]);
function baseScope(input, vars, runMeta) {
  return { input, nodes: vars, run: runMeta ?? {} };
}
function validateDefinition(def) {
  const errors = [];
  const seen = /* @__PURE__ */ new Set();
  const walk = (nodes, insideParallel) => {
    for (const n of nodes ?? []) {
      if (!n.id || typeof n.id !== "string") errors.push({ message: `node without id (type ${n.type})` });
      else if (seen.has(n.id)) errors.push({ nodeId: n.id, message: `duplicate node id "${n.id}"` });
      else seen.add(n.id);
      if (!n.type) errors.push({ nodeId: n.id, message: `node "${n.id}" without type` });
      if (insideParallel && n.type === "human_gate") {
        errors.push({ nodeId: n.id, message: `human_gate "${n.id}" inside a parallel block is not supported (v1)` });
      }
      const branches = n.branches ?? [];
      if (n.type === "condition" && branches.length < 1) errors.push({ nodeId: n.id, message: `condition "${n.id}" needs branches[0]` });
      if (n.type === "loop" && branches.length < 1) errors.push({ nodeId: n.id, message: `loop "${n.id}" needs branches[0] (body)` });
      if (n.type === "parallel" && branches.length < 1) errors.push({ nodeId: n.id, message: `parallel "${n.id}" needs at least one branch` });
      if (n.type === "agent") {
        if (!Array.isArray(n.config?.tools) || n.config.tools.length < 1) {
          errors.push({ nodeId: n.id, message: `agent "${n.id}" needs at least one tool in config.tools` });
        }
        if (!String(n.config?.goal ?? "").trim()) {
          errors.push({ nodeId: n.id, message: `agent "${n.id}" needs a non-empty goal` });
        }
      }
      for (const b of branches) walk(b ?? [], insideParallel || n.type === "parallel");
    }
  };
  walk(def?.nodes ?? [], false);
  if (!def?.nodes?.length) errors.push({ message: "workflow has no nodes" });
  return errors;
}
var Runner = class _Runner {
  constructor(rt) {
    this.rt = rt;
  }
  /**
   * `seed` lets a draft test-run skip re-executing early, already-verified
   * TOP-LEVEL nodes: `vars` seeds state.vars with their cached outputs, and
   * `skipToNodeId` fast-forwards the root frame's index to that node (found
   * only among top-level `def.nodes` — nested/branch ids are out of scope
   * for v1). An id that doesn't resolve at the top level is silently
   * ignored (falls back to a normal from-the-start run) rather than erroring.
   */
  async run(def, input, runMeta, seed) {
    const state = {
      frames: [{ kind: "seq", nodes: def.nodes ?? [], idx: 0, path: "" }],
      vars: seed?.vars ? { ...seed.vars } : {},
      output: void 0
    };
    if (seed?.skipToNodeId) {
      const idx = (def.nodes ?? []).findIndex((n) => n.id === seed.skipToNodeId);
      if (idx > 0) state.frames[0].idx = idx;
    }
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
          if (node.type === "agent") {
            const maxTurns = Math.max(1, Math.min(Number(node.config?.maxTurns) || MAX_AGENT_TURNS, MAX_AGENT_TURNS));
            const tools = Array.isArray(node.config?.tools) ? node.config.tools : [];
            const systemPrompt = node.config?.systemPrompt ?? "";
            const goal = String(node.config?.goal ?? "");
            const toolSummaries = tools.map((t) => ({ name: t.name, description: t.description ?? "", type: t.type }));
            let finished = false;
            let finalOutput = null;
            let turnCount = 0;
            let observations = "";
            for (let turn = 0; turn < maxTurns; turn++) {
              if (this.rt.isCancelled()) throw new CancelledError();
              turnCount = turn + 1;
              const decideId = `${node.id}::t${turn}::decide`;
              const decideNode = {
                id: decideId,
                type: "agent_decide",
                title: `${node.title ?? node.id} \u2014 turn ${turn + 1} decide`,
                config: { systemPrompt, goal, tools: toolSummaries, observations }
              };
              await this.rt.onStep({ nodeId: decideId, nodeType: "agent_decide", title: decideNode.title, phase: "start", path });
              let decision;
              try {
                decision = await this.rt.execLeaf(decideNode, scope, path);
              } catch (err) {
                if (err instanceof CancelledError) throw err;
                await this.rt.onStep({
                  nodeId: decideId,
                  nodeType: "agent_decide",
                  title: decideNode.title,
                  phase: "error",
                  error: String(err?.message ?? err),
                  path
                });
                return { status: "failed", error: String(err?.message ?? err), nodeId: decideId };
              }
              state.vars[decideId] = decision.output ?? {};
              await this.rt.onStep({
                nodeId: decideId,
                nodeType: "agent_decide",
                title: decideNode.title,
                phase: "done",
                output: decision.output,
                usage: decision.usage,
                costUsd: decision.costUsd,
                path
              });
              const decided = decision.output?.json ?? decision.output ?? {};
              const action = String(decided?.action ?? "");
              if (action === "finish") {
                finished = true;
                finalOutput = decided?.finalOutput ?? null;
                break;
              }
              const toolName = String(decided?.tool ?? "");
              const tool = tools.find((t) => t.name === toolName);
              if (!tool) {
                return { status: "failed", error: `agent "${node.id}": decided tool "${toolName}" is not in config.tools`, nodeId: node.id };
              }
              const toolArgs = decided?.args ?? {};
              const toolStepId = `${node.id}::t${turn}::tool::${toolName}`;
              let toolOutput;
              if (tool.type === "mcp") {
                const mcpNode = {
                  id: toolStepId,
                  type: "mcp_tool",
                  title: `${node.title ?? node.id} \u2014 turn ${turn + 1} tool ${toolName}`,
                  config: { serverId: tool.serverId, toolName: tool.toolName ?? toolName, args: toolArgs, allowPrivate: tool.allowPrivate }
                };
                await this.rt.onStep({ nodeId: toolStepId, nodeType: "mcp_tool", title: mcpNode.title, phase: "start", path });
                try {
                  const res2 = await this.rt.execLeaf(mcpNode, scope, path);
                  toolOutput = res2.output;
                  state.vars[toolStepId] = toolOutput ?? {};
                  await this.rt.onStep({ nodeId: toolStepId, nodeType: "mcp_tool", title: mcpNode.title, phase: "done", output: toolOutput, path });
                } catch (err) {
                  if (err instanceof CancelledError) throw err;
                  await this.rt.onStep({
                    nodeId: toolStepId,
                    nodeType: "mcp_tool",
                    title: mcpNode.title,
                    phase: "error",
                    error: String(err?.message ?? err),
                    path
                  });
                  return { status: "failed", error: String(err?.message ?? err), nodeId: toolStepId };
                }
              } else if (tool.type === "subworkflow") {
                const depth = this.rt.depth ?? 0;
                if (depth >= MAX_SUBWORKFLOW_DEPTH) {
                  return { status: "failed", error: `agent "${node.id}": tool "${toolName}": max subworkflow depth ${MAX_SUBWORKFLOW_DEPTH} exceeded`, nodeId: toolStepId };
                }
                const key = String(tool.workflowKey ?? "");
                const child = this.rt.loadWorkflow ? await this.rt.loadWorkflow(key) : null;
                if (!child) {
                  return { status: "failed", error: `agent "${node.id}": tool "${toolName}": workflow "${key}" not found/published`, nodeId: toolStepId };
                }
                await this.rt.onStep({ nodeId: toolStepId, nodeType: "subworkflow", title: `${node.title ?? node.id} \u2014 turn ${turn + 1} tool ${toolName}`, phase: "start", path });
                const childRunner = new _Runner({ ...this.rt, depth: depth + 1 });
                const out = await childRunner.run(child, toolArgs, runMeta);
                if (out.status === "cancelled") throw new CancelledError();
                if (out.status === "failed") {
                  await this.rt.onStep({
                    nodeId: toolStepId,
                    nodeType: "subworkflow",
                    title: `${node.title ?? node.id} \u2014 turn ${turn + 1} tool ${toolName}`,
                    phase: "error",
                    error: out.error,
                    path
                  });
                  return { status: "failed", error: `agent "${node.id}": tool "${toolName}": ${out.error}`, nodeId: toolStepId };
                }
                if (out.status === "waiting") {
                  const msg = `agent "${node.id}": tool "${toolName}": human_gate inside subworkflow is not supported (v1)`;
                  await this.rt.onStep({
                    nodeId: toolStepId,
                    nodeType: "subworkflow",
                    title: `${node.title ?? node.id} \u2014 turn ${turn + 1} tool ${toolName}`,
                    phase: "error",
                    error: msg,
                    path
                  });
                  return { status: "failed", error: msg, nodeId: toolStepId };
                }
                toolOutput = out.output ?? {};
                state.vars[toolStepId] = toolOutput;
                await this.rt.onStep({
                  nodeId: toolStepId,
                  nodeType: "subworkflow",
                  title: `${node.title ?? node.id} \u2014 turn ${turn + 1} tool ${toolName}`,
                  phase: "done",
                  output: toolOutput,
                  path
                });
              } else {
                return { status: "failed", error: `agent "${node.id}": tool "${toolName}" has unknown type "${tool.type}"`, nodeId: toolStepId };
              }
              observations += `
Turn ${turn + 1}: called tool "${toolName}" with args ${JSON.stringify(toolArgs)} \u2192 result ${JSON.stringify(toolOutput).slice(0, 2e3)}`;
            }
            state.vars[node.id] = { turnCount, finished, finalOutput };
            await this.rt.onStep({
              nodeId: node.id,
              nodeType: node.type,
              title: node.title ?? node.id,
              phase: "done",
              output: { turnCount, finished, finalOutput },
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

// src/server/lib/secrets.ts
var import_node_crypto = __toESM(require("node:crypto"));
var ALGO = "aes-256-gcm";
var SALT = "neoai-secrets-vault";
var IV_LEN = 12;
var cachedKey = null;
function deriveKey(env = process.env) {
  const appKey = String(env.APP_KEY ?? "").trim();
  if (!appKey) throw new Error("secrets: APP_KEY is not set \u2014 cannot encrypt/decrypt");
  if (cachedKey && cachedKey.source === appKey) return cachedKey.key;
  const key = import_node_crypto.default.scryptSync(appKey, SALT, 32);
  cachedKey = { source: appKey, key };
  return key;
}
function encryptSecret(plain, env = process.env) {
  const key = deriveKey(env);
  const iv = import_node_crypto.default.randomBytes(IV_LEN);
  const cipher = import_node_crypto.default.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plain ?? ""), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}
function decryptSecret(stored, env = process.env) {
  const key = deriveKey(env);
  const parts = String(stored ?? "").split(":");
  if (parts.length !== 3) throw new Error("secrets: malformed stored value");
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(dataB64, "base64");
  const decipher = import_node_crypto.default.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

// src/server/lib/knowledgeRetrieval.ts
var TITLE_BOOST = 3;
var TAG_BOOST = 4;
var PHRASE_BONUS_TITLE = 5;
var PHRASE_BONUS_BODY = 3;
var USE_CASE_BONUS = 2;
var SNIPPET_RADIUS = 120;
var DEFAULT_LIMIT = 5;
var MAX_LIMIT = 50;
var NO_DECOMPOSITION = { \u00DF: "ss", \u0142: "l" };
var COMBINING_MARKS = new RegExp(`[${String.fromCharCode(768)}-${String.fromCharCode(879)}]`, "g");
function foldDiacritics(text2) {
  return String(text2).toLowerCase().replace(/[ßł]/g, (ch) => NO_DECOMPOSITION[ch]).normalize("NFD").replace(COMBINING_MARKS, "");
}
function tokenize(text2) {
  if (!text2) return [];
  return foldDiacritics(text2).split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
}
function frequencies(tokens) {
  const freq = /* @__PURE__ */ new Map();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  return freq;
}
function score(query, article, useCase) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;
  const titleTokens = tokenize(String(article.title ?? ""));
  const bodyTokens = tokenize(String(article.body ?? ""));
  const tagTokens = tokenize(String(article.tags ?? ""));
  const titleFreq = frequencies(titleTokens);
  const bodyFreq = frequencies(bodyTokens);
  const tagFreq = frequencies(tagTokens);
  let total = 0;
  for (const term of new Set(queryTokens)) {
    total += bodyFreq.get(term) ?? 0;
    total += (titleFreq.get(term) ?? 0) * TITLE_BOOST;
    total += (tagFreq.get(term) ?? 0) * TAG_BOOST;
  }
  if (queryTokens.length >= 2 && new Set(queryTokens).size >= 2) {
    const phrase = ` ${queryTokens.join(" ")} `;
    if (` ${titleTokens.join(" ")} `.includes(phrase)) total += PHRASE_BONUS_TITLE;
    else if (` ${bodyTokens.join(" ")} `.includes(phrase)) total += PHRASE_BONUS_BODY;
  }
  if (total > 0 && useCase && article.use_case === useCase) total += USE_CASE_BONUS;
  return total;
}
var WORD_RE = /[0-9A-Za-zÀ-ÖØ-öø-ɏ]+/g;
function extractSnippet(query, body, radius = SNIPPET_RADIUS) {
  const text2 = String(body ?? "").replace(/\s+/g, " ").trim();
  if (!text2) return "";
  const terms = new Set(tokenize(query));
  const hits = [];
  if (terms.size > 0) {
    WORD_RE.lastIndex = 0;
    let m;
    while (m = WORD_RE.exec(text2)) {
      const folded = foldDiacritics(m[0]);
      if (terms.has(folded)) hits.push({ index: m.index, length: m[0].length, term: folded });
    }
  }
  if (hits.length === 0) {
    return clip(text2, 0, 2 * radius);
  }
  let best = hits[0];
  let bestDistinct = -1;
  let bestTotal = -1;
  for (const anchor of hits) {
    const near = hits.filter((h) => Math.abs(h.index - anchor.index) <= radius);
    const distinct = new Set(near.map((h) => h.term)).size;
    if (distinct > bestDistinct || distinct === bestDistinct && near.length > bestTotal) {
      best = anchor;
      bestDistinct = distinct;
      bestTotal = near.length;
    }
  }
  return clip(text2, Math.max(0, best.index - radius), Math.min(text2.length, best.index + best.length + radius), best.index, best.index + best.length);
}
function clip(text2, start, end, keepFrom = start, keepTo = end) {
  let s = start;
  let e = Math.min(end, text2.length);
  if (s > 0) {
    const space = text2.indexOf(" ", s);
    if (space !== -1 && space < keepFrom) s = space + 1;
  }
  if (e < text2.length) {
    const space = text2.lastIndexOf(" ", e);
    if (space > keepTo) e = space;
  }
  return (s > 0 ? "\u2026" : "") + text2.slice(s, e) + (e < text2.length ? "\u2026" : "");
}
function search(query, articles, options = {}) {
  if (tokenize(query).length === 0) return [];
  const useCase = options.useCase || void 0;
  const requested = Math.floor(Number(options.limit));
  const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, MAX_LIMIT) : DEFAULT_LIMIT;
  const eligible = !useCase ? articles : articles.filter((a) => {
    const scope = String(a.use_case ?? "");
    return !scope || scope === "general" || scope === useCase;
  });
  const ranked = [];
  eligible.forEach((article, order) => {
    const s = score(query, article, useCase);
    if (s > 0) {
      ranked.push({ article, score: s, snippet: extractSnippet(query, String(article.body ?? "")), order });
    }
  });
  ranked.sort((a, b) => b.score - a.score || a.order - b.order);
  return ranked.slice(0, limit).map(({ article, score: s, snippet }) => ({ article, score: s, snippet }));
}
function planApproveSuggestion(row, reviewedBy, now = /* @__PURE__ */ new Date()) {
  if (!row) return { ok: false, reason: "suggestion not found" };
  if (row.status !== "pending") return { ok: false, reason: `suggestion is already ${row.status}` };
  const proposed = {
    title: row.proposed_title ?? "",
    body: row.proposed_body ?? "",
    tags: row.proposed_tags ?? "",
    use_case: row.proposed_use_case ?? "",
    language: row.proposed_language || "en"
  };
  const articleWrite = row.target_article_id ? { op: "update", articleId: Number(row.target_article_id), values: proposed } : { op: "create", values: { ...proposed, active: true, source: "ai-suggested" } };
  return {
    ok: true,
    articleWrite,
    suggestionUpdate: { status: "approved", reviewed_by: reviewedBy, reviewed_at: now }
  };
}
function planRejectSuggestion(row, reviewedBy, now = /* @__PURE__ */ new Date()) {
  if (!row) return { ok: false, reason: "suggestion not found" };
  if (row.status !== "pending") return { ok: false, reason: `suggestion is already ${row.status}` };
  return { ok: true, suggestionUpdate: { status: "rejected", reviewed_by: reviewedBy, reviewed_at: now } };
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
          kind: { type: "string", description: "bplan|transport|vegetation|zufahrt|sonstig" },
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
      if (n.type === "agent") out.llm += Math.max(1, Math.min(Number(n.config?.maxTurns) || 25, 25));
      for (const b of n.branches ?? []) walk(b ?? []);
    }
  };
  walk(def?.nodes ?? []);
  return out;
}
var pkg = require_package();
var NeoaiPlugin = class _NeoaiPlugin extends import_server.Plugin {
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
    this.app.acl.registerSnippet({ name: NEOAI_ADMIN_SNIPPET, actions: neoaiSnippetActions() });
    this.app.acl.allow("neoai", [...NEOAI_OPEN_ACTIONS], "loggedIn");
    const blanket = blanketNeoaiGrants(this.app.acl);
    if (blanket.length) {
      throw new Error(
        `[neoai] these grants bypass the ACL for the neoai resource and would reopen the console to every logged-in user: ${blanket.join(", ")}. Only ${NEOAI_OPEN_ACTIONS.join(", ")} may be open. See src/server/lib/roleContext.ts.`
      );
    }
    this.app.resourceManager.use(neoaiGateMiddleware(this.app.acl), {
      tag: "neoai-admin-gate",
      after: "acl"
    });
    const requireAdmin = (ctx) => {
      if (!isAdminCtx(this.app.acl, ctx)) ctx.throw(403, "NeoAI is admin-only for now");
    };
    this.app.resourceManager.define({
      name: "neoai",
      actions: {
        /**
         * "May I open this console?" — the one action that answers instead of refusing.
         *
         * Tickets b4f8730e and 7466a838, which are the same defect from both ends. NeoAI's console
         * is mounted as nested admin routes, not through `pluginSettingsManager`, so NocoBase's
         * `/admin/settings/**` gate never covered it: every logged-in user could open
         * `/admin/neoai` — and on this deployment `member` and `sales` have the menu entry, so it
         * was not even "whoever knows the URL". What they got was not a refusal but a console that
         * mounted, fired eight requests, collected eight 403s and then sat on "Loading…" forever.
         *
         * There is no way for the client to work this out for itself: the answer lives in the role
         * SNIPPET, which the browser cannot evaluate (it would need the whole snippet registry).
         * So the server says it, from the same `isAdminCtx` that refuses everything else. The
         * console reads this ONCE and renders either itself or a named refusal.
         *
         * Deliberately open to every logged-in caller (NEOAI_OPEN_ACTIONS): one boolean about the
         * asker, which they would learn anyway by clicking.
         */
        access: async (ctx, next) => {
          ctx.body = { console: mayOperateNeoai(this.app.acl, ctx) };
          await next();
        },
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
            triggeredBy: String(ctx.state?.currentUser?.nickname ?? ctx.state?.currentUser?.username ?? "admin"),
            skipToNodeId: p.skipToNodeId,
            seedVars: p.seedVars
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
        rerunRun: async (ctx, next) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          ctx.body = await this.rerunRun(Number(p.runId), p.newInput ?? {}, {
            triggeredBy: String(ctx.state?.currentUser?.nickname ?? "admin")
          });
          await next();
        },
        batchRun: async (ctx, next) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          ctx.body = await this.batchRun({
            workflowId: p.workflowId,
            workflowKey: p.workflowKey,
            items: p.items ?? [],
            triggeredBy: String(ctx.state?.currentUser?.nickname ?? "admin")
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
          if (errors.length || p.dryRun === true) {
            ctx.body = { ok: errors.length === 0, errors };
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
          for (const k of ["default_llm_service", "default_model", "daily_budget_usd", "image_price_usd", "prices", "force_mock", "spend_alert_pct"]) {
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
        spendTrend: async (ctx, next) => {
          requireAdmin(ctx);
          ctx.body = await this.spendTrend();
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
        },
        // Memory HTTP surface — console panel + manual/E2E testing. Real
        // host-plugin writes call upsertMemory/confirmMemory directly (same
        // convention as runFunction above).
        memoryList: async (ctx, next) => {
          requireAdmin(ctx);
          const p = { ...ctx.action.params.values ?? {}, ...ctx.action.params ?? {} };
          const filter = {};
          if (p.entityType) filter.entity_type = String(p.entityType);
          if (p.entityId) filter.entity_id = String(p.entityId);
          const repo = this.db.getRepository("neoai_memories");
          const rows = repo ? await repo.find({ filter, sort: ["-id"], limit: 500 }) : [];
          ctx.body = { rows: rows.map((r) => r.toJSON()) };
          await next();
        },
        memoryUpsert: async (ctx, next) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          ctx.body = await this.upsertMemory({
            entityType: String(p.entityType ?? ""),
            entityId: String(p.entityId ?? ""),
            key: p.key,
            summary: String(p.summary ?? ""),
            structured: p.structured,
            sourceRunId: p.sourceRunId,
            updatedBy: String(ctx.state?.currentUser?.nickname ?? "admin")
          });
          await next();
        },
        memoryConfirm: async (ctx, next) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          ctx.body = await this.confirmMemory(Number(p.id), {
            confirmedBy: String(ctx.state?.currentUser?.nickname ?? ctx.state?.currentUser?.username ?? "admin"),
            editedSummary: p.editedSummary,
            editedStructured: p.editedStructured
          });
          await next();
        },
        // Encrypted secrets vault (item 13) — list NEVER decrypts (not even
        // the encrypted blob leaves the server; only {id, name, configured}).
        secretsList: async (ctx, next) => {
          requireAdmin(ctx);
          const repo = this.db.getRepository("neoai_secrets");
          const rows = repo ? await repo.find({ sort: ["name"], limit: 500 }) : [];
          ctx.body = {
            rows: rows.map((r) => ({
              id: r.get("id"),
              name: r.get("name"),
              configured: !!r.get("value_encrypted")
            }))
          };
          await next();
        },
        secretsSave: async (ctx, next) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const name = String(p.name ?? "").trim();
          if (!name) ctx.throw(400, "name is required");
          if (typeof p.value !== "string" || !p.value) ctx.throw(400, "value is required");
          let encrypted;
          try {
            encrypted = encryptSecret(p.value);
          } catch (err) {
            ctx.throw(500, `encryption failed: ${err?.message ?? err}`);
            return;
          }
          const repo = this.db.getRepository("neoai_secrets");
          const existing = await repo.findOne({ filter: { name } });
          if (existing) {
            await repo.update({ filterByTk: existing.get("id"), values: { value_encrypted: encrypted } });
          } else {
            await repo.create({ values: { name, value_encrypted: encrypted } });
          }
          ctx.body = { ok: true };
          await next();
        },
        secretsDelete: async (ctx, next) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const id = Number(p.id);
          if (!id) ctx.throw(400, "id is required");
          await this.db.getRepository("neoai_secrets").destroy({ filterByTk: id });
          ctx.body = { ok: true };
          await next();
        },
        // ---- Knowledge Hub -------------------------------------------------
        // knowledgeSearch: read-only keyword search over ACTIVE articles.
        // Gated the same as this plugin's other read actions (spendToday,
        // memoryList, ping, …) — admin-only, matching NeoAI's existing
        // convention (CRM's own crm:knowledgeSearch is 'loggedIn'-gated, but
        // this plugin's rule is requireAdmin everywhere; deliberately not
        // relaxed just for this action).
        knowledgeSearch: async (ctx, next) => {
          requireAdmin(ctx);
          const p = { ...ctx.action.params.values ?? {}, ...ctx.action.params ?? {} };
          const q = typeof p.q === "string" ? p.q : "";
          const useCase = typeof p.useCase === "string" && p.useCase ? p.useCase : void 0;
          const requested = Number(p.limit);
          const limit = Number.isFinite(requested) && requested > 0 ? Math.min(Math.floor(requested), 20) : 5;
          const repo = this.db.getRepository("neoai_knowledge_articles");
          const rows = repo ? await repo.find({ filter: { active: true } }) : [];
          const articles = rows.map((r) => typeof r.toJSON === "function" ? r.toJSON() : r);
          ctx.body = {
            query: q,
            useCase: useCase ?? null,
            results: search(q, articles, { useCase, limit }).map((hit) => ({
              id: hit.article.id,
              title: hit.article.title,
              use_case: hit.article.use_case,
              language: hit.article.language,
              tags: hit.article.tags,
              score: hit.score,
              snippet: hit.snippet
            }))
          };
          await next();
        },
        // knowledgeSuggest: THE ONLY path AI/workflow code (or a human) may
        // use to affect Knowledge — it only ever creates a pending suggestion
        // row, NEVER writes neoai_knowledge_articles directly. Reachable both
        // as a plain admin action and — for workflows — as a "data" node
        // pointed at neoai_knowledge_suggestions:create (allowWrite:true); no
        // dedicated node type needed since the generic data node already
        // expresses this.
        knowledgeSuggest: async (ctx, next) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const reason = String(p.reason ?? "").trim();
          if (!reason) ctx.throw(400, "reason is required");
          const repo = this.db.getRepository("neoai_knowledge_suggestions");
          if (!repo) ctx.throw(500, "neoai_knowledge_suggestions collection unavailable");
          const row = await repo.create({
            values: {
              target_article_id: p.targetArticleId ? Number(p.targetArticleId) : null,
              proposed_title: p.proposedTitle ?? "",
              proposed_body: p.proposedBody ?? "",
              proposed_tags: p.proposedTags ?? "",
              proposed_use_case: p.proposedUseCase ?? "",
              proposed_language: p.proposedLanguage || "en",
              reason,
              source_run_id: p.sourceRunId ? Number(p.sourceRunId) : null,
              status: "pending"
            }
          });
          ctx.body = { ok: true, id: row.get("id") };
          await next();
        },
        // knowledgeSuggestionApprove / Reject: human-only review gate,
        // matching confirmMemory's tone/structure — the ONLY paths that ever
        // turn a suggestion into a live article write.
        knowledgeSuggestionApprove: async (ctx, next) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const reviewedBy = String(ctx.state?.currentUser?.nickname ?? ctx.state?.currentUser?.username ?? "admin");
          ctx.body = await this.approveKnowledgeSuggestion(Number(p.id), reviewedBy);
          await next();
        },
        knowledgeSuggestionReject: async (ctx, next) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const reviewedBy = String(ctx.state?.currentUser?.nickname ?? ctx.state?.currentUser?.username ?? "admin");
          const repo = this.db.getRepository("neoai_knowledge_suggestions");
          if (!repo) ctx.throw(500, "neoai_knowledge_suggestions collection unavailable");
          const id = Number(p.id);
          const row = await repo.findOne({ filterByTk: id });
          if (!row) {
            ctx.body = { ok: false, reason: `suggestion ${id} not found` };
            return next();
          }
          const plan = planRejectSuggestion({ id, status: row.get("status") }, reviewedBy);
          if (!plan.ok) {
            ctx.body = plan;
            return next();
          }
          await repo.update({ filterByTk: id, values: plan.suggestionUpdate });
          ctx.body = { ok: true };
          await next();
        }
      }
    });
    this.registerAutomationBridge();
    const detach = (where) => {
      try {
        const removed = detachNeoaiCollectionsFromStrategy(this.app);
        if (removed) this.app.logger.info(`[neoai] ${removed} collection(s) detached from acl.strategyResources (${where})`);
      } catch (err) {
        this.app.logger.error(`[neoai] strategy detachment failed at ${where}: ${err}`);
      }
    };
    detach("load");
    this.db.on("afterDefineCollection", () => detach("afterDefineCollection"));
    this.db.on("afterUpdateCollection", () => detach("afterUpdateCollection"));
    this.app.on("afterStart", async () => {
      detach("afterStart");
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
  static {
    // ---------------------------------------------------------------------------
    // Memory — central, entity-agnostic store (loose entity_type+entity_id, no
    // FK; mirrors neoai_functions.plugin's convention). Human-in-the-loop gate:
    // confirmMemory is the ONLY path that ever sets status:'confirmed'. Once a
    // key is confirmed, upsertMemory never touches that row again — a fresh AI
    // draft stages separately as "<key>__pending" until a human reviews it
    // (owner decision: confirmed content stays frozen, never silently reverted).
    this.PENDING_SUFFIX = "__pending";
  }
  /** Idempotent upsert. Returns the row that was written (always 'draft'). */
  async upsertMemory(input) {
    const repo = this.db.getRepository("neoai_memories");
    if (!repo) return { id: 0, status: "draft" };
    const entity_type = input.entityType;
    const entity_id = input.entityId;
    const baseKey = input.key ?? "summary";
    const values = {
      summary: input.summary,
      structured: input.structured ?? null,
      source_run_id: input.sourceRunId ?? null,
      updated_by: input.updatedBy ?? "",
      updated_at: /* @__PURE__ */ new Date()
    };
    const confirmed = await repo.findOne({ filter: { entity_type, entity_id, key: baseKey, status: "confirmed" } });
    const targetKey = confirmed ? `${baseKey}${_NeoaiPlugin.PENDING_SUFFIX}` : baseKey;
    const existing = await repo.findOne({ filter: { entity_type, entity_id, key: targetKey } });
    if (existing) {
      await repo.update({ filterByTk: existing.get("id"), values: { ...values, status: "draft" } });
      return { id: Number(existing.get("id")), status: "draft" };
    }
    const created = await repo.create({ values: { entity_type, entity_id, key: targetKey, status: "draft", ...values } });
    return { id: Number(created.get("id")), status: "draft" };
  }
  /**
   * Human confirms a memory row. On a plain draft row: confirms in place. On a
   * "<key>__pending" row: copies its content onto the base-key row (creating
   * it on the entity's first-ever confirmation), then deletes the pending row
   * — so there is always at most one confirmed + one pending row per key.
   */
  async confirmMemory(id, opts) {
    const repo = this.db.getRepository("neoai_memories");
    if (!repo) return { ok: false, reason: "neoai_memories collection unavailable" };
    const row = await repo.findOne({ filterByTk: id });
    if (!row) return { ok: false, reason: `memory ${id} not found` };
    const key = String(row.get("key") ?? "");
    const summary = opts.editedSummary ?? row.get("summary");
    const structured = opts.editedStructured !== void 0 ? opts.editedStructured : row.get("structured");
    const isPending = key.endsWith(_NeoaiPlugin.PENDING_SUFFIX);
    if (!isPending) {
      await repo.update({
        filterByTk: id,
        values: { summary, structured, status: "confirmed", confirmed_at: /* @__PURE__ */ new Date(), updated_by: opts.confirmedBy, updated_at: /* @__PURE__ */ new Date() }
      });
      return { ok: true };
    }
    const baseKey = key.slice(0, -_NeoaiPlugin.PENDING_SUFFIX.length);
    const entity_type = row.get("entity_type");
    const entity_id = row.get("entity_id");
    const sourceRunId = row.get("source_run_id") ?? null;
    const baseRow = await repo.findOne({ filter: { entity_type, entity_id, key: baseKey } });
    const baseValues = {
      summary,
      structured,
      status: "confirmed",
      confirmed_at: /* @__PURE__ */ new Date(),
      updated_by: opts.confirmedBy,
      updated_at: /* @__PURE__ */ new Date(),
      source_run_id: sourceRunId
    };
    if (baseRow) {
      await repo.update({ filterByTk: baseRow.get("id"), values: baseValues });
    } else {
      await repo.create({ values: { entity_type, entity_id, key: baseKey, ...baseValues } });
    }
    await repo.destroy({ filterByTk: id });
    return { ok: true };
  }
  /** All memory rows (any status/key) for one entity — console panel use. */
  async getMemories(entityType, entityId) {
    const repo = this.db.getRepository("neoai_memories");
    if (!repo) return [];
    const rows = await repo.find({ filter: { entity_type: entityType, entity_id: entityId }, sort: ["key"] });
    return rows.map((r) => r.toJSON());
  }
  /** The one confirmed row for a key — best-effort read for host-plugin context assembly. */
  async getConfirmedMemory(entityType, entityId, key = "summary") {
    const repo = this.db.getRepository("neoai_memories");
    if (!repo) return null;
    const row = await repo.findOne({ filter: { entity_type: entityType, entity_id: entityId, key, status: "confirmed" } });
    if (!row) return null;
    return { summary: row.get("summary"), structured: row.get("structured"), confirmedAt: row.get("confirmed_at") };
  }
  // ---------------------------------------------------------------------------
  // Knowledge Hub review gate (human-only). The ONLY two paths that ever turn
  // a neoai_knowledge_suggestions row into a live neoai_knowledge_articles
  // write — mirrors confirmMemory's tone/structure, but the write-permission
  // default is the OPPOSITE of memories: articles are never AI-writable
  // directly, only via this explicit human approval.
  //
  //   * target_article_id set   → UPDATE that article with the proposed fields.
  //   * target_article_id null  → CREATE a new article, source:'ai-suggested'.
  //   * either way              → suggestion row: status 'approved' + reviewer/timestamp.
  async approveKnowledgeSuggestion(id, reviewedBy) {
    const suggestions = this.db.getRepository("neoai_knowledge_suggestions");
    const articles = this.db.getRepository("neoai_knowledge_articles");
    if (!suggestions || !articles) return { ok: false, reason: "knowledge collections unavailable" };
    const row = await suggestions.findOne({ filterByTk: id });
    if (!row) return { ok: false, reason: `suggestion ${id} not found` };
    const plan = planApproveSuggestion(
      {
        id,
        status: row.get("status"),
        target_article_id: row.get("target_article_id"),
        proposed_title: row.get("proposed_title"),
        proposed_body: row.get("proposed_body"),
        proposed_tags: row.get("proposed_tags"),
        proposed_use_case: row.get("proposed_use_case"),
        proposed_language: row.get("proposed_language")
      },
      reviewedBy
    );
    if (!plan.ok) return plan;
    let articleId;
    if (plan.articleWrite.op === "update") {
      const existing = await articles.findOne({ filterByTk: plan.articleWrite.articleId });
      if (!existing) return { ok: false, reason: `target article ${plan.articleWrite.articleId} not found` };
      await articles.update({ filterByTk: plan.articleWrite.articleId, values: plan.articleWrite.values });
      articleId = plan.articleWrite.articleId;
    } else {
      const created = await articles.create({ values: plan.articleWrite.values });
      articleId = Number(created.get("id"));
    }
    await suggestions.update({ filterByTk: id, values: plan.suggestionUpdate });
    return { ok: true, articleId };
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
  // Item 13: decrypt every configured secret ONCE per run (not per node/per
  // MCP call), into an in-memory name→value map. A secret that fails to
  // decrypt (e.g. after an APP_KEY rotation) is OMITTED with a log line —
  // never crashes the run just because one stale secret can't be read.
  async decryptAllSecrets() {
    const out = {};
    try {
      const repo = this.db.getRepository("neoai_secrets");
      if (!repo) return out;
      const rows = await repo.find({ limit: 500 });
      for (const row of rows) {
        const name = String(row.get("name") ?? "");
        const encrypted = row.get("value_encrypted");
        if (!name || !encrypted) continue;
        try {
          out[name] = decryptSecret(String(encrypted));
        } catch (err) {
          this.app.logger.warn(`[neoai] secret "${name}" failed to decrypt (omitted from run scope): ${err}`);
        }
      }
    } catch (err) {
      this.app.logger.warn(`[neoai] decryptAllSecrets failed (non-fatal, run proceeds with no secrets): ${err}`);
    }
    return out;
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
  /** Per-function spend today (item 14) — same shape as spentTodayByWorkflow. */
  async spentTodayByFunction() {
    try {
      const repo = this.db.getRepository("neoai_runs");
      const rows = await repo.find({
        filter: { started_at: { $gte: this.dayStart() }, function_key: { $ne: "" } },
        fields: ["function_key", "cost_usd"],
        limit: 2e3
      });
      const out = {};
      for (const r of rows) {
        const k = String(r.get("function_key") ?? "");
        if (!k) continue;
        out[k] = (out[k] ?? 0) + (Number(r.get("cost_usd")) || 0);
      }
      return out;
    } catch {
      return {};
    }
  }
  /** 30-day spend trend + per-workflow/per-function leaderboard (item 16). */
  async spendTrend() {
    const since = /* @__PURE__ */ new Date();
    since.setDate(since.getDate() - 30);
    since.setHours(0, 0, 0, 0);
    const repo = this.db.getRepository("neoai_runs");
    const rows = await repo.find({
      filter: { started_at: { $gte: since } },
      fields: ["workflow_id", "function_key", "cost_usd", "started_at"],
      appends: ["workflow"],
      limit: 2e4
    });
    const byDay = {};
    const byWorkflowMap = /* @__PURE__ */ new Map();
    const byFunctionMap = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const cost = Number(r.get("cost_usd")) || 0;
      const started = r.get("started_at");
      const day = started ? new Date(started).toISOString().slice(0, 10) : "unknown";
      byDay[day] = (byDay[day] ?? 0) + cost;
      const wfId = String(r.get("workflow_id") ?? "");
      if (wfId) {
        const wfName = r.get?.("workflow")?.name ?? wfId;
        const entry = byWorkflowMap.get(wfId) ?? { name: wfName, totalUsd: 0 };
        entry.totalUsd += cost;
        byWorkflowMap.set(wfId, entry);
      }
      const fnKey = String(r.get("function_key") ?? "");
      if (fnKey) byFunctionMap.set(fnKey, (byFunctionMap.get(fnKey) ?? 0) + cost);
    }
    return {
      byDay,
      byWorkflow: [...byWorkflowMap.entries()].map(([workflowId, v]) => ({ workflowId, ...v })).sort((a, b) => b.totalUsd - a.totalUsd),
      byFunction: [...byFunctionMap.entries()].map(([functionKey, totalUsd]) => ({ functionKey, totalUsd })).sort((a, b) => b.totalUsd - a.totalUsd)
    };
  }
  /** `versionOverride` re-runs a SPECIFIC historical version (item 8's re-run) instead of always the current published one. */
  async loadPublishedDefinition(workflowId, versionOverride) {
    const wf = await this.db.getRepository("neoai_workflows").findOne({ filterByTk: workflowId });
    if (!wf) return null;
    const version = versionOverride ?? Number(wf.get("current_version") ?? 0);
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
      const published = await this.loadPublishedDefinition(workflowId, opts.pinnedVersion);
      if (!published) return { error: "workflow has no published version (publish it first, or run as draft test)" };
      def = published.def;
      version = published.version;
      if (wf.get("enabled") !== true && opts.trigger !== "manual" && opts.trigger !== "test") {
        return { error: "workflow is disabled" };
      }
    }
    const errors = validateDefinition(def);
    if (errors.length) return { error: `invalid definition: ${errors.map((e) => e.message).join("; ")}` };
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
    const seed = opts.draft && opts.skipToNodeId ? { skipToNodeId: opts.skipToNodeId, vars: opts.seedVars } : void 0;
    setImmediate(() => {
      this.executeRun(runId, def, opts.input, handle, wf, opts.trigger, opts.functionKey, void 0, seed).catch((err) => {
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
      this.executeRun(runId, { nodes: [] }, input, handle, wf, String(run.get("trigger") ?? ""), String(run.get("function_key") ?? ""), { state, approval }).catch((err) => {
        this.app.logger.error(`[neoai] resume ${runId} crashed outside runner: ${err}`);
      });
    });
    return { ok: true, runId };
  }
  /**
   * Re-run a terminal run with (optionally) edited input (item 8). Reproduces
   * the SAME published version the original run used (falls back to the
   * current published version if the original was a draft test run, since
   * draft snapshots aren't retained).
   */
  async rerunRun(runId, newInput, opts = {}) {
    const repo = this.db.getRepository("neoai_runs");
    const run = await repo.findOne({ filterByTk: runId });
    if (!run) return { error: `run ${runId} not found` };
    const workflowId = Number(run.get("workflow_id"));
    const originalVersion = Number(run.get("version") ?? 0);
    return this.startRun({
      workflowId,
      input: newInput,
      draft: originalVersion === 0,
      pinnedVersion: originalVersion || void 0,
      trigger: "re-run",
      triggeredBy: opts.triggeredBy ?? `re-run:#${runId}`,
      confirmed: true
      // reviewing the input before clicking Re-run IS the confirmation
    });
  }
  /**
   * Batch/bulk dispatch (item 9): one run per item, sequential enqueue (each
   * startRun call only queues via setImmediate and returns almost instantly —
   * sequential keeps a cold budget-cache from being scanned N times at once).
   */
  async batchRun(opts) {
    const items = Array.isArray(opts.items) ? opts.items : [];
    if (!items.length) return { error: "items array required" };
    if (items.length > 200) return { error: "batch too large (max 200 \u2014 split into multiple batches)" };
    const results = [];
    for (const item of items) {
      const started = await this.startRun({
        workflowId: opts.workflowId,
        workflowKey: opts.workflowKey,
        input: item,
        trigger: "batch",
        triggeredBy: opts.triggeredBy ?? "batch",
        confirmed: true
        // batch-dispatching from the console IS the admin's consent
      });
      if ("runId" in started) results.push({ runId: started.runId });
      else results.push({ error: "error" in started ? started.error : "needs confirmation (unexpected for batch)" });
    }
    return { started: results };
  }
  async executeRun(runId, def, input, handle, wf, trigger, functionKey, resume, seed) {
    const runsRepo = this.db.getRepository("neoai_runs");
    const stepsRepo = this.db.getRepository("neoai_run_steps");
    const settings = await this.settingsRow();
    const prices = { ...DEFAULT_PRICES, ...settings?.get?.("prices") ?? {} };
    const workflowId = Number(wf.get("id"));
    const fnRow = functionKey ? await this.db.getRepository("neoai_functions")?.findOne({ filter: { key: functionKey } }) : null;
    const functionDailyBudgetUsd = Number(fnRow?.get?.("daily_budget_usd")) || 0;
    const secrets = await this.decryptAllSecrets();
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
      secrets,
      guardModelCall: async () => {
        const now = Date.now();
        if (!spendCache || now - spendCache.at > 5e3) {
          const byWf = await this.spentTodayByWorkflow();
          const global = Object.values(byWf).reduce((s, v) => s + v, 0);
          const byFn = functionKey ? await this.spentTodayByFunction() : {};
          spendCache = { at: now, global, wf: byWf[String(workflowId)] ?? 0, fn: byFn[String(functionKey)] ?? 0 };
        }
        const check = checkBudget({
          spentTodayUsd: spendCache.global + totalCost,
          workflowSpentTodayUsd: spendCache.wf + totalCost,
          globalDailyBudgetUsd: Number(settings?.get?.("daily_budget_usd")) || 0,
          workflowDailyBudgetUsd: Number(wf.get("daily_budget_usd")) || 0,
          functionSpentTodayUsd: spendCache.fn + totalCost,
          functionDailyBudgetUsd
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
      // {{secrets.name}} resolves through the existing getPath(scope, ...)
      // mechanism with zero changes to template.ts — secrets are merged into
      // the scope right here, the one place every leaf's scope passes through.
      execLeaf: (node, scope) => execLeaf(node, { ...scope, secrets }),
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
      outcome = resume ? await runner.resume(def, input, resume.state, resume.approval, { id: runId }) : await runner.run(def, input, { id: runId }, seed);
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
        if (!handle.cancelled && trigger !== "failure-hook") {
          const hookKey = String(wf.get("on_failure_workflow_key") ?? "").trim();
          if (hookKey) {
            try {
              const hookScope = { run: { id: runId, error: outcome.status === "failed" ? outcome.error : null }, input };
              const hookInput = resolveTemplates(wf.get("on_failure_input") ?? {}, hookScope);
              await this.startRun({
                workflowKey: hookKey,
                input: hookInput,
                trigger: "failure-hook",
                triggeredBy: `failure-hook:${workflowId}`,
                confirmed: true
                // configuring the hook IS the admin's consent
              });
            } catch (err) {
              this.app.logger.warn(`[neoai] on-failure hook for run ${runId} failed to start (non-fatal): ${err}`);
            }
          }
        }
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
    try {
      await this.migrateCrmKnowledge();
    } catch (err) {
      this.app.logger.warn(`[neoai] CRM knowledge migration failed (non-fatal): ${err}`);
    }
  }
  /**
   * Best-effort, idempotent, additive-only copy of CRM's legacy Knowledge
   * data (knowledge_articles / ai_prompts, SAME shared Postgres/NocoBase app)
   * into this plugin's own collections — dedup by title (articles) / use_case
   * (prompts), tagging migrated articles source:'crm-migration'. Wrapped in
   * try/catch at both the outer call site AND here: CRM may not be installed
   * at all (collections simply don't exist), which must never break NeoAI's
   * own boot. Never touches CRM's rows — this is a read-only copy out.
   */
  async migrateCrmKnowledge() {
    const articlesRepo = this.db.getRepository("neoai_knowledge_articles");
    const promptsRepo = this.db.getRepository("neoai_prompts");
    if (!articlesRepo || !promptsRepo) return;
    let crmArticles = [];
    try {
      const crmArticlesRepo = this.db.getRepository("knowledge_articles");
      if (crmArticlesRepo) crmArticles = await crmArticlesRepo.find();
    } catch {
      crmArticles = [];
    }
    for (const row of crmArticles) {
      try {
        const a = typeof row.toJSON === "function" ? row.toJSON() : row;
        const title = String(a.title ?? "").trim();
        if (!title) continue;
        const existing = await articlesRepo.findOne({ filter: { title } });
        if (existing) continue;
        await articlesRepo.create({
          values: {
            title,
            body: a.body ?? "",
            tags: a.tags ?? "",
            use_case: a.use_case ?? "",
            language: a.language || "en",
            active: a.active !== false,
            source: "crm-migration"
          }
        });
        this.app.logger.info(`[neoai] migrated CRM knowledge article "${title}"`);
      } catch (err) {
        this.app.logger.warn(`[neoai] failed to migrate one CRM knowledge article (non-fatal): ${err}`);
      }
    }
    let crmPrompts = [];
    try {
      const crmPromptsRepo = this.db.getRepository("ai_prompts");
      if (crmPromptsRepo) crmPrompts = await crmPromptsRepo.find();
    } catch {
      crmPrompts = [];
    }
    for (const row of crmPrompts) {
      try {
        const p = typeof row.toJSON === "function" ? row.toJSON() : row;
        const useCase = String(p.use_case ?? "").trim();
        if (!useCase) continue;
        const existing = await promptsRepo.findOne({ filter: { use_case: useCase } });
        if (existing) continue;
        await promptsRepo.create({
          values: {
            use_case: useCase,
            title: p.title ?? "",
            system_prompt: p.system_prompt ?? "",
            model_hint: p.model_hint ?? "",
            settings: p.settings ?? null,
            active: p.active !== false,
            notes: p.notes ?? ""
          }
        });
        this.app.logger.info(`[neoai] migrated CRM AI prompt "${useCase}"`);
      } catch (err) {
        this.app.logger.warn(`[neoai] failed to migrate one CRM AI prompt (non-fatal): ${err}`);
      }
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
