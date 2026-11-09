import {Buffer} from 'node:buffer';
import {handlePortfolioChat} from './chat-core.mjs';

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const CHAT_PATH = '/api/portfolio-chat';
const STATUS_PATH = `${CHAT_PATH}/status`;
const MAX_BODY_BYTES = 24000;

function json(status, value) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function configuredOrigin(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.origin === value ? value : null;
  } catch {
    return null;
  }
}

/** Adapt a bounded Web stream without buffering the complete request body. */
async function* requestChunks(body, setReader) {
  if (!body) return;
  const reader = body.getReader();
  setReader(reader);
  let complete = false;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        complete = true;
        return;
      }
      yield Buffer.from(value);
    }
  } finally {
    if (!complete) reader.cancel().catch(() => {});
    reader.releaseLock();
    setReader(null);
  }
}

/**
 * Reuse the portfolio's assistant instructions, validation, source links and errors.
 * GEMINI_API_KEY is optional and must be a Cloudflare secret, never public JSON.
 * The core's request/concurrency guard is per isolate, not a global quota or spend cap.
 * Deployment must enable Workers Node.js compatibility for the shared core's Buffer API.
 */
export function createAssistantHandler({loadKnowledge, fetchImpl = fetch, bodyTimeoutMs = 10000} = {}) {
  return async function handleAssistant(request, env = {}) {
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return json(400, {error: 'Invalid request.'});
    }
    if (url.pathname !== CHAT_PATH && url.pathname !== STATUS_PATH) {
      return json(404, {error: 'Not found.'});
    }

    const origin = configuredOrigin(env.PUBLIC_ORIGIN);
    const suppliedOrigin = request.headers.get('origin');
    if (!origin || url.origin !== origin ||
        (suppliedOrigin !== null && suppliedOrigin !== origin) ||
        request.headers.get('sec-fetch-site') === 'cross-site') {
      return json(403, {error: 'This request must come from the portfolio.'});
    }

    // Do not trust X-Forwarded-For: Cloudflare sets this header at the visitor edge.
    // A missing edge address shares a conservative bucket instead of bypassing limits.
    const address = request.headers.get('cf-connecting-ip') || 'unknown-cloudflare-visitor';
    const model = /^[a-zA-Z0-9._-]+$/.test(env.GEMINI_MODEL || '') ? env.GEMINI_MODEL : DEFAULT_MODEL;
    const key = typeof env.GEMINI_API_KEY === 'string' ? env.GEMINI_API_KEY : '';
    let status = 500;
    let headers = {};
    let responseBody = '';
    let bodyReader;
    const req = {
      url: `${url.pathname}${url.search}`,
      method: request.method,
      headers: {
        host: url.host,
        origin: suppliedOrigin || undefined,
        'content-type': request.headers.get('content-type') || '',
      },
      socket: {remoteAddress: address},
      cancelBody() { return bodyReader?.cancel(); },
      [Symbol.asyncIterator]() { return requestChunks(request.body, value => { bodyReader = value; }); },
    };
    const res = {
      destroyed: false,
      writeHead(value, values) { status = value; headers = values; },
      end(value = '') { responseBody = value; },
    };

    // The shared handler counts actual bytes while streaming, including chunked bodies.
    // A declared oversized JSON conversation can be rejected before reading any bytes.
    if (request.method === 'POST' && url.pathname === CHAT_PATH &&
        req.headers['content-type'].startsWith('application/json') &&
        Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
      request.body?.cancel().catch(() => {});
      return json(413, {error: 'That conversation is too long. Start a new one.'});
    }

    try {
      await handlePortfolioChat(req, res, {
        fetchImpl,
        allowedOrigins: [origin],
        loadConfig: async () => ({key, model}),
        loadKnowledge,
        bodyTimeoutMs,
      });
      return new Response(responseBody, {status, headers});
    } catch {
      // Do not echo provider responses, credentials, stack traces, or environment values.
      return json(502, {error: 'The assistant could not connect. Please try again later.'});
    }
  };
}
