import { ValidationError } from './errors.js';

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
