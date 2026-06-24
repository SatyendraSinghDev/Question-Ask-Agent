import { Router } from 'express';
import * as dashboard from '../controllers/dashboardController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { UserRole } from '../types/enums.js';

const router = Router();
router.use(authenticate);

router.get('/student', authorize(UserRole.STUDENT), dashboard.studentDashboard);
router.get(
  '/admin',
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  dashboard.adminDashboard,
);

export default router;
