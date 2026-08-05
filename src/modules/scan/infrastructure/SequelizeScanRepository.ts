import { Transaction } from "sequelize";
import Scan, { ScanAttributes } from "../../../models/scan.model";
import { IScanRepository } from "../domain/IScanRepository";

/**
 * Implementasi repositori data scan berbasis Sequelize (SQL Database).
 *
 * @implements {IScanRepository}
 */
export class SequelizeScanRepository implements IScanRepository {
    /**
     * @async
     * @param {number} id - ID entitas scan.
     * @param {Transaction} [transaction] - Objek transaksi.
     * @returns {Promise<Scan | null>}
     */
    async findById(id: number, transaction?: Transaction): Promise<Scan | null> {
        return await Scan.findByPk(id, { transaction });
    }

    /**
     * @async
     * @param {string} scanId - ID scan publik.
     * @param {Transaction} [transaction] - Objek transaksi.
     * @returns {Promise<Scan | null>}
     */
    async findByScanId(scanId: string, transaction?: Transaction): Promise<Scan | null> {
        return await Scan.findOne({
            where: { scan_id: scanId },
            transaction
        });
    }

    /**
     * @async
     * @param {Object} options - Opsi query Sequelize.
     * @returns {Promise<{ count: number; rows: Scan[] }>}
     */
    async findAndCountAll(options: { where?: any; order?: any; limit?: number; offset?: number; transaction?: Transaction }): Promise<{ count: number; rows: Scan[] }> {
        return await Scan.findAndCountAll(options);
    }

    /**
     * @async
     * @param {Object} [options] - Opsi query Sequelize.
     * @returns {Promise<any[]>}
     */
    async findAll(options?: { where?: any; order?: any; limit?: number; attributes?: any; group?: any; raw?: boolean; transaction?: Transaction }): Promise<any[]> {
        return await Scan.findAll(options);
    }

    /**
     * @async
     * @param {Partial<ScanAttributes>} payload - Data scan baru.
     * @param {Transaction} [transaction] - Objek transaksi.
     * @returns {Promise<Scan>}
     */
    async create(payload: Partial<ScanAttributes>, transaction?: Transaction): Promise<Scan> {
        return await Scan.create(payload as any, { transaction });
    }

    /**
     * @async
     * @param {number} id - ID entitas scan.
     * @param {Partial<ScanAttributes>} payload - Data pembaruan.
     * @param {Transaction} [transaction] - Objek transaksi.
     * @returns {Promise<number>}
     */
    async update(id: number, payload: Partial<ScanAttributes>, transaction?: Transaction): Promise<number> {
        const [affectedCount] = await Scan.update(payload, {
            where: { id },
            transaction
        });
        return affectedCount;
    }

    /**
     * @async
     * @param {number} id - ID entitas scan.
     * @param {Transaction} [transaction] - Objek transaksi.
     * @returns {Promise<void>}
     */
    async destroy(id: number, transaction?: Transaction): Promise<void> {
        const scan = await Scan.findByPk(id, { transaction });
        if (scan) {
            await scan.destroy({ transaction });
        }
    }

    /**
     * @async
     * @param {string} attribute - Atribut kolom.
     * @param {'avg' | 'sum' | 'count' | 'min' | 'max'} aggregateFunction - Fungsi agregat.
     * @param {Object} [options] - Opsi query.
     * @returns {Promise<number>}
     */
    async aggregate(attribute: string, aggregateFunction: 'avg' | 'sum' | 'count' | 'min' | 'max', options?: { where?: any; transaction?: Transaction }): Promise<number> {
        const result = await Scan.aggregate(attribute as any, aggregateFunction, options);
        return Number(result) || 0;
    }

    /**
     * @async
     * @param {Object} [options] - Opsi query.
     * @returns {Promise<number>}
     */
    async count(options?: { where?: any; distinct?: boolean; col?: string; transaction?: Transaction }): Promise<number> {
        return await Scan.count(options);
    }
}
