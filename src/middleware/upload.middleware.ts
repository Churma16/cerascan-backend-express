import multer from "multer";

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Format file tidak didukung. Gunakan JPG, PNG, atau WEBP."));
        }
    }
});