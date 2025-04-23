import { Router } from 'express';
import { X01Controller } from './controller.js';

const router = Router();
const x01Controller = new X01Controller();

// X01 specific routes
router.post('/validate-throw', (req, res) => x01Controller.validateThrow(req, res));

// Common routes inherited from BaseController
router.post('/mark-round-busted', (req, res) => x01Controller.markRoundBusted(req, res));
router.post('/unmark-round-busted', (req, res) => x01Controller.unmarkRoundBusted(req, res));

export const x01Routes = router;