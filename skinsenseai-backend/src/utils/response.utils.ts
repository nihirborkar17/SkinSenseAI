import type { StandardResponse } from '../types/response.types.js';

// Standardized API Response Utilities

// Success Response
export const successResponse = <T> (
    data: T,
    message: string = 'Success'
): StandardResponse<T> => {
    return {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    };
};

// Error Response
export const errorResponse = (
    message: string,
    statusCode: number = 500,
    details? : any
): StandardResponse => {
    return {
        success: false,
        error: {
            message,
            statusCode,
            details
        },
        timestamp: new Date().toISOString()
    };
};

// ValidationError Response
export const ValidationErrorResponse = (
    errors: Array<{ field: string, message: string }>
): StandardResponse => {
    return {
        success: false,
        error: {
            message: 'Validation Failed',
            statusCode: 400,
            details: errors
        },
        timestamp: new Date().toISOString()
    };
};