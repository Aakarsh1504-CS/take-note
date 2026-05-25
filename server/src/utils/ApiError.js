class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || `E_${status}`;
  }

  static badRequest(msg, code) { return new ApiError(400, msg, code); }
  static unauthorized(msg = 'Not authenticated', code) { return new ApiError(401, msg, code); }
  static forbidden(msg = 'Forbidden', code) { return new ApiError(403, msg, code); }
  static notFound(msg = 'Not found', code) { return new ApiError(404, msg, code); }
  static conflict(msg, code) { return new ApiError(409, msg, code); }
}

module.exports = ApiError;
