import { Router } from 'express';
import * as content from '../controllers/contentController.js';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createQuestionSchema,
  listQuestionsSchema,
  reviewQuestionSchema,
  subjectSchema,
  topicSchema,
} from '../validators/contentSchemas.js';

const router = Router();
router.use(authenticate);

// ── Subjects ──
router.post('/subjects', requireStaff, validate(subjectSchema), content.createSubject);
router.get('/subjects', content.listSubjects);
router.get('/subjects/:id', content.getSubject);

// ── Topics ──
router.post('/topics', requireStaff, validate(topicSchema), content.createTopic);
router.get('/topics', content.listTopics);

// ── Questions ──
router.post('/questions', requireStaff, validate(createQuestionSchema), content.createQuestion);
router.post('/questions/bulk', requireStaff, content.bulkUploadQuestions);
router.get('/questions', validate(listQuestionsSchema), content.listQuestions);
router.get('/questions/:id', content.getQuestion);
router.patch('/questions/:id', requireStaff, content.updateQuestion);
router.delete('/questions/:id', requireStaff, content.deleteQuestion);
router.post('/questions/:id/review', requireStaff, validate(reviewQuestionSchema), content.reviewQuestion);

export default router;
