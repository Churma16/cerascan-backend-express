import { parseOrderId } from "./order.util";

describe("order.util", () => {
    describe("parseOrderId", () => {
        it("should accurately parse standard order ID format into numeric userId and planId", () => {
            const rawOrderId = "ORDER-42-3-1718000000";
            const parsedOrderResult = parseOrderId(rawOrderId);

            expect(parsedOrderResult).toEqual({
                userId: 42,
                planId: 3
            });
            expect(typeof parsedOrderResult.userId).toBe("number");
            expect(typeof parsedOrderResult.planId).toBe("number");
        });

        it("should parse order IDs containing large integer identifiers", () => {
            const largeOrderId = "ORDER-999999-88888-1729000000000";
            const parsedOrderResult = parseOrderId(largeOrderId);

            expect(parsedOrderResult.userId).toBe(999999);
            expect(parsedOrderResult.planId).toBe(88888);
        });

        it("should return NaN when segment values are non-numeric strings", () => {
            const nonNumericOrderId = "ORDER-invalidUser-invalidPlan-123456";
            const parsedOrderResult = parseOrderId(nonNumericOrderId);

            expect(Number.isNaN(parsedOrderResult.userId)).toBe(true);
            expect(Number.isNaN(parsedOrderResult.planId)).toBe(true);
        });
    });
});
