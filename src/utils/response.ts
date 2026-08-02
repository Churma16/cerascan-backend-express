import {Response} from "express";

/**
 * Sends a standard response with the given code, message, and optional data.
 * @param res - The Express response object.
 * @param code - The HTTP status code.
 * @param message - A message describing the result of the operation.
 * @param data - Optional data to include in the response. Defaults to null.
 * @param source - Source of the data, defaults to 'db'.
 */
export const sendResponse = (res: Response, code: number, message: string, data: any = null, source: string = 'db') => {
    return res.status(code).json({
        meta: {
            code: code,
            status: code < 400 ? 'success' : 'error',
            source: source,
            message: message,
        },
        data: data
    });
};

/**
 * Sends a multi-record response with the given code, message, and optional data.
 * @param res - The Express response object.
 * @param code - The HTTP status code.
 * @param message - A message describing the result of the operation.
 * @param data - Optional data to include in the response. Defaults to null.
 * @param source - Source of the data, defaults to 'db'.
 */
export const sendResponseMulti = (res: Response, code: number, message: string, data: any = null, source: string = 'db') => {
    return res.status(code).json({
        meta: {
            code: code,
            status: code < 400 ? 'success' : 'error',
            source: source,
            message: message,
            count: data ? data.length : 0,
        },
        data: data
    });
};

/**
 * Sends a paginated response with the given message, rows of data, total count, page number, and limit.
 * @param res - The Express response object.
 * @param message - A message describing the result of the operation.
 * @param rows - An array of data representing the current page's records.
 * @param count - The total number of items available.
 * @param page - The current page number.
 * @param limit - The maximum number of items per page.
 * @param source - Source of the data, defaults to 'db'.
 */
export const sendResponsePaginated = (
    res: Response,
    message: string,
    rows: any[],
    count: number,
    page: number,
    limit: number,
    source: string = 'db'
) => {
    return res.status(200).json({
        meta: {
            code: 200,
            status: 'success',
            source: source,
            message: message,
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit: limit,
        },
        data: rows,
    });
};


