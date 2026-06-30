import { Transaction } from "sequelize";
import UserOtp, { UserOtpAttributes } from "../../../models/user_otp.model";

export interface IUserOtpRepository {
    findActiveOtp(userId: number, otp: string, transaction?: Transaction): Promise<UserOtp | null>;
    create(payload: Partial<UserOtpAttributes>, transaction?: Transaction): Promise<UserOtp>;
    save(otp: UserOtp, transaction?: Transaction): Promise<UserOtp>;
}
