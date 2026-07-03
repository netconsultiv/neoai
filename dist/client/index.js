(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // NocoBase / RequireJS path — register the module under its package name.
    define("@neomodul/neoai", ["@nocobase/client","react","react-dom","antd","@formily/react","@formily/core","react-i18next"], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS fallback (Node, tests).
    module.exports = factory(require("@nocobase/client"), require("react"), require("react-dom"), require("antd"), require("@formily/react"), require("@formily/core"), require("react-i18next"));
  } else {
    // Bare browser global fallback.
    var g = typeof globalThis !== 'undefined' ? globalThis : this;
    g["@neomodul/neoai"] = factory(
      g['@nocobase/client'], g.React, g.ReactDOM, g.antd,
      g['@formily/react'], g['@formily/core'], g.reactI18next
    );
  }
})(function (nocobaseClient, React, ReactDOM, antd, formilyReact, formilyCore, reactI18next) {
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
var import_client5 = require("@nocobase/client");

// src/client/console/NeoaiConsole.tsx
var import_react5 = __toESM(require("react"));
var import_antd5 = require("antd");
var import_client4 = require("@nocobase/client");

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

// src/client/console/WorkflowsPanel.tsx
var import_react2 = __toESM(require("react"));
var import_antd2 = require("antd");
var import_client = require("@nocobase/client");

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
var NODE_TYPES = [
  { type: "llm", label: "LLM", hint: "Gemini text call (prompt + optional JSON schema)" },
  { type: "image", label: "Image", hint: "Gemini image generation (raw REST path)" },
  { type: "http", label: "HTTP", hint: "Call an external API" },
  { type: "data", label: "Data", hint: "Read/write a NocoBase collection" },
  { type: "transform", label: "Transform", hint: "Map values between nodes" },
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
  const [text, setText] = (0, import_react2.useState)(() => props.value == null ? "" : JSON.stringify(props.value, null, 2));
  const [bad, setBad] = (0, import_react2.useState)(false);
  const lastValue = (0, import_react2.useRef)(props.value);
  if (lastValue.current !== props.value) {
    lastValue.current = props.value;
    const s = props.value == null ? "" : JSON.stringify(props.value, null, 2);
    if (s !== text) {
      setText(s);
      setBad(false);
    }
  }
  return /* @__PURE__ */ import_react2.default.createElement(
    import_antd2.Input.TextArea,
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
  return /* @__PURE__ */ import_react2.default.createElement("div", { style: { marginBottom: 10 } }, /* @__PURE__ */ import_react2.default.createElement("div", { style: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "#8a8f8a", marginBottom: 4 } }, label), children);
}
function AddSlot({ onAdd }) {
  return /* @__PURE__ */ import_react2.default.createElement(
    import_antd2.Dropdown,
    {
      menu: {
        items: NODE_TYPES.map((t) => ({ key: t.type, label: `${t.label} \u2014 ${t.hint}` })),
        onClick: ({ key }) => onAdd(String(key))
      },
      trigger: ["click"]
    },
    /* @__PURE__ */ import_react2.default.createElement("div", { style: { display: "flex", justifyContent: "center", padding: "2px 0", cursor: "pointer" }, title: "Add node" }, /* @__PURE__ */ import_react2.default.createElement(
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
  const { node, selected } = props;
  const label = (_b = (_a = NODE_TYPES.find((t) => t.type === node.type)) == null ? void 0 : _a.label) != null ? _b : node.type;
  return /* @__PURE__ */ import_react2.default.createElement(
    "div",
    {
      onClick: (e) => {
        e.stopPropagation();
        props.onSelect();
      },
      style: {
        border: `1.5px solid ${selected ? NEOHOME_GREEN : "#e2e4e1"}`,
        borderRadius: 10,
        background: "#fff",
        padding: "8px 10px",
        cursor: "pointer",
        boxShadow: selected ? "0 1px 6px rgba(0,153,0,.15)" : "none"
      }
    },
    /* @__PURE__ */ import_react2.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Tag, { color: (_c = TYPE_COLORS[node.type]) != null ? _c : "default", style: { marginRight: 0 } }, label), /* @__PURE__ */ import_react2.default.createElement("span", { style: { fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, node.title || node.id), /* @__PURE__ */ import_react2.default.createElement("span", { style: { display: "flex", gap: 4 }, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Button, { size: "small", type: "text", onClick: () => props.onMove(-1), title: "Move up" }, "\u2191"), /* @__PURE__ */ import_react2.default.createElement(import_antd2.Button, { size: "small", type: "text", onClick: () => props.onMove(1), title: "Move down" }, "\u2193"), /* @__PURE__ */ import_react2.default.createElement(import_antd2.Button, { size: "small", type: "text", danger: true, onClick: props.onDelete, title: "Delete" }, "\u2715"))),
    props.children
  );
}
function NodeList(props) {
  const { nodes, def } = props;
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
  return /* @__PURE__ */ import_react2.default.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2 } }, nodes.map((node, i) => /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, { key: node.id }, /* @__PURE__ */ import_react2.default.createElement(AddSlot, { onAdd: (t) => insert(i, t) }), /* @__PURE__ */ import_react2.default.createElement(
    NodeCard,
    {
      node,
      selected: props.selectedId === node.id,
      onSelect: () => props.onSelect(node.id),
      onDelete: () => del(i),
      onMove: (dir) => move(i, dir)
    },
    node.branches && node.branches.length > 0 ? /* @__PURE__ */ import_react2.default.createElement("div", { style: { display: "flex", gap: 8, marginTop: 8, alignItems: "stretch", overflowX: "auto" } }, node.branches.map((branch, bi) => /* @__PURE__ */ import_react2.default.createElement(
      "div",
      {
        key: bi,
        style: {
          flex: "1 0 200px",
          minWidth: 200,
          border: "1px dashed #d8dbd7",
          borderRadius: 8,
          padding: "6px 6px 4px",
          background: "#fafbf9"
        }
      },
      /* @__PURE__ */ import_react2.default.createElement("div", { style: { display: "flex", alignItems: "center", marginBottom: 4 } }, /* @__PURE__ */ import_react2.default.createElement("span", { style: { fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", color: "#8a8f8a", flex: 1 } }, branchLabel(node, bi)), node.type === "parallel" && node.branches.length > 1 ? /* @__PURE__ */ import_react2.default.createElement(
        import_antd2.Button,
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
      /* @__PURE__ */ import_react2.default.createElement(NodeList, { nodes: branch, selectedId: props.selectedId, onSelect: props.onSelect, onChange: props.onChange, def })
    )), node.type === "parallel" ? /* @__PURE__ */ import_react2.default.createElement(
      import_antd2.Button,
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
  ))), /* @__PURE__ */ import_react2.default.createElement(AddSlot, { onAdd: (t) => insert(nodes.length, t) }));
}
function NodeConfigForm({ node, onChange }) {
  var _a, _b, _c, _d, _e, _f, _g;
  const cfg = (_a = node.config) != null ? _a : node.config = {};
  const set = (k, v) => {
    cfg[k] = v;
    onChange();
  };
  const common = /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Title" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input, { value: node.title, placeholder: node.id, onChange: (e) => (node.title = e.target.value, onChange()) }));
  const retries = /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Retries on failure" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.InputNumber, { min: 0, max: 5, value: (_b = cfg.retries) != null ? _b : 0, onChange: (v) => set("retries", v != null ? v : 0) }));
  let body = null;
  switch (node.type) {
    case "llm":
      body = /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Model (empty = default)" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input, { value: cfg.model, placeholder: "gemini-2.5-flash", onChange: (e) => set("model", e.target.value || void 0) })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "plugin-ai service (empty = default)" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input, { value: cfg.service, onChange: (e) => set("service", e.target.value || void 0) })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "System prompt" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input.TextArea, { rows: 3, value: cfg.system, onChange: (e) => set("system", e.target.value || void 0) })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Prompt (templates: {{input.x}}, {{nodes.<id>.y}})" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input.TextArea, { rows: 6, value: cfg.prompt, onChange: (e) => set("prompt", e.target.value) })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "JSON schema (optional \u2014 forces JSON output)" }, /* @__PURE__ */ import_react2.default.createElement(JsonArea, { value: cfg.jsonSchema, onChange: (v) => set("jsonSchema", v), rows: 5 })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Temperature" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.InputNumber, { min: 0, max: 2, step: 0.1, value: (_c = cfg.temperature) != null ? _c : 0.2, onChange: (v) => set("temperature", v != null ? v : 0.2) })), retries);
      break;
    case "image":
      body = /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Model" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input, { value: cfg.model, placeholder: "gemini-2.5-flash-image", onChange: (e) => set("model", e.target.value || void 0) })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Prompt" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input.TextArea, { rows: 5, value: cfg.prompt, onChange: (e) => set("prompt", e.target.value) })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Input image (template \u2192 data URL, optional)" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input, { value: cfg.image, placeholder: "{{input.image}}", onChange: (e) => set("image", e.target.value || void 0) })), retries);
      break;
    case "http":
      body = /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Method" }, /* @__PURE__ */ import_react2.default.createElement(
        import_antd2.Select,
        {
          value: (_d = cfg.method) != null ? _d : "GET",
          onChange: (v) => set("method", v),
          options: ["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => ({ value: m, label: m })),
          style: { width: 120 }
        }
      )), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "URL (templated)" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input, { value: cfg.url, onChange: (e) => set("url", e.target.value) })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Headers (JSON)" }, /* @__PURE__ */ import_react2.default.createElement(JsonArea, { value: cfg.headers, onChange: (v) => set("headers", v), rows: 3 })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Body (string or JSON; templated)" }, /* @__PURE__ */ import_react2.default.createElement(
        import_antd2.Input.TextArea,
        {
          rows: 4,
          value: typeof cfg.body === "string" ? cfg.body : cfg.body ? JSON.stringify(cfg.body, null, 2) : "",
          onChange: (e) => set("body", e.target.value || void 0)
        }
      )), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Response type" }, /* @__PURE__ */ import_react2.default.createElement(
        import_antd2.Select,
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
    case "data":
      body = /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Collection" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input, { value: cfg.collection, placeholder: "konfigurator_plots", onChange: (e) => set("collection", e.target.value) })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Operation" }, /* @__PURE__ */ import_react2.default.createElement(
        import_antd2.Select,
        {
          value: (_f = cfg.op) != null ? _f : "list",
          onChange: (v) => set("op", v),
          options: ["list", "get", "create", "update"].map((o) => ({ value: o, label: o })),
          style: { width: 140 }
        }
      )), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Filter (JSON, templated)" }, /* @__PURE__ */ import_react2.default.createElement(JsonArea, { value: cfg.filter, onChange: (v) => set("filter", v), rows: 3 })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Values (JSON, for create/update)" }, /* @__PURE__ */ import_react2.default.createElement(JsonArea, { value: cfg.values, onChange: (v) => set("values", v), rows: 3 })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Allow write" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Checkbox, { checked: cfg.allowWrite === true, onChange: (e) => set("allowWrite", e.target.checked) }, "permit create/update (explicit opt-in)")));
      break;
    case "transform":
      body = /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Map (JSON of templates)" }, /* @__PURE__ */ import_react2.default.createElement(JsonArea, { value: cfg.map, onChange: (v) => set("map", v != null ? v : {}), rows: 8, placeholder: '{ "lat": "{{nodes.geo.body.0.lat}}" }' }));
      break;
    case "condition":
      body = /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Left (templated)" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input, { value: cfg.left, onChange: (e) => set("left", e.target.value) })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Operator" }, /* @__PURE__ */ import_react2.default.createElement(
        import_antd2.Select,
        {
          value: (_g = cfg.op) != null ? _g : "notEmpty",
          onChange: (v) => set("op", v),
          options: ["truthy", "eq", "ne", "gt", "gte", "lt", "lte", "contains", "empty", "notEmpty"].map((o) => ({ value: o, label: o })),
          style: { width: 160 }
        }
      )), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Right (templated)" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input, { value: cfg.right, onChange: (e) => set("right", e.target.value) })));
      break;
    case "loop":
      body = /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Items (template \u2192 array; body sees {{item}} / {{index}})" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input, { value: cfg.items, placeholder: "{{nodes.list.rows}}", onChange: (e) => set("items", e.target.value) }));
      break;
    case "human_gate":
      body = /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Message shown to the approver (templated)" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input.TextArea, { rows: 3, value: cfg.message, onChange: (e) => set("message", e.target.value) }));
      break;
    case "subworkflow":
      body = /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Workflow key" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input, { value: cfg.workflowKey, onChange: (e) => set("workflowKey", e.target.value) })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Input (JSON of templates)" }, /* @__PURE__ */ import_react2.default.createElement(JsonArea, { value: cfg.input, onChange: (v) => set("input", v != null ? v : {}), rows: 4 })));
      break;
    case "output":
      body = /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Result map (JSON of templates)" }, /* @__PURE__ */ import_react2.default.createElement(JsonArea, { value: cfg.map, onChange: (v) => set("map", v != null ? v : {}), rows: 6 })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "End run here" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Checkbox, { checked: cfg.end === true, onChange: (e) => set("end", e.target.checked) }, "stop the workflow after this node")));
      break;
    default:
      body = null;
  }
  return /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, common, /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Node id" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input, { value: node.id, disabled: true })), body);
}
function TestRunBox({ workflowId }) {
  var _a, _b, _c, _d, _e, _f;
  const api = (0, import_client.useAPIClient)();
  const [inputText, setInputText] = (0, import_react2.useState)('{\n  "address": "Am Hochbeh\xE4lter, 91166 Georgensgm\xFCnd"\n}');
  const [runId, setRunId] = (0, import_react2.useState)(null);
  const [data, setData] = (0, import_react2.useState)({});
  const active = !!runId && !["succeeded", "failed", "cancelled", "rejected"].includes(String((_b = (_a = data.run) == null ? void 0 : _a.status) != null ? _b : ""));
  usePoll(
    async () => {
      if (!runId) return;
      try {
        setData(await neoaiAction(api, "runStatus", { runId }));
      } catch (e) {
      }
    },
    2e3,
    !!runId && active
  );
  const start = async () => {
    var _a2;
    let input = {};
    try {
      input = inputText.trim() ? JSON.parse(inputText) : {};
    } catch (e) {
      import_antd2.message.error("Test input is not valid JSON");
      return;
    }
    try {
      const res = await neoaiAction(api, "run", { workflowId, input, draft: true, confirmed: true, trigger: "test" });
      if (res.error) {
        import_antd2.message.error(res.error);
        return;
      }
      setRunId(res.runId);
      setData({});
    } catch (err) {
      import_antd2.message.error(String((_a2 = err == null ? void 0 : err.message) != null ? _a2 : err));
    }
  };
  return /* @__PURE__ */ import_react2.default.createElement("div", null, /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Test input (JSON)" }, /* @__PURE__ */ import_react2.default.createElement(
    import_antd2.Input.TextArea,
    {
      rows: 4,
      value: inputText,
      onChange: (e) => setInputText(e.target.value),
      style: { fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12 }
    }
  )), /* @__PURE__ */ import_react2.default.createElement(import_antd2.Space, null, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Button, { type: "primary", onClick: start }, "Run draft test"), runId ? /* @__PURE__ */ import_react2.default.createElement("span", { style: { fontSize: 12, color: "#8a8f8a" } }, "run #", runId) : null, data.run ? /* @__PURE__ */ import_react2.default.createElement(StatusTag, { status: data.run.status }) : null), ((_c = data.steps) != null ? _c : []).length > 0 ? /* @__PURE__ */ import_react2.default.createElement("div", { style: { marginTop: 10, display: "flex", flexDirection: "column", gap: 4 } }, ((_d = data.steps) != null ? _d : []).map((s) => /* @__PURE__ */ import_react2.default.createElement("div", { key: s.id, style: { display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 } }, /* @__PURE__ */ import_react2.default.createElement(StatusTag, { status: s.status }), /* @__PURE__ */ import_react2.default.createElement("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, s.title || s.node_id), /* @__PURE__ */ import_react2.default.createElement("span", { style: { color: "#8a8f8a" } }, fmtDuration(s.duration_ms)), /* @__PURE__ */ import_react2.default.createElement("span", { style: { color: "#8a8f8a" } }, fmtCost(s.cost_usd))))) : null, ((_e = data.run) == null ? void 0 : _e.status) === "succeeded" ? /* @__PURE__ */ import_react2.default.createElement("div", { style: { marginTop: 8 } }, /* @__PURE__ */ import_react2.default.createElement(JsonBox, { value: data.run.output, maxHeight: 200 })) : null, ((_f = data.run) == null ? void 0 : _f.status) === "failed" ? /* @__PURE__ */ import_react2.default.createElement("div", { style: { marginTop: 8, color: "#b02a2a", fontSize: 12.5 } }, data.run.error) : null);
}
function WorkflowEditor(props) {
  var _a;
  const api = (0, import_client.useAPIClient)();
  const [wf, setWf] = (0, import_react2.useState)(props.row);
  const defRef = (0, import_react2.useRef)(
    props.row.definition_draft && Array.isArray(props.row.definition_draft.nodes) ? JSON.parse(JSON.stringify(props.row.definition_draft)) : { nodes: [] }
  );
  const [selectedId, setSelectedId] = (0, import_react2.useState)(null);
  const [dirty, setDirty] = (0, import_react2.useState)(false);
  const [, setTick] = (0, import_react2.useState)(0);
  const rerender = () => {
    setDirty(true);
    setTick((n) => n + 1);
  };
  const selected = selectedId ? findNode(defRef.current.nodes, selectedId) : null;
  if (selectedId && !selected && selectedId !== null) {
    setSelectedId(null);
  }
  const saveDraft = async () => {
    var _a2, _b;
    try {
      await updateResource(api, "neoai_workflows", wf.id, {
        definition_draft: defRef.current,
        name: wf.name,
        require_confirm: wf.require_confirm === true,
        daily_budget_usd: Number(wf.daily_budget_usd) || 0,
        description: (_a2 = wf.description) != null ? _a2 : ""
      });
      setDirty(false);
      import_antd2.message.success("Draft saved");
      return true;
    } catch (err) {
      import_antd2.message.error(`Save failed: ${(_b = err == null ? void 0 : err.message) != null ? _b : err}`);
      return false;
    }
  };
  const publish = async () => {
    var _a2, _b;
    if (dirty && !await saveDraft()) return;
    try {
      const res = await neoaiAction(api, "publishWorkflow", { workflowId: wf.id });
      if (res.ok) {
        import_antd2.message.success(`Published as version ${res.version}`);
        setWf({ ...wf, current_version: res.version });
      } else {
        import_antd2.message.error(`Not publishable: ${((_a2 = res.errors) != null ? _a2 : []).join(" \xB7 ")}`);
      }
    } catch (err) {
      import_antd2.message.error(`Publish failed: ${(_b = err == null ? void 0 : err.message) != null ? _b : err}`);
    }
  };
  return /* @__PURE__ */ import_react2.default.createElement(
    ConsoleDrawer,
    {
      open: true,
      title: /* @__PURE__ */ import_react2.default.createElement("span", null, wf.name, " ", /* @__PURE__ */ import_react2.default.createElement("span", { style: { color: "#8a8f8a", fontWeight: 400, fontSize: 13 } }, "(", wf.key, " \xB7 v", (_a = wf.current_version) != null ? _a : 0, dirty ? " \xB7 unsaved changes" : "", ")")),
      extra: /* @__PURE__ */ import_react2.default.createElement(import_antd2.Space, null, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Button, { onClick: saveDraft, disabled: !dirty }, "Save draft"), /* @__PURE__ */ import_react2.default.createElement(import_antd2.Button, { type: "primary", onClick: publish }, "Publish")),
      onClose: () => props.onClose(true)
    },
    /* @__PURE__ */ import_react2.default.createElement("div", { style: { display: "flex", minHeight: "100%", alignItems: "stretch" } }, /* @__PURE__ */ import_react2.default.createElement("div", { style: { flex: 1, padding: 18, minWidth: 0 } }, /* @__PURE__ */ import_react2.default.createElement("div", { style: { maxWidth: 860 } }, /* @__PURE__ */ import_react2.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", margin: "0 0 6px" } }, "WORKFLOW TREE"), /* @__PURE__ */ import_react2.default.createElement(NodeList, { nodes: defRef.current.nodes, selectedId, onSelect: setSelectedId, onChange: rerender, def: defRef.current }))), /* @__PURE__ */ import_react2.default.createElement("div", { style: { width: 400, borderLeft: "1px solid #ececea", background: "#fff", padding: 16, overflow: "auto" } }, selected ? /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", marginBottom: 8 } }, "NODE SETTINGS"), /* @__PURE__ */ import_react2.default.createElement(NodeConfigForm, { node: selected, onChange: rerender })) : /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", marginBottom: 8 } }, "WORKFLOW SETTINGS"), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Name" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input, { value: wf.name, onChange: (e) => (setWf({ ...wf, name: e.target.value }), setDirty(true)) })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Description" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Input.TextArea, { rows: 3, value: wf.description, onChange: (e) => (setWf({ ...wf, description: e.target.value }), setDirty(true)) })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Require confirmation before each run" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Switch, { checked: wf.require_confirm === true, onChange: (v) => (setWf({ ...wf, require_confirm: v }), setDirty(true)) })), /* @__PURE__ */ import_react2.default.createElement(Field, { label: "Daily budget (USD, 0 = unlimited)" }, /* @__PURE__ */ import_react2.default.createElement(import_antd2.InputNumber, { min: 0, step: 0.5, value: Number(wf.daily_budget_usd) || 0, onChange: (v) => (setWf({ ...wf, daily_budget_usd: v != null ? v : 0 }), setDirty(true)) })), /* @__PURE__ */ import_react2.default.createElement("div", { style: { borderTop: "1px solid #ececea", margin: "14px 0" } }), /* @__PURE__ */ import_react2.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", marginBottom: 8 } }, "TEST RUN (draft)"), /* @__PURE__ */ import_react2.default.createElement(TestRunBox, { workflowId: wf.id }))))
  );
}
function WorkflowsPanel() {
  const api = (0, import_client.useAPIClient)();
  const [rows, setRows] = (0, import_react2.useState)([]);
  const [loading, setLoading] = (0, import_react2.useState)(false);
  const [editing, setEditing] = (0, import_react2.useState)(null);
  const [creating, setCreating] = (0, import_react2.useState)(false);
  const [newName, setNewName] = (0, import_react2.useState)("");
  const load = async () => {
    var _a;
    setLoading(true);
    try {
      const { rows: rows2 } = await listResource(api, "neoai_workflows", { sort: "-id", pageSize: 100 });
      setRows(rows2);
    } catch (err) {
      import_antd2.message.error(`Load failed: ${(_a = err == null ? void 0 : err.message) != null ? _a : err}`);
    } finally {
      setLoading(false);
    }
  };
  usePoll(load, 3e4, !editing);
  const create = async () => {
    var _a;
    const name = newName.trim();
    if (!name) return;
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
      import_antd2.message.success(`Workflow "${name}" created (disabled draft)`);
    } catch (err) {
      import_antd2.message.error(`Create failed: ${(_a = err == null ? void 0 : err.message) != null ? _a : err}`);
    }
  };
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (v, r) => /* @__PURE__ */ import_react2.default.createElement("a", { style: { fontWeight: 600 }, onClick: () => setEditing(r) }, v)
    },
    { title: "Key", dataIndex: "key", render: (v) => /* @__PURE__ */ import_react2.default.createElement("code", { style: { fontSize: 12 } }, v) },
    {
      title: "Enabled",
      dataIndex: "enabled",
      width: 90,
      render: (v, r) => /* @__PURE__ */ import_react2.default.createElement(
        import_antd2.Switch,
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
    { title: "Version", dataIndex: "current_version", width: 90, render: (v) => v ? `v${v}` : /* @__PURE__ */ import_react2.default.createElement(import_antd2.Tag, null, "draft") },
    { title: "Confirm", dataIndex: "require_confirm", width: 90, render: (v) => v ? "yes" : "no" },
    {
      title: "Budget/day",
      dataIndex: "daily_budget_usd",
      width: 110,
      render: (v) => Number(v) > 0 ? `$${Number(v)}` : "\u2014"
    },
    { title: "Updated", dataIndex: "updatedAt", width: 150, render: (v) => fmtTime(v) }
  ];
  return /* @__PURE__ */ import_react2.default.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ import_react2.default.createElement("div", { style: { display: "flex", alignItems: "center", marginBottom: 14, gap: 10 } }, /* @__PURE__ */ import_react2.default.createElement("div", { style: { fontSize: 18, fontWeight: 800, flex: 1 } }, "AI Workflows"), creating ? /* @__PURE__ */ import_react2.default.createElement(import_antd2.Space.Compact, null, /* @__PURE__ */ import_react2.default.createElement(
    import_antd2.Input,
    {
      autoFocus: true,
      placeholder: "Workflow name",
      value: newName,
      onChange: (e) => setNewName(e.target.value),
      onPressEnter: create,
      style: { width: 260 }
    }
  ), /* @__PURE__ */ import_react2.default.createElement(import_antd2.Button, { type: "primary", onClick: create }, "Create"), /* @__PURE__ */ import_react2.default.createElement(import_antd2.Button, { onClick: () => setCreating(false) }, "Cancel")) : /* @__PURE__ */ import_react2.default.createElement(import_react2.default.Fragment, null, /* @__PURE__ */ import_react2.default.createElement(import_antd2.Button, { onClick: load }, "Refresh"), /* @__PURE__ */ import_react2.default.createElement(import_antd2.Button, { type: "primary", onClick: () => setCreating(true) }, "New workflow"))), /* @__PURE__ */ import_react2.default.createElement(import_antd2.Table, { rowKey: "id", size: "middle", loading, dataSource: rows, columns, pagination: false }), editing ? /* @__PURE__ */ import_react2.default.createElement(
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
var import_react3 = __toESM(require("react"));
var import_antd3 = require("antd");
var import_client2 = require("@nocobase/client");
var TERMINAL = /* @__PURE__ */ new Set(["succeeded", "failed", "cancelled", "rejected"]);
function RunDetail({ runId, onClose }) {
  var _a, _b, _c;
  const api = (0, import_client2.useAPIClient)();
  const [data, setData] = (0, import_react3.useState)({});
  const [comment, setComment] = (0, import_react3.useState)("");
  const run = data.run;
  const live = !run || !TERMINAL.has(String(run.status));
  usePoll(
    async () => {
      var _a2;
      try {
        setData(await neoaiAction(api, "runStatus", { runId }));
      } catch (err) {
        import_antd3.message.error(`Run load failed: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : err}`);
      }
    },
    2500,
    live
  );
  const decide = async (approved) => {
    var _a2;
    try {
      const res = await neoaiAction(api, "resumeRun", { runId, approved, comment });
      if (res.error) import_antd3.message.error(res.error);
      else import_antd3.message.success(approved ? "Approved \u2014 run continues" : "Rejected");
    } catch (err) {
      import_antd3.message.error(String((_a2 = err == null ? void 0 : err.message) != null ? _a2 : err));
    }
  };
  const cancel = async () => {
    var _a2;
    try {
      await neoaiAction(api, "cancelRun", { runId });
      import_antd3.message.success("Cancel requested");
    } catch (err) {
      import_antd3.message.error(String((_a2 = err == null ? void 0 : err.message) != null ? _a2 : err));
    }
  };
  const stepColumns = [
    { title: "#", dataIndex: "seq", width: 50 },
    { title: "Node", dataIndex: "title", render: (v, s) => v || s.node_id },
    { title: "Type", dataIndex: "node_type", width: 110 },
    { title: "Status", dataIndex: "status", width: 110, render: (v) => /* @__PURE__ */ import_react3.default.createElement(StatusTag, { status: v }) },
    { title: "Duration", dataIndex: "duration_ms", width: 100, render: (v) => fmtDuration(v) },
    { title: "Tokens", key: "tok", width: 130, render: (_, s) => fmtTokens(s.input_tokens, s.output_tokens) },
    { title: "Cost", dataIndex: "cost_usd", width: 90, render: (v) => fmtCost(v) },
    {
      title: "Error",
      dataIndex: "error",
      render: (v) => v ? /* @__PURE__ */ import_react3.default.createElement("span", { style: { color: "#b02a2a", fontSize: 12 } }, v) : null
    }
  ];
  return /* @__PURE__ */ import_react3.default.createElement(
    ConsoleDrawer,
    {
      open: true,
      title: /* @__PURE__ */ import_react3.default.createElement("span", null, "Run #", runId, " ", run ? /* @__PURE__ */ import_react3.default.createElement(StatusTag, { status: run.status }) : null, (run == null ? void 0 : run.function_key) ? /* @__PURE__ */ import_react3.default.createElement("span", { style: { fontWeight: 400, fontSize: 13, color: "#8a8f8a" } }, " \xB7 function ", run.function_key) : null),
      extra: /* @__PURE__ */ import_react3.default.createElement(import_antd3.Space, null, (run == null ? void 0 : run.status) === "waiting" ? /* @__PURE__ */ import_react3.default.createElement(import_react3.default.Fragment, null, /* @__PURE__ */ import_react3.default.createElement(import_antd3.Input, { placeholder: "Comment (optional)", value: comment, onChange: (e) => setComment(e.target.value), style: { width: 220 } }), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { type: "primary", onClick: () => decide(true) }, "Approve"), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { danger: true, onClick: () => decide(false) }, "Reject")) : null, run && !TERMINAL.has(String(run.status)) ? /* @__PURE__ */ import_react3.default.createElement(import_antd3.Button, { onClick: cancel }, "Cancel run") : null),
      onClose
    },
    /* @__PURE__ */ import_react3.default.createElement("div", { style: { padding: 18, display: "flex", flexDirection: "column", gap: 14, maxWidth: 1200 } }, (run == null ? void 0 : run.status) === "waiting" ? /* @__PURE__ */ import_react3.default.createElement("div", { style: { border: "1px solid #e7d9a8", background: "#fdf7e3", borderRadius: 10, padding: "10px 14px" } }, /* @__PURE__ */ import_react3.default.createElement("b", null, "Waiting for approval:"), " ", run.waiting_message || "\u2014") : null, /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 } }, /* @__PURE__ */ import_react3.default.createElement("span", null, /* @__PURE__ */ import_react3.default.createElement("b", null, "Started:"), " ", fmtTime(run == null ? void 0 : run.started_at)), /* @__PURE__ */ import_react3.default.createElement("span", null, /* @__PURE__ */ import_react3.default.createElement("b", null, "Duration:"), " ", runDuration(run)), /* @__PURE__ */ import_react3.default.createElement("span", null, /* @__PURE__ */ import_react3.default.createElement("b", null, "Tokens:"), " ", fmtTokens(run == null ? void 0 : run.input_tokens, run == null ? void 0 : run.output_tokens)), /* @__PURE__ */ import_react3.default.createElement("span", null, /* @__PURE__ */ import_react3.default.createElement("b", null, "Cost:"), " ", fmtCost(run == null ? void 0 : run.cost_usd)), /* @__PURE__ */ import_react3.default.createElement("span", null, /* @__PURE__ */ import_react3.default.createElement("b", null, "Trigger:"), " ", (_a = run == null ? void 0 : run.trigger) != null ? _a : "\u2014", " (", (_b = run == null ? void 0 : run.triggered_by) != null ? _b : "\u2014", ")"), /* @__PURE__ */ import_react3.default.createElement("span", null, /* @__PURE__ */ import_react3.default.createElement("b", null, "Version:"), " ", (run == null ? void 0 : run.version) ? `v${run.version}` : "draft")), /* @__PURE__ */ import_react3.default.createElement("div", null, /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", margin: "0 0 6px" } }, "STEPS"), /* @__PURE__ */ import_react3.default.createElement(
      import_antd3.Table,
      {
        rowKey: "id",
        size: "small",
        dataSource: (_c = data.steps) != null ? _c : [],
        columns: stepColumns,
        pagination: false,
        expandable: {
          expandedRowRender: (s) => /* @__PURE__ */ import_react3.default.createElement(JsonBox, { value: s.output, maxHeight: 300 }),
          rowExpandable: (s) => s.output != null
        }
      }
    )), /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", gap: 14, flexWrap: "wrap" } }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { flex: "1 1 320px", minWidth: 280 } }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", margin: "0 0 6px" } }, "INPUT"), /* @__PURE__ */ import_react3.default.createElement(JsonBox, { value: run == null ? void 0 : run.input, maxHeight: 260 })), /* @__PURE__ */ import_react3.default.createElement("div", { style: { flex: "1 1 320px", minWidth: 280 } }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", margin: "0 0 6px" } }, (run == null ? void 0 : run.status) === "failed" ? "ERROR" : "OUTPUT"), (run == null ? void 0 : run.status) === "failed" ? /* @__PURE__ */ import_react3.default.createElement("div", { style: { color: "#b02a2a", fontSize: 13 } }, run == null ? void 0 : run.error) : /* @__PURE__ */ import_react3.default.createElement(JsonBox, { value: run == null ? void 0 : run.output, maxHeight: 260 }))))
  );
}
function RunsPanel() {
  const api = (0, import_client2.useAPIClient)();
  const [rows, setRows] = (0, import_react3.useState)([]);
  const [openRun, setOpenRun] = (0, import_react3.useState)(null);
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
  const columns = [
    {
      title: "Run",
      dataIndex: "id",
      width: 80,
      render: (v) => /* @__PURE__ */ import_react3.default.createElement("a", { style: { fontWeight: 600 }, onClick: () => setOpenRun(v) }, "#", v)
    },
    { title: "Workflow", key: "wf", render: (_, r) => {
      var _a, _b;
      return (_b = (_a = r.workflow) == null ? void 0 : _a.name) != null ? _b : r.workflow_id;
    } },
    { title: "Status", dataIndex: "status", width: 110, render: (v) => /* @__PURE__ */ import_react3.default.createElement(StatusTag, { status: v }) },
    {
      title: "Waiting on",
      dataIndex: "waiting_message",
      render: (v, r) => r.status === "waiting" && v ? /* @__PURE__ */ import_react3.default.createElement(import_antd3.Popover, { content: v }, /* @__PURE__ */ import_react3.default.createElement("span", { style: { color: "#9a7b00" } }, v.slice(0, 40), "\u2026")) : null
    },
    { title: "Trigger", dataIndex: "trigger", width: 90 },
    { title: "Started", dataIndex: "started_at", width: 150, render: (v) => fmtTime(v) },
    { title: "Duration", key: "dur", width: 100, render: (_, r) => runDuration(r) },
    { title: "Tokens", key: "tok", width: 130, render: (_, r) => fmtTokens(r.input_tokens, r.output_tokens) },
    { title: "Cost", dataIndex: "cost_usd", width: 90, render: (v) => fmtCost(v) }
  ];
  return /* @__PURE__ */ import_react3.default.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { display: "flex", alignItems: "center", marginBottom: 14 } }, /* @__PURE__ */ import_react3.default.createElement("div", { style: { fontSize: 18, fontWeight: 800, flex: 1 } }, "Runs"), /* @__PURE__ */ import_react3.default.createElement("span", { style: { fontSize: 12, color: "#8a8f8a" } }, "auto-refreshing every 3 s")), /* @__PURE__ */ import_react3.default.createElement(import_antd3.Table, { rowKey: "id", size: "middle", dataSource: rows, columns, pagination: { pageSize: 25 } }), openRun != null ? /* @__PURE__ */ import_react3.default.createElement(RunDetail, { runId: openRun, onClose: () => setOpenRun(null) }) : null);
}

// src/client/console/SettingsPanel.tsx
var import_react4 = __toESM(require("react"));
var import_antd4 = require("antd");
var import_client3 = require("@nocobase/client");
function Field2({ label, children, hint }) {
  return /* @__PURE__ */ import_react4.default.createElement("div", { style: { marginBottom: 14, maxWidth: 560 } }, /* @__PURE__ */ import_react4.default.createElement("div", { style: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "#8a8f8a", marginBottom: 4 } }, label), children, hint ? /* @__PURE__ */ import_react4.default.createElement("div", { style: { fontSize: 12, color: "#8a8f8a", marginTop: 4 } }, hint) : null);
}
function SettingsPanel() {
  var _a;
  const api = (0, import_client3.useAPIClient)();
  const [s, setS] = (0, import_react4.useState)(null);
  const [key, setKey] = (0, import_react4.useState)("");
  const [pricesText, setPricesText] = (0, import_react4.useState)("");
  const [ping, setPing] = (0, import_react4.useState)(null);
  const [spend, setSpend] = (0, import_react4.useState)(null);
  usePoll(
    async () => {
      var _a2;
      try {
        const got = await neoaiAction(api, "getSettings", {});
        setS((prev) => prev != null ? prev : got);
        setPricesText((prev) => prev ? prev : got.prices ? JSON.stringify(got.prices, null, 2) : "");
        setPing(await neoaiAction(api, "ping", {}));
        setSpend(await neoaiAction(api, "spendToday", {}));
      } catch (err) {
        import_antd4.message.error(`Load failed: ${(_a2 = err == null ? void 0 : err.message) != null ? _a2 : err}`);
      }
    },
    36e5,
    s == null
  );
  if (!s) return /* @__PURE__ */ import_react4.default.createElement("div", { style: { padding: 20 } }, "Loading\u2026");
  const save = async () => {
    var _a2, _b, _c;
    let prices;
    if (pricesText.trim()) {
      try {
        prices = JSON.parse(pricesText);
      } catch (e) {
        import_antd4.message.error("Price table is not valid JSON");
        return;
      }
    }
    try {
      await neoaiAction(api, "saveSettings", {
        default_llm_service: (_a2 = s.default_llm_service) != null ? _a2 : "",
        default_model: (_b = s.default_model) != null ? _b : "gemini-2.5-flash",
        daily_budget_usd: Number(s.daily_budget_usd) || 0,
        image_price_usd: Number(s.image_price_usd) || 0.04,
        ...prices !== void 0 ? { prices } : {},
        ...key ? { gemini_api_key: key } : {}
      });
      setKey("");
      import_antd4.message.success("Settings saved");
    } catch (err) {
      import_antd4.message.error(`Save failed: ${(_c = err == null ? void 0 : err.message) != null ? _c : err}`);
    }
  };
  return /* @__PURE__ */ import_react4.default.createElement("div", { style: { padding: 20 } }, /* @__PURE__ */ import_react4.default.createElement("div", { style: { fontSize: 18, fontWeight: 800, marginBottom: 14 } }, "Settings"), /* @__PURE__ */ import_react4.default.createElement(Field2, { label: "Default plugin-ai LLM service", hint: "Name of an llmService configured under Settings \u2192 AI. Empty = plugin-ai default / raw Gemini fallback." }, /* @__PURE__ */ import_react4.default.createElement(import_antd4.Input, { value: s.default_llm_service, onChange: (e) => setS({ ...s, default_llm_service: e.target.value }) })), /* @__PURE__ */ import_react4.default.createElement(Field2, { label: "Default model" }, /* @__PURE__ */ import_react4.default.createElement(import_antd4.Input, { value: s.default_model, placeholder: "gemini-2.5-flash", onChange: (e) => setS({ ...s, default_model: e.target.value }) })), /* @__PURE__ */ import_react4.default.createElement(Field2, { label: "Global daily budget (USD, 0 = unlimited)", hint: "Blocks further model calls once today's estimated spend across ALL workflows exceeds this." }, /* @__PURE__ */ import_react4.default.createElement(import_antd4.InputNumber, { min: 0, step: 0.5, value: Number(s.daily_budget_usd) || 0, onChange: (v) => setS({ ...s, daily_budget_usd: v != null ? v : 0 }) })), /* @__PURE__ */ import_react4.default.createElement(Field2, { label: "Estimated price per generated image (USD)" }, /* @__PURE__ */ import_react4.default.createElement(import_antd4.InputNumber, { min: 0, step: 0.01, value: Number(s.image_price_usd) || 0.04, onChange: (v) => setS({ ...s, image_price_usd: v != null ? v : 0.04 }) })), /* @__PURE__ */ import_react4.default.createElement(Field2, { label: "Price table override (JSON, USD per 1M tokens)", hint: 'Example: { "gemini-2.5-flash": { "in": 0.3, "out": 2.5 } }' }, /* @__PURE__ */ import_react4.default.createElement(
    import_antd4.Input.TextArea,
    {
      rows: 5,
      value: pricesText,
      onChange: (e) => setPricesText(e.target.value),
      style: { fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12 }
    }
  )), /* @__PURE__ */ import_react4.default.createElement(
    Field2,
    {
      label: "Gemini API key (raw-path fallback + image nodes)",
      hint: s.geminiKeyFromEnv ? "GEMINI_API_KEY env var is set and wins \u2014 this field is a fallback." : s.geminiKeyConfigured ? "A key is configured. Leave empty to keep it; enter a new value to replace." : "No key configured yet."
    },
    /* @__PURE__ */ import_react4.default.createElement(import_antd4.Input.Password, { value: key, placeholder: s.geminiKeyConfigured ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022  (configured)" : "AIza\u2026", onChange: (e) => setKey(e.target.value) })
  ), /* @__PURE__ */ import_react4.default.createElement(import_antd4.Button, { type: "primary", onClick: save }, "Save settings"), /* @__PURE__ */ import_react4.default.createElement("div", { style: { borderTop: "1px solid #ececea", margin: "22px 0 16px" } }), /* @__PURE__ */ import_react4.default.createElement("div", { style: { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#8a8f8a", marginBottom: 8 } }, "PLUGIN HEALTH"), ping ? /* @__PURE__ */ import_react4.default.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 } }, /* @__PURE__ */ import_react4.default.createElement(import_antd4.Tag, { color: "green" }, ping.plugin, " v", ping.version), /* @__PURE__ */ import_react4.default.createElement(import_antd4.Tag, { color: ping.pluginAi ? "green" : "orange" }, ping.pluginAi ? "plugin-ai available" : "plugin-ai NOT available (raw Gemini fallback)"), ping.sandbox ? /* @__PURE__ */ import_react4.default.createElement(import_antd4.Tag, { color: "orange" }, "sandbox") : null, /* @__PURE__ */ import_react4.default.createElement(import_antd4.Tag, null, ((_a = ping.collections) != null ? _a : []).length, " collections")) : null, spend ? /* @__PURE__ */ import_react4.default.createElement("div", { style: { maxWidth: 560 } }, /* @__PURE__ */ import_react4.default.createElement("div", { style: { fontSize: 12, color: "#8a8f8a", marginBottom: 4 } }, "Spend today (estimated)"), /* @__PURE__ */ import_react4.default.createElement(JsonBox, { value: spend, maxHeight: 140 })) : null);
}

// src/client/console/NeoaiConsole.tsx
var TABS = [
  { key: "workflows", label: "AI Workflows", icon: "PartitionOutlined" },
  { key: "runs", label: "Runs", icon: "PlayCircleOutlined" },
  { key: "settings", label: "Settings", icon: "SettingOutlined" }
];
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
  return /* @__PURE__ */ import_react5.default.createElement(
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
    /* @__PURE__ */ import_react5.default.createElement(import_client4.Icon, { type: props.icon }),
    /* @__PURE__ */ import_react5.default.createElement("span", null, props.label)
  );
}
function NeoaiConsolePage() {
  (0, import_react5.useEffect)(() => {
    ensureInterFont();
  }, []);
  const pathname = window.location.pathname;
  const embedded = pathname.startsWith("/admin");
  const prefix = embedded ? "/admin" : "";
  const active = activeTabFromPath(pathname);
  const go = (href) => window.location.assign(href);
  return /* @__PURE__ */ import_react5.default.createElement(import_antd5.ConfigProvider, { theme: NEOHOME_THEME, getPopupContainer: (n) => {
    var _a;
    return (_a = n == null ? void 0 : n.parentElement) != null ? _a : document.body;
  } }, /* @__PURE__ */ import_react5.default.createElement(
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
    /* @__PURE__ */ import_react5.default.createElement(
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
      /* @__PURE__ */ import_react5.default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 9, padding: "2px 8px 12px" } }, /* @__PURE__ */ import_react5.default.createElement("img", { src: NEOMODUL_FAVICON_SRC, alt: "Neomodul", style: { width: 26, height: 26, borderRadius: 7 } }), /* @__PURE__ */ import_react5.default.createElement("span", { style: { fontWeight: 800, fontSize: 15, letterSpacing: "-.01em" } }, "NeoAI")),
      TABS.map((t) => /* @__PURE__ */ import_react5.default.createElement(SideItem, { key: t.key, icon: t.icon, label: t.label, active: active === t.key, onClick: () => go(`${prefix}/neoai/${t.key}`) })),
      /* @__PURE__ */ import_react5.default.createElement("div", { style: { borderTop: "1px solid #ececea", margin: "10px 4px" } }),
      CROSS_LINKS.map((l) => /* @__PURE__ */ import_react5.default.createElement(SideItem, { key: l.href, icon: l.icon, label: l.label, muted: true, onClick: () => go(l.href) })),
      /* @__PURE__ */ import_react5.default.createElement("div", { style: { flex: 1 } }),
      /* @__PURE__ */ import_react5.default.createElement("div", { style: { fontSize: 10.5, color: "#b0b4ba", padding: "0 8px 4px" } }, "Admin-only \xB7 tree workflows \xB7 Gemini via plugin-ai")
    ),
    /* @__PURE__ */ import_react5.default.createElement("main", { style: { flex: 1, overflow: "auto", minWidth: 0, background: "#fff" } }, active === "workflows" ? /* @__PURE__ */ import_react5.default.createElement(WorkflowsPanel, null) : null, active === "runs" ? /* @__PURE__ */ import_react5.default.createElement(RunsPanel, null) : null, active === "settings" ? /* @__PURE__ */ import_react5.default.createElement(SettingsPanel, null) : null)
  ));
}

// src/client/index.tsx
var NeoaiClientPlugin = class extends import_client5.Plugin {
  async load() {
    this.app.router.add("admin.neoai", { path: "neoai", Component: NeoaiConsolePage });
    this.app.router.add("admin.neoaiWorkflows", { path: "neoai/workflows", Component: NeoaiConsolePage });
    this.app.router.add("admin.neoaiRuns", { path: "neoai/runs", Component: NeoaiConsolePage });
    this.app.router.add("admin.neoaiSettings", { path: "neoai/settings", Component: NeoaiConsolePage });
    this.app.router.add("neoai", { path: "/neoai", Component: NeoaiConsolePage });
    this.app.router.add("neoai-workflows", { path: "/neoai/workflows", Component: NeoaiConsolePage });
    this.app.router.add("neoai-runs", { path: "/neoai/runs", Component: NeoaiConsolePage });
    this.app.router.add("neoai-settings", { path: "/neoai/settings", Component: NeoaiConsolePage });
  }
};
var client_default = NeoaiClientPlugin;

  return module.exports;
});
