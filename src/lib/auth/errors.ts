// Domain auth errors with HTTP status mapping.
// Distinguish 401 (not authenticated), 403 (authenticated but not allowed),
// and 404 (exists but must look absent for isolation, or truly missing).

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Invalid request") {
    super(400, message);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Authentication required") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "You do not have permission to perform this action") {
    super(403, message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource not found") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class PlanLimitError extends HttpError {
  constructor(message = "Plan limit reached") {
    super(402, message);
    this.name = "PlanLimitError";
  }
}

export class AiTokenLimitError extends HttpError {
  constructor(message = "AI token limit reached") {
    super(402, message);
    this.name = "AiTokenLimitError";
  }
}

export function statusForError(err: unknown): { status: number; message: string } {
  if (err instanceof HttpError) return { status: err.status, message: err.message };
  return { status: 500, message: "Internal server error" };
}
