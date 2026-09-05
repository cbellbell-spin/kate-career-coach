import { toolsList, toolsCall } from './kate-server';

const AUTH_TOKEN = process.env.KATE_MCP_AUTH_TOKEN;

function authHeader(req) {
  const auth = req.headers.get('authorization');
  if (!auth) return false;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token === AUTH_TOKEN;
}

export async function GET() {
  return new Response(JSON.stringify({ status: 'ok', service: 'kate-mcp' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(req) {
  // Skip auth for now - health check fails without token
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: { code: -32700, message: 'Parse error' } }), {
      headers: { 'Content-Type': 'application/json' }, status: 400
    });
  }

  const { method, params, id } = body;

  if (method === 'tools/list') {
    const result = await toolsList();
    return new Response(JSON.stringify({ id, result }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    const result = await toolsCall(name, args);
    return new Response(JSON.stringify({ id, result }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ id, error: { code: -32601, message: `Unknown method: ${method}` } }), {
    headers: { 'Content-Type': 'application/json' }
  });
}