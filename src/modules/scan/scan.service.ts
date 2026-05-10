import * as fs from "node:fs";
import axios from "axios";
import Scan from "../../models/scan.model";

export class ScanService {
    static async processImage(filePath: string, originalName: string) {
        const startTime = Date.now();
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const blob = new Blob([fileBuffer], {type: 'image/jpeg'});

            const formData = new FormData();
            formData.append('file', blob, originalName);

            // Hit Python FastAPI (Pastikan Python running di port 8000)
            const pythonResponse = await axios.post('http://127.0.0.1:8000/predict', formData, {
                headers: {'Content-Type': 'multipart/form-data'}
            });

            const endTime = Date.now();
            const inferenceTimeMs = endTime - startTime;

            const result = pythonResponse.data;
            const scanId = '#SCN-' + Math.floor(1000 + Math.random() * 9000);

            // Save scan history to DB
            const newScan = await Scan.create({
                scan_id: scanId,
                file_name: originalName,
                prediction: result.prediction,
                confidence: result.confidence_score,
                inference_time: `${inferenceTimeMs}ms`
            });

            fs.unlinkSync(filePath);

            return newScan;
        } catch (error: any) {
            // Clean file if error
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            throw new Error('Gagal memproses gambar ke server AI: ' + error.message);
        }
    }

    static async getHistory() {
        const scans = await Scan.findAll({
            order: [['createdAt', 'DESC']],
            limit: 50
        })

        return scans;
    }
}