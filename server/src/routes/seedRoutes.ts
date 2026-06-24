import { Router } from 'express';
import { runSeed } from '../controllers/seedController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// POST /api/v1/seed  — manually trigger a seed (admin only).
router.post('/', authenticate, requireAdmin, runSeed);

export default router;
