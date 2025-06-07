import express from 'express';
import {
  getNotes,
  createNote,
  getNoteById,
  updateNote,
  deleteNote,
} from '../controllers/noteController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
  .get(protect as any, getNotes as any)
  .post(protect as any, createNote as any);

router.route('/:id')
  .get(protect as any, getNoteById as any)
  .put(protect as any, updateNote as any)
  .delete(protect as any, deleteNote as any);

export default router;