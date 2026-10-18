/** Error envelope returned by the Levik API: `{ statusCode, code, message, details, path, timestamp }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    let body: { code?: string; message?: string | string[]; details?: unknown } = {};
    try {
      body = await response.clone().json();
    } catch {
      // Non-JSON error (proxy, network appliance…): fall back to the status text.
    }
    const message = Array.isArray(body.message) ? body.message.join(" ") : body.message;
    return new ApiError(response.status, body.code ?? "HTTP_ERROR", message || response.statusText || "Request failed", body.details);
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

/** Human-readable message for toasts and inline alerts. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return "Cannot reach the Levik API. Check your connection and that the API is running.";
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
