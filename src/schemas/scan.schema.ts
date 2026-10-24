import { z } from "zod";

export const paginationQuerySchema = z.object({
    page: z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number).optional(),
    limit: z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number).optional().default(50)
});

export const scanIdParamSchema = z.object({
    id: z.union([z.number(), z.string().regex(/^\d+$/, "ID scan harus berupa angka")]).transform(Number)
});

export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;
export type ScanIdParamDto = z.infer<typeof scanIdParamSchema>;
