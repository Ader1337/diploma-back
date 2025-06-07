import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'; // Імпортуємо bcrypt сюди

// Допоміжна функція для генерації токена
const generateToken = (id: string) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET не визначено в .env');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Термін дії токена
  });
};

export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400);
    return next(new Error('Будь ласка, заповніть всі поля'));
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      return next(new Error('Користувач з таким email вже існує'));
    }

    // Створюємо користувача, передаючи нехешований пароль в passwordHash
    const user = new User({
      username,
      email,
      passwordHash: password, // Mongoose pre-save хук захешує це
    });

    await user.save(); // Хук спрацює тут

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token: generateToken(user._id.toString()),
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    return next(new Error('Будь ласка, введіть email та пароль'));
  }

  try {
    interface IUser {
      _id: string;
      username: string;
      email: string;
      pushSubscriptions?: any;
      comparePassword: (password: string) => Promise<boolean>;
    }

    const user = await User.findOne({ email }) as unknown as IUser | null;

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token: generateToken((user._id as string)),
        pushSubscriptions: user.pushSubscriptions // Відправляємо існуючі підписки
      });
    } else {
      res.status(401); // Unauthorized
      return next(new Error('Неправильний email або пароль'));
    }
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  // req.user встановлюється в authMiddleware
  if (req.user) {
    res.json({
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      pushSubscriptions: req.user.pushSubscriptions
    });
  } else {
    res.status(404);
    return next(new Error('Користувача не знайдено'));
  }
};