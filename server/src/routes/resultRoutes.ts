import { Router } from 'express';
import * as resultController from '../controllers/resultController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/me', resultController.getMyResults);
router.get('/:id', resultController.getResult);
router.get('/test/:testId/leaderboard', resultController.getTestLeaderboard);

// Certificates
router.post('/certificates/:resultId', resultController.issueCert);
router.get('/certificates/me', resultController.getMyCertificates);
router.get('/certificates/verify/:certificateId', resultController.verifyCert);

export default router;
