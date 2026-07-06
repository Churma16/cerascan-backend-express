import User from './user.model';
import UserOtpModel from './userOtp.model';
import Scan from './scan.model';
import Plan from './plan.model';
import Subscription from './subscription.model';
import UserQuotaModel from './userQuota.model';
import Payment from './payment.model';
import LeaderboardArchive from './leaderboardArchive';

User.belongsTo(Plan, {
    foreignKey: 'plan_id',
    as: 'active_plan',
});

Plan.hasMany(User, {
    foreignKey: 'plan_id',
    as: 'users',
});

User.hasOne(UserQuotaModel, {
    foreignKey: 'user_id',
    as: 'user_quota',
})

UserQuotaModel.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'owner',
})

User.hasMany(Payment, {foreignKey: 'user_id', as: 'payments'});
Payment.belongsTo(User, {foreignKey: 'user_id', as: 'user'});
Plan.hasMany(Payment, {foreignKey: 'plan_id', as: 'payments'});
Payment.belongsTo(Plan, {foreignKey: 'plan_id', as: 'plan'});

export {
    User,
    UserOtpModel,
    Scan,
    Plan,
    Subscription,
    UserQuotaModel,
    Payment,
    LeaderboardArchive,
};

