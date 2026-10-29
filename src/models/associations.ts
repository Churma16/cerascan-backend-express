import User from "./user.model";
import Plan from "./plan.model";
import Scan from "./scan.model";
import Payment from "./payment.model";
import Subscription from "./subscription.model";
import UserQuotaModel from "./userQuota.model";
import UserOtpModel from "./userOtp.model";

/**
 * Mendaftarkan seluruh relasi (associations) antar model Sequelize secara terpusat.
 * Mencegah duplikasi asosiasi, circular dependency, dan inkonsistensi alias.
 */
export const setupAssociations = (): void => {
    // --- User & Plan ---
    User.belongsTo(Plan, {
        foreignKey: "plan_id",
        as: "active_plan"
    });
    Plan.hasMany(User, {
        foreignKey: "plan_id",
        as: "users"
    });

    // --- User & Quota (1-to-1) ---
    User.hasOne(UserQuotaModel, {
        foreignKey: "user_id",
        as: "user_quota"
    });
    UserQuotaModel.belongsTo(User, {
        foreignKey: "user_id",
        as: "user"
    });

    // --- User & Subscriptions (1-to-Many) ---
    User.hasMany(Subscription, {
        foreignKey: "user_id",
        as: "subscriptions"
    });
    Subscription.belongsTo(User, {
        foreignKey: "user_id",
        as: "user"
    });

    // --- Plan & Subscriptions (1-to-Many) ---
    Plan.hasMany(Subscription, {
        foreignKey: "plan_id",
        as: "subscriptions"
    });
    Subscription.belongsTo(Plan, {
        foreignKey: "plan_id",
        as: "plan"
    });

    // --- User & Payments (1-to-Many) ---
    User.hasMany(Payment, {
        foreignKey: "user_id",
        as: "payments"
    });
    Payment.belongsTo(User, {
        foreignKey: "user_id",
        as: "user"
    });

    // --- Plan & Payments (1-to-Many) ---
    Plan.hasMany(Payment, {
        foreignKey: "plan_id",
        as: "payments"
    });
    Payment.belongsTo(Plan, {
        foreignKey: "plan_id",
        as: "plan"
    });

    // --- User & Scans (1-to-Many) ---
    User.hasMany(Scan, {
        foreignKey: "user_id",
        as: "scans"
    });
    Scan.belongsTo(User, {
        foreignKey: "user_id",
        as: "user"
    });

    // --- User & OTPs (1-to-Many) ---
    User.hasMany(UserOtpModel, {
        foreignKey: "user_id",
        as: "otps"
    });
    UserOtpModel.belongsTo(User, {
        foreignKey: "user_id",
        as: "user"
    });
};
