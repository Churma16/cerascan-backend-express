import {kafka} from "../../config/kafka.client";
import {EmitScanCompletedUseCase} from "../../modules/notification/use-cases/EmitScanCompletedUseCase";
import {log} from "../../utils/logger";

const consumer = kafka.consumer({groupId: 'ceramic-socket-group'});
const TOPIC_NAME = 'ceramic-scan-completed';

export const startSocketConsumer = async (): Promise<void> => {
    try {
        await consumer.connect();
        log.success('Kafka Socket Worker', 'Berhasil terhubung');

        await consumer.subscribe({topic: TOPIC_NAME, fromBeginning: false});
        log.info('Kafka Socket Worker', `Mendengarkan topik: ${TOPIC_NAME}`);

        await consumer.run({
            eachMessage: async ({message}) => {
                try {
                    const messageVal = message.value?.toString();
                    if (!messageVal) return;

                    const payload = JSON.parse(messageVal);
                    log.info('Kafka Socket Worker', `Mengirim notifikasi scan_id: ${payload.scan_id}`);

                    if (payload.db_id) {
                        const emitScanCompletedUseCase = new EmitScanCompletedUseCase();
                        const scanData = {
                            db_id: payload.db_id,
                            scan_id: payload.scan_id,
                            prediction: payload.prediction,
                            confidence: payload.confidence_score,
                            inference_time: payload.inference_time
                        };
                        await emitScanCompletedUseCase.execute(scanData);
                        log.success('Kafka Socket Worker', `Notifikasi terkirim untuk scan_id: ${payload.scan_id}`);
                    }

                } catch (err: any) {
                    log.error('Kafka Socket Worker', `Gagal memproses pesan: ${err.message}`);
                }
            },
        });
    } catch (error) {
        log.error('Kafka Socket Worker', 'Gagal menjalankan consumer:', error);
    }
};
