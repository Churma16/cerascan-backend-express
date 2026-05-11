import * as fs from "node:fs";
import path from "node:path";
import multer from "multer";

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {recursive: true});
}

// Configure Multer storage
// File akan disimpan di folder 'uploads' dengan nama unik untuk menghindari konflik
// Nama file akan terdiri dari timestamp + nama asli yang sudah disanitasi (spasi diganti dengan underscore)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedFileName = file.originalname.replace(/ /g, '_');
        cb(null, uniqueSuffix + '-' + sanitizedFileName);
    }
});

export const uploadMiddleware = multer({storage: storage});