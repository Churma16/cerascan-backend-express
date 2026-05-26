declare module 'midtrans-client' {
    export interface SnapOptions {
        isProduction?: boolean;
        serverKey?: string;
        clientKey?: string;
    }

    export class Snap {
        transaction: {
            notification: (payload: any) => Promise<any>;
        };

        constructor(options?: SnapOptions);

        createTransaction(param: any): Promise<any>;
    }

    const midtransClient: {
        Snap: typeof Snap;
        Core?: any;
    };

    export default midtransClient;
}

