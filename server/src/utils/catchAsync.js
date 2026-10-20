/**
 * Async error wrapper for Express route handlers.
 *
 * Eliminates try/catch boilerplate in every controller method.
 * Wraps an async function and forwards any rejected promise
 * to Express's next() error handler automatically.
 *
 * Usage:
 *   router.get('/users', catchAsync(async (req, res) => {
 *     const users = await userService.getAll();
 *     res.json(users);
 *   }));
 */
function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = catchAsync;
