/**
 * Composes middleware functions (ctx, next) into one runner, Express/Koa style.
 * Each middleware may run code before and after `await next()`.
 */
export function compose(middlewares) {
  return function run(ctx) {
    let lastIndex = -1;
    function dispatch(index) {
      if (index <= lastIndex) return Promise.reject(new Error('next() called more than once'));
      lastIndex = index;
      const middleware = middlewares[index];
      if (!middleware) return Promise.resolve();
      try {
        return Promise.resolve(middleware(ctx, () => dispatch(index + 1)));
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return dispatch(0);
  };
}
