import { Transaction, CreationAttributes } from "sequelize";
import { UserOtpModel } from "../models";

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

    async create(payload: CreationAttributes<UserOtpModel>, transaction?: Transaction): Promise<UserOtpModel> {
        return await UserOtpModel.create(payload as any, { transaction });
    }

    async save(otp: UserOtpModel, transaction?: Transaction): Promise<UserOtpModel> {
        return await otp.save({ transaction });
    }
}

export const userOtpRepository = new UserOtpRepository();
