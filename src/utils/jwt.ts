import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret_key';

export const generateToken = (payload: object, expiresIn: string = '1d') => {
    return jwt.sign(payload, SECRET_KEY, {expiresIn: expiresIn as any});
};

export const verifyToken = (token: string) => {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (error) {
        return null;
    }
};
