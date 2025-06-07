import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Завантажуємо змінні з .env

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('MONGO_URI не знайдено в .env файлі');
      process.exit(1);
    }
    await mongoose.connect(mongoURI);
    console.log('MongoDB підключено успішно! 🎉');
  } catch (error: any) {
    console.error('Помилка підключення до MongoDB: 💀', error.message);
    process.exit(1); // Вихід з процесу при помилці
  }
};

export default connectDB;