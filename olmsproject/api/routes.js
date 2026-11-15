import { ForbiddenError, NotFoundError, ValidationError } from '../errors.js';
import { rejectUnknownFields, requirePlainObject } from '../input-guard.js';
import { requireEnum } from '../validators.js';
import { ORDER_STATUSES } from '../constants.js';
import { Router } from './router.js';

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
