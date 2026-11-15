import { Repository } from './repository.js';
import { reportFailure, printTable, printDetails } from './display.js';
import { ValidationError } from './errors.js';
import { MAX_SEARCH_LENGTH } from './constants.js';
import {
  requireId, requireMaxLength, requireNonEmptyString,
} from './validators.js';
import { requirePlainObject, rejectUnknownFields, requireAtLeastOneField } from './input-guard.js';

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
