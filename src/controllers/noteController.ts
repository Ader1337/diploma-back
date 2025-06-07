import { Request, Response, NextFunction } from 'express';
import Note from '../models/Note';
import mongoose from 'mongoose';

// @desc    Отримати всі нотатки користувача
// @route   GET /api/notes
// @access  Private
export const getNotes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Не авторизований' });
    const notes = await Note.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    next(error);
  }
};

// @desc    Створити нову нотатку
// @route   POST /api/notes
// @access  Private
export const createNote = async (req: Request, res: Response, next: NextFunction) => {
  const { title, content, tags } = req.body;
  if (!req.user) return res.status(401).json({ message: 'Не авторизований' });

  if (!content) { // Контент нотатки є обов'язковим
    res.status(400);
    return next(new Error('Зміст нотатки є обов\'язковим'));
  }

  try {
    const note = new Note({
      user: req.user._id,
      title,
      content,
      tags: tags && Array.isArray(tags) ? tags : [],
    });
    const createdNote = await note.save();
    res.status(201).json(createdNote);
  } catch (error) {
    next(error);
  }
};

// @desc    Отримати нотатку за ID
// @route   GET /api/notes/:id
// @access  Private
export const getNoteById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Не авторизований' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400);
        return next(new Error('Неправильний ID нотатки'));
    }
    const note = await Note.findById(req.params.id);

    if (note) {
      if (note.user.toString() !== req.user._id.toString()) {
        res.status(403);
        return next(new Error('Доступ до цієї нотатки заборонено'));
      }
      res.json(note);
    } else {
      res.status(404);
      return next(new Error('Нотатку не знайдено'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Оновити нотатку
// @route   PUT /api/notes/:id
// @access  Private
export const updateNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Не авторизований' });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400);
        return next(new Error('Неправильний ID нотатки'));
    }
    const note = await Note.findById(req.params.id);

    if (note) {
      if (note.user.toString() !== req.user._id.toString()) {
        res.status(403);
        return next(new Error('Доступ до оновлення цієї нотатки заборонено'));
      }

      note.title = req.body.title === undefined ? note.title : req.body.title;
      note.content = req.body.content || note.content; // Контент не може бути порожнім, якщо оновлюється
      note.tags = req.body.tags && Array.isArray(req.body.tags) ? req.body.tags : note.tags;

      const updatedNote = await note.save();
      res.json(updatedNote);
    } else {
      res.status(404);
      return next(new Error('Нотатку не знайдено'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Видалити нотатку
// @route   DELETE /api/notes/:id
// @access  Private
export const deleteNote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Не авторизований' });
     if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400);
        return next(new Error('Неправильний ID нотатки'));
    }
    const note = await Note.findById(req.params.id);

    if (note) {
      if (note.user.toString() !== req.user._id.toString()) {
        res.status(403);
        return next(new Error('Доступ до видалення цієї нотатки заборонено'));
      }
      await note.deleteOne();
      res.json({ message: 'Нотатку успішно видалено' });
    } else {
      res.status(404);
      return next(new Error('Нотатку не знайдено'));
    }
  } catch (error) {
    next(error);
  }
};