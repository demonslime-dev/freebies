import { Product } from '@prisma/client';

class BaseError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class UnauthorizedError extends BaseError {
    constructor(message: string = 'Unauthorized', options?: ErrorOptions) {
        super(message, options);
    }
}

export class InvalidCredentialsError extends BaseError {
    constructor(message: string = 'Invalid credentials', options?: ErrorOptions) {
        super(message, options);
    }
}

export class NotFoundError extends BaseError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

export class AlreadyClaimedError extends BaseError {
    constructor(message?: string, options?: ErrorOptions) {
        super(message ?? 'Product is already claimed', options);
    }
}

export class PropertyNotFoundError extends NotFoundError {
    constructor(property: string, options?: ErrorOptions) {
        super(`Unable to retrieve property: ${property}`, options);
    }
}

export class ProductPropertyNotFoundError extends PropertyNotFoundError {
    constructor(property: Exclude<keyof Product, 'id'>, options?: ErrorOptions) {
        super(property, options);
    }
}

export class InternalServerError extends BaseError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

export class BadRequestError extends BaseError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

export class ForbiddenError extends BaseError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}
