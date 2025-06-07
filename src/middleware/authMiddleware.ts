import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User'; // Імпортуємо IUser

// Розширюємо інтерфейс Request для додавання властивості user
declare global {
  namespace Express {
    interface Request {
      user?: IUser; // Тип користувача з вашої моделі
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]; // Отримуємо токен "Bearer <token>"

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET не визначено');
      }

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET); // Типізувати decoded краще

      // Знаходимо користувача за ID з токену, виключаючи пароль
      req.user = await User.findById(decoded.id).select('-passwordHash');

      if (!req.user) {
        return res.status(401).json({ message: 'Не авторизований, користувача не знайдено' });
      }

      next(); // Перехід до наступного middleware або обробника
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Не авторизований, токен невалідний' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Не авторизований, немає токена' });
  }
};