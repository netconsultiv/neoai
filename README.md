# @neomodul/neoai — NeoAI

Central AI workflow management for NeoBase (NocoBase 2.1.x). Tree-structured
multi-step AI workflows (LLM / image / HTTP / data / approval nodes) with a
visual editor, run monitor and cost tracking — plus a function registry that
lets the other @neomodul plugins dispatch their AI functions through a
selectable workflow (legacy code path stays as fallback when no workflow is
bound).

Scoping decisions (owner, 2026-07-03):

* **Multi-step, tree-structured** workflows — multi-agent orchestration is
  explicitly out of scope for now. Structured blocks only: sequence,
  condition, parallel block, loop, sub-workflow, human approval gate.
* Admin console in **English**, visible to **admin/root only** for now.
* Models via **@nocobase/plugin-ai** (`llmServices`, Gemini first) — image
  models (gemini-2.5-flash-image / gemini-3-pro-image-preview) go through the
  proven raw-`fetch` path as a dedicated Image node.
* **Own cost management**: per-step token/cost tracking from Gemini usage
  metadata, configurable daily budgets and confirm gates.
* Function migration (draftReply, assistantParse, researchPlot, …) comes
  LAST — admin logic and areas first. First seeded workflow: **Building Plot
  Analysis** (Konfigurator is priority 1).
* NocoBase plugin-workflow ("Automation") stays the business-automation layer
  and is linked from the NeoAI console.

## Layout

```
src/server   plugin (collections, actions, ACL, menu link), lib/ (runner,
             nodes, providers, cost, template), seed (Building Plot workflow)
src/client   NeoAI console (workflows editor, runs monitor, settings)
dist/        COMMITTED build output (NeoBase copies it into the image)
test/        node:test unit tests (pure lib modules)
```

## Build & test

```
node build-server.js && node build-client.js
node --experimental-strip-types --test test/*.test.mjs
```

esbuild is the only dev dependency. `dist/` is committed — rebuild both
bundles on EVERY release and bump `package.json` version (the client bundle
URL is cache-busted per plugin version).

## Deploy

9th plugin submodule in `netconsultiv/neobase` (COPY line + symlink loop +
entrypoint PLUGINS list, additive — same onboarding as @neomodul/crm
`b70a554`). Sandbox-VM E2E before staging; a NEW collection/field needs a
plugin disable→enable cycle on an existing database (image swap alone does
not re-run install/afterEnable).
