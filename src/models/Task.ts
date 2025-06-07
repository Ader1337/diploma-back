import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITask extends Document {
  user: mongoose.Types.ObjectId; // Змінено з userId на user для відповідності Mongoose конвенціям
  title: string;
  description?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  reminderSent: boolean;
  overdueNotificationSent: boolean;
}

const TaskSchema: Schema<ITask> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    dueDate: { type: Date },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    isCompleted: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    overdueNotificationSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Task: Model<ITask> = mongoose.model<ITask>('Task', TaskSchema);
export default Task;