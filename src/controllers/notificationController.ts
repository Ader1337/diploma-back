import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import webpush from 'web-push';

// =================================================================
// Функції для WEB PUSH (браузери та Electron)
// =================================================================

/**
 * @desc    Зберігає підписку на веб-сповіщення (Web Push Subscription)
 * @route   POST /api/v1/notifications/subscribe-web
 * @access  Private
 */
export const subscribeWebPush = async (req: Request, res: Response, next: NextFunction) => {
  // На фронтенді ми надсилали { subscription: ... }, тому отримуємо його з тіла запиту
  const { subscription } = req.body;

  if (!req.user) {
    return res.status(401).json({ message: 'Не авторизований' });
  }
  // Валідація об'єкту підписки
  if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return res.status(400).json({ message: 'Об\'єкт веб-підписки невалідний' });
  }

  try {
    // Використовуємо $addToSet, щоб уникнути дублікатів підписок
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { pushSubscriptions: subscription }
    });

    res.status(201).json({ message: 'Веб-підписку успішно збережено' });

    // Надсилаємо тестове сповіщення після успішної підписки
    const payload = JSON.stringify({
      notification: { // <-- Важливо: огортаємо в об'єкт "notification" для Angular Service Worker
        title: 'Підписка успішна!',
        body: 'Ви будете отримувати веб-сповіщення від Персонального Менеджера.',
        icon: 'assets/icons/icon-96x96.png',
      }
    });

    try {
      await webpush.sendNotification(subscription, payload);
    } catch (pushError) {
      console.error('Не вдалося надіслати тестове веб-сповіщення', pushError);
    }

  } catch (error) {
    next(error);
  }
};

// =================================================================
// Функції для NATIVE PUSH (мобільні пристрої)
// =================================================================

/**
 * @desc    Зберігає нативний токен пристрою (FCM/APNS)
 * @route   POST /api/v1/notifications/subscribe-native
 * @access  Private
 */
export const subscribeNativePush = async (req: Request, res: Response, next: NextFunction) => {
  const { token, platform } = req.body; // Отримуємо токен і платформу ('android' або 'ios')
  console.log('Отримано нативний токен:', token, 'для платформи:', platform);
  if (!req.user) {
    return res.status(401).json({ message: 'Не авторизований' });
  }
  if (!token || !platform) {
    return res.status(400).json({ message: 'Токен пристрою та платформа є обов\'язковими' });
  }

  try {
    // Використовуємо $addToSet, щоб уникнути дублікатів токенів
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { nativePushTokens: { token, platform } }
    });
    res.status(201).json({ message: 'Нативний токен успішно збережено' });
  } catch (error) {
    next(error);
  }
};

// =================================================================
// Функції для відписки (опціонально, але гарна практика)
// =================================================================

export const unsubscribeWebPush = async (req: Request, res: Response, next: NextFunction) => {
  const { endpoint } = req.body; // Для веб-відписки унікальним є endpoint
  if (!req.user || !endpoint) return res.status(400).json({ message: 'Endpoint є обов\'язковим' });

  try {
    // Використовуємо $pull для видалення елемента з масиву
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { pushSubscriptions: { endpoint: endpoint } }
    });
    res.status(200).json({ message: 'Веб-відписка успішно видалена' });
  } catch (error) {
    next(error);
  }
};

export const unsubscribeNativePush = async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.body; // Для нативної відписки унікальним є token
  if (!req.user || !token) return res.status(400).json({ message: 'Токен є обов\'язковим' });

  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { nativePushTokens: { token: token } }
    });
    res.status(200).json({ message: 'Нативна підписка успішно видалена' });
  } catch (error) {
    next(error);
  }
};