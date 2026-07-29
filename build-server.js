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
    // Pin the build to the plugin root. esbuild writes module locations into the
    // bundle -- as `// <path>` header comments and as the string keys of its CJS
    // registry -- RELATIVE TO THE WORKING DIRECTORY. Without this, the same source
    // built one directory up produces a different (but behaviourally identical)
    // bundle, i.e. the shipped artefact depends on where the checkout happens to
    // sit. This plugin HAS its own tsconfig.json, so esbuild stops walking up
    // there and no tsconfigRaw pin is needed (unlike saved-filters/unified-search,
    // where the HOST APP's tsconfig leaked in). See ./sandbox.sh dist-check in the
    // neobase repo.
    absWorkingDir: __dirname,
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
