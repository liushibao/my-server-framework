export const errorSererity = {
    TRIVIAL: 0,
    MINOR: 1,
    MAJOR: 2,
    CRITICAL: 3
}

export class AppError extends Error {

    constructor(message: string, errorCode?: string, serverity?: number, statusCode?: number, originalError?: Error | AppError) {
        super(message);
        this._serverity = serverity == null ? errorSererity[process.env.DEFAULT_ERROR_SERERITY] : serverity;
        this._statusCode = statusCode;
        this._errorCode = errorCode;
        this._originalError = originalError;
    }

    private _serverity: number;
    public get serverity(): number {
        return this._serverity;
    }

    private _statusCode?: number;
    public get statusCode(): number {
        return this._statusCode;
    }

    private _errorCode?: string;
    public get errorCode(): string {
        return this._errorCode;
    }

    private _originalError?: Error | AppError;
    public get originalError(): Error | AppError {
        return this._originalError;
    }

}


export class ConfigError extends AppError {
}


export class ContainerError extends AppError {
    constructor(message: string) {
        super(message);
    }
}


export class LoggerClientError extends AppError {
}


export class RepositoryError extends AppError {
}


export class ServiceError extends AppError {
}


export class HttpError extends AppError {
}


export class DosError extends AppError {
}


export class ServerError extends HttpError {
    constructor(message: string, errorCode: string = "SERVER_ERROR", serverity: number = errorSererity.MINOR, statusCode: number = 500) {
        super(message, errorCode, serverity, statusCode);
    }
}


export class BadRequestError extends HttpError {
    constructor(message: string, errorCode: string = "BAD_REQUEST", serverity: number = errorSererity.MINOR, statusCode: number = 400) {
        super(message, errorCode, serverity, statusCode);
    }
}


export class UnauthorizedError extends HttpError {
    constructor(message: string, errorCode: string = "UNAUTHORIZED", serverity: number = errorSererity.MINOR, statusCode: number = 401) {
        super(message, errorCode, serverity, statusCode);
    }
}


export class AccessDeniedError extends HttpError {
    constructor(message: string, errorCode: string = "ACCESS_DENIED", serverity: number = errorSererity.MINOR, statusCode: number = 403) {
        super(message, errorCode, serverity, statusCode);
    }
}


export class NotFoundError extends HttpError {
    constructor(message: string, errorCode: string = "NOT_FOUND", serverity: number = errorSererity.MINOR, statusCode: number = 404) {
        super(message, errorCode, serverity, statusCode);
    }
}


export class MaxRetryError extends AppError {
}
