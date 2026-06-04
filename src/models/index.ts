import User from './user.model';
import UserOtp from './user_otp.model';
import Scan from './scan.model';
import Plan from './plan.model';
import Subscription from './subscription.model';
import UserQuota from './user_quota.model';
import Payment from './payment.model';
import LeaderboardArchive from './leaderboard_archive.model';

User.belongsTo(Plan, {
    foreignKey: 'plan_id',
    as: 'active_plan',
});

Plan.hasMany(User, {
    foreignKey: 'plan_id',
    as: 'users',
});

User.hasOne(UserQuota, {
    foreignKey: 'user_id',
    as: 'user_quota',
})

UserQuota.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'owner',
})

// Payments
User.hasMany(Payment, {foreignKey: 'user_id', as: 'payments'});
Payment.belongsTo(User, {foreignKey: 'user_id', as: 'user'});
Plan.hasMany(Payment, {foreignKey: 'plan_id', as: 'payments'});
Payment.belongsTo(Plan, {foreignKey: 'plan_id', as: 'plan'});

export {
    User,
    UserOtp,
    Scan,
    Plan,
    Subscription,
    UserQuota,
    Payment,
    LeaderboardArchive,
};

