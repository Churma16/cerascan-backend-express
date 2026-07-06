import { Transaction } from "sequelize";
import UserOtpModel, { UserOtpAttributes } from "../../../models/userOtp.model";

export interface IUserOtpRepository {
    findActiveOtp(userId: number, otp: string, transaction?: Transaction): Promise<UserOtpModel | null>;
    create(payload: Partial<UserOtpAttributes>, transaction?: Transaction): Promise<UserOtpModel>;
    save(otp: UserOtpModel, transaction?: Transaction): Promise<UserOtpModel>;
}
