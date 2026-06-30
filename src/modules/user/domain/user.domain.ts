import bcrypt from "bcryptjs";

/**
 * Domain function untuk memproses password sebelum disimpan.
 */
export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// Fungsi domain lainnya bisa ditambahkan di sini nantinya
// (contoh: validasi format email, pengecekan panjang password, dll)
