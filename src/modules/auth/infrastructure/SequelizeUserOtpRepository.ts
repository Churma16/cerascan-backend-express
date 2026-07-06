import { Transaction } from "sequelize";
import UserOtpModel, { UserOtpAttributes } from "../../../models/userOtp.model";
import { IUserOtpRepository } from "../domain/IUserOtpRepository";

export class SequelizeUserOtpRepository implements IUserOtpRepository {
    async findActiveOtp(userId: number, otp: string, transaction?: Transaction): Promise<UserOtpModel | null> {
        return await UserOtpModel.findOne({
            where: {
                user_id: userId,
                otp: otp,
                is_used: false
            },
            order: [['createdAt', 'DESC']],
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
