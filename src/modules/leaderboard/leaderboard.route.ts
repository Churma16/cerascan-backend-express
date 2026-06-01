import {Router} from 'express';
import {LeaderboardController} from "./leaderboard.controller";

const router = Router();

router.get('/', LeaderboardController.getMonthlyLeaderboard);

export default router;