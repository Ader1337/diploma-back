import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
  kind?: string; // Для помилок Mongoose (наприклад, ObjectId)
}

export const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Помилка сервера';

  // Специфічна обробка помилок Mongoose
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    message = `Ресурс не знайдено. Неправильний ID.`;
    // statusCode = 404; // Можна встановити і тут
    return res.status(404).json({ message }); // Повертаємо 404 для CastError
  }

  if (err.name === 'ValidationError') { // Mongoose validation error
    const errors = Object.values((err as any).errors).map((el: any) => el.message);
    message = `Помилка валідації: ${errors.join('. ')}`;
    return res.status(400).json({ message, errors });
  }

  // Дублювання унікального ключа (Mongoose)
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];
    message = `Поле '${field}' вже існує. Будь ласка, оберіть інше значення.`;
    return res.status(400).json({ message });
  }


  res.status(statusCode).json({
    message: message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack, // Показуємо stack лише в розробці
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Не знайдено - ${req.originalUrl}`);
  res.status(404);
  next(error);
};