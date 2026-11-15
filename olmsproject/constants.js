// Global constants (UPPER_SNAKE_CASE, as defined in the Part 1 naming convention).
export const MAX_ID_LENGTH = 30;
export const MAX_PRODUCT_NAME_LENGTH = 150;
export const MAX_USER_NAME_LENGTH = 100;
export const MAX_CATEGORY_LENGTH = 50;
export const MAX_SEARCH_LENGTH = 100;
export const MAX_STOCK_LIMIT = 100000;
export const MAX_PRICE = 100000;
export const MAX_ITEM_QUANTITY = 1000;
export const MAX_ORDER_ITEMS = 20;
export const MAX_CELL_WIDTH = 40;
export const EMPTY_MESSAGE = 'No records found.';
export const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export const USER_ROLES = Object.freeze(['CUSTOMER', 'ADMIN', 'DRIVER']);
export const ORDER_STATUSES = Object.freeze([
  'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED',
]);

// Allowed order life cycle: a status may only move forward along these edges.
export const STATUS_TRANSITIONS = Object.freeze({
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
});
export const OPEN_ORDER_STATUSES = Object.freeze(['PENDING', 'PROCESSING', 'SHIPPED']);
