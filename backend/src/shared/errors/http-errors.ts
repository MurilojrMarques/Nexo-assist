import { AppError } from "./app-error.js";

export class UnauthorizedError extends AppError {
  constructor(message = "Autenticação necessária.") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class RefreshTokenRaceError extends AppError {
  constructor() {
    super("A sessão acabou de ser renovada em outra aba. Tente de novo.", 401, "REFRESH_TOKEN_RACE");
    this.name = "RefreshTokenRaceError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Você não tem permissão para acessar este recurso.") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado.") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Muitas tentativas. Aguarde alguns minutos e tente de novo.") {
    super(message, 429, "TOO_MANY_REQUESTS");
    this.name = "TooManyRequestsError";
  }
}
