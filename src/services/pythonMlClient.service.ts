import { grpcCeramicClient } from "../config/grpcClient";
import { log } from "../utils/logger";

export interface GrpcPredictionResult {
    status: string;
    file_name: string;
    prediction: string;
    confidence_score: number;
}

export class PythonMlGrpcClient {
    static async predictImage(imageBuffer: Buffer, originalName: string): Promise<GrpcPredictionResult> {
        return new Promise((resolve, reject) => {
            try {
                grpcCeramicClient.Predict(
                    {
                        image_data: imageBuffer,
                        file_name: originalName
                    },
                    (error: any, response: GrpcPredictionResult) => {
                        if (error) {
                            if (error.code === 14) {
                                const customMessage = "Gagal terhubung ke Python ML Service (UNAVAILABLE). Pastikan service gRPC berjalan.";
                                log.error("gRPC Client", customMessage);
                                return reject(new Error(customMessage));
                            }
                            log.error("gRPC Client", `Error calling python service: ${error.message}`);
                            return reject(error);
                        }
                        resolve(response);
                    }
                );
            } catch (exception) {
                log.error("gRPC Client", `Error sending gRPC request: ${exception instanceof Error ? exception.message : String(exception)}`);
                reject(exception);
            }
        });
    }
}
