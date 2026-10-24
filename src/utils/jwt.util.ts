import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET || "fallback_secret_key";

/**
 * Generates a JWT token based on the provided payload and expiration time.
 */
export const generateToken = (payload: object, expiresIn: string = "1d") => {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: expiresIn as any });
};

/**
 * Verifies the validity of a JWT token and returns its payload if valid.
 */
export const verifyToken = (token: string) => {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch {
        return null;
    }
};
