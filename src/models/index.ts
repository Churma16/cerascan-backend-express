import User from './user.model';
import UserOtp from './user_otp.model';
import Scan from './scan.model';
import Plan from './plan.model';
import Subscription from './subscription.model';
import UserQuota from './user_quota.model';
import Payment from './payment.model';

User.belongsTo(Plan, {
    foreignKey: 'plan_id',
    as: 'active_plan',
});

Plan.hasMany(User, {
    foreignKey: 'plan_id',
    as: 'users',
});

export {
    User,
    UserOtp,
    Scan,
    Plan,
    Subscription,
    UserQuota,
    Payment,
};

