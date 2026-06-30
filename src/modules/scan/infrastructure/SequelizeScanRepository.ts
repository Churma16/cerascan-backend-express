import { Transaction } from "sequelize";
import Scan, { ScanAttributes } from "../../../models/scan.model";
import { IScanRepository } from "../domain/IScanRepository";

export class SequelizeScanRepository implements IScanRepository {
    async findById(id: number, transaction?: Transaction): Promise<Scan | null> {
        return await Scan.findByPk(id, { transaction });
    }

    async findByScanId(scanId: string, transaction?: Transaction): Promise<Scan | null> {
        return await Scan.findOne({
            where: { scan_id: scanId },
            transaction
        });
    }

    async findAndCountAll(options: { where?: any; order?: any; limit?: number; offset?: number; transaction?: Transaction }): Promise<{ count: number; rows: Scan[] }> {
        return await Scan.findAndCountAll(options);
    }

    async findAll(options?: { where?: any; order?: any; limit?: number; attributes?: any; group?: any; raw?: boolean; transaction?: Transaction }): Promise<any[]> {
        return await Scan.findAll(options);
    }

    async create(payload: Partial<ScanAttributes>, transaction?: Transaction): Promise<Scan> {
        return await Scan.create(payload as any, { transaction });
    }

    async update(id: number, payload: Partial<ScanAttributes>, transaction?: Transaction): Promise<number> {
        const [affectedCount] = await Scan.update(payload, {
            where: { id },
            transaction
        });
        return affectedCount;
    }

    async destroy(id: number, transaction?: Transaction): Promise<void> {
        const scan = await Scan.findByPk(id, { transaction });
        if (scan) {
            await scan.destroy({ transaction });
        }
    }

    async aggregate(attribute: string, aggregateFunction: 'avg' | 'sum' | 'count' | 'min' | 'max', options?: { where?: any; transaction?: Transaction }): Promise<number> {
        const result = await Scan.aggregate(attribute as any, aggregateFunction, options);
        return Number(result) || 0;
    }

    async count(options?: { where?: any; distinct?: boolean; col?: string; transaction?: Transaction }): Promise<number> {
        return await Scan.count(options);
    }
}
