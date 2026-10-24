import { Transaction } from "sequelize";
import { UserOtpModel } from "../models";
import { UserOtpAttributes } from "../models/userOtp.model";

export class UserOtpRepository {
    async findActiveOtp(userId: number, otp: string, transaction?: Transaction): Promise<UserOtpModel | null> {
        return await UserOtpModel.findOne({
            where: {
                user_id: userId,
                otp,
                is_used: false
            },
            order: [["created_at", "DESC"]],
            transaction
        });
    }

    async create(payload: Partial<UserOtpAttributes>, transaction?: Transaction): Promise<UserOtpModel> {
        return await UserOtpModel.create(payload as any, { transaction });
    }

    async save(otp: UserOtpModel, transaction?: Transaction): Promise<UserOtpModel> {
        return await otp.save({ transaction });
    }
}

export const userOtpRepository = new UserOtpRepository();
