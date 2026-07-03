// build-client.js
// -----------------------------------------------------------------------------
// Self-contained client build. NocoBase loads a plugin's client bundle in the
// browser through its AMD/RequireJS-style loader: the bundle must call
//   define("<package-name>", [<deps>], factory)
// where <deps> are module ids the NocoBase runtime already has registered.
// We bundle src/client/index.tsx as CJS with those deps EXTERNAL, then wrap the
// output in a UMD/AMD shim. Classic JSX transform so `react` is the only JSX
// dep. Mirrors @neomodul/crm/build-client.js.
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const pkg = require('./package.json');
const PKG_NAME = pkg.name; // "@neomodul/neoai"

// Shared singletons provided by the NocoBase client runtime. Order matters:
// the AMD dep array and the factory argument list must line up 1:1.
const EXTERNALS = [
  '@nocobase/client',
  'react',
  'react-dom',
  'antd',
  '@formily/react',
  '@formily/core',
  'react-i18next',
  // Automation bridge: the Instruction base class for the "neoai-run" node.
  // Hard AMD dep — acceptable because plugin-workflow ships enabled in every
  // NocoBase deployment we target (it IS the automation hub, scoping Q2).
  '@nocobase/plugin-workflow/client',
];

const ARG_NAMES = [
  'nocobaseClient',
  'React',
  'ReactDOM',
  'antd',
  'formilyReact',
  'formilyCore',
  'reactI18next',
  'pluginWorkflowClient',
];

async function main() {
  const result = await esbuild.build({
    entryPoints: [path.resolve(__dirname, 'src/client/index.tsx')],
    bundle: true,
    write: false, // we post-process the output string into the UMD wrapper
    platform: 'browser',
    target: 'es2018',
    format: 'cjs',
    sourcemap: false,
    external: EXTERNALS,
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    logLevel: 'info',
  });

  const cjs = result.outputFiles[0].text;

  const depsJson = JSON.stringify(EXTERNALS);
  const argList = ARG_NAMES.join(', ');
  const requireCases = EXTERNALS.map(
    (id, i) => `      case ${JSON.stringify(id)}: return ${ARG_NAMES[i]};`,
  ).join('\n');
  const cjsRequireArgs = EXTERNALS.map((id) => `require(${JSON.stringify(id)})`).join(', ');

  const wrapper = `(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // NocoBase / RequireJS path — register the module under its package name.
    define(${JSON.stringify(PKG_NAME)}, ${depsJson}, factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS fallback (Node, tests).
    module.exports = factory(${cjsRequireArgs});
  } else {
    // Bare browser global fallback.
    var g = typeof globalThis !== 'undefined' ? globalThis : this;
    g[${JSON.stringify(PKG_NAME)}] = factory(
      g['@nocobase/client'], g.React, g.ReactDOM, g.antd,
      g['@formily/react'], g['@formily/core'], g.reactI18next,
      g['@nocobase/plugin-workflow/client']
    );
  }
})(function (${argList}) {
  var module = { exports: {} };
  var exports = module.exports;
  // Map the bundled code's require("...") calls onto the injected singletons.
  function require(id) {
    switch (id) {
${requireCases}
      default:
        throw new Error(${JSON.stringify('[' + PKG_NAME + '] unexpected require("')} + id + '")');
    }
  }
${cjs}
  return module.exports;
});
`;

  const outFile = path.resolve(__dirname, 'dist/client/index.js');
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, wrapper, 'utf8');
  console.log('[build-client] dist/client/index.js written (UMD/AMD module ' + PKG_NAME + ')');
}

main().catch((err) => {
  console.error('[build-client] failed', err);
  process.exit(1);
});
