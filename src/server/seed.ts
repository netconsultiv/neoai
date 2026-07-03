// src/server/seed.ts
// -----------------------------------------------------------------------------
// Seed workflows. First one per owner decision (scoping Q26): BUILDING PLOT
// ANALYSIS — the Konfigurator is priority 1, and plot research is the reference
// multi-step pipeline. This v1 seed orchestrates OPEN data sources directly
// (Nominatim geocode → Overpass vegetation ∥ Overpass transport → Gemini
// synthesis) so it runs standalone; deeper Konfigurator integration (writing
// konfigurator_plot_constraints via a bound function) comes with the function-
// migration phase. Complementary to the Konfigurator session's planned Baugrund
// tasks 06–08 (geometry editor / showroom 3D) — no overlap.
//
// Seeded as DISABLED draft + published v1 with require_confirm=true, so nothing
// spends budget without an explicit admin action.

const OVERPASS_VEGETATION = `[out:json][timeout:25];(node["natural"="tree"](around:250,{{nodes.geo.lat}},{{nodes.geo.lon}});way["natural"="wood"](around:250,{{nodes.geo.lat}},{{nodes.geo.lon}});way["landuse"="forest"](around:250,{{nodes.geo.lat}},{{nodes.geo.lon}});way["natural"="water"](around:250,{{nodes.geo.lat}},{{nodes.geo.lon}}););out tags center 100;`;

const OVERPASS_TRANSPORT = `[out:json][timeout:25];(way["highway"]["maxwidth"](around:400,{{nodes.geo.lat}},{{nodes.geo.lon}});way["highway"]["maxheight"](around:400,{{nodes.geo.lat}},{{nodes.geo.lon}});way["highway"]["maxweight"](around:400,{{nodes.geo.lat}},{{nodes.geo.lon}});way["highway"~"^(primary|secondary|tertiary|residential|unclassified|service|track)$"](around:200,{{nodes.geo.lat}},{{nodes.geo.lon}}););out tags center 120;`;

const SYNTH_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'short German summary of the plot situation' },
    constraints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', description: 'transport|vegetation|zufahrt|sonstig' },
          severity: { type: 'string', description: 'info|warn|block' },
          title: { type: 'string' },
          detail: { type: 'string' },
        },
        required: ['kind', 'severity', 'title'],
      },
    },
  },
  required: ['summary', 'constraints'],
};

export const BUILDING_PLOT_DEFINITION = {
  nodes: [
    {
      id: 'geo_raw',
      type: 'http',
      title: 'Geocode address (Nominatim)',
      config: {
        method: 'GET',
        url: 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q={{input.address}}',
        headers: { 'User-Agent': 'NeoAI/0.1 (Neomodul internal; plot analysis)' },
        responseType: 'json',
      },
    },
    {
      id: 'geo',
      type: 'transform',
      title: 'Extract coordinates',
      config: {
        map: {
          lat: '{{nodes.geo_raw.body.0.lat}}',
          lon: '{{nodes.geo_raw.body.0.lon}}',
          display_name: '{{nodes.geo_raw.body.0.display_name}}',
        },
      },
    },
    {
      id: 'geo_check',
      type: 'condition',
      title: 'Address found?',
      config: { left: '{{nodes.geo.lat}}', op: 'notEmpty' },
      branches: [
        [
          {
            id: 'par',
            type: 'parallel',
            title: 'Open-data lookups',
            branches: [
              [
                {
                  id: 'vegetation',
                  type: 'http',
                  title: 'Overpass: vegetation & water',
                  config: {
                    method: 'POST',
                    url: 'https://overpass-api.de/api/interpreter',
                    headers: { 'Content-Type': 'text/plain', 'User-Agent': 'NeoAI/0.1 (Neomodul internal)' },
                    body: OVERPASS_VEGETATION,
                    responseType: 'json',
                  },
                },
                {
                  id: 'veg_sum',
                  type: 'transform',
                  title: 'Summarise vegetation',
                  config: { map: { elements: '{{nodes.vegetation.body.elements}}' } },
                },
              ],
              [
                {
                  id: 'transport',
                  type: 'http',
                  title: 'Overpass: road restrictions',
                  config: {
                    method: 'POST',
                    url: 'https://overpass-api.de/api/interpreter',
                    headers: { 'Content-Type': 'text/plain', 'User-Agent': 'NeoAI/0.1 (Neomodul internal)' },
                    body: OVERPASS_TRANSPORT,
                    responseType: 'json',
                  },
                },
              ],
            ],
          },
          {
            id: 'synth',
            type: 'llm',
            title: 'Gemini synthesis',
            config: {
              system:
                'Du bist Bau-Logistik- und Grundstücksanalyst für Modulhäuser (Modulbreite ~4m, Schwertransport). Antworte ausschließlich mit JSON nach dem vorgegebenen Schema. Severity: block nur bei harten Hindernissen, warn bei zu prüfenden Punkten, info für Kontext.',
              prompt:
                'Grundstück: {{nodes.geo.display_name}} (lat {{nodes.geo.lat}}, lon {{nodes.geo.lon}}).\n\nVegetation/Wasser im Umkreis 250m (OSM):\n{{nodes.veg_sum.elements}}\n\nStraßen + Beschränkungen im Umkreis 400m (OSM):\n{{nodes.transport.body.elements}}\n\nLeite daraus Transport-/Zufahrts- und Grundstücks-Constraints für die Anlieferung und Aufstellung eines Modulhauses ab. Wenn die Daten dünn sind, sage das ehrlich (severity info).',
              jsonSchema: SYNTH_SCHEMA,
              temperature: 0.2,
            },
          },
          {
            id: 'out',
            type: 'output',
            title: 'Result',
            config: {
              map: {
                address: '{{nodes.geo.display_name}}',
                lat: '{{nodes.geo.lat}}',
                lon: '{{nodes.geo.lon}}',
                summary: '{{nodes.synth.json.summary}}',
                constraints: '{{nodes.synth.json.constraints}}',
              },
            },
          },
        ],
        [
          {
            id: 'out_fail',
            type: 'output',
            title: 'Address not found',
            config: { map: { error: 'address not found', address: '{{input.address}}' }, end: true },
          },
        ],
      ],
    },
  ],
};

export async function ensureSeedWorkflows(plugin: any) {
  const repo = plugin.db.getRepository('neoai_workflows');
  if (!repo) return;
  const key = 'building-plot-analysis';
  const existing = await repo.findOne({ filter: { key } });
  if (existing) return; // never overwrite an admin-edited workflow
  const wf = await repo.create({
    values: {
      key,
      name: 'Building Plot Analysis',
      description:
        'Analyses a building plot from a plain address: geocode (Nominatim) → parallel open-data lookups (Overpass vegetation/water + road restrictions) → Gemini synthesis into draft constraints. Input: { "address": "…" }. Seed workflow — extend freely.',
      enabled: false,
      require_confirm: true,
      current_version: 0,
      definition_draft: BUILDING_PLOT_DEFINITION,
    },
  });
  // Publish v1 so a test run works out of the box (still disabled + confirm-gated).
  await plugin.db.getRepository('neoai_workflow_versions').create({
    values: {
      workflow_id: wf.get('id'),
      version: 1,
      definition: BUILDING_PLOT_DEFINITION,
      published_by: 'seed',
      notes: 'Initial seed (P0)',
    },
  });
  await repo.update({ filterByTk: wf.get('id'), values: { current_version: 1 } });
  plugin.app.logger.info('[neoai] seeded workflow "building-plot-analysis" (disabled, confirm-gated)');
}
