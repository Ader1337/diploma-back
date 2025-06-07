import cron from 'node-cron';
import Task from '../models/Task';
import User from '../models/User';
import webpush, { PushSubscription } from 'web-push';

// Функція для надсилання сповіщень
const sendPushNotification = async (subscription: PushSubscription, payload: string) => {
  try {
    // Налаштування VAPID ключів має бути тут або в глобальному конфігу
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.error('VAPID ключі не налаштовані в .env файлі.');
      return;
    }
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_MAILTO || 'test@example.com'}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    await webpush.sendNotification(subscription, payload);
    console.log('Push-сповіщення успішно надіслано.');
  } catch (error: any) {
    console.error('Помилка надсилання push-сповіщення:', error.body || error.message);
    // Якщо підписка недійсна, її варто видалити з бази даних
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log('Видалення недійсної підписки...');
      await User.updateOne(
        { 'pushSubscriptions.endpoint': subscription.endpoint },
        { $pull: { pushSubscriptions: { endpoint: subscription.endpoint } } }
      );
    }
  }
};

// --- Логіка перевірки завдань ---

// 1. Перевірка завдань, для яких скоро дедлайн (нагадування за годину)
const checkUpcomingTasks = async () => {
  console.log('Запуск перевірки завдань для нагадувань...');
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  try {
    const upcomingTasks = await Task.find({
      isCompleted: false, // Завдання не виконано
      reminderSent: false, // Нагадування ще не надсилалось
      dueDate: {
        $gte: now, // Дедлайн ще не настав
        $lte: oneHourFromNow // Але настане протягом наступної години
      }
    }).populate('user'); // `populate` додає об'єкт користувача замість user ID

    console.log(`Знайдено ${upcomingTasks.length} завдань для нагадування.`);

    for (const task of upcomingTasks) {
      const user = task.user as any; // Типізуємо як any для простоти доступу до полів
      if (user && user.pushSubscriptions && user.pushSubscriptions.length > 0) {
        const payload = JSON.stringify({
         notification: { // <--- Ось цей ключовий об'єкт!
          title: `🔔 Нагадування: ${task.title}`,
          body: `Дедлайн вашого завдання настане менш ніж за годину!`,
          icon: 'assets/icons/icon-96x96.png', // Цей шлях має бути доступний у вашому зібраному Angular-додатку
          data: { url: `/tasks/${task._id}` }
        }
        });

        // Надсилаємо сповіщення на всі підписки користувача
        await Promise.all(
            user.pushSubscriptions.map((sub: PushSubscription) => sendPushNotification(sub, payload))
        );

        // Позначаємо, що нагадування було надіслано
        task.reminderSent = true;
        await task.save();
      }
    }
  } catch (error) {
    console.error('Помилка під час перевірки завдань для нагадування:', error);
  }
};


// 2. Перевірка прострочених завдань
const checkOverdueTasks = async () => {
  console.log('Запуск перевірки прострочених завдань...');
  const now = new Date();

  try {
    const overdueTasks = await Task.find({
      isCompleted: false, // Завдання не виконано
      overdueNotificationSent: false, // Сповіщення про прострочення не надсилалось
      dueDate: { $lt: now } // Дедлайн вже минув
    }).populate('user');

    console.log(`Знайдено ${overdueTasks.length} прострочених завдань.`);

    for (const task of overdueTasks) {
      const user = task.user as any;
      if (user && user.pushSubscriptions && user.pushSubscriptions.length > 0) {
        const payload = JSON.stringify({
          notification: { // <--- І тут також!
          title: `⏰ Прострочене завдання: ${task.title}`,
          body: `Ви не встигли виконати це завдання вчасно.`,
          icon: 'assets/icons/icon-96x96.png',
          data: { url: `/tasks/${task._id}` }
        }
        });

        await Promise.all(
            user.pushSubscriptions.map((sub: PushSubscription) => sendPushNotification(sub, payload))
        );

        // Позначаємо, що сповіщення про прострочення було надіслано
        task.overdueNotificationSent = true;
        await task.save();
      }
    }
  } catch (error) {
    console.error('Помилка під час перевірки прострочених завдань:', error);
  }
};


// --- Ініціалізація планувальника ---

export const startNotificationScheduler = () => {
  // Запускати перевірку кожну хвилину. Для продакшену можна рідше, наприклад, кожні 5-15 хвилин.
  // Cron-синтаксис: '*/1 * * * *' - кожну хвилину
  cron.schedule('*/1 * * * *', () => {
    console.log('----------------------------------------------------');
    console.log(`Планувальник запущено о ${new Date().toLocaleTimeString()}`);
    checkUpcomingTasks();
    checkOverdueTasks();
    console.log('----------------------------------------------------');
  });

  console.log('Планувальник сповіщень успішно налаштовано!  cron.schedule(*/1 * * * *)');
};