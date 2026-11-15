// api.js - REST API: middleware pipeline, router, middleware functions, routes and the HTTP server
import http from 'node:http';
import {
  AppError, ForbiddenError, MethodNotAllowedError, NotFoundError, PayloadTooLargeError,
  TooManyRequestsError, UnauthorizedError, UnsupportedMediaTypeError, ValidationError,
  ORDER_STATUSES, rejectUnknownFields, requireEnum, requirePlainObject,
} from './core.js';

// ===== pipeline.js =====
/**
 * Composes middleware functions (ctx, next) into one runner, Express/Koa style.
 * Each middleware may run code before and after `await next()`.
 */
export function compose(middlewares) {
  return function run(ctx) {
    let lastIndex = -1;
    function dispatch(index) {
      if (index <= lastIndex) return Promise.reject(new Error('next() called more than once'));
      lastIndex = index;
      const middleware = middlewares[index];
      if (!middleware) return Promise.resolve();
      try {
        return Promise.resolve(middleware(ctx, () => dispatch(index + 1)));
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return dispatch(0);
  };
}

// ===== router.js =====
function toPattern(path) {
  const source = path.split('/').map((part) => (part.startsWith(':') ? '([^/]+)' : part)).join('/');
  return new RegExp(`^${source}$`);
}

function decodeParam(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new ValidationError('Malformed URL parameter.');
  }
}

/** Minimal route table: method + path pattern -> handler, with per-route options. */
export class Router {
  #routes = [];

  /** options: { public?: boolean, roles?: string[] } */
  add(method, path, options, handler) {
    const names = path.split('/').filter((p) => p.startsWith(':')).map((p) => p.slice(1));
    this.#routes.push({ method, path, options, handler, names, pattern: toPattern(path) });
  }

  resolve(method, path) {
    const matches = this.#routes.filter((route) => route.pattern.test(path));
    if (matches.length === 0) throw new NotFoundError(`No route for ${path}.`);
    const route = matches.find((candidate) => candidate.method === method);
    if (!route) throw new MethodNotAllowedError(`${method} is not allowed on ${path}.`);
    const values = route.pattern.exec(path).slice(1).map(decodeParam);
    const params = Object.fromEntries(route.names.map((name, i) => [name, values[i]]));
    return { route, params };
  }

  list() { return this.#routes.map((r) => ({ method: r.method, path: r.path, ...r.options })); }
}

// ===== request-logger.js =====
/** Logs one line per request after the response has been prepared. */
export function requestLogger(log = console.log) {
  return async function requestLoggerMiddleware(ctx, next) {
    const started = Date.now();
    await next();
    const who = ctx.user ? ctx.user.userId : 'anonymous';
    log(`[API] ${ctx.request.method} ${ctx.request.path} -> ${ctx.response.status} (${who}, ${Date.now() - started}ms)`);
  };
}

// ===== error-handler.js =====
function errorResponse(status, code, message) {
  return { status, body: { success: false, error: { code, message } } };
}

/**
 * Last line of defence: turns any thrown error into a JSON error response.
 * Unexpected errors are logged but never leak their message to the client.
 */
export function errorHandler(log = console.log) {
  return async function errorHandlerMiddleware(ctx, next) {
    try {
      await next();
    } catch (error) {
      if (error instanceof AppError) {
        ctx.response = errorResponse(error.statusCode, error.code, error.message);
        return;
      }
      log(`[API] Unexpected error: ${error.message}`);
      ctx.response = errorResponse(500, 'INTERNAL_ERROR', 'Internal server error.');
    }
  };
}

// ===== rate-limiter.js =====
const MAX_TRACKED_CLIENTS = 1000;

/** Fixed-window rate limiter keyed by x-user-id (or the client address). */
export function rateLimiter({ maxRequests = 60, windowMs = 60000, now = Date.now } = {}) {
  const buckets = new Map();

  function purgeExpired(current) {
    for (const [key, bucket] of buckets) {
      if (current - bucket.start >= windowMs) buckets.delete(key);
    }
  }

  return async function rateLimiterMiddleware(ctx, next) {
    const current = now();
    if (buckets.size > MAX_TRACKED_CLIENTS) purgeExpired(current);
    const key = String(ctx.request.headers['x-user-id'] ?? ctx.req.socket.remoteAddress);
    const bucket = buckets.get(key);
    if (!bucket || current - bucket.start >= windowMs) buckets.set(key, { start: current, count: 1 });
    else bucket.count += 1;
    if (buckets.get(key).count > maxRequests) {
      throw new TooManyRequestsError(`Rate limit exceeded: max ${maxRequests} requests per ${windowMs / 1000}s.`);
    }
    await next();
  };
}

// ===== route-resolver.js =====
/** Finds the matching route (404 / 405 otherwise) and exposes it on the context. */
export function routeResolver(router) {
  return async function routeResolverMiddleware(ctx, next) {
    if (ctx.request.invalidUrl) throw new ValidationError('Malformed URL.');
    const { route, params } = router.resolve(ctx.request.method, ctx.request.path);
    ctx.route = route;
    ctx.params = params;
    await next();
  };
}

// ===== body-parser.js =====
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

/** Reads the body; keeps draining past the limit so the client always gets a clean 413. */
function readBody(stream, limitBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    stream.on('data', (chunk) => {
      size += chunk.length;
      if (size <= limitBytes) chunks.push(chunk);
    });
    stream.on('end', () => {
      if (size > limitBytes) reject(new PayloadTooLargeError(`Request body exceeds ${limitBytes} bytes.`));
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    stream.on('error', reject);
  });
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError('Malformed JSON body.');
  }
}

/** Parses JSON request bodies for POST/PUT/PATCH, with a size limit and content-type check. */
export function bodyParser({ limitBytes = 10240 } = {}) {
  return async function bodyParserMiddleware(ctx, next) {
    if (METHODS_WITH_BODY.has(ctx.request.method)) {
      const raw = await readBody(ctx.req, limitBytes);
      if (raw.length > 0) {
        const type = String(ctx.request.headers['content-type'] ?? '');
        if (!type.includes('application/json')) {
          throw new UnsupportedMediaTypeError('Content-Type must be application/json.');
        }
        ctx.request.body = parseJson(raw);
      }
    }
    await next();
  };
}

// ===== authenticate.js =====
/** Identifies the caller from the x-user-id header (demo-grade authentication). */
export function authenticate(userService) {
  return async function authenticateMiddleware(ctx, next) {
    if (!ctx.route.options.public) {
      const userId = ctx.request.headers['x-user-id'];
      if (!userId) throw new UnauthorizedError('Missing x-user-id header.');
      try {
        ctx.user = userService.getById(userId);
      } catch (error) {
        if (error instanceof AppError) throw new UnauthorizedError('Unknown user.');
        throw error;
      }
    }
    await next();
  };
}

// ===== authorize.js =====
/** Role-based access control using the roles declared on the matched route. */
export function authorize() {
  return async function authorizeMiddleware(ctx, next) {
    const { roles } = ctx.route.options;
    if (roles && !roles.includes(ctx.user.role)) {
      throw new ForbiddenError(`Role ${ctx.user.role} may not ${ctx.request.method} ${ctx.request.path}.`);
    }
    await next();
  };
}

// ===== route-runner.js =====
/** Terminal middleware: runs the route handler and wraps its result in the response envelope. */
export function routeRunner() {
  return async function routeRunnerMiddleware(ctx) {
    const result = await ctx.route.handler(ctx);
    ctx.response = { status: result.status ?? 200, body: { success: true, data: result.data } };
  };
}

// ===== routes.js =====
const ALL_ROLES = ['ADMIN', 'CUSTOMER', 'DRIVER'];
const DRIVER_STATUSES = ['SHIPPED', 'DELIVERED'];

const ok = (data) => ({ status: 200, data });
const created = (data) => ({ status: 201, data });

function listProducts(system, ctx) {
  const { query } = ctx.request;
  return Object.hasOwn(query, 'search') ? system.products.search(query.search) : system.products.all();
}

function deleteProduct(system, ctx) {
  if (ctx.request.query.confirm !== 'true') throw new ValidationError('Deletion requires ?confirm=true.');
  return ok({ deleted: system.products.remove(ctx.params.id) });
}

function listOrders(system, ctx) {
  const orders = system.orders.all();
  return ctx.user.role === 'CUSTOMER' ? orders.filter((o) => o.customerId === ctx.user.userId) : orders;
}

/** Customers may only see their own orders; others get a 404 so existence is not leaked. */
function getOrder(system, ctx) {
  const order = system.orders.getById(ctx.params.id);
  if (ctx.user.role === 'CUSTOMER' && order.customerId !== ctx.user.userId) {
    throw new NotFoundError(`Order "${order.orderId}" not found.`);
  }
  return order;
}

function placeOrder(system, ctx) {
  const body = requirePlainObject(ctx.request.body, 'request body');
  // customerId always comes from the authenticated user, never from the client.
  return system.orders.add({ ...body, customerId: ctx.user.userId });
}

function assertMayChangeStatus(user, order, status) {
  if (user.role === 'DRIVER' && !DRIVER_STATUSES.includes(status)) {
    throw new ForbiddenError('Drivers may only set SHIPPED or DELIVERED.');
  }
  if (user.role !== 'CUSTOMER') return;
  if (order.customerId !== user.userId) throw new NotFoundError(`Order "${order.orderId}" not found.`);
  if (status !== 'CANCELLED') throw new ForbiddenError('Customers may only cancel their own orders.');
}

function changeOrderStatus(system, ctx) {
  const order = system.orders.getById(ctx.params.id);
  const body = requirePlainObject(ctx.request.body, 'request body');
  rejectUnknownFields(body, ['status'], 'request body');
  const status = requireEnum(body.status, ORDER_STATUSES, 'status');
  assertMayChangeStatus(ctx.user, order, status);
  return system.orders.update(order.orderId, { status });
}

/** Builds the route table of the SCM REST API. */
export function createRouter(system) {
  const router = new Router();
  router.add('GET', '/api/health', { public: true }, () => ok({ status: 'ok' }));
  router.add('GET', '/api/products', { roles: ALL_ROLES }, (ctx) => ok(listProducts(system, ctx)));
  router.add('GET', '/api/products/:id', { roles: ALL_ROLES }, (ctx) => ok(system.products.getById(ctx.params.id)));
  router.add('POST', '/api/products', { roles: ['ADMIN'] }, (ctx) => created(system.products.add(ctx.request.body)));
  router.add('PATCH', '/api/products/:id', { roles: ['ADMIN'] }, (ctx) => ok(system.products.update(ctx.params.id, ctx.request.body)));
  router.add('DELETE', '/api/products/:id', { roles: ['ADMIN'] }, (ctx) => deleteProduct(system, ctx));
  router.add('GET', '/api/users', { roles: ['ADMIN'] }, () => ok(system.users.all()));
  router.add('GET', '/api/orders', { roles: ALL_ROLES }, (ctx) => ok(listOrders(system, ctx)));
  router.add('GET', '/api/orders/:id', { roles: ALL_ROLES }, (ctx) => ok(getOrder(system, ctx)));
  router.add('POST', '/api/orders', { roles: ['CUSTOMER'] }, (ctx) => created(placeOrder(system, ctx)));
  router.add('PATCH', '/api/orders/:id/status', { roles: ALL_ROLES }, (ctx) => ok(changeOrderStatus(system, ctx)));
  return router;
}

// ===== server.js =====
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
