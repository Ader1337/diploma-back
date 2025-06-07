// src/models/User.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Інтерфейс для підписки на push (залишаємо як є)
interface IPushSubscription extends Document {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const PushSubscriptionSchema: Schema<IPushSubscription> = new Schema({
  endpoint: { type: String, required: true, unique: true },
  expirationTime: { type: Number, default: null },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
});

// Оновлений IUser
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId; // Чітко вказуємо тип для _id
  username: string;
  email: string;
  passwordHash: string;
  pushSubscriptions: IPushSubscription[];
  createdAt: Date; // Додано для повноти, timestamps: true їх створює
  updatedAt: Date; // Додано для повноти
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    pushSubscriptions: [PushSubscriptionSchema],
  },
  { timestamps: true } // timestamps додають createdAt та updatedAt
);

// Хук та метод comparePassword залишаються без змін
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
export default User;