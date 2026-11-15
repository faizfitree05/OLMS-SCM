// main.js - demo runner. Usage: node main.js lab5 | lab7 | lab8
import { ScmSystem } from './scm.js';
import { createApiServer, buildChain, createRouter } from './api.js';

// ===== demo helpers =====
/** Prints the call being demonstrated, so every output block is self-explaining. */
function step(text) {
  console.log(`\n> ${text}`);
}

/** Runs [label, action] pairs in order, printing each label first. */
function runCases(cases) {
  cases.forEach(([label, action]) => {
    step(label);
    action();
  });
}

function summarize(result) {
  if (Array.isArray(result)) return `${result.length} record(s)`;
  const text = JSON.stringify(result);
  return text && text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

/**
 * Calls an action that may throw and prints a one-line verdict:
 * ACCEPTED with a short result, or REJECTED with the error code and message.
 */
function probe(label, action) {
  console.log(`> ${label}`);
  try {
    console.log(`    ACCEPTED -> ${summarize(action())}`);
  } catch (error) {
    console.log(`    REJECTED [${error.code ?? error.name}] ${error.message}`);
  }
}

function runProbes(cases) {
  cases.forEach(([label, action]) => probe(label, action));
}

const lab5 = (() => {
function createLab5Context() {
  return { system: new ScmSystem() };
}

const user = (userId, name, email, role) => ({ userId, name, email, role });

function userCreateOk({ users }) {
  return [
    ['createUser(C001)', () => users.createUser(user('C001', 'Aisyah Rahman', 'aisyah@mail.my', 'CUSTOMER'))],
    ['createUser(C002)', () => users.createUser(user('C002', 'Daniel Lim', 'daniel.lim@mail.my', 'CUSTOMER'))],
    ['createUser(A001)', () => users.createUser(user('A001', 'Nurul Huda', 'nurul.huda@olms.my', 'ADMIN'))],
    ['createUser(D001)', () => users.createUser(user('D001', 'Kumar Raj', 'kumar.raj@olms.my', 'DRIVER'))],
    ['createUser(C003)', () => users.createUser(user('C003', 'Temp Customer', 'temp@mail.my', 'CUSTOMER'))],
  ];
}

function userCreateFail({ users }) {
  return [
    ['createUser with duplicate userId C001', () => users.createUser(user('C001', 'Other', 'other@mail.my', 'CUSTOMER'))],
    ['createUser with duplicate email', () => users.createUser(user('C009', 'Other', 'AISYAH@mail.my', 'CUSTOMER'))],
    ['createUser with invalid email', () => users.createUser(user('C010', 'Bad Email', 'not-an-email', 'CUSTOMER'))],
    ['createUser with invalid role MANAGER', () => users.createUser(user('C011', 'Boss', 'boss@mail.my', 'MANAGER'))],
  ];
}

const figure1 = {
  title: 'Figure 1: User module - Create (successful and rejected inputs) and Data Display',
  run({ system }) {
    runCases(userCreateOk(system));
    runCases(userCreateFail(system));
    step('displayUsers()');
    system.users.displayUsers();
  },
};

const figure2 = {
  title: 'Figure 2: User module - Search (match, no match, empty keyword)',
  run({ system }) {
    runCases([
      ['searchUsers("daniel")  - partial name match', () => system.users.searchUsers('daniel')],
      ['searchUsers("zzz")  - no match', () => system.users.searchUsers('zzz')],
      ['searchUsers("")  - empty keyword', () => system.users.searchUsers('')],
    ]);
  },
};

const figure3 = {
  title: 'Figure 3: User module - Edit (successful and unsuccessful)',
  run({ system }) {
    runCases([
      ['editUser("C002", { name, email })', () => system.users.editUser('C002', { name: 'Daniel Lim Wei', email: 'daniel.wei@mail.my' })],
      ['editUser("C001", { role: "OWNER" })  - invalid role', () => system.users.editUser('C001', { role: 'OWNER' })],
      ['editUser("U999", { name })  - unknown user', () => system.users.editUser('U999', { name: 'Ghost' })],
    ]);
  },
};

const figure4 = {
  title: 'Figure 4: User module - Delete (confirmation, deletion, repeated deletion)',
  run({ system }) {
    runCases([
      ['deleteUser("C003")  - no confirmation yet', () => system.users.deleteUser('C003')],
      ['deleteUser("C003", true)', () => system.users.deleteUser('C003', true)],
      ['deleteUser("C003", true)  - already deleted', () => system.users.deleteUser('C003', true)],
    ]);
  },
};

function productSeed({ products }) {
  const p = (productId, productName, category, price, stockQuantity) =>
    ({ productId, productName, category, price, stockQuantity });
  return [
    ['createProduct(P001)', () => products.createProduct(p('P001', 'Fresh Milk 1L', 'Dairy', 6.5, 40))],
    ['createProduct(P002)', () => products.createProduct(p('P002', 'Wholemeal Bread', 'Bakery', 4.2, 25))],
    ['createProduct(P003)', () => products.createProduct(p('P003', 'Bananas 1kg', 'Produce', 5.9, 60))],
    ['createProduct(P004)', () => products.createProduct(p('P004', 'Eggs Grade A (10)', 'Dairy', 11.5, 30))],
    ['createProduct(P005)', () => products.createProduct(p('P005', 'Jasmine Rice 5kg', 'Pantry', 32.9, 15))],
    ['createProduct(P001)  - duplicate', () => products.createProduct(p('P001', 'Copy', 'Dairy', 1, 1))],
  ];
}

const figure5 = {
  title: 'Figure 5: Product module (from Part 2) running inside the integrated system',
  run({ system }) {
    runCases(productSeed(system));
    step('searchProducts("dairy")');
    system.products.searchProducts('dairy');
    step('editProduct("P002", { price: 4.5 })');
    system.products.editProduct('P002', { price: 4.5 });
  },
};

const line = (productId, itemQuantity) => ({ productId, itemQuantity });

function orderCases({ orders }) {
  return [
    ['createOrder(O1001) for C001', () => orders.createOrder({ orderId: 'O1001', customerId: 'C001', items: [line('P001', 2), line('P003', 1)] })],
    ['createOrder(O1002) for C002', () => orders.createOrder({ orderId: 'O1002', customerId: 'C002', items: [line('P002', 1), line('P004', 3)] })],
    ['createOrder for unknown customer', () => orders.createOrder({ orderId: 'O1003', customerId: 'C404', items: [line('P001', 1)] })],
    ['createOrder for an ADMIN account', () => orders.createOrder({ orderId: 'O1003', customerId: 'A001', items: [line('P001', 1)] })],
    ['createOrder with unknown product', () => orders.createOrder({ orderId: 'O1003', customerId: 'C001', items: [line('P404', 1)] })],
    ['createOrder with insufficient stock (P005 x100)', () => orders.createOrder({ orderId: 'O1003', customerId: 'C001', items: [line('P005', 100)] })],
    ['createOrder with duplicate orderId', () => orders.createOrder({ orderId: 'O1001', customerId: 'C001', items: [line('P001', 1)] })],
  ];
}

const figure6 = {
  title: 'Figure 6: Order module - Create (stock is reduced, bad orders are rejected)',
  run({ system }) {
    runCases(orderCases(system));
    step('displayOrders()');
    system.orders.displayOrders();
    step('displayProducts()  - stock of P001-P004 has dropped');
    system.products.displayProducts();
  },
};

const figure7 = {
  title: 'Figure 7: Order module - order details, subtotals and calculateTotal()',
  run({ system }) {
    runCases([
      ['showOrder("O1001")', () => system.orders.showOrder('O1001')],
      ['showOrder("O9999")  - unknown order', () => system.orders.showOrder('O9999')],
    ]);
  },
};

const figure8 = {
  title: 'Figure 8: Order module - Search by status, customer and orderId',
  run({ system }) {
    runCases([
      ['searchOrders("pending")  - by status', () => system.orders.searchOrders('pending')],
      ['searchOrders("C002")  - by customerId', () => system.orders.searchOrders('C002')],
      ['searchOrders("delivered")  - no match', () => system.orders.searchOrders('delivered')],
    ]);
  },
};

const figure9 = {
  title: 'Figure 9: Order module - Edit (status life cycle, cancellation restores stock)',
  run({ system }) {
    runCases([
      ['editOrder("O1001", { status: "PROCESSING" })', () => system.orders.editOrder('O1001', { status: 'PROCESSING' })],
      ['editOrder("O1001", { status: "DELIVERED" })  - skips a step', () => system.orders.editOrder('O1001', { status: 'DELIVERED' })],
      ['editOrder("O1002", { status: "CANCELLED" })', () => system.orders.editOrder('O1002', { status: 'CANCELLED' })],
    ]);
    step('displayProducts()  - P002 and P004 stock is back to the original level');
    system.products.displayProducts();
  },
};

const figure10 = {
  title: 'Figure 10: Order module - Delete (only cancelled orders can be removed)',
  run({ system }) {
    runCases([
      ['deleteOrder("O1002")  - no confirmation yet', () => system.orders.deleteOrder('O1002')],
      ['deleteOrder("O1001", true)  - still PROCESSING', () => system.orders.deleteOrder('O1001', true)],
      ['deleteOrder("O1002", true)', () => system.orders.deleteOrder('O1002', true)],
    ]);
  },
};

const figure11 = {
  title: 'Figure 11: System integration - cross-module rules and final dashboard',
  run({ system }) {
    runCases([
      ['deleteProduct("P001", true)  - used by open order O1001', () => system.products.deleteProduct('P001', true)],
      ['deleteUser("C001", true)  - has open order O1001', () => system.users.deleteUser('C001', true)],
      ['editOrder("O1001", SHIPPED)', () => system.orders.editOrder('O1001', { status: 'SHIPPED' })],
      ['editOrder("O1001", DELIVERED)', () => system.orders.editOrder('O1001', { status: 'DELIVERED' })],
      ['deleteProduct("P003", true)  - allowed now (no open order)', () => system.products.deleteProduct('P003', true)],
    ]);
    step('displayDashboard()');
    system.displayDashboard();
  },
};

const lab5Scenarios = [
  figure1, figure2, figure3, figure4, figure5, figure6, figure7, figure8, figure9, figure10, figure11,
];

return { create: createLab5Context, scenarios: lab5Scenarios };
})();

const lab7 = (() => {
function createLab7Context() {
  return { system: new ScmSystem().loadSampleData() };
}

const product = (overrides = {}) => ({
  productId: 'P100', productName: 'Test Item', category: 'Pantry', price: 1, stockQuantity: 1, ...overrides,
});
const POLLUTED = '{"productId":"P100","productName":"X","category":"Y","price":1,"stockQuantity":1,"__proto__":{"isAdmin":true}}';

function typeCases(p) {
  return [
    ['add(null)', () => p.add(null)],
    ['add([])', () => p.add([])],
    ['add("P100")  - a string instead of an object', () => p.add('P100')],
    ['add({})  - empty object', () => p.add({})],
    ['add({ ...valid, discount: 50 })  - unknown field', () => p.add(product({ discount: 50 }))],
    ['add(JSON.parse(... "__proto__" ...))  - prototype pollution', () => p.add(JSON.parse(POLLUTED))],
    ['price = NaN', () => p.add(product({ price: NaN }))],
    ['price = Infinity', () => p.add(product({ price: Infinity }))],
    ['price = "5.00"  - number sent as text', () => p.add(product({ price: '5.00' }))],
  ];
}

function rangeCases(p) {
  return [
    ['price = 1.999  - 3 decimal places', () => p.add(product({ price: 1.999 }))],
    ['price = -1', () => p.add(product({ price: -1 }))],
    ['price = 100000.01  - above MAX_PRICE', () => p.add(product({ price: 100000.01 }))],
    ['stockQuantity = 2.5', () => p.add(product({ stockQuantity: 2.5 }))],
    ['stockQuantity = 100001  - above MAX_STOCK_LIMIT', () => p.add(product({ stockQuantity: 100001 }))],
    ['productName = 151 characters', () => p.add(product({ productName: 'x'.repeat(151) }))],
    ['productName = "     "  - whitespace only', () => p.add(product({ productName: '     ' }))],
    ['productId = "P 1;DROP"  - illegal characters', () => p.add(product({ productId: 'P 1;DROP' }))],
    ['productName = "<b>Hot</b>\\n  Sauce"  - markup is stripped', () => p.add(product({ productName: '<b>Hot</b>\n  Sauce' }))],
  ];
}

const figure1 = {
  title: 'Figure 1: Defensive Create - hostile and malformed product input',
  run({ system }) {
    step('createProduct(null)  - console flow keeps running instead of crashing');
    system.products.createProduct(null);
    console.log('');
    runProbes(typeCases(system.products));
    runProbes(rangeCases(system.products));
  },
};

function editCases(p) {
  return [
    ['update("P001", { price: 7, stockQuantity: -5 })  - one bad field', () => p.update('P001', { price: 7, stockQuantity: -5 })],
    ['update("P001", {})  - nothing to change', () => p.update('P001', {})],
    ['update("P001", { productId: "P999" })  - id is read-only', () => p.update('P001', { productId: 'P999' })],
    ['update("P001", "price=1")  - not an object', () => p.update('P001', 'price=1')],
    ['update("P001", null)', () => p.update('P001', null)],
    ['update("P001", { stockQuantity: "10" })  - text', () => p.update('P001', { stockQuantity: '10' })],
    ['update("P404", { price: 1 })  - unknown product', () => p.update('P404', { price: 1 })],
    ['update("P001", { price: 7.25 })  - valid', () => p.update('P001', { price: 7.25 })],
  ];
}

const figure2 = {
  title: 'Figure 2: Defensive Edit - all-or-nothing updates and read-only fields',
  run({ system }) {
    runProbes(editCases(system.products).slice(0, 1));
    step('displayProducts([P001])  - the rejected edit changed nothing (price still 6.50, stock 40)');
    system.products.displayProducts([system.products.getById('P001')]);
    console.log('');
    runProbes(editCases(system.products).slice(1));
  },
};

function searchCases(p) {
  return [
    ['search("")', () => p.search('')],
    ['search("     ")', () => p.search('     ')],
    ['search("a" x 101)  - longer than MAX_SEARCH_LENGTH', () => p.search('a'.repeat(101))],
    ['search(42)  - number', () => p.search(42)],
    ['search(null)', () => p.search(null)],
    ['search(undefined)', () => p.search(undefined)],
    ['search(".*")  - regex characters are plain text', () => p.search('.*')],
    ['search("(")  - would crash a naive RegExp', () => p.search('(')],
    ['search("<script>alert(1)</script>")  - markup stripped first', () => p.search('<script>alert(1)</script>')],
    ['search("  MILK ")  - case and spaces ignored', () => p.search('  MILK ')],
  ];
}

const figure3 = {
  title: 'Figure 3: Defensive Search - empty, oversized, wrong-type and special-character keywords',
  run({ system }) {
    runProbes(searchCases(system.products));
  },
};

const line = (productId, itemQuantity) => ({ productId, itemQuantity });
const order = (overrides = {}) => ({
  orderId: 'O2001', customerId: 'C001', items: [line('P001', 2)], ...overrides,
});

function orderShapeCases(o) {
  return [
    ['add({ ...order, items: undefined })', () => o.add(order({ items: undefined }))],
    ['add({ ...order, items: [] })  - empty basket', () => o.add(order({ items: [] }))],
    ['add({ ...order, items: "P001" })', () => o.add(order({ items: 'P001' }))],
    ['add(order with 21 lines)  - above MAX_ORDER_ITEMS', () => o.add(order({ items: Array.from({ length: 21 }, (_, i) => line(`P${i}`, 1)) }))],
    ['add(order with P001 twice)  - duplicate lines', () => o.add(order({ items: [line('P001', 1), line('P001', 1)] }))],
    ['add(line with unitPrice: 0.01)  - price tampering', () => o.add(order({ items: [{ ...line('P001', 1), unitPrice: 0.01 }] }))],
    ['add({ ...order, status: "DELIVERED" })  - status tampering', () => o.add(order({ status: 'DELIVERED' }))],
    ['add({ ...order, customerId: undefined })', () => o.add(order({ customerId: undefined }))],
  ];
}

function orderQuantityCases(o) {
  return [
    ['itemQuantity = 0', () => o.add(order({ items: [line('P001', 0)] }))],
    ['itemQuantity = -1', () => o.add(order({ items: [line('P001', -1)] }))],
    ['itemQuantity = 2.5', () => o.add(order({ items: [line('P001', 2.5)] }))],
    ['itemQuantity = "3"  - text', () => o.add(order({ items: [line('P001', '3')] }))],
    ['itemQuantity = 1001  - above MAX_ITEM_QUANTITY', () => o.add(order({ items: [line('P001', 1001)] }))],
    ['itemQuantity = 41  - more than the 40 in stock', () => o.add(order({ items: [line('P001', 41)] }))],
    ['add(valid order O2001: P001 x2)', () => o.add(order())],
  ];
}

const figure4 = {
  title: 'Figure 4: Defensive Order creation - malformed baskets, tampering and stock limits',
  run({ system }) {
    runProbes(orderShapeCases(system.orders));
    runProbes(orderQuantityCases(system.orders));
  },
};

function ruleCases({ orders, products, users }) {
  return [
    ['update("O2001", { status: "DELIVERED" })  - skips steps', () => orders.update('O2001', { status: 'DELIVERED' })],
    ['update("O2001", { status: "LOST" })  - not a status', () => orders.update('O2001', { status: 'LOST' })],
    ['update("O2001", { status: 42 })', () => orders.update('O2001', { status: 42 })],
    ['update("O2001", { status: "PENDING" })  - same state', () => orders.update('O2001', { status: 'PENDING' })],
    ['remove("O2001")  - order is still open', () => orders.remove('O2001')],
    ['products.remove("P001")  - used by open order', () => products.remove('P001')],
    ['users.remove("C001")  - has an open order', () => users.remove('C001')],
    ['update("O2001", { status: "cancelled" })  - stock restored', () => orders.update('O2001', { status: 'cancelled' })],
    ['update("O2001", { status: "PROCESSING" })  - cancelled is final', () => orders.update('O2001', { status: 'PROCESSING' })],
  ];
}

const figure5 = {
  title: 'Figure 5: Defensive business rules - status life cycle and referential integrity',
  run({ system }) {
    runProbes(ruleCases(system));
    step('displayProducts([P001])  - cancelling restored the 2 reserved units');
    system.products.displayProducts([system.products.getById('P001')]);
    step('deleteProduct("P002", "yes")  - only the boolean true counts as confirmation');
    system.products.deleteProduct('P002', 'yes');
  },
};

const LONG_NAME = 'Organic Free-Range Cold-Pressed Extra Virgin Olive Oil, Family Value Pack';

const figure6 = {
  title: 'Figure 6: Defensive output - bad lists, empty state and very long values',
  run({ system }) {
    runCases([
      ['displayProducts(null)', () => system.products.displayProducts(null)],
      ['displayProducts("abc")', () => system.products.displayProducts('abc')],
      ['displayProducts([])  - empty state', () => system.products.displayProducts([])],
      ['createProduct with a 73-character name', () => system.products.createProduct(product({ productId: 'P200', productName: LONG_NAME }))],
      ['displayProducts([P200])  - table cell is shortened', () => system.products.displayProducts([system.products.getById('P200')])],
      ['deleteProduct("P200")  - details view still shows the full name', () => system.products.deleteProduct('P200')],
    ]);
  },
};

const lab7Scenarios = [figure1, figure2, figure3, figure4, figure5, figure6];

return { create: createLab7Context, scenarios: lab7Scenarios };
})();

const lab8 = (() => {
const WRAP_WIDTH = 96;

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

async function createLab8Context() {
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

const lab8Scenarios = [figure7, figure8, figure9, figure10, figure11, figure12];

return { create: createLab8Context, scenarios: lab8Scenarios };
})();

// ===== entry point =====
const DEMOS = { lab5, lab7, lab8 };

async function runDemo(name) {
  const demo = DEMOS[name];
  if (!demo) {
    console.log(`Unknown demo "${name}". Use one of: ${Object.keys(DEMOS).join(', ')}`);
    return;
  }
  const context = await demo.create();
  for (const scenario of demo.scenarios) {
    console.log(`\n===== ${scenario.title} =====`);
    await scenario.run(context);
  }
  if (context.close) await context.close();
}

await runDemo(process.argv[2] ?? 'lab5');
