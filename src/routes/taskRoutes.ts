import express from 'express';
import {
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
} from '../controllers/taskController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();


// Всі маршрути тут будуть захищені (вимагатимуть токен)
router.route('/')
  .get(protect as any, getTasks as any)
  .post(protect as any, createTask as any);

router.route('/:id')
  .get(protect as any, getTaskById as any)
  .put(protect as any, updateTask as any)
  .delete(protect as any, deleteTask as any);

export default router;