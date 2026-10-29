// Gắn toàn bộ route module Người mua + Nhận việc vào app
module.exports.mount = (app) => {
  app.use('/api/me/addresses', require('./address/address.routes'));
  app.use('/api/me/xu', require('./xu/xu.routes'));
  app.use('/api/me/saved', require('./saved/saved.routes'));
  app.use('/api/jobs', require('./question/question.routes'));
  app.use('/api', require('./catalog/catalog.routes'));
  app.use('/api', require('./offer/offer.routes'));
  app.use('/api/orders', require('./order/order.routes'));
  app.use('/api/reviews', require('./review/review.routes'));
  app.use('/api/conversations', require('./chat/chat.routes'));
  app.use('/api/notifications', require('./notification/notification.routes'));
  app.use('/api/cart', require('./cart/cart.routes'));
  app.use('/api/uploads', require('./upload/upload.routes'));
  app.use('/api', require('./recommend/recommend.routes'));
  app.use('/api/reports', require('./report/report.routes'));
  app.use('/api/assistant', require('./assistant/assistant.routes'));
  app.use('/api/pricing', require('./pricing/pricing.routes'));
};
