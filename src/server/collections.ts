// src/server/collections.ts
// -----------------------------------------------------------------------------
// NeoAI data core, registered through the Collection Manager (metadata row +
// load + sync) so every collection stays UI-inspectable. `fields` apply on
// FIRST creation; later additions go through NEOAI_EXTRA_FIELDS (ensureField).
// All collections are internal-by-default under native ACL (anon 401, only
// admin/root reach them) — matches the owner decision "admin only for now".

const str = (name: string, title: string, extra: any = {}) => ({
  name,
  type: 'string',
  interface: 'input',
  uiSchema: { type: 'string', title, 'x-component': 'Input' },
  ...extra,
});

const text = (name: string, title: string) => ({
  name,
  type: 'text',
  interface: 'textarea',
  uiSchema: { type: 'string', title, 'x-component': 'Input.TextArea' },
});

const bool = (name: string, title: string, defaultValue = false) => ({
  name,
  type: 'boolean',
  interface: 'checkbox',
  defaultValue,
  uiSchema: { type: 'boolean', title, 'x-component': 'Checkbox' },
});

const int = (name: string, title: string, defaultValue = 0) => ({
  name,
  type: 'integer',
  interface: 'integer',
  defaultValue,
  uiSchema: { type: 'number', title, 'x-component': 'InputNumber' },
});

const dbl = (name: string, title: string, defaultValue = 0) => ({
  name,
  type: 'double',
  interface: 'number',
  defaultValue,
  uiSchema: { type: 'number', title, 'x-component': 'InputNumber' },
});

const json = (name: string, title: string) => ({
  name,
  type: 'json',
  interface: 'json',
  uiSchema: { type: 'object', title, 'x-component': 'Input.JSON' },
});

const dt = (name: string, title: string) => ({
  name,
  type: 'date',
  interface: 'datetime',
  uiSchema: { type: 'string', title, 'x-component': 'DatePicker', 'x-component-props': { showTime: true } },
});

const select = (name: string, title: string, options: string[], defaultValue?: string) => ({
  name,
  type: 'string',
  interface: 'select',
  defaultValue,
  uiSchema: {
    type: 'string',
    title,
    'x-component': 'Select',
    enum: options.map((v) => ({ value: v, label: v })),
  },
});

export const RUN_STATUSES = ['queued', 'running', 'waiting', 'succeeded', 'failed', 'cancelled', 'rejected'];
export const STEP_STATUSES = ['running', 'done', 'failed', 'waiting', 'skipped'];

export const NEOAI_COLLECTIONS: any[] = [
  {
    name: 'neoai_workflows',
    title: 'NeoAI Workflows',
    titleField: 'name',
    fields: [
      str('key', 'Key', { unique: true }),
      str('name', 'Name'),
      text('description', 'Description'),
      bool('enabled', 'Enabled', false),
      bool('require_confirm', 'Require confirm before run', false),
      dbl('daily_budget_usd', 'Daily budget (USD, 0 = unlimited)', 0),
      int('current_version', 'Current version', 0),
      json('definition_draft', 'Draft definition'),
      // Time trigger (scoping Q21 "Beides"): "every 15m" | "every 2h" | "daily 07:00".
      str('schedule', 'Schedule (empty = off)'),
      json('schedule_input', 'Schedule input'),
      dt('last_scheduled_at', 'Last scheduled run'),
    ],
  },
  {
    name: 'neoai_workflow_versions',
    title: 'NeoAI Workflow Versions',
    titleField: 'id',
    fields: [
      {
        name: 'workflow',
        type: 'belongsTo',
        interface: 'm2o',
        target: 'neoai_workflows',
        foreignKey: 'workflow_id',
        uiSchema: { title: 'Workflow', 'x-component': 'AssociationField' },
      },
      int('version', 'Version', 1),
      json('definition', 'Definition (immutable)'),
      str('published_by', 'Published by'),
      text('notes', 'Notes'),
    ],
  },
  {
    name: 'neoai_functions',
    title: 'NeoAI Functions',
    titleField: 'title',
    fields: [
      str('key', 'Function key', { unique: true }),
      str('title', 'Title'),
      str('plugin', 'Owning plugin'),
      text('description', 'Description'),
      json('input_example', 'Input example'),
      bool('enabled', 'Enabled', true),
      {
        name: 'workflow',
        type: 'belongsTo',
        interface: 'm2o',
        target: 'neoai_workflows',
        foreignKey: 'workflow_id',
        uiSchema: { title: 'Bound workflow (empty = legacy code path)', 'x-component': 'AssociationField' },
      },
    ],
  },
  {
    name: 'neoai_runs',
    title: 'NeoAI Runs',
    titleField: 'id',
    fields: [
      {
        name: 'workflow',
        type: 'belongsTo',
        interface: 'm2o',
        target: 'neoai_workflows',
        foreignKey: 'workflow_id',
        uiSchema: { title: 'Workflow', 'x-component': 'AssociationField' },
      },
      int('version', 'Definition version', 0),
      str('function_key', 'Function key'),
      select('status', 'Status', RUN_STATUSES, 'queued'),
      str('trigger', 'Trigger'),
      json('input', 'Input'),
      json('output', 'Output'),
      text('error', 'Error'),
      json('state', 'Suspended state'),
      text('waiting_message', 'Waiting message'),
      str('triggered_by', 'Triggered by'),
      dt('started_at', 'Started at'),
      dt('finished_at', 'Finished at'),
      int('input_tokens', 'Input tokens', 0),
      int('output_tokens', 'Output tokens', 0),
      dbl('cost_usd', 'Cost (USD, estimate)', 0),
    ],
  },
  {
    name: 'neoai_run_steps',
    title: 'NeoAI Run Steps',
    titleField: 'id',
    fields: [
      {
        name: 'run',
        type: 'belongsTo',
        interface: 'm2o',
        target: 'neoai_runs',
        foreignKey: 'run_id',
        uiSchema: { title: 'Run', 'x-component': 'AssociationField' },
      },
      int('seq', 'Sequence', 0),
      str('node_id', 'Node id'),
      str('node_type', 'Node type'),
      str('title', 'Title'),
      str('path', 'Path'),
      select('status', 'Status', STEP_STATUSES, 'running'),
      dt('started_at', 'Started at'),
      dt('finished_at', 'Finished at'),
      int('duration_ms', 'Duration (ms)', 0),
      json('output', 'Output (truncated)'),
      text('error', 'Error'),
      int('input_tokens', 'Input tokens', 0),
      int('output_tokens', 'Output tokens', 0),
      dbl('cost_usd', 'Cost (USD, estimate)', 0),
    ],
  },
  {
    name: 'neoai_settings',
    title: 'NeoAI Settings',
    titleField: 'id',
    fields: [
      // Write-only by convention: actions never echo the key back (only a
      // boolean "configured" flag) — konfigurator ai_photo_api_key pattern.
      str('gemini_api_key', 'Gemini API key (fallback when plugin-ai has no service)'),
      // Admin-switchable: all llm/image nodes return labelled mocks (no spend),
      // even when a real key/service exists. For staging test rounds.
      bool('force_mock', 'Force mock mode (no real model calls)', false),
      str('default_llm_service', 'Default plugin-ai LLM service name'),
      str('default_model', 'Default model'),
      dbl('daily_budget_usd', 'Global daily budget (USD, 0 = unlimited)', 0),
      dbl('image_price_usd', 'Estimated price per generated image (USD)', 0.04),
      json('prices', 'Price table override (USD per 1M tokens)'),
    ],
  },
  {
    name: 'neoai_memories',
    title: 'NeoAI Memories',
    titleField: 'id',
    fields: [
      // Loose namespace reference (e.g. "crm.deal", "konfigurator.configuration") —
      // no FK, matches neoai_functions.plugin's existing convention so the store
      // stays central and works even when the referencing plugin isn't installed.
      str('entity_type', 'Entity type'),
      // Always a string, even for numeric ids (String(dealId)) — keeps this column
      // uniform across entity types with no per-type branching.
      str('entity_id', 'Entity id'),
      str('key', 'Key', { defaultValue: 'summary' }),
      text('summary', 'Summary'),
      json('structured', 'Structured (reserved for Phase 2)'),
      select('status', 'Status', ['draft', 'confirmed'], 'draft'),
      {
        name: 'source_run',
        type: 'belongsTo',
        interface: 'm2o',
        target: 'neoai_runs',
        foreignKey: 'source_run_id',
        uiSchema: { title: 'Source run', 'x-component': 'AssociationField' },
      },
      str('updated_by', 'Updated by'),
      dt('confirmed_at', 'Confirmed at'),
    ],
  },
];

// Reverse relations + post-P0 field additions — ensured AFTER all collections
// exist (collection `fields` only apply on FIRST creation; already-provisioned
// databases heal through these).
export const NEOAI_EXTRA_FIELDS: Array<{ collection: string; field: any }> = [
  { collection: 'neoai_settings', field: bool('force_mock', 'Force mock mode (no real model calls)', false) },
  { collection: 'neoai_workflows', field: str('schedule', 'Schedule (empty = off)') },
  { collection: 'neoai_workflows', field: json('schedule_input', 'Schedule input') },
  { collection: 'neoai_workflows', field: dt('last_scheduled_at', 'Last scheduled run') },
  {
    collection: 'neoai_workflows',
    field: {
      name: 'versions',
      type: 'hasMany',
      interface: 'o2m',
      target: 'neoai_workflow_versions',
      foreignKey: 'workflow_id',
      uiSchema: { title: 'Versions', 'x-component': 'AssociationField' },
    },
  },
  {
    collection: 'neoai_workflows',
    field: {
      name: 'runs',
      type: 'hasMany',
      interface: 'o2m',
      target: 'neoai_runs',
      foreignKey: 'workflow_id',
      uiSchema: { title: 'Runs', 'x-component': 'AssociationField' },
    },
  },
  {
    collection: 'neoai_runs',
    field: {
      name: 'steps',
      type: 'hasMany',
      interface: 'o2m',
      target: 'neoai_run_steps',
      foreignKey: 'run_id',
      uiSchema: { title: 'Steps', 'x-component': 'AssociationField' },
    },
  },
];

// Top-level main-menu link (desktopRoutes type 'link', healed by stable href —
// CRM MENU_LINKS pattern). The console's own sidebar carries the sub-areas
// (AI Workflows / Runs / Settings) plus the "Automation" cross-link to
// NocoBase's plugin-workflow admin, per scoping answer Q2/Q9.
export const MENU_LINKS = [
  { title: 'NeoAI', icon: 'RobotOutlined', href: '/admin/neoai/workflows', legacyHrefs: ['/neoai', '/admin/neoai'], sort: 14 },
];
