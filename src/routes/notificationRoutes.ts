// src/routes/notificationRoutes.ts
import express from 'express';
import {
  subscribeWebPush,
  subscribeNativePush,
  unsubscribeWebPush,
  unsubscribeNativePush
} from '../controllers/notificationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Маршрути для підписки
router.post('/subscribe', protect as any, subscribeWebPush as any)
router.post('/subscribe-native', subscribeNativePush as any);


// Маршрути для відписки (опціонально)
router.post('/unsubscribe', protect as any, unsubscribeWebPush as any);
router.post('/unsubscribe-native', protect as any, unsubscribeNativePush as any);

export default router;