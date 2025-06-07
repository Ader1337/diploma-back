import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/db'; // Підключення до БД

// Імпорт маршрутів
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import noteRoutes from './routes/noteRoutes';
import notificationRoutes from './routes/notificationRoutes';

// Імпорт middleware для обробки помилок
import { notFound, errorHandler } from './middleware/errorMiddleware';
import { startNotificationScheduler } from './services/notificationScheduler';

// Завантаження змінних середовища
dotenv.config();

// Підключення до бази даних
connectDB();

startNotificationScheduler();

const app: Express = express();

// Middleware
app.use(cors()); // Дозволяє CORS запити (налаштуйте для продакшену!)
app.use(express.json()); // Для парсингу JSON тіла запиту
app.use(express.urlencoded({ extended: false })); // Для парсингу URL-encoded тіла запиту

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); 
}


// Головний маршрут API (можна додати префікс /api/v1)
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

app.get(API_PREFIX, (req: Request, res: Response) => {
  res.send('Ласкаво просимо до API Персонального Менеджера! 🚀');
});


/* app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
 */

// Підключення маршрутів
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/tasks`, taskRoutes);
app.use(`${API_PREFIX}/notes`, noteRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);


// Middleware для обробки не знайдених маршрутів (404)
app.use(notFound);
// Middleware для обробки помилок (має бути останнім)
app.use(errorHandler as any);


const PORT = process.env.PORT || 5001; // Порт з .env або 5001 за замовчуванням

app.listen(PORT, () => {
  console.log(`Сервер запущено в режимі '${process.env.NODE_ENV || 'development'}' на порту ${PORT}`);
});