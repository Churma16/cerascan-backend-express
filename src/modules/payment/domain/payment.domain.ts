export interface ParsedOrder {
    userId: number;
    planId: number;
}

/**
 * Domain function untuk mem-parsing Order ID format: ORDER-userId-planId-timestamp
 */
export const parseOrderId = (orderId: string): ParsedOrder => {
    const segments = orderId.split("-");
    return {
        userId: Number(segments[1]),
        planId: Number(segments[2])
    };
};
