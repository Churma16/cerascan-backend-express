import bcrypt from "bcryptjs";
import User, {UserAttributes} from "../../models/user.model";
import {generateToken} from "../../utils/jwt";

export class AuthService {

    static async registerUser(data: Partial<UserAttributes>) {
        const existingUser = await User.findOne({
            where: {
                email: data.email,
            }
        })
        if (existingUser) {
            throw new Error('Email sudah terdaftar');
        }

        // Encrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password as string, salt);

        const payload = {
            full_name: data.full_name as string,
            email: data.email as string,
            password: hashedPassword,
            role: data.role || 'user',
        }

        const newUser = await User.create({
            ...payload,
        })

        const userJSON = newUser.toJSON();
        delete userJSON.password;

        return userJSON;
    }

    static async loginUser(email: string, passwordInput: string) {
        // Cari user berdasarkan email
        const user = await User.findOne({where: {email}});

        if (!user || !user.password) {
            throw new Error('Email atau password salah');
        }

        // Cocokkan password
        const isPasswordMatch = await bcrypt.compare(passwordInput, user.password);
        if (!isPasswordMatch) {
            throw new Error('Email atau password salah');
        }

        // Buat JWT Token (Bungkus ID dan Role di dalamnya)
        const token = generateToken({
            id: user.id,
            role: user.role
        });

        return {
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            },
            token
        };
    }
}