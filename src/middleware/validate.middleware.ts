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
            } else {
                if (target.body) {
                    req.body = target.body.parse(req.body);
                }
                if (target.query) {
                    req.query = target.query.parse(req.query) as any;
                }
                if (target.params) {
                    req.params = target.params.parse(req.params) as any;
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
