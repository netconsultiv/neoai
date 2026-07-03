// build-server.js
// -----------------------------------------------------------------------------
// Self-contained server build (no @nocobase/build, no webpack). We bundle the
// server entry as a single CommonJS file with esbuild and mark every
// node_module as EXTERNAL (`packages: 'external'`): NocoBase loads the server
// plugin with require() at runtime inside the NeoBase image, where
// @nocobase/server, koa, sequelize etc. are already present. The plugin itself
// has ZERO runtime npm dependencies. Mirrors @neomodul/crm/build-server.js.
const esbuild = require('esbuild');
const path = require('path');

esbuild
  .build({
    entryPoints: [path.resolve(__dirname, 'src/server/index.ts')],
    outfile: path.resolve(__dirname, 'dist/server/index.js'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    sourcemap: false,
    packages: 'external',
    logLevel: 'info',
  })
  .then(() => console.log('[build-server] dist/server/index.js written'))
  .catch((err) => {
    console.error('[build-server] failed', err);
    process.exit(1);
  });
