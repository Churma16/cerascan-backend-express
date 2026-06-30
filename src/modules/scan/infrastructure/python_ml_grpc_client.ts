import * as fs from 'fs';
import {grpcCeramicClient} from "../../../config/grpc_client";


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
                            console.error('[gRPC Client] Error calling python service:', error);
                            return reject(error);
                        }
                        resolve(response);
                    }
                );
            } catch (err) {
                console.error('[gRPC Client] Error reading file:', err);
                reject(err);
            }
        });
    }
}