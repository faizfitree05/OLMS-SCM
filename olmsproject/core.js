// core.js - shared building blocks: errors, constants, money, validators, display, BaseService

// ===== errors.js =====
// Typed errors. Every error carries a machine-readable code and an HTTP-style status
// so the console layer and the API middleware can report failures consistently.
export class AppError extends Error {
  constructor(message, code = 'APP_ERROR', statusCode = 500) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AppError {
  constructor(message) { super(message, 'VALIDATION_ERROR', 400); }
}
export class UnauthorizedError extends AppError {
  constructor(message) { super(message, 'UNAUTHORIZED', 401); }
}
export class ForbiddenError extends AppError {
  constructor(message) { super(message, 'FORBIDDEN', 403); }
}
export class NotFoundError extends AppError {
  constructor(message) { super(message, 'NOT_FOUND', 404); }
}
export class MethodNotAllowedError extends AppError {
  constructor(message) { super(message, 'METHOD_NOT_ALLOWED', 405); }
}
export class DuplicateError extends AppError {
  constructor(message) { super(message, 'DUPLICATE', 409); }
}
export class InvalidStateError extends AppError {
  constructor(message) { super(message, 'INVALID_STATE', 409); }
}
export class InsufficientStockError extends AppError {
  constructor(message) { super(message, 'INSUFFICIENT_STOCK', 422); }
}
export class PayloadTooLargeError extends AppError {
  constructor(message) { super(message, 'PAYLOAD_TOO_LARGE', 413); }
}
export class UnsupportedMediaTypeError extends AppError {
  constructor(message) { super(message, 'UNSUPPORTED_MEDIA_TYPE', 415); }
}
export class TooManyRequestsError extends AppError {
  constructor(message) { super(message, 'TOO_MANY_REQUESTS', 429); }
}

// ===== constants.js =====
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

// ===== money.js =====
/** Rounds a monetary value to 2 decimal places (avoids 0.1 + 0.2 style float drift). */
export function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Formats a monetary value for display, e.g. 6.5 -> "6.50". */
export function formatMoney(value) {
  return roundMoney(value).toFixed(2);
}

// ===== input-guard.js =====
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;
const MARKUP_TAGS = /<[^>]*>/g;
const STRAY_BRACKETS = /[<>]/g;
const FORBIDDEN_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype']);

/** Cleans free text: removes control characters and markup, collapses whitespace. */
export function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(CONTROL_CHARACTERS, ' ')
    .replace(MARKUP_TAGS, '')
    .replace(STRAY_BRACKETS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Accepts only plain objects and blocks prototype-pollution keys. */
export function requirePlainObject(value, name) {
  const proto = value === null || typeof value !== 'object' ? undefined : Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new ValidationError(`${name} must be an object.`);
  }
  const forbidden = Object.keys(value).find((key) => FORBIDDEN_KEYS.includes(key));
  if (forbidden) throw new ValidationError(`${name} contains forbidden field "${forbidden}".`);
  return value;
}

/** Rejects fields that are not on the allow-list (stops tampering such as a forged unitPrice). */
export function rejectUnknownFields(data, allowedFields, name) {
  const unknown = Object.keys(data).filter((key) => !allowedFields.includes(key));
  if (unknown.length > 0) {
    throw new ValidationError(`${name} contains unknown field(s): ${unknown.join(', ')}.`);
  }
}

/** Rejects an empty update object. */
export function requireAtLeastOneField(data, name) {
  if (Object.keys(data).length === 0) {
    throw new ValidationError(`${name} must contain at least one field.`);
  }
}

// ===== validators.js =====
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

/** Returns a sanitized, non-empty string or throws. */
export function requireNonEmptyString(value, fieldName) {
  const text = sanitizeText(value);
  if (typeof text !== 'string' || text === '') {
    throw new ValidationError(`${fieldName} must be a non-empty string.`);
  }
  return text;
}

export function requireMaxLength(text, maxLength, fieldName) {
  if (text.length > maxLength) {
    throw new ValidationError(`${fieldName} must not exceed ${maxLength} characters.`);
  }
  return text;
}

/** Identifier: non-empty, at most MAX_ID_LENGTH, letters/digits/-/_ only. */
export function requireId(value, fieldName) {
  const id = requireMaxLength(requireNonEmptyString(value, fieldName), MAX_ID_LENGTH, fieldName);
  if (!ID_PATTERN.test(id)) {
    throw new ValidationError(`${fieldName} may only contain letters, digits, "-" and "_".`);
  }
  return id;
}

function requireFiniteNumber(value, fieldName) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError(`${fieldName} must be a finite number.`);
  }
  return value;
}

export function requireNonNegativeNumber(value, fieldName, maxValue = Infinity) {
  requireFiniteNumber(value, fieldName);
  if (value < 0 || value > maxValue) {
    const range = Number.isFinite(maxValue) ? `between 0 and ${maxValue}` : '>= 0';
    throw new ValidationError(`${fieldName} must be a number ${range}.`);
  }
  return value;
}

/** Money: finite, 0..MAX_PRICE, at most 2 decimal places. */
export function requireMoney(value, fieldName) {
  requireNonNegativeNumber(value, fieldName, MAX_PRICE);
  if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) {
    throw new ValidationError(`${fieldName} must have at most 2 decimal places.`);
  }
  return value;
}

export function requireIntegerInRange(value, minValue, maxValue, fieldName) {
  requireFiniteNumber(value, fieldName);
  if (!Number.isInteger(value) || value < minValue || value > maxValue) {
    throw new ValidationError(`${fieldName} must be an integer between ${minValue} and ${maxValue}.`);
  }
  return value;
}

/** Case-insensitive enum check; returns the canonical (upper-case) value. */
export function requireEnum(value, allowedValues, fieldName) {
  const candidate = typeof value === 'string' ? value.trim().toUpperCase() : value;
  if (!allowedValues.includes(candidate)) {
    throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}.`);
  }
  return candidate;
}

export function requireValidEmail(value) {
  const email = requireNonEmptyString(value, 'email').toLowerCase();
  requireMaxLength(email, MAX_EMAIL_LENGTH, 'email');
  if (!EMAIL_PATTERN.test(email)) throw new ValidationError('email must be a valid email address.');
  return email;
}

/** Accepts any parseable ISO 8601 timestamp and normalises it. */
export function requireIsoDate(value, fieldName) {
  const parsed = typeof value === 'string' ? new Date(value) : null;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(String(value)) || !parsed || Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${fieldName} must be an ISO 8601 timestamp.`);
  }
  return parsed.toISOString();
}

export function requireArrayLength(value, minLength, maxLength, fieldName) {
  if (!Array.isArray(value)) throw new ValidationError(`${fieldName} must be an array.`);
  if (value.length < minLength || value.length > maxLength) {
    throw new ValidationError(`${fieldName} must contain ${minLength} to ${maxLength} entries.`);
  }
  return value;
}

// ===== display.js =====
function truncate(text, maxWidth) {
  return text.length > maxWidth ? `${text.slice(0, maxWidth - 3)}...` : text;
}

function formatLine(values, widths, columns) {
  const padded = values.map((value, i) =>
    columns[i].align === 'right' ? value.padStart(widths[i]) : value.padEnd(widths[i]));
  return `| ${padded.join(' | ')} |`;
}

/** Prints rows as an aligned table, or the empty-state message when there are no rows. */
export function printTable(columns, rows) {
  if (rows.length === 0) {
    console.log(EMPTY_MESSAGE);
    return;
  }
  const cells = rows.map((row) => columns.map((col) => truncate(String(col.value(row)), MAX_CELL_WIDTH)));
  const widths = columns.map((col, i) => Math.max(col.header.length, ...cells.map((r) => r[i].length)));
  console.log(formatLine(columns.map((col) => col.header), widths, columns));
  console.log(`|${widths.map((w) => '-'.repeat(w + 2)).join('|')}|`);
  cells.forEach((row) => console.log(formatLine(row, widths, columns)));
}

/** Prints every attribute of one record as "name : value" lines. */
export function printDetails(fields) {
  const keyWidth = Math.max(...Object.keys(fields).map((key) => key.length));
  Object.entries(fields).forEach(([key, value]) => {
    console.log(`  ${key.padEnd(keyWidth)} : ${value}`);
  });
}

/** Reports a failed action; unexpected (non-AppError) errors are labelled as such. */
export function reportFailure(tag, error) {
  const prefix = error instanceof AppError ? '' : 'Unexpected error: ';
  console.log(`[${tag} FAILED] ${prefix}${error.message}`);
}

// ===== repository.js =====
/** In-memory record store. The Map is private so no outside code can modify it directly. */
export class Repository {
  #label;
  #records = new Map();

  constructor(label) {
    this.#label = label;
  }

  get size() { return this.#records.size; }

  has(id) { return this.#records.has(id); }

  get(id) {
    const record = this.#records.get(id);
    if (!record) throw new NotFoundError(`${this.#label} "${id}" not found.`);
    return record;
  }

  add(id, record) {
    if (this.#records.has(id)) throw new DuplicateError(`Duplicate ${this.#label} id "${id}".`);
    this.#records.set(id, record);
    return record;
  }

  remove(id) {
    const record = this.get(id);
    this.#records.delete(id);
    return record;
  }

  values() { return [...this.#records.values()]; }
}

// ===== base-service.js =====
/**
 * Shared CRUD behaviour for every module (Product, User, Order).
 * - Core methods (insert, getById, search, remove, ...) throw typed errors and never print;
 *   the API middleware uses these directly.
 * - run* methods are the console flow (messages + automatic data display).
 */
export class BaseService {
  #repository;
  #deletionGuards = [];

  constructor(label, idField, columns) {
    this.label = label;
    this.idField = idField;
    this.columns = columns;
    this.#repository = new Repository(label);
  }

  // ---------- core (throwing) operations ----------
  all() { return this.#repository.values(); }

  getById(id) { return this.#repository.get(requireId(id, this.idField)); }

  insert(record) {
    return this.#repository.add(record[this.idField], record);
  }

  addDeletionGuard(guard) { this.#deletionGuards.push(guard); }

  remove(id) {
    const record = this.getById(id);
    this.#deletionGuards.forEach((guard) => guard(record[this.idField]));
    return this.#repository.remove(record[this.idField]);
  }

  search(criteria) {
    const term = requireNonEmptyString(criteria, 'search keyword').toLowerCase();
    requireMaxLength(term, MAX_SEARCH_LENGTH, 'search keyword');
    return this.all().filter((record) => this.matches(record, term));
  }

  /** Validates an update object, dry-runs it on a copy, then applies it (all-or-nothing). */
  applyUpdates(record, updates, allowedFields, Model) {
    requirePlainObject(updates, 'updates');
    rejectUnknownFields(updates, allowedFields, 'updates');
    requireAtLeastOneField(updates, 'updates');
    new Model({ ...record.toJSON(), ...updates });
    Object.entries(updates).forEach(([field, value]) => { record[field] = value; });
    return record;
  }

  // ---------- console flow ----------
  attempt(tag, action) {
    try {
      return action();
    } catch (error) {
      reportFailure(tag, error);
      return null;
    }
  }

  display(list) {
    const rows = list === undefined ? this.all() : list;
    if (!Array.isArray(rows)) {
      reportFailure('DISPLAY', new ValidationError('record list must be an array.'));
      return;
    }
    printTable(this.columns, rows);
  }

  describe(record) { return record.toJSON(); }

  runCreate(data) {
    const record = this.attempt('CREATE', () => this.add(data));
    if (record) console.log(`[CREATE SUCCESS] ${this.label} "${record[this.idField]}" created.`);
    return record;
  }

  runSearch(criteria) {
    const results = this.attempt('SEARCH', () => this.search(criteria));
    if (results && results.length === 0) console.log('Not found.');
    if (results && results.length > 0) {
      console.log(`[SEARCH SUCCESS] ${results.length} ${this.label}(s) matched "${criteria}":`);
      this.display(results);
    }
    console.log('--- Full record set ---');
    this.display();
    return results ?? [];
  }

  runEdit(id, updates) {
    const target = this.attempt('EDIT', () => this.getById(id));
    if (target) {
      console.log(`[FOUND] ${this.label} "${id}" before edit:`);
      printDetails(this.describe(target));
    }
    const edited = target && this.attempt('EDIT', () => this.update(id, updates));
    if (edited) console.log(`[EDIT SUCCESS] ${this.label} "${id}" updated.`);
    console.log('--- Full record set ---');
    this.display();
    return Boolean(edited);
  }

  runDelete(id, confirmed = false) {
    const target = this.attempt('DELETE', () => this.getById(id));
    if (target && confirmed !== true) {
      printDetails(this.describe(target));
      console.log(`[CONFIRMATION REQUIRED] Delete this ${this.label}? Call again with confirmed = true.`);
      return false;
    }
    const removed = target && this.attempt('DELETE', () => this.remove(id));
    if (removed) console.log(`[DELETE SUCCESS] ${this.label} "${id}" deleted.`);
    console.log('--- Full record set ---');
    this.display();
    return Boolean(removed);
  }
}
