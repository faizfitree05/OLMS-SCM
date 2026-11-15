import { ForbiddenError } from '../../errors.js';

/** Role-based access control using the roles declared on the matched route. */
export function authorize() {
  return async function authorizeMiddleware(ctx, next) {
    const { roles } = ctx.route.options;
    if (roles && !roles.includes(ctx.user.role)) {
      throw new ForbiddenError(`Role ${ctx.user.role} may not ${ctx.request.method} ${ctx.request.path}.`);
    }
    await next();
  };
}
