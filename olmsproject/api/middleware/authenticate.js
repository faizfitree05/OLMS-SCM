import { AppError, UnauthorizedError } from '../../errors.js';

/** Identifies the caller from the x-user-id header (demo-grade authentication). */
export function authenticate(userService) {
  return async function authenticateMiddleware(ctx, next) {
    if (!ctx.route.options.public) {
      const userId = ctx.request.headers['x-user-id'];
      if (!userId) throw new UnauthorizedError('Missing x-user-id header.');
      try {
        ctx.user = userService.getById(userId);
      } catch (error) {
        if (error instanceof AppError) throw new UnauthorizedError('Unknown user.');
        throw error;
      }
    }
    await next();
  };
}
