import { Request, Response } from 'express';
import { BaseController } from '../../common/utils/BaseController.js';
import { X01GameService } from './service.js';
import type { X01ThrowData } from './types.js';

export class X01Controller extends BaseController {
    private x01Service: X01GameService;

    constructor() {
        const service = new X01GameService();
        super(service);
        this.x01Service = service;
    }

    async validateThrow(req: Request, res: Response): Promise<void> {
        try {
            const throwData = req.body as X01ThrowData;
            const gameSettings = await this.x01Service.getGameSettings(throwData.gameId);
            
            const validationResult = await this.x01Service.validateThrow(throwData, gameSettings);
            
            if (!validationResult.isValid) {
                res.status(400).json({ error: validationResult.error });
                return;
            }
            
            // If validation passes, register the throw
            const result = await this.x01Service.registerThrow(throwData);
            
            if (!result.success) {
                res.status(500).json({ error: 'Failed to register throw' });
                return;
            }
            
            res.json({ valid: true, ...result });
        } catch (error) {
            console.error('Error validating X01 throw:', error);
            res.status(500).json({ error: 'Could not validate throw' });
        }
    }

    // Inherits markRoundBusted and unmarkRoundBusted from BaseController
}