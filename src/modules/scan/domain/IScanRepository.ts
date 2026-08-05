import { Transaction } from "sequelize";
import Scan, { ScanAttributes } from "../../../models/scan.model";

/**
 * Antarmuka kontrak repositori untuk entitas Scan di database SQL.
 *
 * @interface IScanRepository
 */
export interface IScanRepository {
    /**
     * Mencari rekaman scan berdasarkan ID utama.
     *
     * @param {number} id - ID utama scan di database.
     * @param {Transaction} [transaction] - Objek transaksi Sequelize opsional.
     * @returns {Promise<Scan | null>} Entitas Scan jika ditemukan, null jika tidak.
     */
    findById(id: number, transaction?: Transaction): Promise<Scan | null>;

    /**
     * Mencari rekaman scan berdasarkan Scan ID publik (e.g. #SCN-XXXX).
     *
     * @param {string} scanId - ID scan publik.
     * @param {Transaction} [transaction] - Objek transaksi Sequelize opsional.
     * @returns {Promise<Scan | null>} Entitas Scan jika ditemukan, null jika tidak.
     */
    findByScanId(scanId: string, transaction?: Transaction): Promise<Scan | null>;

    /**
     * Mencari rekaman scan dengan pagination dan menghitung jumlah total.
     *
     * @param {Object} options - Opsi pencarian Sequelize (where, order, limit, offset).
     * @returns {Promise<{ count: number; rows: Scan[] }>} Total jumlah dan array baris entitas Scan.
     */
    findAndCountAll(options: { where?: any; order?: any; limit?: number; offset?: number; transaction?: Transaction }): Promise<{ count: number; rows: Scan[] }>;

    /**
     * Mencari seluruh rekaman scan yang memenuhi kriteria opsi pencarian.
     *
     * @param {Object} [options] - Opsi pencarian Sequelize.
     * @returns {Promise<any[]>} Array hasil pencarian.
     */
    findAll(options?: { where?: any; order?: any; limit?: number; attributes?: any; group?: any; raw?: boolean; transaction?: Transaction }): Promise<any[]>;

    /**
     * Membuat rekaman entitas scan baru di database.
     *
     * @param {Partial<ScanAttributes>} payload - Data atribut scan baru.
     * @param {Transaction} [transaction] - Objek transaksi Sequelize opsional.
     * @returns {Promise<Scan>} Entitas Scan yang berhasil dibuat.
     */
    create(payload: Partial<ScanAttributes>, transaction?: Transaction): Promise<Scan>;

    /**
     * Memperbarui data entitas scan berdasarkan ID.
     *
     * @param {number} id - ID entitas scan yang akan diperbarui.
     * @param {Partial<ScanAttributes>} payload - Data pembaruan atribut scan.
     * @param {Transaction} [transaction] - Objek transaksi Sequelize opsional.
     * @returns {Promise<number>} Jumlah baris yang terpengaruh/diperbarui.
     */
    update(id: number, payload: Partial<ScanAttributes>, transaction?: Transaction): Promise<number>;

    /**
     * Menghapus data entitas scan dari database berdasarkan ID.
     *
     * @param {number} id - ID entitas scan yang akan dihapus.
     * @param {Transaction} [transaction] - Objek transaksi Sequelize opsional.
     * @returns {Promise<void>}
     */
    destroy(id: number, transaction?: Transaction): Promise<void>;

    /**
     * Menjalankan fungsi agregat (avg, sum, count, min, max) pada kolom tertentu.
     *
     * @param {string} attribute - Atribut kolom yang diagregasi.
     * @param {'avg' | 'sum' | 'count' | 'min' | 'max'} aggregateFunction - Jenis fungsi agregat.
     * @param {Object} [options] - Opsi filter agregasi.
     * @returns {Promise<number>} Hasil nilai agregasi.
     */
    aggregate(attribute: string, aggregateFunction: 'avg' | 'sum' | 'count' | 'min' | 'max', options?: { where?: any; transaction?: Transaction }): Promise<number>;

    /**
     * Menghitung jumlah rekaman scan yang memenuhi kriteria.
     *
     * @param {Object} [options] - Opsi pencarian dan perhitungan count.
     * @returns {Promise<number>} Jumlah total rekaman.
     */
    count(options?: { where?: any; distinct?: boolean; col?: string; transaction?: Transaction }): Promise<number>;
}
