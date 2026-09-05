#!/usr/bin/env node
/**
 * Kate Career Coach — Local MCP Server (stdio)
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = process.env.KATE_STATE_FILE || path.join(process.cwd(), 'kate_state.json');
const HUD_BASE = process.env.KATE_HUD_URL || 'https://kate-career-coach.vercel.app/kate-hud.html';

function readState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[kate-mcp] Error reading state:', e.message);
  }
  return null;
}

function writeState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[kate-mcp] Error writing state:', e.message);
    return false;
  }
}

function deepMerge(target, patch) {
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

function handleRequest(parsed) {
  const { method, params, id } = parsed;

  if (method === 'tools/list') {
    return {
      id,
      result: {
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
      }
    };
  }

  if (method === 'tools/call') {
    const name = params && params.name;
    const args = (params && params.arguments) || {};

    if (name === 'kate_init_hud') {
      const state = readState();
      if (!state) {
        const msg = JSON.stringify({ error: 'No kate_state.json found. Copy kate_state.example.json to kate_state.json to initialize.' });
        return { id, result: { content: [{ type: 'text', text: msg }] } };
      }
      const encoded = Buffer.from(JSON.stringify(state)).toString('base64');
      const text = JSON.stringify({ hud_url: HUD_BASE + '?s=' + encoded, state: state });
      return { id, result: { content: [{ type: 'text', text: text }] } };
    }

    if (name === 'kate_update_state') {
      let state = readState();
      if (!state) {
        const msg = JSON.stringify({ error: 'No state found. Initialize with kate_init_hud first.' });
        return { id, result: { content: [{ type: 'text', text: msg }] } };
      }

      const patch = args.patch || {};
      const sessionFocus = args.session_focus;

      state = deepMerge(state, patch);
      if (sessionFocus !== null && sessionFocus !== undefined) {
        state.session_focus = sessionFocus;
      } else {
        delete state.session_focus;
      }
      state.last_updated = new Date().toISOString();
      writeState(state);

      const msg = JSON.stringify({ ok: true, last_updated: state.last_updated });
      return { id, result: { content: [{ type: 'text', text: msg }] } };
    }

    return { id, error: { code: -32601, message: 'Unknown tool: ' + name } };
  }

  return { id, error: { code: -32601, message: 'Unknown method: ' + method } };
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    try {
      const parsed = JSON.parse(line);
      const response = handleRequest(parsed);
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (e) {
      process.stdout.write(JSON.stringify({ id: null, error: { code: -32700, message: 'Parse error' } }) + '\n');
    }
  }
});