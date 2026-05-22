export const sendResponse = (res: any, code: number, message: string, data: any = null, source: string = 'db') => {
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

export const sendResponseMulti = (res: any, code: number, message: string, data: any = null, source: string = 'db') => {
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


