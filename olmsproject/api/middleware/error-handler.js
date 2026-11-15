import { AppError } from '../../errors.js';

function errorResponse(status, code, message) {
  return { status, body: { success: false, error: { code, message } } };
}

/**
 * Last line of defence: turns any thrown error into a JSON error response.
 * Unexpected errors are logged but never leak their message to the client.
 */
export function errorHandler(log = console.log) {
  return async function errorHandlerMiddleware(ctx, next) {
    try {
      await next();
    } catch (error) {
      if (error instanceof AppError) {
        ctx.response = errorResponse(error.statusCode, error.code, error.message);
        return;
      }
      log(`[API] Unexpected error: ${error.message}`);
      ctx.response = errorResponse(500, 'INTERNAL_ERROR', 'Internal server error.');
    }
  };
}
