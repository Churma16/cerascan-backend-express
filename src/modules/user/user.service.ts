import User, {UserAttributes} from "../../models/user.model";
import bcrypt from "bcryptjs";
import {Op, Sequelize, Transaction} from "sequelize";
import {Plan, Subscription} from "../../models";
import {getNowIndonesiaTime} from "../../utils/time.helper";
import sequelize from "../../config/database";
import {SubscriptionService} from "../subscription/subscription.service";

export class UserService {
    static async getAllUsers() {
        return await User.findAll({
            attributes: {exclude: ['password']}, include: [{
                model: Plan,
                as: "active_plan"
            }]

        });
    }

    static async getUserById(id: number) {
        const user = await User.findOne({
            where: {
                id: id
            },
            attributes: {exclude: ['password']},
            include: [{
                model: Plan,
                as: "active_plan"
            }]

        })
        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        return user;
    }

    static async updateUser(id: number, data: Partial<UserAttributes>) {
        const user = await User.findOne({
            where: {
                id: id
            }
        })

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        if (data.password) {
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        }

        await user.update(data);
        const userJSON = user.toJSON();
        delete userJSON.password;
        return userJSON;
    }

    static async deleteUser(id: number) {
        const user = await User.findByPk(id);

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        await user.destroy();
        return user;
    }

    static async upgradeTier(id: number, planId: number, t?: Transaction) {
        const user = await User.findOne({
            where: {
                id: id
            },
            transaction: t
        });

        if (!user) {
            throw new Error('User tidak ditemukan');
        }

        user.plan_id = planId;

        await user.save({transaction: t});

        return user;
    }

    static async downgradeAllExpiredUsers() {
        const today = getNowIndonesiaTime();

        return await sequelize.transaction(async (t) => {
            const expiredSubs = await Subscription.findAll({
                attributes: ['user_id'],
                where: {
                    status: 'active',
                    end_date: {
                        [Op.lte]: today
                    }
                },
                transaction: t
            });

            const userIds = expiredSubs.map(sub => sub.user_id);

            let updatedUsersCount = 0;
            if (userIds.length > 0) {
                [updatedUsersCount] = await User.update(
                    {plan_id: 1},
                    {
                        where: {
                            id: {
                                [Op.in]: userIds
                            }
                        },
                        transaction: t
                    }
                );
            }

            const updatedSubsCount = await SubscriptionService.expireActiveSubscriptions(today, t);

            return {updatedUsersCount, updatedSubsCount};
        });
    }

}
