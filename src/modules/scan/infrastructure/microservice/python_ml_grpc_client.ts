import * as fs from 'fs';
import {grpcCeramicClient} from "../../../../config/grpc_client";
import {log} from "../../../../utils/logger";


export interface GrpcPredictionResult {
    status: string;
    file_name: string;
    prediction: string;
    confidence_score: number;
}

export class PythonMlGrpcClient {

    static async predictImage(filePath: string, originalName: string): Promise<GrpcPredictionResult> {
        return new Promise((resolve, reject) => {
            try {
                const imageBuffer = fs.readFileSync(filePath);

                grpcCeramicClient.Predict(
                    {
                        image_data: imageBuffer,
                        file_name: originalName
                    },
                    (error: any, response: GrpcPredictionResult) => {
                        if (error) {
                            if (error.code === 14) {
                                const customMsg = 'Gagal terhubung ke Python ML Service (UNAVAILABLE). Pastikan service gRPC berjalan.';
                                log.error('gRPC Client', customMsg);
                                return reject(new Error(customMsg));
                            }
                            log.error('gRPC Client', `Error calling python service: ${error.message}`);
                            return reject(error);
                        }
                        resolve(response);
                    }
                );
            } catch (err) {
                log.error('gRPC Client', `Error reading file: ${err instanceof Error ? err.message : String(err)}`);
                reject(err);
            }
        });
    }
}