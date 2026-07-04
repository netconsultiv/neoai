// src/client/index.tsx
// -----------------------------------------------------------------------------
// Client entry of @neomodul/neoai. Registers the console as nested admin routes
// (workflow-plugin pattern: name under 'admin.', RELATIVE path — the schema-
// driven desktopRoutes type:'page' renders blank on this NocoBase build, so
// consoles are custom-component routes and the server provisions a main-menu
// LINK pointing here). Standalone chrome-less aliases for direct URLs.

import { Plugin } from '@nocobase/client';
// Hard client dep (8th AMD external) — see build-client.js note. The client
// registry rejects plain objects ("invalid instruction type to register"), so
// the node must be a real Instruction subclass, same as plugin-ai's LLM node.
import { Instruction } from '@nocobase/plugin-workflow/client';
import { NeoaiConsolePage } from './console/NeoaiConsole';
import { KnowledgeConsolePage } from './console/KnowledgeConsole';

class NeoaiRunInstruction extends Instruction {
  title = 'NeoAI workflow';
  type = 'neoai-run';
  group = 'extended';
  description = 'Run a published NeoAI workflow (tree of LLM/HTTP/data steps) and wait for its result.';
  fieldset = {
    workflowKey: {
      type: 'string',
      title: 'NeoAI workflow',
      required: true,
      description: 'Only published workflows (current_version > 0) are offered — the bound automation always runs the published version, never a draft.',
      'x-decorator': 'FormItem',
      'x-component': 'RemoteSelect',
      'x-component-props': {
        placeholder: 'Select a published NeoAI workflow…',
        fieldNames: { label: 'name', value: 'key' },
        service: {
          resource: 'neoai_workflows',
          action: 'list',
          params: {
            filter: { current_version: { $gt: 0 } },
            fields: ['key', 'name', 'current_version'],
            sort: ['name'],
            pageSize: 200,
          },
        },
      },
    },
    inputJson: {
      type: 'string',
      title: 'Input (JSON)',
      'x-decorator': 'FormItem',
      'x-component': 'Input.TextArea',
      'x-component-props': { rows: 4, placeholder: '{ "address": "…" }' },
    },
    includeContext: {
      type: 'boolean',
      title: 'Pass trigger context to the workflow as {{input.$trigger}}',
      default: true,
      'x-decorator': 'FormItem',
      'x-component': 'Checkbox',
    },
  };
}

export class NeoaiClientPlugin extends Plugin {
  /**
   * Automation bridge UI: contribute the "neoai-run" node to NocoBase's
   * plugin-workflow editor as a PLAIN instruction object (no import from
   * plugin-workflow — its client registry accepts instances; a hard AMD dep
   * would break this bundle whenever plugin-workflow is disabled). Load order
   * between plugins isn't guaranteed, so retry once shortly after load.
   */
  private registerAutomationBridgeUI(attempt = 0) {
    try {
      const wf: any = (this.app as any).pm?.get?.('workflow');
      if (!wf?.registerInstruction) {
        if (attempt < 3) setTimeout(() => this.registerAutomationBridgeUI(attempt + 1), 1500);
        return;
      }
      wf.registerInstruction('neoai-run', NeoaiRunInstruction);
      // eslint-disable-next-line no-console
      console.info('[neoai] automation bridge UI registered');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[neoai] automation bridge UI registration failed (non-fatal)', err);
    }
  }

  async load() {
    // Nested under the /admin layout (below the NocoBase top bar).
    this.app.router.add('admin.neoai', { path: 'neoai', Component: NeoaiConsolePage });
    this.app.router.add('admin.neoaiWorkflows', { path: 'neoai/workflows', Component: NeoaiConsolePage });
    this.app.router.add('admin.neoaiRuns', { path: 'neoai/runs', Component: NeoaiConsolePage });
    this.app.router.add('admin.neoaiApprovals', { path: 'neoai/approvals', Component: NeoaiConsolePage });
    this.app.router.add('admin.neoaiFunctions', { path: 'neoai/functions', Component: NeoaiConsolePage });
    this.app.router.add('admin.neoaiMcp', { path: 'neoai/mcp', Component: NeoaiConsolePage });
    this.app.router.add('admin.neoaiMemory', { path: 'neoai/memory', Component: NeoaiConsolePage });
    this.app.router.add('admin.neoaiSettings', { path: 'neoai/settings', Component: NeoaiConsolePage });
    // Standalone aliases.
    this.app.router.add('neoai', { path: '/neoai', Component: NeoaiConsolePage });
    this.app.router.add('neoai-workflows', { path: '/neoai/workflows', Component: NeoaiConsolePage });
    this.app.router.add('neoai-runs', { path: '/neoai/runs', Component: NeoaiConsolePage });
    this.app.router.add('neoai-approvals', { path: '/neoai/approvals', Component: NeoaiConsolePage });
    this.app.router.add('neoai-functions', { path: '/neoai/functions', Component: NeoaiConsolePage });
    this.app.router.add('neoai-mcp', { path: '/neoai/mcp', Component: NeoaiConsolePage });
    this.app.router.add('neoai-memory', { path: '/neoai/memory', Component: NeoaiConsolePage });
    this.app.router.add('neoai-settings', { path: '/neoai/settings', Component: NeoaiConsolePage });

    // Knowledge Hub — OWN top-level console (NOT a NeoAI sidebar tab), see
    // KnowledgeConsole.tsx. Every tab it can navigate to needs its OWN
    // registered route, both nested (admin.*) and standalone — this plugin
    // already shipped a live-404 regression once (commit 2feba37) from
    // forgetting a route for a new tab; do not repeat that here.
    this.app.router.add('admin.neoaiKnowledge', { path: 'neoai-knowledge', Component: KnowledgeConsolePage });
    this.app.router.add('admin.neoaiKnowledgeArticles', { path: 'neoai-knowledge/articles', Component: KnowledgeConsolePage });
    this.app.router.add('admin.neoaiKnowledgePrompts', { path: 'neoai-knowledge/prompts', Component: KnowledgeConsolePage });
    this.app.router.add('admin.neoaiKnowledgeSuggestions', { path: 'neoai-knowledge/suggestions', Component: KnowledgeConsolePage });
    this.app.router.add('admin.neoaiKnowledgeRetrieval', { path: 'neoai-knowledge/retrieval', Component: KnowledgeConsolePage });
    // Standalone aliases.
    this.app.router.add('neoai-knowledge', { path: '/neoai-knowledge', Component: KnowledgeConsolePage });
    this.app.router.add('neoai-knowledge-articles', { path: '/neoai-knowledge/articles', Component: KnowledgeConsolePage });
    this.app.router.add('neoai-knowledge-prompts', { path: '/neoai-knowledge/prompts', Component: KnowledgeConsolePage });
    this.app.router.add('neoai-knowledge-suggestions', { path: '/neoai-knowledge/suggestions', Component: KnowledgeConsolePage });
    this.app.router.add('neoai-knowledge-retrieval', { path: '/neoai-knowledge/retrieval', Component: KnowledgeConsolePage });

    this.registerAutomationBridgeUI();
  }
}

export default NeoaiClientPlugin;
