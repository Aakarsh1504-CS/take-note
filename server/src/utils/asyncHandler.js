// Wraps an async route handler so any thrown error / rejected promise is
// forwarded to Express's error pipeline instead of becoming an unhandled
// rejection. Lets controllers drop their try/catch boilerplate.
module.exports = function asyncHandler(fn) {
  return function asyncHandlerWrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
