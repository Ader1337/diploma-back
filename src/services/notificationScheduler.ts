import cron from 'node-cron';
import webpush from 'web-push';
import admin from '../config/firebase'; // Імпортуємо наш ініціалізований Firebase Admin
import Task, { ITask } from '../models/Task';
import User, { IUser } from '../models/User';

// =======================================================
// РОЗДІЛЕНІ ФУНКЦІЇ ДЛЯ НАДСИЛАННЯ СПОВІЩЕНЬ
// =======================================================

/**
 * Надсилає сповіщення на ВЕБ-ПІДПИСКУ (для браузерів та Electron)
 */
async function sendWebPushNotification(subscription: any, payload: any, userId: string) {
  try {
    // Налаштування VAPID ключів
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
            `mailto:${process.env.VAPID_MAILTO || 'test@example.com'}`,
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
        await webpush.sendNotification(subscription, JSON.stringify(payload));
    }
  } catch (error: any) {
    // Якщо підписка застаріла, видаляємо її з бази
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`[Scheduler] Видалення недійсної ВЕБ-підписки для користувача ${userId}...`);
      await User.findByIdAndUpdate(userId, { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } });
    } else {
      console.error('[Scheduler] Помилка Web Push:', error.body);
    }
  }
}

/**
 * Надсилає сповіщення на НАТИВНИЙ ТОКЕН (для мобільних)
 */
async function sendNativePushNotification(token: string, payload: any, userId: string) {
  const message = {
    token: token,
    notification: {
      title: payload.notification.title,
      body: payload.notification.body,
    },
    data: payload.notification.data, // Дані для навігації
    apns: { // Налаштування для iOS
        payload: { aps: { 'content-available': 1 } }
    }
  };

  try {
    await admin.messaging().send(message);
  } catch (error: any) {
    // Якщо токен недійсний, видаляємо його
    if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error.code)) {
      console.log(`[Scheduler] Видалення недійного NATIVE-токену для користувача ${userId}...`);
      await User.findByIdAndUpdate(userId, { $pull: { nativePushTokens: { token: token } } });
    } else {
        console.error(`[Scheduler] Помилка FCM для токена ...${token.slice(-5)}:`, error.code || error.message);
    }
  }
}

// =======================================================
// ОСНОВНА ЛОГІКА ПЛАНУВАЛЬНИКА
// =======================================================

/**
 * Обробляє масив знайдених завдань, знаходить користувачів та надсилає їм сповіщення.
 */
async function processAndSend(tasks: (ITask & { user: IUser })[], type: 'reminder' | 'overdue') {
  for (const task of tasks) {
    const user = task.user;
    if (!user) {
      console.warn(`[Scheduler] Пропуск завдання ${task._id}, оскільки не знайдено користувача.`);
      continue;
    }

    // Формуємо тіло сповіщення залежно від типу
    const payload = {
      notification: {
        title: `⏰ Завдання: ${task.title}`,
        body: type === 'reminder' ? 'Дедлайн настане менш ніж за годину!' : 'Ви не встигли виконати це завдання вчасно.',
        icon: 'assets/icons/icon-96x96.png', // Іконка для веб/десктоп
        data: { url: `/app/tasks/edit/${task._id}` } // Універсальне посилання
      }
    };

    console.log(`[Scheduler] Обробка завдання "${task.title}" для користувача ${user.email}`);

    // Надсилаємо на всі веб-підписки користувача
    if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
      console.log(`[Scheduler] Знайдено ${user.pushSubscriptions.length} ВЕБ-підписок. Надсилання...`);
      await Promise.all(user.pushSubscriptions.map(sub => sendWebPushNotification(sub, payload, user._id.toString())));
    }

    // Надсилаємо на всі нативні токени користувача
    if (user.nativePushTokens && user.nativePushTokens.length > 0) {
      console.log(`[Scheduler] Знайдено ${user.nativePushTokens.length} НАTИВНИХ токенів. Надсилання...`);
      await Promise.all(user.nativePushTokens.map(t => sendNativePushNotification(t.token, payload, user._id.toString())));
    }

    // Оновлюємо прапорець у завданні, щоб не надсилати повторно
    if (type === 'reminder') {
        task.reminderSent = true;
    } else {
        task.overdueNotificationSent = true;
    }
    await task.save();
  }
}

const checkTasks = async () => {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  // 1. Знаходимо завдання для нагадування
  const upcomingTasks = await Task.find({
    isCompleted: false, reminderSent: false, dueDate: { $gte: now, $lte: oneHourFromNow }
  }).populate('user');

  if (upcomingTasks.length > 0) {
    console.log(`[Scheduler] Знайдено ${upcomingTasks.length} завдань для НАГАДУВАННЯ.`);
    await processAndSend(upcomingTasks as any[], 'reminder');
  }

  // 2. Знаходимо прострочені завдання
  const overdueTasks = await Task.find({
    isCompleted: false, overdueNotificationSent: false, dueDate: { $lt: now }
  }).populate('user');

  if (overdueTasks.length > 0) {
    console.log(`[Scheduler] Знайдено ${overdueTasks.length} ПРОСТРОЧЕНИХ завдань.`);
    await processAndSend(overdueTasks as any[], 'overdue');
  }
};

/**
 * Головна функція, яка запускає cron-завдання.
 */
export const startNotificationScheduler = () => {
  cron.schedule('*/1 * * * *', () => {
    console.log(`--- [${new Date().toLocaleTimeString()}] Запуск перевірки завдань ---`);
    checkTasks().catch(err => console.error('[Scheduler] Глобальна помилка в cron-завданні:', err));
  });
  console.log('Планувальник сповіщень успішно налаштовано!');
};