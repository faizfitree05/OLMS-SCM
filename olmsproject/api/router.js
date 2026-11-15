import { MethodNotAllowedError, NotFoundError, ValidationError } from '../errors.js';

function toPattern(path) {
  const source = path.split('/').map((part) => (part.startsWith(':') ? '([^/]+)' : part)).join('/');
  return new RegExp(`^${source}$`);
}

function decodeParam(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new ValidationError('Malformed URL parameter.');
  }
}

/** Minimal route table: method + path pattern -> handler, with per-route options. */
export class Router {
  #routes = [];

  /** options: { public?: boolean, roles?: string[] } */
  add(method, path, options, handler) {
    const names = path.split('/').filter((p) => p.startsWith(':')).map((p) => p.slice(1));
    this.#routes.push({ method, path, options, handler, names, pattern: toPattern(path) });
  }

  resolve(method, path) {
    const matches = this.#routes.filter((route) => route.pattern.test(path));
    if (matches.length === 0) throw new NotFoundError(`No route for ${path}.`);
    const route = matches.find((candidate) => candidate.method === method);
    if (!route) throw new MethodNotAllowedError(`${method} is not allowed on ${path}.`);
    const values = route.pattern.exec(path).slice(1).map(decodeParam);
    const params = Object.fromEntries(route.names.map((name, i) => [name, values[i]]));
    return { route, params };
  }

  list() { return this.#routes.map((r) => ({ method: r.method, path: r.path, ...r.options })); }
}
