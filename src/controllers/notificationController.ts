import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import webpush from 'web-push'; // Якщо тут буде логіка надсилання

export const subscribeToPush = async (req: Request, res: Response, next: NextFunction) => {
  const subscription = req.body; // Очікуємо об'єкт підписки з клієнта
  if (!req.user) {
    return res.status(401).json({ message: 'Не авторизований' });
  }
  if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    res.status(400);
    return next(new Error('Об\'єкт підписки невалідний'));
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      return next(new Error('Користувача не знайдено'));
    }

    // Перевірка, чи така підписка вже існує
    const existingSubscription = user.pushSubscriptions.find(sub => sub.endpoint === subscription.endpoint);
    if (existingSubscription) {
      return res.status(200).json({ message: 'Підписка вже існує' });
    }

    user.pushSubscriptions.push(subscription as any); // Додаємо нову підписку
    await user.save();

    res.status(201).json({ message: 'Підписка на сповіщення успішно збережена' });

    // Опціонально: відправити тестове сповіщення одразу після підписки
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
            `mailto:${process.env.VAPID_MAILTO || 'test@example.com'}`,
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
        const payload = JSON.stringify({
            title: 'Підписка успішна!',
            body: 'Ви будете отримувати сповіщення від Персонального Менеджера.',
            icon: 'assets/icons/icon-96x96.png', // Шлях до іконки на клієнті
        });
        try {
            await webpush.sendNotification(subscription, payload);
            console.log('Тестове push-сповіщення надіслано.');
        } catch (pushError: any) {
            console.error('Помилка надсилання тестового push-сповіщення:', pushError.body || pushError.message);
        }
    }


  } catch (error) {
    next(error);
  }
};

// Тут може бути логіка для відписки, якщо потрібно
export const unsubscribeFromPush = async (req: Request, res: Response, next: NextFunction) => {
  const { endpoint } = req.body; // Очікуємо endpoint підписки, яку треба видалити
   if (!req.user) {
    return res.status(401).json({ message: 'Не авторизований' });
  }
  if (!endpoint) {
    res.status(400);
    return next(new Error('Endpoint підписки обов\'язковий для відписки'));
  }
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      return next(new Error('Користувача не знайдено'));
    }
    // Видаляємо підписку
    user.pushSubscriptions = user.pushSubscriptions.filter(sub => sub.endpoint !== endpoint);
    await user.save();
    res.status(200).json({ message: 'Відписка від сповіщень успішна' });
  } catch (error) {
    next(error);
  }
};