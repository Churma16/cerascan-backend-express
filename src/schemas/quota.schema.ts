import { z } from "zod";

export const userIdParamSchema = z.object({
    user_id: z.string().regex(/^\d+$/, "User ID harus berupa angka yang valid").transform(Number)
});

export const createQuotaSchema = z.object({
    user_id: z.number().int().positive("User ID harus berupa angka positif"),
    total_quota: z.number().int().nonnegative("Total quota tidak boleh negatif"),
    next_reset_date: z.union([z.string(), z.date()]).transform((val) => new Date(val)).optional()
});

export const updateQuotaSchema = z.object({
    total_quota: z.number().int().nonnegative().optional(),
    used_quota: z.number().int().nonnegative().optional(),
    next_reset_date: z.union([z.string(), z.date()]).transform((val) => new Date(val)).optional()
}).refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu field harus diupdate"
});

export const incrementQuotaSchema = z.object({
    amount: z.number().int().positive("Amount harus lebih dari 0")
});

export type UserIdParamDto = z.infer<typeof userIdParamSchema>;
export type CreateQuotaDto = z.infer<typeof createQuotaSchema>;
export type UpdateQuotaDto = z.infer<typeof updateQuotaSchema>;
export type IncrementQuotaDto = z.infer<typeof incrementQuotaSchema>;
