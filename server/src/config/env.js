require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.SESSION_SECRET) {
  throw new Error('Thiếu SESSION_SECRET trong .env (bắt buộc khi chạy production)');
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/DoAnWeb',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-chi-dung-khi-phat-trien',
  sessionMaxAgeMs: Number(process.env.SESSION_MAX_AGE_MS) || 60 * 60 * 1000, // 1 giờ
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:4200',
  isProd,
  isTest: process.env.NODE_ENV === 'test',
};
