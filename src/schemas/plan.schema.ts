import { z } from "zod";

export const planIdParamSchema = z.object({
    id: z.union([z.number(), z.string().regex(/^\d+$/, "ID plan harus berupa angka")]).transform(Number)
});

export const adjustedPriceParamSchema = z.object({
    planId: z.union([z.number(), z.string().regex(/^\d+$/, "ID plan harus berupa angka")]).transform(Number)
});

export const createPlanSchema = z.object({
    name: z.string().min(2, "Nama paket minimal 2 karakter"),
    price: z.number().nonnegative("Harga tidak boleh negatif"),
    scan_quota: z.number().int().nonnegative("Kuota scan tidak boleh negatif"),
    duration_days: z.number().int().positive("Durasi hari harus lebih dari 0")
});

export const updatePlanSchema = z.object({
    name: z.string().min(2).optional(),
    price: z.number().nonnegative().optional(),
    scan_quota: z.number().int().nonnegative().optional(),
    duration_days: z.number().int().positive().optional()
}).refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu field harus diupdate"
});

export type PlanIdParamDto = z.infer<typeof planIdParamSchema>;
export type AdjustedPriceParamDto = z.infer<typeof adjustedPriceParamSchema>;
export type CreatePlanDto = z.infer<typeof createPlanSchema>;
export type UpdatePlanDto = z.infer<typeof updatePlanSchema>;
