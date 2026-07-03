// src/client/index.tsx
// -----------------------------------------------------------------------------
// Client entry of @neomodul/neoai. Registers the console as nested admin routes
// (workflow-plugin pattern: name under 'admin.', RELATIVE path — the schema-
// driven desktopRoutes type:'page' renders blank on this NocoBase build, so
// consoles are custom-component routes and the server provisions a main-menu
// LINK pointing here). Standalone chrome-less aliases for direct URLs.

import { Plugin } from '@nocobase/client';
import { NeoaiConsolePage } from './console/NeoaiConsole';

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
      wf.registerInstruction('neoai-run', {
        title: 'NeoAI workflow',
        type: 'neoai-run',
        group: 'extended',
        description: 'Run a published NeoAI workflow (tree of LLM/HTTP/data steps) and wait for its result.',
        fieldset: {
          workflowKey: {
            type: 'string',
            title: 'NeoAI workflow key',
            required: true,
            description: 'Key from NeoAI → AI Workflows (the published version runs).',
            'x-decorator': 'FormItem',
            'x-component': 'Input',
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
        },
      });
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
    this.app.router.add('admin.neoaiFunctions', { path: 'neoai/functions', Component: NeoaiConsolePage });
    this.app.router.add('admin.neoaiSettings', { path: 'neoai/settings', Component: NeoaiConsolePage });
    // Standalone aliases.
    this.app.router.add('neoai', { path: '/neoai', Component: NeoaiConsolePage });
    this.app.router.add('neoai-workflows', { path: '/neoai/workflows', Component: NeoaiConsolePage });
    this.app.router.add('neoai-runs', { path: '/neoai/runs', Component: NeoaiConsolePage });
    this.app.router.add('neoai-functions', { path: '/neoai/functions', Component: NeoaiConsolePage });
    this.app.router.add('neoai-settings', { path: '/neoai/settings', Component: NeoaiConsolePage });

    this.registerAutomationBridgeUI();
  }
}

export default NeoaiClientPlugin;
