import { z } from "zod";

export const subscriptionIdParamSchema = z.object({
    id: z.union([z.number(), z.string().regex(/^\d+$/, "ID subscription harus berupa angka")]).transform(Number)
});

export const createSubscriptionSchema = z.object({
    user_id: z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number),
    plan_id: z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number),
    status: z.enum(["active", "expired", "canceled"]).optional().default("active"),
    acquisition_method: z.string().optional().default("midtrans_payment"),
    note: z.string().optional()
});

export const updateSubscriptionSchema = z.object({
    status: z.enum(["active", "expired", "canceled"]).optional(),
    plan_id: z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number).optional(),
    note: z.string().optional()
}).refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu field harus diupdate"
});

export const giveSubscriptionSchema = z.object({
    user_id: z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number),
    plan_id: z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number),
    acquisition_method: z.string().optional().default("admin_grant"),
    note: z.string().optional().default("Diberikan langsung oleh Administrator")
});

export type SubscriptionIdParamDto = z.infer<typeof subscriptionIdParamSchema>;
export type CreateSubscriptionDto = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionDto = z.infer<typeof updateSubscriptionSchema>;
export type GiveSubscriptionDto = z.infer<typeof giveSubscriptionSchema>;
