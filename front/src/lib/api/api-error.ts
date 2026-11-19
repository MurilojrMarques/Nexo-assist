type ErrorPayload = {
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static fromResponse(status: number, payload: unknown): ApiError {
    const error = (payload as ErrorPayload | null)?.error;
    const code = typeof error?.code === "string" ? error.code : "UNKNOWN_ERROR";
    const message = typeof error?.message === "string" ? error.message : "Não foi possível concluir a operação.";

    return new ApiError(status, code, message);
  }

  static network(): ApiError {
    return new ApiError(0, "NETWORK_ERROR", "Não foi possível conectar ao servidor.");
  }
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}
