import { z } from "zod";

export const createPaymentSchema = z.object({
    plan_id: z.union([z.number(), z.string().regex(/^\d+$/, "Plan ID harus berupa angka")]).transform(Number)
});

export const orderIdParamSchema = z.object({
    order_id: z.string().min(1, "Order ID wajib diisi")
});

export const paymentIdParamSchema = z.object({
    id: z.string().regex(/^\d+$/, "ID harus berupa angka").transform(Number)
});

export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
export type OrderIdParamDto = z.infer<typeof orderIdParamSchema>;
export type PaymentIdParamDto = z.infer<typeof paymentIdParamSchema>;
