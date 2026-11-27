import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { sendResponse } from "../utils/response.util";

export interface RequestValidationTargets {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}

/**
 * Middleware to validate request payload (body, query, params) against Zod schemas.
 * Automatically sanitizes and strips unlisted fields to prevent mass-assignment.
 */
export const validate = (target: ZodSchema | RequestValidationTargets) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            if ("parse" in target) {
                req.body = target.parse(req.body);
                next();
                return;
            }

            if (target.body) {
                req.body = target.body.parse(req.body);
            }
            if (target.query) {
                const parsedQuery = target.query.parse(req.query);
                try {
                    req.query = parsedQuery as any;
                } catch {
                    Object.defineProperty(req, "query", {
                        value: parsedQuery,
                        writable: true,
                        configurable: true,
                        enumerable: true
                    });
                }
            }
            if (target.params) {
                const parsedParams = target.params.parse(req.params);
                try {
                    req.params = parsedParams as any;
                } catch {
                    Object.defineProperty(req, "params", {
                        value: parsedParams,
                        writable: true,
                        configurable: true,
                        enumerable: true
                    });
                }
            }
            next();
        } catch (error: any) {
            if (error instanceof ZodError) {
                const formattedErrors = (error.issues || []).map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message
                }));

                const firstErrorMessage = formattedErrors[0]?.message || "Validasi input gagal";

                sendResponse(
                    res,
                    400,
                    firstErrorMessage,
                    { errors: formattedErrors },
                    "validation"
                );
                return;
            }

            sendResponse(res, 400, "Validasi input gagal", null, "validation");
        }
    };
};
