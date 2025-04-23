import { Request, Response } from 'express';
import { BaseGameService } from './BaseGameService.js';

export abstract class BaseController {
    protected service: BaseGameService;

    constructor(service: BaseGameService) {
        this.service = service;
    }

    async markRoundBusted(req: Request, res: Response): Promise<void> {
        try {
            const { gameId, playerId, roundNumber } = req.body;
            const result = await this.service.markRoundBusted(gameId, playerId, roundNumber);
            res.json(result);
        } catch (error) {
            console.error('Error marking round as busted:', error);
            res.status(500).json({ error: 'Could not mark round as busted' });
        }
    }

    async unmarkRoundBusted(req: Request, res: Response): Promise<void> {
        try {
            const { gameId, playerId, roundNumber } = req.body;
            const result = await this.service.unmarkRoundBusted(gameId, playerId, roundNumber);
            res.json(result);
        } catch (error) {
            console.error('Error unmarking round as busted:', error);
            res.status(500).json({ error: 'Could not restore round from busted state' });
        }
    }
}