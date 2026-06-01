import {Request, Response} from 'express';
import {LeaderboardService} from "./leaderboard.service";
import {sendResponse} from "../../utils/response";

export class LeaderboardController {
    static async getMonthlyLeaderboard(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 10;

            const leaderboard = await LeaderboardService.getTopUsers(limit);

            return sendResponse(res, 200, 'Berhasil mengambil leaderboard', leaderboard);
        } catch (error: any) {
            console.error('[LeaderboardController] Error:', error);
            return sendResponse(res, 500, error.message || 'Terjadi kesalahan saat mengambil leaderboard');
        }
    }
}