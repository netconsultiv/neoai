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
  }
}

export default NeoaiClientPlugin;
