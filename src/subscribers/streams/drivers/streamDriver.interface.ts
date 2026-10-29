/**
 * Definisi consumer stream individual yang akan diproses oleh driver broker.
 */
export interface StreamConsumerItem {
    name: string;
    groupId: string;
    handler: (payload: any) => Promise<void>;
}

/**
 * Kontrak antarmuka (interface) untuk stream consumer driver.
 * Mengisolasi urusan teknis platform message broker (Kafka vs RabbitMQ Streams).
 */
export interface IStreamConsumerDriver {
    /**
     * Memulai mendengarkan stream target dan mendaftarkan seluruh consumer.
     *
     * @param {string} streamTarget - Nama topik Kafka atau nama queue RabbitMQ Stream.
     * @param {StreamConsumerItem[]} consumers - Daftar consumer dan handler yang akan didaftarkan.
     * @returns {Promise<void>}
     */
    start(streamTarget: string, consumers: StreamConsumerItem[]): Promise<void>;
}
