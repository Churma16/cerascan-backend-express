import {Response} from "express";

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


