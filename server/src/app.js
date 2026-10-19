const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { clientOrigin, isProd, isTest, mongoUri, sessionSecret, sessionMaxAgeMs } = require('./config/env');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// FE (Angular) gọi kèm cookie => phải chỉ đích danh origin và bật credentials
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (!isTest) app.use(morgan('dev'));

// Phiên đăng nhập: lưu trong MongoDB (connect-mongo); khi test dùng bộ nhớ cho gọn
app.use(session({
  name: 'connect.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true, // khách chưa đăng nhập vẫn cần phiên để giữ giỏ nháp
  store: isTest ? undefined : MongoStore.create({ mongoUrl: mongoUri, ttl: sessionMaxAgeMs / 1000 }),
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: sessionMaxAgeMs },
}));

// Ảnh người dùng tải lên (xem modules/buyer/upload)
app.use('/images', express.static(path.join(__dirname, '../public/images')));

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Kiểm tra server còn sống
 *     responses:
 *       200: { description: "Trả { ok: true }" }
 */
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', require('./modules/auth/auth.routes'));
require('./modules/buyer').mount(app);
app.use('/api/admin', require('./modules/admin/admin.routes'));
if (!isProd) app.use('/api/dev', require('./modules/dev/dev.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
