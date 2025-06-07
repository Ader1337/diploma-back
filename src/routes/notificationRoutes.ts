import express from 'express';
import { subscribeToPush, unsubscribeFromPush } from '../controllers/notificationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Захищаємо ці ендпоінти, щоб тільки авторизовані користувачі могли підписуватися
router.post('/subscribe', protect as any, subscribeToPush as any);
router.post('/unsubscribe', protect as any, unsubscribeFromPush as any); // Опціонально

export default router;