import { ValidationError } from '../../errors.js';

/** Finds the matching route (404 / 405 otherwise) and exposes it on the context. */
export function routeResolver(router) {
  return async function routeResolverMiddleware(ctx, next) {
    if (ctx.request.invalidUrl) throw new ValidationError('Malformed URL.');
    const { route, params } = router.resolve(ctx.request.method, ctx.request.path);
    ctx.route = route;
    ctx.params = params;
    await next();
  };
}
