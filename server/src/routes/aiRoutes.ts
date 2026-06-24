import { Router } from 'express';
import * as aiController from '../controllers/aiController.js';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { upload } from '../middleware/upload.js';
import { generateTextQuestionsSchema } from '../validators/aiSchemas.js';

const router = Router();
router.use(authenticate, requireStaff, aiLimiter);

router.get('/health', aiController.aiHealth);
router.post('/generate/text', validate(generateTextQuestionsSchema), aiController.generateFromText);
router.post('/generate/image', upload.single('file'), aiController.generateFromImage);
router.post('/generate/pdf', upload.single('file'), aiController.generateFromPdf);
router.post('/translate', aiController.translateQuestion);
router.post('/evaluate-subjective', aiController.evaluateSubjective);

export default router;
