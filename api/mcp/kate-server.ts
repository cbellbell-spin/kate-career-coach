import { Redis } from '@upstash/redis';

// Upstash Redis — provisioned via Vercel Marketplace → Upstash Redis
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const STATE_KEY = 'kate:state';
const HUD_BASE = 'https://kate-career-coach.vercel.app/kate-hud.html';

// ─── State management ────────────────────────────────────────────────────────

async function getState() {
  const data = await redis.get<string>(STATE_KEY);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

async function saveState(state: any) {
  state.last_updated = new Date().toISOString();
  await redis.set(STATE_KEY, JSON.stringify(state));
  return state;
}

// ─── MCP Protocol ─────────────────────────────────────────────────────────────

export async function toolsList() {
  return {
    tools: [
      {
        name: 'kate_init_hud',
        description: 'Initialize the Kate session HUD. Returns the HUD URL and current pipeline state.',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'kate_update_state',
        description: "Update Kate's persistent state. Call whenever role stage, fit assessment, action items, or session focus changes.",
        inputSchema: {
          type: 'object',
          properties: {
            patch: { type: 'object', description: 'Partial state update. Deep-merged into current state.' },
            session_focus: {
              type: 'object',
              description: 'Current session focus for HUD display.',
              properties: {
                mode: { type: 'string' },
                role_id: { type: 'string' },
                summary: { type: 'string' },
                active_chips: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    ]
  };
}

export async function toolsCall(name: string, args: any) {
  if (name === 'kate_init_hud') {
    const state = await getState();
    if (!state) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'No state found. Initialize Kate first.' }) }] };
    }
    const encoded = Buffer.from(JSON.stringify(state)).toString('base64');
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          hud_url: `${HUD_BASE}?s=${encoded}`,
          state
        })
      }]
    };
  }

  if (name === 'kate_update_state') {
    let state = await getState();
    if (!state) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'No state found. Call kate_init_hud first.' })] }];
    }

    const patch = args.patch || {};
    const sessionFocus = args.session_focus || null;

    function deepMerge(target: any, patch: any): any {
      const result = JSON.parse(JSON.stringify(target));
      for (const key in patch) {
        if (patch[key] && typeof patch[key] === 'object' && !Array.isArray(patch[key])) {
          result[key] = deepMerge(result[key] || {}, patch[key]);
        } else {
          result[key] = patch[key];
        }
      }
      return result;
    }

    state = deepMerge(state, patch);
    if (sessionFocus !== null) {
      state.session_focus = sessionFocus;
    } else {
      delete state.session_focus;
    }
    await saveState(state);

    return { content: [{ type: 'text', text: JSON.stringify({ ok: true, last_updated: state.last_updated }) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
}