/**
 * Domain helper untuk formatting mata uang rupiah.
 */
export const formatIDRCurrency = (price: number): string => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(price);
};
