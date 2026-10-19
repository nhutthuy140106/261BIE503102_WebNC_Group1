const { Schema, model } = require('mongoose');

const questionSchema = new Schema({
  job: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  answer: { text: String, by: { type: Schema.Types.ObjectId, ref: 'User' }, at: Date, _id: false },
}, { timestamps: true });

module.exports = model('Question', questionSchema);
