import admin from './config/firebase'; // Імпортуємо наш ініціалізований Firebase

// 👇 ВСТАВТЕ СЮДИ PUSH-ТОКЕН ВАШОГО ТЕЛЕФОНУ 👇
// (Візьміть його з консолі Logcat або з вашої бази даних MongoDB)
const deviceToken = "eorh6U52Qk6uZzfwM9VB_3:APA91bEAtDVJLrSKDdsNjKS1w0KkRSzKS8iRGSSryGclcvx7Bo4RIHSxBf3u2FqKAkZoSx2-IToca8uC0IJv5sxFRl3hAMtuNbutzHL5g-IxIEkRTF3sDmQ";

if (!deviceToken || deviceToken.includes("ВАШ")) {
    console.error("ПОМИЛКА: Будь ласка, вставте реальний push-токен у файл test-fcm.ts");
    process.exit(1);
}

// Створюємо тіло сповіщення
const message = {
    token: deviceToken,
    notification: {
        title: 'Тест напряму з Backend! 🚀',
        body: 'Якщо ви бачите це, Firebase Admin SDK працює!'
    },
    data: { // Додаткові дані, які отримає додаток
        url: '/app/tasks'
    }
};

// Функція для надсилання
async function sendTestNotification() {
    console.log(`Спроба надіслати тестове сповіщення на токен: ...${deviceToken.slice(-10)}`);
    try {
        const response = await admin.messaging().send(message);
        console.log('✅ Успішно надіслано! ID повідомлення:', response);
    } catch (error) {
        console.error('❌ Помилка надсилання сповіщення:', error);
    } finally {
        process.exit(0); // Завершуємо скрипт
    }
}

sendTestNotification();