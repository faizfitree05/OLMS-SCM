import {
  MAX_ITEM_QUANTITY, MAX_ORDER_ITEMS, ORDER_STATUSES, STATUS_TRANSITIONS,
} from './constants.js';
import { InvalidStateError, ValidationError } from './errors.js';
import { requirePlainObject } from './input-guard.js';
import { roundMoney } from './money.js';
import {
  requireArrayLength, requireEnum, requireId, requireIntegerInRange, requireIsoDate, requireMoney,
} from './validators.js';

/** One product line of an order. unitPrice is locked when the order is placed. */
export class OrderItem {
  #productId;
  #itemQuantity;
  #unitPrice;

  constructor(itemData) {
    requirePlainObject(itemData, 'order item');
    this.#productId = requireId(itemData.productId, 'productId');
    this.itemQuantity = itemData.itemQuantity;
    this.#unitPrice = requireMoney(itemData.unitPrice, 'unitPrice');
  }

  get productId() { return this.#productId; }
  get itemQuantity() { return this.#itemQuantity; }
  get unitPrice() { return this.#unitPrice; }

  set itemQuantity(value) {
    this.#itemQuantity = requireIntegerInRange(value, 1, MAX_ITEM_QUANTITY, 'itemQuantity');
  }

  calculateSubtotal() { return roundMoney(this.#itemQuantity * this.#unitPrice); }

  toJSON() {
    return {
      productId: this.#productId,
      itemQuantity: this.#itemQuantity,
      unitPrice: this.#unitPrice,
      subtotal: this.calculateSubtotal(),
    };
  }
}

/** Customer order. New orders always start as PENDING. */
export class Order {
  #orderId;
  #customerId;
  #orderDate;
  #status = 'PENDING';
  #items;

  constructor(orderData) {
    requirePlainObject(orderData, 'orderData');
    this.#orderId = requireId(orderData.orderId, 'orderId');
    this.#customerId = requireId(orderData.customerId, 'customerId');
    this.#orderDate = requireIsoDate(orderData.orderDate ?? new Date().toISOString(), 'orderDate');
    this.#items = Order.#buildItems(orderData.items);
  }

  static #buildItems(itemsData) {
    requireArrayLength(itemsData, 1, MAX_ORDER_ITEMS, 'items');
    const items = itemsData.map((itemData) => new OrderItem(itemData));
    const ids = new Set(items.map((item) => item.productId));
    if (ids.size !== items.length) throw new ValidationError('items must not repeat a productId.');
    return items;
  }

  get orderId() { return this.#orderId; }
  get customerId() { return this.#customerId; }
  get orderDate() { return this.#orderDate; }
  get status() { return this.#status; }
  get items() { return [...this.#items]; }
  get totalAmount() { return this.calculateTotal(); }

  calculateTotal() {
    return roundMoney(this.#items.reduce((sum, item) => sum + item.calculateSubtotal(), 0));
  }

  /** Validates the requested status and the life-cycle rule; returns the canonical status. */
  assertCanTransitionTo(newStatus) {
    const target = requireEnum(newStatus, ORDER_STATUSES, 'status');
    if (!STATUS_TRANSITIONS[this.#status].includes(target)) {
      throw new InvalidStateError(`Cannot change status from ${this.#status} to ${target}.`);
    }
    return target;
  }

  updateStatus(newStatus) { this.#status = this.assertCanTransitionTo(newStatus); }

  toJSON() {
    return {
      orderId: this.#orderId,
      customerId: this.#customerId,
      orderDate: this.#orderDate,
      status: this.#status,
      items: this.#items.map((item) => item.toJSON()),
      totalAmount: this.calculateTotal(),
    };
  }
}
