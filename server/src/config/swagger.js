const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

module.exports = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'AntGo API — module Người mua + Nhận việc',
      version: '1.0.0',
      description: 'Lỗi trả về dạng { error: { code, message, details } }. Danh sách: { data, meta: { page, limit, total } }.',
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'connect.sid' } },
      schemas: {
        UserSummary: {
          type: 'object',
          description: 'Người dùng rút gọn, có trong seller (bài), poster (việc), reviewer/author (đánh giá, hỏi đáp), with (hội thoại)',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'Bếp Cô Lan' },
            avatar: { type: 'string', nullable: true, description: 'URL ảnh chân dung; null nếu chưa có', example: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop&crop=faces&q=70' },
            area: { type: 'string', example: 'B' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            phone: { type: 'string', example: '0900000001' },
            avatar: { type: 'string', nullable: true, description: 'URL ảnh chân dung; null nếu chưa có' },
            area: { type: 'string', example: 'B' },
            role: { type: 'string', enum: ['enduser', 'admin'] },
            status: { type: 'string', enum: ['active', 'locked'] },
          },
        },
        OrderSnapshot: {
          type: 'object',
          description: 'Bản chụp lúc đặt đơn',
          properties: {
            title: { type: 'string' }, type: { type: 'string' }, image: { type: 'string' },
            sellerName: { type: 'string' },
            sellerAvatar: { type: 'string', nullable: true, description: 'Ảnh chân dung người bán lúc đặt; null nếu chưa có' },
            unitPrice: { type: 'number' }, unit: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Health' }, { name: 'Auth' }, { name: 'Địa chỉ' }, { name: 'Đã lưu' }, { name: 'Khám phá' },
      { name: 'Đơn hàng' }, { name: 'Đề nghị nhận việc' }, { name: 'Hỏi đáp' }, { name: 'Đánh giá' },
      { name: 'Hội thoại' }, { name: 'Thông báo' }, { name: 'Báo cáo' }, { name: 'Giỏ nháp' }, { name: 'Upload' }, { name: 'Gợi ý' }, { name: 'Assistant' }, { name: 'AntXu' }, { name: 'Admin' }, { name: 'Dev (tạm)' },
    ],
  },
  // glob cần dấu / (Windows trả \)
  apis: [path.join(__dirname, '../app.js'), path.join(__dirname, '../modules/**/*.routes.js')].map((x) => x.split(path.sep).join('/')),
  failOnErrors: true,
});
