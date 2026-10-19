// Service chung tạo thông báo (Q7): module nào có sự kiện thì gọi notify().
const Notification = require('../buyer/notification/notification.model');

async function notify(userId, { type, title, body = '', link }) {
  try {
    return await Notification.create({ user: userId, type, title, body, link });
  } catch (e) {
    console.error('Không tạo được thông báo:', e.message); // lỗi thông báo không được làm hỏng nghiệp vụ chính
  }
}

module.exports = { notify };
