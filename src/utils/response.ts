export const sendResponse = (res: any, code: number, message: string, data: any = null) => {
    return res.status(code).json({
        meta: {
            code: code,
            status: code < 400 ? 'success' : 'error',
            message: message,
        },
        data: data
    });
};