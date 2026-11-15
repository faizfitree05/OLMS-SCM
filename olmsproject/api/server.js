import http from 'node:http';
import { compose } from './pipeline.js';
import { createRouter } from './routes.js';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { routeResolver } from './middleware/route-resolver.js';
import { bodyParser } from './middleware/body-parser.js';
import { authenticate } from './middleware/authenticate.js';
import { authorize } from './middleware/authorize.js';
import { routeRunner } from './middleware/route-runner.js';

function parseUrl(rawUrl) {
  try {
    const url = new URL(rawUrl, 'http://localhost');
    return { path: url.pathname, query: Object.fromEntries(url.searchParams), invalidUrl: false };
  } catch {
    return { path: '/', query: {}, invalidUrl: true };
  }
}

function createContext(req, res) {
  const { path, query, invalidUrl } = parseUrl(req.url);
  return {
    req,
    res,
    request: { method: req.method, path, query, headers: req.headers, body: undefined, invalidUrl },
    response: { status: 500, body: null },
    route: null,
    params: {},
    user: null,
  };
}

function sendJson(res, response) {
  const payload = JSON.stringify(response.body);
  res.writeHead(response.status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) });
  res.end(payload);
}

/** The ordered middleware chain. Order matters: logging/errors first, handler last. */
export function buildChain(system, router, options = {}) {
  const log = options.logger ?? ((line) => console.log(line));
  return [
    { name: 'requestLogger', handler: requestLogger(log) },
    { name: 'errorHandler', handler: errorHandler(log) },
    { name: 'rateLimiter', handler: rateLimiter(options.rateLimit) },
    { name: 'routeResolver', handler: routeResolver(router) },
    { name: 'bodyParser', handler: bodyParser(options.body) },
    { name: 'authenticate', handler: authenticate(system.users) },
    { name: 'authorize', handler: authorize() },
    { name: 'routeRunner', handler: routeRunner() },
  ];
}

/** Creates (but does not start) the HTTP server that fronts the SCM system. */
export function createApiServer(system, options = {}) {
  const router = options.router ?? createRouter(system);
  const run = compose(buildChain(system, router, options).map((m) => m.handler));
  return http.createServer(async (req, res) => {
    const ctx = createContext(req, res);
    try {
      await run(ctx);
    } catch {
      ctx.response = {
        status: 500,
        body: { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' } },
      };
    }
    sendJson(res, ctx.response);
  });
}
