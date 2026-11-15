/** Logs one line per request after the response has been prepared. */
export function requestLogger(log = console.log) {
  return async function requestLoggerMiddleware(ctx, next) {
    const started = Date.now();
    await next();
    const who = ctx.user ? ctx.user.userId : 'anonymous';
    log(`[API] ${ctx.request.method} ${ctx.request.path} -> ${ctx.response.status} (${who}, ${Date.now() - started}ms)`);
  };
}
