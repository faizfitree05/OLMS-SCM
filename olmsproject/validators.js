import { ValidationError } from './errors.js';
import { sanitizeText } from './input-guard.js';
import { ID_PATTERN, MAX_ID_LENGTH, MAX_PRICE } from './constants.js';

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
