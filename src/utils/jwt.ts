import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret_key';

/**
 * Generates a JWT token based on the provided payload and expiration time.
 *
 * @param {object} payload - The data to be encoded in the token.
 * @param {string} [expiresIn='1d'] - The duration for which the token is valid. Default is '1d'.
 * @returns {string} - The generated JWT token.
 */
export const generateToken = (payload: object, expiresIn: string = '1d') => {
    return jwt.sign(payload, SECRET_KEY, {expiresIn: expiresIn as any});
};

/**
 * Verifies the validity of a JWT token and returns its payload if valid.
 *
 * @param {string} token - The JWT token to be verified.
 * @returns {(object | null)} - The decoded payload if the token is valid; otherwise, null.
 */
export const verifyToken = (token: string) => {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (error) {
        return null;
    }
};
