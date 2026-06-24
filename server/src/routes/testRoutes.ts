import { Router } from 'express';
import * as testController from '../controllers/testController.js';
import * as assessment from '../controllers/assessmentController.js';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTestSchema, listTestsSchema } from '../validators/testSchemas.js';
import {
  saveAnswerSchema,
  startAttemptSchema,
  submitAttemptSchema,
} from '../validators/testSchemas.js';

const router = Router();
router.use(authenticate);

// ── Test CRUD (staff) ──
router.post('/', requireStaff, validate(createTestSchema), testController.createTest);
router.get('/', validate(listTestsSchema), testController.listTests);
router.get('/auto-assemble', requireStaff, testController.autoAssembleTest);
router.get('/:id', testController.getTest);
router.patch('/:id', requireStaff, testController.updateTest);
router.delete('/:id', requireStaff, testController.deleteTest);
router.post('/:id/publish', requireStaff, testController.publishTest);

// ── Assessment engine (students take tests) ──
router.post('/:testId/attempts', validate(startAttemptSchema), assessment.startAttempt);
router.post('/attempts/:attemptId/save/:questionId', validate(saveAnswerSchema), assessment.saveAnswer);
router.post('/attempts/:attemptId/pause', assessment.pauseAttempt);
router.post('/attempts/:attemptId/resume', assessment.resumeAttempt);
router.post('/attempts/:attemptId/proctor', assessment.logProctorEvent);
router.post('/attempts/:attemptId/submit', validate(submitAttemptSchema), assessment.submitAttempt);

export default router;
