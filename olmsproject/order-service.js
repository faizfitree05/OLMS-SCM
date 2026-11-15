import { BaseService } from './base-service.js';
import { printDetails, printTable, reportFailure } from './display.js';
import {
  ForbiddenError, InsufficientStockError, InvalidStateError, ValidationError,
} from './errors.js';
import { formatMoney } from './money.js';
import { Order } from './order-model.js';
import { rejectUnknownFields, requireAtLeastOneField, requirePlainObject } from './input-guard.js';
import {
  MAX_ITEM_QUANTITY, MAX_ORDER_ITEMS, OPEN_ORDER_STATUSES,
} from './constants.js';
import { requireArrayLength, requireId, requireIntegerInRange } from './validators.js';

const ORDER_FIELDS = ['orderId', 'customerId', 'items'];
const LINE_FIELDS = ['productId', 'itemQuantity'];

const ORDER_COLUMNS = [
  { header: 'orderId', value: (o) => o.orderId },
  { header: 'customerId', value: (o) => o.customerId },
  { header: 'orderDate', value: (o) => o.orderDate.slice(0, 10) },
  { header: 'status', value: (o) => o.status },
  { header: 'items', value: (o) => o.items.length, align: 'right' },
  { header: 'totalAmount', value: (o) => formatMoney(o.calculateTotal()), align: 'right' },
];

const ITEM_COLUMNS = [
  { header: 'productId', value: (i) => i.productId },
  { header: 'itemQuantity', value: (i) => i.itemQuantity, align: 'right' },
  { header: 'unitPrice', value: (i) => formatMoney(i.unitPrice), align: 'right' },
  { header: 'subtotal', value: (i) => formatMoney(i.calculateSubtotal()), align: 'right' },
];

/**
 * Order module. Depends on ProductService (stock, prices) and UserService (customers),
 * which are injected so the three modules are integrated without being tightly coupled.
 */
export class OrderService extends BaseService {
  #products;
  #users;

  constructor(productService, userService) {
    super('Order', 'orderId', ORDER_COLUMNS);
    this.#products = productService;
    this.#users = userService;
    productService.addDeletionGuard((id) => this.#assertProductNotInOpenOrder(id));
    userService.addDeletionGuard((id) => this.#assertCustomerHasNoOpenOrders(id));
  }

  // ---------- core operations ----------
  add(orderData) {
    requirePlainObject(orderData, 'orderData');
    rejectUnknownFields(orderData, ORDER_FIELDS, 'orderData');
    const customer = this.#requireCustomer(orderData.customerId);
    const lines = this.#priceLines(orderData.items);
    const order = new Order({ orderId: orderData.orderId, customerId: customer.userId, items: lines });
    this.insert(order);
    lines.forEach((line) => this.#products.adjustStockQuantity(line.productId, -line.itemQuantity));
    return order;
  }

  update(orderId, updates) {
    const order = this.getById(orderId);
    requirePlainObject(updates, 'updates');
    rejectUnknownFields(updates, ['status'], 'updates');
    requireAtLeastOneField(updates, 'updates');
    const target = order.assertCanTransitionTo(updates.status);
    if (target === 'CANCELLED') this.#restock(order);
    order.updateStatus(target);
    return order;
  }

  remove(orderId) {
    const order = this.getById(orderId);
    if (order.status !== 'CANCELLED') {
      throw new InvalidStateError(`Only CANCELLED orders can be deleted (current status: ${order.status}).`);
    }
    return super.remove(orderId);
  }

  matches(order, term) {
    return order.orderId.toLowerCase() === term
      || order.customerId.toLowerCase() === term
      || order.status.toLowerCase() === term;
  }

  describe(order) {
    const lines = order.items.map((i) => `${i.productId} x${i.itemQuantity} @ ${formatMoney(i.unitPrice)}`);
    return {
      orderId: order.orderId,
      customerId: order.customerId,
      orderDate: order.orderDate,
      status: order.status,
      items: lines.join(', '),
      totalAmount: formatMoney(order.calculateTotal()),
    };
  }

  // ---------- private helpers ----------
  #requireCustomer(customerId) {
    const customer = this.#users.getById(requireId(customerId, 'customerId'));
    if (customer.role !== 'CUSTOMER') {
      throw new ForbiddenError(`User "${customer.userId}" has role ${customer.role}; only CUSTOMER accounts can place orders.`);
    }
    return customer;
  }

  /** Looks up each product, checks stock and locks the current price into the line. */
  #priceLines(items) {
    requireArrayLength(items, 1, MAX_ORDER_ITEMS, 'items');
    return items.map((line) => {
      requirePlainObject(line, 'order line');
      rejectUnknownFields(line, LINE_FIELDS, 'order line');
      const product = this.#products.getById(line.productId);
      const itemQuantity = requireIntegerInRange(line.itemQuantity, 1, MAX_ITEM_QUANTITY, 'itemQuantity');
      if (product.stockQuantity < itemQuantity) {
        throw new InsufficientStockError(
          `Insufficient stock for ${product.productId}: requested ${itemQuantity}, available ${product.stockQuantity}.`);
      }
      return { productId: product.productId, itemQuantity, unitPrice: product.price };
    });
  }

  #restock(order) {
    order.items.forEach((item) => this.#products.adjustStockQuantity(item.productId, item.itemQuantity));
  }

  #openOrders() {
    return this.all().filter((order) => OPEN_ORDER_STATUSES.includes(order.status));
  }

  #assertProductNotInOpenOrder(productId) {
    const used = this.#openOrders().filter((o) => o.items.some((i) => i.productId === productId));
    if (used.length > 0) {
      throw new InvalidStateError(`Product "${productId}" is used by open order(s): ${used.map((o) => o.orderId).join(', ')}.`);
    }
  }

  #assertCustomerHasNoOpenOrders(userId) {
    const open = this.#openOrders().filter((o) => o.customerId === userId);
    if (open.length > 0) {
      throw new InvalidStateError(`User "${userId}" has open order(s): ${open.map((o) => o.orderId).join(', ')}.`);
    }
  }

  // ---------- console API ----------
  createOrder(orderData) { return this.runCreate(orderData); }

  searchOrders(criteria) { return this.runSearch(criteria); }

  editOrder(orderId, updates) { return this.runEdit(orderId, updates); }

  deleteOrder(orderId, confirmed = false) { return this.runDelete(orderId, confirmed); }

  displayOrders(orderList) { this.display(orderList); }

  /** Shows one order with its lines, subtotals and calculateTotal(). */
  showOrder(orderId) {
    const order = this.attempt('VIEW', () => this.getById(orderId));
    if (!order) return null;
    printDetails(this.describe(order));
    printTable(ITEM_COLUMNS, order.items);
    console.log(`calculateTotal() = ${formatMoney(order.calculateTotal())}`);
    return order;
  }
}
