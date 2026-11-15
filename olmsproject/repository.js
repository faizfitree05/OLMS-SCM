import { DuplicateError, NotFoundError } from './errors.js';

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
