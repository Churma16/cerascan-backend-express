import { Transaction } from "sequelize";
import UserOtp, { UserOtpAttributes } from "../../../models/user_otp.model";
import { IUserOtpRepository } from "../domain/IUserOtpRepository";

export class SequelizeUserOtpRepository implements IUserOtpRepository {
    async findActiveOtp(userId: number, otp: string, transaction?: Transaction): Promise<UserOtp | null> {
        return await UserOtp.findOne({
            where: {
                user_id: userId,
                otp: otp,
                is_used: false
            },
            order: [['createdAt', 'DESC']],
            transaction
        });
    }

    async create(payload: Partial<UserOtpAttributes>, transaction?: Transaction): Promise<UserOtp> {
        return await UserOtp.create(payload as any, { transaction });
    }

    async save(otp: UserOtp, transaction?: Transaction): Promise<UserOtp> {
        return await otp.save({ transaction });
    }
}
