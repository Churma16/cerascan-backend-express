import { Response } from "express";

/**
 * Sends a standard response with the given code, message, and optional data.
 */
export const sendResponse = (
    res: Response,
    code: number,
    message: string,
    data: any = null,
    source: string = "db"
) => {
    return res.status(code).json({
        meta: {
            code,
            status: code < 400 ? "success" : "error",
            source,
            message
        },
        data
    });
};

/**
 * Sends a multi-record response with the given code, message, and optional data.
 */
export const sendResponseMulti = (
    res: Response,
    code: number,
    message: string,
    data: any = null,
    source: string = "db"
) => {
    return res.status(code).json({
        meta: {
            code,
            status: code < 400 ? "success" : "error",
            source,
            message,
            count: data ? data.length : 0
        },
        data
    });
};

/**
 * Sends a paginated response with the given message, rows of data, total count, page number, and limit.
 */
export const sendResponsePaginated = (
    res: Response,
    message: string,
    rows: any[],
    count: number,
    page: number,
    limit: number,
    source: string = "db"
) => {
    return res.status(200).json({
        meta: {
            code: 200,
            status: "success",
            source,
            message,
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit
        },
        data: rows
    });
};
