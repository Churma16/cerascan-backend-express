import { Transaction } from "sequelize";
import { IUserQuotaRepository } from "../domain/IUserQuotaRepository";
import { SequelizeUserQuotaRepository } from "../infrastructure/SequelizeUserQuotaRepository";

export interface CreateUserQuotaInput {
    user_id: number;
    total_quota: number;
    used_quota?: number;
    next_reset_date?: Date;
}

export class CreateUserQuotaUseCase {
    private userQuotaRepository: IUserQuotaRepository;

    constructor(userQuotaRepository: IUserQuotaRepository = new SequelizeUserQuotaRepository()) {
        this.userQuotaRepository = userQuotaRepository;
    }

    async execute(payload: CreateUserQuotaInput, t?: Transaction) {
        const newQuota = await this.userQuotaRepository.create({
            ...payload,
            used_quota: payload.used_quota || 0,
        }, t);
        return newQuota.toJSON();
    }
}
