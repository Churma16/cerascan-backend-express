import User from './user.model';
import UserOtpModel from './userOtp.model';
import Scan from './scan.model';
import Plan from './plan.model';
import Subscription from './subscription.model';
import UserQuotaModel from './userQuota.model';
import Payment from './payment.model';
import LeaderboardArchive from './leaderboardArchive.model';
import DeadLetterMessage from './deadLetterMessage.model';
import { setupAssociations } from './associations';

// Inisialisasi seluruh asosiasi Sequelize secara terpusat
setupAssociations();

export {
    User,
    UserOtpModel,
    Scan,
    Plan,
    Subscription,
    UserQuotaModel,
    Payment,
    LeaderboardArchive,
    DeadLetterMessage,
    setupAssociations
};
