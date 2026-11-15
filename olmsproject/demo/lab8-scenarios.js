import { createApiServer, buildChain } from '../api/server.js';
import { createRouter } from '../api/routes.js';
import { ScmSystem } from '../scm-system.js';
import { step } from './helpers.js';

const WRAP_WIDTH = 96;

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

export async function createLab8Context() {
  const system = new ScmSystem().loadSampleData();
  const router = createRouter(system);
  router.add('GET', '/api/crash', { public: true }, () => { throw new Error('db password is hunter2'); });
  const main = await listen(createApiServer(system, { router }));
  const limited = await listen(createApiServer(system, { rateLimit: { maxRequests: 3, windowMs: 60000 } }));
  return {
    system,
    router,
    base: main.url,
    limitedBase: limited.url,
    chain: buildChain(system, router).map((m) => m.name),
    close: () => [main, limited].forEach(({ server }) => { server.closeAllConnections(); server.close(); }),
  };
}

function wrap(text, indent) {
  const lines = [];
  let rest = text;
  while (rest.length > WRAP_WIDTH) {
    const comma = rest.lastIndexOf(',', WRAP_WIDTH);
    const cut = comma > 20 ? comma + 1 : WRAP_WIDTH;
    lines.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  lines.push(rest);
  return lines.map((part, i) => `${indent}${i > 0 ? '  ' : ''}${part}`).join('\n');
}

function describeBody(json) {
  if (json.success && Array.isArray(json.data)) {
    const ids = json.data.map((r) => r.productId ?? r.orderId ?? r.userId).join(', ');
    return `{"success":true,"data":[${json.data.length} records: ${ids}]}`;
  }
  return JSON.stringify(json);
}

/** Sends one HTTP request to the running API and prints the request and the response. */
async function call(base, { method = 'GET', path, user, body, rawBody, contentType, note = '' }) {
  const headers = {};
  if (user) headers['x-user-id'] = user;
  let payload = rawBody;
  if (body !== undefined) payload = JSON.stringify(body);
  if (payload !== undefined) headers['content-type'] = contentType ?? 'application/json';
  console.log(`> ${method} ${path.length > 60 ? `${path.slice(0, 57)}...` : path}${user ? `  [as ${user}]` : ''}${note ? `  - ${note}` : ''}`);
  const response = await fetch(`${base}${path}`, { method, headers, body: payload });
  const json = await response.json();
  console.log(wrap(`< ${response.status} ${describeBody(json)}`, '  '));
}

async function callAll(base, requests) {
  for (const request of requests) await call(base, request);
}

const line = (productId, itemQuantity) => ({ productId, itemQuantity });
const newProduct = (overrides = {}) => ({
  productId: 'P300', productName: 'Soy Sauce 500ml', category: 'Pantry', price: 7.9, stockQuantity: 50, ...overrides,
});

const figure7 = {
  title: 'Figure 7: API server start-up, middleware chain and route table',
  async run(ctx) {
    console.log(`API server listening on ${ctx.base.replace(/:\d+$/, ':<port>')}`);
    step('middleware chain (executed in this order for every request)');
    ctx.chain.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));
    step('route table');
    ctx.router.list().filter((r) => r.path !== '/api/crash').forEach((r) => {
      const access = r.public ? 'public' : r.roles.join(', ');
      console.log(`  ${r.method.padEnd(6)} ${r.path.padEnd(24)} ${access}`);
    });
    console.log('');
    await call(ctx.base, { path: '/api/health', note: 'public route, no login needed' });
  },
};

const figure8 = {
  title: 'Figure 8: Successful API requests through the middleware chain',
  async run(ctx) {
    await callAll(ctx.base, [
      { path: '/api/products', user: 'C001', note: 'customer lists products' },
      { path: '/api/products?search=dairy', user: 'C001', note: 'search' },
      { path: '/api/products/P001', user: 'C001' },
      { method: 'POST', path: '/api/products', user: 'A001', body: newProduct(), note: 'admin creates a product' },
      { method: 'PATCH', path: '/api/products/P300', user: 'A001', body: { price: 8.5 }, note: 'admin edits price' },
      { method: 'POST', path: '/api/orders', user: 'C001', body: { orderId: 'O3001', items: [line('P001', 2), line('P300', 1)] }, note: 'customer orders' },
      { method: 'POST', path: '/api/orders', user: 'C002', body: { orderId: 'O3002', customerId: 'C001', items: [line('P002', 1)] }, note: 'customerId in body is ignored' },
      { path: '/api/orders', user: 'C001', note: 'customer only sees own orders' },
    ]);
  },
};

const figure9 = {
  title: 'Figure 9: Authentication, authorisation and routing errors (401 / 403 / 404 / 405)',
  async run(ctx) {
    await callAll(ctx.base, [
      { path: '/api/products', note: 'no x-user-id header' },
      { path: '/api/products', user: 'U404', note: 'unknown user' },
      { method: 'POST', path: '/api/products', user: 'C001', body: newProduct({ productId: 'P301' }), note: 'customer creating product' },
      { path: '/api/users', user: 'C001', note: 'customer reading user list' },
      { method: 'POST', path: '/api/orders', user: 'A001', body: { orderId: 'O3003', items: [line('P001', 1)] }, note: 'admin placing order' },
      { path: '/api/orders/O3002', user: 'C001', note: "reading another customer's order" },
      { method: 'PUT', path: '/api/products', user: 'A001', body: {}, note: 'method not allowed' },
      { path: '/api/unknown', user: 'A001', note: 'no such route' },
    ]);
  },
};

const figure10 = {
  title: 'Figure 10: Malformed and hostile requests (400 / 413 / 415)',
  async run(ctx) {
    const huge = newProduct({ productId: 'P302', productName: 'x'.repeat(12000) });
    await callAll(ctx.base, [
      { method: 'POST', path: '/api/products', user: 'A001', rawBody: '{"productId": ', note: 'broken JSON' },
      { method: 'POST', path: '/api/products', user: 'A001', rawBody: 'name=milk', contentType: 'text/plain', note: 'wrong Content-Type' },
      { method: 'POST', path: '/api/products', user: 'A001', body: huge, note: '12 KB body, limit is 10 KB' },
      { method: 'POST', path: '/api/products', user: 'A001', rawBody: 'null', note: 'JSON null' },
      { method: 'POST', path: '/api/products', user: 'A001', body: newProduct({ productId: 'P302', price: -5 }), note: 'negative price' },
      { method: 'POST', path: '/api/products', user: 'A001', body: newProduct({ productId: 'P302', isAdmin: true }), note: 'unknown field' },
      { path: '/api/products?search=', user: 'C001', note: 'empty search keyword' },
      { method: 'DELETE', path: '/api/products/P300', user: 'A001', note: 'missing ?confirm=true' },
      { path: '/api/products/%E0%A4%A', user: 'C001', note: 'malformed URL escape' },
    ]);
  },
};

const figure11 = {
  title: 'Figure 11: Business-rule errors and role-specific order flow (404 / 409 / 422)',
  async run(ctx) {
    await callAll(ctx.base, [
      { method: 'POST', path: '/api/products', user: 'A001', body: newProduct(), note: 'duplicate productId' },
      { method: 'POST', path: '/api/orders', user: 'C002', body: { orderId: 'O3004', items: [line('P005', 99)] }, note: 'more than in stock' },
      { method: 'POST', path: '/api/orders', user: 'C002', body: { orderId: 'O3004', items: [line('P404', 1)] }, note: 'unknown product' },
      { method: 'PATCH', path: '/api/orders/O3001/status', user: 'A001', body: { status: 'DELIVERED' }, note: 'skips life-cycle steps' },
      { method: 'DELETE', path: '/api/products/P001?confirm=true', user: 'A001', note: 'product in an open order' },
      { method: 'PATCH', path: '/api/orders/O3001/status', user: 'D001', body: { status: 'CANCELLED' }, note: 'driver cancelling' },
      { method: 'PATCH', path: '/api/orders/O3001/status', user: 'A001', body: { status: 'PROCESSING' }, note: 'admin approves' },
      { method: 'PATCH', path: '/api/orders/O3001/status', user: 'D001', body: { status: 'SHIPPED' }, note: 'driver ships' },
      { method: 'PATCH', path: '/api/orders/O3001/status', user: 'C001', body: { status: 'DELIVERED' }, note: 'customer cannot deliver' },
      { method: 'PATCH', path: '/api/orders/O3002/status', user: 'C002', body: { status: 'CANCELLED' }, note: 'customer cancels own order' },
    ]);
  },
};

const figure12 = {
  title: 'Figure 12: Rate limiting (429) and safe handling of an unexpected crash (500)',
  async run(ctx) {
    step('server started with rateLimit { maxRequests: 3 } per 60 s');
    for (let i = 1; i <= 5; i += 1) {
      await call(ctx.limitedBase, { path: '/api/products/P001', user: 'C001', note: `request ${i} of 5` });
    }
    console.log('');
    await call(ctx.base, { path: '/api/crash', note: 'handler throws a plain Error' });
  },
};

export const lab8Scenarios = [figure7, figure8, figure9, figure10, figure11, figure12];
