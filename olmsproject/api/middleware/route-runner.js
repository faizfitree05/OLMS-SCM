/** Terminal middleware: runs the route handler and wraps its result in the response envelope. */
export function routeRunner() {
  return async function routeRunnerMiddleware(ctx) {
    const result = await ctx.route.handler(ctx);
    ctx.response = { status: result.status ?? 200, body: { success: true, data: result.data } };
  };
}
