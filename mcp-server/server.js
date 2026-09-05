#!/usr/bin/env node
/**
 * Kate Career Coach — MCP Server
 *
 * Provides two tools:
 *   - kate_init_hud: Initialize HUD and return full state
 *   - kate_update_state: Update state (deep-merge patch + session focus)
 *
 * State lives in kate_state.json in the project folder.
 * The HUD is served as a static HTML resource at ui://kate-hud.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.KATE_MCP_PORT || 3141;
const STATE_FILE = process.env.KATE_STATE_FILE || path.join(process.cwd(), 'kate_state.json');

// ─── State management ────────────────────────────────────────────────────────

function readState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(raw);
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

// ─── Tool handlers ────────────────────────────────────────────────────────────

const TOOLS = {
  kate_init_hud: {
    description: 'Initialize the Kate session HUD. Call this at the start of every session to load pipeline state and render the HUD.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (args) => {
      const state = readState();
      if (!state) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: 'No kate_state.json found. Copy kate_state.example.json to kate_state.json to initialize.' })
          }]
        };
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(state)
        }],
        _meta: {
          ui: {
            resourceUri: 'ui://kate-hud'
          }
        }
      };
    }
  },

  kate_update_state: {
    description: 'Update Kate\'s persistent state. Call this whenever role stage, fit assessment, action items, or session focus changes.',
    inputSchema: {
      type: 'object',
      properties: {
        patch: {
          type: 'object',
          description: 'Partial state update. Deep-merged into current state.'
        },
        session_focus: {
          type: 'object',
          description: 'Current session focus for HUD display.',
          properties: {
            mode: { type: 'string' },
            role_id: { type: 'string' },
            summary: { type: 'string' },
            active_chips: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    },
    handler: async (args) => {
      let state = readState();
      if (!state) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: 'No kate_state.json found. Initialize with kate_init_hud first.' })
          }]
        };
      }

      const patch = args.patch || {};
      const sessionFocus = args.session_focus || null;

      // Apply patch to state
      state = deepMerge(state, patch);
      state.last_updated = new Date().toISOString();

      // If session_focus is provided, store it (or clear it if null)
      if (sessionFocus !== null) {
        state.session_focus = sessionFocus;
      } else {
        delete state.session_focus;
      }

      writeState(state);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ ok: true, last_updated: state.last_updated })
        }]
      };
    }
  }
};

// ─── MCP Protocol Handler ─────────────────────────────────────────────────────

function handleMCPRequest(body) {
  const { method, params, id } = body;

  if (method === 'tools/list') {
    return {
      id,
      result: {
        tools: Object.entries(TOOLS).map(([name, tool]) => ({
          name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      }
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    const tool = TOOLS[name];
    if (!tool) {
      return { id, error: { code: -32601, message: `Unknown tool: ${name}` } };
    }
    return tool.handler(args || {}).then(result => ({
      id,
      result
    })).catch(err => ({
      id,
      error: { code: -32603, message: err.message }
    }));
  }

  if (method === 'resources/list') {
    return {
      id,
      result: {
        resources: [{
          uri: 'ui://kate-hud',
          name: 'Kate HUD',
          description: 'The Kate session HUD — a persistent UI showing pipeline health, active roles, open items, and session focus.',
          mimeType: 'text/html'
        }]
      }
    };
  }

  if (method === 'resources/read') {
    const { uri } = params || {};
    if (uri === 'ui://kate-hud') {
      const hudPath = path.join(__dirname, 'kate-hud.html');
      if (fs.existsSync(hudPath)) {
        const html = fs.readFileSync(hudPath, 'utf8');
        return { id, result: { contents: [{ uri, mimeType: 'text/html', text: html }] } };
      }
      return { id, error: { code: -32602, message: 'HUD not found. Ensure kate-hud.html exists.' } };
    }
    return { id, error: { code: -32602, message: `Unknown resource: ${uri}` } };
  }

  return { id, error: { code: -32601, message: `Unknown method: ${method}` } };
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/mcp') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body.toString());
        const response = await handleMCPRequest(parsed);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: null, error: { code: -32700, message: 'Parse error' } }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`[kate-mcp] Running on http://localhost:${PORT}/mcp`);
  console.log(`[kate-mcp] State file: ${STATE_FILE}`);
});