import * as fs from 'node:fs';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// @deprecated use PythonMlGrpcClient instead
export class PythonMlClient {
    static async predictImage(filePath: string, originalName: string) {
        const fileBuffer = fs.readFileSync(filePath);
        // Menggunakan Blob dari Node.js / global
        const blob = new Blob([fileBuffer], {type: 'image/jpeg'});
        const formData = new FormData();
        formData.append('file', blob, originalName);

        const microserviceUrl = process.env.MICROSERVICES_URL || 'http://127.0.0.1:8000';

        const response = await axios.post(`${microserviceUrl}/predict`, formData, {
            headers: {'Content-Type': 'multipart/form-data'},
        });

        return response.data;
    }
}
