// src/models/User.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// --- Секція для Web Push сповіщень (залишається без змін) ---
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


// 👇 НОВИЙ ІНТЕРФЕЙС для нативних токенів 👇
interface INativePushToken extends Document {
    token: string;
    platform: 'android' | 'ios';
}

// 👇 НОВА СХЕМА для нативних токенів 👇
const NativePushTokenSchema: Schema<INativePushToken> = new Schema({
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['android', 'ios'], required: true },
});


// --- Оновлений головний інтерфейс користувача ---
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  pushSubscriptions: IPushSubscription[];
  nativePushTokens: INativePushToken[]; // 👈 Додано нове поле
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    pushSubscriptions: [PushSubscriptionSchema],
    nativePushTokens: [NativePushTokenSchema], // 👈 Додано нове поле до схеми
  },
  { timestamps: true }
);

// --- Хуки та методи залишаються без змін ---

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