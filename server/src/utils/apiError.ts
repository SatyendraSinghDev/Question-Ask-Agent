/**
 * Operational error with HTTP status & machine code — thrown from
 * services/controllers and centralised by the error middleware.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    message: string,
    code = 'INTERNAL_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message = 'Bad request', details?: unknown): ApiError {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'You do not have access to this resource'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message = 'Resource already exists'): ApiError {
    return new ApiError(409, message, 'CONFLICT');
  }

  static unprocessable(message = 'Validation failed', details?: unknown): ApiError {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }

  static serviceUnavailable(message = 'Service unavailable', code = 'SERVICE_UNAVAILABLE'): ApiError {
    return new ApiError(503, message, code);
  }
}
