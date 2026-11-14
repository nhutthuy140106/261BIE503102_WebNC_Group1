// Hộp thư hỗ trợ: người dùng gửi góp ý / câu hỏi ở trang Trợ giúp, quản trị trả lời. Mỗi phiếu là một cuộc hội thoại ngắn.
const { Schema, model } = require('mongoose');

const TOPICS = ['order', 'account', 'seller', 'payment', 'other'];
const STATES = ['open', 'answered', 'closed'];

const ticketSchema = new Schema({
  code: { type: String, unique: true },                     // HT-####
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  topic: { type: String, enum: TOPICS, default: 'other' },
  state: { type: String, enum: STATES, default: 'open', index: true },
  messages: [{
    by: { type: String, enum: ['user', 'staff'], required: true },
    text: { type: String, required: true, maxlength: 1500 },
    staff: { type: Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
    _id: false,
  }],
}, { timestamps: true });

ticketSchema.statics.TOPICS = TOPICS;
ticketSchema.statics.STATES = STATES;

module.exports = model('SupportTicket', ticketSchema);
