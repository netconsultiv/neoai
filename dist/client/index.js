(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // NocoBase / RequireJS path — register the module under its package name.
    define("@neomodul/neoai", ["@nocobase/client","react","react-dom","antd","@formily/react","@formily/core","react-i18next","@nocobase/plugin-workflow/client"], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS fallback (Node, tests).
    module.exports = factory(require("@nocobase/client"), require("react"), require("react-dom"), require("antd"), require("@formily/react"), require("@formily/core"), require("react-i18next"), require("@nocobase/plugin-workflow/client"));
  } else {
    // Bare browser global fallback.
    var g = typeof globalThis !== 'undefined' ? globalThis : this;
    g["@neomodul/neoai"] = factory(
      g['@nocobase/client'], g.React, g.ReactDOM, g.antd,
      g['@formily/react'], g['@formily/core'], g.reactI18next,
      g['@nocobase/plugin-workflow/client']
    );
  }
})(function (nocobaseClient, React, ReactDOM, antd, formilyReact, formilyCore, reactI18next, pluginWorkflowClient) {
  var module = { exports: {} };
  var exports = module.exports;
  // Map the bundled code's require("...") calls onto the injected singletons.
  function require(id) {
    switch (id) {
      case "@nocobase/client": return nocobaseClient;
      case "react": return React;
      case "react-dom": return ReactDOM;
      case "antd": return antd;
      case "@formily/react": return formilyReact;
      case "@formily/core": return formilyCore;
      case "react-i18next": return reactI18next;
      case "@nocobase/plugin-workflow/client": return pluginWorkflowClient;
      default:
        throw new Error("[@neomodul/neoai] unexpected require(\"" + id + '")');
    }
  }
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/client/index.tsx
var client_exports = {};
__export(client_exports, {
  NeoaiClientPlugin: () => NeoaiClientPlugin,
  default: () => client_default
});
module.exports = __toCommonJS(client_exports);
var import_client10 = require("@nocobase/client");
var import_client11 = require("@nocobase/plugin-workflow/client");

// src/client/console/NeoaiConsole.tsx
var import_react10 = __toESM(require("react"));
var import_antd10 = require("antd");
var import_client8 = require("@nocobase/client");

// src/client/theme.ts
var NEOHOME_GREEN = "#009900";
var NEOHOME_GREEN_DARK = "#007a00";
var NEOHOME_INK = "#1b1e21";
var NEOHOME_FONT = "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif";
var NEOHOME_THEME = {
  token: {
    colorPrimary: NEOHOME_GREEN,
    colorInfo: NEOHOME_GREEN,
    colorLink: NEOHOME_GREEN,
    colorLinkHover: NEOHOME_GREEN_DARK,
    colorTextHeading: NEOHOME_INK,
    borderRadius: 10,
    borderRadiusLG: 14,
    colorBorder: "#e7e7e3",
    colorBorderSecondary: "#f1f1ef",
    fontFamily: NEOHOME_FONT,
    fontSize: 14,
    wireframe: false
  },
  components: {
    Button: { controlHeight: 36, borderRadius: 20, fontWeight: 600 },
    Collapse: { headerPadding: "14px 16px", contentPadding: "6px 16px 14px" },
    Card: { borderRadiusLG: 14, paddingLG: 18 },
    Tag: { borderRadiusSM: 6, defaultColor: NEOHOME_INK },
    Steps: { fontSizeLG: 15 },
    Input: { borderRadius: 10 },
    Select: { borderRadius: 10 },
    Modal: { borderRadiusLG: 14, titleFontSize: 17, titleColor: NEOHOME_INK },
    Tooltip: { borderRadius: 8, colorBgSpotlight: NEOHOME_INK },
    Popover: { borderRadiusLG: 12 },
    Table: { borderRadius: 10, headerBg: "#f7faf7", headerColor: NEOHOME_INK, rowHoverBg: "#f3fbf3" },
    Menu: { itemBorderRadius: 9, itemSelectedBg: "#eaf7ea", itemSelectedColor: NEOHOME_GREEN, itemActiveBg: "#f3fbf3" }
  }
};
var INTER_FONT_LINK = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";
function ensureInterFont() {
  const id = "neoai-inter-font";
  if (typeof document === "undefined" || document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = INTER_FONT_LINK;
  document.head.appendChild(link);
}

// src/client/logo.ts
var NEOMODUL_FAVICON_SRC = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiByeD0iMzAiIGZpbGw9IiMwMDk5MDAiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik01OCAyN0gxOThDMjE1LjEyMSAyNyAyMjkgNDAuODc5MiAyMjkgNThWMTk4QzIyOSAyMTUuMTIxIDIxNS4xMjEgMjI5IDE5OCAyMjlIMTYzTDkzIDIxOFYyMjlINThDNDAuODc5MiAyMjkgMjcgMjE1LjEyMSAyNyAxOThWNThDMjcgNDAuODc5MiA0MC44NzkyIDI3IDU4IDI3Wk01OCAzOEM0Ni45NTQzIDM4IDM4IDQ2Ljk1NDMgMzggNThWMTk4QzM4IDIwOS4wNDYgNDYuOTU0MyAyMTggNTggMjE4SDkzTDE2MyAyMjlWMjE4SDE5OEMyMDkuMDQ2IDIxOCAyMTggMjA5LjA0NiAyMTggMTk4VjU4QzIxOCA0Ni45NTQzIDIwOS4wNDYgMzggMTk4IDM4SDU4WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTEyNy44ODUgNjhDMTM2LjE3NyA2OCAxNDMuOTMxIDY5LjY0MzggMTUxLjE0OCA3Mi45MzE1QzE1OC41MTggNzYuMDYyNiAxNjQuODkxIDgwLjM2NzkgMTcwLjI2NSA4NS44NDc0QzE3NS43OTMgOTEuMzI2OCAxODAuMDkyIDk3LjgyMzkgMTgzLjE2MyAxMDUuMzM5QzE4Ni4zODggMTEyLjg1MyAxODggMTIwLjgzOCAxODggMTI5LjI5MlYxODhIMTY4LjE5MlYxMjkuMjkyQzE2OC4xOTIgMTIzLjY1NiAxNjcuMTE3IDExOC4zMzMgMTY0Ljk2NyAxMTMuMzIzQzE2Mi45NzEgMTA4LjMxMyAxNjAuMTMxIDEwMy45MyAxNTYuNDQ1IDEwMC4xNzJDMTUyLjkxNCA5Ni40MTQ5IDE0OC42OTEgOTMuNTE4NiAxNDMuNzc3IDkxLjQ4MzRDMTM4Ljg2NCA4OS4yOTE2IDEzMy41NjYgODguMTk1NyAxMjcuODg1IDg4LjE5NTdDMTIyLjM1NyA4OC4xOTU3IDExNy4xMzYgODkuMjkxNiAxMTIuMjIzIDkxLjQ4MzRDMTA3LjMwOSA5My41MTg2IDEwMy4wMSA5Ni40MTQ5IDk5LjMyNDQgMTAwLjE3MkM5NS43OTI3IDEwMy45MyA5Mi45NTIgMTA4LjMxMyA5MC44MDIzIDExMy4zMjNDODguNjUyNiAxMTguMzMzIDg3LjU3NzcgMTIzLjY1NiA4Ny41Nzc3IDEyOS4yOTJWMTg4SDY4VjEyOS4yOTJDNjggMTIwLjgzOCA2OS41MzU1IDExMi44NTMgNzIuNjA2NSAxMDUuMzM5Qzc1LjgzMTEgOTcuODIzOSA4MC4xMzA1IDkxLjMyNjggODUuNTA0OCA4NS44NDc0QzkxLjAzMjYgODAuMzY3OSA5Ny40MDUgNzYuMDYyNiAxMDQuNjIyIDcyLjkzMTVDMTExLjgzOSA2OS42NDM4IDExOS41OTMgNjggMTI3Ljg4NSA2OFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik05MyAxOTFIMTYzVjI0NUg5M1YxOTFaIiBmaWxsPSIjMDA5OTAwIi8+Cjwvc3ZnPgo=";

// src/client/console/shared.tsx
var import_react = __toESM(require("react"));
var import_antd = require("antd");
var PAGE_BG = "#f5f5f5";
async function neoaiAction(api, action, values = {}) {
  var _a, _b, _c;
  const res = await api.request({ url: `neoai:${action}`, method: "post", data: values });
  return (_c = (_b = (_a = res == null ? void 0 : res.data) == null ? void 0 : _a.data) != null ? _b : res == null ? void 0 : res.data) != null ? _c : {};
}
async function listResource(api, collection, params = {}) {
  var _a, _b, _c, _d;
  const res = await api.request({ url: `${collection}:list`, method: "get", params });
  return { rows: (_b = (_a = res == null ? void 0 : res.data) == null ? void 0 : _a.data) != null ? _b : [], meta: (_d = (_c = res == null ? void 0 : res.data) == null ? void 0 : _c.meta) != null ? _d : {} };
}
async function updateResource(api, collection, filterByTk, values) {
  var _a, _b;
  const res = await api.request({ url: `${collection}:update`, method: "post", params: { filterByTk }, data: values });
  return (_b = (_a = res == null ? void 0 : res.data) == null ? void 0 : _a.data) != null ? _b : {};
}
async function createResource(api, collection, values) {
  var _a, _b;
  const res = await api.request({ url: `${collection}:create`, method: "post", data: values });
  return (_b = (_a = res == null ? void 0 : res.data) == null ? void 0 : _a.data) != null ? _b : {};
}
function usePoll(fn, ms, active) {
  const fnRef = (0, import_react.useRef)(fn);
  fnRef.current = fn;
  (0, import_react.useEffect)(() => {
    if (!active) return;
    let stop = false;
    const tick = () => {
      if (!stop) void fnRef.current();
    };
    tick();
    const t = setInterval(tick, ms);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [ms, active]);
}
var RUN_COLORS = {
  queued: "default",
  running: "processing",
  waiting: "gold",
  succeeded: "green",
  failed: "red",
  cancelled: "default",
  rejected: "volcano",
  done: "green",
  skipped: "default"
};
function StatusTag({ status }) {
  var _a;
  const s = String(status != null ? status : "");
  return /* @__PURE__ */ import_react.default.createElement(import_antd.Tag, { color: (_a = RUN_COLORS[s]) != null ? _a : "default" }, s || "\u2014");
}
function fmtCost(usd) {
  const n = Number(usd) || 0;
  if (!n) return "\u2014";
  return `$${n < 0.01 ? n.toFixed(4) : n.toFixed(2)}`;
}
function fmtTokens(inTok, outTok) {
  const i = Number(inTok) || 0;
  const o = Number(outTok) || 0;
  if (!i && !o) return "\u2014";
  return `${i.toLocaleString("en-US")} \u2192 ${o.toLocaleString("en-US")}`;
}
function fmtDuration(ms) {
  const n = Number(ms) || 0;
  if (!n) return "\u2014";
  if (n < 1e3) return `${n} ms`;
  if (n < 6e4) return `${(n / 1e3).toFixed(1)} s`;
  return `${Math.floor(n / 6e4)}m ${Math.round(n % 6e4 / 1e3)}s`;
}
function fmtTime(v) {
  if (!v) return "\u2014";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function runDuration(run) {
  const s = (run == null ? void 0 : run.started_at) ? new Date(run.started_at).getTime() : 0;
  const e = (run == null ? void 0 : run.finished_at) ? new Date(run.finished_at).getTime() : Date.now();
  return s ? fmtDuration(e - s) : "\u2014";
}
function JsonBox({ value, maxHeight = 240 }) {
  let text;
  try {
    text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  } catch (e) {
    text = String(value);
  }
  return /* @__PURE__ */ import_react.default.createElement(
    "pre",
    {
      style: {
        margin: 0,
        padding: "8px 10px",
        background: "#fafaf8",
        border: "1px solid #ececea",
        borderRadius: 8,
        fontSize: 12,
        lineHeight: 1.5,
        maxHeight,
        overflow: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word"
      }
    },
    text != null ? text : "\u2014"
  );
}
function ConsoleDrawer(props) {
  const { open, title, extra, onClose, children, footer } = props;
  const onCloseRef = (0, import_react.useRef)(onClose);
  onCloseRef.current = onClose;
  (0, import_react.useEffect)(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);
  if (!open) return null;
  return /* @__PURE__ */ import_react.default.createElement("div", { style: { position: "fixed", inset: 0, zIndex: 1e3, background: "#fff", display: "flex", flexDirection: "column" } }, /* @__PURE__ */ import_react.default.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 20px",
        borderBottom: "1px solid #ececea",
        background: "#fff"
      }
    },
    /* @__PURE__ */ import_react.default.createElement("a", { onClick: onClose, style: { fontWeight: 600, whiteSpace: "nowrap" } }, "\u2190 Back"),
    /* @__PURE__ */ import_react.default.createElement("div", { style: { fontSize: 16, fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" } }, title),
    /* @__PURE__ */ import_react.default.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, extra)
  ), /* @__PURE__ */ import_react.default.createElement("div", { style: { flex: 1, overflow: "auto", background: PAGE_BG } }, children), footer ? /* @__PURE__ */ import_react.default.createElement("div", { style: { borderTop: "1px solid #ececea", padding: "10px 20px", background: "#fff" } }, footer) : null);
}

// src/client/console/WorkflowsPanel.tsx
var import_react3 = __toESM(require("react"));
var import_antd3 = require("antd");
var import_client = require("@nocobase/client");

// src/client/console/VersionDiffDrawer.tsx
var import_react2 = __toESM(require("react"));
var import_antd2 = require("antd");
var TYPE_LABELS = {
  llm: "LLM",
  image: "Image",
  http: "HTTP",
  data: "Data",
  transform: "Transform",
  condition: "Condition",
  parallel: "Parallel",
  loop: "Loop",
  human_gate: "Approval",
  subworkflow: "Sub-workflow",
  output: "Output"
};
function flatten(nodes, out) {
  var _a;
  for (const n of nodes != null ? nodes : []) {
    out.set(n.id, n);
    for (const b of (_a = n.branches) != null ? _a : []) flatten(b, out);
  }
}
function diffWorkflowDef(a, b) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const aMap = /* @__PURE__ */ new Map();
  const bMap = /* @__PURE__ */ new Map();
  flatten(a == null ? void 0 : a.nodes, aMap);
  flatten(b == null ? void 0 : b.nodes, bMap);
  const entries = [];
  const seen = /* @__PURE__ */ new Set();
  for (const [id, bNode] of bMap) {
    seen.add(id);
    const aNode = aMap.get(id);
    if (!aNode) {
      entries.push({ nodeId: id, kind: "added", type: bNode.type, title: bNode.title });
      continue;
    }
    const diffs = [];
    if (aNode.type !== bNode.type) diffs.push(`type: ${aNode.type} \u2192 ${bNode.type}`);
    if (((_a = aNode.title) != null ? _a : "") !== ((_b = bNode.title) != null ? _b : "")) diffs.push(`title: "${(_c = aNode.title) != null ? _c : ""}" \u2192 "${(_d = bNode.title) != null ? _d : ""}"`);
    if (JSON.stringify((_e = aNode.config) != null ? _e : {}) !== JSON.stringify((_f = bNode.config) != null ? _f : {})) diffs.push("config changed");
    const aBranchCount = (_h = (_g = aNode.branches) == null ? void 0 : _g.length) != null ? _h : 0;
    const bBranchCount = (_j = (_i = bNode.branches) == null ? void 0 : _i.length) != null ? _j : 0;
    if (aBranchCount !== bBranchCount) diffs.push(`branches: ${aBranchCount} \u2192 ${bBranchCount}`);
    if (diffs.length) entries.push({ nodeId: id, kind: "changed", type: bNode.type, title: bNode.title, detail: diffs.join(" \xB7 ") });
  }
  for (const [id, aNode] of aMap) {
    if (seen.has(id)) continue;
    entries.push({ nodeId: id, kind: "removed", type: aNode.type, title: aNode.title });
  }
  return entries;
}
var KIND_COLOR = { added: "green", removed: "red", changed: "orange" };
var KIND_LABEL = { added: "ADDED", removed: "REMOVED", changed: "CHANGED" };
function VersionDiffDrawer(props) {
  const [leftKey, setLeftKey] = (0, import_react2.useState)(props.initialLeftKey);
  const [rightKey, setRightKey] = (0, import_react2.useState)(props.initialRightKey);
  const left = props.options.find((o) => o.key === leftKey);
  const right = props.options.find((o) => o.key === rightKey);
  const entries = (0, import_react2.useMemo)(() => diffWorkflowDef(left == null ? void 0 : left.definition, right == null ? void 0 : right.definition), [left, right]);
  const selectOpts = props.options.map((o) => ({ value: o.key, label: o.label }));
  return /* @__PURE__ */ import_react2.default.createElement(ConsoleDrawer, { open: true, title: "Version diff", onClose: props.onClose }, /* @__PURE__ */ import_react2.default.createElement("div", { style: { padding: 18, maxWidth: 900 } }, /* @__PURE__ */ import_react2.default.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", marginBottom: 16 } }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Select, { value: leftKey, onChange: setLeftKey, options: selectOpts, style: { width: 220 } }), /* @__PURE__ */ import_react2.default.createElement("span", { style: { color: "#8a8f8a" } }, "vs."), /* @__PURE__ */ import_react2.default.createElement(import_antd2.Select, { value: rightKey, onChange: setRightKey, options: selectOpts, style: { width: 220 } })), entries.length === 0 ? /* @__PURE__ */ import_react2.default.createElement("div", { style: { color: "#8a8f8a", fontSize: 13 } }, "No structural differences between these two.") : /* @__PURE__ */ import_react2.default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, entries.map((e) => {
    var _a;
    return /* @__PURE__ */ import_react2.default.createElement(
      "div",
      {
        key: e.nodeId,
        style: {
          borderLeft: `3px solid ${e.kind === "added" ? "#389e0d" : e.kind === "removed" ? "#cf1322" : "#d46b08"}`,
          padding: "6px 10px",
          background: "#fafaf8",
          borderRadius: 4,
          fontSize: 13
        }
      },
      /* @__PURE__ */ import_react2.default.createElement(import_antd2.Tag, { color: KIND_COLOR[e.kind], style: { marginRight: 8 } }, KIND_LABEL[e.kind]),
      /* @__PURE__ */ import_react2.default.createElement("b", null, e.title || e.nodeId),
      e.type ? /* @__PURE__ */ import_react2.default.createElement("span", { style: { color: "#8a8f8a" } }, " (", (_a = TYPE_LABELS[e.type]) != null ? _a : e.type, ")") : null,
      e.detail ? /* @__PURE__ */ import_react2.default.createElement("div", { style: { color: "#5c605c", marginTop: 2 } }, e.detail) : null
    );
  }))));
}

// src/client/console/WorkflowsPanel.tsx
var NODE_TYPES = [
  { type: "llm", label: "LLM", hint: "Gemini text call (prompt + optional JSON schema)" },
  { type: "image", label: "Image", hint: "Gemini image generation (raw REST path)" },
  { type: "http", label: "HTTP", hint: "Call an external API" },
  { type: "data", label: "Data", hint: "Read/write a NocoBase collection" },
  { type: "transform", label: "Transform", hint: "Map values between nodes" },
  { type: "mcp_tool", label: "MCP Tool", hint: "Call a tool on a registered MCP server" },
  { type: "agent", label: "Agent", hint: "Autonomous bounded tool-use loop (LLM decides each turn)" },
  { type: "condition", label: "Condition", hint: "True/false branches" },
  { type: "parallel", label: "Parallel", hint: "Run branches concurrently" },
  { type: "loop", label: "Loop", hint: "Iterate over an array" },
  { type: "human_gate", label: "Approval", hint: "Pause until an admin approves" },
  { type: "subworkflow", label: "Sub-workflow", hint: "Run another published workflow" },
  { type: "output", label: "Output", hint: "Set the run result" }
];
var TYPE_COLORS = {
  llm: "green",
  image: "cyan",
  http: "blue",
  data: "geekblue",
  transform: "default",
  mcp_tool: "volcano",
  agent: "red",
  condition: "orange",
  parallel: "purple",
  loop: "magenta",
  human_gate: "gold",
  subworkflow: "lime",
  output: "default"
};
function defaultConfig(type) {
  switch (type) {
    case "llm":
      return { prompt: "", temperature: 0.2 };
    case "image":
      return { prompt: "" };
    case "http":
      return { method: "GET", url: "https://", responseType: "json" };
    case "data":
      return { collection: "", op: "list", filter: {}, limit: 20 };
    case "transform":
      return { map: {} };
    case "mcp_tool":
      return { serverId: void 0, toolName: "", args: {} };
    case "agent":
      return { systemPrompt: "", goal: "", tools: [], maxTurns: 10 };
    case "condition":
      return { left: "", op: "notEmpty", right: "" };
    case "loop":
      return { items: "" };
    case "human_gate":
      return { message: "Approval required" };
    case "subworkflow":
      return { workflowKey: "", input: {} };
    case "output":
      return { map: {} };
    default:
      return {};
  }
}
function collectIds(nodes, out) {
  var _a;
  for (const n of nodes != null ? nodes : []) {
    out.add(n.id);
    for (const b of (_a = n.branches) != null ? _a : []) collectIds(b != null ? b : [], out);
  }
}
function makeNode(type, def) {
  var _a;
  const ids = /* @__PURE__ */ new Set();
  collectIds((_a = def.nodes) != null ? _a : [], ids);
  let i = 1;
  while (ids.has(`${type}_${i}`)) i += 1;
  const node = { id: `${type}_${i}`, type, title: "", config: defaultConfig(type) };
  if (type === "condition") node.branches = [[], []];
  if (type === "parallel") node.branches = [[], []];
  if (type === "loop") node.branches = [[]];
  return node;
}
function findList(nodes, id) {
  var _a;
  for (let i = 0; i < (nodes != null ? nodes : []).length; i++) {
    if (nodes[i].id === id) return { list: nodes, index: i };
    for (const b of (_a = nodes[i].branches) != null ? _a : []) {
      const hit = findList(b != null ? b : [], id);
      if (hit) return hit;
    }
  }
  return null;
}
function findNode(nodes, id) {
  const hit = findList(nodes, id);
  return hit ? hit.list[hit.index] : null;
}
function JsonArea(props) {
  var _a, _b;
  const [text, setText] = (0, import_react3.useState)(() => props.value == null ? "" : JSON.stringify(props.value, null, 2));
  const [bad, setBad] = (0, import_react3.useState)(false);
  const lastValue = (0, import_react3.useRef)(props.value);
  if (lastValue.current !== props.value) {
    lastValue.current = props.value;
    const s = props.value == null ? "" : JSON.stringify(props.value, null, 2);
    if (s !== text) {
      setText(s);
      setBad(false);
    }
  }
  return /* @__PURE__ */ import_react3.default.createElement(
    import_antd3.Input.TextArea,
    {
      value: text,
      rows: (_a = props.rows) != null ? _a : 4,
      placeholder: (_b = props.placeholder) != null ? _b : "{ }",
      status: bad ? "error" : void 0,
      onChange: (e) => setText(e.target.value),
      onBlur: () => {
        const t = text.trim();
        if (!t) {
          setBad(false);
          props.onChange(void 0);
          return;
        }
        try {
          props.onChange(JSON.parse(t));
          setBad(false);
        } catch (e) {
          setBad(true);
        }
      },
      style: { fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12 }
    }
  );
}
function Field({ label, children }) {
  return /* @__PURE__ */ import_react3.default.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "#8a8f8a", marginBottom: 4 } }, label), children);
}
function AddSlot({ onAdd }) {
  return /* @__PURE__ */ import_react3.default.createElement(
    import_antd3.Dropdown,
    {
      menu: {
        items: NODE_TYPES.map((t) => ({ key: t.type, label: `${t.label} \u2014 ${t.hint}` })),
        onClick: ({ key }) => onAdd(String(key))
      },
      trigger: ["click"]
    },
    /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", justifyContent: "center", padding: "2px 0", cursor: "pointer" }, title: "Add node" }, /* @__PURE__ */ import_react3.default.createElement(
      "span",
      {
        style: {
          fontSize: 12,
          lineHeight: "18px",
          width: 22,
          height: 22,
          textAlign: "center",
          borderRadius: 11,
          border: "1px dashed #bfc4bf",
          color: "#8a8f8a",
          background: "#fff"
        }
      },
      "+"
    ))
  );
}
function NodeCard(props) {
  var _a, _b, _c;
  const { node, selected, runStep, errorMessages, cached, onToggleSkip } = props;
  const label = (_b = (_a = NODE_TYPES.find((t) => t.type === node.type)) == null ? void 0 : _a.label) != null ? _b : node.type;
  const hasErrors = !!(errorMessages == null ? void 0 : errorMessages.length);
  return /* @__PURE__ */ import_react3.default.createElement(
    "div",
    {
      onClick: (e) => {
        e.stopPropagation();
        props.onSelect();
      },
      style: {
        border: `1.5px solid ${hasErrors ? "#d4380d" : selected ? NEOHOME_GREEN : "#e2e4e1"}`,
        borderRadius: 10,
        background: "#fff",
        padding: "8px 10px",
        cursor: "pointer",
        boxShadow: selected ? "0 1px 6px rgba(0,153,0,.15)" : "none"
      }
    },
    /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Tag, { color: (_c = TYPE_COLORS[node.type]) != null ? _c : "default", style: { marginRight: 0 } }, label), /* @__PURE__ */ import_react3.default.createElement(
      "span",
      {
        title: node.title || node.id,
        style: { fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
      },
      node.title || node.id
    ), hasErrors ? /* @__PURE__ */ import_react3.default.createElement("span", { title: errorMessages.join(" \xB7 "), style: { display: "inline-flex" } }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Tag, { color: "error", style: { marginRight: 0, fontSize: 11 } }, "!")) : null, runStep ? /* @__PURE__ */ import_react3.default.createElement(StatusTag, { status: runStep.status }) : null, cached && onToggleSkip ? /* @__PURE__ */ import_react3.default.createElement(
      import_antd3.Checkbox,
      {
        checked: props.skip === true,
        onClick: (e) => e.stopPropagation(),
        onChange: onToggleSkip,
        title: "Skip this node on the next draft test run \u2014 reuse its last cached output"
      },
      /* @__PURE__ */ import_react3.default.createElement("span", { style: { fontSize: 11.5, color: "#8a8f8a" } }, "skip (cached)")
    ) : null, /* @__PURE__ */ import_react3.default.createElement("span", { style: { display: "flex", gap: 4 }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { size: "small", type: "text", onClick: () => props.onMove(-1), title: "Move up" }, "\u2191"), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { size: "small", type: "text", onClick: () => props.onMove(1), title: "Move down" }, "\u2193"), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { size: "small", type: "text", danger: true, onClick: props.onDelete, title: "Delete" }, "\u2715"))),
    props.children
  );
}
function NodeList(props) {
  const { nodes, def, stepsByNodeId, errorsByNodeId, isTopLevel, cachedOutputs, skipSet, onToggleSkip } = props;
  const insert = (index, type) => {
    nodes.splice(index, 0, makeNode(type, def));
    props.onChange();
  };
  const del = (index) => {
    nodes.splice(index, 1);
    props.onChange();
  };
  const move = (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= nodes.length) return;
    const [n] = nodes.splice(index, 1);
    nodes.splice(j, 0, n);
    props.onChange();
  };
  const branchLabel = (node, i) => {
    if (node.type === "condition") return i === 0 ? "TRUE" : "FALSE";
    if (node.type === "loop") return "BODY (per item)";
    return `BRANCH ${i + 1}`;
  };
  return /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2 } }, nodes.length === 0 && props.emptyHint ? /* @__PURE__ */ import_react3.default.createElement(
    "div",
    {
      style: {
        textAlign: "center",
        padding: "6px 0 14px",
        fontSize: 13,
        color: "#8a8f8a"
      }
    },
    props.emptyHint
  ) : null, nodes.map((node, i) => /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, { key: node.id }, /* @__PURE__ */ import_react3.default.createElement(AddSlot, { onAdd: (t) => insert(i, t) }), /* @__PURE__ */ import_react3.default.createElement(
    NodeCard,
    {
      node,
      selected: props.selectedId === node.id,
      onSelect: () => props.onSelect(node.id),
      onDelete: () => del(i),
      onMove: (dir) => move(i, dir),
      runStep: stepsByNodeId == null ? void 0 : stepsByNodeId.get(node.id),
      errorMessages: errorsByNodeId == null ? void 0 : errorsByNodeId.get(node.id),
      cached: isTopLevel === true && (cachedOutputs == null ? void 0 : cachedOutputs[node.id]) !== void 0,
      skip: (skipSet == null ? void 0 : skipSet.has(node.id)) === true,
      onToggleSkip: isTopLevel === true && (cachedOutputs == null ? void 0 : cachedOutputs[node.id]) !== void 0 ? () => onToggleSkip == null ? void 0 : onToggleSkip(node.id) : void 0
    },
    node.branches && node.branches.length > 0 ? /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", gap: 8, marginTop: 8, alignItems: "stretch", overflowX: "auto" } }, node.branches.map((branch, bi) => /* @__PURE__ */ import_react3.default.createElement(
      "div",
      {
        key: bi,
        style: {
          flex: "1 0 260px",
          minWidth: 260,
          border: "1px dashed #d8dbd7",
          borderRadius: 8,
          padding: "6px 6px 4px",
          background: "#fafbf9"
        }
      },
      /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", alignItems: "center", marginBottom: 4 } }, /* @__PURE__ */ import_react3.default.createElement("span", { style: { fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#8a8f8a", flex: 1 } }, branchLabel(node, bi)), node.type === "parallel" && node.branches.length > 1 ? /* @__PURE__ */ import_react3.default.createElement(
        import_antd3.Button,
        {
          size: "small",
          type: "text",
          danger: true,
          style: { fontSize: 11 },
          onClick: (e) => {
            e.stopPropagation();
            node.branches.splice(bi, 1);
            props.onChange();
          }
        },
        "remove"
      ) : null),
      /* @__PURE__ */ import_react3.default.createElement(
        NodeList,
        {
          nodes: branch,
          selectedId: props.selectedId,
          onSelect: props.onSelect,
          onChange: props.onChange,
          def,
          stepsByNodeId,
          errorsByNodeId
        }
      )
    )), node.type === "parallel" ? /* @__PURE__ */ import_react3.default.createElement(
      import_antd3.Button,
      {
        size: "small",
        style: { alignSelf: "flex-start" },
        onClick: (e) => {
          e.stopPropagation();
          node.branches.push([]);
          props.onChange();
        }
      },
      "+ branch"
    ) : null) : null
  ))), /* @__PURE__ */ import_react3.default.createElement(AddSlot, { onAdd: (t) => insert(nodes.length, t) }));
}
function NodeConfigForm({ node, onChange }) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const api = (0, import_client.useAPIClient)();
  const cfg = (_a = node.config) != null ? _a : node.config = {};
  const set = (k, v) => {
    cfg[k] = v;
    onChange();
  };
  const [mcpServers, setMcpServers] = (0, import_react3.useState)([]);
  (0, import_react3.useEffect)(() => {
    if (node.type !== "mcp_tool" && node.type !== "agent") return;
    let cancelled = false;
    listResource(api, "neoai_mcp_servers", { sort: "name", pageSize: 100 }).then((res) => {
      var _a2;
      if (!cancelled) setMcpServers((_a2 = res.rows) != null ? _a2 : []);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [node.type]);
  const [publishedWorkflows, setPublishedWorkflows] = (0, import_react3.useState)([]);
  (0, import_react3.useEffect)(() => {
    if (node.type !== "agent") return;
    let cancelled = false;
    listResource(api, "neoai_workflows", { sort: "name", pageSize: 200, filter: { enabled: true } }).then((res) => {
      var _a2;
      if (!cancelled) setPublishedWorkflows((_a2 = res.rows) != null ? _a2 : []);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [node.type]);
  const [collections, setCollections] = (0, import_react3.useState)([]);
  (0, import_react3.useEffect)(() => {
    if (node.type !== "data") return;
    let cancelled = false;
    listResource(api, "collections", { pageSize: 500 }).then((res) => {
      var _a2;
      if (!cancelled) setCollections(((_a2 = res.rows) != null ? _a2 : []).filter((c) => {
        var _a3;
        return !String((_a3 = c.name) != null ? _a3 : "").startsWith("neoai_");
      }));
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [node.type]);
  const common = /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Title" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { value: node.title, placeholder: node.id, onChange: (e) => (node.title = e.target.value, onChange()) }));
  const retries = /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Retries on failure" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.InputNumber, { min: 0, max: 5, value: (_b = cfg.retries) != null ? _b : 0, onChange: (v) => set("retries", v != null ? v : 0) }));
  let body = null;
  switch (node.type) {
    case "llm":
      body = /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Model (empty = default)" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { value: cfg.model, placeholder: "gemini-2.5-flash", onChange: (e) => set("model", e.target.value || void 0) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "plugin-ai service (empty = default)" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { value: cfg.service, onChange: (e) => set("service", e.target.value || void 0) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "System prompt" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input.TextArea, { rows: 3, value: cfg.system, onChange: (e) => set("system", e.target.value || void 0) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Prompt (templates: {{input.x}}, {{nodes.<id>.y}})" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input.TextArea, { rows: 6, value: cfg.prompt, onChange: (e) => set("prompt", e.target.value) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "JSON schema (optional \u2014 forces JSON output)" }, /* @__PURE__ */ import_react3.default.createElement(JsonArea, { value: cfg.jsonSchema, onChange: (v) => set("jsonSchema", v), rows: 5 })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Temperature" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.InputNumber, { min: 0, max: 2, step: 0.1, value: (_c = cfg.temperature) != null ? _c : 0.2, onChange: (v) => set("temperature", v != null ? v : 0.2) })), retries);
      break;
    case "image":
      body = /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Model" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { value: cfg.model, placeholder: "gemini-2.5-flash-image", onChange: (e) => set("model", e.target.value || void 0) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Prompt" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input.TextArea, { rows: 5, value: cfg.prompt, onChange: (e) => set("prompt", e.target.value) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Input image (template \u2192 data URL, optional)" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { value: cfg.image, placeholder: "{{input.image}}", onChange: (e) => set("image", e.target.value || void 0) })), retries);
      break;
    case "http":
      body = /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Method" }, /* @__PURE__ */ import_react3.default.createElement(
        import_antd3.Select,
        {
          value: (_d = cfg.method) != null ? _d : "GET",
          onChange: (v) => set("method", v),
          options: ["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => ({ value: m, label: m })),
          style: { width: 120 }
        }
      )), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "URL (templated)" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { value: cfg.url, onChange: (e) => set("url", e.target.value) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Headers (JSON)" }, /* @__PURE__ */ import_react3.default.createElement(JsonArea, { value: cfg.headers, onChange: (v) => set("headers", v), rows: 3 })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Body (string or JSON; templated)" }, /* @__PURE__ */ import_react3.default.createElement(
        import_antd3.Input.TextArea,
        {
          rows: 4,
          value: typeof cfg.body === "string" ? cfg.body : cfg.body ? JSON.stringify(cfg.body, null, 2) : "",
          onChange: (e) => set("body", e.target.value || void 0)
        }
      )), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Response type" }, /* @__PURE__ */ import_react3.default.createElement(
        import_antd3.Select,
        {
          value: (_e = cfg.responseType) != null ? _e : "json",
          onChange: (v) => set("responseType", v),
          options: [
            { value: "json", label: "JSON" },
            { value: "text", label: "Text" }
          ],
          style: { width: 120 }
        }
      )), retries);
      break;
    case "data": {
      const selectedCollection = collections.find((c) => c.name === cfg.collection);
      const fieldNames = ((_f = selectedCollection == null ? void 0 : selectedCollection.fields) != null ? _f : []).map((f) => f == null ? void 0 : f.name).filter((n) => typeof n === "string" && n && n !== "id");
      const insertField = (fieldName) => {
        const current = cfg.filter && typeof cfg.filter === "object" ? cfg.filter : {};
        set("filter", { ...current, [fieldName]: "" });
      };
      body = /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Collection" }, /* @__PURE__ */ import_react3.default.createElement(
        import_antd3.Select,
        {
          showSearch: true,
          value: cfg.collection || void 0,
          placeholder: "Select a collection\u2026",
          options: collections.map((c) => ({ value: c.name, label: c.title ? `${c.title} (${c.name})` : c.name })),
          filterOption: (input, option) => {
            var _a2;
            return String((_a2 = option == null ? void 0 : option.label) != null ? _a2 : "").toLowerCase().includes(input.toLowerCase());
          },
          onChange: (v) => set("collection", v),
          style: { width: "100%" },
          notFoundContent: "No collections found"
        }
      )), cfg.collection && fieldNames.length ? /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Available fields (click to insert into Filter)" }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } }, fieldNames.map((f) => /* @__PURE__ */ import_react3.default.createElement(import_antd3.Tag, { key: f, style: { cursor: "pointer" }, onClick: () => insertField(f) }, f)))) : null, /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Operation" }, /* @__PURE__ */ import_react3.default.createElement(
        import_antd3.Select,
        {
          value: (_g = cfg.op) != null ? _g : "list",
          onChange: (v) => set("op", v),
          options: ["list", "get", "create", "update"].map((o) => ({ value: o, label: o })),
          style: { width: 140 }
        }
      )), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Filter (JSON, templated)" }, /* @__PURE__ */ import_react3.default.createElement(JsonArea, { value: cfg.filter, onChange: (v) => set("filter", v), rows: 3 })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Values (JSON, for create/update)" }, /* @__PURE__ */ import_react3.default.createElement(JsonArea, { value: cfg.values, onChange: (v) => set("values", v), rows: 3 })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Allow write" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Checkbox, { checked: cfg.allowWrite === true, onChange: (e) => set("allowWrite", e.target.checked) }, "permit create/update (explicit opt-in)")));
      break;
    }
    case "mcp_tool":
      body = /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement(Field, { label: "MCP server (registered in the MCP Servers tab)" }, /* @__PURE__ */ import_react3.default.createElement(
        import_antd3.Select,
        {
          showSearch: true,
          value: (_h = cfg.serverId) != null ? _h : void 0,
          placeholder: "Select a registered MCP server\u2026",
          options: mcpServers.map((s) => ({ value: s.id, label: s.name })),
          filterOption: (input, option) => {
            var _a2;
            return String((_a2 = option == null ? void 0 : option.label) != null ? _a2 : "").toLowerCase().includes(input.toLowerCase());
          },
          onChange: (v) => set("serverId", v),
          style: { width: "100%" },
          notFoundContent: "No MCP servers registered yet"
        }
      )), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Tool name" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { value: cfg.toolName, placeholder: "search_issues", onChange: (e) => set("toolName", e.target.value) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Args (JSON of templates)" }, /* @__PURE__ */ import_react3.default.createElement(JsonArea, { value: cfg.args, onChange: (v) => set("args", v != null ? v : {}), rows: 5, placeholder: '{ "query": "{{input.query}}" }' })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Allow private/internal target" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Checkbox, { checked: cfg.allowPrivate === true, onChange: (e) => set("allowPrivate", e.target.checked) }, "permit calling a private/loopback host (SSRF guard escape hatch)")), retries);
      break;
    case "agent": {
      const tools = Array.isArray(cfg.tools) ? cfg.tools : [];
      const setTools = (next) => set("tools", next);
      const updateTool = (i, patch) => {
        const next = tools.slice();
        next[i] = { ...next[i], ...patch };
        setTools(next);
      };
      const addTool = () => setTools([...tools, { name: `tool_${tools.length + 1}`, type: "mcp", description: "" }]);
      const removeTool = (i) => setTools(tools.filter((_, j) => j !== i));
      body = /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement(Field, { label: "System prompt (optional \u2014 default agent framing if empty)" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input.TextArea, { rows: 3, value: cfg.systemPrompt, onChange: (e) => set("systemPrompt", e.target.value || void 0) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Goal (templated \u2014 what the agent should accomplish)" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input.TextArea, { rows: 3, value: cfg.goal, onChange: (e) => set("goal", e.target.value) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Max turns (server hard-caps at 25 regardless)" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.InputNumber, { min: 1, max: 25, value: (_i = cfg.maxTurns) != null ? _i : 10, onChange: (v) => set("maxTurns", Math.min(Number(v) || 10, 25)) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Tools (at least one required)" }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, tools.map((t, i) => {
        var _a2, _b2;
        return /* @__PURE__ */ import_react3.default.createElement("div", { key: i, style: { border: "1px solid #e2e4e1", borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", gap: 6 } }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } }, /* @__PURE__ */ import_react3.default.createElement(
          import_antd3.Input,
          {
            value: t.name,
            placeholder: "tool name (as the agent will call it)",
            onChange: (e) => updateTool(i, { name: e.target.value }),
            style: { flex: 1 }
          }
        ), /* @__PURE__ */ import_react3.default.createElement(
          import_antd3.Select,
          {
            value: (_a2 = t.type) != null ? _a2 : "mcp",
            onChange: (v) => updateTool(i, { type: v }),
            options: [
              { value: "mcp", label: "MCP server" },
              { value: "subworkflow", label: "Sub-workflow" }
            ],
            style: { width: 160 }
          }
        ), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { size: "small", danger: true, type: "text", onClick: () => removeTool(i), title: "Remove tool" }, "\u2715")), /* @__PURE__ */ import_react3.default.createElement(
          import_antd3.Input,
          {
            value: t.description,
            placeholder: "Description (helps the agent decide when to use it)",
            onChange: (e) => updateTool(i, { description: e.target.value })
          }
        ), t.type === "subworkflow" ? /* @__PURE__ */ import_react3.default.createElement(
          import_antd3.Select,
          {
            showSearch: true,
            value: t.workflowKey || void 0,
            placeholder: "Select a published workflow\u2026",
            options: publishedWorkflows.map((w) => ({ value: w.key, label: w.name ? `${w.name} (${w.key})` : w.key })),
            filterOption: (input, option) => {
              var _a3;
              return String((_a3 = option == null ? void 0 : option.label) != null ? _a3 : "").toLowerCase().includes(input.toLowerCase());
            },
            onChange: (v) => updateTool(i, { workflowKey: v }),
            notFoundContent: "No published workflows found"
          }
        ) : /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement(
          import_antd3.Select,
          {
            showSearch: true,
            value: (_b2 = t.serverId) != null ? _b2 : void 0,
            placeholder: "Select a registered MCP server\u2026",
            options: mcpServers.map((s) => ({ value: s.id, label: s.name })),
            filterOption: (input, option) => {
              var _a3;
              return String((_a3 = option == null ? void 0 : option.label) != null ? _a3 : "").toLowerCase().includes(input.toLowerCase());
            },
            onChange: (v) => updateTool(i, { serverId: v }),
            notFoundContent: "No MCP servers registered yet"
          }
        ), /* @__PURE__ */ import_react3.default.createElement(
          import_antd3.Input,
          {
            value: t.toolName,
            placeholder: "MCP tool name (empty = same as tool name above)",
            onChange: (e) => updateTool(i, { toolName: e.target.value || void 0 })
          }
        )));
      }), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { size: "small", onClick: addTool }, "+ tool"))));
      break;
    }
    case "transform":
      body = /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Map (JSON of templates)" }, /* @__PURE__ */ import_react3.default.createElement(JsonArea, { value: cfg.map, onChange: (v) => set("map", v != null ? v : {}), rows: 8, placeholder: '{ "lat": "{{nodes.geo.body.0.lat}}" }' }));
      break;
    case "condition":
      body = /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Left (templated)" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { value: cfg.left, onChange: (e) => set("left", e.target.value) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Operator" }, /* @__PURE__ */ import_react3.default.createElement(
        import_antd3.Select,
        {
          value: (_j = cfg.op) != null ? _j : "notEmpty",
          onChange: (v) => set("op", v),
          options: ["truthy", "eq", "ne", "gt", "gte", "lt", "lte", "contains", "empty", "notEmpty"].map((o) => ({ value: o, label: o })),
          style: { width: 160 }
        }
      )), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Right (templated)" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { value: cfg.right, onChange: (e) => set("right", e.target.value) })));
      break;
    case "loop":
      body = /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Items (template \u2192 array; body sees {{item}} / {{index}})" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { value: cfg.items, placeholder: "{{nodes.list.rows}}", onChange: (e) => set("items", e.target.value) }));
      break;
    case "human_gate":
      body = /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Message shown to the approver (templated)" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input.TextArea, { rows: 3, value: cfg.message, onChange: (e) => set("message", e.target.value) }));
      break;
    case "subworkflow":
      body = /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Workflow key" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { value: cfg.workflowKey, onChange: (e) => set("workflowKey", e.target.value) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Input (JSON of templates)" }, /* @__PURE__ */ import_react3.default.createElement(JsonArea, { value: cfg.input, onChange: (v) => set("input", v != null ? v : {}), rows: 4 })));
      break;
    case "output":
      body = /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Result map (JSON of templates)" }, /* @__PURE__ */ import_react3.default.createElement(JsonArea, { value: cfg.map, onChange: (v) => set("map", v != null ? v : {}), rows: 6 })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "End run here" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Checkbox, { checked: cfg.end === true, onChange: (e) => set("end", e.target.checked) }, "stop the workflow after this node")));
      break;
    default:
      body = null;
  }
  return /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, common, /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Node id" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { value: node.id, disabled: true })), body);
}
function confirmRun(estimate) {
  const e = estimate != null ? estimate : {};
  return new Promise((resolve) => {
    var _a, _b, _c, _d;
    let settled = false;
    const finish = (v) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    import_antd3.Modal.confirm({
      title: "Run this workflow?",
      icon: null,
      width: 440,
      okText: "Run",
      cancelText: "Cancel",
      onOk: () => finish(true),
      onCancel: () => finish(false),
      content: /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 13.5, lineHeight: 1.6 } }, /* @__PURE__ */ import_react3.default.createElement("p", { style: { margin: "0 0 10px" } }, "Makes ", /* @__PURE__ */ import_react3.default.createElement("b", null, (_a = e.llmCalls) != null ? _a : "?"), " LLM call", e.llmCalls === 1 ? "" : "s", " and ", /* @__PURE__ */ import_react3.default.createElement("b", null, (_b = e.imageCalls) != null ? _b : 0), " image call", e.imageCalls === 1 ? "" : "s", " per run."), /* @__PURE__ */ import_react3.default.createElement("div", { style: { background: "#fafaf8", border: "1px solid #ececea", borderRadius: 8, padding: "8px 12px" } }, /* @__PURE__ */ import_react3.default.createElement("div", null, "Spent today (global): ", /* @__PURE__ */ import_react3.default.createElement("b", null, "$", ((_c = e.spentTodayUsd) != null ? _c : 0).toFixed(2)), e.globalDailyBudgetUsd ? ` / $${e.globalDailyBudgetUsd} budget` : " (no budget set)"), /* @__PURE__ */ import_react3.default.createElement("div", null, "Spent today (this workflow): ", /* @__PURE__ */ import_react3.default.createElement("b", null, "$", ((_d = e.workflowSpentTodayUsd) != null ? _d : 0).toFixed(2)), e.workflowDailyBudgetUsd ? ` / $${e.workflowDailyBudgetUsd} budget` : " (no budget set)")))
    });
  });
}
function TestRunBox({
  workflowId,
  currentVersion,
  exampleInput,
  onStatus,
  topLevelNodes,
  skipSet,
  cachedOutputs
}) {
  var _a, _b, _c, _d, _e, _f;
  const api = (0, import_client.useAPIClient)();
  const [inputText, setInputText] = (0, import_react3.useState)(() => JSON.stringify(exampleInput != null ? exampleInput : {}, null, 2));
  const [runId, setRunId] = (0, import_react3.useState)(null);
  const [data, setData] = (0, import_react3.useState)({});
  const active = !!runId && !["succeeded", "failed", "cancelled", "rejected"].includes(String((_b = (_a = data.run) == null ? void 0 : _a.status) != null ? _b : ""));
  const onStatusRef = (0, import_react3.useRef)(onStatus);
  onStatusRef.current = onStatus;
  usePoll(
    async () => {
      var _a2;
      if (!runId) return;
      try {
        const d = await neoaiAction(api, "runStatus", { runId });
        setData(d);
        (_a2 = onStatusRef.current) == null ? void 0 : _a2.call(onStatusRef, d);
      } catch (e) {
      }
    },
    2e3,
    !!runId && active
  );
  const computeSeed = () => {
    const nodes = topLevelNodes != null ? topLevelNodes : [];
    if (!(skipSet == null ? void 0 : skipSet.size) || !nodes.length) return {};
    let firstRunIndex = 0;
    while (firstRunIndex < nodes.length && skipSet.has(nodes[firstRunIndex].id)) firstRunIndex += 1;
    if (firstRunIndex === 0 || firstRunIndex >= nodes.length) return {};
    const seedVars = {};
    for (let i = 0; i < firstRunIndex; i++) {
      const id = nodes[i].id;
      if ((cachedOutputs == null ? void 0 : cachedOutputs[id]) !== void 0) seedVars[id] = cachedOutputs[id];
    }
    return { skipToNodeId: nodes[firstRunIndex].id, seedVars };
  };
  const start = async (draft) => {
    var _a2, _b2;
    let input = {};
    try {
      input = inputText.trim() ? JSON.parse(inputText) : {};
    } catch (e) {
      import_antd3.message.error("Test input is not valid JSON");
      return;
    }
    try {
      const seed = draft ? computeSeed() : {};
      let res = await neoaiAction(api, "run", { workflowId, input, draft, confirmed: draft, trigger: draft ? "test" : "manual", ...seed });
      if (res.needsConfirm) {
        const ok = await confirmRun(res.estimate);
        if (!ok) return;
        res = await neoaiAction(api, "run", { workflowId, input, draft, confirmed: true, trigger: "manual" });
      }
      if (res.error) {
        import_antd3.message.error(res.error);
        return;
      }
      setRunId(res.runId);
      setData({});
      (_a2 = onStatusRef.current) == null ? void 0 : _a2.call(onStatusRef, {});
    } catch (err) {
      import_antd3.message.error(String((_b2 = err == null ? void 0 : err.message) != null ? _b2 : err));
    }
  };
  return /* @__PURE__ */ import_react3.default.createElement("div", null, /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Input (JSON)" }, /* @__PURE__ */ import_react3.default.createElement(
    import_antd3.Input.TextArea,
    {
      rows: 4,
      value: inputText,
      onChange: (e) => setInputText(e.target.value),
      style: { fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12 }
    }
  )), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Space, { wrap: true }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { type: "primary", onClick: () => start(true) }, "Run draft test"), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { disabled: !currentVersion, title: currentVersion ? "" : "Publish first", onClick: () => start(false) }, "Run published v", currentVersion || "\u2014"), runId ? /* @__PURE__ */ import_react3.default.createElement("span", { style: { fontSize: 12, color: "#8a8f8a" } }, "run #", runId) : null, data.run ? /* @__PURE__ */ import_react3.default.createElement(StatusTag, { status: data.run.status }) : null), ((_c = data.steps) != null ? _c : []).length > 0 ? /* @__PURE__ */ import_react3.default.createElement("div", { style: { marginTop: 10, display: "flex", flexDirection: "column", gap: 4 } }, ((_d = data.steps) != null ? _d : []).map((s) => /* @__PURE__ */ import_react3.default.createElement("div", { key: s.id, style: { display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 } }, /* @__PURE__ */ import_react3.default.createElement(StatusTag, { status: s.status }), /* @__PURE__ */ import_react3.default.createElement("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, s.title || s.node_id), /* @__PURE__ */ import_react3.default.createElement("span", { style: { color: "#8a8f8a" } }, fmtDuration(s.duration_ms)), /* @__PURE__ */ import_react3.default.createElement("span", { style: { color: "#8a8f8a" } }, fmtCost(s.cost_usd))))) : null, ((_e = data.run) == null ? void 0 : _e.status) === "succeeded" ? /* @__PURE__ */ import_react3.default.createElement("div", { style: { marginTop: 8 } }, /* @__PURE__ */ import_react3.default.createElement(JsonBox, { value: data.run.output, maxHeight: 200 })) : null, ((_f = data.run) == null ? void 0 : _f.status) === "failed" ? /* @__PURE__ */ import_react3.default.createElement("div", { style: { marginTop: 8, color: "#b02a2a", fontSize: 12.5 } }, data.run.error) : null);
}
function BatchRunBox({ workflowId }) {
  const api = (0, import_client.useAPIClient)();
  const [itemsText, setItemsText] = (0, import_react3.useState)("[\n  {}\n]");
  const [busy, setBusy] = (0, import_react3.useState)(false);
  const start = async () => {
    var _a, _b, _c;
    let items;
    try {
      const parsed = JSON.parse(itemsText);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      items = parsed;
    } catch (e) {
      import_antd3.message.error('Items must be a JSON array, e.g. [{"x":1},{"x":2}]');
      return;
    }
    setBusy(true);
    try {
      const res = await neoaiAction(api, "batchRun", { workflowId, items });
      if (res.error) {
        import_antd3.message.error(res.error);
        return;
      }
      const started = ((_a = res.started) != null ? _a : []).filter((r) => r.runId).length;
      const failed = ((_b = res.started) != null ? _b : []).length - started;
      import_antd3.message.success(`Batch: ${started} run${started === 1 ? "" : "s"} started${failed ? `, ${failed} failed to start` : ""}`);
    } catch (err) {
      import_antd3.message.error(String((_c = err == null ? void 0 : err.message) != null ? _c : err));
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ import_react3.default.createElement("div", null, /* @__PURE__ */ import_react3.default.createElement(Field, { label: 'Items (JSON array \u2014 one run per item, e.g. [{"dealId":1},{"dealId":2}])' }, /* @__PURE__ */ import_react3.default.createElement(
    import_antd3.Input.TextArea,
    {
      rows: 4,
      value: itemsText,
      onChange: (e) => setItemsText(e.target.value),
      style: { fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12 }
    }
  )), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { loading: busy, onClick: start }, "Run batch"), /* @__PURE__ */ import_react3.default.createElement("span", { style: { marginLeft: 10, fontSize: 12, color: "#8a8f8a" } }, "Runs against the published version \u2014 view progress in the Runs tab (trigger: batch)."));
}
function WorkflowEditor(props) {
  var _a, _b, _c, _d;
  const api = (0, import_client.useAPIClient)();
  const [wf, setWf] = (0, import_react3.useState)(props.row);
  const defRef = (0, import_react3.useRef)(
    props.row.definition_draft && Array.isArray(props.row.definition_draft.nodes) ? JSON.parse(JSON.stringify(props.row.definition_draft)) : { nodes: [] }
  );
  const [selectedId, setSelectedId] = (0, import_react3.useState)(null);
  const [dirty, setDirty] = (0, import_react3.useState)(false);
  const [, setTick] = (0, import_react3.useState)(0);
  const [runStatus, setRunStatus] = (0, import_react3.useState)({});
  const [validationErrors, setValidationErrors] = (0, import_react3.useState)([]);
  const validateTimer = (0, import_react3.useRef)(null);
  const rerender = () => {
    setDirty(true);
    setTick((n) => n + 1);
    if (validateTimer.current) clearTimeout(validateTimer.current);
    validateTimer.current = setTimeout(async () => {
      var _a2;
      try {
        const res = await neoaiAction(api, "publishWorkflow", { workflowId: wf.id, dryRun: true });
        setValidationErrors((_a2 = res.errors) != null ? _a2 : []);
      } catch (e) {
      }
    }, 500);
  };
  const selected = selectedId ? findNode(defRef.current.nodes, selectedId) : null;
  if (selectedId && !selected && selectedId !== null) {
    setSelectedId(null);
  }
  const stepsByNodeId = (0, import_react3.useMemo)(() => {
    var _a2;
    const m = /* @__PURE__ */ new Map();
    for (const s of (_a2 = runStatus.steps) != null ? _a2 : []) m.set(s.node_id, s);
    return m;
  }, [runStatus]);
  const cachedOutputsRef = (0, import_react3.useRef)({});
  const [skipSet, setSkipSet] = (0, import_react3.useState)(/* @__PURE__ */ new Set());
  for (const s of (_a = runStatus.steps) != null ? _a : []) {
    if (s.status === "done" && s.output !== void 0) cachedOutputsRef.current[s.node_id] = s.output;
  }
  const toggleSkip = (nodeId) => {
    setSkipSet((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };
  const errorsByNodeId = (0, import_react3.useMemo)(() => {
    var _a2;
    const m = /* @__PURE__ */ new Map();
    for (const e of validationErrors) {
      if (!e.nodeId) continue;
      const arr = (_a2 = m.get(e.nodeId)) != null ? _a2 : [];
      arr.push(e.message);
      m.set(e.nodeId, arr);
    }
    return m;
  }, [validationErrors]);
  const generalErrors = validationErrors.filter((e) => !e.nodeId);
  (0, import_react3.useEffect)(() => {
    (async () => {
      var _a2;
      try {
        const res = await neoaiAction(api, "publishWorkflow", { workflowId: wf.id, dryRun: true });
        setValidationErrors((_a2 = res.errors) != null ? _a2 : []);
      } catch (e) {
      }
    })();
  }, []);
  usePoll(
    async () => {
      try {
        const { rows } = await listResource(api, "neoai_runs", {
          filter: JSON.stringify({ workflow_id: wf.id, status: { $in: ["queued", "running", "waiting"] } }),
          sort: "-id",
          pageSize: 1
        });
        if (rows[0]) setRunStatus(await neoaiAction(api, "runStatus", { runId: rows[0].id }));
      } catch (e) {
      }
    },
    5e3,
    stepsByNodeId.size === 0 && !runStatus.run
  );
  const [versions, setVersions] = (0, import_react3.useState)([]);
  const [diffAgainst, setDiffAgainst] = (0, import_react3.useState)(null);
  const loadVersions = async () => {
    try {
      const { rows } = await listResource(api, "neoai_workflow_versions", {
        filter: JSON.stringify({ workflow_id: wf.id }),
        sort: "-version",
        pageSize: 10
      });
      setVersions(rows);
    } catch (e) {
    }
  };
  usePoll(loadVersions, 36e5, true);
  const saveDraft = async (silent = false) => {
    var _a2, _b2, _c2, _d2, _e, _f;
    try {
      await updateResource(api, "neoai_workflows", wf.id, {
        definition_draft: defRef.current,
        name: wf.name,
        require_confirm: wf.require_confirm === true,
        daily_budget_usd: Number(wf.daily_budget_usd) || 0,
        description: (_a2 = wf.description) != null ? _a2 : "",
        schedule: (_b2 = wf.schedule) != null ? _b2 : "",
        schedule_input: (_c2 = wf.schedule_input) != null ? _c2 : null,
        on_failure_workflow_key: (_d2 = wf.on_failure_workflow_key) != null ? _d2 : "",
        on_failure_input: (_e = wf.on_failure_input) != null ? _e : null
      });
      setDirty(false);
      if (!silent) import_antd3.message.success("Draft saved");
      return true;
    } catch (err) {
      import_antd3.message.error(`Save failed: ${(_f = err == null ? void 0 : err.message) != null ? _f : err}`);
      return false;
    }
  };
  const publish = async () => {
    var _a2, _b2, _c2;
    if (dirty && !await saveDraft(true)) return;
    try {
      const res = await neoaiAction(api, "publishWorkflow", { workflowId: wf.id });
      if (res.ok) {
        import_antd3.message.success(`Published as version ${res.version}`);
        setWf({ ...wf, current_version: res.version });
        loadVersions();
      } else {
        setValidationErrors((_a2 = res.errors) != null ? _a2 : []);
        import_antd3.message.error(`Not publishable: ${((_b2 = res.errors) != null ? _b2 : []).map((e) => e.message).join(" \xB7 ")}`);
      }
    } catch (err) {
      import_antd3.message.error(`Publish failed: ${(_c2 = err == null ? void 0 : err.message) != null ? _c2 : err}`);
    }
  };
  return /* @__PURE__ */ import_react3.default.createElement(
    ConsoleDrawer,
    {
      open: true,
      title: /* @__PURE__ */ import_react3.default.createElement("span", null, wf.name, " ", /* @__PURE__ */ import_react3.default.createElement("span", { style: { color: "#8a8f8a", fontWeight: 400, fontSize: 13 } }, "(", wf.key, " \xB7 v", (_b = wf.current_version) != null ? _b : 0, dirty ? " \xB7 unsaved changes" : "", ")")),
      extra: /* @__PURE__ */ import_react3.default.createElement(import_antd3.Space, null, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { onClick: saveDraft, disabled: !dirty }, "Save draft"), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { type: "primary", onClick: publish }, "Publish")),
      onClose: () => props.onClose(true)
    },
    /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", minHeight: "100%", alignItems: "stretch" } }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { flex: 1, padding: 18, minWidth: 0 } }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { maxWidth: 860 } }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", margin: "0 0 6px" } }, "WORKFLOW TREE"), generalErrors.length > 0 ? /* @__PURE__ */ import_react3.default.createElement("div", { style: { marginBottom: 10, fontSize: 12.5, color: "#b02a2a" } }, generalErrors.map((e) => e.message).join(" \xB7 ")) : null, /* @__PURE__ */ import_react3.default.createElement(
      NodeList,
      {
        nodes: defRef.current.nodes,
        selectedId,
        onSelect: setSelectedId,
        onChange: rerender,
        def: defRef.current,
        emptyHint: "Empty workflow \u2014 click + below to add the first step.",
        stepsByNodeId,
        errorsByNodeId,
        isTopLevel: true,
        cachedOutputs: cachedOutputsRef.current,
        skipSet,
        onToggleSkip: toggleSkip
      }
    ))), /* @__PURE__ */ import_react3.default.createElement("div", { style: { width: 400, borderLeft: "1px solid #ececea", background: "#fff", padding: 16, overflow: "auto" } }, selected ? /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", marginBottom: 8 } }, "NODE SETTINGS"), /* @__PURE__ */ import_react3.default.createElement(NodeConfigForm, { node: selected, onChange: rerender })) : /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", marginBottom: 8 } }, "WORKFLOW SETTINGS"), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Name" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { value: wf.name, onChange: (e) => (setWf({ ...wf, name: e.target.value }), setDirty(true)) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Description" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input.TextArea, { rows: 3, value: wf.description, onChange: (e) => (setWf({ ...wf, description: e.target.value }), setDirty(true)) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Require confirmation before each run" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Switch, { checked: wf.require_confirm === true, onChange: (v) => (setWf({ ...wf, require_confirm: v }), setDirty(true)) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Daily budget (USD, 0 = unlimited)" }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.InputNumber, { min: 0, step: 0.5, value: Number(wf.daily_budget_usd) || 0, onChange: (v) => (setWf({ ...wf, daily_budget_usd: v != null ? v : 0 }), setDirty(true)) })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: 'Schedule \u2014 "every 15m" \xB7 "every 2h" \xB7 "daily 07:00" (empty = off; runs published version)' }, /* @__PURE__ */ import_react3.default.createElement(
      import_antd3.Input,
      {
        value: (_c = wf.schedule) != null ? _c : "",
        placeholder: "off",
        onChange: (e) => (setWf({ ...wf, schedule: e.target.value }), setDirty(true))
      }
    )), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Schedule input (JSON passed to scheduled runs)" }, /* @__PURE__ */ import_react3.default.createElement(JsonArea, { value: wf.schedule_input, onChange: (v) => (setWf({ ...wf, schedule_input: v != null ? v : null }), setDirty(true)), rows: 3 })), /* @__PURE__ */ import_react3.default.createElement(Field, { label: "Run a workflow on failure (key, empty = off)" }, /* @__PURE__ */ import_react3.default.createElement(
      import_antd3.Input,
      {
        value: (_d = wf.on_failure_workflow_key) != null ? _d : "",
        placeholder: "e.g. notify-admin-of-failure",
        onChange: (e) => (setWf({ ...wf, on_failure_workflow_key: e.target.value }), setDirty(true))
      }
    )), wf.on_failure_workflow_key ? /* @__PURE__ */ import_react3.default.createElement(Field, { label: "On-failure hook input (JSON of templates: {{run.id}}, {{run.error}}, {{input.x}})" }, /* @__PURE__ */ import_react3.default.createElement(JsonArea, { value: wf.on_failure_input, onChange: (v) => (setWf({ ...wf, on_failure_input: v != null ? v : null }), setDirty(true)), rows: 3 })) : null, /* @__PURE__ */ import_react3.default.createElement("div", { style: { borderTop: "1px solid #ececea", margin: "14px 0" } }), /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", marginBottom: 8 } }, "RUN"), /* @__PURE__ */ import_react3.default.createElement(
      TestRunBox,
      {
        workflowId: wf.id,
        currentVersion: Number(wf.current_version) || 0,
        onStatus: setRunStatus,
        topLevelNodes: defRef.current.nodes,
        skipSet,
        cachedOutputs: cachedOutputsRef.current
      }
    ), Number(wf.current_version) > 0 ? /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement("div", { style: { borderTop: "1px solid #ececea", margin: "14px 0" } }), /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", marginBottom: 8 } }, "BATCH RUN"), /* @__PURE__ */ import_react3.default.createElement(BatchRunBox, { workflowId: wf.id })) : null, /* @__PURE__ */ import_react3.default.createElement("div", { style: { borderTop: "1px solid #ececea", margin: "14px 0" } }), /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", marginBottom: 8 } }, "VERSIONS"), versions.length === 0 ? /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 12.5, color: "#8a8f8a" } }, "No published versions yet.") : /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, versions.map((v) => /* @__PURE__ */ import_react3.default.createElement("div", { key: v.id, style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 } }, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Tag, { color: Number(v.version) === Number(wf.current_version) ? "green" : "default", style: { marginRight: 0 } }, "v", v.version), /* @__PURE__ */ import_react3.default.createElement("span", { style: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#5c605c" } }, fmtTime(v.createdAt), " \xB7 ", v.published_by || "\u2014", v.notes ? ` \xB7 ${v.notes}` : ""), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { size: "small", onClick: () => setDiffAgainst(v) }, "Diff"), /* @__PURE__ */ import_react3.default.createElement(
      import_antd3.Button,
      {
        size: "small",
        onClick: () => {
          var _a2;
          defRef.current = JSON.parse(JSON.stringify((_a2 = v.definition) != null ? _a2 : { nodes: [] }));
          setSelectedId(null);
          rerender();
          import_antd3.message.info(`Version ${v.version} loaded into the draft \u2014 save & publish to make it current`);
        }
      },
      "Load as draft"
    ))))))),
    diffAgainst ? /* @__PURE__ */ import_react3.default.createElement(
      VersionDiffDrawer,
      {
        options: [
          { key: "draft", label: "Current draft", definition: defRef.current },
          ...versions.map((v) => {
            var _a2;
            return { key: `v${v.version}`, label: `v${v.version} (${v.published_by || "\u2014"})`, definition: (_a2 = v.definition) != null ? _a2 : { nodes: [] } };
          })
        ],
        initialLeftKey: "draft",
        initialRightKey: `v${diffAgainst.version}`,
        onClose: () => setDiffAgainst(null)
      }
    ) : null
  );
}
function WorkflowsPanel() {
  const api = (0, import_client.useAPIClient)();
  const [rows, setRows] = (0, import_react3.useState)([]);
  const [loading, setLoading] = (0, import_react3.useState)(false);
  const [editing, setEditing] = (0, import_react3.useState)(null);
  const [creating, setCreating] = (0, import_react3.useState)(false);
  const [newName, setNewName] = (0, import_react3.useState)("");
  const [search, setSearch] = (0, import_react3.useState)("");
  const filteredRows = (0, import_react3.useMemo)(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => [r.name, r.key, r.description].some((v) => String(v != null ? v : "").toLowerCase().includes(q))
    );
  }, [rows, search]);
  const load = async () => {
    var _a;
    setLoading(true);
    try {
      const { rows: rows2 } = await listResource(api, "neoai_workflows", { sort: "-id", pageSize: 100 });
      setRows(rows2);
    } catch (err) {
      import_antd3.message.error(`Load failed: ${(_a = err == null ? void 0 : err.message) != null ? _a : err}`);
    } finally {
      setLoading(false);
    }
  };
  usePoll(load, 3e4, !editing);
  const create = async () => {
    var _a;
    const name = newName.trim();
    if (!name) {
      import_antd3.message.error("Enter a workflow name");
      return;
    }
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    try {
      await createResource(api, "neoai_workflows", {
        name,
        key,
        enabled: false,
        require_confirm: true,
        definition_draft: { nodes: [] },
        current_version: 0
      });
      setCreating(false);
      setNewName("");
      await load();
      import_antd3.message.success(`Workflow "${name}" created (disabled draft)`);
    } catch (err) {
      import_antd3.message.error(`Create failed: ${(_a = err == null ? void 0 : err.message) != null ? _a : err}`);
    }
  };
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (v, r) => /* @__PURE__ */ import_react3.default.createElement("a", { style: { fontWeight: 600, color: NEOHOME_GREEN }, onClick: () => setEditing(r) }, v)
    },
    {
      title: "Schedule",
      dataIndex: "schedule",
      width: 110,
      render: (v) => v ? /* @__PURE__ */ import_react3.default.createElement(import_antd3.Tag, { color: "green" }, v) : "\u2014"
    },
    { title: "Key", dataIndex: "key", render: (v) => /* @__PURE__ */ import_react3.default.createElement("code", { style: { fontSize: 12 } }, v) },
    {
      title: "Enabled",
      dataIndex: "enabled",
      width: 90,
      render: (v, r) => /* @__PURE__ */ import_react3.default.createElement(
        import_antd3.Switch,
        {
          size: "small",
          checked: v === true,
          onChange: async (val) => {
            await updateResource(api, "neoai_workflows", r.id, { enabled: val });
            load();
          }
        }
      )
    },
    { title: "Version", dataIndex: "current_version", width: 90, render: (v) => v ? `v${v}` : /* @__PURE__ */ import_react3.default.createElement(import_antd3.Tag, null, "draft") },
    { title: "Confirm", dataIndex: "require_confirm", width: 90, render: (v) => v ? "yes" : "no" },
    {
      title: "Budget/day",
      dataIndex: "daily_budget_usd",
      width: 110,
      render: (v) => Number(v) > 0 ? `$${Number(v)}` : "\u2014"
    },
    { title: "Updated", dataIndex: "updatedAt", width: 150, render: (v) => fmtTime(v) }
  ];
  return /* @__PURE__ */ import_react3.default.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" } }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 18, fontWeight: 800 } }, "AI Workflows"), /* @__PURE__ */ import_react3.default.createElement("div", { style: { flex: 1 } }), !creating ? /* @__PURE__ */ import_react3.default.createElement(
    import_antd3.Input.Search,
    {
      allowClear: true,
      placeholder: "Search name, key, description",
      value: search,
      onChange: (e) => setSearch(e.target.value),
      style: { width: 240 }
    }
  ) : null, creating ? /* @__PURE__ */ import_react3.default.createElement(import_antd3.Space.Compact, null, /* @__PURE__ */ import_react3.default.createElement(
    import_antd3.Input,
    {
      autoFocus: true,
      placeholder: "Workflow name",
      value: newName,
      onChange: (e) => setNewName(e.target.value),
      onPressEnter: create,
      style: { width: 260 }
    }
  ), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { type: "primary", onClick: create }, "Create"), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { onClick: () => setCreating(false) }, "Cancel")) : /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { onClick: load }, "Refresh"), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { type: "primary", onClick: () => setCreating(true) }, "New workflow"))), /* @__PURE__ */ import_react3.default.createElement(
    import_antd3.Table,
    {
      rowKey: "id",
      size: "middle",
      loading,
      dataSource: filteredRows,
      columns,
      pagination: false,
      locale: { emptyText: rows.length ? "No workflows match this search" : "No workflows yet" }
    }
  ), editing ? /* @__PURE__ */ import_react3.default.createElement(
    WorkflowEditor,
    {
      row: editing,
      onClose: () => {
        setEditing(null);
        load();
      }
    }
  ) : null);
}

// src/client/console/RunsPanel.tsx
var import_react4 = __toESM(require("react"));
var import_antd4 = require("antd");
var import_client2 = require("@nocobase/client");
var TERMINAL = /* @__PURE__ */ new Set(["succeeded", "failed", "cancelled", "rejected"]);
function RunDetail({ runId, onClose, onRerun }) {
  var _a, _b, _c;
  const api = (0, import_client2.useAPIClient)();
  const [data, setData] = (0, import_react4.useState)({});
  const [comment, setComment] = (0, import_react4.useState)("");
  const [rerunOpen, setRerunOpen] = (0, import_react4.useState)(false);
  const [rerunText, setRerunText] = (0, import_react4.useState)("");
  const run = data.run;
  const live = !run || !TERMINAL.has(String(run.status));
  usePoll(
    async () => {
      var _a2;
      try {
        setData(await neoaiAction(api, "runStatus", { runId }));
      } catch (err) {
        import_antd4.message.error(`Run load failed: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : err}`);
      }
    },
    2500,
    live
  );
  const decide = async (approved) => {
    var _a2;
    try {
      const res = await neoaiAction(api, "resumeRun", { runId, approved, comment });
      if (res.error) import_antd4.message.error(res.error);
      else import_antd4.message.success(approved ? "Approved \u2014 run continues" : "Rejected");
    } catch (err) {
      import_antd4.message.error(String((_a2 = err == null ? void 0 : err.message) != null ? _a2 : err));
    }
  };
  const cancel = async () => {
    var _a2;
    try {
      await neoaiAction(api, "cancelRun", { runId });
      import_antd4.message.success("Cancel requested");
    } catch (err) {
      import_antd4.message.error(String((_a2 = err == null ? void 0 : err.message) != null ? _a2 : err));
    }
  };
  const openRerun = () => {
    var _a2;
    setRerunText(JSON.stringify((_a2 = run == null ? void 0 : run.input) != null ? _a2 : {}, null, 2));
    setRerunOpen(true);
  };
  const submitRerun = async () => {
    var _a2;
    let newInput;
    try {
      newInput = rerunText.trim() ? JSON.parse(rerunText) : {};
    } catch (e) {
      import_antd4.message.error("Input is not valid JSON");
      return;
    }
    try {
      const res = await neoaiAction(api, "rerunRun", { runId, newInput });
      if (res.error) {
        import_antd4.message.error(res.error);
        return;
      }
      import_antd4.message.success(`Re-run started as run #${res.runId}`);
      setRerunOpen(false);
      onRerun == null ? void 0 : onRerun(res.runId);
    } catch (err) {
      import_antd4.message.error(String((_a2 = err == null ? void 0 : err.message) != null ? _a2 : err));
    }
  };
  const stepColumns = [
    { title: "#", dataIndex: "seq", width: 50 },
    { title: "Node", dataIndex: "title", render: (v, s) => v || s.node_id },
    { title: "Type", dataIndex: "node_type", width: 110 },
    { title: "Status", dataIndex: "status", width: 110, render: (v) => /* @__PURE__ */ import_react4.default.createElement(StatusTag, { status: v }) },
    { title: "Duration", dataIndex: "duration_ms", width: 100, render: (v) => fmtDuration(v) },
    { title: "Tokens", key: "tok", width: 130, render: (_, s) => fmtTokens(s.input_tokens, s.output_tokens) },
    { title: "Cost", dataIndex: "cost_usd", width: 90, render: (v) => fmtCost(v) },
    {
      title: "Error",
      dataIndex: "error",
      render: (v) => v ? /* @__PURE__ */ import_react4.default.createElement("span", { style: { color: "#b02a2a", fontSize: 12 } }, v) : null
    }
  ];
  return /* @__PURE__ */ import_react4.default.createElement(
    ConsoleDrawer,
    {
      open: true,
      title: /* @__PURE__ */ import_react4.default.createElement("span", null, "Run #", runId, " ", run ? /* @__PURE__ */ import_react4.default.createElement(StatusTag, { status: run.status }) : null, (run == null ? void 0 : run.function_key) ? /* @__PURE__ */ import_react4.default.createElement("span", { style: { fontWeight: 400, fontSize: 13, color: "#8a8f8a" } }, " \xB7 function ", run.function_key) : null),
      extra: /* @__PURE__ */ import_react4.default.createElement(import_antd4.Space, null, (run == null ? void 0 : run.status) === "waiting" ? /* @__PURE__ */ import_react4.default.createElement(import_react4.default.Fragment, null, /* @__PURE__ */ import_react4.default.createElement(import_antd4.Input, { placeholder: "Comment (optional)", value: comment, onChange: (e) => setComment(e.target.value), style: { width: 220 } }), /* @__PURE__ */ import_react4.default.createElement(import_antd4.Button, { type: "primary", onClick: () => decide(true) }, "Approve"), /* @__PURE__ */ import_react4.default.createElement(import_antd4.Button, { danger: true, onClick: () => decide(false) }, "Reject")) : null, run && !TERMINAL.has(String(run.status)) ? /* @__PURE__ */ import_react4.default.createElement(import_antd4.Button, { onClick: cancel }, "Cancel run") : null, run && TERMINAL.has(String(run.status)) ? /* @__PURE__ */ import_react4.default.createElement(import_antd4.Button, { onClick: openRerun }, "Re-run") : null),
      onClose
    },
    /* @__PURE__ */ import_react4.default.createElement(
      import_antd4.Modal,
      {
        open: rerunOpen,
        title: "Re-run with edited input",
        onCancel: () => setRerunOpen(false),
        onOk: submitRerun,
        okText: "Start re-run"
      },
      /* @__PURE__ */ import_react4.default.createElement(
        import_antd4.Input.TextArea,
        {
          rows: 10,
          value: rerunText,
          onChange: (e) => setRerunText(e.target.value),
          style: { fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12 }
        }
      )
    ),
    /* @__PURE__ */ import_react4.default.createElement("div", { style: { padding: 18, display: "flex", flexDirection: "column", gap: 14, maxWidth: 1200 } }, (run == null ? void 0 : run.status) === "waiting" ? /* @__PURE__ */ import_react4.default.createElement("div", { style: { border: "1px solid #e7d9a8", background: "#fdf7e3", borderRadius: 10, padding: "10px 14px" } }, /* @__PURE__ */ import_react4.default.createElement("b", null, "Waiting for approval:"), " ", run.waiting_message || "\u2014") : null, /* @__PURE__ */ import_react4.default.createElement("div", { style: { display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 } }, /* @__PURE__ */ import_react4.default.createElement("span", null, /* @__PURE__ */ import_react4.default.createElement("b", null, "Started:"), " ", fmtTime(run == null ? void 0 : run.started_at)), /* @__PURE__ */ import_react4.default.createElement("span", null, /* @__PURE__ */ import_react4.default.createElement("b", null, "Duration:"), " ", runDuration(run)), /* @__PURE__ */ import_react4.default.createElement("span", null, /* @__PURE__ */ import_react4.default.createElement("b", null, "Tokens:"), " ", fmtTokens(run == null ? void 0 : run.input_tokens, run == null ? void 0 : run.output_tokens)), /* @__PURE__ */ import_react4.default.createElement("span", null, /* @__PURE__ */ import_react4.default.createElement("b", null, "Cost:"), " ", fmtCost(run == null ? void 0 : run.cost_usd)), /* @__PURE__ */ import_react4.default.createElement("span", null, /* @__PURE__ */ import_react4.default.createElement("b", null, "Trigger:"), " ", (_a = run == null ? void 0 : run.trigger) != null ? _a : "\u2014", " (", (_b = run == null ? void 0 : run.triggered_by) != null ? _b : "\u2014", ")"), /* @__PURE__ */ import_react4.default.createElement("span", null, /* @__PURE__ */ import_react4.default.createElement("b", null, "Version:"), " ", (run == null ? void 0 : run.version) ? `v${run.version}` : "draft")), /* @__PURE__ */ import_react4.default.createElement("div", null, /* @__PURE__ */ import_react4.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", margin: "0 0 6px" } }, "STEPS"), /* @__PURE__ */ import_react4.default.createElement(
      import_antd4.Table,
      {
        rowKey: "id",
        size: "small",
        dataSource: (_c = data.steps) != null ? _c : [],
        columns: stepColumns,
        pagination: false,
        expandable: {
          expandedRowRender: (s) => /* @__PURE__ */ import_react4.default.createElement(JsonBox, { value: s.output, maxHeight: 300 }),
          rowExpandable: (s) => s.output != null
        }
      }
    )), /* @__PURE__ */ import_react4.default.createElement("div", { style: { display: "flex", gap: 14, flexWrap: "wrap" } }, /* @__PURE__ */ import_react4.default.createElement("div", { style: { flex: "1 1 320px", minWidth: 280 } }, /* @__PURE__ */ import_react4.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", margin: "0 0 6px" } }, "INPUT"), /* @__PURE__ */ import_react4.default.createElement(JsonBox, { value: run == null ? void 0 : run.input, maxHeight: 260 })), /* @__PURE__ */ import_react4.default.createElement("div", { style: { flex: "1 1 320px", minWidth: 280 } }, /* @__PURE__ */ import_react4.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", margin: "0 0 6px" } }, (run == null ? void 0 : run.status) === "failed" ? "ERROR" : "OUTPUT"), (run == null ? void 0 : run.status) === "failed" ? /* @__PURE__ */ import_react4.default.createElement("div", { style: { color: "#b02a2a", fontSize: 13 } }, run == null ? void 0 : run.error) : /* @__PURE__ */ import_react4.default.createElement(JsonBox, { value: run == null ? void 0 : run.output, maxHeight: 260 }))))
  );
}
var STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "running", label: "Running" },
  { value: "waiting", label: "Waiting" },
  { value: "queued", label: "Queued" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" }
];
function RunsPanel() {
  const api = (0, import_client2.useAPIClient)();
  const [rows, setRows] = (0, import_react4.useState)([]);
  const [openRun, setOpenRun] = (0, import_react4.useState)(null);
  const [statusFilter, setStatusFilter] = (0, import_react4.useState)("all");
  const [search, setSearch] = (0, import_react4.useState)("");
  usePoll(
    async () => {
      try {
        const { rows: rows2 } = await listResource(api, "neoai_runs", { sort: "-id", pageSize: 50, appends: "workflow" });
        setRows(rows2);
      } catch (e) {
      }
    },
    3e3,
    openRun == null
  );
  const filteredRows = (0, import_react4.useMemo)(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      var _a;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [(_a = r.workflow) == null ? void 0 : _a.name, String(r.id), r.trigger, r.function_key].map((v) => String(v != null ? v : "").toLowerCase());
      return haystack.some((v) => v.includes(q));
    });
  }, [rows, statusFilter, search]);
  const columns = [
    {
      title: "Run",
      dataIndex: "id",
      width: 80,
      render: (v) => /* @__PURE__ */ import_react4.default.createElement("a", { style: { fontWeight: 600, color: NEOHOME_GREEN }, onClick: () => setOpenRun(v) }, "#", v)
    },
    { title: "Workflow", key: "wf", render: (_, r) => {
      var _a, _b;
      return (_b = (_a = r.workflow) == null ? void 0 : _a.name) != null ? _b : r.workflow_id;
    } },
    { title: "Status", dataIndex: "status", width: 110, render: (v) => /* @__PURE__ */ import_react4.default.createElement(StatusTag, { status: v }) },
    {
      title: "Waiting on",
      dataIndex: "waiting_message",
      render: (v, r) => r.status === "waiting" && v ? /* @__PURE__ */ import_react4.default.createElement(import_antd4.Popover, { content: v }, /* @__PURE__ */ import_react4.default.createElement("span", { style: { color: "#9a7b00" } }, v.slice(0, 40), "\u2026")) : null
    },
    { title: "Trigger", dataIndex: "trigger", width: 90 },
    { title: "Started", dataIndex: "started_at", width: 150, render: (v) => fmtTime(v) },
    { title: "Duration", key: "dur", width: 100, render: (_, r) => runDuration(r) },
    { title: "Tokens", key: "tok", width: 130, render: (_, r) => fmtTokens(r.input_tokens, r.output_tokens) },
    { title: "Cost", dataIndex: "cost_usd", width: 90, render: (v) => fmtCost(v) }
  ];
  return /* @__PURE__ */ import_react4.default.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ import_react4.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" } }, /* @__PURE__ */ import_react4.default.createElement("div", { style: { fontSize: 18, fontWeight: 800 } }, "Runs"), /* @__PURE__ */ import_react4.default.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ import_react4.default.createElement(
    import_antd4.Input.Search,
    {
      allowClear: true,
      placeholder: "Search workflow, run #, trigger, function",
      value: search,
      onChange: (e) => setSearch(e.target.value),
      style: { width: 260 }
    }
  ), /* @__PURE__ */ import_react4.default.createElement(import_antd4.Select, { value: statusFilter, onChange: setStatusFilter, options: STATUS_OPTIONS, style: { width: 150 } }), /* @__PURE__ */ import_react4.default.createElement("span", { style: { fontSize: 12, color: "#8a8f8a" } }, "auto-refreshing every 3 s")), /* @__PURE__ */ import_react4.default.createElement(
    import_antd4.Table,
    {
      rowKey: "id",
      size: "middle",
      dataSource: filteredRows,
      columns,
      pagination: { pageSize: 25 },
      locale: { emptyText: rows.length ? "No runs match this filter" : "No runs yet" }
    }
  ), openRun != null ? /* @__PURE__ */ import_react4.default.createElement(RunDetail, { runId: openRun, onClose: () => setOpenRun(null), onRerun: setOpenRun }) : null);
}

// src/client/console/ApprovalsPanel.tsx
var import_react5 = __toESM(require("react"));
var import_antd5 = require("antd");
var import_client3 = require("@nocobase/client");
var STALE_WARN_MS = 36e5;
var STALE_CRITICAL_MS = 864e5;
function StalenessTag({ startedAt }) {
  if (!startedAt) return /* @__PURE__ */ import_react5.default.createElement(import_antd5.Tag, null, "\u2014");
  const ms = Date.now() - new Date(startedAt).getTime();
  const hours = ms / 36e5;
  const label = hours < 1 ? `${Math.max(0, Math.round(ms / 6e4))}m` : hours < 24 ? `${hours.toFixed(1)}h` : `${(hours / 24).toFixed(1)}d`;
  const color = ms >= STALE_CRITICAL_MS ? "red" : ms >= STALE_WARN_MS ? "gold" : "default";
  return /* @__PURE__ */ import_react5.default.createElement(import_antd5.Tag, { color }, label, " waiting");
}
function ApprovalsPanel() {
  const api = (0, import_client3.useAPIClient)();
  const [rows, setRows] = (0, import_react5.useState)([]);
  const [openRun, setOpenRun] = (0, import_react5.useState)(null);
  usePoll(
    async () => {
      try {
        const { rows: rows2 } = await listResource(api, "neoai_runs", {
          filter: JSON.stringify({ status: "waiting" }),
          sort: "started_at",
          pageSize: 100,
          appends: "workflow"
        });
        setRows(rows2);
      } catch (e) {
      }
    },
    5e3,
    openRun == null
  );
  const sorted = (0, import_react5.useMemo)(() => [...rows].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()), [rows]);
  const columns = [
    {
      title: "Run",
      dataIndex: "id",
      width: 80,
      render: (v) => /* @__PURE__ */ import_react5.default.createElement("a", { style: { fontWeight: 600, color: NEOHOME_GREEN }, onClick: () => setOpenRun(v) }, "#", v)
    },
    { title: "Workflow", key: "wf", render: (_, r) => {
      var _a, _b;
      return (_b = (_a = r.workflow) == null ? void 0 : _a.name) != null ? _b : r.workflow_id;
    } },
    { title: "Waiting on", dataIndex: "waiting_message", ellipsis: true },
    { title: "Started", dataIndex: "started_at", width: 150, render: (v) => fmtTime(v) },
    { title: "Elapsed", key: "elapsed", width: 130, render: (_, r) => /* @__PURE__ */ import_react5.default.createElement(StalenessTag, { startedAt: r.started_at }) }
  ];
  return /* @__PURE__ */ import_react5.default.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ import_react5.default.createElement("div", { style: { display: "flex", alignItems: "center", marginBottom: 14, gap: 10 } }, /* @__PURE__ */ import_react5.default.createElement("div", { style: { fontSize: 18, fontWeight: 800 } }, "Approvals"), /* @__PURE__ */ import_react5.default.createElement("span", { style: { fontSize: 12, color: "#8a8f8a" } }, "runs waiting on a human_gate, oldest first")), /* @__PURE__ */ import_react5.default.createElement(
    import_antd5.Table,
    {
      rowKey: "id",
      size: "middle",
      dataSource: sorted,
      columns,
      pagination: false,
      locale: { emptyText: "Nothing waiting on approval right now." }
    }
  ), openRun != null ? /* @__PURE__ */ import_react5.default.createElement(RunDetail, { runId: openRun, onClose: () => setOpenRun(null) }) : null);
}

// src/client/console/FunctionsPanel.tsx
var import_react6 = __toESM(require("react"));
var import_antd6 = require("antd");
var import_client4 = require("@nocobase/client");
function TestDispatchDrawer({ fn, onClose }) {
  const api = (0, import_client4.useAPIClient)();
  const [inputText, setInputText] = (0, import_react6.useState)(() => {
    var _a;
    return JSON.stringify((_a = fn.input_example) != null ? _a : {}, null, 2);
  });
  const [result, setResult] = (0, import_react6.useState)(null);
  const [busy, setBusy] = (0, import_react6.useState)(false);
  const dispatch = async () => {
    var _a;
    let input = {};
    try {
      input = inputText.trim() ? JSON.parse(inputText) : {};
    } catch (e) {
      import_antd6.message.error("Input is not valid JSON");
      return;
    }
    setBusy(true);
    try {
      setResult(await neoaiAction(api, "runFunction", { functionKey: fn.key, input, wait: true }));
    } catch (err) {
      import_antd6.message.error(String((_a = err == null ? void 0 : err.message) != null ? _a : err));
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ import_react6.default.createElement(ConsoleDrawer, { open: true, title: /* @__PURE__ */ import_react6.default.createElement("span", null, "Test dispatch \u2014 ", /* @__PURE__ */ import_react6.default.createElement("code", null, fn.key)), onClose }, /* @__PURE__ */ import_react6.default.createElement("div", { style: { padding: 18, maxWidth: 760 } }, /* @__PURE__ */ import_react6.default.createElement("p", { style: { fontSize: 13, color: "#5c605c" } }, "Simulates a host-plugin call: ", /* @__PURE__ */ import_react6.default.createElement("code", null, "pm.get('neoai').runFunction('", fn.key, "', input)"), '. Bound workflow runs and the dispatch waits for the result; no binding \u2192 the "legacy" answer the host plugin would act on.'), /* @__PURE__ */ import_react6.default.createElement(
    import_antd6.Input.TextArea,
    {
      rows: 6,
      value: inputText,
      onChange: (e) => setInputText(e.target.value),
      style: { fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12, marginBottom: 10 }
    }
  ), /* @__PURE__ */ import_react6.default.createElement(import_antd6.Button, { type: "primary", loading: busy, onClick: dispatch }, "Dispatch"), result ? /* @__PURE__ */ import_react6.default.createElement("div", { style: { marginTop: 14 } }, /* @__PURE__ */ import_react6.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", marginBottom: 6 } }, "RESULT"), /* @__PURE__ */ import_react6.default.createElement(JsonBox, { value: result, maxHeight: 320 })) : null));
}
function FunctionsPanel() {
  const api = (0, import_client4.useAPIClient)();
  const [rows, setRows] = (0, import_react6.useState)([]);
  const [workflows, setWorkflows] = (0, import_react6.useState)([]);
  const [testing, setTesting] = (0, import_react6.useState)(null);
  const [creating, setCreating] = (0, import_react6.useState)(false);
  const [draft, setDraft] = (0, import_react6.useState)({ key: "", title: "", plugin: "" });
  const load = async () => {
    var _a;
    try {
      const [f, w] = await Promise.all([
        listResource(api, "neoai_functions", { sort: "key", pageSize: 100, appends: "workflow" }),
        listResource(api, "neoai_workflows", { sort: "name", pageSize: 100 })
      ]);
      setRows(f.rows);
      setWorkflows(w.rows);
    } catch (err) {
      import_antd6.message.error(`Load failed: ${(_a = err == null ? void 0 : err.message) != null ? _a : err}`);
    }
  };
  usePoll(load, 3e4, !testing);
  const bind = async (fnRow, workflowId) => {
    await updateResource(api, "neoai_functions", fnRow.id, { workflow_id: workflowId });
    await load();
    import_antd6.message.success(workflowId ? "Workflow bound" : "Binding cleared \u2014 legacy code path active");
  };
  const create = async () => {
    if (!draft.key.trim() || !draft.title.trim()) {
      import_antd6.message.error("Key and title are required");
      return;
    }
    await createResource(api, "neoai_functions", { ...draft, enabled: true });
    setCreating(false);
    setDraft({ key: "", title: "", plugin: "" });
    await load();
  };
  const workflowOptions = workflows.filter((w) => Number(w.current_version) > 0).map((w) => ({ value: w.id, label: `${w.name} (v${w.current_version}${w.enabled ? "" : " \xB7 disabled"})` }));
  const columns = [
    { title: "Function key", dataIndex: "key", render: (v) => /* @__PURE__ */ import_react6.default.createElement("code", { style: { fontSize: 12 } }, v) },
    { title: "Title", dataIndex: "title" },
    { title: "Plugin", dataIndex: "plugin", width: 130, render: (v) => v ? /* @__PURE__ */ import_react6.default.createElement(import_antd6.Tag, null, v) : "\u2014" },
    {
      title: "Bound workflow (empty = legacy path)",
      key: "wf",
      width: 320,
      render: (_, r) => {
        var _a;
        return /* @__PURE__ */ import_react6.default.createElement(
          import_antd6.Select,
          {
            allowClear: true,
            placeholder: "legacy code path",
            style: { width: "100%" },
            value: (_a = r.workflow_id) != null ? _a : void 0,
            options: workflowOptions,
            onChange: (v) => bind(r, v != null ? v : null)
          }
        );
      }
    },
    {
      title: "Enabled",
      dataIndex: "enabled",
      width: 90,
      render: (v, r) => /* @__PURE__ */ import_react6.default.createElement(
        import_antd6.Switch,
        {
          size: "small",
          checked: v !== false,
          onChange: async (val) => {
            await updateResource(api, "neoai_functions", r.id, { enabled: val });
            load();
          }
        }
      )
    },
    {
      title: "Budget/day (USD, 0 = inherit workflow)",
      dataIndex: "daily_budget_usd",
      width: 150,
      render: (v, r) => /* @__PURE__ */ import_react6.default.createElement(
        import_antd6.InputNumber,
        {
          size: "small",
          min: 0,
          step: 0.5,
          value: Number(v) || 0,
          onChange: async (val) => {
            await updateResource(api, "neoai_functions", r.id, { daily_budget_usd: val != null ? val : 0 });
            load();
          }
        }
      )
    },
    {
      title: "",
      key: "act",
      width: 130,
      render: (_, r) => /* @__PURE__ */ import_react6.default.createElement(import_antd6.Button, { size: "small", onClick: () => setTesting(r) }, "Test dispatch")
    }
  ];
  return /* @__PURE__ */ import_react6.default.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ import_react6.default.createElement("div", { style: { display: "flex", alignItems: "center", marginBottom: 6, gap: 10 } }, /* @__PURE__ */ import_react6.default.createElement("div", { style: { fontSize: 18, fontWeight: 800, flex: 1 } }, "Functions"), creating ? /* @__PURE__ */ import_react6.default.createElement(import_antd6.Space.Compact, null, /* @__PURE__ */ import_react6.default.createElement(import_antd6.Input, { placeholder: "key (e.g. crm.draftReply)", value: draft.key, onChange: (e) => setDraft({ ...draft, key: e.target.value }), style: { width: 220 } }), /* @__PURE__ */ import_react6.default.createElement(import_antd6.Input, { placeholder: "Title", value: draft.title, onChange: (e) => setDraft({ ...draft, title: e.target.value }), style: { width: 180 } }), /* @__PURE__ */ import_react6.default.createElement(import_antd6.Input, { placeholder: "Plugin", value: draft.plugin, onChange: (e) => setDraft({ ...draft, plugin: e.target.value }), style: { width: 140 } }), /* @__PURE__ */ import_react6.default.createElement(import_antd6.Button, { type: "primary", onClick: create }, "Create"), /* @__PURE__ */ import_react6.default.createElement(import_antd6.Button, { onClick: () => setCreating(false) }, "Cancel")) : /* @__PURE__ */ import_react6.default.createElement(import_react6.default.Fragment, null, /* @__PURE__ */ import_react6.default.createElement(import_antd6.Button, { onClick: load }, "Refresh"), /* @__PURE__ */ import_react6.default.createElement(import_antd6.Button, { type: "primary", onClick: () => setCreating(true) }, "Register function"))), /* @__PURE__ */ import_react6.default.createElement("p", { style: { fontSize: 12.5, color: "#8a8f8a", margin: "0 0 12px", maxWidth: 760 } }, "Host plugins (Konfigurator, CRM) register their AI functions here and gain a workflow selector; an empty binding keeps their built-in legacy behaviour. Bindings take effect immediately \u2014 dispatches use the bound workflow's published version."), /* @__PURE__ */ import_react6.default.createElement(import_antd6.Table, { rowKey: "id", size: "middle", dataSource: rows, columns, pagination: false }), testing ? /* @__PURE__ */ import_react6.default.createElement(TestDispatchDrawer, { fn: testing, onClose: () => setTesting(null) }) : null);
}

// src/client/console/McpServersPanel.tsx
var import_react7 = __toESM(require("react"));
var import_antd7 = require("antd");
var import_client5 = require("@nocobase/client");
function McpServersPanel() {
  const api = (0, import_client5.useAPIClient)();
  const [rows, setRows] = (0, import_react7.useState)([]);
  const [secrets, setSecrets] = (0, import_react7.useState)([]);
  const [creating, setCreating] = (0, import_react7.useState)(false);
  const [draft, setDraft] = (0, import_react7.useState)({
    name: "",
    url: "https://",
    auth_header: "",
    description: ""
  });
  const [editingId, setEditingId] = (0, import_react7.useState)(null);
  const load = async () => {
    var _a, _b;
    try {
      const [m, s] = await Promise.all([
        listResource(api, "neoai_mcp_servers", { sort: "name", pageSize: 100, appends: "auth_secret" }),
        neoaiAction(api, "secretsList", {})
      ]);
      setRows(m.rows);
      setSecrets((_a = s.rows) != null ? _a : []);
    } catch (err) {
      import_antd7.message.error(`Load failed: ${(_b = err == null ? void 0 : err.message) != null ? _b : err}`);
    }
  };
  usePoll(load, 3e4, !creating && editingId == null);
  const secretOptions = secrets.map((s) => ({ value: s.id, label: s.name }));
  const resetDraft = () => setDraft({ name: "", url: "https://", auth_header: "", description: "", auth_secret_id: void 0 });
  const create = async () => {
    var _a, _b;
    if (!draft.name.trim() || !draft.url.trim()) {
      import_antd7.message.error("Name and URL are required");
      return;
    }
    try {
      await createResource(api, "neoai_mcp_servers", {
        name: draft.name.trim(),
        url: draft.url.trim(),
        auth_header: draft.auth_header || void 0,
        auth_secret_id: (_a = draft.auth_secret_id) != null ? _a : null,
        description: draft.description
      });
      setCreating(false);
      resetDraft();
      await load();
      import_antd7.message.success("MCP server registered");
    } catch (err) {
      import_antd7.message.error(`Create failed: ${(_b = err == null ? void 0 : err.message) != null ? _b : err}`);
    }
  };
  const startEdit = (r) => {
    var _a, _b, _c, _d, _e, _f, _g;
    setEditingId(r.id);
    setDraft({
      name: (_a = r.name) != null ? _a : "",
      url: (_b = r.url) != null ? _b : "",
      auth_header: (_c = r.auth_header) != null ? _c : "",
      auth_secret_id: (_f = (_e = (_d = r.auth_secret) == null ? void 0 : _d.id) != null ? _e : r.auth_secret_id) != null ? _f : void 0,
      description: (_g = r.description) != null ? _g : ""
    });
  };
  const saveEdit = async () => {
    var _a, _b;
    if (editingId == null) return;
    try {
      await updateResource(api, "neoai_mcp_servers", editingId, {
        name: draft.name.trim(),
        url: draft.url.trim(),
        auth_header: draft.auth_header || void 0,
        auth_secret_id: (_a = draft.auth_secret_id) != null ? _a : null,
        description: draft.description
      });
      setEditingId(null);
      resetDraft();
      await load();
      import_antd7.message.success("MCP server updated");
    } catch (err) {
      import_antd7.message.error(`Update failed: ${(_b = err == null ? void 0 : err.message) != null ? _b : err}`);
    }
  };
  const remove = async (r) => {
    var _a;
    try {
      await api.request({ url: "neoai_mcp_servers:destroy", method: "post", params: { filterByTk: r.id } });
      await load();
      import_antd7.message.success("MCP server removed");
    } catch (err) {
      import_antd7.message.error(`Delete failed: ${(_a = err == null ? void 0 : err.message) != null ? _a : err}`);
    }
  };
  const columns = [
    { title: "Name", dataIndex: "name", render: (v) => /* @__PURE__ */ import_react7.default.createElement("code", { style: { fontSize: 12 } }, v) },
    { title: "URL", dataIndex: "url", ellipsis: true },
    { title: "Auth header", dataIndex: "auth_header", width: 140, render: (v) => v || "\u2014" },
    {
      title: "Auth secret",
      key: "secret",
      width: 160,
      render: (_, r) => {
        var _a, _b;
        return (_b = (_a = r.auth_secret) == null ? void 0 : _a.name) != null ? _b : "\u2014";
      }
    },
    { title: "Description", dataIndex: "description", ellipsis: true },
    {
      title: "",
      key: "act",
      width: 150,
      render: (_, r) => /* @__PURE__ */ import_react7.default.createElement(import_antd7.Space, null, /* @__PURE__ */ import_react7.default.createElement(import_antd7.Button, { size: "small", onClick: () => startEdit(r) }, "Edit"), /* @__PURE__ */ import_react7.default.createElement(import_antd7.Button, { size: "small", danger: true, onClick: () => remove(r) }, "Delete"))
    }
  ];
  const editorOpen = creating || editingId != null;
  return /* @__PURE__ */ import_react7.default.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ import_react7.default.createElement("div", { style: { display: "flex", alignItems: "center", marginBottom: 6, gap: 10 } }, /* @__PURE__ */ import_react7.default.createElement("div", { style: { fontSize: 18, fontWeight: 800, flex: 1 } }, "MCP Servers"), !editorOpen ? /* @__PURE__ */ import_react7.default.createElement(import_react7.default.Fragment, null, /* @__PURE__ */ import_react7.default.createElement(import_antd7.Button, { onClick: load }, "Refresh"), /* @__PURE__ */ import_react7.default.createElement(import_antd7.Button, { type: "primary", onClick: () => setCreating(true) }, "Register server")) : null), /* @__PURE__ */ import_react7.default.createElement("p", { style: { fontSize: 12.5, color: "#8a8f8a", margin: "0 0 12px", maxWidth: 760 } }, "Registered MCP (Model Context Protocol) HTTP-transport servers. An ", /* @__PURE__ */ import_react7.default.createElement("code", null, "mcp_tool"), " workflow node picks one of these by name instead of typing a URL per node. Auth secrets are managed in Settings \u2192 Secrets vault and never appear here in cleartext."), editorOpen ? /* @__PURE__ */ import_react7.default.createElement("div", { style: { border: "1px solid #ececea", borderRadius: 10, padding: 16, marginBottom: 16, maxWidth: 640 } }, /* @__PURE__ */ import_react7.default.createElement(import_antd7.Space, { direction: "vertical", style: { width: "100%" }, size: 10 }, /* @__PURE__ */ import_react7.default.createElement(import_antd7.Input, { placeholder: "Name (e.g. jira)", value: draft.name, onChange: (e) => setDraft({ ...draft, name: e.target.value }) }), /* @__PURE__ */ import_react7.default.createElement(import_antd7.Input, { placeholder: "https://mcp.example.com/tools", value: draft.url, onChange: (e) => setDraft({ ...draft, url: e.target.value }) }), /* @__PURE__ */ import_react7.default.createElement(
    import_antd7.Input,
    {
      placeholder: 'Auth header name (e.g. "Authorization")',
      value: draft.auth_header,
      onChange: (e) => setDraft({ ...draft, auth_header: e.target.value })
    }
  ), /* @__PURE__ */ import_react7.default.createElement(
    import_antd7.Select,
    {
      allowClear: true,
      placeholder: "Auth secret (optional)",
      style: { width: "100%" },
      value: draft.auth_secret_id,
      options: secretOptions,
      onChange: (v) => setDraft({ ...draft, auth_secret_id: v != null ? v : void 0 })
    }
  ), /* @__PURE__ */ import_react7.default.createElement(import_antd7.Input.TextArea, { rows: 2, placeholder: "Description", value: draft.description, onChange: (e) => setDraft({ ...draft, description: e.target.value }) }), /* @__PURE__ */ import_react7.default.createElement(import_antd7.Space, null, /* @__PURE__ */ import_react7.default.createElement(import_antd7.Button, { type: "primary", onClick: editingId != null ? saveEdit : create }, editingId != null ? "Save" : "Create"), /* @__PURE__ */ import_react7.default.createElement(
    import_antd7.Button,
    {
      onClick: () => {
        setCreating(false);
        setEditingId(null);
        resetDraft();
      }
    },
    "Cancel"
  )))) : null, /* @__PURE__ */ import_react7.default.createElement(import_antd7.Table, { rowKey: "id", size: "middle", dataSource: rows, columns, pagination: false }));
}

// src/client/console/SettingsPanel.tsx
var import_react8 = __toESM(require("react"));
var import_antd8 = require("antd");
var import_client6 = require("@nocobase/client");
function Field2({ label, children, hint }) {
  return /* @__PURE__ */ import_react8.default.createElement("div", { style: { marginBottom: 14, maxWidth: 560 } }, /* @__PURE__ */ import_react8.default.createElement("div", { style: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "#8a8f8a", marginBottom: 4 } }, label), children, hint ? /* @__PURE__ */ import_react8.default.createElement("div", { style: { fontSize: 12, color: "#8a8f8a", marginTop: 4 } }, hint) : null);
}
function Section({ title, children }) {
  return /* @__PURE__ */ import_react8.default.createElement("div", { style: { border: "1px solid #ececea", borderRadius: 10, padding: "16px 18px", marginBottom: 16, maxWidth: 620 } }, /* @__PURE__ */ import_react8.default.createElement("div", { style: { fontSize: 12.5, fontWeight: 700, color: "#191a19", marginBottom: 14 } }, title), children);
}
function Sparkline({ data }) {
  const max = Math.max(1e-9, ...data.map((d) => d.value));
  return /* @__PURE__ */ import_react8.default.createElement("div", { style: { display: "flex", alignItems: "flex-end", gap: 3, height: 60 } }, data.map((d) => /* @__PURE__ */ import_react8.default.createElement("div", { key: d.label, title: `${d.label}: $${d.value.toFixed(2)}`, style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center" } }, /* @__PURE__ */ import_react8.default.createElement("div", { style: { width: "100%", height: Math.max(2, d.value / max * 52), background: "#009900", borderRadius: "2px 2px 0 0" } }))));
}
function SecretsSection() {
  const api = (0, import_client6.useAPIClient)();
  const [rows, setRows] = (0, import_react8.useState)([]);
  const [name, setName] = (0, import_react8.useState)("");
  const [value, setValue] = (0, import_react8.useState)("");
  const [busy, setBusy] = (0, import_react8.useState)(false);
  const load = async () => {
    var _a, _b;
    try {
      const res = await neoaiAction(api, "secretsList", {});
      setRows((_a = res.rows) != null ? _a : []);
    } catch (err) {
      import_antd8.message.error(`Load failed: ${(_b = err == null ? void 0 : err.message) != null ? _b : err}`);
    }
  };
  usePoll(load, 36e5, true);
  const save = async () => {
    var _a;
    if (!name.trim() || !value) {
      import_antd8.message.error("Name and value are required");
      return;
    }
    setBusy(true);
    try {
      await neoaiAction(api, "secretsSave", { name: name.trim(), value });
      setName("");
      setValue("");
      import_antd8.message.success("Secret saved");
      await load();
    } catch (err) {
      import_antd8.message.error(`Save failed: ${(_a = err == null ? void 0 : err.message) != null ? _a : err}`);
    } finally {
      setBusy(false);
    }
  };
  const remove = (row) => {
    import_antd8.Modal.confirm({
      title: `Delete secret "${row.name}"?`,
      content: "Any MCP server or workflow referencing this secret will lose its auth value.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        await neoaiAction(api, "secretsDelete", { id: row.id });
        import_antd8.message.success("Secret deleted");
        await load();
      }
    });
  };
  return /* @__PURE__ */ import_react8.default.createElement(Section, { title: "Secrets vault" }, /* @__PURE__ */ import_react8.default.createElement("p", { style: { fontSize: 12.5, color: "#8a8f8a", margin: "0 0 12px", maxWidth: 560 } }, "Encrypted at rest (AES-256-GCM, key derived from APP_KEY) \u2014 used via ", /* @__PURE__ */ import_react8.default.createElement("code", null, "{{secrets.name}}"), " in workflow templates, and by MCP servers as an auth-header value. Values are write-only: this list never shows a decrypted or even encrypted value, only whether one is configured."), /* @__PURE__ */ import_react8.default.createElement(
    import_antd8.Table,
    {
      rowKey: "id",
      size: "small",
      dataSource: rows,
      pagination: false,
      style: { marginBottom: 14 },
      columns: [
        { title: "Name", dataIndex: "name", render: (v) => /* @__PURE__ */ import_react8.default.createElement("code", null, v) },
        { title: "Status", dataIndex: "configured", width: 120, render: (v) => /* @__PURE__ */ import_react8.default.createElement(import_antd8.Tag, { color: v ? "green" : "default" }, v ? "configured" : "empty") },
        {
          title: "",
          key: "act",
          width: 90,
          render: (_, r) => /* @__PURE__ */ import_react8.default.createElement(import_antd8.Button, { size: "small", danger: true, onClick: () => remove(r) }, "Delete")
        }
      ]
    }
  ), /* @__PURE__ */ import_react8.default.createElement(import_antd8.Space.Compact, { style: { width: "100%", maxWidth: 560 } }, /* @__PURE__ */ import_react8.default.createElement(import_antd8.Input, { placeholder: "name (e.g. jira_api_key)", value: name, onChange: (e) => setName(e.target.value), style: { width: "35%" } }), /* @__PURE__ */ import_react8.default.createElement(import_antd8.Input.Password, { placeholder: "value", value, onChange: (e) => setValue(e.target.value), style: { width: "45%" } }), /* @__PURE__ */ import_react8.default.createElement(import_antd8.Button, { type: "primary", loading: busy, onClick: save, style: { width: "20%" } }, "Save")));
}
function SettingsPanel() {
  var _a, _b, _c, _d, _e, _f;
  const api = (0, import_client6.useAPIClient)();
  const [s, setS] = (0, import_react8.useState)(null);
  const [key, setKey] = (0, import_react8.useState)("");
  const [pricesText, setPricesText] = (0, import_react8.useState)("");
  const [ping, setPing] = (0, import_react8.useState)(null);
  const [spend, setSpend] = (0, import_react8.useState)(null);
  const [trend, setTrend] = (0, import_react8.useState)(null);
  usePoll(
    async () => {
      var _a2;
      try {
        const got = await neoaiAction(api, "getSettings", {});
        setS((prev) => prev != null ? prev : got);
        setPricesText((prev) => prev ? prev : got.prices ? JSON.stringify(got.prices, null, 2) : "");
        setPing(await neoaiAction(api, "ping", {}));
        setSpend(await neoaiAction(api, "spendToday", {}));
        setTrend(await neoaiAction(api, "spendTrend", {}));
      } catch (err) {
        import_antd8.message.error(`Load failed: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : err}`);
      }
    },
    36e5,
    s == null
  );
  if (!s) return /* @__PURE__ */ import_react8.default.createElement("div", { style: { padding: 20 } }, "Loading\u2026");
  const save = async () => {
    var _a2, _b2, _c2;
    let prices;
    if (pricesText.trim()) {
      try {
        prices = JSON.parse(pricesText);
      } catch (e) {
        import_antd8.message.error("Price table is not valid JSON");
        return;
      }
    }
    try {
      await neoaiAction(api, "saveSettings", {
        force_mock: s.force_mock === true,
        default_llm_service: (_a2 = s.default_llm_service) != null ? _a2 : "",
        default_model: (_b2 = s.default_model) != null ? _b2 : "gemini-2.5-flash",
        daily_budget_usd: Number(s.daily_budget_usd) || 0,
        image_price_usd: Number(s.image_price_usd) || 0.04,
        spend_alert_pct: Number(s.spend_alert_pct) || 80,
        ...prices !== void 0 ? { prices } : {},
        ...key ? { gemini_api_key: key } : {}
      });
      setKey("");
      import_antd8.message.success("Settings saved");
    } catch (err) {
      import_antd8.message.error(`Save failed: ${(_c2 = err == null ? void 0 : err.message) != null ? _c2 : err}`);
    }
  };
  return /* @__PURE__ */ import_react8.default.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ import_react8.default.createElement("div", { style: { fontSize: 18, fontWeight: 800, marginBottom: 16 } }, "Settings"), /* @__PURE__ */ import_react8.default.createElement(Section, { title: "Mode" }, /* @__PURE__ */ import_react8.default.createElement(
    Field2,
    {
      label: "Force mock mode",
      hint: "ON: every LLM/image node returns a labelled deterministic mock \u2014 zero spend, even though a real key is configured. For test rounds; turn OFF for real model calls."
    },
    /* @__PURE__ */ import_react8.default.createElement(import_antd8.Switch, { checked: s.force_mock === true, onChange: (v) => setS({ ...s, force_mock: v }) }),
    s.force_mock === true ? /* @__PURE__ */ import_react8.default.createElement(import_antd8.Tag, { color: "orange", style: { marginLeft: 10 } }, "mock mode active") : null
  )), /* @__PURE__ */ import_react8.default.createElement(Section, { title: "Model & provider" }, /* @__PURE__ */ import_react8.default.createElement(Field2, { label: "Default plugin-ai LLM service", hint: "Name of an llmService configured under Settings \u2192 AI. Empty = plugin-ai default / raw Gemini fallback." }, /* @__PURE__ */ import_react8.default.createElement(import_antd8.Input, { value: s.default_llm_service, onChange: (e) => setS({ ...s, default_llm_service: e.target.value }) })), /* @__PURE__ */ import_react8.default.createElement(Field2, { label: "Default model" }, /* @__PURE__ */ import_react8.default.createElement(import_antd8.Input, { value: s.default_model, placeholder: "gemini-2.5-flash", onChange: (e) => setS({ ...s, default_model: e.target.value }) })), /* @__PURE__ */ import_react8.default.createElement(
    Field2,
    {
      label: "Gemini API key (raw-path fallback + image nodes)",
      hint: s.geminiKeyFromEnv ? "GEMINI_API_KEY env var is set and wins \u2014 this field is a fallback." : s.geminiKeyConfigured ? "A key is configured. Leave empty to keep it; enter a new value to replace." : "No key configured yet."
    },
    /* @__PURE__ */ import_react8.default.createElement(import_antd8.Input.Password, { value: key, placeholder: s.geminiKeyConfigured ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022  (configured)" : "AIza\u2026", onChange: (e) => setKey(e.target.value) })
  )), /* @__PURE__ */ import_react8.default.createElement(Section, { title: "Cost management" }, /* @__PURE__ */ import_react8.default.createElement(Field2, { label: "Global daily budget (USD, 0 = unlimited)", hint: "Blocks further model calls once today's estimated spend across ALL workflows exceeds this." }, /* @__PURE__ */ import_react8.default.createElement(import_antd8.InputNumber, { min: 0, step: 0.5, value: Number(s.daily_budget_usd) || 0, onChange: (v) => setS({ ...s, daily_budget_usd: v != null ? v : 0 }) })), /* @__PURE__ */ import_react8.default.createElement(Field2, { label: "Estimated price per generated image (USD)" }, /* @__PURE__ */ import_react8.default.createElement(import_antd8.InputNumber, { min: 0, step: 0.01, value: Number(s.image_price_usd) || 0.04, onChange: (v) => setS({ ...s, image_price_usd: v != null ? v : 0.04 }) })), /* @__PURE__ */ import_react8.default.createElement(Field2, { label: "Price table override (JSON, USD per 1M tokens)", hint: 'Example: { "gemini-2.5-flash": { "in": 0.3, "out": 2.5 } }' }, /* @__PURE__ */ import_react8.default.createElement(
    import_antd8.Input.TextArea,
    {
      rows: 5,
      value: pricesText,
      onChange: (e) => setPricesText(e.target.value),
      style: { fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12 }
    }
  )), /* @__PURE__ */ import_react8.default.createElement(Field2, { label: "Proactive spend alert threshold (% of daily budget)", hint: "Shows a warning banner in the console once today's global spend crosses this \u2014 the hard block still only ever fires at 100% via the budget itself." }, /* @__PURE__ */ import_react8.default.createElement(import_antd8.InputNumber, { min: 1, max: 100, value: Number(s.spend_alert_pct) || 80, onChange: (v) => setS({ ...s, spend_alert_pct: v != null ? v : 80 }) }))), /* @__PURE__ */ import_react8.default.createElement(import_antd8.Button, { type: "primary", onClick: save }, "Save settings"), /* @__PURE__ */ import_react8.default.createElement("div", { style: { borderTop: "1px solid #ececea", margin: "24px 0 16px", maxWidth: 620 } }), /* @__PURE__ */ import_react8.default.createElement(SecretsSection, null), /* @__PURE__ */ import_react8.default.createElement("div", { style: { borderTop: "1px solid #ececea", margin: "24px 0 16px", maxWidth: 620 } }), /* @__PURE__ */ import_react8.default.createElement(Section, { title: "Plugin health" }, ping ? /* @__PURE__ */ import_react8.default.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: spend ? 14 : 0 } }, /* @__PURE__ */ import_react8.default.createElement(import_antd8.Tag, { color: "green" }, ping.plugin, " v", ping.version), /* @__PURE__ */ import_react8.default.createElement(import_antd8.Tag, { color: ping.pluginAi ? "green" : "orange" }, ping.pluginAi ? "plugin-ai available" : "plugin-ai NOT available (raw Gemini fallback)"), ping.sandbox ? /* @__PURE__ */ import_react8.default.createElement(import_antd8.Tag, { color: "orange" }, "sandbox") : null, /* @__PURE__ */ import_react8.default.createElement(import_antd8.Tag, null, ((_a = ping.collections) != null ? _a : []).length, " collections")) : null, spend ? /* @__PURE__ */ import_react8.default.createElement("div", null, /* @__PURE__ */ import_react8.default.createElement("div", { style: { fontSize: 12, color: "#8a8f8a", marginBottom: 4 } }, "Spend today (estimated)"), /* @__PURE__ */ import_react8.default.createElement(JsonBox, { value: spend, maxHeight: 140 })) : null), /* @__PURE__ */ import_react8.default.createElement(Section, { title: "Spend trend (last 30 days)" }, trend ? /* @__PURE__ */ import_react8.default.createElement(import_react8.default.Fragment, null, /* @__PURE__ */ import_react8.default.createElement("div", { style: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "#8a8f8a", marginBottom: 6 } }, "By day"), /* @__PURE__ */ import_react8.default.createElement(
    Sparkline,
    {
      data: Object.entries((_b = trend.byDay) != null ? _b : {}).sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ label: day, value: Number(v) }))
    }
  ), /* @__PURE__ */ import_react8.default.createElement("div", { style: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "#8a8f8a", margin: "16px 0 6px" } }, "Top workflows"), ((_c = trend.byWorkflow) != null ? _c : []).length === 0 ? /* @__PURE__ */ import_react8.default.createElement("div", { style: { fontSize: 12.5, color: "#8a8f8a" } }, "No spend recorded yet.") : ((_d = trend.byWorkflow) != null ? _d : []).slice(0, 8).map((w) => /* @__PURE__ */ import_react8.default.createElement("div", { key: w.workflowId, style: { display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" } }, /* @__PURE__ */ import_react8.default.createElement("span", null, w.name), /* @__PURE__ */ import_react8.default.createElement("b", null, "$", w.totalUsd.toFixed(2)))), /* @__PURE__ */ import_react8.default.createElement("div", { style: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "#8a8f8a", margin: "16px 0 6px" } }, "Top functions"), ((_e = trend.byFunction) != null ? _e : []).length === 0 ? /* @__PURE__ */ import_react8.default.createElement("div", { style: { fontSize: 12.5, color: "#8a8f8a" } }, "No spend recorded yet.") : ((_f = trend.byFunction) != null ? _f : []).slice(0, 8).map((f) => /* @__PURE__ */ import_react8.default.createElement("div", { key: f.functionKey, style: { display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" } }, /* @__PURE__ */ import_react8.default.createElement("code", null, f.functionKey), /* @__PURE__ */ import_react8.default.createElement("b", null, "$", f.totalUsd.toFixed(2))))) : null));
}

// src/client/console/MemoryPanel.tsx
var import_react9 = __toESM(require("react"));
var import_antd9 = require("antd");
var import_client7 = require("@nocobase/client");
var PENDING_SUFFIX = "__pending";
function baseKeyOf(key) {
  return key.endsWith(PENDING_SUFFIX) ? key.slice(0, -PENDING_SUFFIX.length) : key;
}
function isPendingKey(key) {
  return String(key != null ? key : "").endsWith(PENDING_SUFFIX);
}
var STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1e3;
var VERY_STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1e3;
function stalenessBadge(confirmedAt) {
  if (!confirmedAt) return null;
  const t = new Date(confirmedAt).getTime();
  if (Number.isNaN(t)) return null;
  const ageMs = Date.now() - t;
  if (ageMs > VERY_STALE_AFTER_MS) return /* @__PURE__ */ import_react9.default.createElement(import_antd9.Tag, { color: "red" }, "very stale");
  if (ageMs > STALE_AFTER_MS) return /* @__PURE__ */ import_react9.default.createElement(import_antd9.Tag, { color: "orange" }, "stale");
  return null;
}
function MemoryDetail({ row, confirmedSibling, onClose, onSaved }) {
  var _a, _b;
  const api = (0, import_client7.useAPIClient)();
  const isPending = String((_a = row.key) != null ? _a : "").endsWith(PENDING_SUFFIX);
  const [summary, setSummary] = (0, import_react9.useState)(String((_b = row.summary) != null ? _b : ""));
  const [busy, setBusy] = (0, import_react9.useState)(false);
  const confirm = async () => {
    var _a2, _b2;
    setBusy(true);
    try {
      const res = await neoaiAction(api, "memoryConfirm", { id: row.id, editedSummary: summary });
      if (res == null ? void 0 : res.ok) {
        import_antd9.message.success(isPending ? "Confirmed \u2014 swapped in over the previous version" : "Confirmed");
        onSaved();
        onClose();
      } else {
        import_antd9.message.error((_a2 = res == null ? void 0 : res.reason) != null ? _a2 : "Confirm failed");
      }
    } catch (err) {
      import_antd9.message.error(String((_b2 = err == null ? void 0 : err.message) != null ? _b2 : err));
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ import_react9.default.createElement(
    ConsoleDrawer,
    {
      open: true,
      title: /* @__PURE__ */ import_react9.default.createElement("span", null, /* @__PURE__ */ import_react9.default.createElement("code", { style: { fontSize: 13 } }, row.entity_type), /* @__PURE__ */ import_react9.default.createElement("span", { style: { color: "#8a8f8a" } }, " \xB7 "), /* @__PURE__ */ import_react9.default.createElement("code", { style: { fontSize: 13 } }, row.entity_id), /* @__PURE__ */ import_react9.default.createElement("span", { style: { color: "#8a8f8a" } }, " \xB7 "), baseKeyOf(row.key), isPending ? /* @__PURE__ */ import_react9.default.createElement(import_antd9.Tag, { color: "gold", style: { marginLeft: 8 } }, "pending review") : null, !isPending && row.status === "confirmed" ? /* @__PURE__ */ import_react9.default.createElement(import_antd9.Tag, { color: "green", style: { marginLeft: 8 } }, "confirmed") : null),
      onClose,
      footer: /* @__PURE__ */ import_react9.default.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8 } }, /* @__PURE__ */ import_react9.default.createElement(import_antd9.Button, { onClick: onClose }, "Close"), /* @__PURE__ */ import_react9.default.createElement(import_antd9.Button, { type: "primary", loading: busy, onClick: confirm }, isPending ? "Confirm & swap in" : row.status === "confirmed" ? "Save changes" : "Confirm"))
    },
    /* @__PURE__ */ import_react9.default.createElement("div", { style: { padding: 18, display: "flex", flexDirection: "column", gap: 14, maxWidth: 900 } }, isPending && confirmedSibling ? /* @__PURE__ */ import_react9.default.createElement("div", null, /* @__PURE__ */ import_react9.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", margin: "0 0 6px" } }, "CURRENTLY CONFIRMED (unaffected until you confirm the draft below)"), /* @__PURE__ */ import_react9.default.createElement(JsonBox, { value: confirmedSibling.summary, maxHeight: 140 })) : null, /* @__PURE__ */ import_react9.default.createElement("div", null, /* @__PURE__ */ import_react9.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", margin: "0 0 6px" } }, isPending ? "NEW DRAFT \u2014 REVIEW BEFORE CONFIRMING" : "SUMMARY"), /* @__PURE__ */ import_react9.default.createElement(import_antd9.Input.TextArea, { rows: 8, value: summary, onChange: (e) => setSummary(e.target.value) })), row.structured ? /* @__PURE__ */ import_react9.default.createElement("div", null, /* @__PURE__ */ import_react9.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", margin: "0 0 6px" } }, "STRUCTURED (Phase 2 \u2014 informational only, not applied anywhere yet)"), /* @__PURE__ */ import_react9.default.createElement(JsonBox, { value: row.structured, maxHeight: 200 })) : null, /* @__PURE__ */ import_react9.default.createElement("div", { style: { display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, color: "#5c605c" } }, /* @__PURE__ */ import_react9.default.createElement("span", null, /* @__PURE__ */ import_react9.default.createElement("b", null, "Updated by:"), " ", row.updated_by || "\u2014"), /* @__PURE__ */ import_react9.default.createElement("span", null, /* @__PURE__ */ import_react9.default.createElement("b", null, "Confirmed at:"), " ", fmtTime(row.confirmed_at)), /* @__PURE__ */ import_react9.default.createElement("span", null, /* @__PURE__ */ import_react9.default.createElement("b", null, "Source run:"), " ", row.source_run_id ? `#${row.source_run_id}` : "\u2014")))
  );
}
function MemoryPanel() {
  var _a, _b, _c;
  const api = (0, import_client7.useAPIClient)();
  const [rows, setRows] = (0, import_react9.useState)([]);
  const [entityType, setEntityType] = (0, import_react9.useState)("");
  const [entityId, setEntityId] = (0, import_react9.useState)("");
  const [pendingOnly, setPendingOnly] = (0, import_react9.useState)(false);
  const [openId, setOpenId] = (0, import_react9.useState)(null);
  const load = async () => {
    var _a2;
    try {
      const { rows: rows2 } = await listResource(api, "neoai_memories", { sort: "-id", pageSize: 500 });
      setRows(rows2);
    } catch (err) {
      import_antd9.message.error(`Load failed: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : err}`);
    }
  };
  usePoll(load, 15e3, openId == null);
  const filteredRows = (0, import_react9.useMemo)(() => {
    const et = entityType.trim().toLowerCase();
    const ei = entityId.trim().toLowerCase();
    return rows.filter((r) => {
      var _a2, _b2;
      if (pendingOnly && !isPendingKey(r.key)) return false;
      if (et && !String((_a2 = r.entity_type) != null ? _a2 : "").toLowerCase().includes(et)) return false;
      if (ei && !String((_b2 = r.entity_id) != null ? _b2 : "").toLowerCase().includes(ei)) return false;
      return true;
    }).map((r, idx) => ({ r, idx })).sort((a, b) => {
      const pa = isPendingKey(a.r.key) ? 0 : 1;
      const pb = isPendingKey(b.r.key) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return a.idx - b.idx;
    }).map(({ r }) => r);
  }, [rows, entityType, entityId, pendingOnly]);
  const openRow = (_a = rows.find((r) => r.id === openId)) != null ? _a : null;
  const confirmedSibling = openRow && String((_b = openRow.key) != null ? _b : "").endsWith(PENDING_SUFFIX) ? (_c = rows.find(
    (r) => r.entity_type === openRow.entity_type && r.entity_id === openRow.entity_id && r.key === baseKeyOf(openRow.key) && r.status === "confirmed"
  )) != null ? _c : null : null;
  const columns = [
    { title: "Entity type", dataIndex: "entity_type", width: 180, render: (v) => /* @__PURE__ */ import_react9.default.createElement("code", { style: { fontSize: 12 } }, v) },
    { title: "Entity id", dataIndex: "entity_id", width: 140, render: (v) => /* @__PURE__ */ import_react9.default.createElement("code", { style: { fontSize: 12 } }, v) },
    {
      title: "Key",
      dataIndex: "key",
      width: 160,
      render: (v) => String(v).endsWith(PENDING_SUFFIX) ? /* @__PURE__ */ import_react9.default.createElement("span", null, baseKeyOf(v), " ", /* @__PURE__ */ import_react9.default.createElement(import_antd9.Tag, { color: "gold" }, "pending")) : v
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: (v, r) => {
        var _a2;
        return String((_a2 = r.key) != null ? _a2 : "").endsWith(PENDING_SUFFIX) ? /* @__PURE__ */ import_react9.default.createElement(import_antd9.Tag, { color: "gold" }, "awaiting review") : /* @__PURE__ */ import_react9.default.createElement(import_antd9.Tag, { color: v === "confirmed" ? "green" : "default" }, v);
      }
    },
    { title: "Summary", dataIndex: "summary", render: (v) => /* @__PURE__ */ import_react9.default.createElement("span", { style: { color: "#3c4043" } }, (v != null ? v : "").slice(0, 140), (v != null ? v : "").length > 140 ? "\u2026" : "") },
    { title: "Updated by", dataIndex: "updated_by", width: 160 },
    {
      title: "Confirmed at",
      dataIndex: "confirmed_at",
      width: 190,
      render: (v) => /* @__PURE__ */ import_react9.default.createElement("span", null, fmtTime(v), " ", stalenessBadge(v))
    },
    {
      title: "",
      key: "act",
      width: 90,
      render: (_, r) => /* @__PURE__ */ import_react9.default.createElement(import_antd9.Button, { size: "small", onClick: () => setOpenId(r.id) }, "Open")
    }
  ];
  return /* @__PURE__ */ import_react9.default.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ import_react9.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" } }, /* @__PURE__ */ import_react9.default.createElement("div", { style: { fontSize: 18, fontWeight: 800 } }, "Memory"), /* @__PURE__ */ import_react9.default.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ import_react9.default.createElement(import_antd9.Input, { placeholder: "Filter entity type (e.g. crm.deal)", value: entityType, onChange: (e) => setEntityType(e.target.value), style: { width: 220 }, allowClear: true }), /* @__PURE__ */ import_react9.default.createElement(import_antd9.Input, { placeholder: "Filter entity id", value: entityId, onChange: (e) => setEntityId(e.target.value), style: { width: 160 }, allowClear: true }), /* @__PURE__ */ import_react9.default.createElement(import_antd9.Checkbox, { checked: pendingOnly, onChange: (e) => setPendingOnly(e.target.checked) }, "Pending review only"), /* @__PURE__ */ import_react9.default.createElement(import_antd9.Button, { onClick: load }, "Refresh")), /* @__PURE__ */ import_react9.default.createElement("p", { style: { fontSize: 12.5, color: "#8a8f8a", margin: "0 0 12px", maxWidth: 820 } }, 'Central, entity-agnostic AI memory: host plugins (CRM, Konfigurator, \u2026) write a draft summary about one of their records here; nothing feeds back into that record until a human opens it and confirms. Once confirmed, a later AI re-draft never overwrites it directly \u2014 it stages as a "pending" row you review and swap in explicitly.'), /* @__PURE__ */ import_react9.default.createElement(
    import_antd9.Table,
    {
      rowKey: "id",
      size: "middle",
      dataSource: filteredRows,
      columns,
      pagination: { pageSize: 25 },
      locale: { emptyText: rows.length ? "No memory rows match this filter" : "No memory rows yet" },
      onRow: (r) => ({ onClick: () => setOpenId(r.id), style: { cursor: "pointer" } })
    }
  ), openRow ? /* @__PURE__ */ import_react9.default.createElement(
    MemoryDetail,
    {
      row: openRow,
      confirmedSibling,
      onClose: () => setOpenId(null),
      onSaved: load
    }
  ) : null);
}

// src/client/console/NeoaiConsole.tsx
var TABS = [
  { key: "workflows", label: "AI Workflows", icon: "PartitionOutlined" },
  { key: "runs", label: "Runs", icon: "PlayCircleOutlined" },
  { key: "approvals", label: "Approvals", icon: "CheckSquareOutlined" },
  { key: "functions", label: "Functions", icon: "ApiOutlined" },
  { key: "mcp", label: "MCP Servers", icon: "CloudServerOutlined" },
  { key: "memory", label: "Memory", icon: "DatabaseOutlined" },
  { key: "settings", label: "Settings", icon: "SettingOutlined" }
];
function SpendAlertBanner() {
  const api = (0, import_client8.useAPIClient)();
  const [pct, setPct] = (0, import_react10.useState)(null);
  const [alertPct, setAlertPct] = (0, import_react10.useState)(80);
  usePoll(
    async () => {
      try {
        const [settings, spend] = await Promise.all([neoaiAction(api, "getSettings", {}), neoaiAction(api, "spendToday", {})]);
        setAlertPct(Number(settings == null ? void 0 : settings.spend_alert_pct) || 80);
        const budget = Number(settings == null ? void 0 : settings.daily_budget_usd) || 0;
        if (!budget) {
          setPct(null);
          return;
        }
        setPct((Number(spend == null ? void 0 : spend.global) || 0) / budget * 100);
      } catch (e) {
      }
    },
    6e4,
    true
  );
  if (pct == null || pct < alertPct) return null;
  return /* @__PURE__ */ import_react10.default.createElement(
    import_antd10.Alert,
    {
      type: pct >= 100 ? "error" : "warning",
      showIcon: true,
      banner: true,
      message: pct >= 100 ? `Global daily budget exhausted (${pct.toFixed(0)}% of budget) \u2014 further model calls are blocked.` : `Global spend today has crossed ${pct.toFixed(0)}% of the daily budget.`
    }
  );
}
var CROSS_LINKS = [
  // NocoBase plugin-workflow admin — the business-automation layer stays there,
  // but is reachable from the NeoAI menu (one automation hub).
  { label: "Automation", icon: "DeploymentUnitOutlined", href: "/admin/settings/workflow", hint: "NocoBase workflows" },
  { label: "Admin", icon: "HomeOutlined", href: "/admin" }
];
function activeTabFromPath(pathname) {
  var _a;
  const m = pathname.match(/neoai\/?([a-z-]*)/i);
  const key = ((_a = m == null ? void 0 : m[1]) != null ? _a : "").toLowerCase();
  return TABS.some((t) => t.key === key) ? key : "workflows";
}
function SideItem(props) {
  return /* @__PURE__ */ import_react10.default.createElement(
    "div",
    {
      onClick: props.onClick,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        borderRadius: 9,
        cursor: "pointer",
        fontWeight: props.active ? 600 : 500,
        color: props.active ? NEOHOME_GREEN : props.muted ? "#8a8f8a" : "#3c4043",
        background: props.active ? "#eaf7ea" : "transparent",
        fontSize: 13.5,
        userSelect: "none"
      }
    },
    /* @__PURE__ */ import_react10.default.createElement(import_client8.Icon, { type: props.icon }),
    /* @__PURE__ */ import_react10.default.createElement("span", null, props.label)
  );
}
function NeoaiConsolePage() {
  (0, import_react10.useEffect)(() => {
    ensureInterFont();
  }, []);
  const pathname = window.location.pathname;
  const embedded = pathname.startsWith("/admin");
  const prefix = embedded ? "/admin" : "";
  const active = activeTabFromPath(pathname);
  const go = (href) => window.location.assign(href);
  return /* @__PURE__ */ import_react10.default.createElement(import_antd10.ConfigProvider, { theme: NEOHOME_THEME, getPopupContainer: (n) => {
    var _a;
    return (_a = n == null ? void 0 : n.parentElement) != null ? _a : document.body;
  } }, /* @__PURE__ */ import_react10.default.createElement(
    "div",
    {
      style: {
        display: "flex",
        height: embedded ? "calc(100vh - 46px)" : "100vh",
        background: "#fff",
        fontFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
        color: "#1b1e21"
      }
    },
    /* @__PURE__ */ import_react10.default.createElement(
      "aside",
      {
        style: {
          width: 216,
          borderRight: "1px solid #ececea",
          padding: "14px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          flexShrink: 0
        }
      },
      /* @__PURE__ */ import_react10.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9, padding: "2px 8px 12px" } }, /* @__PURE__ */ import_react10.default.createElement("img", { src: NEOMODUL_FAVICON_SRC, alt: "Neomodul", style: { width: 26, height: 26, borderRadius: 7 } }), /* @__PURE__ */ import_react10.default.createElement("span", { style: { fontWeight: 800, fontSize: 15, letterSpacing: "-.01em" } }, "NeoAI")),
      TABS.map((t) => /* @__PURE__ */ import_react10.default.createElement(SideItem, { key: t.key, icon: t.icon, label: t.label, active: active === t.key, onClick: () => go(`${prefix}/neoai/${t.key}`) })),
      /* @__PURE__ */ import_react10.default.createElement("div", { style: { borderTop: "1px solid #ececea", margin: "10px 4px" } }),
      CROSS_LINKS.map((l) => /* @__PURE__ */ import_react10.default.createElement(SideItem, { key: l.href, icon: l.icon, label: l.label, muted: true, onClick: () => go(l.href) })),
      /* @__PURE__ */ import_react10.default.createElement("div", { style: { flex: 1 } }),
      /* @__PURE__ */ import_react10.default.createElement("div", { style: { fontSize: 10.5, color: "#b0b4ba", padding: "0 8px 4px" } }, "Admin-only \xB7 tree workflows \xB7 Gemini via plugin-ai")
    ),
    /* @__PURE__ */ import_react10.default.createElement("main", { style: { flex: 1, overflow: "auto", minWidth: 0, background: "#fff" } }, /* @__PURE__ */ import_react10.default.createElement(SpendAlertBanner, null), active === "workflows" ? /* @__PURE__ */ import_react10.default.createElement(WorkflowsPanel, null) : null, active === "runs" ? /* @__PURE__ */ import_react10.default.createElement(RunsPanel, null) : null, active === "approvals" ? /* @__PURE__ */ import_react10.default.createElement(ApprovalsPanel, null) : null, active === "functions" ? /* @__PURE__ */ import_react10.default.createElement(FunctionsPanel, null) : null, active === "mcp" ? /* @__PURE__ */ import_react10.default.createElement(McpServersPanel, null) : null, active === "memory" ? /* @__PURE__ */ import_react10.default.createElement(MemoryPanel, null) : null, active === "settings" ? /* @__PURE__ */ import_react10.default.createElement(SettingsPanel, null) : null)
  ));
}

// src/client/console/KnowledgeConsole.tsx
var import_react11 = __toESM(require("react"));
var import_antd11 = require("antd");
var import_client9 = require("@nocobase/client");
var TABS2 = [
  { key: "articles", label: "Articles", icon: "FileTextOutlined" },
  { key: "prompts", label: "AI Prompts", icon: "RobotOutlined" },
  { key: "suggestions", label: "Suggestions", icon: "CheckSquareOutlined" },
  { key: "retrieval", label: "Retrieval test", icon: "ExperimentOutlined" }
];
var USE_CASE_SUGGESTIONS = [
  "general",
  "whatsapp-reply",
  "email-draft",
  "lead-qualification",
  "project-coordination",
  "konfigurator.catalog-assist"
];
function activeTabFromPath2(pathname) {
  var _a;
  const m = pathname.match(/neoai-knowledge\/?([a-z]*)/i);
  const key = ((_a = m == null ? void 0 : m[1]) != null ? _a : "").toLowerCase();
  return TABS2.some((t) => t.key === key) ? key : "articles";
}
function SideItem2(props) {
  return /* @__PURE__ */ import_react11.default.createElement(
    "div",
    {
      onClick: props.onClick,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        borderRadius: 9,
        cursor: "pointer",
        fontWeight: props.active ? 600 : 500,
        color: props.active ? NEOHOME_GREEN : props.muted ? "#8a8f8a" : "#3c4043",
        background: props.active ? "#eaf7ea" : "transparent",
        fontSize: 13.5,
        userSelect: "none"
      }
    },
    /* @__PURE__ */ import_react11.default.createElement(import_client9.Icon, { type: props.icon }),
    /* @__PURE__ */ import_react11.default.createElement("span", null, props.label)
  );
}
function LinkedItemsSection({ articleId }) {
  const api = (0, import_client9.useAPIClient)();
  const [rows, setRows] = (0, import_react11.useState)([]);
  const [loading, setLoading] = (0, import_react11.useState)(false);
  const [entityType, setEntityType] = (0, import_react11.useState)("");
  const [entityId, setEntityId] = (0, import_react11.useState)("");
  const [label, setLabel] = (0, import_react11.useState)("");
  const [saving, setSaving] = (0, import_react11.useState)(false);
  const load = async () => {
    var _a;
    setLoading(true);
    try {
      const { rows: rows2 } = await listResource(api, "neoai_knowledge_links", {
        filter: JSON.stringify({ article_id: articleId }),
        sort: "-id",
        pageSize: 200
      });
      setRows(rows2);
    } catch (err) {
      import_antd11.message.error(`Load failed: ${(_a = err == null ? void 0 : err.message) != null ? _a : err}`);
    } finally {
      setLoading(false);
    }
  };
  (0, import_react11.useEffect)(() => {
    load();
  }, [articleId]);
  const addLink = async () => {
    if (!entityType.trim() || !entityId.trim()) {
      import_antd11.message.error("Entity type and entity id are required");
      return;
    }
    setSaving(true);
    try {
      await createResource(api, "neoai_knowledge_links", {
        article_id: articleId,
        entity_type: entityType.trim(),
        entity_id: entityId.trim(),
        label: label.trim()
      });
      setEntityType("");
      setEntityId("");
      setLabel("");
      await load();
      import_antd11.message.success("Link added");
    } catch (err) {
      import_antd11.message.error((err == null ? void 0 : err.message) || "Failed to add link");
    } finally {
      setSaving(false);
    }
  };
  const removeLink = async (id) => {
    await api.resource("neoai_knowledge_links").destroy({ filterByTk: id });
    await load();
  };
  return /* @__PURE__ */ import_react11.default.createElement("div", { style: { marginTop: 18 } }, /* @__PURE__ */ import_react11.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", margin: "0 0 8px" } }, "LINKED ITEMS \u2014 cross-entity references (catalog options, CRM deals, \u2026)"), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Spin, { spinning: loading }, rows.length ? /* @__PURE__ */ import_react11.default.createElement(import_antd11.Space, { direction: "vertical", size: 6, style: { width: "100%", marginBottom: 12 } }, rows.map((r) => /* @__PURE__ */ import_react11.default.createElement(
    "div",
    {
      key: r.id,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px",
        background: "#fafaf8",
        border: "1px solid #ececea",
        borderRadius: 8
      }
    },
    /* @__PURE__ */ import_react11.default.createElement(import_antd11.Typography.Text, { code: true, style: { fontSize: 12 } }, r.entity_type),
    /* @__PURE__ */ import_react11.default.createElement(import_antd11.Typography.Text, { code: true, style: { fontSize: 12 } }, r.entity_id),
    r.label ? /* @__PURE__ */ import_react11.default.createElement(import_antd11.Typography.Text, { style: { fontSize: 12.5, color: "#5c605c" } }, r.label) : null,
    /* @__PURE__ */ import_react11.default.createElement("div", { style: { flex: 1 } }),
    /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { size: "small", danger: true, onClick: () => removeLink(r.id) }, "Remove")
  ))) : /* @__PURE__ */ import_react11.default.createElement(import_antd11.Empty, { image: import_antd11.Empty.PRESENTED_IMAGE_SIMPLE, description: "No linked items yet", style: { padding: 12 } })), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Space, { size: 8, wrap: true }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Input, { placeholder: 'Entity type (e.g. "konfigurator.catalog_option")', value: entityType, onChange: (e) => setEntityType(e.target.value), style: { width: 260 } }), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Input, { placeholder: "Entity id", value: entityId, onChange: (e) => setEntityId(e.target.value), style: { width: 140 } }), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Input, { placeholder: "Label (optional)", value: label, onChange: (e) => setLabel(e.target.value), style: { width: 200 } }), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { type: "primary", loading: saving, onClick: addLink }, "Add link")));
}
function ArticleEditorDrawer(props) {
  var _a, _b;
  const { editor, onClose, onMutated } = props;
  const api = (0, import_client9.useAPIClient)();
  const [saving, setSaving] = (0, import_react11.useState)(false);
  const [deleting, setDeleting] = (0, import_react11.useState)(false);
  const open = !!editor;
  const record = (_a = editor == null ? void 0 : editor.record) != null ? _a : null;
  const done = (msg) => {
    import_antd11.message.success(msg);
    onMutated();
    onClose();
  };
  const onFinish = async (raw) => {
    var _a2;
    setSaving(true);
    try {
      const values = {
        title: String(raw.title || "").trim(),
        use_case: String(raw.use_case || "").trim(),
        language: raw.language || "en",
        tags: String(raw.tags || "").trim(),
        body: (_a2 = raw.body) != null ? _a2 : "",
        active: !!raw.active
      };
      if ((record == null ? void 0 : record.id) != null) {
        await updateResource(api, "neoai_knowledge_articles", record.id, values);
        done("Article updated");
      } else {
        await createResource(api, "neoai_knowledge_articles", { ...values, source: "manual" });
        done("Article created");
      }
    } catch (e) {
      import_antd11.message.error((e == null ? void 0 : e.message) || "Save failed");
    } finally {
      setSaving(false);
    }
  };
  const onDelete = async () => {
    if ((record == null ? void 0 : record.id) == null) return;
    setDeleting(true);
    try {
      await api.resource("neoai_knowledge_articles").destroy({ filterByTk: record.id });
      done("Article deleted");
    } catch (e) {
      import_antd11.message.error((e == null ? void 0 : e.message) || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };
  return /* @__PURE__ */ import_react11.default.createElement(ConsoleDrawer, { open, onClose, title: record ? String(record.title || `Article #${record.id}`) : "New article" }, open ? /* @__PURE__ */ import_react11.default.createElement("div", { style: { padding: 18, maxWidth: 900 } }, /* @__PURE__ */ import_react11.default.createElement(
    import_antd11.Form,
    {
      key: (_b = record == null ? void 0 : record.id) != null ? _b : "new",
      layout: "vertical",
      initialValues: { use_case: "general", language: "en", active: true, ...record || {} },
      onFinish
    },
    record ? /* @__PURE__ */ import_react11.default.createElement(import_antd11.Typography.Paragraph, { type: "secondary", style: { fontSize: 12, marginBottom: 16 } }, "Created ", fmtTime(record.createdAt), " \xB7 Updated ", fmtTime(record.updatedAt), " \xB7 Source: ", /* @__PURE__ */ import_react11.default.createElement(import_antd11.Tag, null, record.source || "manual")) : null,
    /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { name: "title", label: "Title", rules: [{ required: true, whitespace: true, message: "Title is required" }] }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Input, { placeholder: "Article title" })),
    /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { name: "use_case", label: "Use case", extra: "Free text \u2014 spans multiple plugins' use cases (CRM, Konfigurator, \u2026). Suggestions below." }, /* @__PURE__ */ import_react11.default.createElement(
      import_antd11.Select,
      {
        mode: "tags",
        maxCount: 1,
        options: USE_CASE_SUGGESTIONS.map((v) => ({ value: v, label: v })),
        placeholder: "general"
      }
    )),
    /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { name: "language", label: "Language" }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Select, { options: [{ value: "en", label: "English" }, { value: "de", label: "German" }, { value: "pl", label: "Polish" }] })),
    /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { name: "tags", label: "Tags (comma-separated)" }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Input, { placeholder: "plot, financing, timeline" })),
    /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { name: "body", label: "Body" }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Input.TextArea, { rows: 12, placeholder: "Article body\u2026" })),
    /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { name: "active", label: "Active", valuePropName: "checked", extra: "Inactive articles stay editable but are invisible to retrieval." }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Switch, null)),
    /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { style: { marginTop: 8, marginBottom: 0 } }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Space, null, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { type: "primary", htmlType: "submit", loading: saving }, record ? "Save" : "Create"), record ? /* @__PURE__ */ import_react11.default.createElement(import_antd11.Popconfirm, { title: "Delete this article?", okText: "Delete", okButtonProps: { danger: true }, onConfirm: onDelete }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { danger: true, loading: deleting }, "Delete")) : null, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { onClick: onClose, disabled: saving || deleting }, "Cancel")))
  ), (record == null ? void 0 : record.id) != null ? /* @__PURE__ */ import_react11.default.createElement(LinkedItemsSection, { articleId: record.id }) : null) : null);
}
function ArticlesPanel() {
  const api = (0, import_client9.useAPIClient)();
  const [rows, setRows] = (0, import_react11.useState)([]);
  const [loading, setLoading] = (0, import_react11.useState)(false);
  const [searchText, setSearchText] = (0, import_react11.useState)("");
  const [query, setQuery] = (0, import_react11.useState)("");
  const [editor, setEditor] = (0, import_react11.useState)(null);
  const load = async () => {
    var _a;
    setLoading(true);
    try {
      const q = query.trim();
      const { rows: rows2 } = await listResource(api, "neoai_knowledge_articles", {
        sort: "-updatedAt",
        pageSize: 200,
        ...q ? { filter: JSON.stringify({ title: { $includes: q } }) } : {}
      });
      setRows(rows2);
    } catch (err) {
      import_antd11.message.error(`Load failed: ${(_a = err == null ? void 0 : err.message) != null ? _a : err}`);
    } finally {
      setLoading(false);
    }
  };
  usePoll(load, 3e4, editor == null);
  (0, import_react11.useEffect)(() => {
    load();
  }, [query]);
  const columns = [
    { title: "Title", dataIndex: "title", key: "title", ellipsis: true, render: (v) => /* @__PURE__ */ import_react11.default.createElement("a", null, v || "(untitled)") },
    { title: "Use case", dataIndex: "use_case", key: "use_case", width: 190, render: (v) => v ? /* @__PURE__ */ import_react11.default.createElement(import_antd11.Tag, null, v) : "\u2014" },
    { title: "Language", dataIndex: "language", key: "language", width: 90 },
    { title: "Tags", dataIndex: "tags", key: "tags", ellipsis: true, render: (v) => v || "\u2014" },
    { title: "Active", dataIndex: "active", key: "active", width: 80, align: "center", render: (v) => v ? "\u2713" : "\u2014" },
    { title: "Source", dataIndex: "source", key: "source", width: 120, render: (v) => /* @__PURE__ */ import_react11.default.createElement(import_antd11.Tag, { color: v === "ai-suggested" ? "gold" : v === "crm-migration" ? "blue" : "default" }, v || "manual") },
    { title: "Updated", dataIndex: "updatedAt", key: "updatedAt", width: 150, render: (v) => fmtTime(v) }
  ];
  return /* @__PURE__ */ import_react11.default.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Space, { style: { marginBottom: 16, flexWrap: "wrap" }, size: 12 }, /* @__PURE__ */ import_react11.default.createElement(
    import_antd11.Input.Search,
    {
      allowClear: true,
      placeholder: "Search by title\u2026",
      style: { width: 320 },
      value: searchText,
      onChange: (e) => setSearchText(e.target.value),
      onSearch: setQuery
    }
  ), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { type: "primary", onClick: () => setEditor({ record: null }) }, "New article"), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { onClick: load, loading }, "Refresh"), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Typography.Text, { type: "secondary" }, rows.length, " article(s)")), /* @__PURE__ */ import_react11.default.createElement(
    import_antd11.Table,
    {
      rowKey: "id",
      size: "middle",
      loading,
      dataSource: rows,
      columns,
      pagination: { pageSize: 20 },
      onRow: (record) => ({ onClick: () => setEditor({ record }), style: { cursor: "pointer" } }),
      locale: { emptyText: /* @__PURE__ */ import_react11.default.createElement(import_antd11.Empty, { image: import_antd11.Empty.PRESENTED_IMAGE_SIMPLE, description: "No articles yet" }) }
    }
  ), /* @__PURE__ */ import_react11.default.createElement(ArticleEditorDrawer, { editor, onClose: () => setEditor(null), onMutated: load }));
}
function PromptEditorDrawer(props) {
  var _a, _b;
  const { editor, onClose, onMutated } = props;
  const api = (0, import_client9.useAPIClient)();
  const [saving, setSaving] = (0, import_react11.useState)(false);
  const [deleting, setDeleting] = (0, import_react11.useState)(false);
  const open = !!editor;
  const record = (_a = editor == null ? void 0 : editor.record) != null ? _a : null;
  const done = (msg) => {
    import_antd11.message.success(msg);
    onMutated();
    onClose();
  };
  const onFinish = async (raw) => {
    var _a2, _b2;
    setSaving(true);
    try {
      const values = {
        use_case: String(raw.use_case || "").trim(),
        title: String(raw.title || "").trim(),
        system_prompt: (_a2 = raw.system_prompt) != null ? _a2 : "",
        model_hint: String(raw.model_hint || "").trim(),
        active: !!raw.active,
        notes: (_b2 = raw.notes) != null ? _b2 : ""
      };
      if ((record == null ? void 0 : record.id) != null) {
        await updateResource(api, "neoai_prompts", record.id, values);
        done("Prompt updated");
      } else {
        await createResource(api, "neoai_prompts", values);
        done("Prompt created");
      }
    } catch (e) {
      import_antd11.message.error((e == null ? void 0 : e.message) || "Save failed");
    } finally {
      setSaving(false);
    }
  };
  const onDelete = async () => {
    if ((record == null ? void 0 : record.id) == null) return;
    setDeleting(true);
    try {
      await api.resource("neoai_prompts").destroy({ filterByTk: record.id });
      done("Prompt deleted");
    } catch (e) {
      import_antd11.message.error((e == null ? void 0 : e.message) || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };
  const MONO = 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace';
  return /* @__PURE__ */ import_react11.default.createElement(ConsoleDrawer, { open, onClose, title: record ? String(record.title || record.use_case || `Prompt #${record.id}`) : "New prompt" }, open ? /* @__PURE__ */ import_react11.default.createElement("div", { style: { padding: 18, maxWidth: 900 } }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form, { key: (_b = record == null ? void 0 : record.id) != null ? _b : "new", layout: "vertical", initialValues: { active: true, ...record || {} }, onFinish }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { name: "use_case", label: "Use case key", rules: [{ required: true, whitespace: true, message: "Use case key is required" }], extra: "Lookup key \u2014 e.g. crm.leadQualification consumers resolve prompts by this exact key." }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Input, { placeholder: "e.g. lead-qualification" })), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { name: "title", label: "Title" }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Input, { placeholder: "Prompt title" })), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { name: "system_prompt", label: "System prompt" }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Input.TextArea, { rows: 14, style: { fontFamily: MONO, fontSize: 12 }, placeholder: "System prompt text\u2026" })), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { name: "model_hint", label: "Model hint", extra: "Advisory only \u2014 the actual model comes from plugin-ai's LLM service configuration." }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Input, { placeholder: "e.g. gemini-2.5-flash" })), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { name: "active", label: "Active", valuePropName: "checked" }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Switch, null)), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { name: "notes", label: "Notes" }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Input.TextArea, { rows: 3 })), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Form.Item, { style: { marginTop: 8, marginBottom: 0 } }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Space, null, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { type: "primary", htmlType: "submit", loading: saving }, record ? "Save" : "Create"), record ? /* @__PURE__ */ import_react11.default.createElement(import_antd11.Popconfirm, { title: "Delete this prompt?", okText: "Delete", okButtonProps: { danger: true }, onConfirm: onDelete }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { danger: true, loading: deleting }, "Delete")) : null, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { onClick: onClose, disabled: saving || deleting }, "Cancel"))))) : null);
}
function PromptsPanel() {
  const api = (0, import_client9.useAPIClient)();
  const [rows, setRows] = (0, import_react11.useState)([]);
  const [loading, setLoading] = (0, import_react11.useState)(false);
  const [editor, setEditor] = (0, import_react11.useState)(null);
  const load = async () => {
    var _a;
    setLoading(true);
    try {
      const { rows: rows2 } = await listResource(api, "neoai_prompts", { sort: "-updatedAt", pageSize: 200 });
      setRows(rows2);
    } catch (err) {
      import_antd11.message.error(`Load failed: ${(_a = err == null ? void 0 : err.message) != null ? _a : err}`);
    } finally {
      setLoading(false);
    }
  };
  usePoll(load, 3e4, editor == null);
  const columns = [
    { title: "Use case key", dataIndex: "use_case", key: "use_case", width: 220, render: (v) => /* @__PURE__ */ import_react11.default.createElement(import_antd11.Typography.Text, { code: true }, v) },
    { title: "Title", dataIndex: "title", key: "title", ellipsis: true },
    { title: "Model hint", dataIndex: "model_hint", key: "model_hint", ellipsis: true, render: (v) => v || "\u2014" },
    { title: "Active", dataIndex: "active", key: "active", width: 80, align: "center", render: (v) => v ? "\u2713" : "\u2014" },
    { title: "Updated", dataIndex: "updatedAt", key: "updatedAt", width: 150, render: (v) => fmtTime(v) }
  ];
  return /* @__PURE__ */ import_react11.default.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Space, { style: { marginBottom: 16, flexWrap: "wrap" }, size: 12 }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { type: "primary", onClick: () => setEditor({ record: null }) }, "New prompt"), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { onClick: load, loading }, "Refresh"), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Typography.Text, { type: "secondary" }, rows.length, " prompt(s)")), /* @__PURE__ */ import_react11.default.createElement(
    import_antd11.Table,
    {
      rowKey: "id",
      size: "middle",
      loading,
      dataSource: rows,
      columns,
      pagination: { pageSize: 20 },
      onRow: (record) => ({ onClick: () => setEditor({ record }), style: { cursor: "pointer" } }),
      locale: { emptyText: /* @__PURE__ */ import_react11.default.createElement(import_antd11.Empty, { image: import_antd11.Empty.PRESENTED_IMAGE_SIMPLE, description: "No prompts yet" }) }
    }
  ), /* @__PURE__ */ import_react11.default.createElement(PromptEditorDrawer, { editor, onClose: () => setEditor(null), onMutated: load }));
}
function SuggestionsPanel() {
  const api = (0, import_client9.useAPIClient)();
  const [rows, setRows] = (0, import_react11.useState)([]);
  const [loading, setLoading] = (0, import_react11.useState)(false);
  const [showAll, setShowAll] = (0, import_react11.useState)(false);
  const [busyId, setBusyId] = (0, import_react11.useState)(null);
  const load = async () => {
    var _a;
    setLoading(true);
    try {
      const { rows: rows2 } = await listResource(api, "neoai_knowledge_suggestions", {
        sort: "-id",
        pageSize: 200,
        appends: ["target_article", "source_run"],
        ...showAll ? {} : { filter: JSON.stringify({ status: "pending" }) }
      });
      setRows(rows2);
    } catch (err) {
      import_antd11.message.error(`Load failed: ${(_a = err == null ? void 0 : err.message) != null ? _a : err}`);
    } finally {
      setLoading(false);
    }
  };
  usePoll(load, 15e3, busyId == null);
  (0, import_react11.useEffect)(() => {
    load();
  }, [showAll]);
  const approve = (row) => {
    import_antd11.Modal.confirm({
      title: row.target_article ? `Approve edit to "${row.target_article.title}"?` : "Approve new article?",
      icon: null,
      width: 560,
      okText: "Approve",
      cancelText: "Cancel",
      content: /* @__PURE__ */ import_react11.default.createElement("div", { style: { fontSize: 13 } }, /* @__PURE__ */ import_react11.default.createElement("p", { style: { marginBottom: 8 } }, /* @__PURE__ */ import_react11.default.createElement("b", null, "Proposed title:"), " ", row.proposed_title || "\u2014"), /* @__PURE__ */ import_react11.default.createElement("p", { style: { marginBottom: 8, whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" } }, /* @__PURE__ */ import_react11.default.createElement("b", null, "Proposed body:"), /* @__PURE__ */ import_react11.default.createElement("br", null), row.proposed_body || "\u2014"), /* @__PURE__ */ import_react11.default.createElement("p", { style: { marginBottom: 0, color: "#8a8f8a" } }, row.target_article ? "This will overwrite the target article with the proposed fields." : "This will create a brand-new article (source: ai-suggested).")),
      onOk: async () => {
        var _a;
        setBusyId(row.id);
        try {
          const res = await neoaiAction(api, "knowledgeSuggestionApprove", { id: row.id });
          if (res == null ? void 0 : res.ok) {
            import_antd11.message.success("Suggestion approved");
            await load();
          } else {
            import_antd11.message.error((res == null ? void 0 : res.reason) || "Approve failed");
          }
        } catch (err) {
          import_antd11.message.error(String((_a = err == null ? void 0 : err.message) != null ? _a : err));
        } finally {
          setBusyId(null);
        }
      }
    });
  };
  const reject = (row) => {
    import_antd11.Modal.confirm({
      title: "Reject this suggestion?",
      icon: null,
      okText: "Reject",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      content: "The article stays exactly as it is \u2014 nothing is written except this suggestion's own status.",
      onOk: async () => {
        var _a;
        setBusyId(row.id);
        try {
          const res = await neoaiAction(api, "knowledgeSuggestionReject", { id: row.id });
          if (res == null ? void 0 : res.ok) {
            import_antd11.message.success("Suggestion rejected");
            await load();
          } else {
            import_antd11.message.error((res == null ? void 0 : res.reason) || "Reject failed");
          }
        } catch (err) {
          import_antd11.message.error(String((_a = err == null ? void 0 : err.message) != null ? _a : err));
        } finally {
          setBusyId(null);
        }
      }
    });
  };
  const columns = [
    {
      title: "Target",
      key: "target",
      width: 220,
      render: (_, r) => r.target_article ? /* @__PURE__ */ import_react11.default.createElement(import_antd11.Typography.Text, null, r.target_article.title) : /* @__PURE__ */ import_react11.default.createElement(import_antd11.Tag, { color: "gold" }, "New article")
    },
    { title: "Proposed title", dataIndex: "proposed_title", key: "proposed_title", ellipsis: true, render: (v) => v || "\u2014" },
    { title: "Reason", dataIndex: "reason", key: "reason", ellipsis: true, render: (v) => v || "\u2014" },
    {
      title: "Source run",
      key: "source_run",
      width: 110,
      render: (_, r) => r.source_run_id ? /* @__PURE__ */ import_react11.default.createElement(import_antd11.Typography.Text, { code: true }, "#", r.source_run_id) : "\u2014"
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (v) => /* @__PURE__ */ import_react11.default.createElement(import_antd11.Tag, { color: v === "pending" ? "gold" : v === "approved" ? "green" : "default" }, v)
    },
    {
      title: "",
      key: "act",
      width: 190,
      render: (_, r) => r.status === "pending" ? /* @__PURE__ */ import_react11.default.createElement(import_antd11.Space, null, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { size: "small", type: "primary", loading: busyId === r.id, onClick: () => approve(r) }, "Approve"), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { size: "small", danger: true, loading: busyId === r.id, onClick: () => reject(r) }, "Reject")) : /* @__PURE__ */ import_react11.default.createElement("span", { style: { fontSize: 12, color: "#8a8f8a" } }, r.reviewed_by ? `by ${r.reviewed_by}` : "", " ", r.reviewed_at ? fmtTime(r.reviewed_at) : "")
    }
  ];
  return /* @__PURE__ */ import_react11.default.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ import_react11.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" } }, /* @__PURE__ */ import_react11.default.createElement("div", { style: { fontSize: 18, fontWeight: 800 } }, "Suggestions"), /* @__PURE__ */ import_react11.default.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Checkbox, { checked: showAll, onChange: (e) => setShowAll(e.target.checked) }, "Show all (not just pending)"), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Button, { onClick: load, loading }, "Refresh")), /* @__PURE__ */ import_react11.default.createElement("p", { style: { fontSize: 12.5, color: "#8a8f8a", margin: "0 0 12px", maxWidth: 820 } }, "The ONLY way AI/workflow code can affect Knowledge: every suggestion below waits for a human decision here. Approving either updates the target article or creates a new one (source: ai-suggested); rejecting never touches any article."), /* @__PURE__ */ import_react11.default.createElement(
    import_antd11.Table,
    {
      rowKey: "id",
      size: "middle",
      loading,
      dataSource: rows,
      columns,
      pagination: { pageSize: 20 },
      locale: { emptyText: showAll ? "No suggestions yet" : "Nothing pending review right now" }
    }
  ));
}
var fmtScore = (v) => Number.isFinite(Number(v)) ? String(Math.round(Number(v) * 10) / 10) : "?";
function RetrievalPanel() {
  const api = (0, import_client9.useAPIClient)();
  const [searchText, setSearchText] = (0, import_react11.useState)("");
  const [useCase, setUseCase] = (0, import_react11.useState)("");
  const [limit, setLimit] = (0, import_react11.useState)(8);
  const [loading, setLoading] = (0, import_react11.useState)(false);
  const [ran, setRan] = (0, import_react11.useState)(null);
  const run = async (raw) => {
    const q = (raw || "").trim();
    if (!q) {
      setRan(null);
      return;
    }
    setLoading(true);
    try {
      const data = await neoaiAction(api, "knowledgeSearch", { q, useCase: useCase || void 0, limit: limit || 8 });
      setRan({ q, hits: Array.isArray(data == null ? void 0 : data.results) ? data.results : [] });
    } catch (e) {
      import_antd11.message.error((e == null ? void 0 : e.message) || "Search failed");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ import_react11.default.createElement("div", { style: { padding: 20, maxWidth: 900 } }, /* @__PURE__ */ import_react11.default.createElement("div", { style: { fontSize: 18, fontWeight: 800, marginBottom: 6 } }, "Retrieval test"), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Typography.Paragraph, { type: "secondary", style: { marginBottom: 16 } }, "Runs the exact keyword scorer (neoai:knowledgeSearch) used by AI context assembly \u2014 tune tags/wording here and see which snippets a draft/workflow would receive."), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Space, { size: 12, wrap: true, style: { marginBottom: 16 } }, /* @__PURE__ */ import_react11.default.createElement(
    import_antd11.Input.Search,
    {
      allowClear: true,
      enterButton: "Search",
      placeholder: "Search knowledge\u2026",
      style: { width: 460 },
      value: searchText,
      onChange: (e) => setSearchText(e.target.value),
      onSearch: run,
      loading
    }
  ), /* @__PURE__ */ import_react11.default.createElement(
    import_antd11.Select,
    {
      allowClear: true,
      value: useCase || void 0,
      onChange: (v) => setUseCase(v != null ? v : ""),
      style: { width: 220 },
      placeholder: "Any use case",
      options: USE_CASE_SUGGESTIONS.map((v) => ({ value: v, label: v }))
    }
  ), /* @__PURE__ */ import_react11.default.createElement(import_antd11.InputNumber, { min: 1, max: 20, precision: 0, addonBefore: "Limit", style: { width: 140 }, value: limit, onChange: (v) => setLimit(v) })), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Spin, { spinning: loading }, !ran ? /* @__PURE__ */ import_react11.default.createElement(import_antd11.Empty, { image: import_antd11.Empty.PRESENTED_IMAGE_SIMPLE, style: { padding: 48 }, description: "Type a query and press search" }) : ran.hits.length === 0 ? /* @__PURE__ */ import_react11.default.createElement(import_antd11.Empty, { style: { padding: 48 }, description: `No hits for "${ran.q}"` }) : /* @__PURE__ */ import_react11.default.createElement(import_antd11.Space, { direction: "vertical", size: 12, style: { width: "100%" } }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Typography.Text, { type: "secondary" }, ran.hits.length, ' hit(s) for "', ran.q, '"'), ran.hits.map((hit, i) => {
    var _a, _b;
    return /* @__PURE__ */ import_react11.default.createElement(import_antd11.Card, { key: (_a = hit.id) != null ? _a : i, size: "small" }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Space, { size: 8, wrap: true, style: { marginBottom: 8 } }, /* @__PURE__ */ import_react11.default.createElement(import_antd11.Typography.Text, { strong: true }, hit.title || `Article #${(_b = hit.id) != null ? _b : "?"}`), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Tag, { color: NEOHOME_GREEN }, "score ", fmtScore(hit.score)), hit.use_case ? /* @__PURE__ */ import_react11.default.createElement(import_antd11.Tag, null, hit.use_case) : null), /* @__PURE__ */ import_react11.default.createElement(import_antd11.Typography.Paragraph, { type: "secondary", style: { marginBottom: 0, whiteSpace: "pre-wrap" } }, hit.snippet || "\u2014"));
  }))));
}
function KnowledgeConsolePage() {
  (0, import_react11.useEffect)(() => {
    ensureInterFont();
  }, []);
  const pathname = window.location.pathname;
  const embedded = pathname.startsWith("/admin");
  const prefix = embedded ? "/admin" : "";
  const active = activeTabFromPath2(pathname);
  const go = (href) => window.location.assign(href);
  return /* @__PURE__ */ import_react11.default.createElement(import_antd11.ConfigProvider, { theme: NEOHOME_THEME, getPopupContainer: (n) => {
    var _a;
    return (_a = n == null ? void 0 : n.parentElement) != null ? _a : document.body;
  } }, /* @__PURE__ */ import_react11.default.createElement(
    "div",
    {
      style: {
        display: "flex",
        height: embedded ? "calc(100vh - 46px)" : "100vh",
        background: "#fff",
        fontFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
        color: "#1b1e21"
      }
    },
    /* @__PURE__ */ import_react11.default.createElement(
      "aside",
      {
        style: {
          width: 216,
          borderRight: "1px solid #ececea",
          padding: "14px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          flexShrink: 0
        }
      },
      /* @__PURE__ */ import_react11.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9, padding: "2px 8px 12px" } }, /* @__PURE__ */ import_react11.default.createElement("img", { src: NEOMODUL_FAVICON_SRC, alt: "Neomodul", style: { width: 26, height: 26, borderRadius: 7 } }), /* @__PURE__ */ import_react11.default.createElement("span", { style: { fontWeight: 800, fontSize: 15, letterSpacing: "-.01em" } }, "Knowledge")),
      TABS2.map((t) => /* @__PURE__ */ import_react11.default.createElement(SideItem2, { key: t.key, icon: t.icon, label: t.label, active: active === t.key, onClick: () => go(`${prefix}/neoai-knowledge/${t.key}`) })),
      /* @__PURE__ */ import_react11.default.createElement("div", { style: { borderTop: "1px solid #ececea", margin: "10px 4px" } }),
      /* @__PURE__ */ import_react11.default.createElement(SideItem2, { icon: "RobotOutlined", label: "NeoAI", muted: true, onClick: () => go(`${prefix}/neoai/workflows`) }),
      /* @__PURE__ */ import_react11.default.createElement(SideItem2, { icon: "HomeOutlined", label: "Admin", muted: true, onClick: () => go("/admin") }),
      /* @__PURE__ */ import_react11.default.createElement("div", { style: { flex: 1 } }),
      /* @__PURE__ */ import_react11.default.createElement("div", { style: { fontSize: 10.5, color: "#b0b4ba", padding: "0 8px 4px" } }, "Human-gated \xB7 AI can only suggest")
    ),
    /* @__PURE__ */ import_react11.default.createElement("main", { style: { flex: 1, overflow: "auto", minWidth: 0, background: "#fff" } }, active === "articles" ? /* @__PURE__ */ import_react11.default.createElement(ArticlesPanel, null) : null, active === "prompts" ? /* @__PURE__ */ import_react11.default.createElement(PromptsPanel, null) : null, active === "suggestions" ? /* @__PURE__ */ import_react11.default.createElement(SuggestionsPanel, null) : null, active === "retrieval" ? /* @__PURE__ */ import_react11.default.createElement(RetrievalPanel, null) : null)
  ));
}

// src/client/index.tsx
var NeoaiRunInstruction = class extends import_client11.Instruction {
  constructor() {
    super(...arguments);
    this.title = "NeoAI workflow";
    this.type = "neoai-run";
    this.group = "extended";
    this.description = "Run a published NeoAI workflow (tree of LLM/HTTP/data steps) and wait for its result.";
    this.fieldset = {
      workflowKey: {
        type: "string",
        title: "NeoAI workflow",
        required: true,
        description: "Only published workflows (current_version > 0) are offered \u2014 the bound automation always runs the published version, never a draft.",
        "x-decorator": "FormItem",
        "x-component": "RemoteSelect",
        "x-component-props": {
          placeholder: "Select a published NeoAI workflow\u2026",
          fieldNames: { label: "name", value: "key" },
          service: {
            resource: "neoai_workflows",
            action: "list",
            params: {
              filter: { current_version: { $gt: 0 } },
              fields: ["key", "name", "current_version"],
              sort: ["name"],
              pageSize: 200
            }
          }
        }
      },
      inputJson: {
        type: "string",
        title: "Input (JSON)",
        "x-decorator": "FormItem",
        "x-component": "Input.TextArea",
        "x-component-props": { rows: 4, placeholder: '{ "address": "\u2026" }' }
      },
      includeContext: {
        type: "boolean",
        title: "Pass trigger context to the workflow as {{input.$trigger}}",
        default: true,
        "x-decorator": "FormItem",
        "x-component": "Checkbox"
      }
    };
  }
};
var NeoaiClientPlugin = class extends import_client10.Plugin {
  /**
   * Automation bridge UI: contribute the "neoai-run" node to NocoBase's
   * plugin-workflow editor as a PLAIN instruction object (no import from
   * plugin-workflow — its client registry accepts instances; a hard AMD dep
   * would break this bundle whenever plugin-workflow is disabled). Load order
   * between plugins isn't guaranteed, so retry once shortly after load.
   */
  registerAutomationBridgeUI(attempt = 0) {
    var _a, _b;
    try {
      const wf = (_b = (_a = this.app.pm) == null ? void 0 : _a.get) == null ? void 0 : _b.call(_a, "workflow");
      if (!(wf == null ? void 0 : wf.registerInstruction)) {
        if (attempt < 3) setTimeout(() => this.registerAutomationBridgeUI(attempt + 1), 1500);
        return;
      }
      wf.registerInstruction("neoai-run", NeoaiRunInstruction);
      console.info("[neoai] automation bridge UI registered");
    } catch (err) {
      console.warn("[neoai] automation bridge UI registration failed (non-fatal)", err);
    }
  }
  async load() {
    this.app.router.add("admin.neoai", { path: "neoai", Component: NeoaiConsolePage });
    this.app.router.add("admin.neoaiWorkflows", { path: "neoai/workflows", Component: NeoaiConsolePage });
    this.app.router.add("admin.neoaiRuns", { path: "neoai/runs", Component: NeoaiConsolePage });
    this.app.router.add("admin.neoaiApprovals", { path: "neoai/approvals", Component: NeoaiConsolePage });
    this.app.router.add("admin.neoaiFunctions", { path: "neoai/functions", Component: NeoaiConsolePage });
    this.app.router.add("admin.neoaiMcp", { path: "neoai/mcp", Component: NeoaiConsolePage });
    this.app.router.add("admin.neoaiMemory", { path: "neoai/memory", Component: NeoaiConsolePage });
    this.app.router.add("admin.neoaiSettings", { path: "neoai/settings", Component: NeoaiConsolePage });
    this.app.router.add("neoai", { path: "/neoai", Component: NeoaiConsolePage });
    this.app.router.add("neoai-workflows", { path: "/neoai/workflows", Component: NeoaiConsolePage });
    this.app.router.add("neoai-runs", { path: "/neoai/runs", Component: NeoaiConsolePage });
    this.app.router.add("neoai-approvals", { path: "/neoai/approvals", Component: NeoaiConsolePage });
    this.app.router.add("neoai-functions", { path: "/neoai/functions", Component: NeoaiConsolePage });
    this.app.router.add("neoai-mcp", { path: "/neoai/mcp", Component: NeoaiConsolePage });
    this.app.router.add("neoai-memory", { path: "/neoai/memory", Component: NeoaiConsolePage });
    this.app.router.add("neoai-settings", { path: "/neoai/settings", Component: NeoaiConsolePage });
    this.app.router.add("admin.neoaiKnowledge", { path: "neoai-knowledge", Component: KnowledgeConsolePage });
    this.app.router.add("admin.neoaiKnowledgeArticles", { path: "neoai-knowledge/articles", Component: KnowledgeConsolePage });
    this.app.router.add("admin.neoaiKnowledgePrompts", { path: "neoai-knowledge/prompts", Component: KnowledgeConsolePage });
    this.app.router.add("admin.neoaiKnowledgeSuggestions", { path: "neoai-knowledge/suggestions", Component: KnowledgeConsolePage });
    this.app.router.add("admin.neoaiKnowledgeRetrieval", { path: "neoai-knowledge/retrieval", Component: KnowledgeConsolePage });
    this.app.router.add("neoai-knowledge", { path: "/neoai-knowledge", Component: KnowledgeConsolePage });
    this.app.router.add("neoai-knowledge-articles", { path: "/neoai-knowledge/articles", Component: KnowledgeConsolePage });
    this.app.router.add("neoai-knowledge-prompts", { path: "/neoai-knowledge/prompts", Component: KnowledgeConsolePage });
    this.app.router.add("neoai-knowledge-suggestions", { path: "/neoai-knowledge/suggestions", Component: KnowledgeConsolePage });
    this.app.router.add("neoai-knowledge-retrieval", { path: "/neoai-knowledge/retrieval", Component: KnowledgeConsolePage });
    this.registerAutomationBridgeUI();
  }
};
var client_default = NeoaiClientPlugin;

  return module.exports;
});
