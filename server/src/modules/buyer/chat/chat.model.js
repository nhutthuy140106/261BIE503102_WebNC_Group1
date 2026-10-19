const { Schema, model } = require('mongoose');

const conversationSchema = new Schema({
  participants: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], validate: (v) => v.length === 2 },
  context: new Schema({ type: { type: String, enum: ['order', 'offer', 'post', 'job'] }, id: Schema.Types.ObjectId }, { _id: false }),
  lastMessage: { text: String, at: Date, sender: Schema.Types.ObjectId, _id: false },
}, { timestamps: true });

conversationSchema.index({ participants: 1, updatedAt: -1 });

const messageSchema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = { Conversation: model('Conversation', conversationSchema), Message: model('Message', messageSchema) };
