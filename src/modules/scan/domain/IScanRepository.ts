import { Transaction } from "sequelize";
import Scan, { ScanAttributes } from "../../../models/scan.model";

export interface IScanRepository {
    findById(id: number, transaction?: Transaction): Promise<Scan | null>;
    findByScanId(scanId: string, transaction?: Transaction): Promise<Scan | null>;
    findAndCountAll(options: { where?: any; order?: any; limit?: number; offset?: number; transaction?: Transaction }): Promise<{ count: number; rows: Scan[] }>;
    findAll(options?: { where?: any; order?: any; limit?: number; attributes?: any; group?: any; raw?: boolean; transaction?: Transaction }): Promise<any[]>;
    create(payload: Partial<ScanAttributes>, transaction?: Transaction): Promise<Scan>;
    update(id: number, payload: Partial<ScanAttributes>, transaction?: Transaction): Promise<number>;
    destroy(id: number, transaction?: Transaction): Promise<void>;
    aggregate(attribute: string, aggregateFunction: 'avg' | 'sum' | 'count' | 'min' | 'max', options?: { where?: any; transaction?: Transaction }): Promise<number>;
    count(options?: { where?: any; distinct?: boolean; col?: string; transaction?: Transaction }): Promise<number>;
}
