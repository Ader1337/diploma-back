import { Request, Response, NextFunction } from 'express';
import Task from '../models/Task';
import mongoose from 'mongoose';

// @desc    Отримати всі завдання користувача
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Не авторизований' });
    const tasks = await Task.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

// @desc    Створити нове завдання
// @route   POST /api/tasks
// @access  Private
export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  const { title, description, dueDate, priority } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Не авторизований' });

  if (!title) {
    res.status(400);
    return next(new Error('Назва завдання є обов\'язковою'));
  }

  try {
    const task = new Task({
      reminderSent: false,
      overdueNotificationSent: false,
      user: req.user._id,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined, // Переконуємося, що це Date або undefined
      priority,
    });
    const createdTask = await task.save();
    res.status(201).json(createdTask);
    console.log('Created Task:', createdTask);
  } catch (error) {
    next(error);
  }
};

// @desc    Отримати завдання за ID
// @route   GET /api/tasks/:id
// @access  Private
export const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Не авторизований' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400); // Bad Request
      return next(new Error('Неправильний ID завдання'));
    }

    const task = await Task.findById(req.params.id);

    if (task) {
      // Перевірка, чи завдання належить поточному користувачеві
      if (task.user.toString() !== req.user._id.toString()) {
        res.status(403); // Forbidden
        return next(new Error('Доступ до цього завдання заборонено'));
      }
      res.json(task);
    } else {
      res.status(404);
      return next(new Error('Завдання не знайдено'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Оновити завдання
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Не авторизований' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      return next(new Error('Неправильний ID завдання'));
    }
    const task = await Task.findById(req.params.id);

    if (task) {
      if (task.user.toString() !== req.user._id.toString()) {
        res.status(403);
        return next(new Error('Доступ до оновлення цього завдання заборонено'));
      }

      task.title = req.body.title || task.title;
      task.description = req.body.description === undefined ? task.description : req.body.description; // Дозволяємо порожній рядок для опису
      task.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : (req.body.dueDate === null ? undefined : task.dueDate); // Дозволяємо null для видалення дати
      task.priority = req.body.priority || task.priority;
      task.isCompleted = req.body.isCompleted === undefined ? task.isCompleted : req.body.isCompleted;

      const updatedTask = await task.save();
      res.json(updatedTask);
    } else {
      res.status(404);
      return next(new Error('Завдання не знайдено'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Видалити завдання
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  console.log('deleteTask виконується', req.body);
  try {
    if (!req.user) return res.status(401).json({ message: 'Не авторизований' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      return next(new Error('Неправильний ID завдання'));
    }
    const task = await Task.findById(req.params.id);

    if (task) {
      if (task.user.toString() !== req.user._id.toString()) {
        res.status(403);
        return next(new Error('Доступ до видалення цього завдання заборонено'));
      }
      await task.deleteOne(); // Використовуємо deleteOne() для Mongoose >= 6
      res.json({ message: 'Завдання успішно видалено' });
    } else {
      res.status(404);
      return next(new Error('Завдання не знайдено'));
    }
  } catch (error) {
    next(error);
  }
};