import { requireNonEmptyString, requireNonNegativeNumber, requireInteger, requireEnum } from "./validators.js";

const ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

/** One purchased product line; unitPrice is locked at purchase time. */
export class OrderItem {
  #productId;
  #itemQuantity;
  #unitPrice;

  constructor(productId, itemQuantity, unitPrice) {
    this.#productId = requireNonEmptyString(productId, "productId");
    this.itemQuantity = itemQuantity;
    this.#unitPrice = requireNonNegativeNumber(unitPrice, "unitPrice"); // locked at purchase time
  }

  get productId() { return this.#productId; }
  get unitPrice() { return this.#unitPrice; }

  get itemQuantity() { return this.#itemQuantity; }
  set itemQuantity(newItemQuantity) {
    this.#itemQuantity = requireInteger(newItemQuantity, "itemQuantity", 1);
  }

  calculateSubtotal() {
    return this.#itemQuantity * this.#unitPrice;
  }
}

/** Customer order made of OrderItems, with a validated status. */
export class Order {
  #orderId;
  #orderDate;
  #status;
  #items;

  constructor(orderId, items) {
    this.#orderId = requireNonEmptyString(orderId, "orderId");
    this.#orderDate = new Date().toISOString();
    this.#status = "PENDING";
    this.#items = [...items];
  }

  get orderId() { return this.#orderId; }
  get orderDate() { return this.#orderDate; }
  get status() { return this.#status; }
  get totalAmount() { return this.calculateTotal(); }

  calculateTotal() {
    return this.#items.reduce((sum, item) => sum + item.calculateSubtotal(), 0);
  }

  updateStatus(newStatus) {
    this.#status = requireEnum(newStatus, "status", ORDER_STATUSES);
  }
}
